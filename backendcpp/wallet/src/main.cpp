// src/main.cpp (Wallet Service - HARDENED)
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
#include "wallet_service.hpp"
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
void emitWalletEvent(const std::string& type, const std::string& userId,
                     const std::string& walletId, int status, const json::object& extra = {}) {
    try {
        json::object event;
        event["type"] = type; event["service"] = "wallets";
        event["user_id"] = userId; event["wallet_id"] = walletId;
        event["timestamp"] = std::time(nullptr); event["status_code"] = status;
        for (const auto& [k, v] : extra) event[k] = v;
        kafka::getProducer().produce("wallet-events", event);
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
    auto it = req.find(http::field::origin);
    if (it != req.end()) {
        std::string origin(it->value().begin(), it->value().end());
        if (origin == "http://localhost:5173" || origin == "http://localhost:3000" || origin == "https://yung-accountant.duckdns.org") return origin;
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
        res.set(http::field::server, "Wallet Service");
        addCorsHeaders(res, req_);
        res.set(http::field::content_type, "application/json");
        
        try {
            std::string fullTarget(req_.target().begin(), req_.target().end());
            std::string target = fullTarget;
            size_t queryPos = target.find('?');
            if (queryPos != std::string::npos) {
                target = target.substr(0, queryPos);
            }
            
            if (req_.method() == http::verb::get && target == "/wallets") {
                handle_get_wallets(res);
            } else if (req_.method() == http::verb::post && target == "/wallets") {
                handle_create_wallet(res);
            } else if (req_.method() == http::verb::put && target.find("/wallets/") == 0) {
                handle_update_wallet(res);
            } else if (req_.method() == http::verb::delete_ && target.find("/wallets/") == 0) {
                handle_delete_wallet(res);
            } else if (req_.method() == http::verb::get && target == "/health") {
                json::object r; r["status"] = "ok"; r["service"] = "wallets";
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
    void handle_get_wallets(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid || userInfo.postgresId.empty()) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            emitWalletEvent("get_wallets_failed", "", "", 401, {{"reason", "invalid_token"}});
            return;
        }
        auto wallets = WalletService::getInstance().getWalletsByUser(userInfo.postgresId);
        json::array arr;
        for (const auto& w : wallets) {
            json::object obj;
            obj["id"] = w.id; obj["name"] = w.name; obj["type"] = w.type;
            obj["bankName"] = w.bankName.empty() ? nullptr : json::value(w.bankName);
            obj["lastFourDigits"] = w.lastFourDigits.empty() ? nullptr : json::value(w.lastFourDigits);
            obj["color"] = w.color.empty() ? nullptr : json::value(w.color);
            obj["icon"] = w.icon.empty() ? nullptr : json::value(w.icon);
            obj["currentBalance"] = w.currentBalance; obj["isActive"] = w.isActive;
            obj["createdAt"] = w.createdAt;
            arr.push_back(obj);
        }
        res.result(http::status::ok); 
        res.body() = json::serialize(arr);
        emitWalletEvent("get_wallets", userInfo.postgresId, "", 200, 
            {{"count", static_cast<int64_t>(wallets.size())}});
    }
    
    void handle_create_wallet(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid || userInfo.postgresId.empty()) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            emitWalletEvent("create_wallet_failed", "", "", 401, {{"reason", "invalid_token"}});
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
            
            Wallet w;
            w.userId = userInfo.postgresId;
            w.name = std::string(obj.at("name").as_string());
            w.type = std::string(obj.at("type").as_string());
            w.bankName = obj.contains("bankName") ? std::string(obj.at("bankName").as_string()) : "";
            w.lastFourDigits = obj.contains("lastFourDigits") ? std::string(obj.at("lastFourDigits").as_string()) : "";
            w.color = obj.contains("color") ? std::string(obj.at("color").as_string()) : "#6366F1";
            w.icon = obj.contains("icon") ? std::string(obj.at("icon").as_string()) : "Wallet";
            w.currentBalance = obj.contains("currentBalance") ? toDouble(obj.at("currentBalance")) : 0;
            w.isActive = true;
            
            auto created = WalletService::getInstance().createWallet(w);
            if (!created) { 
                res.result(http::status::internal_server_error); 
                res.body() = json::serialize(json::object{{"error", "Error"}}); 
                emitWalletEvent("create_wallet_failed", userInfo.postgresId, "", 500, {{"reason", "db_error"}});
                return; 
            }
            res.result(http::status::created);
            res.body() = json::serialize(json::object{{"id", created->id}, {"message", "Wallet creada"}});
            emitWalletEvent("wallet_created", userInfo.postgresId, created->id, 201, 
                {{"name", w.name}, {"type", w.type}});
        } catch (const std::exception& e) { 
            res.result(http::status::bad_request); 
            res.body() = json::serialize(json::object{{"error", e.what()}});
            emitWalletEvent("create_wallet_failed", userInfo.postgresId, "", 400,
                {{"reason", "bad_request"}, {"error", e.what()}});
        }
    }
    
    void handle_update_wallet(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid || userInfo.postgresId.empty()) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            return;
        }
        std::string target = std::string(req_.target().begin(), req_.target().end());
        std::string id = target.substr(9); // "/wallets/"
        size_t qPos = id.find('?');
        if (qPos != std::string::npos) id = id.substr(0, qPos);
        
        try {
            auto jv = json::parse(req_.body());
            bool ok = WalletService::getInstance().updateWallet(id, userInfo.postgresId, jv.as_object());
            res.result(ok ? http::status::ok : http::status::not_found);
            res.body() = json::serialize(json::object{{"message", ok ? "Updated" : "Not found"}});
            if (ok) emitWalletEvent("wallet_updated", userInfo.postgresId, id, 200);
            else emitWalletEvent("update_wallet_failed", userInfo.postgresId, id, 404, {{"reason", "not_found"}});
        } catch (const std::exception& e) { 
            res.result(http::status::bad_request); 
            res.body() = json::serialize(json::object{{"error", e.what()}});
        }
    }
    
    void handle_delete_wallet(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid || userInfo.postgresId.empty()) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            return;
        }
        std::string target = std::string(req_.target().begin(), req_.target().end());
        std::string id = target.substr(9); // "/wallets/"
        size_t qPos = id.find('?');
        if (qPos != std::string::npos) id = id.substr(0, qPos);
        
        bool ok = WalletService::getInstance().deleteWallet(id, userInfo.postgresId);
        res.result(ok ? http::status::ok : http::status::not_found);
        res.body() = json::serialize(json::object{{"message", ok ? "Deleted" : "Not found"}});
        if (ok) emitWalletEvent("wallet_deleted", userInfo.postgresId, id, 200);
        else emitWalletEvent("delete_wallet_failed", userInfo.postgresId, id, 404, {{"reason", "not_found"}});
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
        std::cout << "Wallet Service listening on " << address << ":" << port << std::endl;
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
        
        std::cout << "Wallet Service starting on 0.0.0.0:" << port << std::endl;
        std::cout << "Redis cache: " << (redis.isConnected() ? "enabled" : "disabled") << std::endl;
        
        HttpServer server("0.0.0.0", port);
        server.run();
        
    } catch (const std::exception& e) { 
        std::cerr << "Error: " << e.what() << std::endl; 
        return 1; 
    }
    return 0;
}
