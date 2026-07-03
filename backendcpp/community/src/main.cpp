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
#include "community_service.hpp"
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
// HELPERS
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
        keycloak::UserInfo info; info.isValid = false; info.error = "No token"; return info;
    }
    auto info = keycloakClient->verifyToken(token);
    if (info.isValid && info.postgresId.empty()) {
        info.isValid = false;
        info.error = "Missing postgresId in token";
    }
    return info;
}

// ============================================
// KAFKA EVENTS
// ============================================
void emitCommunityEvent(const std::string& type, const std::string& userId,
                        const std::string& targetId, int status, const json::object& extra = {}) {
    try {
        json::object event;
        event["type"] = type;
        event["service"] = "community";
        event["user_id"] = userId;
        if (type.find("post") != std::string::npos) event["post_id"] = targetId;
        else if (type.find("comment") != std::string::npos) event["comment_id"] = targetId;
        event["timestamp"] = std::time(nullptr);
        event["status_code"] = status;
        for (const auto& [k, v] : extra) event[k] = v;
        kafka::getProducer().produce("community-events", event);
        
        std::string s = (status >= 200 && status < 300) ? "SUCCESS" : "FAILED";
        std::cout << "[Kafka] " << type << " (" << s << ") user=" << userId << " id=" << targetId << std::endl;
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
// HTTP SESSION
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
        // Timeout de 30 segundos
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
                // Timeout: cerrar conexión
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
                    self->timer_.cancel(); // Cancelar timeout
                    self->handle_request(); 
                }
            });
    }
    
    void handle_request() {
        std::cout << "[REQUEST] " << req_.method_string() << " " << req_.target() << std::endl;
        if (req_.method() == http::verb::options) {
            http::response<http::string_body> res{http::status::ok, req_.version()};
            addCorsHeaders(res, req_);
            res.set(http::field::connection, "close"); // Cerrar después de OPTIONS
            res.prepare_payload();
            write_response(res);
            return;
        }
        
        http::response<http::string_body> res{http::status::ok, req_.version()};
        res.set(http::field::server, "Community Service");
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
        
            // Extraer solo el path (sin query params)
            std::string target = fullTarget;
            size_t queryPos = target.find('?');
            if (queryPos != std::string::npos) {
                target = target.substr(0, queryPos);
            }
            
            // Posts
            // Feed
            if (req_.method() == http::verb::get && target == "/community/personalized") handle_personalized_feed(res);
            else if (req_.method() == http::verb::post && target.find("/community/posts/") == 0 && 
                    target.find("/view") != std::string::npos) handle_record_view(res);
            else if (req_.method() == http::verb::get && target == "/community/posts") handle_get_posts(res);
            else if (req_.method() == http::verb::get && target.find("/community/posts/") == 0 && 
                     target.find("/comments") == std::string::npos && target.find("/like") == std::string::npos) handle_get_post(res);
            else if (req_.method() == http::verb::post && target == "/community/posts") handle_create_post(res);
            else if (req_.method() == http::verb::put && target.find("/community/posts/") == 0 && 
                     target.find("/like") == std::string::npos) handle_update_post(res);
            else if (req_.method() == http::verb::delete_ && target.find("/community/posts/") == 0) handle_delete_post(res);
            
            // Post Likes
            else if (req_.method() == http::verb::post && target.find("/community/posts/") != std::string::npos && 
                     target.find("/like") != std::string::npos) handle_like_post(res);
            
            // Comments
            else if (req_.method() == http::verb::get && target.find("/community/posts/") != std::string::npos && 
                     target.find("/comments") != std::string::npos && target.find("/like") == std::string::npos && 
                     target.find("/replies") == std::string::npos) handle_get_comments(res);
            else if (req_.method() == http::verb::post && target.find("/community/posts/") != std::string::npos && 
                     target.find("/comments") != std::string::npos && target.find("/replies") == std::string::npos && 
                     target.find("/like") == std::string::npos) handle_add_comment(res);
            else if (req_.method() == http::verb::put && target.find("/comments/") != std::string::npos && 
                     target.find("/like") == std::string::npos) handle_update_comment(res);
            else if (req_.method() == http::verb::delete_ && target.find("/comments/") != std::string::npos) handle_delete_comment(res);
            else if (req_.method() == http::verb::post && target.find("/comments/") != std::string::npos && 
                     target.find("/like") != std::string::npos) handle_like_comment(res);

            else if (req_.method() == http::verb::get && target.find("/community/users/") == 0 && 
                    target.find("/posts") != std::string::npos) handle_user_posts(res);
            else if (req_.method() == http::verb::post && target.find("/community/users/") == 0 && 
                target.find("/follow") != std::string::npos) handle_follow_user(res);
            else if (req_.method() == http::verb::delete_ && target.find("/community/users/") == 0 && 
                target.find("/follow") != std::string::npos) handle_unfollow_user(res);
            else if (req_.method() == http::verb::get && target.find("/community/users/") == 0 && 
                target.find("/is-following") != std::string::npos) handle_is_following(res);
            // User stats
            else if (req_.method() == http::verb::get && target.find("/community/users/") == 0 && 
                target.find("/stats") != std::string::npos) handle_user_stats(res);
            
            // Replies
            else if (req_.method() == http::verb::post && target.find("/comments/") != std::string::npos && 
                     target.find("/replies") != std::string::npos) handle_add_reply(res);
            
            // Search & Recommendations
            else if (req_.method() == http::verb::get && target == "/community/search/users") handle_search_users(res);
            else if (req_.method() == http::verb::get && target.find("/community/search") == 0) handle_search_posts(res);
            else if (req_.method() == http::verb::get && target == "/community/recommended") handle_recommended_posts(res);
            else if (req_.method() == http::verb::get && target.find("/community/tags/") == 0) handle_posts_by_tag(res);
            else if (req_.method() == http::verb::get && target == "/community/trending") handle_trending_posts(res);
            

            
            // Health
            else if (req_.method() == http::verb::get && target == "/health") {
                json::object r; r["status"] = "ok"; r["service"] = "community";
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
        res.prepare_payload(); write_response(res);
    }
    
    // ============================================
    // POSTS HANDLERS
    // ============================================
    void handle_get_posts(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            return;
        }
        
        int page = 1, limit = 10;
        bool followingOnly = false;
        
        std::string fullTarget(req_.target().begin(), req_.target().end());
        size_t queryPos = fullTarget.find('?');
        if (queryPos != std::string::npos) {
            std::string query = fullTarget.substr(queryPos + 1);
            
            size_t pagePos = query.find("page=");
            if (pagePos != std::string::npos) {
                page = std::stoi(query.substr(pagePos + 5));
            }
            size_t limitPos = query.find("limit=");
            if (limitPos != std::string::npos) {
                limit = std::stoi(query.substr(limitPos + 6));
            }
            // Nuevo parámetro: following=true
            if (query.find("following=true") != std::string::npos) {
                followingOnly = true;
            }
        }
        
        auto posts = CommunityService::getInstance().getPosts(userInfo.postgresId, page, limit, followingOnly);
        
        res.result(http::status::ok);
        res.body() = CommunityService::getInstance().postsToJson(posts);
        
        emitCommunityEvent("posts_fetched", userInfo.postgresId, "", 200, 
            {{"count", static_cast<int64_t>(posts.size())}, {"page", page}});
    }
    
    void handle_get_post(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) { res.result(http::status::unauthorized); return; }
        std::string id = std::string(req_.target().begin(), req_.target().end()).substr(17);
        auto post = CommunityService::getInstance().getPostById(id);
        if (!post) { res.result(http::status::not_found); return; }
        
        json::object obj;
        obj["id"] = post->id; 
        obj["title"] = post->title; 
        obj["content"] = post->content;
        obj["likesCount"] = post->likesCount; 
        obj["commentsCount"] = post->commentsCount;
        obj["username"] = post->username; 
        obj["displayName"] = post->displayName;
        obj["avatar"] = post->avatar.empty() ? nullptr : json::value(post->avatar);  // ← AGREGAR
        obj["createdAt"] = post->createdAt;
        obj["imageUrl"] = post->imageUrl.empty() ? nullptr : json::value(post->imageUrl);
        
        json::array tags; 
        for (const auto& t : post->tags) tags.push_back(json::value(t)); 
        obj["tags"] = tags;
        
        // También likedBy para saber si el usuario dio like
        json::array likedBy;
        for (const auto& id : post->likedBy) likedBy.push_back(json::value(id));
        obj["likedBy"] = likedBy;
        
        res.result(http::status::ok); 
        res.body() = json::serialize(obj);
    }
    
    void handle_create_post(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) {
            res.result(http::status::unauthorized);
            emitCommunityEvent("post_create_failed", "", "", 401, {{"reason", "invalid_token"}});
            return;
        }
        try {
            auto jv = json::parse(req_.body());
            auto& obj = jv.as_object();
            Post p;
            p.userId = userInfo.postgresId;
            p.title = std::string(obj.at("title").as_string());
            p.content = std::string(obj.at("content").as_string());
            if (obj.contains("tags")) for (const auto& t : obj.at("tags").as_array()) p.tags.push_back(boost::json::value_to<std::string>(t));
            if (obj.contains("imageUrl") && !obj.at("imageUrl").is_null()) p.imageUrl = std::string(obj.at("imageUrl").as_string());
            
            auto created = CommunityService::getInstance().createPost(p);
            if (!created) {
                res.result(http::status::internal_server_error);
                emitCommunityEvent("post_create_failed", userInfo.postgresId, "", 500, {{"reason", "db_error"}});
                return;
            }
            res.result(http::status::created);
            res.body() = json::serialize(json::object{{"id", created->id}, {"message", "Post creado"}});
            emitCommunityEvent("post_created", userInfo.postgresId, created->id, 201,
                {{"title", p.title}, {"tags_count", static_cast<int64_t>(p.tags.size())}});
        } catch (const std::exception& e) {
            res.result(http::status::bad_request);
            emitCommunityEvent("post_create_failed", userInfo.postgresId, "", 400, {{"reason", "bad_request"}, {"error", e.what()}});
        }
    }
    
    void handle_update_post(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) { res.result(http::status::unauthorized); return; }
        std::string id = std::string(req_.target().begin(), req_.target().end()).substr(17);
        try {
            auto jv = json::parse(req_.body());
            bool ok = CommunityService::getInstance().updatePost(id, userInfo.postgresId, jv.as_object());
            res.result(ok ? http::status::ok : http::status::not_found);
            res.body() = json::serialize(json::object{{"message", ok ? "Updated" : "Not found"}});
            if (ok) emitCommunityEvent("post_updated", userInfo.postgresId, id, 200);
            else emitCommunityEvent("post_update_failed", userInfo.postgresId, id, 404, {{"reason", "not_found"}});
        } catch (const std::exception& e) { res.result(http::status::bad_request); }
    }
    
    void handle_delete_post(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) { res.result(http::status::unauthorized); return; }
        std::string id = std::string(req_.target().begin(), req_.target().end()).substr(17);
        bool ok = CommunityService::getInstance().deletePost(id, userInfo.postgresId);
        res.result(ok ? http::status::ok : http::status::not_found);
        res.body() = json::serialize(json::object{{"message", ok ? "Deleted" : "Not found"}});
        if (ok) emitCommunityEvent("post_deleted", userInfo.postgresId, id, 200);
    }
    
    // ============================================
    // LIKES HANDLERS
    // ============================================
    void handle_like_post(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) { res.result(http::status::unauthorized); return; }
        // URL: /community/posts/{id}/like
        std::string target = std::string(req_.target().begin(), req_.target().end());
        std::string postId = target.substr(17, target.find("/like") - 17);
        
        bool ok = CommunityService::getInstance().toggleLikePost(postId, userInfo.postgresId);
        res.result(ok ? http::status::ok : http::status::not_found);
        res.body() = json::serialize(json::object{{"message", ok ? "Like toggled" : "Not found"}});
        if (ok) emitCommunityEvent("post_like_toggled", userInfo.postgresId, postId, 200);
    }
    
    // ============================================
    // COMMENTS HANDLERS
    // ============================================
    void handle_get_comments(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) { res.result(http::status::unauthorized); return; }
        
        std::string target = std::string(req_.target().begin(), req_.target().end());
        std::string postId = target.substr(17, target.find("/comments") - 17);
        
        auto comments = CommunityService::getInstance().getComments(postId);
        
        // USAR commentsToJson que ya incluye los replies anidados
        res.result(http::status::ok);
        res.body() = CommunityService::getInstance().commentsToJson(comments);
        
        emitCommunityEvent("comments_fetched", userInfo.postgresId, postId, 200, 
            {{"count", static_cast<int64_t>(comments.size())}});
    }
    
    void handle_add_comment(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) { res.result(http::status::unauthorized); return; }
        try {
            auto jv = json::parse(req_.body());
            auto& obj = jv.as_object();
            // URL: /community/posts/{id}/comments
            std::string target = std::string(req_.target().begin(), req_.target().end());
            std::string postId = target.substr(17, target.find("/comments") - 17);
            
            Comment c;
            c.postId = postId;
            c.userId = userInfo.postgresId;
            c.content = std::string(obj.at("content").as_string());
            
            auto created = CommunityService::getInstance().addComment(c);
            if (!created) {
                res.result(http::status::internal_server_error);
                emitCommunityEvent("comment_add_failed", userInfo.postgresId, postId, 500, {{"reason", "db_error"}});
                return;
            }
            res.result(http::status::created);
            res.body() = json::serialize(json::object{{"id", created->id}, {"message", "Comentario agregado"}});
            emitCommunityEvent("comment_added", userInfo.postgresId, postId, 201, {{"commentId", created->id}});
        } catch (const std::exception& e) { res.result(http::status::bad_request); }
    }
    
    void handle_update_comment(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) { res.result(http::status::unauthorized); return; }
        // URL: /comments/{id}
        std::string commentId = std::string(req_.target().begin(), req_.target().end()).substr(10);
        try {
            auto jv = json::parse(req_.body());
            bool ok = CommunityService::getInstance().updateComment(commentId, userInfo.postgresId, jv.as_object());
            res.result(ok ? http::status::ok : http::status::not_found);
            res.body() = json::serialize(json::object{{"message", ok ? "Updated" : "Not found"}});
            if (ok) emitCommunityEvent("comment_updated", userInfo.postgresId, commentId, 200);
        } catch (const std::exception& e) { res.result(http::status::bad_request); }
    }
    
    void handle_delete_comment(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) { res.result(http::status::unauthorized); return; }
        std::string commentId = std::string(req_.target().begin(), req_.target().end()).substr(10);
        bool ok = CommunityService::getInstance().deleteComment(commentId, userInfo.postgresId);
        res.result(ok ? http::status::ok : http::status::not_found);
        res.body() = json::serialize(json::object{{"message", ok ? "Deleted" : "Not found"}});
        if (ok) emitCommunityEvent("comment_deleted", userInfo.postgresId, commentId, 200);
    }
    
    void handle_like_comment(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) { res.result(http::status::unauthorized); return; }
        // URL: /comments/{id}/like
        std::string target = std::string(req_.target().begin(), req_.target().end());
        std::string commentId = target.substr(10, target.find("/like") - 10);
        
        bool ok = CommunityService::getInstance().toggleLikeComment(commentId, userInfo.postgresId);
        res.result(ok ? http::status::ok : http::status::not_found);
        res.body() = json::serialize(json::object{{"message", ok ? "Like toggled" : "Not found"}});
        if (ok) emitCommunityEvent("comment_like_toggled", userInfo.postgresId, commentId, 200);
    }
    
    // ============================================
    // REPLIES
    // ============================================
    void handle_add_reply(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) { res.result(http::status::unauthorized); return; }
        try {
            auto jv = json::parse(req_.body());
            auto& obj = jv.as_object();
            
            std::string target = std::string(req_.target().begin(), req_.target().end());
            std::string parentId = target.substr(10, target.find("/replies") - 10);
            
            Comment c;
            c.userId = userInfo.postgresId;
            c.parentId = parentId;
            c.content = std::string(obj.at("content").as_string());
            // El postId se obtiene dentro de addReply en el servicio
            
            auto created = CommunityService::getInstance().addReply(c);
            if (!created) {
                res.result(http::status::internal_server_error);
                return;
            }
            res.result(http::status::created);
            res.body() = json::serialize(json::object{{"id", created->id}, {"message", "Reply added"}});
            emitCommunityEvent("reply_added", userInfo.postgresId, parentId, 201, {{"replyId", created->id}});
        } catch (const std::exception& e) { 
            std::cerr << "[REPLY ERROR] " << e.what() << std::endl;
            res.result(http::status::bad_request); 
            res.body() = json::serialize(json::object{{"error", e.what()}});
        }
    }
    
    void handle_user_posts(http::response<http::string_body>& res) {
        // URL: /community/users/{userId}/posts
        std::string target = std::string(req_.target().begin(), req_.target().end());
        size_t usersPos = target.find("/community/users/");
        std::string subPath = target.substr(usersPos + 17);
        std::string userId = subPath.substr(0, subPath.find("/"));
        
        auto posts = CommunityService::getInstance().getPostsByUser(userId);
        
        res.result(http::status::ok);
        res.body() = CommunityService::getInstance().postsToJson(posts);
    }
    // ============================================
    // SEARCH & RECOMMENDATIONS
    // ============================================
    void handle_search_posts(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) { res.result(http::status::unauthorized); return; }
        
        std::string fullTarget(req_.target().begin(), req_.target().end());
        std::string query;
        size_t qPos = fullTarget.find("q=");
        if (qPos != std::string::npos) {
            query = fullTarget.substr(qPos + 2);
            size_t ampPos = query.find('&');
            if (ampPos != std::string::npos) query = query.substr(0, ampPos);
        }
        
        auto posts = CommunityService::getInstance().searchPosts(query, userInfo.postgresId);
        json::array arr;
        for (const auto& p : posts) {
            json::object obj;
            obj["id"] = p.id; 
            obj["title"] = p.title; 
            obj["content"] = p.content.substr(0, 200);
            obj["likesCount"] = p.likesCount; 
            obj["commentsCount"] = p.commentsCount;
            obj["username"] = p.username; 
            obj["displayName"] = p.displayName;
            obj["avatar"] = p.avatar;
            obj["searchRank"] = p.searchRank;
            obj["createdAt"] = p.createdAt;
            obj["imageUrl"] = p.imageUrl.empty() ? nullptr : json::value(p.imageUrl);
            json::array tags; 
            for (const auto& t : p.tags) tags.push_back(json::value(t));
            obj["tags"] = tags;
            arr.push_back(obj);
        }
        res.result(http::status::ok); 
        res.body() = json::serialize(arr);
        emitCommunityEvent("posts_searched", userInfo.postgresId, "", 200, 
            {{"query", query}, {"results", static_cast<int64_t>(posts.size())}});
    }
    
    void handle_recommended_posts(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) { res.result(http::status::unauthorized); return; }
        
        auto posts = CommunityService::getInstance().getRecommendedPosts(userInfo.postgresId);
        
        // Usar postsToJson que incluye TODOS los campos (avatar, imageUrl, tags, etc.)
        res.result(http::status::ok);
        res.body() = CommunityService::getInstance().postsToJson(posts);
        
        emitCommunityEvent("recommended_posts_fetched", userInfo.postgresId, "", 200, 
            {{"count", static_cast<int64_t>(posts.size())}});
    }

    void handle_trending_posts(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) { res.result(http::status::unauthorized); return; }
        
        auto posts = CommunityService::getInstance().getTrendingPosts(10);
        
        res.result(http::status::ok);
        res.body() = CommunityService::getInstance().postsToJson(posts);
        
        emitCommunityEvent("trending_posts_fetched", userInfo.postgresId, "", 200, 
            {{"count", static_cast<int64_t>(posts.size())}});
    }
    
    void handle_posts_by_tag(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) { res.result(http::status::unauthorized); return; }
        std::string tag = std::string(req_.target().begin(), req_.target().end()).substr(16); // /community/tags/{tag}
        auto posts = CommunityService::getInstance().getPostsByTag(tag);
        json::array arr;
        for (const auto& p : posts) {
            json::object obj;
            obj["id"] = p.id; obj["title"] = p.title; obj["username"] = p.username;
            arr.push_back(obj);
        }
        res.result(http::status::ok); res.body() = json::serialize(arr);
        emitCommunityEvent("posts_by_tag_fetched", userInfo.postgresId, "", 200, {{"tag", tag}, {"count", static_cast<int64_t>(posts.size())}});
    }

    void handle_search_users(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) {
            res.result(http::status::unauthorized);
            res.body() = json::serialize(json::object{{"error", "Token inválido"}});
            return;
        }
        
        // Extraer query param 'q'
        std::string fullTarget(req_.target().begin(), req_.target().end());
        std::string query;
        int page = 1, limit = 10;
        
        size_t qPos = fullTarget.find("q=");
        if (qPos != std::string::npos) {
            query = fullTarget.substr(qPos + 2);
            size_t ampPos = query.find('&');
            if (ampPos != std::string::npos) query = query.substr(0, ampPos);
        }
        std::string decodedQuery = urlDecode(query);
        std::cout << "[SEARCH USERS] Raw query: '" << query << "' -> Decoded: '" << decodedQuery << "'" << std::endl;
        // Parse page and limit if present
        size_t pagePos = fullTarget.find("page=");
        if (pagePos != std::string::npos) {
            std::string pageStr = fullTarget.substr(pagePos + 5);
            size_t ampPos = pageStr.find('&');
            if (ampPos != std::string::npos) pageStr = pageStr.substr(0, ampPos);
            try { page = std::stoi(pageStr); } catch (...) {}
        }
        
        size_t limitPos = fullTarget.find("limit=");
        if (limitPos != std::string::npos) {
            std::string limitStr = fullTarget.substr(limitPos + 6);
            size_t ampPos = limitStr.find('&');
            if (ampPos != std::string::npos) limitStr = limitStr.substr(0, ampPos);
            try { limit = std::stoi(limitStr); } catch (...) {}
        }
        
        auto users = CommunityService::getInstance().searchUsers(decodedQuery, page, limit, userInfo.postgresId);
        json::array arr;
        for (const auto& u : users) {
            json::object obj;
            obj["id"] = u.id;
            obj["username"] = u.username;
            obj["displayName"] = u.displayName;
            obj["avatar"] = u.avatar.empty() ? nullptr : json::value(u.avatar);
            obj["bio"] = u.bio.empty() ? nullptr : json::value(u.bio);
            obj["followersCount"] = u.followersCount;
            obj["postsCount"] = u.postsCount;
            arr.push_back(obj);
        }
        res.result(http::status::ok);
        res.body() = json::serialize(arr);
        emitCommunityEvent("users_searched", userInfo.postgresId, "", 200, 
            {{"query", query}, {"results", static_cast<int64_t>(users.size())}});
    }

    void handle_follow_user(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) {
            res.result(http::status::unauthorized);
            return;
        }
        
        std::string target = std::string(req_.target().begin(), req_.target().end());
        size_t usersPos = target.find("/community/users/");
        std::string subPath = target.substr(usersPos + 17);
        std::string userId = subPath.substr(0, subPath.find("/"));
        
        bool ok = CommunityService::getInstance().followUser(userInfo.postgresId, userId);
        
        res.result(ok ? http::status::ok : http::status::internal_server_error);
        res.body() = json::serialize(json::object{{"message", ok ? "Followed" : "Error"}});
        
        if (ok) {
            emitCommunityEvent("user_followed", userInfo.postgresId, userId, 200);
        }
    }

    void handle_unfollow_user(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) {
            res.result(http::status::unauthorized);
            return;
        }
        
        std::string target = std::string(req_.target().begin(), req_.target().end());
        size_t usersPos = target.find("/community/users/");
        std::string subPath = target.substr(usersPos + 17);
        std::string userId = subPath.substr(0, subPath.find("/"));
        
        bool ok = CommunityService::getInstance().unfollowUser(userInfo.postgresId, userId);
        
        res.result(ok ? http::status::ok : http::status::internal_server_error);
        res.body() = json::serialize(json::object{{"message", ok ? "Unfollowed" : "Error"}});
        
        if (ok) {
            emitCommunityEvent("user_unfollowed", userInfo.postgresId, userId, 200);
        }
    }

    void handle_user_stats(http::response<http::string_body>& res) {
        // URL: /community/users/{username}/stats
        std::string target = std::string(req_.target().begin(), req_.target().end());
        size_t usersPos = target.find("/community/users/");
        std::string subPath = target.substr(usersPos + 17); // Saltar "/community/users/"
        size_t slashPos = subPath.find("/");
        std::string username = subPath.substr(0, slashPos);
        
        std::cout << "[USER_STATS] Getting stats for: " << username << std::endl;
        
        auto stats = CommunityService::getInstance().getUserStats(username);
        res.result(http::status::ok);
        res.body() = json::serialize(stats);
    }

    void handle_is_following(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) {
            res.result(http::status::unauthorized);
            return;
        }
        
        // URL: /community/users/{targetUserId}/is-following
        std::string target = std::string(req_.target().begin(), req_.target().end());
        size_t usersPos = target.find("/community/users/");
        std::string subPath = target.substr(usersPos + 17); // Saltar "/community/users/"
        size_t slashPos = subPath.find("/");
        std::string targetUserId = subPath.substr(0, slashPos);
        
        std::cout << "[IS_FOLLOWING] Checking if " << userInfo.postgresId << " follows " << targetUserId << std::endl;
        
        bool following = CommunityService::getInstance().isFollowing(userInfo.postgresId, targetUserId);
        
        res.result(http::status::ok);
        res.body() = json::serialize(json::object{{"isFollowing", following}});
    }

    void handle_personalized_feed(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) { 
            res.result(http::status::unauthorized); 
            return; 
        }
        
        int limit = 10;
        std::string fullTarget(req_.target().begin(), req_.target().end());
        size_t limitPos = fullTarget.find("limit=");
        if (limitPos != std::string::npos) {
            try { limit = std::stoi(fullTarget.substr(limitPos + 6)); } catch (...) {}
        }
        
        auto posts = CommunityService::getInstance().getPersonalizedFeed(userInfo.postgresId, limit);
        
        res.result(http::status::ok);
        res.body() = CommunityService::getInstance().postsToJson(posts);
        
        emitCommunityEvent("personalized_feed_fetched", userInfo.postgresId, "", 200, 
            {{"count", static_cast<int64_t>(posts.size())}});
    }

    void handle_record_view(http::response<http::string_body>& res) {
        auto userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) { 
            res.result(http::status::unauthorized); 
            return; 
        }
        
        std::string target = std::string(req_.target().begin(), req_.target().end());
        
        // Extraer postId de forma segura
        // URL: /community/posts/{postId}/view
        size_t postsPos = target.find("/community/posts/");
        if (postsPos == std::string::npos) {
            res.result(http::status::bad_request);
            return;
        }
        
        std::string subPath = target.substr(postsPos + 17); // "cab3af7d.../view"
        size_t slashPos = subPath.find('/');
        if (slashPos == std::string::npos) {
            res.result(http::status::bad_request);
            return;
        }
        
        std::string postId = subPath.substr(0, slashPos);
        
        std::cout << "[RECORD VIEW] User " << userInfo.postgresId 
                << " viewing post " << postId << std::endl;
        
        CommunityService::getInstance().recordView(userInfo.postgresId, postId);
        
        res.result(http::status::ok);
        res.body() = json::serialize(json::object{{"message", "View recorded"}});
    }



    
    void write_response(http::response<http::string_body>& res) {
        auto self = shared_from_this();
        
        // Siempre cerrar después de OPTIONS o si no es keep-alive
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
// HTTP SERVER
// ============================================
class HttpServer {
    net::io_context ioc_;
    tcp::acceptor acceptor_;
    std::vector<std::thread> threads_; 
public:
    HttpServer(const std::string& address, unsigned short port)
        : ioc_(std::max(1u, std::thread::hardware_concurrency())),  // Usar múltiples hilos
          acceptor_(ioc_) {
        tcp::endpoint endpoint(net::ip::make_address(address), port);
        acceptor_.open(endpoint.protocol());
        acceptor_.set_option(tcp::acceptor::reuse_address(true));
        acceptor_.bind(endpoint);
        acceptor_.listen();
        std::cout << "Server accepting on " << address << ":" << port << std::endl;
    }
    
    void run() { 
        do_accept(); 
        
        // Lanzar múltiples hilos para manejar requests concurrentes
        unsigned int num_threads = std::max(1u, std::thread::hardware_concurrency());
        std::cout << "Starting " << num_threads << " worker threads" << std::endl;
        
        for (unsigned int i = 0; i < num_threads; ++i) {
            threads_.emplace_back([this]() {
                ioc_.run();
            });
        }
        
        // Esperar a que todos los hilos terminen
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

void signalHandler(int sig) {
    std::cerr << "\n [CRASH]: Signal " << sig;
    switch (sig) {
        case SIGSEGV: std::cerr << " (Segmentation Fault)"; break;
        case SIGABRT: std::cerr << " (Abort)"; break;
        case SIGFPE:  std::cerr << " (Floating Point Exception)"; break;
        case SIGILL:  std::cerr << " (Illegal Instruction)"; break;
        default:      std::cerr << " (Unknown)"; break;
    }    std::cerr << std::endl;
    std::cerr << "The service will now exit." << std::endl;
    _exit(1);  // Usar _exit en lugar de exit para evitar deadlocks
}

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
        std::cout << "Community Service starting on 0.0.0.0:" << port << std::endl;
        HttpServer server("0.0.0.0", port);
        server.run();
    } catch (const std::exception& e) { std::cerr << "Error: " << e.what() << std::endl; return 1; }
    return 0;
}
