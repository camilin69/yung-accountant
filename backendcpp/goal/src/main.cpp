#include <boost/beast/core.hpp>
#include <boost/beast/http.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <boost/json.hpp>
#include <iostream>
#include <memory>
#include <ctime>
#include "goal_service.hpp"
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

// ============================================
// HELPERS
// ============================================
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
    if (token.empty()) {
        keycloak::UserInfo info; info.isValid = false; info.error = "No token provided"; return info;
    }
    return keycloakClient->verifyToken(token);
}

// ============================================
// KAFKA EVENTS
// ============================================
void emitGoalEvent(const std::string& type, const std::string& userId,
                   const std::string& goalId, int status, const json::object& extra = {}) {
    try {
        json::object event;
        event["type"] = type;
        event["service"] = "goals";
        event["user_id"] = userId;
        event["goal_id"] = goalId;
        event["timestamp"] = std::time(nullptr);
        event["status_code"] = status;
        for (const auto& [k, v] : extra) event[k] = v;
        kafka::getProducer().produce("goal-events", event);
        
        std::string s = (status >= 200 && status < 300) ? "SUCCESS" : "FAILED";
        std::cout << "[Kafka] " << type << " (" << s << ") user=" << userId << " goal=" << goalId << std::endl;
    } catch (const std::exception& e) {
        std::cerr << "[Kafka] Error: " << e.what() << std::endl;
    }
}

// ============================================
// CORS
// ============================================
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

// ============================================
// HTTP SESSION
// ============================================
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
        res.set(http::field::server, "Goal Service");
        addCorsHeaders(res, req_);
        res.set(http::field::content_type, "application/json");
        
        try {
            std::string target(req_.target().begin(), req_.target().end());
            
            if (req_.method() == http::verb::get && target == "/goals") {
                handle_get_goals(res);
            } else if (req_.method() == http::verb::get && target.find("/goals/") == 0 && target.find("/transactions") == std::string::npos) {
                handle_get_goal(res);
            } else if (req_.method() == http::verb::post && target == "/goals") {
                handle_create_goal(res);
            } else if (req_.method() == http::verb::put && target.find("/goals/") == 0 && target.find("/transactions") == std::string::npos) {
                handle_update_goal(res);
            } else if (req_.method() == http::verb::delete_ && target.find("/goals/") == 0 && target.find("/transactions") == std::string::npos) {
                handle_delete_goal(res);
            } else if (req_.method() == http::verb::post && target.find("/goals/") != std::string::npos && target.find("/transactions") != std::string::npos) {
                handle_add_transaction(res);
            } else if (req_.method() == http::verb::delete_ && target.find("/goal-transactions/") != std::string::npos) {
                handle_delete_transaction(res);
            } else if (req_.method() == http::verb::get && target == "/health") {
                json::object r;
                r["status"] = "ok"; r["service"] = "goals";
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
    void handle_get_goals(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            emitGoalEvent("get_goals_failed", "", "", 401, {{"reason", "invalid_token"}});
            return;
        }
        auto goals = GoalService::getInstance().getGoalsByUser(userInfo.postgresId);
        json::array arr;
        int activeCount = 0, completedCount = 0;
        for (const auto& g : goals) {
            json::object obj;
            obj["id"] = g.id; obj["name"] = g.name;
            obj["targetAmount"] = g.targetAmount; obj["currentAmount"] = g.currentAmount;
            obj["targetDate"] = g.targetDate; obj["priority"] = g.priority;
            obj["status"] = g.status; obj["context"] = g.context;
            obj["purchaseCategoryId"] = g.purchaseCategoryId;
            obj["completedAt"] = g.completedAt; obj["createdAt"] = g.createdAt;
            
            auto transactions = GoalService::getInstance().getGoalTransactions(g.id);
            json::array tarr;
            for (const auto& t : transactions) {
                json::object to;
                to["id"] = t.id; to["amount"] = t.amount; to["type"] = t.type;
                to["note"] = t.note; to["date"] = t.date; to["walletId"] = t.walletId;
                tarr.push_back(to);
            }
            obj["transactions"] = tarr;
            arr.push_back(obj);
            
            if (g.status == "active") activeCount++; else if (g.status == "completed") completedCount++;
        }
        res.result(http::status::ok);
        res.body() = json::serialize(arr);
        
        emitGoalEvent("get_goals", userInfo.postgresId, "", 200,
            {{"count", static_cast<int64_t>(goals.size())}, {"active", activeCount}, {"completed", completedCount}});
    }
    
    void handle_get_goal(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            return;
        }
        std::string id = std::string(req_.target().begin(), req_.target().end()).substr(7);
        auto g = GoalService::getInstance().getGoalById(id, userInfo.postgresId);
        if (!g) {
            res.result(http::status::not_found);
            res.body() = json::serialize(json::object{{"error", "Not found"}});
            return;
        }
        json::object obj;
        obj["id"] = g->id; obj["name"] = g->name; obj["targetAmount"] = g->targetAmount;
        obj["currentAmount"] = g->currentAmount; obj["status"] = g->status;
        res.result(http::status::ok);
        res.body() = json::serialize(obj);
    }
    
    void handle_create_goal(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            emitGoalEvent("create_goal_failed", "", "", 401, {{"reason", "invalid_token"}});
            return;
        }
        try {
            auto jv = json::parse(req_.body());
            auto& obj = jv.as_object();
            
            std::cout << "[CREATE GOAL] Body: " << req_.body() << std::endl;
            Goal g;
            g.userId = userInfo.postgresId;
            g.name = std::string(obj.at("name").as_string());
            if (obj.at("targetAmount").is_int64()) {
                g.targetAmount = static_cast<double>(obj.at("targetAmount").as_int64());
            } else if (obj.at("targetAmount").is_double()) {
                g.targetAmount = obj.at("targetAmount").as_double();
            } else {
                g.targetAmount = obj.at("targetAmount").as_double();
            }
            g.currentAmount = obj.contains("currentAmount") ? obj.at("currentAmount").as_double() : 0;
            g.targetDate = std::string(obj.at("targetDate").as_string());
            g.priority = obj.contains("priority") ? std::string(obj.at("priority").as_string()) : "medium";
            g.status = "active";
            g.context = obj.contains("context") ? std::string(obj.at("context").as_string()) : "";
            g.purchaseCategoryId = obj.contains("purchaseCategoryId") ? std::string(obj.at("purchaseCategoryId").as_string()) : "";
            
            auto created = GoalService::getInstance().createGoal(g);
            if (!created) {
                res.result(http::status::internal_server_error);
                res.body() = json::serialize(json::object{{"error", "Error creating goal"}});
                emitGoalEvent("create_goal_failed", userInfo.postgresId, "", 500, {{"reason", "db_error"}});
                return;
            }
            
            res.result(http::status::created);
            json::object resp;
            resp["id"] = created->id; resp["message"] = "Meta creada exitosamente";
            res.body() = json::serialize(resp);
            
            emitGoalEvent("goal_created", userInfo.postgresId, created->id, 201,
                {{"name", g.name}, {"targetAmount", g.targetAmount}, {"priority", g.priority}});
        } catch (const std::exception& e) {
            res.result(http::status::bad_request);
            res.body() = json::serialize(json::object{{"error", e.what()}});
        }
    }
    
    void handle_update_goal(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            return;
        }
        std::string id = std::string(req_.target().begin(), req_.target().end()).substr(7);
        try {
            auto jv = json::parse(req_.body());
            auto& updates = jv.as_object();
            bool ok = GoalService::getInstance().updateGoal(id, userInfo.postgresId, updates);
            
            if (!ok) {
                res.result(http::status::not_found);
                res.body() = json::serialize(json::object{{"error", "Not found"}});
                return;
            }
            
            res.result(http::status::ok);
            res.body() = json::serialize(json::object{{"message", "Meta actualizada"}, {"id", id}});
            
            json::object extra;
            if (updates.contains("status")) extra["new_status"] = updates.at("status");
            if (updates.contains("currentAmount")) extra["currentAmount"] = updates.at("currentAmount");
            emitGoalEvent("goal_updated", userInfo.postgresId, id, 200, extra);
        } catch (const std::exception& e) {
            res.result(http::status::bad_request);
            res.body() = json::serialize(json::object{{"error", e.what()}});
        }
    }
    
    void handle_delete_goal(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            return;
        }
        std::string id = std::string(req_.target().begin(), req_.target().end()).substr(7);
        bool ok = GoalService::getInstance().deleteGoal(id, userInfo.postgresId);
        res.result(ok ? http::status::ok : http::status::not_found);
        res.body() = json::serialize(json::object{{"message", ok ? "Meta eliminada" : "Not found"}});
        if (ok) emitGoalEvent("goal_deleted", userInfo.postgresId, id, 200);
    }
    
    void handle_add_transaction(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            return;
        }
        try {
            auto jv = json::parse(req_.body());
            auto& obj = jv.as_object();
            
            GoalTransaction t;
            t.goalId = std::string(obj.at("goalId").as_string());
            
            // Manejar int/double para amount
            if (obj.at("amount").is_int64()) {
                t.amount = static_cast<double>(obj.at("amount").as_int64());
            } else {
                t.amount = obj.at("amount").as_double();
            }
            
            t.type = std::string(obj.at("type").as_string());
            t.note = obj.contains("note") ? std::string(obj.at("note").as_string()) : "";
            t.date = std::string(obj.at("date").as_string());
            t.walletId = std::string(obj.at("walletId").as_string());
            
            auto created = GoalService::getInstance().addGoalTransaction(t);
            if (!created) {
                res.result(http::status::internal_server_error);
                res.body() = json::serialize(json::object{{"error", "Error"}});
                return;
            }
            
            GoalService::getInstance().invalidateCache(userInfo.postgresId);
            res.result(http::status::created);
            res.body() = json::serialize(json::object{{"id", created->id}, {"message", "Transaction added"}});
            
            emitGoalEvent("goal_transaction_added", userInfo.postgresId, t.goalId, 201,
                {{"amount", t.amount}, {"type", t.type}});
        } catch (const std::exception& e) {
            res.result(http::status::bad_request);
            res.body() = json::serialize(json::object{{"error", e.what()}});
        }
    }
    
    void handle_delete_transaction(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            return;
        }
        std::string id = std::string(req_.target().begin(), req_.target().end()).substr(strlen("/goal-transactions/"));
        bool ok = GoalService::getInstance().deleteGoalTransaction(id);
        res.result(ok ? http::status::ok : http::status::not_found);
        res.body() = json::serialize(json::object{{"message", ok ? "Transaction deleted" : "Not found"}});
        if (ok) {
            GoalService::getInstance().invalidateCache(userInfo.postgresId);
            emitGoalEvent("goal_transaction_deleted", userInfo.postgresId, id, 200);
        }
    }
    
    void write_response(http::response<http::string_body>& res) {
        auto self = shared_from_this();
        http::async_write(socket_, res,
            [self](beast::error_code ec, std::size_t) {
                self->socket_.shutdown(tcp::socket::shutdown_send, ec);
            });
    }
};

// ============================================
// HTTP SERVER
// ============================================
class HttpServer {
    net::io_context ioc_;
    tcp::acceptor acceptor_;
public:
    HttpServer(const std::string& address, unsigned short port)
        : ioc_(1), acceptor_(ioc_, tcp::endpoint(net::ip::make_address(address), port)) {
        std::cout << "Goal Service listening on " << address << ":" << port << std::endl;
    }
    void run() { do_accept(); ioc_.run(); }
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
    try {
        unsigned short port = std::getenv("SERVER_PORT") ? std::stoi(std::getenv("SERVER_PORT")) : 8084;
        
        keycloakClient = std::make_unique<keycloak::KeycloakClient>(
            std::getenv("KEYCLOAK_URL") ? std::getenv("KEYCLOAK_URL") : "http://keycloak:8080",
            std::getenv("KEYCLOAK_REALM") ? std::getenv("KEYCLOAK_REALM") : "yung-accountant");
        
        if (!Database::getInstance().connect(
                std::getenv("POSTGRES_HOST") ? std::getenv("POSTGRES_HOST") : "postgresdb",
                std::getenv("POSTGRES_PORT") ? std::stoi(std::getenv("POSTGRES_PORT")) : 5432,
                std::getenv("POSTGRES_DB") ? std::getenv("POSTGRES_DB") : "yung_accountant",
                std::getenv("POSTGRES_USER") ? std::getenv("POSTGRES_USER") : "admin",
                std::getenv("POSTGRES_PASSWORD") ? std::getenv("POSTGRES_PASSWORD") : "secret123")) {
            std::cerr << "Failed to connect. Exiting..." << std::endl;
            return 1;
        }
        
        auto& redis = redis::RedisClient::getInstance();
        redis.connect(
            std::getenv("REDIS_HOST") ? std::getenv("REDIS_HOST") : "redis",
            std::getenv("REDIS_PORT") ? std::stoi(std::getenv("REDIS_PORT")) : 6379,
            std::getenv("REDIS_PASSWORD") ? std::getenv("REDIS_PASSWORD") : "");
        
        kafka::getProducer();
        
        std::cout << "Goal Service starting on 0.0.0.0:" << port << std::endl;
        HttpServer server("0.0.0.0", port);
        server.run();
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }
    return 0;
}