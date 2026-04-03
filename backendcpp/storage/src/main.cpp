#include <boost/beast/core.hpp>
#include <boost/beast/http.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <boost/json.hpp>
#include <iostream>
#include <iomanip>
#include <sstream>
#include <memory>
#include <ctime>
#include "storage_service.hpp"
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
void emitStorageEvent(const std::string& event_type, 
                      const std::string& user_id,
                      const std::string& wallet_id,
                      int status_code,
                      const boost::json::object& extra_data = {}) {
    try {
        boost::json::object event;
        event["type"] = event_type;
        event["service"] = "storage";
        event["user_id"] = user_id;
        event["wallet_id"] = wallet_id;
        event["timestamp"] = std::time(nullptr);
        event["status_code"] = status_code;
        
        for (const auto& [key, value] : extra_data) {
            event[key] = value;
        }
        
        kafka::getProducer().produce("storage-events", event);
        
        if (status_code >= 200 && status_code < 300) {
            std::cout << "[Kafka] Event emitted: " << event_type << " (SUCCESS) for wallet: " << wallet_id << std::endl;
        } else {
            std::cout << "[Kafka] Event emitted: " << event_type << " (FAILED) for wallet: " << wallet_id << std::endl;
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
        res.set(http::field::server, "Storage Service - Wallets & Transactions");
        res.set(http::field::content_type, "application/json");
        
        try {
            std::string target(req_.target().begin(), req_.target().end());
            
            // Health check
            if (req_.method() == http::verb::get && target == "/health") {
                json::object response;
                response["status"] = "ok";
                response["service"] = "storage-service";
                res.body() = json::serialize(response);
            }
            // GET /wallets - listar todas las cuentas/billeteras
            else if (req_.method() == http::verb::get && target == "/wallets") {
                keycloak::UserInfo user_info;
                if (!auth::authenticate(req_, *keycloak_client, user_info)) {
                    int status_code = static_cast<int>(http::status::unauthorized);
                    auth::sendUnauthorized(res, user_info.error);
                    emitStorageEvent("list_wallets_failed", user_info.mongoId, "", status_code,
                                    {{"reason", "authentication_failed"}});
                } else {
                    auto wallets = StorageService::getInstance().getWalletsByUser(user_info.mongoId);
                    json::array arr;
                    for (const auto& w : wallets) {
                        json::object obj;
                        obj["id"] = w.id;
                        obj["name"] = w.name;
                        obj["type"] = w.type;
                        obj["bank_name"] = w.bank_name;
                        obj["balance"] = formatNumber(w.balance);
                        obj["currency"] = w.currency;
                        obj["created_at"] = w.created_at;
                        arr.push_back(obj);
                    }
                    res.body() = json::serialize(arr);
                    emitStorageEvent("list_wallets_success", user_info.mongoId, "", 200,
                                    {{"count", (int)wallets.size()}});
                }
            }
            // GET /wallets/total
            else if (req_.method() == http::verb::get && target == "/wallets/total") {
                keycloak::UserInfo user_info;
                if (!auth::authenticate(req_, *keycloak_client, user_info)) {
                    int status_code = static_cast<int>(http::status::unauthorized);
                    auth::sendUnauthorized(res, user_info.error);
                    emitStorageEvent("get_total_failed", user_info.mongoId, "", status_code,
                                    {{"reason", "authentication_failed"}});
                } else {
                    double total = StorageService::getInstance().getTotalBalanceByUser(user_info.mongoId);
                    json::object response;
                    response["total_balance"] = formatNumber(total);
                    res.body() = json::serialize(response);
                    emitStorageEvent("get_total_success", user_info.mongoId, "", 200,
                                    {{"total_balance", total}});
                }
            }
            // GET /wallets/type/{type}
            else if (req_.method() == http::verb::get && target.find("/wallets/type/") == 0) {
                std::string type = target.substr(14);
                keycloak::UserInfo user_info;
                if (!auth::authenticate(req_, *keycloak_client, user_info)) {
                    int status_code = static_cast<int>(http::status::unauthorized);
                    auth::sendUnauthorized(res, user_info.error);
                    emitStorageEvent("get_by_type_failed", user_info.mongoId, "", status_code,
                                    {{"reason", "authentication_failed"}, {"wallet_type", type}});
                } else {
                    auto wallets = StorageService::getInstance().getWalletsByType(user_info.mongoId, type);
                    json::array arr;
                    for (const auto& w : wallets) {
                        json::object obj;
                        obj["id"] = w.id;
                        obj["name"] = w.name;
                        obj["balance"] = formatNumber(w.balance);
                        arr.push_back(obj);
                    }
                    res.body() = json::serialize(arr);
                    emitStorageEvent("get_by_type_success", user_info.mongoId, "", 200,
                                    {{"wallet_type", type}, {"count", (int)wallets.size()}}); 
                }
            }
            // POST /wallets - crear cuenta
            else if (req_.method() == http::verb::post && target == "/wallets") {
                keycloak::UserInfo user_info;
                if (!auth::authenticate(req_, *keycloak_client, user_info)) {
                    int status_code = static_cast<int>(http::status::unauthorized);
                    auth::sendUnauthorized(res, user_info.error);
                    emitStorageEvent("wallet_creation_failed", user_info.mongoId, "", status_code,
                                    {{"reason", "authentication_failed"}});
                } else {
                    try {
                        json::value jv = json::parse(req_.body());
                        json::object& obj = jv.as_object();
                        
                        Wallet wallet;
                        wallet.user_id = user_info.mongoId;
                        wallet.name = std::string(obj.at("name").as_string());
                        wallet.type = std::string(obj.at("type").as_string());
                        wallet.bank_name = obj.contains("bank_name") ? std::string(obj.at("bank_name").as_string()) : "";
                        
                        if (obj.at("balance").is_double()) {
                            wallet.balance = obj.at("balance").as_double();
                        } else if (obj.at("balance").is_int64()) {
                            wallet.balance = static_cast<double>(obj.at("balance").as_int64());
                        } else {
                            wallet.balance = 0.0;
                        }
                        
                        wallet.initial_balance = wallet.balance;
                        wallet.currency = obj.contains("currency") ? std::string(obj.at("currency").as_string()) : "COP";
                        wallet.account_number = obj.contains("account_number") ? std::string(obj.at("account_number").as_string()) : "";
                        
                        auto t = std::time(nullptr);
                        wallet.created_at = std::ctime(&t);
                        wallet.created_at.pop_back();
                        wallet.last_updated = wallet.created_at;
                        
                        std::string wallet_id;
                        bool success = StorageService::getInstance().createWallet(wallet, wallet_id);
                        
                        if (success) {
                            int status_code = static_cast<int>(http::status::ok);
                            json::object response;
                            response["message"] = "Cuenta creada exitosamente";
                            response["wallet_id"] = wallet_id;
                            res.body() = json::serialize(response);
                            
                            boost::json::object extra;
                            extra["name"] = wallet.name;
                            extra["type"] = wallet.type;
                            extra["bank_name"] = wallet.bank_name;
                            extra["balance"] = wallet.balance;
                            extra["currency"] = wallet.currency;
                            emitStorageEvent("wallet_created", user_info.mongoId, wallet_id, status_code, extra);
                        } else {
                            int status_code = static_cast<int>(http::status::internal_server_error);
                            res.result(status_code);
                            json::object error;
                            error["error"] = "Error al crear la cuenta";
                            res.body() = json::serialize(error);
                            emitStorageEvent("wallet_creation_failed", user_info.mongoId, "", status_code,
                                            {{"reason", "database_error"}});
                        }
                    } catch (const std::exception& e) {
                        int status_code = static_cast<int>(http::status::bad_request);
                        res.result(status_code);
                        json::object error;
                        error["error"] = e.what();
                        res.body() = json::serialize(error);
                        emitStorageEvent("wallet_creation_failed", user_info.mongoId, "", status_code,
                                        {{"reason", "invalid_json"}, {"error", e.what()}});
                    }
                }
            }
            // GET /wallets/{id}
            else if (req_.method() == http::verb::get && target.find("/wallets/") == 0 && target != "/wallets" && target.find("/type/") == std::string::npos && target != "/wallets/total") {
                std::string id = target.substr(9);
                keycloak::UserInfo user_info;
                if (!auth::authenticate(req_, *keycloak_client, user_info)) {
                    int status_code = static_cast<int>(http::status::unauthorized);
                    auth::sendUnauthorized(res, user_info.error);
                    emitStorageEvent("get_wallet_failed", user_info.mongoId, id, status_code,
                                    {{"reason", "authentication_failed"}});
                } else {
                    auto wallet = StorageService::getInstance().getWallet(id);
                    if (wallet && wallet->user_id == user_info.mongoId) {
                        json::object obj;
                        obj["id"] = wallet->id;
                        obj["name"] = wallet->name;
                        obj["type"] = wallet->type;
                        obj["bank_name"] = wallet->bank_name;
                        obj["balance"] = formatNumber(wallet->balance);
                        obj["currency"] = wallet->currency;
                        obj["created_at"] = wallet->created_at;
                        obj["last_updated"] = wallet->last_updated;
                        res.body() = json::serialize(obj);
                        emitStorageEvent("get_wallet_success", user_info.mongoId, id, 200);
                    } else {
                        int status_code = static_cast<int>(http::status::not_found);
                        res.result(status_code);
                        json::object error;
                        error["error"] = "Cuenta no encontrada";
                        res.body() = json::serialize(error);
                        emitStorageEvent("get_wallet_failed", user_info.mongoId, id, status_code,
                                        {{"reason", "wallet_not_found"}});
                    }
                }
            }
            // PUT /wallets/{id}
            else if (req_.method() == http::verb::put && target.find("/wallets/") == 0) {
                std::string id = target.substr(9);
                keycloak::UserInfo user_info;
                if (!auth::authenticate(req_, *keycloak_client, user_info)) {
                    int status_code = static_cast<int>(http::status::unauthorized);
                    auth::sendUnauthorized(res, user_info.error);
                    emitStorageEvent("wallet_update_failed", user_info.mongoId, id, status_code,
                                    {{"reason", "authentication_failed"}});
                } else {
                    auto wallet = StorageService::getInstance().getWallet(id);
                    if (!wallet || wallet->user_id != user_info.mongoId) {
                        int status_code = static_cast<int>(http::status::forbidden);
                        auth::sendForbidden(res, "No tienes permiso para modificar esta cuenta");
                        emitStorageEvent("wallet_update_failed", user_info.mongoId, id, status_code,
                                        {{"reason", "permission_denied"}});
                    } else {
                        try {
                            json::value jv = json::parse(req_.body());
                            json::object& obj = jv.as_object();
                            
                            std::string name = std::string(obj.at("name").as_string());
                            std::string type = obj.contains("type") ? std::string(obj.at("type").as_string()) : wallet->type;
                            std::string bank_name = obj.contains("bank_name") ? std::string(obj.at("bank_name").as_string()) : wallet->bank_name;
                            std::string currency = obj.contains("currency") ? std::string(obj.at("currency").as_string()) : wallet->currency;
                            std::string account_number = obj.contains("account_number") ? std::string(obj.at("account_number").as_string()) : wallet->account_number;
                            
                            double balance = wallet->balance;
                            if (obj.contains("balance")) {
                                if (obj.at("balance").is_double()) {
                                    balance = obj.at("balance").as_double();
                                } else if (obj.at("balance").is_int64()) {
                                    balance = static_cast<double>(obj.at("balance").as_int64());
                                }
                            }
                            
                            bool success = StorageService::getInstance().updateWallet(id, name, type, bank_name, balance, currency, account_number);
                            
                            if (success) {
                                int status_code = static_cast<int>(http::status::ok);
                                json::object response;
                                response["message"] = "Cuenta actualizada exitosamente";
                                res.body() = json::serialize(response);
                                
                                boost::json::object extra;
                                extra["old_name"] = wallet->name;
                                extra["old_type"] = wallet->type;
                                extra["old_bank_name"] = wallet->bank_name;
                                extra["old_balance"] = wallet->balance;
                                extra["old_currency"] = wallet->currency;
                                extra["new_name"] = name;
                                extra["new_type"] = type;
                                extra["new_bank_name"] = bank_name;
                                extra["new_balance"] = balance;
                                extra["new_currency"] = currency;
                                emitStorageEvent("wallet_updated", user_info.mongoId, id, status_code, extra);
                            } else {
                                int status_code = static_cast<int>(http::status::not_found);
                                res.result(status_code);
                                json::object error;
                                error["error"] = "Cuenta no encontrada";
                                res.body() = json::serialize(error);
                                emitStorageEvent("wallet_update_failed", user_info.mongoId, id, status_code,
                                                {{"reason", "wallet_not_found"}});
                            }
                        } catch (const std::exception& e) {
                            int status_code = static_cast<int>(http::status::bad_request);
                            res.result(status_code);
                            json::object error;
                            error["error"] = e.what();
                            res.body() = json::serialize(error);
                            emitStorageEvent("wallet_update_failed", user_info.mongoId, id, status_code,
                                            {{"reason", "invalid_json"}, {"error", e.what()}});
                        }
                    }
                }
            }
            // DELETE /wallets/{id}
            else if (req_.method() == http::verb::delete_ && target.find("/wallets/") == 0) {
                std::string id = target.substr(9);
                keycloak::UserInfo user_info;
                if (!auth::authenticate(req_, *keycloak_client, user_info)) {
                    int status_code = static_cast<int>(http::status::unauthorized);
                    auth::sendUnauthorized(res, user_info.error);
                    emitStorageEvent("wallet_deletion_failed", user_info.mongoId, id, status_code,
                                    {{"reason", "authentication_failed"}});
                } else {
                    auto wallet = StorageService::getInstance().getWallet(id);
                    if (!wallet || wallet->user_id != user_info.mongoId) {
                        int status_code = static_cast<int>(http::status::forbidden);
                        auth::sendForbidden(res, "No tienes permiso para eliminar esta cuenta");
                        emitStorageEvent("wallet_deletion_failed", user_info.mongoId, id, status_code,
                                        {{"reason", "permission_denied"}});
                    } else {
                        boost::json::object extra;
                        extra["wallet_name"] = wallet->name;      // ← Cambiado
                        extra["wallet_type"] = wallet->type;      // ← Cambiado
                        extra["wallet_balance"] = wallet->balance; // ← Cambiado
                        
                        bool success = StorageService::getInstance().deleteWallet(id);
                        
                        if (success) {
                            int status_code = static_cast<int>(http::status::ok);
                            json::object response;
                            response["message"] = "Cuenta eliminada exitosamente";
                            res.body() = json::serialize(response);
                            emitStorageEvent("wallet_deleted", user_info.mongoId, id, status_code, extra);
                        } else {
                            int status_code = static_cast<int>(http::status::not_found);
                            res.result(status_code);
                            json::object error;
                            error["error"] = "Cuenta no encontrada";
                            res.body() = json::serialize(error);
                            emitStorageEvent("wallet_deletion_failed", user_info.mongoId, id, status_code,
                                            {{"reason", "wallet_not_found"}});
                        }
                    }
                }
            }
            // POST /transactions
            else if (req_.method() == http::verb::post && target == "/transactions") {
                keycloak::UserInfo user_info;
                if (!auth::authenticate(req_, *keycloak_client, user_info)) {
                    int status_code = static_cast<int>(http::status::unauthorized);
                    auth::sendUnauthorized(res, user_info.error);
                    emitStorageEvent("transaction_creation_failed", user_info.mongoId, "", status_code,
                                    {{"reason", "authentication_failed"}});
                } else {
                    try {
                        json::value jv = json::parse(req_.body());
                        json::object& obj = jv.as_object();
                        
                        Transaction transaction;
                        transaction.wallet_id = std::string(obj.at("wallet_id").as_string());
                        transaction.user_id = user_info.mongoId;
                        transaction.type = std::string(obj.at("type").as_string());
                        transaction.category = obj.contains("category") ? std::string(obj.at("category").as_string()) : "";
                        
                        if (obj.at("amount").is_double()) {
                            transaction.amount = obj.at("amount").as_double();
                        } else if (obj.at("amount").is_int64()) {
                            transaction.amount = static_cast<double>(obj.at("amount").as_int64());
                        } else {
                            int status_code = static_cast<int>(http::status::bad_request);
                            res.result(status_code);
                            json::object error;
                            error["error"] = "amount debe ser un número";
                            res.body() = json::serialize(error);
                            emitStorageEvent("transaction_creation_failed", user_info.mongoId, "", status_code,
                                            {{"reason", "invalid_amount"}});
                            return;
                        }
                        
                        transaction.description = obj.contains("description") ? std::string(obj.at("description").as_string()) : "";
                        transaction.date = obj.contains("date") ? std::string(obj.at("date").as_string()) : "";
                        
                        auto t = std::time(nullptr);
                        transaction.created_at = std::ctime(&t);
                        transaction.created_at.pop_back();
                        
                        std::string transaction_id;
                        bool success = StorageService::getInstance().addTransaction(transaction, transaction_id);
                        
                        if (success) {
                            int status_code = static_cast<int>(http::status::ok);
                            json::object response;
                            response["message"] = "Transacción registrada exitosamente";
                            response["transaction_id"] = transaction_id;
                            res.body() = json::serialize(response);
                            
                            boost::json::object extra;
                            extra["wallet_id"] = transaction.wallet_id;
                            extra["type"] = transaction.type;
                            extra["category"] = transaction.category;
                            extra["amount"] = transaction.amount;
                            extra["description"] = transaction.description;
                            emitStorageEvent("transaction_created", user_info.mongoId, transaction.wallet_id, status_code, extra);
                        } else {
                            int status_code = static_cast<int>(http::status::internal_server_error);
                            res.result(status_code);
                            json::object error;
                            error["error"] = "Error al registrar la transacción";
                            res.body() = json::serialize(error);
                            emitStorageEvent("transaction_creation_failed", user_info.mongoId, "", status_code,
                                            {{"reason", "database_error"}});
                        }
                    } catch (const std::exception& e) {
                        int status_code = static_cast<int>(http::status::bad_request);
                        res.result(status_code);
                        json::object error;
                        error["error"] = e.what();
                        res.body() = json::serialize(error);
                        emitStorageEvent("transaction_creation_failed", user_info.mongoId, "", status_code,
                                        {{"reason", "invalid_json"}, {"error", e.what()}});
                    }
                }
            }
            // GET /transactions
            else if (req_.method() == http::verb::get && target == "/transactions") {
                keycloak::UserInfo user_info;
                if (!auth::authenticate(req_, *keycloak_client, user_info)) {
                    int status_code = static_cast<int>(http::status::unauthorized);
                    auth::sendUnauthorized(res, user_info.error);
                    emitStorageEvent("list_transactions_failed", user_info.mongoId, "", status_code,
                                    {{"reason", "authentication_failed"}});
                } else {
                    auto transactions = StorageService::getInstance().getTransactionsByUser(user_info.mongoId);
                    json::array arr;
                    for (const auto& t : transactions) {
                        json::object obj;
                        obj["id"] = t.id;
                        obj["wallet_id"] = t.wallet_id;
                        obj["type"] = t.type;
                        obj["category"] = t.category;
                        obj["amount"] = formatNumber(t.amount);
                        obj["description"] = t.description;
                        obj["date"] = t.date;
                        obj["created_at"] = t.created_at;
                        arr.push_back(obj);
                    }
                    res.body() = json::serialize(arr);
                    emitStorageEvent("list_transactions_success", user_info.mongoId, "", 200,
                                    {{"count", (int)transactions.size()}});
                }
            }
            // GET /transactions/wallet/{wallet_id}
            else if (req_.method() == http::verb::get && target.find("/transactions/wallet/") == 0) {
                std::string wallet_id = target.substr(21);
                keycloak::UserInfo user_info;
                if (!auth::authenticate(req_, *keycloak_client, user_info)) {
                    int status_code = static_cast<int>(http::status::unauthorized);
                    auth::sendUnauthorized(res, user_info.error);
                    emitStorageEvent("list_transactions_by_wallet_failed", user_info.mongoId, wallet_id, status_code,
                                    {{"reason", "authentication_failed"}});
                } else {
                    auto wallet = StorageService::getInstance().getWallet(wallet_id);
                    if (!wallet || wallet->user_id != user_info.mongoId) {
                        int status_code = static_cast<int>(http::status::forbidden);
                        auth::sendForbidden(res, "No tienes permiso para ver estas transacciones");
                        emitStorageEvent("list_transactions_by_wallet_failed", user_info.mongoId, wallet_id, status_code,
                                        {{"reason", "permission_denied"}});
                    } else {
                        auto transactions = StorageService::getInstance().getTransactionsByWallet(wallet_id);
                        json::array arr;
                        for (const auto& t : transactions) {
                            json::object obj;
                            obj["id"] = t.id;
                            obj["type"] = t.type;
                            obj["category"] = t.category;
                            obj["amount"] = formatNumber(t.amount);
                            obj["description"] = t.description;
                            obj["date"] = t.date;
                            arr.push_back(obj);
                        }
                        res.body() = json::serialize(arr);
                        emitStorageEvent("list_transactions_by_wallet_success", user_info.mongoId, wallet_id, 200,
                                        {{"wallet_id", wallet_id}, {"count", (int)transactions.size()}});
                    }
                }
            }
            // PUT /transactions/{id} - actualizar transacción
            else if (req_.method() == http::verb::put && target.find("/transactions/") == 0 && target != "/transactions") {
                std::string id = target.substr(14);
                // Eliminar cualquier query string
                size_t query_pos = id.find('?');
                if (query_pos != std::string::npos) {
                    id = id.substr(0, query_pos);
                }
                
                std::cout << "[DEBUG] Updating transaction with ID: " << id << std::endl;
                
                keycloak::UserInfo user_info;
                if (!auth::authenticate(req_, *keycloak_client, user_info)) {
                    int status_code = static_cast<int>(http::status::unauthorized);
                    auth::sendUnauthorized(res, user_info.error);
                    emitStorageEvent("transaction_update_failed", user_info.mongoId, id, status_code,
                                    {{"reason", "authentication_failed"}});
                    return;
                }
                
                std::cout << "[DEBUG] Authenticated user: " << user_info.mongoId << std::endl;
                
                // Obtener la transacción directamente por ID
                auto transaction_opt = StorageService::getInstance().getTransactionById(id);
                
                if (!transaction_opt) {
                    int status_code = static_cast<int>(http::status::not_found);
                    res.result(status_code);
                    json::object error;
                    error["error"] = "Transacción no encontrada";
                    error["transaction_id"] = id;
                    res.body() = json::serialize(error);
                    emitStorageEvent("transaction_update_failed", user_info.mongoId, id, status_code,
                                    {{"reason", "transaction_not_found"}});
                    return;
                }
                
                Transaction old_transaction = *transaction_opt;
                std::cout << "[DEBUG] Found transaction: " << old_transaction.id << " for wallet: " << old_transaction.wallet_id << std::endl;
                
                // Verificar que la transacción pertenezca al usuario
                auto wallet = StorageService::getInstance().getWallet(old_transaction.wallet_id);
                if (!wallet) {
                    int status_code = static_cast<int>(http::status::not_found);
                    res.result(status_code);
                    json::object error;
                    error["error"] = "Wallet no encontrada";
                    res.body() = json::serialize(error);
                    emitStorageEvent("transaction_update_failed", user_info.mongoId, id, status_code,
                                    {{"reason", "wallet_not_found"}});
                    return;
                }
                
                if (wallet->user_id != user_info.mongoId) {
                    int status_code = static_cast<int>(http::status::forbidden);
                    auth::sendForbidden(res, "No tienes permiso para modificar esta transacción");
                    emitStorageEvent("transaction_update_failed", user_info.mongoId, id, status_code,
                                    {{"reason", "permission_denied"}});
                    return;
                }
                
                try {
                    json::value jv = json::parse(req_.body());
                    json::object& obj = jv.as_object();
                    
                    // Revertir el efecto de la transacción anterior en la wallet
                    double temp_balance = wallet->balance;
                    if (old_transaction.type == "income") {
                        temp_balance = wallet->balance - old_transaction.amount;
                    } else if (old_transaction.type == "expense") {
                        temp_balance = wallet->balance + old_transaction.amount;
                    }
                    
                    StorageService::getInstance().updateWallet(wallet->id, wallet->name, wallet->type, wallet->bank_name,
                                                            temp_balance, wallet->currency, wallet->account_number);
                    
                    // Obtener nuevos valores
                    std::string new_type = obj.contains("type") ? std::string(obj.at("type").as_string()) : old_transaction.type;
                    std::string new_category = obj.contains("category") ? std::string(obj.at("category").as_string()) : old_transaction.category;
                    std::string new_description = obj.contains("description") ? std::string(obj.at("description").as_string()) : old_transaction.description;
                    std::string new_date = obj.contains("date") ? std::string(obj.at("date").as_string()) : old_transaction.date;
                    
                    double new_amount = old_transaction.amount;
                    if (obj.contains("amount")) {
                        if (obj.at("amount").is_double()) {
                            new_amount = obj.at("amount").as_double();
                        } else if (obj.at("amount").is_int64()) {
                            new_amount = static_cast<double>(obj.at("amount").as_int64());
                        } else {
                            int status_code = static_cast<int>(http::status::bad_request);
                            res.result(status_code);
                            json::object error;
                            error["error"] = "amount debe ser un número";
                            res.body() = json::serialize(error);
                            emitStorageEvent("transaction_update_failed", user_info.mongoId, id, status_code,
                                            {{"reason", "invalid_amount"}});
                            return;
                        }
                    }
                    
                    // Aplicar el nuevo efecto en la wallet
                    double final_balance = temp_balance;
                    if (new_type == "income") {
                        final_balance = temp_balance + new_amount;
                    } else if (new_type == "expense") {
                        final_balance = temp_balance - new_amount;
                    }
                    
                    StorageService::getInstance().updateWallet(wallet->id, wallet->name, wallet->type, wallet->bank_name,
                                                            final_balance, wallet->currency, wallet->account_number);
                    
                    // Actualizar la transacción en MongoDB
                    auto oid_opt = StorageService::parseObjectId(id);
                    if (!oid_opt) {
                        int status_code = static_cast<int>(http::status::bad_request);
                        res.result(status_code);
                        json::object error;
                        error["error"] = "ID inválido";
                        res.body() = json::serialize(error);
                        return;
                    }
                    
                    auto collection = Database::getInstance().getCollection("transactions");
                    auto filter = bsoncxx::builder::stream::document{} 
                        << "_id" << *oid_opt 
                        << bsoncxx::builder::stream::finalize;
                    
                    auto update_doc = bsoncxx::builder::stream::document{} 
                        << "$set" << bsoncxx::builder::stream::open_document
                        << "type" << new_type
                        << "category" << new_category
                        << "amount" << new_amount
                        << "description" << new_description
                        << "date" << new_date
                        << bsoncxx::builder::stream::close_document
                        << bsoncxx::builder::stream::finalize;
                    
                    auto result = collection.update_one(filter.view(), update_doc.view());
                    
                    if (result && result->modified_count() > 0) {
                        int status_code = static_cast<int>(http::status::ok);
                        json::object response;
                        response["message"] = "Transacción actualizada exitosamente";
                        res.body() = json::serialize(response);
                        
                        boost::json::object extra;
                        extra["old_type"] = old_transaction.type;
                        extra["old_category"] = old_transaction.category;
                        extra["old_amount"] = old_transaction.amount;
                        extra["new_type"] = new_type;
                        extra["new_category"] = new_category;
                        extra["new_amount"] = new_amount;
                        extra["wallet_id"] = wallet->id;
                        extra["new_wallet_balance"] = final_balance;
                        emitStorageEvent("transaction_updated", user_info.mongoId, id, status_code, extra);
                    } else {
                        int status_code = static_cast<int>(http::status::not_found);
                        res.result(status_code);
                        json::object error;
                        error["error"] = "Transacción no encontrada";
                        res.body() = json::serialize(error);
                        emitStorageEvent("transaction_update_failed", user_info.mongoId, id, status_code,
                                        {{"reason", "transaction_not_found"}});
                    }
                    
                } catch (const std::exception& e) {
                    int status_code = static_cast<int>(http::status::bad_request);
                    res.result(status_code);
                    json::object error;
                    error["error"] = e.what();
                    res.body() = json::serialize(error);
                    emitStorageEvent("transaction_update_failed", user_info.mongoId, id, status_code,
                                    {{"reason", "invalid_json"}, {"error", e.what()}});
                }
            }
            // DELETE /transactions/{id} - eliminar transacción
            else if (req_.method() == http::verb::delete_ && target.find("/transactions/") == 0 && target != "/transactions") {
                std::string id = target.substr(14);
                keycloak::UserInfo user_info;
                if (!auth::authenticate(req_, *keycloak_client, user_info)) {
                    int status_code = static_cast<int>(http::status::unauthorized);
                    auth::sendUnauthorized(res, user_info.error);
                    emitStorageEvent("transaction_deletion_failed", user_info.mongoId, id, status_code,
                                    {{"reason", "authentication_failed"}});
                } else {
                    // Obtener la transacción para saber su wallet y tipo
                    auto transactions = StorageService::getInstance().getTransactionsByUser(user_info.mongoId);
                    Transaction transaction_to_delete;
                    bool found = false;
                    for (const auto& t : transactions) {
                        if (t.id == id) {
                            transaction_to_delete = t;
                            found = true;
                            break;
                        }
                    }
                    
                    if (!found) {
                        int status_code = static_cast<int>(http::status::not_found);
                        res.result(status_code);
                        json::object error;
                        error["error"] = "Transacción no encontrada";
                        res.body() = json::serialize(error);
                        emitStorageEvent("transaction_deletion_failed", user_info.mongoId, id, status_code,
                                        {{"reason", "transaction_not_found"}});
                        return;
                    }
                    
                    // Verificar que la transacción pertenezca al usuario
                    auto wallet = StorageService::getInstance().getWallet(transaction_to_delete.wallet_id);
                    if (!wallet || wallet->user_id != user_info.mongoId) {
                        int status_code = static_cast<int>(http::status::forbidden);
                        auth::sendForbidden(res, "No tienes permiso para eliminar esta transacción");
                        emitStorageEvent("transaction_deletion_failed", user_info.mongoId, id, status_code,
                                        {{"reason", "permission_denied"}});
                        return;
                    }
                    
                    // Revertir el efecto de la transacción en la wallet
                    double new_balance = wallet->balance;
                    if (transaction_to_delete.type == "income") {
                        new_balance = wallet->balance - transaction_to_delete.amount;
                    } else if (transaction_to_delete.type == "expense") {
                        new_balance = wallet->balance + transaction_to_delete.amount;
                    }
                    
                    // Guardar información para el evento
                    boost::json::object extra;
                    extra["transaction_type"] = transaction_to_delete.type;
                    extra["transaction_category"] = transaction_to_delete.category;
                    extra["transaction_amount"] = transaction_to_delete.amount;
                    extra["wallet_id"] = wallet->id;
                    extra["old_wallet_balance"] = wallet->balance;
                    extra["new_wallet_balance"] = new_balance;
                    
                    // Actualizar la wallet (revertir el efecto)
                    StorageService::getInstance().updateWallet(wallet->id, wallet->name, wallet->type, wallet->bank_name,
                                                            new_balance, wallet->currency, wallet->account_number);
                    
                    // Eliminar la transacción
                    bool success = StorageService::getInstance().deleteTransaction(id);
                    
                    if (success) {
                        int status_code = static_cast<int>(http::status::ok);
                        json::object response;
                        response["message"] = "Transacción eliminada exitosamente";
                        response["wallet_balance_updated"] = new_balance;
                        res.body() = json::serialize(response);
                        emitStorageEvent("transaction_deleted", user_info.mongoId, id, status_code, extra);
                    } else {
                        int status_code = static_cast<int>(http::status::not_found);
                        res.result(status_code);
                        json::object error;
                        error["error"] = "Transacción no encontrada";
                        res.body() = json::serialize(error);
                        emitStorageEvent("transaction_deletion_failed", user_info.mongoId, id, status_code,
                                        {{"reason", "transaction_not_found"}});
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
        std::cout << "Storage Service listening on " << address << ":" << port << std::endl;
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
        unsigned short port = port_env ? std::stoi(port_env) : 8085;
        
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