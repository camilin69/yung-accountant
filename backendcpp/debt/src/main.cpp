#include <boost/beast/core.hpp>
#include <boost/beast/http.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <boost/json.hpp>
#include <iostream>
#include <memory>
#include <ctime>
#include "debt_service.hpp"
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
void emitDebtEvent(const std::string& type, const std::string& userId,
                   const std::string& debtId, int status, const json::object& extra = {}) {
    try {
        json::object event;
        event["type"] = type;
        event["service"] = "debts";
        event["user_id"] = userId;
        event["debt_id"] = debtId;
        event["timestamp"] = std::time(nullptr);
        event["status_code"] = status;
        for (const auto& [k, v] : extra) event[k] = v;
        kafka::getProducer().produce("debt-events", event);
        
        std::string s = (status >= 200 && status < 300) ? "SUCCESS" : "FAILED";
        std::cout << "[Kafka] " << type << " (" << s << ") user=" << userId << " debt=" << debtId << std::endl;
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
        res.set(http::field::server, "Debt Service");
        addCorsHeaders(res, req_);
        res.set(http::field::content_type, "application/json");
        
        try {
            std::string target(req_.target().begin(), req_.target().end());
            
            // GET /debts - Todas las deudas del usuario
            if (req_.method() == http::verb::get && target == "/debts") {
                handle_get_debts(res);
            }
            // GET /debts/{id} - Una deuda específica
            else if (req_.method() == http::verb::get && target.find("/debts/") == 0 && target.find("/payments") == std::string::npos) {
                handle_get_debt(res);
            }
            // POST /debts - Crear deuda
            else if (req_.method() == http::verb::post && target == "/debts") {
                handle_create_debt(res);
            }
            // PUT /debts/{id} - Actualizar deuda
            else if (req_.method() == http::verb::put && target.find("/debts/") == 0 && target.find("/payments") == std::string::npos) {
                handle_update_debt(res);
            }
            // DELETE /debts/{id} - Eliminar deuda
            else if (req_.method() == http::verb::delete_ && target.find("/debts/") == 0 && target.find("/payments") == std::string::npos) {
                handle_delete_debt(res);
            }
            // POST /debts/{id}/payments - Agregar pago
            else if (req_.method() == http::verb::post && target.find("/debts/") != std::string::npos && target.find("/payments") != std::string::npos) {
                handle_add_payment(res);
            }
            // DELETE /payments/{id} - Eliminar pago
            else if (req_.method() == http::verb::delete_ && target.find("/payments/") != std::string::npos) {
                handle_delete_payment(res);
            }
            // POST /interests - Agregar interés variable
            else if (req_.method() == http::verb::post && target == "/interests") {
                handle_add_interest(res);
            }
            // GET /health
            else if (req_.method() == http::verb::get && target == "/health") {
                json::object r;
                r["status"] = "ok"; r["service"] = "debts";
                r["redis"] = redis::RedisClient::getInstance().isConnected();
                res.body() = json::serialize(r);
            }
            else {
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
    void handle_get_debts(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            emitDebtEvent("get_debts_failed", "", "", 401, {{"reason", "invalid_token"}});
            return;
        }
        auto debts = DebtService::getInstance().getDebtsByUser(userInfo.postgresId);
        json::array arr;
        int activeCount = 0, paidCount = 0;
        for (const auto& d : debts) {
            json::object obj;
            obj["id"] = d.id; obj["type"] = d.type; obj["creditorName"] = d.creditorName;
            obj["originalAmount"] = d.originalAmount; obj["remainingBalance"] = d.remainingBalance;
            obj["interestRate"] = d.interestRate; obj["interestType"] = d.interestType;
            obj["termMonths"] = d.termMonths; obj["monthlyPayment"] = d.monthlyPayment;
            obj["startDate"] = d.startDate; obj["nextDueDate"] = d.nextDueDate;
            obj["status"] = d.status; obj["notes"] = d.notes;
            obj["realAmountToPay"] = d.realAmountToPay; obj["realInterests"] = d.realInterests;
            obj["walletId"] = d.walletId; obj["categoryId"] = d.categoryId;
            obj["createdAt"] = d.createdAt;
            
            // Payments
            auto payments = DebtService::getInstance().getPayments(d.id);
            json::array parr;
            for (const auto& p : payments) {
                json::object po;
                po["id"] = p.id; po["amount"] = p.amount; po["date"] = p.date;
                po["interestAmount"] = p.interestAmount; po["principalAmount"] = p.principalAmount;
                po["remainingBalance"] = p.remainingBalance; po["notes"] = p.notes;
                parr.push_back(po);
            }
            obj["payments"] = parr;
            
            // Variable interests
            auto interests = DebtService::getInstance().getVariableInterests(d.id);
            json::array iarr;
            for (const auto& vi : interests) {
                json::object io;
                io["month"] = vi.month; io["rate"] = vi.rate;
                iarr.push_back(io);
            }
            obj["variableInterests"] = iarr;
            
            arr.push_back(obj);
            if (d.status == "active") activeCount++; else if (d.status == "paid") paidCount++;
        }
        res.result(http::status::ok);
        res.body() = json::serialize(arr);
        
        emitDebtEvent("get_debts", userInfo.postgresId, "", 200,
            {{"count", static_cast<int64_t>(debts.size())}, {"active", activeCount}, {"paid", paidCount}});
    }
    
    void handle_get_debt(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            return;
        }
        std::string id = std::string(req_.target().begin(), req_.target().end()).substr(7);
        auto d = DebtService::getInstance().getDebtById(id, userInfo.postgresId);
        if (!d) {
            res.result(http::status::not_found);
            res.body() = json::serialize(json::object{{"error", "Not found"}});
            emitDebtEvent("get_debt_failed", userInfo.postgresId, id, 404, {{"reason", "not_found"}});
            return;
        }
        json::object obj;
        obj["id"] = d->id; obj["type"] = d->type; obj["creditorName"] = d->creditorName;
        obj["originalAmount"] = d->originalAmount; obj["remainingBalance"] = d->remainingBalance;
        obj["status"] = d->status; obj["monthlyPayment"] = d->monthlyPayment;
        res.result(http::status::ok);
        res.body() = json::serialize(obj);
    }
    
    void handle_create_debt(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            emitDebtEvent("create_debt_failed", "", "", 401, {{"reason", "invalid_token"}});
            return;
        }
        try {
            auto jv = json::parse(req_.body());
            auto& obj = jv.as_object();
            
            Debt d;
            d.userId = userInfo.postgresId;
            d.type = std::string(obj.at("type").as_string());
            d.creditorName = std::string(obj.at("creditorName").as_string());
            d.walletId = std::string(obj.at("walletId").as_string());
            d.categoryId = std::string(obj.at("categoryId").as_string());
            d.originalAmount = obj.at("originalAmount").as_double();
            d.remainingBalance = d.originalAmount;
            d.interestRate = obj.at("interestRate").as_double();
            d.interestType = std::string(obj.at("interestType").as_string());
            d.termMonths = obj.at("termMonths").as_int64();
            d.monthlyPayment = obj.at("monthlyPayment").as_double();
            d.startDate = std::string(obj.at("startDate").as_string());
            d.nextDueDate = std::string(obj.at("nextDueDate").as_string());
            d.status = "active";
            d.notes = obj.contains("notes") ? std::string(obj.at("notes").as_string()) : "";
            d.realAmountToPay = obj.contains("realAmountToPay") ? obj.at("realAmountToPay").as_double() : d.originalAmount;
            d.realInterests = obj.contains("realInterests") ? obj.at("realInterests").as_double() : 0;
            
            auto created = DebtService::getInstance().createDebt(d);
            if (!created) {
                res.result(http::status::internal_server_error);
                res.body() = json::serialize(json::object{{"error", "Error creating debt"}});
                emitDebtEvent("create_debt_failed", userInfo.postgresId, "", 500, {{"reason", "db_error"}});
                return;
            }
            
            res.result(http::status::created);
            json::object resp;
            resp["id"] = created->id; resp["message"] = "Deuda creada exitosamente";
            resp["type"] = d.type; resp["creditorName"] = d.creditorName;
            resp["originalAmount"] = d.originalAmount;
            res.body() = json::serialize(resp);
            
            emitDebtEvent("debt_created", userInfo.postgresId, created->id, 201,
                {{"type", d.type}, {"creditor", d.creditorName}, {"amount", d.originalAmount},
                 {"termMonths", d.termMonths}, {"interestRate", d.interestRate}});
        } catch (const std::exception& e) {
            res.result(http::status::bad_request);
            res.body() = json::serialize(json::object{{"error", e.what()}});
            emitDebtEvent("create_debt_failed", userInfo.postgresId, "", 400,
                {{"reason", "bad_request"}, {"error", e.what()}});
        }
    }
    
    void handle_update_debt(http::response<http::string_body>& res) {
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
            bool ok = DebtService::getInstance().updateDebt(id, userInfo.postgresId, updates);
            
            if (!ok) {
                res.result(http::status::not_found);
                res.body() = json::serialize(json::object{{"error", "Not found"}});
                emitDebtEvent("update_debt_failed", userInfo.postgresId, id, 404, {{"reason", "not_found"}});
                return;
            }
            
            res.result(http::status::ok);
            res.body() = json::serialize(json::object{{"message", "Deuda actualizada"}, {"id", id}});
            
            json::object extra;
            if (updates.contains("status")) extra["new_status"] = updates.at("status");
            if (updates.contains("remainingBalance")) extra["remainingBalance"] = updates.at("remainingBalance");
            emitDebtEvent("debt_updated", userInfo.postgresId, id, 200, extra);
        } catch (const std::exception& e) {
            res.result(http::status::bad_request);
            res.body() = json::serialize(json::object{{"error", e.what()}});
        }
    }
    
    void handle_delete_debt(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            return;
        }
        std::string id = std::string(req_.target().begin(), req_.target().end()).substr(7);
        bool ok = DebtService::getInstance().deleteDebt(id, userInfo.postgresId);
        
        if (!ok) {
            res.result(http::status::not_found);
            res.body() = json::serialize(json::object{{"error", "Not found"}});
            return;
        }
        
        res.result(http::status::ok);
        res.body() = json::serialize(json::object{{"message", "Deuda eliminada"}, {"id", id}});
        emitDebtEvent("debt_deleted", userInfo.postgresId, id, 200);
    }
    
    void handle_add_payment(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            return;
        }
        try {
            auto jv = json::parse(req_.body());
            auto& obj = jv.as_object();
            std::string debtId = std::string(obj.at("debtId").as_string());
            
            DebtPayment p;
            p.debtId = debtId;
            p.amount = obj.at("amount").as_double();
            p.date = std::string(obj.at("date").as_string());
            p.interestAmount = obj.at("interestAmount").as_double();
            p.principalAmount = obj.at("principalAmount").as_double();
            p.remainingBalance = obj.at("remainingBalance").as_double();
            p.notes = obj.contains("notes") ? std::string(obj.at("notes").as_string()) : "";
            
            auto created = DebtService::getInstance().addPayment(p);
            if (!created) {
                res.result(http::status::internal_server_error);
                res.body() = json::serialize(json::object{{"error", "Error adding payment"}});
                emitDebtEvent("add_payment_failed", userInfo.postgresId, debtId, 500, {{"reason", "db_error"}});
                return;
            }
            
            DebtService::getInstance().invalidateCache(userInfo.postgresId);
            
            res.result(http::status::created);
            json::object resp;
            resp["id"] = created->id; resp["message"] = "Pago registrado";
            resp["amount"] = p.amount; resp["remainingBalance"] = p.remainingBalance;
            res.body() = json::serialize(resp);
            
            emitDebtEvent("payment_added", userInfo.postgresId, debtId, 201,
                {{"amount", p.amount}, {"remainingBalance", p.remainingBalance},
                 {"principalAmount", p.principalAmount}, {"interestAmount", p.interestAmount}});
        } catch (const std::exception& e) {
            res.result(http::status::bad_request);
            res.body() = json::serialize(json::object{{"error", e.what()}});
        }
    }
    
    void handle_delete_payment(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            return;
        }
        std::string paymentId = std::string(req_.target().begin(), req_.target().end()).substr(10);
        bool ok = DebtService::getInstance().deletePayment(paymentId);
        
        res.result(ok ? http::status::ok : http::status::not_found);
        res.body() = json::serialize(json::object{{"message", ok ? "Pago eliminado" : "Not found"}});
        
        if (ok) {
            DebtService::getInstance().invalidateCache(userInfo.postgresId);
            emitDebtEvent("payment_deleted", userInfo.postgresId, paymentId, 200);
        }
    }
    
    void handle_add_interest(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            return;
        }
        try {
            auto jv = json::parse(req_.body());
            auto& obj = jv.as_object();
            
            VariableInterest vi;
            vi.debtId = std::string(obj.at("debtId").as_string());
            vi.month = obj.at("month").as_int64();
            vi.rate = obj.at("rate").as_double();
            
            bool ok = DebtService::getInstance().addVariableInterest(vi);
            res.result(ok ? http::status::created : http::status::internal_server_error);
            res.body() = json::serialize(json::object{{"message", ok ? "Interés registrado" : "Error"}});
            
            if (ok) {
                emitDebtEvent("interest_added", userInfo.postgresId, vi.debtId, 201,
                    {{"month", vi.month}, {"rate", vi.rate}});
            }
        } catch (const std::exception& e) {
            res.result(http::status::bad_request);
            res.body() = json::serialize(json::object{{"error", e.what()}});
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
        std::cout << "Debt Service listening on " << address << ":" << port << std::endl;
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
        unsigned short port = std::getenv("SERVER_PORT") ? std::stoi(std::getenv("SERVER_PORT")) : 8083;
        
        keycloakClient = std::make_unique<keycloak::KeycloakClient>(
            std::getenv("KEYCLOAK_URL") ? std::getenv("KEYCLOAK_URL") : "http://keycloak:8080",
            std::getenv("KEYCLOAK_REALM") ? std::getenv("KEYCLOAK_REALM") : "yung-accountant");
        
        if (!Database::getInstance().connect(
                std::getenv("POSTGRES_HOST") ? std::getenv("POSTGRES_HOST") : "postgresdb",
                std::getenv("POSTGRES_PORT") ? std::stoi(std::getenv("POSTGRES_PORT")) : 5432,
                std::getenv("POSTGRES_DB") ? std::getenv("POSTGRES_DB") : "yung_accountant",
                std::getenv("POSTGRES_USER") ? std::getenv("POSTGRES_USER") : "admin",
                std::getenv("POSTGRES_PASSWORD") ? std::getenv("POSTGRES_PASSWORD") : "secret123")) {
            std::cerr << "Failed to connect to PostgreSQL. Exiting..." << std::endl;
            return 1;
        }
        
        auto& redis = redis::RedisClient::getInstance();
        redis.connect(
            std::getenv("REDIS_HOST") ? std::getenv("REDIS_HOST") : "redis",
            std::getenv("REDIS_PORT") ? std::stoi(std::getenv("REDIS_PORT")) : 6379,
            std::getenv("REDIS_PASSWORD") ? std::getenv("REDIS_PASSWORD") : "");
        
        kafka::getProducer();
        
        std::cout << "Debt Service starting on 0.0.0.0:" << port << std::endl;
        std::cout << "Redis cache: " << (redis.isConnected() ? "enabled" : "disabled") << std::endl;
        
        HttpServer server("0.0.0.0", port);
        server.run();
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }
    return 0;
}