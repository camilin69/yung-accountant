// src/main.cpp (Categories Service - HARDENED)
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
#include "category_service.hpp"
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
// HELPERS GENERALES
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
// EMITIR EVENTOS A KAFKA
// ============================================
void emitCategoryEvent(const std::string& event_type,
                       const std::string& user_id,
                       const std::string& category_id,
                       int status_code,
                       const boost::json::object& extra_data = {}) {
    try {
        boost::json::object event;
        event["type"] = event_type;
        event["service"] = "categories";
        event["user_id"] = user_id;
        event["category_id"] = category_id;
        event["timestamp"] = std::time(nullptr);
        event["status_code"] = status_code;
        
        for (const auto& [key, value] : extra_data) {
            event[key] = value;
        }
        
        kafka::getProducer().produce("category-events", event);
        
        std::string status = (status_code >= 200 && status_code < 300) ? "SUCCESS" : "FAILED";
        std::cout << "[Kafka] " << event_type << " (" << status 
                  << ") user=" << user_id << " cat=" << category_id << std::endl;
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
        if (origin == "http://localhost:5173" || origin == "http://localhost:3000" || origin == "https://yung-accountant.duckdns.org") {
            return origin;
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
        res.set(http::field::server, "Categories Service");
        addCorsHeaders(res, req_);
        res.set(http::field::content_type, "application/json");
        
        try {
            std::string fullTarget(req_.target().begin(), req_.target().end());
            std::string target = fullTarget;
            size_t queryPos = target.find('?');
            if (queryPos != std::string::npos) {
                target = target.substr(0, queryPos);
            }
            
            if (req_.method() == http::verb::get && target == "/categories/system") {
                handle_get_system_categories(res);
            } else if (req_.method() == http::verb::get && target == "/categories/user") {
                handle_get_user_categories(res);
            } else if (req_.method() == http::verb::get && (target == "/categories/all" || target == "/categories")) {
                handle_get_all_categories(res);
            } else if (req_.method() == http::verb::get && target.find("/categories/") == 0 && target != "/categories/all") {
                handle_get_category_by_id(res);
            } else if (req_.method() == http::verb::post && target == "/categories/user") {
                handle_create_user_category(res);
            } else if (req_.method() == http::verb::put && target.find("/categories/user/") == 0) {
                handle_update_user_category(res);
            } else if (req_.method() == http::verb::delete_ && target.find("/categories/user/") == 0) {
                handle_delete_user_category(res);
            } else if (req_.method() == http::verb::post && target == "/categories/cache/invalidate") {
                handle_invalidate_cache(res);
            } else if (req_.method() == http::verb::get && target == "/health") {
                json::object response;
                response["status"] = "ok"; response["service"] = "categories";
                response["redis"] = redis::RedisClient::getInstance().isConnected();
                res.body() = json::serialize(response);
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
    void handle_get_system_categories(http::response<http::string_body>& res) {
        auto categories = CategoryService::getInstance().getSystemCategories();
        json::array arr;
        for (const auto& cat : categories) {
            json::object obj;
            obj["id"] = cat.id; obj["name"] = cat.name; obj["type"] = cat.type;
            obj["icon"] = cat.icon; obj["color"] = cat.color;
            obj["isSystem"] = true; obj["isDefault"] = true; obj["createdAt"] = cat.createdAt;
            arr.push_back(obj);
        }
        res.result(http::status::ok);
        res.body() = json::serialize(arr);
    }
    
    void handle_get_user_categories(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid || userInfo.postgresId.empty()) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            emitCategoryEvent("get_user_categories_failed", "", "", 401, {{"reason", "invalid_token"}});
            return;
        }
        
        auto categories = CategoryService::getInstance().getUserCategories(userInfo.postgresId);
        json::array arr;
        for (const auto& cat : categories) {
            json::object obj;
            obj["id"] = cat.id; obj["userId"] = cat.userId; obj["name"] = cat.name;
            obj["type"] = cat.type; obj["icon"] = cat.icon; obj["color"] = cat.color;
            obj["isDefault"] = cat.isDefault; obj["isSystem"] = false; obj["createdAt"] = cat.createdAt;
            arr.push_back(obj);
        }
        res.result(http::status::ok);
        res.body() = json::serialize(arr);
        
        emitCategoryEvent("get_user_categories", userInfo.postgresId, "", 200,
            {{"count", static_cast<int64_t>(categories.size())}});
    }
    
    void handle_get_all_categories(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid || userInfo.postgresId.empty()) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            emitCategoryEvent("get_all_categories_failed", "", "", 401, {{"reason", "invalid_token"}});
            return;
        }
        
        auto categories = CategoryService::getInstance().getAllCategories(userInfo.postgresId);
        json::array arr;
        for (const auto& cat : categories) {
            json::object obj;
            obj["id"] = cat.id; obj["userId"] = cat.isSystem ? "" : cat.userId;
            obj["name"] = cat.name; obj["type"] = cat.type; obj["icon"] = cat.icon;
            obj["color"] = cat.color; obj["isDefault"] = cat.isSystem ? true : cat.isDefault;
            obj["isSystem"] = cat.isSystem; obj["createdAt"] = cat.createdAt;
            arr.push_back(obj);
        }
        res.result(http::status::ok);
        res.body() = json::serialize(arr);
        
        emitCategoryEvent("get_all_categories", userInfo.postgresId, "", 200,
            {{"count", static_cast<int64_t>(categories.size())}});
    }
    
    void handle_get_category_by_id(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid || userInfo.postgresId.empty()) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            return;
        }
        
        std::string categoryId = std::string(req_.target().begin(), req_.target().end()).substr(16);
        auto category = CategoryService::getInstance().getCategoryById(categoryId, userInfo.postgresId);
        
        if (!category) {
            res.result(http::status::not_found);
            res.body() = json::serialize(json::object{{"error", "Categoría no encontrada"}});
            emitCategoryEvent("get_category_failed", userInfo.postgresId, categoryId, 404, {{"reason", "not_found"}});
            return;
        }
        
        json::object obj;
        obj["id"] = category->id; obj["userId"] = category->userId; obj["name"] = category->name;
        obj["type"] = category->type; obj["icon"] = category->icon; obj["color"] = category->color;
        obj["isDefault"] = category->isDefault; obj["isSystem"] = category->isSystem;
        obj["createdAt"] = category->createdAt;
        res.result(http::status::ok);
        res.body() = json::serialize(obj);
    }
    
    void handle_create_user_category(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid || userInfo.postgresId.empty()) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            emitCategoryEvent("create_category_failed", "", "", 401, {{"reason", "invalid_token"}});
            return;
        }
        
        try {
            json::value jv = json::parse(req_.body());
            json::object& obj = jv.as_object();
            
            std::string reqType = std::string(obj.at("type").as_string());
            if (reqType != "income" && reqType != "expense") {
                res.result(http::status::bad_request);
                res.body() = json::serialize(json::object{{"error", "Tipo inválido. Debe ser 'income' o 'expense'"}});
                emitCategoryEvent("create_category_failed", userInfo.postgresId, "", 400,
                    {{"reason", "invalid_type"}, {"type", reqType}});
                return;
            }
            
            Category newCategory;
            newCategory.userId = userInfo.postgresId;
            newCategory.name = std::string(obj.at("name").as_string());
            newCategory.type = reqType;
            newCategory.icon = std::string(obj.at("icon").as_string());
            newCategory.color = std::string(obj.at("color").as_string());
            newCategory.isDefault = obj.contains("isDefault") ? obj.at("isDefault").as_bool() : false;
            
            auto created = CategoryService::getInstance().createUserCategory(newCategory);
            
            if (!created) {
                res.result(http::status::internal_server_error);
                res.body() = json::serialize(json::object{{"error", "Error creating category"}});
                emitCategoryEvent("create_category_failed", userInfo.postgresId, "", 500, {{"reason", "db_error"}});
                return;
            }
            
            json::object response;
            response["id"] = created->id; response["userId"] = created->userId;
            response["name"] = created->name; response["type"] = created->type;
            response["icon"] = created->icon; response["color"] = created->color;
            response["isDefault"] = created->isDefault; response["isSystem"] = false;
            response["createdAt"] = created->createdAt;
            response["message"] = "Categoría creada exitosamente";
            
            res.result(http::status::created);
            res.body() = json::serialize(response);
            
            emitCategoryEvent("category_created", userInfo.postgresId, created->id, 201,
                {{"name", created->name}, {"type", created->type}, {"icon", created->icon}});
        } catch (const std::exception& e) {
            res.result(http::status::bad_request);
            res.body() = json::serialize(json::object{{"error", e.what()}});
            emitCategoryEvent("create_category_failed", userInfo.postgresId, "", 400,
                {{"reason", "bad_request"}, {"error", e.what()}});
        }
    }
    
    void handle_update_user_category(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid || userInfo.postgresId.empty()) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            return;
        }
        
        std::string categoryId = std::string(req_.target().begin(), req_.target().end()).substr(17);
        
        try {
            json::value jv = json::parse(req_.body());
            json::object& updates = jv.as_object();
            
            bool success = CategoryService::getInstance().updateUserCategory(categoryId, userInfo.postgresId, updates);
            
            if (!success) {
                res.result(http::status::not_found);
                res.body() = json::serialize(json::object{{"error", "Categoría no encontrada"}});
                emitCategoryEvent("update_category_failed", userInfo.postgresId, categoryId, 404, {{"reason", "not_found"}});
                return;
            }
            
            res.result(http::status::ok);
            res.body() = json::serialize(json::object{{"message", "Categoría actualizada exitosamente"}, {"id", categoryId}});
            
            json::object extra;
            if (updates.contains("name")) extra["name"] = updates.at("name");
            if (updates.contains("type")) extra["type"] = updates.at("type");
            emitCategoryEvent("category_updated", userInfo.postgresId, categoryId, 200, extra);
        } catch (const std::exception& e) {
            res.result(http::status::bad_request);
            res.body() = json::serialize(json::object{{"error", e.what()}});
        }
    }
    
    void handle_delete_user_category(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid || userInfo.postgresId.empty()) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            return;
        }
        
        std::string categoryId = std::string(req_.target().begin(), req_.target().end()).substr(17);
        
        bool success = CategoryService::getInstance().deleteUserCategory(categoryId, userInfo.postgresId);
        
        if (!success) {
            res.result(http::status::bad_request);
            res.body() = json::serialize(json::object{{"error", "No se puede eliminar la categoría"}});
            emitCategoryEvent("delete_category_failed", userInfo.postgresId, categoryId, 400,
                {{"reason", "has_transactions"}});
            return;
        }
        
        res.result(http::status::ok);
        res.body() = json::serialize(json::object{{"message", "Categoría eliminada exitosamente"}});
        
        emitCategoryEvent("category_deleted", userInfo.postgresId, categoryId, 200);
    }
    
    void handle_invalidate_cache(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid || userInfo.postgresId.empty()) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            return;
        }
        
        CategoryService::getInstance().invalidateUserCache(userInfo.postgresId);
        res.result(http::status::ok);
        res.body() = json::serialize(json::object{{"message", "Caché invalidado exitosamente"}});
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
        std::cout << "Categories Service listening on " << address << ":" << port << std::endl;
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
        
        std::cout << "Categories Service starting on 0.0.0.0:" << port << std::endl;
        std::cout << "Redis cache: " << (redis.isConnected() ? "enabled" : "disabled") << std::endl;
        
        HttpServer server("0.0.0.0", port);
        server.run();
        
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }
    
    return 0;
}
