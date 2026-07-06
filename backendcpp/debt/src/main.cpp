// src/main.cpp (Debt Service - HARDENED)
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
#include "debt_service.hpp"
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
        res.set(http::field::server, "Debt Service");
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
        if (!userInfo.isValid || userInfo.postgresId.empty()) {
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
            obj["compoundMonths"] = d.compoundMonths;
            obj["termMonths"] = d.termMonths; obj["monthlyPayment"] = d.monthlyPayment;
            obj["startDate"] = d.startDate; obj["nextDueDate"] = d.nextDueDate;
            obj["status"] = d.status; obj["notes"] = d.notes;
            obj["realAmountToPay"] = d.realAmountToPay; obj["realInterests"] = d.realInterests;
            obj["walletId"] = d.walletId; obj["categoryId"] = d.categoryId;
            obj["createdAt"] = d.createdAt;
            
            // Payments
            auto payments = DebtService::getInstance().getPayments(d.id, userInfo.postgresId);
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
            auto interests = DebtService::getInstance().getVariableInterests(d.id, userInfo.postgresId);
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
        if (!userInfo.isValid || userInfo.postgresId.empty()) {
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
        obj["compoundMonths"] = d->compoundMonths;
        obj["status"] = d->status; obj["monthlyPayment"] = d->monthlyPayment;
        res.result(http::status::ok);
        res.body() = json::serialize(obj);
    }
    
    void handle_create_debt(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid || userInfo.postgresId.empty()) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            emitDebtEvent("create_debt_failed", "", "", 401, {{"reason", "invalid_token"}});
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
            
            Debt d;
            d.userId = userInfo.postgresId;
            d.type = std::string(obj.at("type").as_string());
            d.creditorName = std::string(obj.at("creditorName").as_string());
            d.walletId = std::string(obj.at("walletId").as_string());
            d.categoryId = std::string(obj.at("categoryId").as_string());
            d.originalAmount = toDouble(obj.at("originalAmount"));
            d.remainingBalance = d.originalAmount;
            d.interestRate = toDouble(obj.at("interestRate"));
            d.interestType = std::string(obj.at("interestType").as_string());
            d.compoundMonths = obj.contains("compoundMonths") ? static_cast<int>(obj.at("compoundMonths").as_int64()) : 0;
            d.termMonths = obj.at("termMonths").as_int64();
            d.monthlyPayment = toDouble(obj.at("monthlyPayment"));
            d.startDate = std::string(obj.at("startDate").as_string());
            d.nextDueDate = obj.contains("nextDueDate") && !obj.at("nextDueDate").as_string().empty() 
                ? std::string(obj.at("nextDueDate").as_string()) : d.startDate;
            d.status = "active";
            d.notes = obj.contains("notes") ? std::string(obj.at("notes").as_string()) : "";
            d.realAmountToPay = obj.contains("realAmountToPay") ? toDouble(obj.at("realAmountToPay")) : d.originalAmount;
            d.realInterests = obj.contains("realInterests") ? toDouble(obj.at("realInterests")) : 0;
            
            std::cout << "[CREATE DEBT] amount=" << d.originalAmount << " compoundMonths=" << d.compoundMonths << std::endl;

            auto nameCheck = security::validateString("Creditor name", d.creditorName, 1, 200);
            if (!nameCheck.valid) { res.result(http::status::bad_request); res.body() = json::serialize(json::object{{"error", nameCheck.error}}); return; }
            auto amtCheck = security::validateAmount(d.originalAmount, 1.0);
            if (!amtCheck.valid) { res.result(http::status::bad_request); res.body() = json::serialize(json::object{{"error", amtCheck.error}}); return; }

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
            resp["originalAmount"] = d.originalAmount; resp["compoundMonths"] = d.compoundMonths;
            res.body() = json::serialize(resp);
            
            emitDebtEvent("debt_created", userInfo.postgresId, created->id, 201,
                {{"type", d.type}, {"creditor", d.creditorName}, {"amount", d.originalAmount},
                {"termMonths", d.termMonths}, {"interestRate", d.interestRate}, {"compoundMonths", d.compoundMonths}});
        } catch (const std::exception& e) {
            res.result(http::status::bad_request);
            res.body() = json::serialize(json::object{{"error", e.what()}});
            emitDebtEvent("create_debt_failed", userInfo.postgresId, "", 400,
                {{"reason", "bad_request"}, {"error", e.what()}});
        }
    }
    
    void handle_update_debt(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid || userInfo.postgresId.empty()) {
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
            if (updates.contains("compoundMonths")) extra["compoundMonths"] = updates.at("compoundMonths");
            emitDebtEvent("debt_updated", userInfo.postgresId, id, 200, extra);
        } catch (const std::exception& e) {
            res.result(http::status::bad_request);
            res.body() = json::serialize(json::object{{"error", e.what()}});
        }
    }
    
    void handle_delete_debt(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid || userInfo.postgresId.empty()) {
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
            
            std::string debtId = std::string(obj.at("debtId").as_string());
            
            DebtPayment p;
            p.debtId = debtId;
            p.amount = toDouble(obj.at("amount"));
            p.date = std::string(obj.at("date").as_string());
            p.interestAmount = toDouble(obj.at("interestAmount"));
            p.principalAmount = toDouble(obj.at("principalAmount"));
            p.remainingBalance = toDouble(obj.at("remainingBalance"));
            p.notes = obj.contains("notes") ? std::string(obj.at("notes").as_string()) : "";

            auto amtCheck = security::validateAmount(p.amount, 1.0);
            if (!amtCheck.valid) { res.result(http::status::bad_request); res.body() = json::serialize(json::object{{"error", amtCheck.error}}); return; }

            auto created = DebtService::getInstance().addPayment(p, userInfo.postgresId);
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
                {{"amount", p.amount}, {"remainingBalance", p.remainingBalance}});
        } catch (const std::exception& e) {
            res.result(http::status::bad_request);
            res.body() = json::serialize(json::object{{"error", e.what()}});
        }
    }
        
    void handle_delete_payment(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid || userInfo.postgresId.empty()) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            return;
        }
        std::string paymentId = std::string(req_.target().begin(), req_.target().end()).substr(10);
        bool ok = DebtService::getInstance().deletePayment(paymentId, userInfo.postgresId);
        
        res.result(ok ? http::status::ok : http::status::not_found);
        res.body() = json::serialize(json::object{{"message", ok ? "Pago eliminado" : "Not found"}});
        
        if (ok) {
            DebtService::getInstance().invalidateCache(userInfo.postgresId);
            emitDebtEvent("payment_deleted", userInfo.postgresId, paymentId, 200);
        }
    }
    
    void handle_add_interest(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid || userInfo.postgresId.empty()) {
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
            
            bool ok = DebtService::getInstance().addVariableInterest(vi, userInfo.postgresId);
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
        std::cout << "Debt Service listening on " << address << ":" << port << std::endl;
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
