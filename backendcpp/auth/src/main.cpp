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
#include <curl/curl.h>
#include <openssl/evp.h>
#include <openssl/rand.h>
#include <iomanip>
#include "user_service.hpp"
#include "database.hpp"
#include "keycloak_auth.hpp"
#include "kafka_producer.hpp"
#include "rate_limiter.hpp"
#include "validators.hpp"
#include "turnstile.hpp"
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
// CURL WRITE CALLBACK — safe free function for C interop
// ============================================
static size_t curlWriteCallback(void* contents, size_t size, size_t nmemb, std::string* output) {
    size_t total = size * nmemb;
    output->append(static_cast<char*>(contents), total);
    return total;
}

// ============================================
// TOKEN EXTRACTION (Bearer + Cookie)
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

// ============================================
// CLIENT IP EXTRACTION (Cloudflare-aware)
// ============================================
std::string getClientIp(const http::request<http::string_body>& req) {
    // CF-Connecting-IP is set by Nginx realip_module when behind Cloudflare
    auto it = req.find("CF-Connecting-IP");
    if (it != req.end()) {
        return std::string(it->value().begin(), it->value().end());
    }
    // Fallback: X-Forwarded-For (first IP in chain)
    it = req.find("X-Forwarded-For");
    if (it != req.end()) {
        std::string xff(it->value().begin(), it->value().end());
        size_t comma = xff.find(',');
        if (comma != std::string::npos) {
            return xff.substr(0, comma);
        }
        return xff;
    }
    return "";
}

// ============================================
// COOKIE HELPERS
// ============================================
std::string getCookie(const http::request<http::string_body>& req, const std::string& name) {
    auto it = req.find(http::field::cookie);
    if (it == req.end()) return "";
    std::string cookies = std::string(it->value().begin(), it->value().end());
    std::string key = name + "=";
    size_t pos = cookies.find(key);
    if (pos == std::string::npos) return "";
    size_t start = pos + key.size();
    size_t end = cookies.find(';', start);
    if (end == std::string::npos) end = cookies.size();
    return cookies.substr(start, end - start);
}

void setCookie(http::response<http::string_body>& res,
               const std::string& name, const std::string& value,
               int maxAgeSeconds, bool httpOnly = true) {
    // SameSite=Lax — frontend and API are same-origin (yung-accountant.com)
    std::string cookie = name + "=" + value +
                        "; Path=/; SameSite=Lax; Secure; Max-Age=" + std::to_string(maxAgeSeconds);
    if (httpOnly) cookie += "; HttpOnly";
    res.insert(http::field::set_cookie, cookie);
}

void clearCookie(http::response<http::string_body>& res, const std::string& name) {
    std::string cookie = name + "=; Path=/; SameSite=Lax; Secure; Max-Age=0; HttpOnly";
    res.insert(http::field::set_cookie, cookie);
}

// ============================================
// USER VERIFICATION (con validación de postgresId)
// ============================================
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
void emitAuthEvent(const std::string& event_type, 
                   const std::string& user_id, 
                   const std::string& email,
                   int status_code,
                   const boost::json::object& extra_data = {}) {
    try {
        boost::json::object event;
        event["type"] = event_type;
        event["service"] = "auth";
        event["user_id"] = user_id;
        event["email"] = email;
        event["timestamp"] = std::time(nullptr);
        event["status_code"] = status_code;
        
        for (const auto& [key, value] : extra_data) {
            event[key] = value;
        }
        
        kafka::getProducer().produce("auth-events", event);
        
        std::string status = (status_code >= 200 && status_code < 300) ? "SUCCESS" : "FAILED";
        std::cout << "[Kafka] " << event_type << " (" << status << ") user=" << email << std::endl;
        
    } catch (const std::exception& e) {
        std::cerr << "[Kafka] Error emitting event: " << e.what() << std::endl;
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

        // Production origin (set via APP_DOMAIN_PROD env var)
        if (origin == prodDomain) return origin;

        // Dev origins: localhost on any port
        if (origin.find("http://localhost:") == 0) return origin;
        if (origin.find("http://127.0.0.1:") == 0) return origin;
    }
    return prodDomain;
}

void addCorsHeaders(http::response<http::string_body>& res, 
                    const http::request<http::string_body>& req) {
    res.set(http::field::access_control_allow_origin, getAllowedOrigin(req));
    res.set(http::field::access_control_allow_methods, "GET, POST, PUT, DELETE, OPTIONS");
    res.set(http::field::access_control_allow_headers, "Content-Type, Authorization");
    res.set(http::field::access_control_allow_credentials, "true");
}

// ============================================
// URL DECODE
// ============================================
std::string urlDecode(const std::string& encoded) {
    std::string decoded;
    for (std::size_t i = 0; i < encoded.size(); ++i) {
        if (encoded[i] == '%' && i + 2 < encoded.size()) {
            unsigned int value;
            std::stringstream ss;
            ss << std::hex << encoded.substr(i + 1, 2);
            ss >> value;
            decoded += static_cast<char>(value);
            i += 2;
        } else if (encoded[i] == '+') {
            decoded += ' ';
        } else {
            decoded += encoded[i];
        }
    }
    return decoded;
}

// URL ENCODE
// ============================================
std::string urlEncode(const std::string& value) {
    std::ostringstream escaped;
    escaped.fill('0');
    for (char c : value) {
        if (std::isalnum(static_cast<unsigned char>(c)) ||
            c == '-' || c == '_' || c == '.' || c == '~') {
            escaped << c;
        } else {
            escaped << std::hex << std::uppercase;
            escaped << '%' << std::setw(2) << int(static_cast<unsigned char>(c));
            escaped << std::nouppercase << std::dec;
        }
    }
    return escaped.str();
}

// ============================================
// CLOUDINARY HELPERS (SHA256)
// ============================================
std::string generateCloudinarySignature(const std::string& toSign) {
    unsigned char hash[EVP_MAX_MD_SIZE];
    unsigned int hashLen = 0;
    
    EVP_MD_CTX* ctx = EVP_MD_CTX_new();
    if (!ctx) {
        std::cerr << "[Cloudinary] Failed to create EVP_MD_CTX" << std::endl;
        return "";
    }
    
    if (EVP_DigestInit_ex(ctx, EVP_sha256(), nullptr) != 1 ||
        EVP_DigestUpdate(ctx, toSign.c_str(), toSign.size()) != 1 ||
        EVP_DigestFinal_ex(ctx, hash, &hashLen) != 1) {
        std::cerr << "[Cloudinary] SHA256 digest failed" << std::endl;
        EVP_MD_CTX_free(ctx);
        return "";
    }
    
    EVP_MD_CTX_free(ctx);
    
    std::stringstream signature;
    for (unsigned int i = 0; i < hashLen; i++) {
        signature << std::hex << std::setw(2) << std::setfill('0') << (int)hash[i];
    }
    
    return signature.str();
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
    static size_t WriteCallback(void* contents, size_t size, size_t nmemb, std::string* userp) {
        userp->append((char*)contents, size * nmemb);
        return size * nmemb;
    }
    
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
        res.set(http::field::server, "Auth Service");
        addCorsHeaders(res, req_);
        res.set(http::field::content_type, "application/json");

        {
            // Prefer real client IP for rate limiting (works behind Cloudflare)
            std::string rateKey = getClientIp(req_);
            if (rateKey.empty()) rateKey = extractToken(req_);
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
            
            // ============================================
            // ROUTING
            // ============================================
            if (req_.method() == http::verb::post && target == "/users/register") {
                handle_register(res);
            }
            else if (req_.method() == http::verb::post && target == "/auth/login") {
                handle_login(res);
            }
            else if (req_.method() == http::verb::post && target == "/auth/logout") {
                handle_logout(res);
            }
            else if (req_.method() == http::verb::get && target == "/users/me") {
                handle_get_me(res);
            }
            else if (req_.method() == http::verb::get && target.find("/users/by-email/") == 0) {
                handle_get_user_by_email(res);
            }
            else if (req_.method() == http::verb::get && target.find("/users/by-username/") == 0) {
                handle_get_user_by_username(res);
            }
            else if (req_.method() == http::verb::put && target == "/users/update") {
                handle_update_me(res);
            }
            else if (req_.method() == http::verb::delete_ && target == "/users/delete") {
                handle_delete_me(res);
            }
            else if (req_.method() == http::verb::post && target == "/users/follow") {
                handle_follow_user(res);
            }
            else if (req_.method() == http::verb::post && target == "/users/unfollow") {
                handle_unfollow_user(res);
            }
            else if (req_.method() == http::verb::get && target == "/users") {
                handle_get_all_users(res);
            }
            else if (req_.method() == http::verb::post && target == "/auth/refresh") {
                handle_refresh_token(res);
            }
            else if (req_.method() == http::verb::get && target == "/auth/google") {
                handle_google_login(res);
            }
            else if (req_.method() == http::verb::get && target.find("/auth/google/callback") == 0) {
                handle_google_callback(res);
            }
            else if (req_.method() == http::verb::get && target == "/clients") {
                handle_get_clients(res);
            }
            else if (req_.method() == http::verb::get && target == "/roles") {
                handle_get_roles(res);
            }
            else if (req_.method() == http::verb::post && target == "/cache/invalidate") {
                handle_invalidate_cache(res);
            }
            else if (req_.method() == http::verb::post && target == "/auth/forgot-password") {
                handle_forgot_password(res);
            }
            else if (req_.method() == http::verb::post && target == "/auth/verify-reset-token") {
                handle_verify_reset_token(res);
            }
            else if (req_.method() == http::verb::post && target == "/auth/reset-password") {
                handle_reset_password(res);
            }
            else if (req_.method() == http::verb::get && target == "/health") {
                json::object response;
                response["status"] = "ok";
                response["service"] = "auth";
                response["redis"] = redis::RedisClient::getInstance().isConnected();
                res.body() = json::serialize(response);
            }
            else {
                res.result(http::status::not_found);
                res.body() = json::serialize(json::object{{"error", "Not Found"}});
            }
            
        } catch (const std::exception& e) {
            res.result(http::status::internal_server_error);
            res.body() = json::serialize(json::object{{"error", "Internal server error"}});
        }
        
        res.prepare_payload();
        write_response(res);
    }
    
    // ============================================
    // HANDLERS (CORREGIDOS)
    // ============================================
    
    void handle_invalidate_cache(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid || userInfo.postgresId.empty()) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido o usuario no identificado"}});
            return;
        }
        
        // ✅ Usar prefijos auth: en lugar de user:
        UserService::getInstance().invalidateUserCache(userInfo.postgresId);
        UserService::getInstance().invalidateUserCacheByEmail(userInfo.email);
        
        res.result(http::status::ok);
        res.body() = json::serialize(json::object{{"message", "Cache invalidado exitosamente"}});
    }
    
    static std::string generateResetToken() {
        unsigned char buf[32];
        RAND_bytes(buf, sizeof(buf));
        std::stringstream ss;
        for (int i = 0; i < 32; ++i)
            ss << std::hex << std::setw(2) << std::setfill('0') << (int)buf[i];
        return ss.str();
    }

    void handle_forgot_password(http::response<http::string_body>& res) {
        try {
            json::value jv = json::parse(req_.body());
            std::string email = std::string(jv.as_object().at("email").as_string());

            if (email.empty()) {
                res.result(http::status::bad_request);
                res.body() = json::serialize(json::object{{"error", "Email is required"}});
                return;
            }

            // Cloudflare Turnstile bot verification
            std::string turnstileToken;
            auto& obj = jv.as_object();
            if (obj.contains("turnstileToken")) {
                turnstileToken = std::string(obj.at("turnstileToken").as_string());
            }
            {
                auto turnstileResult = security::verifyTurnstile(turnstileToken, getClientIp(req_));
                if (!turnstileResult.success) {
                    res.result(http::status::forbidden);
                    res.body() = json::serialize(json::object{
                        {"error", "Bot verification failed"},
                        {"detail", turnstileResult.errorCodes}
                    });
                    return;
                }
            }

            std::string keycloakId = keycloakClient->getUserIdByEmail(email);
            if (keycloakId.empty()) {
                res.result(http::status::not_found);
                res.body() = json::serialize(json::object{{"error", "No account found with that email address"}});
                return;
            }

            auto& redis = redis::RedisClient::getInstance();

            // Rate-limit: one active reset token per user at a time
            if (redis.exists("reset:active:" + keycloakId)) {
                res.result(http::status::too_many_requests);
                res.body() = json::serialize(json::object{{"error", "A password reset link has already been sent. Please check your inbox or wait before requesting a new one."}});
                return;
            }

            // Generate a random reset token and store it in Redis (12h TTL)
            std::string token = generateResetToken();
            json::object tokenData;
            tokenData["email"] = email;
            tokenData["keycloakId"] = keycloakId;
            redis.set("reset:" + token, json::serialize(tokenData), 43200);
            // Track that this user has an active token
            redis.set("reset:active:" + keycloakId, token, 43200);

            // Build the reset link pointing to our frontend (NOT Keycloak)
            std::string appFrontend = std::getenv("APP_FRONTEND_URL") ? std::getenv("APP_FRONTEND_URL") : "http://127.0.0.1:5173";
            std::string resetLink = appFrontend + "/reset-password?token=" + token;

            // Send styled email via Resend API
            std::string resendKey = std::getenv("RESEND_API_KEY") ? std::getenv("RESEND_API_KEY") : "";
            if (!resendKey.empty()) {
                CURL* curl = curl_easy_init();
                if (curl) {
                    std::string emailHtml = R"HTML(
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0f;padding:40px 0">
<tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:24px;overflow:hidden">
  <tr><td style="padding:32px 32px 0">
    <h1 style="font-size:22px;font-weight:600;color:#f1f1f3;margin:0 0 12px">Reset your password</h1>
    <p style="font-size:14px;color:#8b8b94;line-height:1.6;margin:0 0 24px">Someone requested a password reset for your Yung Accountant account. Click the button below to choose a new password.</p>
    <table cellpadding="0" cellspacing="0"><tr><td align="center" style="background:#7c3aed;border-radius:12px">
      <a href=")HTML" + resetLink + R"HTML(" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none">Reset your password</a>
    </td></tr></table>
    <p style="font-size:12px;color:#54545c;margin:20px 0 0;line-height:1.5">Or copy and paste this link into your browser:<br><span style="color:#8b8b94">)HTML" + resetLink + R"HTML(</span></p>
  </td></tr>
  <tr><td style="padding:24px 32px 32px;border-top:1px solid rgba(255,255,255,0.05);margin-top:24px">
    <p style="font-size:11px;color:#54545c;line-height:1.5;margin:0">This link expires in 12 hours. If you didn't request a password reset, you can safely ignore this email.</p>
    <p style="font-size:11px;color:#54545c;margin:16px 0 0">— Yung Accountant</p>
  </td></tr>
</table>
</td></tr></table>
</body>
</html>
)HTML";

                    json::object emailBody;
                    emailBody["from"] = "Yung Accountant <noreply@yung-accountant.com>";
                    json::array to;
                    to.push_back(json::value(email));
                    emailBody["to"] = to;
                    emailBody["subject"] = "Reset your password";
                    emailBody["html"] = emailHtml;

                    std::string emailJson = json::serialize(emailBody);
                    struct curl_slist* hdrs = nullptr;
                    hdrs = curl_slist_append(hdrs, "Content-Type: application/json");
                    hdrs = curl_slist_append(hdrs, ("Authorization: Bearer " + resendKey).c_str());
                    curl_easy_setopt(curl, CURLOPT_URL, "https://api.resend.com/emails");
                    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, emailJson.c_str());
                    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, hdrs);
                    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 10L);
                    curl_easy_perform(curl);
                    long httpCode = 0;
                    curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &httpCode);
                    curl_slist_free_all(hdrs);
                    curl_easy_cleanup(curl);

                    if (httpCode != 200 && httpCode != 201) {
                        std::cerr << "[Resend] Email send failed: HTTP " << httpCode << std::endl;
                        redis.del("reset:" + token);
                        redis.del("reset:active:" + keycloakId);
                        res.result(http::status::internal_server_error);
                        res.body() = json::serialize(json::object{{"error", "Failed to send reset email. Please try again later."}});
                        return;
                    }
                }
            }

            res.result(http::status::ok);
            json::object resp;
            resp["message"] = "Password reset email sent. Check your inbox.";
            res.body() = json::serialize(resp);

        } catch (const std::exception& e) {
            res.result(http::status::bad_request);
            res.body() = json::serialize(json::object{{"error", "Internal server error"}});
        }
    }

    void handle_verify_reset_token(http::response<http::string_body>& res) {
        try {
            json::value jv = json::parse(req_.body());
            std::string token = std::string(jv.as_object().at("token").as_string());

            if (token.empty()) {
                res.result(http::status::bad_request);
                res.body() = json::serialize(json::object{{"valid", false}, {"error", "Token is required"}});
                return;
            }

            auto& redis = redis::RedisClient::getInstance();
            auto data = redis.get("reset:" + token);
            if (!data) {
                res.result(http::status::ok);
                res.body() = json::serialize(json::object{{"valid", false}, {"error", "Token is invalid or has expired"}});
                return;
            }

            auto jvData = json::parse(*data);
            std::string email = std::string(jvData.as_object().at("email").as_string());
            res.result(http::status::ok);
            res.body() = json::serialize(json::object{{"valid", true}, {"email", email}});

        } catch (const std::exception& e) {
            res.result(http::status::bad_request);
            res.body() = json::serialize(json::object{{"valid", false}, {"error", "Internal server error"}});
        }
    }

    void handle_reset_password(http::response<http::string_body>& res) {
        try {
            json::value jv = json::parse(req_.body());
            std::string token = std::string(jv.as_object().at("token").as_string());
            std::string newPassword = std::string(jv.as_object().at("newPassword").as_string());

            if (token.empty() || newPassword.empty()) {
                res.result(http::status::bad_request);
                res.body() = json::serialize(json::object{{"error", "Token and newPassword are required"}});
                return;
            }

            if (newPassword.length() < 8) {
                res.result(http::status::bad_request);
                res.body() = json::serialize(json::object{{"error", "Password must be at least 8 characters"}});
                return;
            }

            auto& redis = redis::RedisClient::getInstance();
            auto data = redis.get("reset:" + token);
            if (!data) {
                res.result(http::status::bad_request);
                res.body() = json::serialize(json::object{{"error", "Token is invalid or has expired"}});
                return;
            }

            auto jvData = json::parse(*data);
            std::string keycloakId = std::string(jvData.as_object().at("keycloakId").as_string());

            // Reset password in Keycloak via admin API
            std::string adminToken = keycloakClient->getAdminToken();
            if (adminToken.empty()) {
                res.result(http::status::internal_server_error);
                res.body() = json::serialize(json::object{{"error", "Internal server error"}});
                return;
            }

            const char* realm = std::getenv("KEYCLOAK_REALM");
            std::string r = realm ? realm : "yung-accountant";
            json::object resetBody;
            resetBody["type"] = "password";
            resetBody["value"] = newPassword;
            resetBody["temporary"] = false;
            std::string resetJson = json::serialize(resetBody);
            std::string result = keycloakClient->httpPut(
                "/admin/realms/" + r + "/users/" + keycloakId + "/reset-password",
                resetJson, adminToken);

            if (result.empty()) {
                res.result(http::status::internal_server_error);
                res.body() = json::serialize(json::object{{"error", "Failed to reset password"}});
                return;
            }

            // Delete the token so it can't be reused
            redis.del("reset:" + token);

            res.result(http::status::ok);
            res.body() = json::serialize(json::object{{"message", "Password has been reset successfully"}});

        } catch (const std::exception& e) {
            res.result(http::status::bad_request);
            res.body() = json::serialize(json::object{{"error", "Internal server error"}});
        }
    }

    void handle_get_me(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid || userInfo.postgresId.empty()) {
            int status_code = static_cast<int>(http::status::unauthorized);
            res.result(status_code);
            res.body() = json::serialize(json::object{{"error", "Token inválido o usuario no identificado"}});
            emitAuthEvent("get_profile_failed", "", "", status_code, {{"reason", "invalid_token"}});
            return;
        }
        
        auto userOpt = UserService::getInstance().getUserByEmail(userInfo.email);
        
        if (userOpt) {
            json::object obj;
            obj["id"] = userOpt->id;
            obj["email"] = userOpt->email;
            obj["firstName"] = userOpt->firstName;
            obj["lastName"] = userOpt->lastName;
            obj["age"] = userOpt->age;
            obj["clientId"] = userOpt->clientId;
            obj["role"] = userOpt->role;
            obj["bio"] = userOpt->bio;
            obj["location"] = userOpt->location;
            obj["website"] = userOpt->website;
            obj["profilePic"] = userOpt->profilePic.empty() ? nullptr : json::value(userOpt->profilePic);
            obj["displayName"] = userOpt->displayName.empty() ? 
                                userOpt->firstName + " " + userOpt->lastName : 
                                userOpt->displayName;
            obj["username"] = userOpt->username.empty() ? 
                            userOpt->email.substr(0, userOpt->email.find('@')) : 
                            userOpt->username;
            obj["plan"] = userOpt->plan;
            obj["followers"] = json::array(userOpt->followers.begin(), userOpt->followers.end());
            obj["following"] = json::array(userOpt->following.begin(), userOpt->following.end());
            obj["createdAt"] = userOpt->createdAt;
            obj["updatedAt"] = userOpt->updatedAt;
            
            res.body() = json::serialize(obj);
            emitAuthEvent("get_profile_success", userOpt->id, userInfo.email, 200);
        } else {
            int status_code = static_cast<int>(http::status::not_found);
            res.result(status_code);
            res.body() = json::serialize(json::object{{"error", "Usuario no encontrado"}});
            emitAuthEvent("get_profile_failed", "", userInfo.email, status_code, {{"reason", "user_not_found"}});
        }
    }
    
    void handle_register(http::response<http::string_body>& res) {
        try {
            json::value jv = json::parse(req_.body());
            json::object& obj = jv.as_object();
            
            std::string email = std::string(obj.at("email").as_string());
            std::string password = std::string(obj.at("password").as_string());
            std::string firstName = std::string(obj.at("firstName").as_string());
            std::string lastName = std::string(obj.at("lastName").as_string());
            int age = obj.at("age").as_int64();
            std::string clientId = std::string(obj.at("clientId").as_string());
            std::string role = std::string(obj.at("role").as_string());
            
            // Validar clientId
            if (clientId != "alcaldia-duitama" && 
                clientId != "alcaldia-sogamoso" && 
                clientId != "alcaldia-tunja") {
                int status_code = static_cast<int>(http::status::bad_request);
                res.result(status_code);
                res.body() = json::serialize(json::object{{"error", "clientId inválido"}});
                emitAuthEvent("registration_failed", "", email, status_code,
                             {{"reason", "invalid_client_id"}, {"clientId", clientId}});
                return;
            }
            
            // Validar role
            if (role != "ama-de-casa" && 
                role != "estudiante" && 
                role != "trabajador") {
                int status_code = static_cast<int>(http::status::bad_request);
                res.result(status_code);
                res.body() = json::serialize(json::object{{"error", "role inválido"}});
                emitAuthEvent("registration_failed", "", email, status_code,
                             {{"reason", "invalid_role"}, {"role", role}});
                return;
            }
            
            auto emailCheck = security::validateEmail(email);
            if (!emailCheck.valid) { json::object e; e["error"] = emailCheck.error; res.result(http::status::bad_request); res.body() = json::serialize(e); return; }
            auto nameCheck = security::validateString("Name", firstName, 1, 100);
            if (!nameCheck.valid) { json::object e; e["error"] = nameCheck.error; res.result(http::status::bad_request); res.body() = json::serialize(e); return; }
            auto ageCheck = security::validateAge(age);
            if (!ageCheck.valid) { json::object e; e["error"] = ageCheck.error; res.result(http::status::bad_request); res.body() = json::serialize(e); return; }

            // Cloudflare Turnstile bot verification
            std::string turnstileToken;
            if (obj.contains("turnstileToken")) {
                turnstileToken = std::string(obj.at("turnstileToken").as_string());
            }
            {
                auto turnstileResult = security::verifyTurnstile(turnstileToken, getClientIp(req_));
                if (!turnstileResult.success) {
                    int status_code = static_cast<int>(http::status::forbidden);
                    res.result(status_code);
                    res.body() = json::serialize(json::object{
                        {"error", "Bot verification failed"},
                        {"detail", turnstileResult.errorCodes}
                    });
                    emitAuthEvent("registration_failed", "", email, status_code,
                                 {{"reason", "turnstile_failed"}, {"detail", turnstileResult.errorCodes}});
                    return;
                }
            }

            // Verificar email en PostgreSQL
            auto existingUser = UserService::getInstance().getUserByEmail(email);
            if (existingUser) {
                int status_code = static_cast<int>(http::status::conflict);
                res.result(status_code);
                res.body() = json::serialize(json::object{{"error", "El correo ya está registrado"}});
                emitAuthEvent("registration_failed", "", email, status_code,
                             {{"reason", "email_already_exists"}});
                return;
            }
            
            // Parse keycloakId — present when user was created by Google
            // brokering (google-auto-create flow) but not yet in PostgreSQL.
            std::string preExistingKeycloakId;
            if (obj.contains("keycloakId")) {
                preExistingKeycloakId = std::string(obj.at("keycloakId").as_string());
            }

            // Verificar email en Keycloak
            std::string existingKeycloakId = keycloakClient->getUserIdByEmail(email);
            if (!existingKeycloakId.empty() && preExistingKeycloakId.empty()) {
                // Email exists in Keycloak but we didn't just create it via brokering —
                // this is a genuine duplicate.
                int status_code = static_cast<int>(http::status::conflict);
                res.result(status_code);
                res.body() = json::serialize(json::object{{"error", "El correo ya está registrado en Keycloak"}});
                emitAuthEvent("registration_failed", "", email, status_code,
                             {{"reason", "email_already_exists_in_keycloak"}});
                return;
            }

            // Use the pre-existing Keycloak ID if available, otherwise it will
            // be set after Keycloak user creation below.
            std::string keycloakId = preExistingKeycloakId;
            
            // Crear en PostgreSQL
            user::User user;
            user.email = email;
            user.firstName = firstName;
            user.lastName = lastName;
            user.age = age;
            user.clientId = clientId;
            user.role = role;
            
            auto t = std::time(nullptr);
            user.createdAt = std::ctime(&t);
            user.createdAt.pop_back();
            
            std::string postgresId;
            bool pgOk = UserService::getInstance().createUser(user, postgresId);
            
            if (!pgOk) {
                int status_code = static_cast<int>(http::status::internal_server_error);
                res.result(status_code);
                res.body() = json::serialize(json::object{{"error", "Error guardando usuario en PostgreSQL"}});
                emitAuthEvent("registration_failed", "", email, status_code, {{"reason", "postgresql_error"}});
                return;
            }
            
            // Registrar / actualizar en Keycloak
            bool keycloakOk;
            if (!keycloakId.empty()) {
                // User was already created in Keycloak by the Google brokering flow.
                // Update the existing user with password, attributes, and postgresId.
                keycloakOk = keycloakClient->updateUserAttributes(
                    keycloakId, firstName, lastName, age, clientId, role, postgresId);
                if (keycloakOk) {
                    // Set password on the existing Keycloak user
                    std::string adminToken = keycloakClient->getAdminToken();
                    if (!adminToken.empty()) {
                        json::object cred;
                        cred["type"] = "password";
                        cred["value"] = password;
                        cred["temporary"] = false;
                        json::array creds;
                        creds.push_back(cred);
                        json::object resetObj;
                        resetObj["credentials"] = creds;
                        std::string resetJson = json::serialize(resetObj);
                        keycloakClient->httpPut(
                            "/admin/realms/" + std::string(std::getenv("KEYCLOAK_REALM") ? std::getenv("KEYCLOAK_REALM") : "yung-accountant")
                            + "/users/" + keycloakId, resetJson, adminToken);
                    }
                    // Assign role
                    std::string clientUuid = keycloakClient->getClientUuid(clientId, adminToken);
                    std::string roleUuid = keycloakClient->getRoleUuid(clientUuid, role, adminToken);
                    if (!clientUuid.empty() && !roleUuid.empty()) {
                        keycloakClient->assignRole(keycloakId, clientUuid, roleUuid, adminToken);
                    }
                }
                // Update keycloakId in PostgreSQL
                UserService::getInstance().updateKeycloakId(postgresId, keycloakId);
            } else {
                // New user — create in Keycloak from scratch
                std::string newKeycloakId;
                keycloakOk = keycloakClient->registerUser(
                    email, password, firstName, lastName, age, clientId, role, postgresId, newKeycloakId);
                if (keycloakOk) {
                    keycloakId = newKeycloakId;
                    UserService::getInstance().updateKeycloakId(postgresId, keycloakId);
                }
            }

            if (!keycloakOk) {
                UserService::getInstance().deleteUser(postgresId); // Rollback
                int status_code = static_cast<int>(http::status::internal_server_error);
                res.result(status_code);
                res.body() = json::serialize(json::object{{"error", "Error registrando usuario en Keycloak"}});
                emitAuthEvent("registration_failed", postgresId, email, status_code, {{"reason", "keycloak_error"}});
                return;
            }

            // Link Google identity provider if registering via Google
            std::string googleIdToken;
            if (obj.contains("googleIdToken")) {
                googleIdToken = std::string(obj.at("googleIdToken").as_string());
            }
            if (!googleIdToken.empty()) {
                // Parse Google sub from id_token JWT
                std::string googleSub;
                try {
                    size_t d1 = googleIdToken.find('.');
                    size_t d2 = googleIdToken.find('.', d1 + 1);
                    if (d1 != std::string::npos && d2 != std::string::npos) {
                        std::string payload = googleIdToken.substr(d1 + 1, d2 - d1 - 1);
                        // URL-safe base64 → standard base64 → decode
                        for (char& c : payload) { if (c == '-') c = '+'; if (c == '_') c = '/'; }
                        while (payload.size() % 4) payload += '=';
                        // Decode (simple approach — assume ASCII JSON)
                        std::string decoded;
                        decoded.reserve(payload.size());
                        int val = 0, valb = -8;
                        for (char c : payload) {
                            if (c == '=') break;
                            if (c >= 'A' && c <= 'Z') val = (val << 6) | (c - 'A');
                            else if (c >= 'a' && c <= 'z') val = (val << 6) | (c - 'a' + 26);
                            else if (c >= '0' && c <= '9') val = (val << 6) | (c - '0' + 52);
                            else if (c == '+') val = (val << 6) | 62;
                            else if (c == '/') val = (val << 6) | 63;
                            valb += 6;
                            if (valb >= 0) { decoded += (char)((val >> valb) & 0xFF); valb -= 8; }
                        }
                        auto jv = json::parse(decoded);
                        googleSub = std::string(jv.as_object().at("sub").as_string());
                    }
                } catch (...) {}

                if (!googleSub.empty()) {
                    // Get Keycloak admin token
                    const char* kcU = std::getenv("KEYCLOAK_URL");
                    const char* kcR = std::getenv("KEYCLOAK_REALM");
                    const char* admU = std::getenv("KEYCLOAK_ADMIN_USER");
                    const char* admP = std::getenv("KEYCLOAK_ADMIN_PASSWORD");
                    std::string base = kcU ? kcU : "http://keycloak:8080";
                    std::string rlm = kcR ? kcR : "yung-accountant";

                    CURL* lc = curl_easy_init();
                    if (lc) {
                        std::string aBody = "client_id=admin-cli&grant_type=password&username="
                            + std::string(admU ? admU : "") + "&password=" + std::string(admP ? admP : "");
                        std::string aResp;
                        struct curl_slist* h = nullptr;
                        h = curl_slist_append(h, "Content-Type: application/x-www-form-urlencoded");
                        curl_easy_setopt(lc, CURLOPT_URL, (base + "/realms/master/protocol/openid-connect/token").c_str());
                        curl_easy_setopt(lc, CURLOPT_POSTFIELDS, aBody.c_str());
                        curl_easy_setopt(lc, CURLOPT_HTTPHEADER, h);
                        curl_easy_setopt(lc, CURLOPT_WRITEFUNCTION, curlWriteCallback);
                        curl_easy_setopt(lc, CURLOPT_WRITEDATA, &aResp);
                        curl_easy_setopt(lc, CURLOPT_TIMEOUT, 10L);
                        curl_easy_perform(lc);
                        curl_slist_free_all(h);

                        std::string admToken;
                        try { admToken = std::string(json::parse(aResp).as_object().at("access_token").as_string()); } catch (...) {}

                        if (!admToken.empty()) {
                            std::string linkUrl = base + "/admin/realms/" + rlm
                                + "/users/" + keycloakId + "/federated-identity/google";
                            std::string linkBody = "{\"identityProvider\":\"google\","
                                "\"userId\":\"" + googleSub + "\","
                                "\"userName\":\"" + email + "\"}";

                            struct curl_slist* h2 = nullptr;
                            h2 = curl_slist_append(h2, "Content-Type: application/json");
                            h2 = curl_slist_append(h2, ("Authorization: Bearer " + admToken).c_str());
                            curl_easy_setopt(lc, CURLOPT_URL, linkUrl.c_str());
                            curl_easy_setopt(lc, CURLOPT_POSTFIELDS, linkBody.c_str());
                            curl_easy_setopt(lc, CURLOPT_HTTPHEADER, h2);
                            curl_easy_setopt(lc, CURLOPT_TIMEOUT, 10L);
                            std::string linkResp;
                            curl_easy_setopt(lc, CURLOPT_WRITEDATA, &linkResp);
                            CURLcode lr = curl_easy_perform(lc);
                            curl_slist_free_all(h2);

                            if (lr == CURLE_OK)
                                std::cout << "[Google] Identity linked: " << googleSub << " → " << keycloakId << std::endl;
                            else
                                std::cerr << "[Google] Link failed: " << curl_easy_strerror(lr) << std::endl;
                        }
                        curl_easy_cleanup(lc);
                    }
                }
            }

            int status_code = static_cast<int>(http::status::created);
            res.result(status_code);
            json::object response;
            response["message"] = "Usuario registrado exitosamente";
            response["userId"] = postgresId;
            response["keycloakId"] = keycloakId;
            response["email"] = email;
            response["firstName"] = firstName;
            response["lastName"] = lastName;
            response["clientId"] = clientId;
            response["role"] = role;
            res.body() = json::serialize(response);
            
            emitAuthEvent("user_registered", postgresId, email, status_code,
                        {{"clientId", clientId}, {"role", role}, {"age", age}});
            
        } catch (const std::exception& e) {
            int status_code = static_cast<int>(http::status::bad_request);
            res.result(status_code);
            res.body() = json::serialize(json::object{{"error", "Internal server error"}});
            emitAuthEvent("registration_failed", "", "", status_code,
                         {{"reason", "bad_request"}, {"error", "Internal server error"}});
        }
    }
    
    void handle_login(http::response<http::string_body>& res) {
        try {
            json::value jv = json::parse(req_.body());
            json::object& obj = jv.as_object();
            
            std::string email = std::string(obj.at("email").as_string());
            std::string password = std::string(obj.at("password").as_string());
            
            if (email.empty() || password.empty()) {
                int status_code = static_cast<int>(http::status::bad_request);
                res.result(status_code);
                res.body() = json::serialize(json::object{{"error", "Email y password requeridos"}});
                emitAuthEvent("login_failed", "", email, status_code, {{"reason", "missing_credentials"}});
                return;
            }

            // Cloudflare Turnstile bot verification
            std::string turnstileToken;
            if (obj.contains("turnstileToken")) {
                turnstileToken = std::string(obj.at("turnstileToken").as_string());
            }
            auto turnstileResult = security::verifyTurnstile(turnstileToken, getClientIp(req_));
            if (!turnstileResult.success) {
                int status_code = static_cast<int>(http::status::forbidden);
                res.result(status_code);
                res.body() = json::serialize(json::object{
                    {"error", "Bot verification failed"},
                    {"detail", turnstileResult.errorCodes}
                });
                emitAuthEvent("login_failed", "", email, status_code,
                             {{"reason", "turnstile_failed"}, {"detail", turnstileResult.errorCodes}});
                return;
            }

            auto userOpt = UserService::getInstance().getUserByEmail(email);
            
            if (!userOpt) {
                int status_code = static_cast<int>(http::status::not_found);
                res.result(status_code);
                res.body() = json::serialize(json::object{{"error", "Usuario no registrado"}});
                emitAuthEvent("login_failed", "", email, status_code, {{"reason", "user_not_found"}});
                return;
            }
            
            std::string clientId = userOpt->clientId;
            std::string refreshToken;
            std::string token = keycloakClient->login(email, password, clientId, refreshToken);
            
            if (token.empty()) {
                int status_code = static_cast<int>(http::status::unauthorized);
                res.result(status_code);
                res.body() = json::serialize(json::object{{"error", "Credenciales inválidas"}});
                emitAuthEvent("login_failed", userOpt->id, email, status_code,
                             {{"reason", "invalid_credentials"}});
                return;
            }
            
            int status_code = static_cast<int>(http::status::ok);
            res.result(status_code);

            // Set HttpOnly cookie for access_token (XSS protection)
            // Refresh token in body only — frontend manages it for proactive refresh
            setCookie(res, "access_token", token, 1800, true);
            setCookie(res, "refresh_token", refreshToken, 5184000, false);

            // Return tokens in body — frontend uses refreshToken for proactive refresh
            json::object response;
            response["token"] = token;
            response["refreshToken"] = refreshToken;
            response["userId"] = userOpt->id;
            response["email"] = userOpt->email;
            response["firstName"] = userOpt->firstName;
            response["lastName"] = userOpt->lastName;
            response["clientId"] = userOpt->clientId;
            response["role"] = userOpt->role;
            res.body() = json::serialize(response);

            emitAuthEvent("login_success", userOpt->id, email, status_code,
                         {{"clientId", userOpt->clientId}, {"role", userOpt->role}});
            
        } catch (const std::exception& e) {
            int status_code = static_cast<int>(http::status::bad_request);
            res.result(status_code);
            res.body() = json::serialize(json::object{{"error", "Internal server error"}});
            emitAuthEvent("login_failed", "", "", status_code,
                         {{"reason", "bad_request"}, {"error", "Internal server error"}});
        }
    }
    
    void handle_update_me(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid || userInfo.postgresId.empty()) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            return;
        }
        
        try {
            json::value jv = json::parse(req_.body());
            json::object& obj = jv.as_object();
            
            auto userOpt = UserService::getInstance().getUserByEmail(userInfo.email);
            if (!userOpt) {
                res.result(http::status::not_found);
                res.body() = json::serialize(json::object{{"error", "Usuario no encontrado"}});
                return;
            }
            
            user::User updatedUser = *userOpt;
            bool roleChanged = false;
            bool clientChanged = false;
            
            if (obj.contains("firstName")) updatedUser.firstName = std::string(obj.at("firstName").as_string());
            if (obj.contains("lastName")) updatedUser.lastName = std::string(obj.at("lastName").as_string());
            if (obj.contains("age")) updatedUser.age = obj.at("age").as_int64();
            if (obj.contains("bio")) updatedUser.bio = security::sanitize(std::string(obj.at("bio").as_string()), 500);
            if (obj.contains("location")) updatedUser.location = security::sanitize(std::string(obj.at("location").as_string()), 100);
            if (obj.contains("website")) updatedUser.website = security::sanitize(std::string(obj.at("website").as_string()), 200);
            
            if (obj.contains("clientId")) {
                std::string newClient = std::string(obj.at("clientId").as_string());
                if (newClient != userOpt->clientId) {
                    clientChanged = true;
                    updatedUser.clientId = newClient;
                }
            }
            if (obj.contains("role")) {
                std::string newRole = std::string(obj.at("role").as_string());
                if (newRole != userOpt->role) {
                    roleChanged = true;
                    updatedUser.role = newRole;
                }
            }
            
            // ✅ SHA256 para Cloudinary
            if (obj.contains("profilePic")) {
                std::string newPic = std::string(obj.at("profilePic").as_string());
                
                if (newPic.find("data:image") == 0 || newPic.find("/9j/") == 0 || newPic.size() > 1000) {
                    // Borrar imagen anterior
                    if (!userOpt->profilePic.empty() && userOpt->profilePic.find("cloudinary.com") != std::string::npos) {
                        std::string oldUrl = userOpt->profilePic;
                        size_t uploadPos = oldUrl.find("/upload/");
                        if (uploadPos != std::string::npos) {
                            size_t versionStart = oldUrl.find("/v", uploadPos);
                            if (versionStart != std::string::npos) {
                                size_t publicIdStart = oldUrl.find("/", versionStart + 3);
                                if (publicIdStart == std::string::npos) publicIdStart = versionStart + 1;
                                else publicIdStart++;
                                
                                size_t dotPos = oldUrl.find(".", publicIdStart);
                                std::string publicId = oldUrl.substr(publicIdStart, dotPos - publicIdStart);
                                
                                std::string cloudName = std::getenv("CLOUDINARY_CLOUD_NAME") ? std::getenv("CLOUDINARY_CLOUD_NAME") : "";
                                std::string apiKey = std::getenv("CLOUDINARY_API_KEY") ? std::getenv("CLOUDINARY_API_KEY") : "";
                                std::string apiSecret = std::getenv("CLOUDINARY_API_SECRET") ? std::getenv("CLOUDINARY_API_SECRET") : "";
                                
                                if (!apiKey.empty() && !apiSecret.empty()) {
                                    long long timestamp = std::time(nullptr);
                                    std::string toSign = "public_id=" + publicId + "&timestamp=" + std::to_string(timestamp) + apiSecret;
                                    std::string signature = generateCloudinarySignature(toSign);
                                    
                                    std::string deleteUrl = "https://api.cloudinary.com/v1_1/" + cloudName + "/image/destroy";
                                    std::string deleteBody = "public_id=" + publicId + "&timestamp=" + std::to_string(timestamp) + "&api_key=" + apiKey + "&signature=" + signature + "&signature_algorithm=sha256";
                                    
                                    CURL* curl = curl_easy_init();
                                    if (curl) {
                                        std::string deleteResponse;
                                        curl_easy_setopt(curl, CURLOPT_URL, deleteUrl.c_str());
                                        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, deleteBody.c_str());
                                        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
                                        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &deleteResponse);
                                        curl_easy_setopt(curl, CURLOPT_TIMEOUT, 5L);
                                        curl_easy_perform(curl);
                                        curl_easy_cleanup(curl);
                                    }
                                }
                            }
                        }
                    }
                    
                    // Subir nueva imagen
                    std::string cloudName = std::getenv("CLOUDINARY_CLOUD_NAME") ? std::getenv("CLOUDINARY_CLOUD_NAME") : "";
                    std::string apiKey = std::getenv("CLOUDINARY_API_KEY") ? std::getenv("CLOUDINARY_API_KEY") : "";
                    std::string apiSecret = std::getenv("CLOUDINARY_API_SECRET") ? std::getenv("CLOUDINARY_API_SECRET") : "";
                    
                    if (!apiKey.empty() && !apiSecret.empty()) {
                        long long timestamp = std::time(nullptr);
                        std::string toSign = "folder=yung-accountant/profiles&timestamp=" + std::to_string(timestamp) + apiSecret;
                        std::string signature = generateCloudinarySignature(toSign);
                        
                        std::string uploadUrl = "https://api.cloudinary.com/v1_1/" + cloudName + "/image/upload";
                        
                        CURL* curl = curl_easy_init();
                        if (curl) {
                            curl_mime* mime = curl_mime_init(curl);
                            
                            curl_mimepart* part = curl_mime_addpart(mime);
                            curl_mime_name(part, "file");
                            curl_mime_data(part, newPic.c_str(), newPic.size());
                            curl_mime_filename(part, "profile.jpg");
                            
                            part = curl_mime_addpart(mime);
                            curl_mime_name(part, "api_key");
                            curl_mime_data(part, apiKey.c_str(), CURL_ZERO_TERMINATED);
                            
                            part = curl_mime_addpart(mime);
                            curl_mime_name(part, "timestamp");
                            curl_mime_data(part, std::to_string(timestamp).c_str(), CURL_ZERO_TERMINATED);
                            
                            part = curl_mime_addpart(mime);
                            curl_mime_name(part, "signature");
                            curl_mime_data(part, signature.c_str(), CURL_ZERO_TERMINATED);
                            
                            part = curl_mime_addpart(mime);
                            curl_mime_name(part, "signature_algorithm");
                            curl_mime_data(part, "sha256", CURL_ZERO_TERMINATED);
                            
                            part = curl_mime_addpart(mime);
                            curl_mime_name(part, "folder");
                            curl_mime_data(part, "yung-accountant/profiles", CURL_ZERO_TERMINATED);
                            
                            std::string responseStr;
                            curl_easy_setopt(curl, CURLOPT_URL, uploadUrl.c_str());
                            curl_easy_setopt(curl, CURLOPT_MIMEPOST, mime);
                            curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
                            curl_easy_setopt(curl, CURLOPT_WRITEDATA, &responseStr);
                            curl_easy_setopt(curl, CURLOPT_TIMEOUT, 15L);
                            
                            CURLcode res = curl_easy_perform(curl);
                            curl_mime_free(mime);
                            curl_easy_cleanup(curl);
                            
                            if (res == CURLE_OK) {
                                auto jvResponse = json::parse(responseStr);
                                if (jvResponse.as_object().contains("secure_url")) {
                                    updatedUser.profilePic = std::string(jvResponse.as_object().at("secure_url").as_string());
                                }
                            }
                        }
                    }
                } else {
                    updatedUser.profilePic = newPic;
                }
            }
            
            updatedUser.displayName = updatedUser.firstName + " " + updatedUser.lastName;
            
            bool pgOk = UserService::getInstance().updateFullProfile(userOpt->id, updatedUser);
            if (!pgOk) {
                res.result(http::status::internal_server_error);
                res.body() = json::serialize(json::object{{"error", "Error actualizando"}});
                return;
            }
            
            bool keycloakOk = keycloakClient->updateUserAttributes(
                userOpt->keycloakId, updatedUser.firstName, updatedUser.lastName,
                updatedUser.age, updatedUser.clientId, updatedUser.role);
            
            bool keycloakRoleOk = true;
            if (roleChanged || clientChanged) {
                keycloakRoleOk = keycloakClient->updateUserRole(
                    userOpt->keycloakId, updatedUser.clientId, userOpt->role, updatedUser.role);
            }
            
            res.result(http::status::ok);
            json::object response;
            response["message"] = "Perfil actualizado";
            response["keycloakUpdated"] = keycloakOk && keycloakRoleOk;
            res.body() = json::serialize(response);
            
        } catch (const std::exception& e) {
            res.result(http::status::bad_request);
            res.body() = json::serialize(json::object{{"error", "Internal server error"}});
        }
    }
    
    void handle_delete_me(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid || userInfo.postgresId.empty()) {
            int status_code = static_cast<int>(http::status::unauthorized);
            res.result(status_code);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            emitAuthEvent("delete_account_failed", "", "", status_code, {{"reason", "invalid_token"}});
            return;
        }
        
        auto userOpt = UserService::getInstance().getUserByEmail(userInfo.email);
        if (!userOpt) {
            int status_code = static_cast<int>(http::status::not_found);
            res.result(status_code);
            res.body() = json::serialize(json::object{{"error", "Usuario no encontrado"}});
            emitAuthEvent("delete_account_failed", userInfo.postgresId, userInfo.email, status_code, {{"reason", "user_not_found"}});
            return;
        }
        
        bool keycloakOk = keycloakClient->deleteUser(userOpt->keycloakId);
        bool pgOk = UserService::getInstance().deleteUser(userOpt->id);
        
        if (pgOk && keycloakOk) {
            int status_code = static_cast<int>(http::status::ok);
            res.result(status_code);
            res.body() = json::serialize(json::object{{"message", "Usuario eliminado exitosamente"}});
            emitAuthEvent("user_deleted", userOpt->id, userInfo.email, status_code,
                         {{"clientId", userOpt->clientId}, {"role", userOpt->role}});
        } else {
            int status_code = static_cast<int>(http::status::internal_server_error);
            res.result(status_code);
            res.body() = json::serialize(json::object{{"error", "Error eliminando usuario"}});
            
            std::string reason = !keycloakOk ? "keycloak_delete_failed" : "postgresql_delete_failed";
            emitAuthEvent("delete_account_failed", userOpt->id, userInfo.email, status_code, {{"reason", reason}});
        }
    }
    
    void handle_logout(http::response<http::string_body>& res) {
        try {
            json::value jv = json::parse(req_.body());
            json::object& obj = jv.as_object();
            
            if (!obj.contains("refreshToken")) {
                res.result(http::status::bad_request);
                res.body() = json::serialize(json::object{{"error", "Se requiere refreshToken"}});
                return;
            }
            
            std::string refreshToken = std::string(obj.at("refreshToken").as_string());
            
            auto userInfo = verifyAndGetUser(req_);
            if (!userInfo.isValid || userInfo.postgresId.empty()) {
                int status_code = static_cast<int>(http::status::unauthorized);
                res.result(status_code);
                res.body() = json::serialize(json::object{{"error", "Token inválido"}});
                emitAuthEvent("logout_failed", "", "", status_code, {{"reason", "invalid_token"}});
                return;
            }
            
            bool logoutSuccess = keycloakClient->logout(refreshToken);
            bool sessionsClosed = keycloakClient->logoutAllSessions(userInfo.id);
            
            if (logoutSuccess || sessionsClosed) {
                // Invalidate Redis cache so stale data isn't served after logout
                UserService::getInstance().invalidateUserCache(userInfo.postgresId);
                UserService::getInstance().invalidateUserCacheByEmail(userInfo.email);
                std::cout << "[Logout] Cache invalidated for user: " << userInfo.email << std::endl;

                // Clear HttpOnly cookies
                clearCookie(res, "access_token");
                clearCookie(res, "refresh_token");

                int status_code = static_cast<int>(http::status::ok);
                res.result(status_code);
                json::object response;
                response["message"] = "Logout exitoso";
                response["refreshInvalidated"] = logoutSuccess;
                response["sessionsClosed"] = sessionsClosed;
                res.body() = json::serialize(response);
                emitAuthEvent("logout", userInfo.postgresId, userInfo.email, status_code,
                             {{"refreshInvalidated", logoutSuccess}, {"sessionsClosed", sessionsClosed}});
            } else {
                int status_code = static_cast<int>(http::status::internal_server_error);
                res.result(status_code);
                res.body() = json::serialize(json::object{{"error", "Error al cerrar sesión"}});
                emitAuthEvent("logout_failed", userInfo.postgresId, userInfo.email, status_code,
                             {{"reason", "keycloak_logout_failed"}});
            }
            
        } catch (const std::exception& e) {
            int status_code = static_cast<int>(http::status::bad_request);
            res.result(status_code);
            res.body() = json::serialize(json::object{{"error", "Internal server error"}});
            emitAuthEvent("logout_failed", "", "", status_code, {{"reason", "bad_request"}, {"error", "Internal server error"}});
        }
    }
    
    void handle_get_user_by_email(http::response<http::string_body>& res) {
        try {
            std::string target(req_.target().begin(), req_.target().end());
            std::string prefix = "/users/by-email/";
            std::string email = urlDecode(target.substr(prefix.length()));
            
            auto userOpt = UserService::getInstance().getUserByEmail(email);
            
            if (!userOpt) {
                res.result(http::status::not_found);
                res.body() = json::serialize(json::object{{"error", "Usuario no encontrado"}});
                return;
            }
            
            json::object obj;
            obj["id"] = userOpt->id;
            obj["email"] = userOpt->email;
            obj["firstName"] = userOpt->firstName;
            obj["lastName"] = userOpt->lastName;
            obj["age"] = userOpt->age;
            obj["clientId"] = userOpt->clientId;
            obj["role"] = userOpt->role;
            obj["bio"] = userOpt->bio;
            obj["location"] = userOpt->location;
            obj["website"] = userOpt->website;
            obj["profilePic"] = userOpt->profilePic.empty() ? nullptr : json::value(userOpt->profilePic);
            obj["displayName"] = userOpt->displayName;
            obj["username"] = userOpt->username;
            obj["followers"] = json::array(userOpt->followers.begin(), userOpt->followers.end());
            obj["following"] = json::array(userOpt->following.begin(), userOpt->following.end());
            obj["createdAt"] = userOpt->createdAt;
            
            res.result(http::status::ok);
            res.body() = json::serialize(obj);
            
        } catch (const std::exception& e) {
            res.result(http::status::bad_request);
            res.body() = json::serialize(json::object{{"error", "Internal server error"}});
        }
    }
    
    void handle_get_user_by_username(http::response<http::string_body>& res) {
        std::string target(req_.target().begin(), req_.target().end());
        std::string prefix = "/users/by-username/";
        std::string username = target.substr(prefix.length());
        
        auto userOpt = UserService::getInstance().getUserByUsername(username);
        
        if (!userOpt) {
            res.result(http::status::not_found);
            res.body() = json::serialize(json::object{{"error", "Usuario no encontrado"}});
            return;
        }
        
        json::object obj;
        obj["id"] = userOpt->id;
        obj["username"] = userOpt->username;
        obj["displayName"] = userOpt->displayName;
        obj["bio"] = userOpt->bio;
        obj["location"] = userOpt->location;
        obj["profilePic"] = userOpt->profilePic.empty() ? nullptr : json::value(userOpt->profilePic);
        obj["followersCount"] = static_cast<int>(userOpt->followers.size());
        obj["followingCount"] = static_cast<int>(userOpt->following.size());
        obj["postsCount"] = 0;
        obj["createdAt"] = userOpt->createdAt;
        obj["plan"] = userOpt->plan;
        
        res.result(http::status::ok);
        res.body() = json::serialize(obj);
    }
    
    void handle_follow_user(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid || userInfo.postgresId.empty()) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            return;
        }
        
        try {
            json::value jv = json::parse(req_.body());
            std::string targetUserId = std::string(jv.as_object().at("userId").as_string());
            
            auto currentUser = UserService::getInstance().getUserByEmail(userInfo.email);
            if (!currentUser) {
                res.result(http::status::not_found);
                res.body() = json::serialize(json::object{{"error", "Usuario no encontrado"}});
                return;
            }
            
            bool success = UserService::getInstance().followUser(currentUser->id, targetUserId);
            
            res.result(success ? http::status::ok : http::status::internal_server_error);
            res.body() = json::serialize(json::object{{"message", success ? "Followed" : "Error"}});
            
        } catch (const std::exception& e) {
            res.result(http::status::bad_request);
            res.body() = json::serialize(json::object{{"error", "Internal server error"}});
        }
    }
    
    void handle_unfollow_user(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid || userInfo.postgresId.empty()) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            return;
        }
        
        try {
            json::value jv = json::parse(req_.body());
            std::string targetUserId = std::string(jv.as_object().at("userId").as_string());
            
            auto currentUser = UserService::getInstance().getUserByEmail(userInfo.email);
            if (!currentUser) {
                res.result(http::status::not_found);
                res.body() = json::serialize(json::object{{"error", "Usuario no encontrado"}});
                return;
            }
            
            bool success = UserService::getInstance().unfollowUser(currentUser->id, targetUserId);
            
            res.result(success ? http::status::ok : http::status::internal_server_error);
            res.body() = json::serialize(json::object{{"message", success ? "Unfollowed" : "Error"}});
            
        } catch (const std::exception& e) {
            res.result(http::status::bad_request);
            res.body() = json::serialize(json::object{{"error", "Internal server error"}});
        }
    }
    
    void handle_get_all_users(http::response<http::string_body>& res) {
        try {
            auto users = UserService::getInstance().getAllUsers();
            json::array usersArray;
            
            for (const auto& user : users) {
                json::object userObj;
                userObj["id"] = user.id;
                userObj["email"] = user.email;
                userObj["firstName"] = user.firstName;
                userObj["lastName"] = user.lastName;
                userObj["age"] = user.age;
                userObj["clientId"] = user.clientId;
                userObj["role"] = user.role;
                userObj["username"] = user.username;
                userObj["displayName"] = user.displayName;
                userObj["bio"] = user.bio;
                userObj["location"] = user.location;
                userObj["website"] = user.website;
                userObj["profilePic"] = user.profilePic.empty() ? nullptr : json::value(user.profilePic);
                userObj["plan"] = user.plan;
                userObj["createdAt"] = user.createdAt;
                userObj["followers"] = json::array(user.followers.begin(), user.followers.end());
                userObj["following"] = json::array(user.following.begin(), user.following.end());
                
                usersArray.push_back(userObj);
            }
            
            res.result(http::status::ok);
            res.body() = json::serialize(usersArray);
        } catch (const std::exception& e) {
            res.result(http::status::internal_server_error);
            res.body() = json::serialize(json::object{{"error", "Internal server error"}});
        }
    }
    
    void handle_refresh_token(http::response<http::string_body>& res) {
        // Read refresh token from request body
        std::string storedRefreshToken;
        std::string clientId = "alcaldia-duitama";
        try {
            json::value jv = json::parse(req_.body());
            auto& obj = jv.as_object();
            if (obj.contains("refreshToken")) {
                storedRefreshToken = std::string(obj.at("refreshToken").as_string());
            }
            if (obj.contains("clientId")) {
                clientId = std::string(obj.at("clientId").as_string());
            }
        } catch (...) {}

        if (storedRefreshToken.empty()) {
            res.result(http::status::bad_request);
            res.body() = json::serialize(json::object{{"error", "No refresh token provided"}});
            return;
        }

        // Call Keycloak's token endpoint with refresh_token grant
        std::string clientSecret = keycloakClient->getClientSecret(clientId);
        std::string newAccessToken;
        std::string newRefreshToken;

        CURL* curl = curl_easy_init();
        if (curl) {
            // URL-encode values that may contain special chars (/ + = etc)
            char* encClientId = curl_easy_escape(curl, clientId.c_str(), clientId.size());
            char* encSecret = curl_easy_escape(curl, clientSecret.c_str(), clientSecret.size());
            char* encRefreshToken = curl_easy_escape(curl, storedRefreshToken.c_str(), storedRefreshToken.size());

            std::stringstream ss;
            ss << "client_id=" << (encClientId ? encClientId : clientId)
               << "&client_secret=" << (encSecret ? encSecret : clientSecret)
               << "&grant_type=refresh_token"
               << "&refresh_token=" << (encRefreshToken ? encRefreshToken : storedRefreshToken);

            if (encClientId) curl_free(encClientId);
            if (encSecret) curl_free(encSecret);
            if (encRefreshToken) curl_free(encRefreshToken);

            const char* kcUrl = std::getenv("KEYCLOAK_URL");
            const char* kcRealm = std::getenv("KEYCLOAK_REALM");
            std::string tokenUrl = std::string(kcUrl ? kcUrl : "http://keycloak:8080") +
                                   "/realms/" + std::string(kcRealm ? kcRealm : "yung-accountant") +
                                   "/protocol/openid-connect/token";
            std::string response;
            long httpCode = 0;

            struct curl_slist* headers = nullptr;
            headers = curl_slist_append(headers, "Content-Type: application/x-www-form-urlencoded");

            curl_easy_setopt(curl, CURLOPT_URL, tokenUrl.c_str());
            std::string postData = ss.str();
            curl_easy_setopt(curl, CURLOPT_POSTFIELDS, postData.c_str());
            curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
            curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, curlWriteCallback);
            curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
            curl_easy_setopt(curl, CURLOPT_TIMEOUT, 5L);
            curl_easy_setopt(curl, CURLOPT_CONNECTTIMEOUT, 3L);

            CURLcode curlRes = curl_easy_perform(curl);
            curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &httpCode);
            curl_slist_free_all(headers);
            curl_easy_cleanup(curl);

            // --- DETAILED LOGGING ---
            std::cerr << "[REFRESH] ========================================" << std::endl;
            std::cerr << "[REFRESH] URL: " << tokenUrl << std::endl;
            std::cerr << "[REFRESH] client_id: " << clientId << std::endl;
            std::cerr << "[REFRESH] client_secret: " << clientSecret.substr(0, 6) << "..." << std::endl;
            std::cerr << "[REFRESH] refresh_token: " << storedRefreshToken.substr(0, 30) << "..." << std::endl;
            std::cerr << "[REFRESH] HTTP status: " << httpCode << std::endl;
            std::cerr << "[REFRESH] CURL result: " << curl_easy_strerror(curlRes) << " (" << (int)curlRes << ")" << std::endl;
            std::cerr << "[REFRESH] Response body (" << response.size() << " bytes):" << std::endl;
            std::cerr << "[REFRESH] " << response << std::endl;
            std::cerr << "[REFRESH] ========================================" << std::endl;

            if (curlRes == CURLE_OK && !response.empty()) {
                try {
                    json::value jv = json::parse(response);
                    auto& obj = jv.as_object();
                    if (obj.contains("access_token")) {
                        newAccessToken = std::string(obj.at("access_token").as_string());
                        if (obj.contains("refresh_token")) {
                            newRefreshToken = std::string(obj.at("refresh_token").as_string());
                        }
                    }
                    if (obj.contains("error")) {
                        std::string errType = std::string(obj.at("error").as_string());
                        std::string errDesc = obj.contains("error_description")
                            ? std::string(obj.at("error_description").as_string())
                            : "no description";
                        std::cerr << "[REFRESH] Keycloak error: " << errType << " - " << errDesc << std::endl;
                    }
                } catch (const std::exception& e) {
                    std::cerr << "[REFRESH] JSON parse error: " << e.what() << std::endl;
                }
            }
        }

        if (newAccessToken.empty()) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token refresh failed"}});
            return;
        }

        // Set HttpOnly cookies + return tokens in body
        setCookie(res, "access_token", newAccessToken, 1800, true);
        setCookie(res, "refresh_token", newRefreshToken.empty() ? storedRefreshToken : newRefreshToken, 5184000, false);

        res.result(http::status::ok);
        json::object respBody;
        respBody["token"] = newAccessToken;
        respBody["refreshToken"] = newRefreshToken.empty() ? storedRefreshToken : newRefreshToken;
        res.body() = json::serialize(respBody);

        std::cout << "[Refresh] Token refreshed successfully" << std::endl;
    }
    
    // ============================================
    // GOOGLE OAUTH HANDLERS (direct — no Keycloak)
    // ============================================
    // Flow: browser → Google accounts picker → backend callback
    // Backend exchanges code, gets user info, creates/looks up user,
    // registers in Keycloak with random password, logs in for tokens.

    static std::string getGoogleEnv(const char* name) {
        const char* val = std::getenv(name);
        if (val && val[0]) return std::string(val);
        // Fallback: try _DEV suffix
        std::string devName = std::string(name) + "_DEV";
        val = std::getenv(devName.c_str());
        return (val && val[0]) ? std::string(val) : "";
    }

    void handle_google_login(http::response<http::string_body>& res) {
        std::string redirectUri = getGoogleEnv("GOOGLE_REDIRECT_URI");
        if (redirectUri.empty()) redirectUri = "http://localhost:8081/auth/google/callback";

        const char* kcPub = std::getenv("KEYCLOAK_PUBLIC_URL");
        std::string kcPublic = kcPub ? kcPub : "http://localhost:8080";
        const char* kcRealm = std::getenv("KEYCLOAK_REALM");
        std::string realm = kcRealm ? kcRealm : "yung-accountant";

        // Keycloak brokering — single Google account picker, no redirect loops.
        // The Google IdP uses firstBrokerLoginFlowAlias="google auto create"
        // so new users are created silently (no Keycloak form).
        std::string authUrl = kcPublic + "/realms/" + realm + "/protocol/openid-connect/auth"
            + "?client_id=alcaldia-duitama"
            + "&redirect_uri=" + urlEncode(redirectUri)
            + "&response_type=code"
            + "&scope=openid+profile+email"
            + "&kc_idp_hint=google";

        std::cout << "[Google] Redirecting via Keycloak brokering" << std::endl;
        res.result(http::status::found);
        res.set(http::field::location, authUrl);
    }

    void handle_google_callback(http::response<http::string_body>& res) {
        std::string redirectUri = getGoogleEnv("GOOGLE_REDIRECT_URI");
        if (redirectUri.empty()) redirectUri = "http://localhost:8081/auth/google/callback";
        std::string frontend = getGoogleEnv("APP_FRONTEND_URL");
        if (frontend.empty()) frontend = "http://127.0.0.1:5173";

        // Always a Keycloak brokering callback (single Google account picker).
        // New users are created silently by the google-auto-create flow;
        // returning users are auto-linked.

        std::string fullTarget(req_.target().begin(), req_.target().end());
        std::string code;
        size_t codePos = fullTarget.find("code=");
        if (codePos != std::string::npos) {
            size_t start = codePos + 5;
            size_t end = fullTarget.find('&', start);
            if (end == std::string::npos) end = fullTarget.size();
            code = urlDecode(fullTarget.substr(start, end - start));
        }
        if (code.empty()) {
            res.result(http::status::found);
            res.set(http::field::location, frontend + "/login?error=google_auth_failed");
            return;
        }

        std::cout << "[Google] Keycloak brokering callback — exchanging code for tokens..." << std::endl;

        const char* kcUrl = std::getenv("KEYCLOAK_URL");
        const char* kcRealm = std::getenv("KEYCLOAK_REALM");
        std::string kcBase = kcUrl ? kcUrl : "http://keycloak:8080";
        std::string realm = kcRealm ? kcRealm : "yung-accountant";
        std::string clientId = "alcaldia-duitama";
        std::string clientSecret = keycloakClient->getClientSecret(clientId);
        std::string tokenUrl = kcBase + "/realms/" + realm + "/protocol/openid-connect/token";

        CURL* curl = curl_easy_init();
        if (!curl) {
            res.result(http::status::found);
            res.set(http::field::location, frontend + "/login?error=google_internal_error");
            return;
        }

        char* encCid = curl_easy_escape(curl, clientId.c_str(), clientId.size());
        char* encSec = curl_easy_escape(curl, clientSecret.c_str(), clientSecret.size());
        char* encCode = curl_easy_escape(curl, code.c_str(), code.size());
        char* encRedir = curl_easy_escape(curl, redirectUri.c_str(), redirectUri.size());

        std::stringstream body;
        body << "grant_type=authorization_code"
             << "&client_id=" << (encCid ? encCid : clientId)
             << "&client_secret=" << (encSec ? encSec : clientSecret)
             << "&code=" << (encCode ? encCode : code)
             << "&redirect_uri=" << (encRedir ? encRedir : redirectUri);

        if (encCid) curl_free(encCid);
        if (encSec) curl_free(encSec);
        if (encCode) curl_free(encCode);
        if (encRedir) curl_free(encRedir);

        std::string bodyStr = body.str();
        std::string response;
        struct curl_slist* headers = nullptr;
        headers = curl_slist_append(headers, "Content-Type: application/x-www-form-urlencoded");
        curl_easy_setopt(curl, CURLOPT_URL, tokenUrl.c_str());
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, bodyStr.c_str());
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, curlWriteCallback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
        curl_easy_setopt(curl, CURLOPT_TIMEOUT, 10L);
        CURLcode r = curl_easy_perform(curl);
        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);

        if (r != CURLE_OK || response.empty()) {
            res.result(http::status::found);
            res.set(http::field::location, frontend + "/login?error=google_keycloak_exchange_failed");
            return;
        }

        std::string kcAccessToken, kcRefreshToken;
        try {
            auto jv = json::parse(response);
            auto& obj = jv.as_object();
            if (obj.contains("error")) {
                std::cerr << "[Google] Keycloak token error: " << response << std::endl;
                res.result(http::status::found);
                res.set(http::field::location, frontend + "/login?error=google_keycloak_exchange_failed");
                return;
            }
            kcAccessToken = obj.contains("access_token") ? std::string(obj.at("access_token").as_string()) : "";
            kcRefreshToken = obj.contains("refresh_token") ? std::string(obj.at("refresh_token").as_string()) : "";
        } catch (...) {
            res.result(http::status::found);
            res.set(http::field::location, frontend + "/login?error=google_keycloak_exchange_failed");
            return;
        }

        // Verify the Keycloak token to get user info
        auto userInfo = keycloakClient->verifyToken(kcAccessToken);
        if (!userInfo.isValid || userInfo.email.empty()) {
            res.result(http::status::found);
            res.set(http::field::location, frontend + "/login?error=google_no_email");
            return;
        }

        std::string email = userInfo.email;
        std::string firstName = userInfo.firstName;
        std::string lastName = userInfo.lastName;
        std::string keycloakId = userInfo.id;
        std::cout << "[Google] User from Keycloak: " << email
                  << " (" << firstName << " " << lastName << ")"
                  << " kcId=" << keycloakId << std::endl;

        auto existingUser = UserService::getInstance().getUserByEmail(email);
        if (existingUser) {
            // ── Returning user: set HttpOnly cookies + redirect ──
            std::cout << "[Google] Returning user " << existingUser->id << " — login OK" << std::endl;
            setCookie(res, "access_token", kcAccessToken, 1800, true);
            setCookie(res, "refresh_token", kcRefreshToken, 5184000, false);
            CURL* ec = curl_easy_init();
            char* er = ec ? curl_easy_escape(ec, kcRefreshToken.c_str(), kcRefreshToken.size()) : nullptr;
            std::string rd = frontend + "/login?refreshToken=" + (er ? er : kcRefreshToken)
                + "&userId=" + existingUser->id + "&email=" + email;
            if (ec) { if (er) curl_free(er); curl_easy_cleanup(ec); }
            res.result(http::status::found);
            res.set(http::field::location, rd);
            emitAuthEvent("google_login_success", existingUser->id, email, 200, {});
        } else {
            // ── New user (created in Keycloak by google-auto-create, not in PostgreSQL) ──
            // Redirect to /register so user can complete their profile.
            // The register endpoint will UPDATE the existing Keycloak user
            // (set password + attributes) instead of trying to create a new one.
            std::cout << "[Google] New user — redirecting to /register" << std::endl;

            CURL* ec = curl_easy_init();
            char* encEmail = ec ? curl_easy_escape(ec, email.c_str(), email.size()) : nullptr;
            char* encFirst = ec ? curl_easy_escape(ec, firstName.c_str(), firstName.size()) : nullptr;
            char* encLast = ec ? curl_easy_escape(ec, lastName.c_str(), lastName.size()) : nullptr;
            char* encKcId = ec ? curl_easy_escape(ec, keycloakId.c_str(), keycloakId.size()) : nullptr;

            std::string rd = frontend + "/register"
                + "?fromGoogle=true"
                + "&email=" + (encEmail ? encEmail : email)
                + "&firstName=" + (encFirst ? encFirst : firstName)
                + "&lastName=" + (encLast ? encLast : lastName)
                + "&keycloakId=" + (encKcId ? encKcId : keycloakId);

            if (ec) {
                if (encEmail) curl_free(encEmail);
                if (encFirst) curl_free(encFirst);
                if (encLast) curl_free(encLast);
                if (encKcId) curl_free(encKcId);
                curl_easy_cleanup(ec);
            }

            res.result(http::status::found);
            res.set(http::field::location, rd);
            emitAuthEvent("google_register_redirect", "", email, 200,
                {{"provider", "google"}, {"firstName", firstName}, {"lastName", lastName}});
        }
    }
    void handle_get_clients(http::response<http::string_body>& res) {
        json::array clientsArray;

        json::object client1;
        client1["id"] = "alcaldia-duitama";
        client1["name"] = "Alcaldía de Duitama";
        clientsArray.push_back(client1);
        
        json::object client2;
        client2["id"] = "alcaldia-sogamoso";
        client2["name"] = "Alcaldía de Sogamoso";
        clientsArray.push_back(client2);
        
        json::object client3;
        client3["id"] = "alcaldia-tunja";
        client3["name"] = "Alcaldía de Tunja";
        clientsArray.push_back(client3);
        
        res.result(http::status::ok);
        res.body() = json::serialize(clientsArray);
    }
    
    void handle_get_roles(http::response<http::string_body>& res) {
        json::array rolesArray;
        
        json::object role1;
        role1["id"] = "estudiante";
        role1["name"] = "Estudiante";
        rolesArray.push_back(role1);
        
        json::object role2;
        role2["id"] = "ama-de-casa";
        role2["name"] = "Ama de Casa";
        rolesArray.push_back(role2);
        
        json::object role3;
        role3["id"] = "trabajador";
        role3["name"] = "Trabajador";
        rolesArray.push_back(role3);
        
        res.result(http::status::ok);
        res.body() = json::serialize(rolesArray);
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
        std::cout << "Server accepting on " << address << ":" << port << std::endl;
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
        
        std::cout << "Auth Service starting on 0.0.0.0:" << port << std::endl;
        
        HttpServer server("0.0.0.0", port);
        server.run();
        
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }
    
    return 0;
}
