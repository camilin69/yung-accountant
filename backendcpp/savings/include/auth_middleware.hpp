#pragma once

#include <string>
#include <boost/beast/http.hpp>
#include <boost/json.hpp>
#include "keycloak_auth.hpp"

namespace beast = boost::beast;
namespace http = beast::http;

namespace auth {

inline std::string extractToken(const http::request<http::string_body>& req) {
    auto it = req.find(http::field::authorization);
    if (it != req.end()) {
        std::string auth = std::string(it->value().begin(), it->value().end());
        if (auth.find("Bearer ") == 0) {
            return auth.substr(7);
        }
        return auth;
    }
    return "";
}

inline bool authenticate(const http::request<http::string_body>& req,
                         keycloak::KeycloakClient& keycloak,
                         keycloak::UserInfo& userInfo) {
    std::string token = extractToken(req);
    if (token.empty()) {
        userInfo.isValid = false;
        userInfo.error = "No token provided";
        return false;
    }
    
    userInfo = keycloak.verifyToken(token);
    return userInfo.isValid;
}

inline void sendUnauthorized(http::response<http::string_body>& res, const std::string& message) {
    res.result(http::status::unauthorized);
    res.set(http::field::content_type, "application/json");
    boost::json::object error;
    error["error"] = message;
    res.body() = boost::json::serialize(error);
    res.prepare_payload();
}

inline void sendForbidden(http::response<http::string_body>& res, const std::string& message) {
    res.result(http::status::forbidden);
    res.set(http::field::content_type, "application/json");
    boost::json::object error;
    error["error"] = message;
    res.body() = boost::json::serialize(error);
    res.prepare_payload();
}

} // namespace auth