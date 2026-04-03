#include <boost/beast/core.hpp>
#include <boost/beast/http.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <boost/json.hpp>
#include <iostream>
#include <iomanip>
#include <sstream>
#include <memory>
#include <ctime>
#include "purchase_service.hpp"
#include "database.hpp"
#include "auth_middleware.hpp"
#include "keycloak_auth.hpp"
#include "kafka_producer.hpp"

namespace beast = boost::beast;
namespace http = beast::http;
namespace net = boost::asio;
namespace json = boost::json;
using tcp = net::ip::tcp;

std::unique_ptr<keycloak::KeycloakClient> keycloak_client;

std::string formatNumber(double value) {
    std::stringstream ss;
    ss << std::fixed << std::setprecision(2);
    ss << value;
    return ss.str();
}

// ============================================
// FUNCIÓN PARA EMITIR EVENTOS A KAFKA
// ============================================
void emitPurchaseEvent(const std::string& event_type, 
                       const std::string& user_id,
                       const std::string& purchase_id,
                       int status_code,
                       const boost::json::object& extra_data = {}) {
    try {
        boost::json::object event;
        event["type"] = event_type;
        event["service"] = "purchases";
        event["user_id"] = user_id;
        event["purchase_id"] = purchase_id;
        event["timestamp"] = std::time(nullptr);
        event["status_code"] = status_code;
        
        for (const auto& [key, value] : extra_data) {
            event[key] = value;
        }
        
        kafka::getProducer().produce("purchase-events", event);
        
        if (status_code >= 200 && status_code < 300) {
            std::cout << "[Kafka] Event emitted: " << event_type << " (SUCCESS) for purchase: " << purchase_id << std::endl;
        } else {
            std::cout << "[Kafka] Event emitted: " << event_type << " (FAILED) for purchase: " << purchase_id << std::endl;
        }
        
    } catch (const std::exception& e) {
        std::cerr << "[Kafka] Error emitting event: " << e.what() << std::endl;
    }
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
            [self](beast::error_code ec, std::size_t) {
                if (!ec) self->handle_request();
            });
    }
    
    void handle_request() {
        http::response<http::string_body> res{http::status::ok, req_.version()};
        res.set(http::field::server, "Purchases Service");
        res.set(http::field::content_type, "application/json");
        
        try {
            std::string target(req_.target().begin(), req_.target().end());
            
            // Health check
            if (req_.method() == http::verb::get && target == "/health") {
                json::object response;
                response["status"] = "ok";
                response["service"] = "purchases-service";
                res.body() = json::serialize(response);
            }
            // GET /purchases - listar todas las compras del usuario
            else if (req_.method() == http::verb::get && target == "/purchases") {
                keycloak::UserInfo user_info;
                if (!auth::authenticate(req_, *keycloak_client, user_info)) {
                    int status_code = static_cast<int>(http::status::unauthorized);
                    auth::sendUnauthorized(res, user_info.error);
                    emitPurchaseEvent("list_purchases_failed", user_info.mongoId, "", status_code,
                                     {{"reason", "authentication_failed"}});
                } else {
                    auto purchases = PurchaseService::getInstance().getPurchasesByUser(user_info.mongoId);
                    json::array arr;
                    for (const auto& p : purchases) {
                        json::object obj;
                        obj["id"] = p.id;
                        obj["title"] = p.title;
                        obj["description"] = p.description;
                        obj["amount"] = formatNumber(p.amount);
                        obj["frequency"] = p.frequency;
                        obj["category"] = p.category;
                        obj["date"] = p.date;
                        obj["created_at"] = p.created_at;
                        arr.push_back(obj);
                    }
                    res.body() = json::serialize(arr);
                    emitPurchaseEvent("list_purchases_success", user_info.mongoId, "", 200,
                                     {{"count", (int)purchases.size()}});
                }
            }
            // GET /purchases/total - total de compras del usuario
            else if (req_.method() == http::verb::get && target == "/purchases/total") {
                keycloak::UserInfo user_info;
                if (!auth::authenticate(req_, *keycloak_client, user_info)) {
                    int status_code = static_cast<int>(http::status::unauthorized);
                    auth::sendUnauthorized(res, user_info.error);
                    emitPurchaseEvent("get_total_failed", user_info.mongoId, "", status_code,
                                     {{"reason", "authentication_failed"}});
                } else {
                    double total = PurchaseService::getInstance().getTotalByUser(user_info.mongoId);
                    json::object response;
                    response["total"] = formatNumber(total);
                    res.body() = json::serialize(response);
                    emitPurchaseEvent("get_total_success", user_info.mongoId, "", 200,
                                     {{"total", total}});
                }
            }
            // GET /purchases/category/{category}
            else if (req_.method() == http::verb::get && target.find("/purchases/category/") == 0) {
                std::string category = target.substr(20);
                keycloak::UserInfo user_info;
                if (!auth::authenticate(req_, *keycloak_client, user_info)) {
                    int status_code = static_cast<int>(http::status::unauthorized);
                    auth::sendUnauthorized(res, user_info.error);
                    emitPurchaseEvent("get_by_category_failed", user_info.mongoId, "", status_code,
                                     {{"reason", "authentication_failed"}, {"category", category}});
                } else {
                    auto purchases = PurchaseService::getInstance().getPurchasesByUserAndCategory(user_info.mongoId, category);
                    double total = PurchaseService::getInstance().getTotalByUserAndCategory(user_info.mongoId, category);
                    
                    json::array arr;
                    for (const auto& p : purchases) {
                        json::object obj;
                        obj["id"] = p.id;
                        obj["title"] = p.title;
                        obj["description"] = p.description;
                        obj["amount"] = formatNumber(p.amount);
                        obj["date"] = p.date;
                        arr.push_back(obj);
                    }
                    
                    json::object response;
                    response["category"] = category;
                    response["total"] = formatNumber(total);
                    response["items"] = arr;
                    res.body() = json::serialize(response);
                    emitPurchaseEvent("get_by_category_success", user_info.mongoId, "", 200,
                                     {{"category", category}, {"total", total}, {"count", (int)purchases.size()}});
                }
            }
            // POST /purchases - crear compra
            else if (req_.method() == http::verb::post && target == "/purchases") {
                keycloak::UserInfo user_info;
                if (!auth::authenticate(req_, *keycloak_client, user_info)) {
                    int status_code = static_cast<int>(http::status::unauthorized);
                    auth::sendUnauthorized(res, user_info.error);
                    emitPurchaseEvent("purchase_creation_failed", user_info.mongoId, "", status_code,
                                     {{"reason", "authentication_failed"}});
                } else {
                    try {
                        json::value jv = json::parse(req_.body());
                        json::object& obj = jv.as_object();
                        
                        Purchase purchase;
                        purchase.user_id = user_info.mongoId;
                        purchase.title = std::string(obj.at("title").as_string());
                        purchase.description = obj.contains("description") ? std::string(obj.at("description").as_string()) : "";
                        
                        if (obj.at("amount").is_double()) {
                            purchase.amount = obj.at("amount").as_double();
                        } else if (obj.at("amount").is_int64()) {
                            purchase.amount = static_cast<double>(obj.at("amount").as_int64());
                        } else {
                            int status_code = static_cast<int>(http::status::bad_request);
                            res.result(status_code);
                            json::object error;
                            error["error"] = "amount debe ser un número";
                            res.body() = json::serialize(error);
                            emitPurchaseEvent("purchase_creation_failed", user_info.mongoId, "", status_code,
                                             {{"reason", "invalid_amount"}});
                            return;
                        }
                        
                        purchase.frequency = obj.contains("frequency") ? std::string(obj.at("frequency").as_string()) : "one-time";
                        purchase.category = obj.contains("category") ? std::string(obj.at("category").as_string()) : "other";
                        purchase.date = obj.contains("date") ? std::string(obj.at("date").as_string()) : "";
                        
                        auto t = std::time(nullptr);
                        purchase.created_at = std::ctime(&t);
                        purchase.created_at.pop_back();
                        
                        std::string purchase_id;
                        bool success = PurchaseService::getInstance().createPurchase(purchase, purchase_id);
                        
                        if (success) {
                            int status_code = static_cast<int>(http::status::ok);
                            json::object response;
                            response["message"] = "Compra registrada exitosamente";
                            response["purchase_id"] = purchase_id;
                            res.body() = json::serialize(response);
                            
                            boost::json::object extra;
                            extra["title"] = purchase.title;
                            extra["amount"] = purchase.amount;
                            extra["category"] = purchase.category;
                            extra["frequency"] = purchase.frequency;
                            emitPurchaseEvent("purchase_created", user_info.mongoId, purchase_id, status_code, extra);
                        } else {
                            int status_code = static_cast<int>(http::status::internal_server_error);
                            res.result(status_code);
                            json::object error;
                            error["error"] = "Error al registrar la compra";
                            res.body() = json::serialize(error);
                            emitPurchaseEvent("purchase_creation_failed", user_info.mongoId, "", status_code,
                                             {{"reason", "database_error"}});
                        }
                    } catch (const std::exception& e) {
                        int status_code = static_cast<int>(http::status::bad_request);
                        res.result(status_code);
                        json::object error;
                        error["error"] = e.what();
                        res.body() = json::serialize(error);
                        emitPurchaseEvent("purchase_creation_failed", user_info.mongoId, "", status_code,
                                         {{"reason", "invalid_json"}, {"error", e.what()}});
                    }
                }
            }
            // GET /purchases/{id}
            else if (req_.method() == http::verb::get && target.find("/purchases/") == 0 && target != "/purchases" && target.find("/category/") == std::string::npos && target != "/purchases/total") {
                std::string id = target.substr(11);
                keycloak::UserInfo user_info;
                if (!auth::authenticate(req_, *keycloak_client, user_info)) {
                    int status_code = static_cast<int>(http::status::unauthorized);
                    auth::sendUnauthorized(res, user_info.error);
                    emitPurchaseEvent("get_purchase_failed", user_info.mongoId, id, status_code,
                                     {{"reason", "authentication_failed"}});
                } else {
                    auto purchase = PurchaseService::getInstance().getPurchase(id);
                    if (purchase && purchase->user_id == user_info.mongoId) {
                        json::object obj;
                        obj["id"] = purchase->id;
                        obj["title"] = purchase->title;
                        obj["description"] = purchase->description;
                        obj["amount"] = formatNumber(purchase->amount);
                        obj["frequency"] = purchase->frequency;
                        obj["category"] = purchase->category;
                        obj["date"] = purchase->date;
                        obj["created_at"] = purchase->created_at;
                        res.body() = json::serialize(obj);
                        emitPurchaseEvent("get_purchase_success", user_info.mongoId, id, 200);
                    } else {
                        int status_code = static_cast<int>(http::status::not_found);
                        res.result(status_code);
                        json::object error;
                        error["error"] = "Compra no encontrada";
                        res.body() = json::serialize(error);
                        emitPurchaseEvent("get_purchase_failed", user_info.mongoId, id, status_code,
                                         {{"reason", "purchase_not_found"}});
                    }
                }
            }
            // PUT /purchases/{id}
            else if (req_.method() == http::verb::put && target.find("/purchases/") == 0) {
                std::string id = target.substr(11);
                keycloak::UserInfo user_info;
                if (!auth::authenticate(req_, *keycloak_client, user_info)) {
                    int status_code = static_cast<int>(http::status::unauthorized);
                    auth::sendUnauthorized(res, user_info.error);
                    emitPurchaseEvent("purchase_update_failed", user_info.mongoId, id, status_code,
                                     {{"reason", "authentication_failed"}});
                } else {
                    auto purchase = PurchaseService::getInstance().getPurchase(id);
                    if (!purchase || purchase->user_id != user_info.mongoId) {
                        int status_code = static_cast<int>(http::status::forbidden);
                        auth::sendForbidden(res, "No tienes permiso para modificar esta compra");
                        emitPurchaseEvent("purchase_update_failed", user_info.mongoId, id, status_code,
                                         {{"reason", "permission_denied"}});
                    } else {
                        try {
                            json::value jv = json::parse(req_.body());
                            json::object& obj = jv.as_object();
                            
                            std::string title = std::string(obj.at("title").as_string());
                            std::string description = obj.contains("description") ? std::string(obj.at("description").as_string()) : "";
                            
                            double amount = 0.0;
                            if (obj.at("amount").is_double()) {
                                amount = obj.at("amount").as_double();
                            } else if (obj.at("amount").is_int64()) {
                                amount = static_cast<double>(obj.at("amount").as_int64());
                            } else {
                                int status_code = static_cast<int>(http::status::bad_request);
                                res.result(status_code);
                                json::object error;
                                error["error"] = "amount debe ser un número";
                                res.body() = json::serialize(error);
                                emitPurchaseEvent("purchase_update_failed", user_info.mongoId, id, status_code,
                                                 {{"reason", "invalid_amount"}});
                                return;
                            }
                            
                            std::string frequency = obj.contains("frequency") ? std::string(obj.at("frequency").as_string()) : purchase->frequency;
                            std::string category = obj.contains("category") ? std::string(obj.at("category").as_string()) : purchase->category;
                            
                            bool success = PurchaseService::getInstance().updatePurchase(id, title, description, amount, frequency, category);
                            
                            if (success) {
                                int status_code = static_cast<int>(http::status::ok);
                                json::object response;
                                response["message"] = "Compra actualizada exitosamente";
                                res.body() = json::serialize(response);
                                
                                boost::json::object extra;
                                extra["old_title"] = purchase->title;
                                extra["old_amount"] = purchase->amount;
                                extra["new_title"] = title;
                                extra["new_amount"] = amount;
                                extra["category"] = category;
                                emitPurchaseEvent("purchase_updated", user_info.mongoId, id, status_code, extra);
                            } else {
                                int status_code = static_cast<int>(http::status::not_found);
                                res.result(status_code);
                                json::object error;
                                error["error"] = "Compra no encontrada";
                                res.body() = json::serialize(error);
                                emitPurchaseEvent("purchase_update_failed", user_info.mongoId, id, status_code,
                                                 {{"reason", "purchase_not_found"}});
                            }
                        } catch (const std::exception& e) {
                            int status_code = static_cast<int>(http::status::bad_request);
                            res.result(status_code);
                            json::object error;
                            error["error"] = e.what();
                            res.body() = json::serialize(error);
                            emitPurchaseEvent("purchase_update_failed", user_info.mongoId, id, status_code,
                                             {{"reason", "invalid_json"}, {"error", e.what()}});
                        }
                    }
                }
            }
            // DELETE /purchases/{id}
            else if (req_.method() == http::verb::delete_ && target.find("/purchases/") == 0) {
                std::string id = target.substr(11);
                keycloak::UserInfo user_info;
                if (!auth::authenticate(req_, *keycloak_client, user_info)) {
                    int status_code = static_cast<int>(http::status::unauthorized);
                    auth::sendUnauthorized(res, user_info.error);
                    emitPurchaseEvent("purchase_deletion_failed", user_info.mongoId, id, status_code,
                                     {{"reason", "authentication_failed"}});
                } else {
                    auto purchase = PurchaseService::getInstance().getPurchase(id);
                    if (!purchase || purchase->user_id != user_info.mongoId) {
                        int status_code = static_cast<int>(http::status::forbidden);
                        auth::sendForbidden(res, "No tienes permiso para eliminar esta compra");
                        emitPurchaseEvent("purchase_deletion_failed", user_info.mongoId, id, status_code,
                                         {{"reason", "permission_denied"}});
                    } else {
                        boost::json::object extra;
                        extra["title"] = purchase->title;
                        extra["amount"] = purchase->amount;
                        extra["category"] = purchase->category;
                        
                        bool success = PurchaseService::getInstance().deletePurchase(id);
                        
                        if (success) {
                            int status_code = static_cast<int>(http::status::ok);
                            json::object response;
                            response["message"] = "Compra eliminada exitosamente";
                            res.body() = json::serialize(response);
                            emitPurchaseEvent("purchase_deleted", user_info.mongoId, id, status_code, extra);
                        } else {
                            int status_code = static_cast<int>(http::status::not_found);
                            res.result(status_code);
                            json::object error;
                            error["error"] = "Compra no encontrada";
                            res.body() = json::serialize(error);
                            emitPurchaseEvent("purchase_deletion_failed", user_info.mongoId, id, status_code,
                                             {{"reason", "purchase_not_found"}});
                        }
                    }
                }
            }
            else {
                res.result(http::status::not_found);
                json::object error;
                error["error"] = "Not Found";
                res.body() = json::serialize(error);
            }
        } catch (const std::exception& e) {
            res.result(http::status::bad_request);
            json::object error;
            error["error"] = e.what();
            res.body() = json::serialize(error);
        }
        
        res.prepare_payload();
        write_response(res);
    }
    
    void write_response(http::response<http::string_body>& res) {
        auto self = shared_from_this();
        http::async_write(socket_, res,
            [self](beast::error_code ec, std::size_t) {
                self->socket_.shutdown(tcp::socket::shutdown_send, ec);
            });
    }
};

class HttpServer {
    net::io_context ioc_;
    tcp::acceptor acceptor_;
    
public:
    HttpServer(const std::string& address, unsigned short port) 
        : ioc_(1), acceptor_(ioc_, tcp::endpoint(net::ip::make_address(address), port)) {
        std::cout << "Purchases Service listening on " << address << ":" << port << std::endl;
    }
    
    void run() {
        do_accept();
        ioc_.run();
    }
    
private:
    void do_accept() {
        acceptor_.async_accept(
            [this](beast::error_code ec, tcp::socket socket) {
                if (!ec) {
                    std::make_shared<HttpSession>(std::move(socket))->run();
                }
                do_accept();
            });
    }
};

int main() {
    try {
        const char* port_env = std::getenv("SERVER_PORT");
        unsigned short port = port_env ? std::stoi(port_env) : 8083;
        
        const char* keycloak_url = std::getenv("KEYCLOAK_URL");
        const char* keycloak_realm = std::getenv("KEYCLOAK_REALM");
        const char* mongo_uri = std::getenv("MONGODB_URI");
        const char* mongo_db = std::getenv("MONGODB_DB");
        
        if (!keycloak_url) keycloak_url = "http://keycloak:8080";
        if (!keycloak_realm) keycloak_realm = "cuenta-confiable";
        if (!mongo_uri) mongo_uri = "mongodb://admin:secret123@mongodb:27017";
        if (!mongo_db) mongo_db = "cuenta-confiable";
        
        keycloak_client = std::make_unique<keycloak::KeycloakClient>(keycloak_url, keycloak_realm);
        
        Database::getInstance().connect(mongo_uri, mongo_db);
        
        std::cout << "[Kafka] Initializing Kafka producer..." << std::endl;
        kafka::getProducer();
        
        HttpServer server("0.0.0.0", port);
        server.run();
        
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }
    
    return 0;
}