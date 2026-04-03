#include <boost/beast/core.hpp>
#include <boost/beast/http.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <boost/json.hpp>
#include <iostream>
#include <iomanip>
#include <sstream>
#include <memory>
#include <ctime>
#include "saving_service.hpp"
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
void emitSavingEvent(const std::string& event_type, 
                     const std::string& user_id,
                     const std::string& saving_id,
                     int status_code,
                     const boost::json::object& extra_data = {}) {
    try {
        boost::json::object event;
        event["type"] = event_type;
        event["service"] = "savings";
        event["user_id"] = user_id;
        event["saving_id"] = saving_id;
        event["timestamp"] = std::time(nullptr);
        event["status_code"] = status_code;
        
        for (const auto& [key, value] : extra_data) {
            event[key] = value;
        }
        
        kafka::getProducer().produce("savings-events", event);
        
        if (status_code >= 200 && status_code < 300) {
            std::cout << "[Kafka] Event emitted: " << event_type << " (SUCCESS) for saving: " << saving_id << std::endl;
        } else {
            std::cout << "[Kafka] Event emitted: " << event_type << " (FAILED) for saving: " << saving_id << std::endl;
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
        res.set(http::field::server, "Savings Service");
        res.set(http::field::content_type, "application/json");
        
        try {
            std::string target(req_.target().begin(), req_.target().end());
            
            // Health check
            if (req_.method() == http::verb::get && target == "/health") {
                json::object response;
                response["status"] = "ok";
                response["service"] = "savings-service";
                res.body() = json::serialize(response);
            }
            // GET /savings - listar todos los ahorros del usuario
            else if (req_.method() == http::verb::get && target == "/savings") {
                keycloak::UserInfo user_info;
                if (!auth::authenticate(req_, *keycloak_client, user_info)) {
                    int status_code = static_cast<int>(http::status::unauthorized);
                    auth::sendUnauthorized(res, user_info.error);
                    emitSavingEvent("list_savings_failed", user_info.mongoId, "", status_code,
                                   {{"reason", "authentication_failed"}});
                } else {
                    auto savings = SavingService::getInstance().getSavingsByUser(user_info.mongoId);
                    json::array arr;
                    for (const auto& s : savings) {
                        json::object obj;
                        obj["id"] = s.id;
                        obj["title"] = s.title;
                        obj["description"] = s.description;
                        obj["amount"] = formatNumber(s.amount);
                        obj["goal_date"] = s.goal_date;
                        obj["created_at"] = s.created_at;
                        arr.push_back(obj);
                    }
                    res.body() = json::serialize(arr);
                    emitSavingEvent("list_savings_success", user_info.mongoId, "", 200,
                                   {{"count", (int)savings.size()}});
                }
            }
            // GET /savings/total - total de ahorros del usuario
            else if (req_.method() == http::verb::get && target == "/savings/total") {
                keycloak::UserInfo user_info;
                if (!auth::authenticate(req_, *keycloak_client, user_info)) {
                    int status_code = static_cast<int>(http::status::unauthorized);
                    auth::sendUnauthorized(res, user_info.error);
                    emitSavingEvent("get_total_failed", user_info.mongoId, "", status_code,
                                   {{"reason", "authentication_failed"}});
                } else {
                    double total = SavingService::getInstance().getTotalByUser(user_info.mongoId);
                    json::object response;
                    response["total"] = formatNumber(total);
                    res.body() = json::serialize(response);
                    emitSavingEvent("get_total_success", user_info.mongoId, "", 200,
                                   {{"total", total}});
                }
            }
            // POST /savings - crear ahorro
            else if (req_.method() == http::verb::post && target == "/savings") {
                keycloak::UserInfo user_info;
                if (!auth::authenticate(req_, *keycloak_client, user_info)) {
                    int status_code = static_cast<int>(http::status::unauthorized);
                    auth::sendUnauthorized(res, user_info.error);
                    emitSavingEvent("saving_creation_failed", user_info.mongoId, "", status_code,
                                   {{"reason", "authentication_failed"}});
                } else {
                    try {
                        json::value jv = json::parse(req_.body());
                        json::object& obj = jv.as_object();
                        
                        Saving saving;
                        saving.user_id = user_info.mongoId;
                        saving.title = std::string(obj.at("title").as_string());
                        saving.description = obj.contains("description") ? std::string(obj.at("description").as_string()) : "";
                        
                        if (obj.at("amount").is_double()) {
                            saving.amount = obj.at("amount").as_double();
                        } else if (obj.at("amount").is_int64()) {
                            saving.amount = static_cast<double>(obj.at("amount").as_int64());
                        } else {
                            int status_code = static_cast<int>(http::status::bad_request);
                            res.result(status_code);
                            json::object error;
                            error["error"] = "amount debe ser un número";
                            res.body() = json::serialize(error);
                            emitSavingEvent("saving_creation_failed", user_info.mongoId, "", status_code,
                                           {{"reason", "invalid_amount"}});
                            return;
                        }
                        
                        saving.goal_date = obj.contains("goal_date") ? std::string(obj.at("goal_date").as_string()) : "";
                        
                        auto t = std::time(nullptr);
                        saving.created_at = std::ctime(&t);
                        saving.created_at.pop_back();
                        
                        std::string saving_id;
                        bool success = SavingService::getInstance().createSaving(saving, saving_id);
                        
                        if (success) {
                            int status_code = static_cast<int>(http::status::ok);
                            json::object response;
                            response["message"] = "Ahorro creado exitosamente";
                            response["saving_id"] = saving_id;
                            res.body() = json::serialize(response);
                            
                            boost::json::object extra;
                            extra["title"] = saving.title;
                            extra["amount"] = saving.amount;
                            extra["goal_date"] = saving.goal_date;
                            emitSavingEvent("saving_created", user_info.mongoId, saving_id, status_code, extra);
                        } else {
                            int status_code = static_cast<int>(http::status::internal_server_error);
                            res.result(status_code);
                            json::object error;
                            error["error"] = "Error al crear el ahorro";
                            res.body() = json::serialize(error);
                            emitSavingEvent("saving_creation_failed", user_info.mongoId, "", status_code,
                                           {{"reason", "database_error"}});
                        }
                    } catch (const std::exception& e) {
                        int status_code = static_cast<int>(http::status::bad_request);
                        res.result(status_code);
                        json::object error;
                        error["error"] = e.what();
                        res.body() = json::serialize(error);
                        emitSavingEvent("saving_creation_failed", user_info.mongoId, "", status_code,
                                       {{"reason", "invalid_json"}, {"error", e.what()}});
                    }
                }
            }
            // GET /savings/{id}
            else if (req_.method() == http::verb::get && target.find("/savings/") == 0 && target != "/savings" && target != "/savings/total") {
                std::string id = target.substr(9);
                keycloak::UserInfo user_info;
                if (!auth::authenticate(req_, *keycloak_client, user_info)) {
                    int status_code = static_cast<int>(http::status::unauthorized);
                    auth::sendUnauthorized(res, user_info.error);
                    emitSavingEvent("get_saving_failed", user_info.mongoId, id, status_code,
                                   {{"reason", "authentication_failed"}});
                } else {
                    auto saving = SavingService::getInstance().getSaving(id);
                    if (saving && saving->user_id == user_info.mongoId) {
                        json::object obj;
                        obj["id"] = saving->id;
                        obj["title"] = saving->title;
                        obj["description"] = saving->description;
                        obj["amount"] = formatNumber(saving->amount);
                        obj["goal_date"] = saving->goal_date;
                        obj["created_at"] = saving->created_at;
                        res.body() = json::serialize(obj);
                        emitSavingEvent("get_saving_success", user_info.mongoId, id, 200);
                    } else {
                        int status_code = static_cast<int>(http::status::not_found);
                        res.result(status_code);
                        json::object error;
                        error["error"] = "Ahorro no encontrado";
                        res.body() = json::serialize(error);
                        emitSavingEvent("get_saving_failed", user_info.mongoId, id, status_code,
                                       {{"reason", "saving_not_found"}});
                    }
                }
            }
            // PUT /savings/{id}
            else if (req_.method() == http::verb::put && target.find("/savings/") == 0) {
                std::string id = target.substr(9);
                keycloak::UserInfo user_info;
                if (!auth::authenticate(req_, *keycloak_client, user_info)) {
                    int status_code = static_cast<int>(http::status::unauthorized);
                    auth::sendUnauthorized(res, user_info.error);
                    emitSavingEvent("saving_update_failed", user_info.mongoId, id, status_code,
                                   {{"reason", "authentication_failed"}});
                } else {
                    auto saving = SavingService::getInstance().getSaving(id);
                    if (!saving || saving->user_id != user_info.mongoId) {
                        int status_code = static_cast<int>(http::status::forbidden);
                        auth::sendForbidden(res, "No tienes permiso para modificar este ahorro");
                        emitSavingEvent("saving_update_failed", user_info.mongoId, id, status_code,
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
                                emitSavingEvent("saving_update_failed", user_info.mongoId, id, status_code,
                                               {{"reason", "invalid_amount"}});
                                return;
                            }
                            
                            std::string goal_date = obj.contains("goal_date") ? std::string(obj.at("goal_date").as_string()) : saving->goal_date;
                            
                            bool success = SavingService::getInstance().updateSaving(id, title, description, amount, goal_date);
                            
                            if (success) {
                                int status_code = static_cast<int>(http::status::ok);
                                json::object response;
                                response["message"] = "Ahorro actualizado exitosamente";
                                res.body() = json::serialize(response);
                                
                                boost::json::object extra;
                                extra["old_title"] = saving->title;
                                extra["old_amount"] = saving->amount;
                                extra["new_title"] = title;
                                extra["new_amount"] = amount;
                                extra["goal_date"] = goal_date;
                                emitSavingEvent("saving_updated", user_info.mongoId, id, status_code, extra);
                            } else {
                                int status_code = static_cast<int>(http::status::not_found);
                                res.result(status_code);
                                json::object error;
                                error["error"] = "Ahorro no encontrado";
                                res.body() = json::serialize(error);
                                emitSavingEvent("saving_update_failed", user_info.mongoId, id, status_code,
                                               {{"reason", "saving_not_found"}});
                            }
                        } catch (const std::exception& e) {
                            int status_code = static_cast<int>(http::status::bad_request);
                            res.result(status_code);
                            json::object error;
                            error["error"] = e.what();
                            res.body() = json::serialize(error);
                            emitSavingEvent("saving_update_failed", user_info.mongoId, id, status_code,
                                           {{"reason", "invalid_json"}, {"error", e.what()}});
                        }
                    }
                }
            }
            // PATCH /savings/{id}/add-amount
            else if (req_.method() == http::verb::patch && target.find("/savings/") == 0 && target.find("/add-amount") != std::string::npos) {
                std::string id = target.substr(9, target.find("/add-amount") - 9);
                keycloak::UserInfo user_info;
                if (!auth::authenticate(req_, *keycloak_client, user_info)) {
                    int status_code = static_cast<int>(http::status::unauthorized);
                    auth::sendUnauthorized(res, user_info.error);
                    emitSavingEvent("add_amount_failed", user_info.mongoId, id, status_code,
                                   {{"reason", "authentication_failed"}});
                } else {
                    auto saving = SavingService::getInstance().getSaving(id);
                    if (!saving || saving->user_id != user_info.mongoId) {
                        int status_code = static_cast<int>(http::status::forbidden);
                        auth::sendForbidden(res, "No tienes permiso para modificar este ahorro");
                        emitSavingEvent("add_amount_failed", user_info.mongoId, id, status_code,
                                       {{"reason", "permission_denied"}});
                    } else {
                        try {
                            json::value jv = json::parse(req_.body());
                            json::object& obj = jv.as_object();
                            
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
                                emitSavingEvent("add_amount_failed", user_info.mongoId, id, status_code,
                                               {{"reason", "invalid_amount"}});
                                return;
                            }
                            
                            bool success = SavingService::getInstance().addAmount(id, amount);
                            
                            if (success) {
                                auto updated = SavingService::getInstance().getSaving(id);
                                int status_code = static_cast<int>(http::status::ok);
                                
                                boost::json::object extra;
                                extra["amount_added"] = amount;
                                extra["new_amount"] = updated->amount;
                                
                                if (updated->amount >= 1000000) {
                                    extra["goal_achieved"] = true;
                                    emitSavingEvent("saving_goal_achieved", user_info.mongoId, id, status_code, extra);
                                } else {
                                    emitSavingEvent("amount_added_to_saving", user_info.mongoId, id, status_code, extra);
                                }
                                
                                json::object response;
                                response["message"] = "Monto agregado exitosamente";
                                response["current_amount"] = formatNumber(updated->amount);
                                res.body() = json::serialize(response);
                            } else {
                                int status_code = static_cast<int>(http::status::not_found);
                                res.result(status_code);
                                json::object error;
                                error["error"] = "Ahorro no encontrado";
                                res.body() = json::serialize(error);
                                emitSavingEvent("add_amount_failed", user_info.mongoId, id, status_code,
                                               {{"reason", "saving_not_found"}});
                            }
                        } catch (const std::exception& e) {
                            int status_code = static_cast<int>(http::status::bad_request);
                            res.result(status_code);
                            json::object error;
                            error["error"] = e.what();
                            res.body() = json::serialize(error);
                            emitSavingEvent("add_amount_failed", user_info.mongoId, id, status_code,
                                           {{"reason", "invalid_json"}, {"error", e.what()}});
                        }
                    }
                }
            }
            // DELETE /savings/{id}
            else if (req_.method() == http::verb::delete_ && target.find("/savings/") == 0) {
                std::string id = target.substr(9);
                keycloak::UserInfo user_info;
                if (!auth::authenticate(req_, *keycloak_client, user_info)) {
                    int status_code = static_cast<int>(http::status::unauthorized);
                    auth::sendUnauthorized(res, user_info.error);
                    emitSavingEvent("saving_deletion_failed", user_info.mongoId, id, status_code,
                                   {{"reason", "authentication_failed"}});
                } else {
                    auto saving = SavingService::getInstance().getSaving(id);
                    if (!saving || saving->user_id != user_info.mongoId) {
                        int status_code = static_cast<int>(http::status::forbidden);
                        auth::sendForbidden(res, "No tienes permiso para eliminar este ahorro");
                        emitSavingEvent("saving_deletion_failed", user_info.mongoId, id, status_code,
                                       {{"reason", "permission_denied"}});
                    } else {
                        boost::json::object extra;
                        extra["title"] = saving->title;
                        extra["amount"] = saving->amount;
                        extra["goal_date"] = saving->goal_date;
                        
                        bool success = SavingService::getInstance().deleteSaving(id);
                        
                        if (success) {
                            int status_code = static_cast<int>(http::status::ok);
                            json::object response;
                            response["message"] = "Ahorro eliminado exitosamente";
                            res.body() = json::serialize(response);
                            emitSavingEvent("saving_deleted", user_info.mongoId, id, status_code, extra);
                        } else {
                            int status_code = static_cast<int>(http::status::not_found);
                            res.result(status_code);
                            json::object error;
                            error["error"] = "Ahorro no encontrado";
                            res.body() = json::serialize(error);
                            emitSavingEvent("saving_deletion_failed", user_info.mongoId, id, status_code,
                                           {{"reason", "saving_not_found"}});
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
        std::cout << "Savings Service listening on " << address << ":" << port << std::endl;
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
        unsigned short port = port_env ? std::stoi(port_env) : 8084;
        
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