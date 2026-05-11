#include <boost/beast/core.hpp>
#include <boost/beast/http.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <boost/json.hpp>
#include <iostream>
#include <memory>
#include <ctime>
#include "simulation_service.hpp"
#include "database.hpp"
#include "keycloak_auth.hpp"
#include "kafka_producer.hpp"
#include "redis_client.hpp"

namespace beast = boost::beast;
namespace http = beast::http;
namespace net = boost::asio;
namespace json = boost::json;
using tcp = net::ip::tcp;

std::unique_ptr<keycloak::KeycloakClient> keycloakClient;

std::string extractToken(const http::request<http::string_body>& req) {
    auto it = req.find(http::field::authorization);
    if (it != req.end()) {
        std::string auth = std::string(it->value().begin(), it->value().end());
        if (auth.find("Bearer ") == 0) return auth.substr(7);
        return auth;
    }
    return "";
}

keycloak::UserInfo verifyAndGetUser(const http::request<http::string_body>& req) {
    std::string token = extractToken(req);
    if (token.empty()) { keycloak::UserInfo info; info.isValid = false; return info; }
    return keycloakClient->verifyToken(token);
}

void emitSimulationEvent(const std::string& type, const std::string& userId,
                         const std::string& simId, int status, const json::object& extra = {}) {
    try {
        json::object event;
        event["type"] = type; event["service"] = "simulations";
        event["user_id"] = userId; event["simulation_id"] = simId;
        event["timestamp"] = std::time(nullptr); event["status_code"] = status;
        for (const auto& [k, v] : extra) event[k] = v;
        kafka::getProducer().produce("simulation-events", event);
        std::string s = (status >= 200 && status < 300) ? "SUCCESS" : "FAILED";
        std::cout << "[Kafka] " << type << " (" << s << ") user=" << userId << std::endl;
    } catch (const std::exception& e) { std::cerr << "[Kafka] Error: " << e.what() << std::endl; }
}

std::string getAllowedOrigin(const http::request<http::string_body>& req) {
    auto it = req.find(http::field::origin);
    if (it != req.end()) {
        std::string origin(it->value().begin(), it->value().end());
        if (origin == "http://localhost:5173" || origin == "http://localhost:3000") return origin;
    }
    return "http://localhost:5173";
}

void addCorsHeaders(http::response<http::string_body>& res, const http::request<http::string_body>& req) {
    res.set(http::field::access_control_allow_origin, getAllowedOrigin(req));
    res.set(http::field::access_control_allow_methods, "GET, POST, PUT, DELETE, OPTIONS");
    res.set(http::field::access_control_allow_headers, "Content-Type, Authorization");
    res.set(http::field::access_control_allow_credentials, "true");
}

class HttpSession : public std::enable_shared_from_this<HttpSession> {
    tcp::socket socket_;
    beast::flat_buffer buffer_;
    http::request<http::string_body> req_;
public:
    explicit HttpSession(tcp::socket&& socket) : socket_(std::move(socket)) {}
    void run() { read_request(); }
private:
    void read_request() {
        auto self = shared_from_this();
        http::async_read(socket_, buffer_, req_,
            [self](beast::error_code ec, std::size_t) { if (!ec) self->handle_request(); });
    }
    
    void handle_request() {
        std::cout << "[REQUEST] " << req_.method_string() << " " << req_.target() << std::endl;
        if (req_.method() == http::verb::options) {
            http::response<http::string_body> res{http::status::ok, req_.version()};
            addCorsHeaders(res, req_); res.prepare_payload(); write_response(res); return;
        }
        
        http::response<http::string_body> res{http::status::ok, req_.version()};
        res.set(http::field::server, "Simulation Service");
        addCorsHeaders(res, req_);
        res.set(http::field::content_type, "application/json");
        
        try {
            std::string target(req_.target().begin(), req_.target().end());
            
            if (req_.method() == http::verb::get && target == "/simulations") handle_get_simulations(res);
            else if (req_.method() == http::verb::post && target == "/simulations") handle_create_simulation(res);
            else if (req_.method() == http::verb::put && target.find("/simulations/") == 0) handle_update_simulation(res);
            else if (req_.method() == http::verb::delete_ && target.find("/simulations/") == 0) handle_delete_simulation(res);
            else if (req_.method() == http::verb::get && target == "/health") {
                json::object r; r["status"] = "ok"; r["service"] = "simulations";
                r["redis"] = redis::RedisClient::getInstance().isConnected();
                res.body() = json::serialize(r);
            } else {
                res.result(http::status::not_found);
                res.body() = json::serialize(json::object{{"error", "Not Found"}});
            }
        } catch (const std::exception& e) {
            res.result(http::status::internal_server_error);
            res.body() = json::serialize(json::object{{"error", e.what()}});
        }
        res.prepare_payload(); write_response(res);
    }
    
    void handle_get_simulations(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) { res.result(http::status::unauthorized); return; }
        auto sims = SimulationService::getInstance().getSimulationsByUser(userInfo.postgresId);
        json::array arr;
        for (const auto& s : sims) {
            json::object obj;
            obj["id"] = s.id; obj["amount"] = s.amount; obj["categoryId"] = s.categoryId;
            obj["categoryName"] = s.categoryName; obj["description"] = s.description;
            obj["startDate"] = s.startDate; obj["endDate"] = s.endDate;
            obj["days"] = s.days; obj["weeks"] = s.weeks; obj["months"] = s.months;
            obj["period"] = s.period; obj["createdAt"] = s.createdAt;
            arr.push_back(obj);
        }
        res.result(http::status::ok); res.body() = json::serialize(arr);
        emitSimulationEvent("get_simulations", userInfo.postgresId, "", 200, {{"count", static_cast<int64_t>(sims.size())}});
    }
    
    void handle_create_simulation(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) { res.result(http::status::unauthorized); return; }
        try {
            std::cout << "[CREATE SIM] Body: " << req_.body() << std::endl;
            
            auto jv = json::parse(req_.body());
            auto& obj = jv.as_object();
            auto toDouble = [](const json::value& v) -> double {
                if (v.is_int64()) return static_cast<double>(v.as_int64());
                if (v.is_double()) return v.as_double();
                return v.to_number<double>();
            };
            
            SimulationTransaction s;
            s.userId = userInfo.postgresId;
            s.amount = toDouble(obj.at("amount"));
            s.categoryId = std::string(obj.at("categoryId").as_string());
            s.description = obj.contains("description") ? std::string(obj.at("description").as_string()) : "";
            s.startDate = std::string(obj.at("startDate").as_string());
            s.endDate = std::string(obj.at("endDate").as_string());
            s.days = toDouble(obj.at("days"));
            s.weeks = toDouble(obj.at("weeks"));
            s.months = toDouble(obj.at("months"));
            s.period = std::string(obj.at("period").as_string());
            
            std::cout << "[CREATE SIM] amount=" << s.amount << " period=" << s.period 
                    << " days=" << s.days << " weeks=" << s.weeks << " months=" << s.months << std::endl;
            
            auto created = SimulationService::getInstance().createSimulation(s);
            if (!created) { 
                res.result(http::status::internal_server_error); 
                res.body() = json::serialize(json::object{{"error", "Error creating simulation"}});
                return; 
            }
            res.result(http::status::created);
            res.body() = json::serialize(json::object{{"id", created->id}, {"message", "Simulación creada"}});
            emitSimulationEvent("simulation_created", userInfo.postgresId, created->id, 201,
                {{"amount", s.amount}, {"period", s.period}});
        } catch (const std::exception& e) { 
            std::cerr << "[CREATE SIM] Error: " << e.what() << std::endl;
            res.result(http::status::bad_request);
            res.body() = json::serialize(json::object{{"error", e.what()}});
        }
    }
    
    void handle_update_simulation(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) { res.result(http::status::unauthorized); return; }
        std::string id = std::string(req_.target().begin(), req_.target().end()).substr(13);
        try {
            auto jv = json::parse(req_.body());
            bool ok = SimulationService::getInstance().updateSimulation(id, userInfo.postgresId, jv.as_object());
            res.result(ok ? http::status::ok : http::status::not_found);
            res.body() = json::serialize(json::object{{"message", ok ? "Updated" : "Not found"}});
            if (ok) emitSimulationEvent("simulation_updated", userInfo.postgresId, id, 200);
        } catch (const std::exception& e) { res.result(http::status::bad_request); }
    }
    
    void handle_delete_simulation(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) { res.result(http::status::unauthorized); return; }
        std::string id = std::string(req_.target().begin(), req_.target().end()).substr(13);
        bool ok = SimulationService::getInstance().deleteSimulation(id, userInfo.postgresId);
        res.result(ok ? http::status::ok : http::status::not_found);
        res.body() = json::serialize(json::object{{"message", ok ? "Deleted" : "Not found"}});
        if (ok) emitSimulationEvent("simulation_deleted", userInfo.postgresId, id, 200);
    }
    
    void write_response(http::response<http::string_body>& res) {
        auto self = shared_from_this();
        http::async_write(socket_, res,
            [self](beast::error_code ec, std::size_t) { self->socket_.shutdown(tcp::socket::shutdown_send, ec); });
    }
};

class HttpServer {
    net::io_context ioc_;
    tcp::acceptor acceptor_;
public:
    HttpServer(const std::string& address, unsigned short port)
        : ioc_(1), acceptor_(ioc_, tcp::endpoint(net::ip::make_address(address), port)) {}
    void run() { do_accept(); ioc_.run(); }
private:
    void do_accept() {
        acceptor_.async_accept([this](beast::error_code ec, tcp::socket socket) {
            if (!ec) std::make_shared<HttpSession>(std::move(socket))->run();
            do_accept();
        });
    }
};

int main() {
    try {
        unsigned short port = std::getenv("SERVER_PORT") ? std::stoi(std::getenv("SERVER_PORT")) : 8088;
        keycloakClient = std::make_unique<keycloak::KeycloakClient>(
            std::getenv("KEYCLOAK_URL") ? std::getenv("KEYCLOAK_URL") : "http://keycloak:8080",
            std::getenv("KEYCLOAK_REALM") ? std::getenv("KEYCLOAK_REALM") : "yung-accountant");
        Database::getInstance().connect(
            std::getenv("POSTGRES_HOST") ? std::getenv("POSTGRES_HOST") : "postgresdb",
            std::getenv("POSTGRES_PORT") ? std::stoi(std::getenv("POSTGRES_PORT")) : 5432,
            std::getenv("POSTGRES_DB") ? std::getenv("POSTGRES_DB") : "yung_accountant",
            std::getenv("POSTGRES_USER") ? std::getenv("POSTGRES_USER") : "admin",
            std::getenv("POSTGRES_PASSWORD") ? std::getenv("POSTGRES_PASSWORD") : "secret123");
        auto& redis = redis::RedisClient::getInstance();
        redis.connect(
            std::getenv("REDIS_HOST") ? std::getenv("REDIS_HOST") : "redis",
            std::getenv("REDIS_PORT") ? std::stoi(std::getenv("REDIS_PORT")) : 6379,
            std::getenv("REDIS_PASSWORD") ? std::getenv("REDIS_PASSWORD") : "");
        kafka::getProducer();
        std::cout << "Simulation Service starting on 0.0.0.0:" << port << std::endl;
        HttpServer server("0.0.0.0", port);
        server.run();
    } catch (const std::exception& e) { std::cerr << "Error: " << e.what() << std::endl; return 1; }
    return 0;
}