// src/main.cpp (Simulation Service - HARDENED)
#include <boost/beast/core.hpp>
#include <boost/beast/http.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <boost/json.hpp>
#include <iostream>
#include <csignal>
#include <memory>
#include <ctime>
#include <thread>
#include <vector>
#include <algorithm>
#include <string>
#include "simulation_service.hpp"
#include "database.hpp"
#include "keycloak_auth.hpp"
#include "kafka_producer.hpp"
#include "redis_client.hpp"
#include "rate_limiter.hpp"
#include "security.hpp"
#include "validators.hpp"

namespace beast = boost::beast;
namespace http = beast::http;
namespace net = boost::asio;
namespace json = boost::json;
using tcp = net::ip::tcp;

std::unique_ptr<keycloak::KeycloakClient> keycloakClient;

// ============================================
// SIGNAL HANDLER
// ============================================
void signalHandler(int sig) {
    std::cerr << "\n[CRASH]: Signal " << sig;
    switch (sig) {
        case SIGSEGV: std::cerr << " (Segmentation Fault)"; break;
        case SIGABRT: std::cerr << " (Abort)"; break;
        case SIGFPE:  std::cerr << " (Floating Point Exception)"; break;
        case SIGILL:  std::cerr << " (Illegal Instruction)"; break;
        default:      std::cerr << " (Unknown)"; break;
    }
    std::cerr << std::endl;
    std::cerr << "The service will now exit." << std::endl;
    _exit(1);
}

// ============================================
// HELPERS
// ============================================
std::string extractToken(const http::request<http::string_body>& req) {
    // 1. Try Authorization header first (Bearer token)
    auto it = req.find(http::field::authorization);
    if (it != req.end()) {
        std::string auth = std::string(it->value().begin(), it->value().end());
        if (auth.find("Bearer ") == 0) {
            return auth.substr(7);
        }
        return auth;
    }
    // 2. Fallback: read from cookie
    auto cookieIt = req.find(http::field::cookie);
    if (cookieIt != req.end()) {
        std::string cookies = std::string(cookieIt->value().begin(), cookieIt->value().end());
        std::string key = "access_token=";
        size_t pos = cookies.find(key);
        if (pos != std::string::npos) {
            size_t start = pos + key.size();
            size_t end = cookies.find(';', start);
            if (end == std::string::npos) end = cookies.size();
            return cookies.substr(start, end - start);
        }
    }
    return "";
}

keycloak::UserInfo verifyAndGetUser(const http::request<http::string_body>& req) {
    std::string token = extractToken(req);
    if (token.empty()) {
        keycloak::UserInfo info; 
        info.isValid = false; 
        info.error = "No token"; 
        return info;
    }
    
    auto userInfo = keycloakClient->verifyToken(token);
    
    // ✅ Validar que postgresId no esté vacío
    if (userInfo.isValid && userInfo.postgresId.empty()) {
        userInfo.isValid = false;
        userInfo.error = "Token válido pero sin postgresId";
        std::cerr << "[AUTH] Token valid but missing postgresId for: " << userInfo.email << std::endl;
    }
    
    return userInfo;
}

// ============================================
// KAFKA EVENTS
// ============================================
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
    } catch (const std::exception& e) { 
        std::cerr << "[Kafka] Error: " << e.what() << std::endl; 
    }
}

// ============================================
// CORS
// ============================================
std::string getAllowedOrigin(const http::request<http::string_body>& req) {
    static std::string prodDomain = std::getenv("APP_DOMAIN_PROD") ? std::getenv("APP_DOMAIN_PROD") : "https://yung-accountant.duckdns.org";
    auto it = req.find(http::field::origin);
    if (it != req.end()) {
        std::string origin(it->value().begin(), it->value().end());

        if (origin == prodDomain) return origin;

        // Dev origins: localhost on any port
        if (origin.find("http://localhost:") == 0) return origin;
        if (origin.find("http://127.0.0.1:") == 0) return origin;

        // Dev origins: private network IPs (10.x, 172.16-31.x, 192.168.x)
        // Allow any origin from a private IP range on port 5173
        if (origin.find(":5173") != std::string::npos) {
            // Extract host part to check if it's a private IP
            size_t protoEnd = origin.find("://");
            size_t portStart = origin.find(":5173");
            if (protoEnd != std::string::npos && portStart != std::string::npos) {
                std::string host = origin.substr(protoEnd + 3, portStart - protoEnd - 3);
                // Check private IP ranges: 10.x.x.x, 172.16-31.x.x, 192.168.x.x
                if (host.find("10.") == 0 ||
                    (host.find("172.") == 0 && host.size() > 6 &&
                     host[4] >= '1' && host[4] <= '3' &&
                     host[5] >= '0' && host[5] <= '9') ||
                    host.find("192.168.") == 0) {
                    return origin;
                }
            }
        }
    }
    return prodDomain;
}

void addCorsHeaders(http::response<http::string_body>& res, const http::request<http::string_body>& req) {
    res.set(http::field::access_control_allow_origin, getAllowedOrigin(req));
    res.set(http::field::access_control_allow_methods, "GET, POST, PUT, DELETE, OPTIONS");
    res.set(http::field::access_control_allow_headers, "Content-Type, Authorization");
    res.set(http::field::access_control_allow_credentials, "true");
}

// ============================================
// HTTP SESSION (con timeout)
// ============================================
class HttpSession : public std::enable_shared_from_this<HttpSession> {
    tcp::socket socket_;
    beast::flat_buffer buffer_;
    http::request<http::string_body> req_;
    net::steady_timer timer_;
    
public:
    explicit HttpSession(tcp::socket&& socket) 
        : socket_(std::move(socket))
        , timer_(socket_.get_executor()) {
        timer_.expires_after(std::chrono::seconds(30));
    }
    
    void run() { 
        set_timeout();
        read_request(); 
    }
    
private:
    void set_timeout() {
        auto self = shared_from_this();
        timer_.async_wait([self](beast::error_code ec) {
            if (!ec) {
                beast::error_code close_ec;
                self->socket_.close(close_ec);
            }
        });
    }
    
    void read_request() {
        auto self = shared_from_this();
        http::async_read(socket_, buffer_, req_,
            [self](beast::error_code ec, std::size_t) { 
                if (!ec) {
                    self->timer_.cancel();
                    self->handle_request(); 
                }
            });
    }
    
    void handle_request() {
        std::cout << "[REQUEST] " << req_.method_string() << " " << req_.target() << std::endl;
        
        if (req_.method() == http::verb::options) {
            http::response<http::string_body> res{http::status::ok, req_.version()};
            addCorsHeaders(res, req_);
            res.set(http::field::connection, "close");
            res.prepare_payload(); 
            write_response(res); 
            return;
        }
        
        http::response<http::string_body> res{http::status::ok, req_.version()};
        res.set(http::field::server, "Simulation Service");
        addCorsHeaders(res, req_);
        res.set(http::field::content_type, "application/json");

        {
            std::string rateKey = extractToken(req_);
            auto hostIt = req_.find(http::field::host);
            if (rateKey.empty()) rateKey = hostIt != req_.end() ? std::string(hostIt->value()) : "unknown";
            if (!security::RateLimiter::instance().allow(rateKey)) {
                res.result(http::status::too_many_requests);
                res.body() = json::serialize(json::object{{"error", "Rate limit exceeded"}});
                res.prepare_payload();
                write_response(res);
                return;
            }
        }

        try {
            std::string fullTarget(req_.target().begin(), req_.target().end());
            std::string target = fullTarget;
            size_t queryPos = target.find('?');
            if (queryPos != std::string::npos) {
                target = target.substr(0, queryPos);
            }
            
            if (req_.method() == http::verb::get && target == "/simulations") {
                handle_get_simulations(res);
            } else if (req_.method() == http::verb::post && target == "/simulations") {
                handle_create_simulation(res);
            } else if (req_.method() == http::verb::put && target.find("/simulations/") == 0) {
                handle_update_simulation(res);
            } else if (req_.method() == http::verb::delete_ && target.find("/simulations/") == 0) {
                handle_delete_simulation(res);
            } else if (req_.method() == http::verb::get && target == "/health") {
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
        res.prepare_payload(); 
        write_response(res);
    }
    
    // ============================================
    // HANDLERS
    // ============================================
    void handle_get_simulations(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid || userInfo.postgresId.empty()) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            emitSimulationEvent("get_simulations_failed", "", "", 401, {{"reason", "invalid_token"}});
            return;
        }
        auto sims = SimulationService::getInstance().getSimulationsByUser(userInfo.postgresId);
        json::array arr;
        for (const auto& s : sims) {
            json::object obj;
            obj["id"] = s.id; obj["amount"] = s.amount; 
            obj["categoryId"] = s.categoryId.empty() ? nullptr : json::value(s.categoryId);
            obj["categoryName"] = s.categoryName.empty() ? nullptr : json::value(s.categoryName);
            obj["description"] = s.description.empty() ? nullptr : json::value(s.description);
            obj["startDate"] = s.startDate; obj["endDate"] = s.endDate;
            obj["days"] = s.days; obj["weeks"] = s.weeks; obj["months"] = s.months;
            obj["period"] = s.period; obj["createdAt"] = s.createdAt;
            arr.push_back(obj);
        }
        res.result(http::status::ok); 
        res.body() = json::serialize(arr);
        emitSimulationEvent("get_simulations", userInfo.postgresId, "", 200, 
            {{"count", static_cast<int64_t>(sims.size())}});
    }
    
    void handle_create_simulation(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid || userInfo.postgresId.empty()) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            emitSimulationEvent("create_simulation_failed", "", "", 401, {{"reason", "invalid_token"}});
            return;
        }
        try {
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

            auto amtCheck = security::validateAmount(s.amount, 1.0);
            if (!amtCheck.valid) { res.result(http::status::bad_request); res.body() = json::serialize(json::object{{"error", amtCheck.error}}); return; }
            auto dateCheck = security::validateDate(s.startDate);
            if (!dateCheck.valid) { res.result(http::status::bad_request); res.body() = json::serialize(json::object{{"error", dateCheck.error}}); return; }

            auto created = SimulationService::getInstance().createSimulation(s);
            if (!created) { 
                res.result(http::status::internal_server_error); 
                res.body() = json::serialize(json::object{{"error", "Error creating simulation"}});
                emitSimulationEvent("create_simulation_failed", userInfo.postgresId, "", 500, {{"reason", "db_error"}});
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
            emitSimulationEvent("create_simulation_failed", userInfo.postgresId, "", 400,
                {{"reason", "bad_request"}, {"error", e.what()}});
        }
    }
    
    void handle_update_simulation(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid || userInfo.postgresId.empty()) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            return;
        }
        std::string target = std::string(req_.target().begin(), req_.target().end());
        std::string id = target.substr(13); // "/simulations/"
        size_t qPos = id.find('?');
        if (qPos != std::string::npos) id = id.substr(0, qPos);
        
        try {
            auto jv = json::parse(req_.body());
            bool ok = SimulationService::getInstance().updateSimulation(id, userInfo.postgresId, jv.as_object());
            res.result(ok ? http::status::ok : http::status::not_found);
            res.body() = json::serialize(json::object{{"message", ok ? "Updated" : "Not found"}});
            if (ok) emitSimulationEvent("simulation_updated", userInfo.postgresId, id, 200);
            else emitSimulationEvent("update_simulation_failed", userInfo.postgresId, id, 404, {{"reason", "not_found"}});
        } catch (const std::exception& e) { 
            res.result(http::status::bad_request);
            res.body() = json::serialize(json::object{{"error", e.what()}});
        }
    }
    
    void handle_delete_simulation(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid || userInfo.postgresId.empty()) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            return;
        }
        std::string target = std::string(req_.target().begin(), req_.target().end());
        std::string id = target.substr(13); // "/simulations/"
        size_t qPos = id.find('?');
        if (qPos != std::string::npos) id = id.substr(0, qPos);
        
        bool ok = SimulationService::getInstance().deleteSimulation(id, userInfo.postgresId);
        res.result(ok ? http::status::ok : http::status::not_found);
        res.body() = json::serialize(json::object{{"message", ok ? "Deleted" : "Not found"}});
        if (ok) emitSimulationEvent("simulation_deleted", userInfo.postgresId, id, 200);
        else emitSimulationEvent("delete_simulation_failed", userInfo.postgresId, id, 404, {{"reason", "not_found"}});
    }
    
    void write_response(http::response<http::string_body>& res) {
        auto self = shared_from_this();
        
        bool close = (req_.method() == http::verb::options) || !req_.keep_alive();
        res.keep_alive(!close);
        
        if (close) {
            res.set(http::field::connection, "close");
        }
        
        http::async_write(socket_, res,
            [self, close](beast::error_code ec, std::size_t) {
                if (ec) {
                    std::cerr << "[ERROR] Write failed: " << ec.message() << std::endl;
                    return;
                }
                
                if (close) {
                    beast::error_code shutdown_ec;
                    self->socket_.shutdown(tcp::socket::shutdown_send, shutdown_ec);
                }
            });
    }
};

// ============================================
// HTTP SERVER (MULTI-HILO)
// ============================================
class HttpServer {
    net::io_context ioc_;
    tcp::acceptor acceptor_;
    std::vector<std::thread> threads_;
    
public:
    HttpServer(const std::string& address, unsigned short port)
        : ioc_(std::max(1u, std::thread::hardware_concurrency()))
        , acceptor_(ioc_) {
        tcp::endpoint endpoint(net::ip::make_address(address), port);
        acceptor_.open(endpoint.protocol());
        acceptor_.set_option(tcp::acceptor::reuse_address(true));
        acceptor_.bind(endpoint);
        acceptor_.listen();
        std::cout << "Simulation Service listening on " << address << ":" << port << std::endl;
    }
    
    void run() { 
        do_accept(); 
        
        unsigned int num_threads = std::max(1u, std::thread::hardware_concurrency());
        std::cout << "Starting " << num_threads << " worker threads" << std::endl;
        
        for (unsigned int i = 0; i < num_threads; ++i) {
            threads_.emplace_back([this]() {
                ioc_.run();
            });
        }
        
        for (auto& t : threads_) {
            if (t.joinable()) t.join();
        }
    }
    
private:
    void do_accept() {
        acceptor_.async_accept([this](beast::error_code ec, tcp::socket socket) {
            if (!ec) std::make_shared<HttpSession>(std::move(socket))->run();
            do_accept();
        });
    }
};

// ============================================
// MAIN
// ============================================
int main() {
    std::signal(SIGSEGV, signalHandler);
    std::signal(SIGABRT, signalHandler);
    std::signal(SIGFPE, signalHandler);
    std::signal(SIGILL, signalHandler);
    
    try {
        unsigned short port = std::getenv("SERVER_PORT") ? std::stoi(std::getenv("SERVER_PORT")) : 0;
        
        keycloakClient = std::make_unique<keycloak::KeycloakClient>(
            std::getenv("KEYCLOAK_URL") ? std::getenv("KEYCLOAK_URL") : "",
            std::getenv("KEYCLOAK_REALM") ? std::getenv("KEYCLOAK_REALM") : "");
        
        Database::getInstance().connect(
            std::getenv("POSTGRES_HOST") ? std::getenv("POSTGRES_HOST") : "",
            std::getenv("POSTGRES_PORT") ? std::stoi(std::getenv("POSTGRES_PORT")) : 0,
            std::getenv("POSTGRES_DB") ? std::getenv("POSTGRES_DB") : "",
            std::getenv("POSTGRES_USER") ? std::getenv("POSTGRES_USER") : "",
            std::getenv("POSTGRES_PASSWORD") ? std::getenv("POSTGRES_PASSWORD") : "");
        
        auto& redis = redis::RedisClient::getInstance();
        redis.connect(
            std::getenv("REDIS_HOST") ? std::getenv("REDIS_HOST") : "",
            std::getenv("REDIS_PORT") ? std::stoi(std::getenv("REDIS_PORT")) : 0,
            std::getenv("REDIS_PASSWORD") ? std::getenv("REDIS_PASSWORD") : "");
        
        kafka::getProducer();
        
        std::cout << "Simulation Service starting on 0.0.0.0:" << port << std::endl;
        std::cout << "Redis cache: " << (redis.isConnected() ? "enabled" : "disabled") << std::endl;
        
        HttpServer server("0.0.0.0", port);
        server.run();
        
    } catch (const std::exception& e) { 
        std::cerr << "Error: " << e.what() << std::endl; 
        return 1; 
    }
    return 0;
}
