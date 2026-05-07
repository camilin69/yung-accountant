#include <boost/beast/core.hpp>
#include <boost/beast/http.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <boost/json.hpp>
#include <iostream>
#include <memory>
#include <ctime>
#include "habit_service.hpp"
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
    if (token.empty()) { keycloak::UserInfo info; info.isValid = false; info.error = "No token"; return info; }
    return keycloakClient->verifyToken(token);
}

void emitHabitEvent(const std::string& type, const std::string& userId,
                    const std::string& habitId, int status, const json::object& extra = {}) {
    try {
        json::object event;
        event["type"] = type; event["service"] = "habits";
        event["user_id"] = userId; event["habit_id"] = habitId;
        event["timestamp"] = std::time(nullptr); event["status_code"] = status;
        for (const auto& [k, v] : extra) event[k] = v;
        kafka::getProducer().produce("habit-events", event);
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
        res.set(http::field::server, "Habit Service");
        addCorsHeaders(res, req_);
        res.set(http::field::content_type, "application/json");
        
        try {
            std::string target(req_.target().begin(), req_.target().end());
            
            if (req_.method() == http::verb::get && target == "/habits") {
                handle_get_habits(res);
            } else if (req_.method() == http::verb::post && target == "/habits") {
                handle_create_habit(res);
            } else if (req_.method() == http::verb::put && target.find("/habits/") == 0 && target.find("/check") == std::string::npos) {
                handle_update_habit(res);
            } else if (req_.method() == http::verb::delete_ && target.find("/habits/") == 0) {
                handle_delete_habit(res);
            } else if (req_.method() == http::verb::post && target.find("/habits/") != std::string::npos && target.find("/check") != std::string::npos) {
                handle_check_habit(res);
            } else if (req_.method() == http::verb::get && target == "/health") {
                json::object r;
                r["status"] = "ok"; r["service"] = "habits";
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
    
    void handle_get_habits(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) { /* error */ return; }
        auto habits = HabitService::getInstance().getHabitsByUser(userInfo.postgresId);
        json::array arr;
        for (const auto& h : habits) {
            json::object obj;
            obj["id"] = h.id; obj["name"] = h.name; obj["isActive"] = h.isActive;
            obj["currentStreak"] = h.currentStreak; obj["bestStreak"] = h.bestStreak;
            obj["createdAt"] = h.createdAt;
            
            auto checks = HabitService::getInstance().getChecks(h.id);
            json::array carr;
            for (const auto& c : checks) {
                json::object co;
                co["checkDate"] = c.checkDate; co["completed"] = c.completed; co["note"] = c.note;
                carr.push_back(co);
            }
            obj["checks"] = carr;
            arr.push_back(obj);
        }
        res.result(http::status::ok);
        res.body() = json::serialize(arr);
    }
    
    void handle_create_habit(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            return;
        }
        try {
            auto jv = json::parse(req_.body());
            auto& obj = jv.as_object();
            Habit h;
            h.userId = userInfo.postgresId;
            h.name = std::string(obj.at("name").as_string());
            h.isActive = true;
            h.currentStreak = 0;
            h.bestStreak = 0;
            
            auto created = HabitService::getInstance().createHabit(h);
            if (!created) {
                res.result(http::status::internal_server_error);
                res.body() = json::serialize(json::object{{"error", "Error"}});
                return;
            }
            res.result(http::status::created);
            res.body() = json::serialize(json::object{{"id", created->id}, {"message", "Hábito creado"}});
            emitHabitEvent("habit_created", userInfo.postgresId, created->id, 201, {{"name", h.name}});
        } catch (const std::exception& e) {
            res.result(http::status::bad_request);
            res.body() = json::serialize(json::object{{"error", e.what()}});
        }
    }
    
    void handle_update_habit(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}}); return;
        }
        std::string id = std::string(req_.target().begin(), req_.target().end()).substr(8);
        try {
            auto jv = json::parse(req_.body());
            bool ok = HabitService::getInstance().updateHabit(id, userInfo.postgresId, jv.as_object());
            res.result(ok ? http::status::ok : http::status::not_found);
            res.body() = json::serialize(json::object{{"message", ok ? "Updated" : "Not found"}});
            if (ok) emitHabitEvent("habit_updated", userInfo.postgresId, id, 200);
        } catch (const std::exception& e) {
            res.result(http::status::bad_request);
            res.body() = json::serialize(json::object{{"error", e.what()}});
        }
    }
    
    void handle_delete_habit(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}}); return;
        }
        std::string id = std::string(req_.target().begin(), req_.target().end()).substr(8);
        bool ok = HabitService::getInstance().deleteHabit(id, userInfo.postgresId);
        res.result(ok ? http::status::ok : http::status::not_found);
        res.body() = json::serialize(json::object{{"message", ok ? "Deleted" : "Not found"}});
        if (ok) emitHabitEvent("habit_deleted", userInfo.postgresId, id, 200);
    }
    
    void handle_check_habit(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) { /* error */ return; }
        
        std::cout << "[CHECK HABIT] Target: " << req_.target() << std::endl;
        std::cout << "[CHECK HABIT] Body: " << req_.body() << std::endl;
        
        try {
            auto jv = json::parse(req_.body());
            auto& obj = jv.as_object();
            
            // Extraer habitId de la URL: /habits/{id}/check
            std::string target(req_.target().begin(), req_.target().end());
            // target = "/habits/95fb22b6-e9c8-4299-8da4-7468d1266f99/check"
            size_t start = 8; // después de "/habits/"
            size_t end = target.find("/", start);
            std::string habitId = target.substr(start, end - start);
            
            std::cout << "[CHECK HABIT] habitId from URL: " << habitId << std::endl;
            
            HabitCheck c;
            c.checkDate = std::string(obj.at("checkDate").as_string());
            c.completed = obj.at("completed").as_bool();
            c.note = obj.contains("note") ? std::string(obj.at("note").as_string()) : "";
            
            bool ok = HabitService::getInstance().addCheck(habitId, c);
            if (ok) {
                HabitService::getInstance().invalidateCache(userInfo.postgresId);
            }
            
            res.result(ok ? http::status::created : http::status::internal_server_error);
            res.body() = json::serialize(json::object{{"message", ok ? "Check registrado" : "Error"}});
            
        } catch (const std::exception& e) {
            std::cerr << "[CHECK HABIT] Error: " << e.what() << std::endl;
            res.result(http::status::bad_request);
            res.body() = json::serialize(json::object{{"error", e.what()}});
        }
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
        unsigned short port = std::getenv("SERVER_PORT") ? std::stoi(std::getenv("SERVER_PORT")) : 8085;
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
        
        std::cout << "Habit Service starting on 0.0.0.0:" << port << std::endl;
        HttpServer server("0.0.0.0", port);
        server.run();
    } catch (const std::exception& e) { std::cerr << "Error: " << e.what() << std::endl; return 1; }
    return 0;
}