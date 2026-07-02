// src/main.cpp (Goal Service - HARDENED)
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
#include <cstring>
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
        info.error = "No token provided"; 
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

        // Production origins
        if (origin == "https://yung-accountant.duckdns.org") return origin;

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
    return "https://yung-accountant.duckdns.org";
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
        res.set(http::field::server, "Goal Service");
        addCorsHeaders(res, req_);
        res.set(http::field::content_type, "application/json");
        
        try {
            std::string fullTarget(req_.target().begin(), req_.target().end());
            std::string target = fullTarget;
            size_t queryPos = target.find('?');
            if (queryPos != std::string::npos) {
                target = target.substr(0, queryPos);
            }
            
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
            } else if (req_.method() == http::verb::post && target.find("/goal-transactions") != std::string::npos) {
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
        if (!userInfo.isValid || userInfo.postgresId.empty()) {
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
            obj["status"] = g.status; obj["context"] = g.context.empty() ? nullptr : json::value(g.context);
            obj["purchaseCategoryId"] = g.purchaseCategoryId.empty() ? nullptr : json::value(g.purchaseCategoryId);
            obj["completedAt"] = g.completedAt.empty() ? nullptr : json::value(g.completedAt);
            obj["createdAt"] = g.createdAt;
            
            auto transactions = GoalService::getInstance().getGoalTransactions(g.id);
            json::array tarr;
            for (const auto& t : transactions) {
                json::object to;
                to["id"] = t.id; to["amount"] = t.amount; to["type"] = t.type;
                to["note"] = t.note.empty() ? nullptr : json::value(t.note);
                to["date"] = t.date; 
                to["walletId"] = t.walletId.empty() ? nullptr : json::value(t.walletId);
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
        if (!userInfo.isValid || userInfo.postgresId.empty()) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            return;
        }
        std::string id = std::string(req_.target().begin(), req_.target().end()).substr(7);
        // Limpiar query params del ID
        size_t qPos = id.find('?');
        if (qPos != std::string::npos) id = id.substr(0, qPos);
        
        auto g = GoalService::getInstance().getGoalById(id, userInfo.postgresId);
        if (!g) {
            res.result(http::status::not_found);
            res.body() = json::serialize(json::object{{"error", "Not found"}});
            emitGoalEvent("get_goal_failed", userInfo.postgresId, id, 404, {{"reason", "not_found"}});
            return;
        }
        json::object obj;
        obj["id"] = g->id; obj["name"] = g->name; obj["targetAmount"] = g->targetAmount;
        obj["currentAmount"] = g->currentAmount; obj["status"] = g->status;
        obj["priority"] = g->priority; obj["targetDate"] = g->targetDate;
        obj["context"] = g->context.empty() ? nullptr : json::value(g->context);
        res.result(http::status::ok);
        res.body() = json::serialize(obj);
    }
    
    void handle_create_goal(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid || userInfo.postgresId.empty()) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            emitGoalEvent("create_goal_failed", "", "", 401, {{"reason", "invalid_token"}});
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
            
            Goal g;
            g.userId = userInfo.postgresId;
            g.name = std::string(obj.at("name").as_string());
            g.targetAmount = toDouble(obj.at("targetAmount"));
            g.currentAmount = obj.contains("currentAmount") ? toDouble(obj.at("currentAmount")) : 0;
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
            resp["name"] = created->name; resp["targetAmount"] = created->targetAmount;
            res.body() = json::serialize(resp);
            
            emitGoalEvent("goal_created", userInfo.postgresId, created->id, 201,
                {{"name", g.name}, {"targetAmount", g.targetAmount}, {"priority", g.priority}});
        } catch (const std::exception& e) {
            res.result(http::status::bad_request);
            res.body() = json::serialize(json::object{{"error", e.what()}});
            emitGoalEvent("create_goal_failed", userInfo.postgresId, "", 400,
                {{"reason", "bad_request"}, {"error", e.what()}});
        }
    }
    
    void handle_update_goal(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid || userInfo.postgresId.empty()) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            return;
        }
        std::string id = std::string(req_.target().begin(), req_.target().end()).substr(7);
        size_t qPos = id.find('?');
        if (qPos != std::string::npos) id = id.substr(0, qPos);
        
        try {
            auto jv = json::parse(req_.body());
            auto& updates = jv.as_object();
            bool ok = GoalService::getInstance().updateGoal(id, userInfo.postgresId, updates);
            
            if (!ok) {
                res.result(http::status::not_found);
                res.body() = json::serialize(json::object{{"error", "Not found"}});
                emitGoalEvent("update_goal_failed", userInfo.postgresId, id, 404, {{"reason", "not_found"}});
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
        if (!userInfo.isValid || userInfo.postgresId.empty()) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            return;
        }
        std::string id = std::string(req_.target().begin(), req_.target().end()).substr(7);
        size_t qPos = id.find('?');
        if (qPos != std::string::npos) id = id.substr(0, qPos);
        
        bool ok = GoalService::getInstance().deleteGoal(id, userInfo.postgresId);
        res.result(ok ? http::status::ok : http::status::not_found);
        res.body() = json::serialize(json::object{{"message", ok ? "Meta eliminada" : "Not found"}});
        if (ok) emitGoalEvent("goal_deleted", userInfo.postgresId, id, 200);
        else emitGoalEvent("delete_goal_failed", userInfo.postgresId, id, 404, {{"reason", "not_found"}});
    }
    
    void handle_add_transaction(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid || userInfo.postgresId.empty()) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
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
            
            GoalTransaction t;
            t.goalId = std::string(obj.at("goalId").as_string());
            t.amount = toDouble(obj.at("amount"));
            t.type = std::string(obj.at("type").as_string());
            t.note = obj.contains("note") ? std::string(obj.at("note").as_string()) : "";
            t.date = std::string(obj.at("date").as_string());
            t.walletId = std::string(obj.at("walletId").as_string());
            
            auto created = GoalService::getInstance().addGoalTransaction(t);
            if (!created) {
                res.result(http::status::internal_server_error);
                res.body() = json::serialize(json::object{{"error", "Error"}});
                emitGoalEvent("add_transaction_failed", userInfo.postgresId, t.goalId, 500, {{"reason", "db_error"}});
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
        if (!userInfo.isValid || userInfo.postgresId.empty()) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            return;
        }
        std::string target = std::string(req_.target().begin(), req_.target().end());
        std::string id = target.substr(strlen("/goal-transactions/"));
        size_t qPos = id.find('?');
        if (qPos != std::string::npos) id = id.substr(0, qPos);
        
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
        std::cout << "Goal Service listening on " << address << ":" << port << std::endl;
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
        
        std::cout << "Goal Service starting on 0.0.0.0:" << port << std::endl;
        std::cout << "Redis cache: " << (redis.isConnected() ? "enabled" : "disabled") << std::endl;
        
        HttpServer server("0.0.0.0", port);
        server.run();
        
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }
    
    return 0;
}
