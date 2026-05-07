#include <boost/beast/core.hpp>
#include <boost/beast/http.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <boost/json.hpp>
#include <iostream>
#include <memory>
#include <ctime>
#include "user_service.hpp"
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

std::string extractToken(const http::request<http::string_body>& req) {
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

keycloak::UserInfo verifyAndGetUser(const http::request<http::string_body>& req) {
    std::string token = extractToken(req);
    if (token.empty()) {
        keycloak::UserInfo info;
        info.isValid = false;
        info.error = "No token provided";
        return info;
    }
    return keycloakClient->verifyToken(token);
}

// ============================================
// FUNCIÓN PARA EMITIR EVENTOS A KAFKA
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
        
        if (status_code >= 200 && status_code < 300) {
            std::cout << "[Kafka] Event emitted: " << event_type << " (SUCCESS) for user: " << email << std::endl;
        } else {
            std::cout << "[Kafka] Event emitted: " << event_type << " (FAILED) for user: " << email << std::endl;
        }
        
    } catch (const std::exception& e) {
        std::cerr << "[Kafka] Error emitting event: " << e.what() << std::endl;
    }
}

std::string getAllowedOrigin(const http::request<http::string_body>& req) {
    const std::vector<std::string> allowedOrigins = {
        "http://localhost:5173",
        "http://localhost:3000",
        "https://tu-dominio.com"
    };
    
    auto it = req.find(http::field::origin);
    if (it != req.end()) {
        std::string origin = std::string(it->value().begin(), it->value().end());
        for (const auto& allowed : allowedOrigins) {
            if (origin == allowed) return origin;
        }
    }
    
    return "http://localhost:5173";
}

void addCorsHeaders(http::response<http::string_body>& res, 
                    const http::request<http::string_body>& req) {
    std::string origin = getAllowedOrigin(req);
    
    res.set(http::field::access_control_allow_origin, origin);
    res.set(http::field::access_control_allow_methods, "GET, POST, PUT, DELETE, OPTIONS");
    res.set(http::field::access_control_allow_headers, "Content-Type, Authorization, X-Requested-With");
    res.set(http::field::access_control_allow_credentials, "true");
    res.set(http::field::access_control_max_age, "86400");
}

std::string urlDecode(const std::string& encoded) {
    std::string decoded;
    for (size_t i = 0; i < encoded.length(); ++i) {
        if (encoded[i] == '%' && i + 2 < encoded.length()) {
            std::string hex = encoded.substr(i + 1, 2);
            char ch = static_cast<char>(std::stoi(hex, nullptr, 16));
            decoded += ch;
            i += 2;
        } else if (encoded[i] == '+') {
            decoded += ' ';
        } else {
            decoded += encoded[i];
        }
    }
    return decoded;
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
        std::cout << "[REQUEST] " << req_.method_string() << " " << req_.target() << std::endl;
        if (req_.method() == http::verb::options) {
            http::response<http::string_body> res{http::status::ok, req_.version()};
            addCorsHeaders(res, req_);
            res.prepare_payload();
            write_response(res);
            return;
        }
        
        http::response<http::string_body> res{http::status::ok, req_.version()};
        res.set(http::field::server, "Auth Service");
        addCorsHeaders(res, req_);
        res.set(http::field::content_type, "application/json");
        
        try {
            std::string target(req_.target().begin(), req_.target().end());
            
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
            else if (req_.method() == http::verb::get && target == "/clients") {
                handle_get_clients(res);
            }
            else if (req_.method() == http::verb::get && target == "/roles") {
                handle_get_roles(res);
            }
            else if (req_.method() == http::verb::post && target == "/cache/invalidate") {
                handle_invalidate_cache(res);
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
                json::object error;
                error["error"] = "Not Found";
                res.body() = json::serialize(error);
            }
            
        } catch (const std::exception& e) {
            res.result(http::status::internal_server_error);
            json::object error;
            error["error"] = e.what();
            res.body() = json::serialize(error);
        }
        
        res.prepare_payload();
        write_response(res);
    }

    void handle_invalidate_cache(http::response<http::string_body>& res) {
        keycloak::UserInfo userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) {
            res.result(http::status::unauthorized);
            json::object error;
            error["error"] = "Token inválido o expirado";
            res.body() = json::serialize(error);
            return;
        }
        
        // Invalidar usando Redis directamente
        auto& redis = redis::RedisClient::getInstance();
        if (redis.isConnected()) {
            redis.del("user:id:" + userInfo.postgresId);
            redis.del("user:email:" + userInfo.email);
        }
        
        json::object response;
        response["message"] = "Cache invalidado exitosamente";
        res.result(http::status::ok);
        res.body() = json::serialize(response);
    }

    void handle_get_me(http::response<http::string_body>& res) {
        keycloak::UserInfo userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) {
            int status_code = static_cast<int>(http::status::unauthorized);
            res.result(status_code);
            json::object error;
            error["error"] = "Token inválido o expirado";
            res.body() = json::serialize(error);
            
            emitAuthEvent("get_profile_failed", "", "", status_code, 
                        {{"reason", "invalid_token"}});
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
            obj["profilePic"] = userOpt->profilePic;
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
            json::object error;
            error["error"] = "Usuario no encontrado";
            res.body() = json::serialize(error);
            
            emitAuthEvent("get_profile_failed", "", userInfo.email, status_code,
                        {{"reason", "user_not_found"}});
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
                json::object error;
                error["error"] = "clientId inválido";
                res.body() = json::serialize(error);
                
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
                json::object error;
                error["error"] = "role inválido";
                res.body() = json::serialize(error);
                
                emitAuthEvent("registration_failed", "", email, status_code,
                             {{"reason", "invalid_role"}, {"role", role}});
                return;
            }
            
            // 1. VERIFICAR SI EL EMAIL YA EXISTE EN POSTGRESQL
            auto existingUser = UserService::getInstance().getUserByEmail(email);
            if (existingUser) {
                int status_code = static_cast<int>(http::status::conflict);
                res.result(status_code);
                json::object error;
                error["error"] = "El correo ya está registrado";
                error["email"] = email;
                res.body() = json::serialize(error);
                
                emitAuthEvent("registration_failed", "", email, status_code,
                             {{"reason", "email_already_exists_in_postgres"}});
                return;
            }
            
            // 2. VERIFICAR SI EL EMAIL YA EXISTE EN KEYCLOAK
            std::string existingKeycloakId = keycloakClient->getUserIdByEmail(email);
            if (!existingKeycloakId.empty()) {
                int status_code = static_cast<int>(http::status::conflict);
                res.result(status_code);
                json::object error;
                error["error"] = "El correo ya está registrado en Keycloak";
                error["email"] = email;
                res.body() = json::serialize(error);
                
                emitAuthEvent("registration_failed", "", email, status_code,
                             {{"reason", "email_already_exists_in_keycloak"}});
                return;
            }
            
            // 3. Crear usuario en PostgreSQL
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
                json::object error;
                error["error"] = "Error guardando usuario en PostgreSQL";
                res.body() = json::serialize(error);
                
                emitAuthEvent("registration_failed", "", email, status_code,
                            {{"reason", "postgresql_error"}});
                return;
            }
            
            // 4. Registrar en Keycloak
            std::string keycloakId;
            bool keycloakOk = keycloakClient->registerUser(
                email, password, firstName, lastName, age, clientId, role, postgresId, keycloakId);
            
            if (!keycloakOk) {
                // Rollback: eliminar usuario de PostgreSQL
                UserService::getInstance().deleteUser(postgresId);
                int status_code = static_cast<int>(http::status::internal_server_error);
                res.result(status_code);
                json::object error;
                error["error"] = "Error registrando usuario en Keycloak";
                res.body() = json::serialize(error);
                
                emitAuthEvent("registration_failed", postgresId, email, status_code,
                            {{"reason", "keycloak_error"}});
                return;
            }
            
            // 5. Actualizar PostgreSQL con el keycloakId
            UserService::getInstance().updateKeycloakId(postgresId, keycloakId);
            
            // 6. Invalidar caché (por si acaso)
            
            // 7. Registro exitoso
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
            json::object error;
            error["error"] = e.what();
            res.body() = json::serialize(error);
            
            emitAuthEvent("registration_failed", "", "", status_code,
                         {{"reason", "bad_request"}, {"error", e.what()}});
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
                json::object error;
                error["error"] = "Email y password requeridos";
                res.body() = json::serialize(error);
                
                emitAuthEvent("login_failed", "", email, status_code,
                             {{"reason", "missing_credentials"}});
                return;
            }
            
            auto userOpt = UserService::getInstance().getUserByEmail(email);
            
            if (!userOpt) {
                int status_code = static_cast<int>(http::status::not_found);
                res.result(status_code);
                json::object error;
                error["error"] = "Usuario no registrado en el sistema";
                res.body() = json::serialize(error);
                
                emitAuthEvent("login_failed", "", email, status_code,
                             {{"reason", "user_not_found"}});
                return;
            }
            
            std::string clientId = userOpt->clientId;
            
            std::string refreshToken;
            std::string token = keycloakClient->login(email, password, clientId, refreshToken);
            
            if (token.empty()) {
                int status_code = static_cast<int>(http::status::unauthorized);
                res.result(status_code);
                json::object error;
                error["error"] = "Credenciales inválidas";
                res.body() = json::serialize(error);
                
                emitAuthEvent("login_failed", userOpt->id, email, status_code,
                             {{"reason", "invalid_credentials"}, {"clientId", clientId}});
                return;
            }
            
            // Login exitoso
            int status_code = static_cast<int>(http::status::ok);
            res.result(status_code);
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
            json::object error;
            error["error"] = e.what();
            res.body() = json::serialize(error);
            
            emitAuthEvent("login_failed", "", "", status_code,
                         {{"reason", "bad_request"}, {"error", e.what()}});
        }
    }

    void handle_update_me(http::response<http::string_body>& res) {
        keycloak::UserInfo userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) {
            int status_code = static_cast<int>(http::status::unauthorized);
            res.result(status_code);
            json::object error;
            error["error"] = "Token inválido o expirado";
            res.body() = json::serialize(error);
            return;
        }
        
        try {
            json::value jv = json::parse(req_.body());
            json::object& obj = jv.as_object();
            
            auto userOpt = UserService::getInstance().getUserByEmail(userInfo.email);
            if (!userOpt) {
                int status_code = static_cast<int>(http::status::not_found);
                res.result(status_code);
                json::object error;
                error["error"] = "Usuario no encontrado";
                res.body() = json::serialize(error);
                return;
            }
            
            std::string oldFirstName = userOpt->firstName;
            std::string oldLastName = userOpt->lastName;
            int oldAge = userOpt->age;
            std::string oldClientId = userOpt->clientId;
            std::string oldRole = userOpt->role;
            
            user::User updatedUser = *userOpt;
            
            if (obj.contains("firstName")) {
                updatedUser.firstName = std::string(obj.at("firstName").as_string());
            }
            if (obj.contains("lastName")) {
                updatedUser.lastName = std::string(obj.at("lastName").as_string());
            }
            if (obj.contains("age")) {
                updatedUser.age = obj.at("age").as_int64();
            }
            if (obj.contains("clientId")) {
                updatedUser.clientId = std::string(obj.at("clientId").as_string());
            }
            if (obj.contains("role")) {
                updatedUser.role = std::string(obj.at("role").as_string());
            }
            if (obj.contains("bio")) {
                updatedUser.bio = std::string(obj.at("bio").as_string());
            }
            if (obj.contains("location")) {
                updatedUser.location = std::string(obj.at("location").as_string());
            }
            if (obj.contains("website")) {
                updatedUser.website = std::string(obj.at("website").as_string());
            }
            if (obj.contains("profilePic")) {
                updatedUser.profilePic = std::string(obj.at("profilePic").as_string());
            }
            
            updatedUser.displayName = updatedUser.firstName + " " + updatedUser.lastName;
            
            bool roleChanged = (oldRole != updatedUser.role);
            bool clientChanged = (oldClientId != updatedUser.clientId);
            
            // 1. Actualizar en PostgreSQL
            bool pgOk = UserService::getInstance().updateFullProfile(userOpt->id, updatedUser);
            
            if (!pgOk) {
                res.result(http::status::internal_server_error);
                json::object error;
                error["error"] = "Error actualizando usuario en PostgreSQL";
                res.body() = json::serialize(error);
                return;
            }
            
            // 2. Actualizar atributos en Keycloak
            bool keycloakBasicOk = keycloakClient->updateUserAttributes(
                userOpt->keycloakId,
                updatedUser.firstName,
                updatedUser.lastName,
                updatedUser.age,
                updatedUser.clientId,
                updatedUser.role
            );
            
            // 3. Actualizar role-mapping si es necesario
            bool keycloakRoleOk = true;
            if (roleChanged || clientChanged) {
                keycloakRoleOk = keycloakClient->updateUserRole(
                    userOpt->keycloakId,
                    updatedUser.clientId,
                    oldRole,
                    updatedUser.role
                );
            }
            
            // 4. Invalidar caché
            
            // 5. Obtener el usuario actualizado para devolver
            auto finalUserOpt = UserService::getInstance().getUserById(userOpt->id);
            
            // 6. Respuesta
            res.result(http::status::ok);
            json::object response;
            response["message"] = "Usuario actualizado exitosamente";
            response["firstName"] = updatedUser.firstName;
            response["lastName"] = updatedUser.lastName;
            response["age"] = updatedUser.age;
            response["clientId"] = updatedUser.clientId;
            response["role"] = updatedUser.role;
            response["bio"] = updatedUser.bio;
            response["location"] = updatedUser.location;
            response["website"] = updatedUser.website;
            response["profilePic"] = updatedUser.profilePic;
            response["displayName"] = updatedUser.displayName;
            response["keycloakUpdated"] = keycloakBasicOk && keycloakRoleOk;
            response["roleChanged"] = roleChanged;
            response["clientChanged"] = clientChanged;
            
            if (finalUserOpt) {
                response["followers"] = json::array(finalUserOpt->followers.begin(), finalUserOpt->followers.end());
                response["following"] = json::array(finalUserOpt->following.begin(), finalUserOpt->following.end());
                response["createdAt"] = finalUserOpt->createdAt;
                response["updatedAt"] = finalUserOpt->updatedAt;
            }
            
            res.body() = json::serialize(response);
            
            std::cout << "✓ Perfil actualizado para: " << userInfo.email << std::endl;
            
        } catch (const std::exception& e) {
            int status_code = static_cast<int>(http::status::bad_request);
            res.result(status_code);
            json::object error;
            error["error"] = e.what();
            res.body() = json::serialize(error);
        }
    }

    void handle_delete_me(http::response<http::string_body>& res) {
        keycloak::UserInfo userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) {
            int status_code = static_cast<int>(http::status::unauthorized);
            res.result(status_code);
            json::object error;
            error["error"] = "Token inválido o expirado";
            res.body() = json::serialize(error);
            
            emitAuthEvent("delete_account_failed", "", "", status_code,
                         {{"reason", "invalid_token"}});
            return;
        }
        
        auto userOpt = UserService::getInstance().getUserByEmail(userInfo.email);
        if (!userOpt) {
            int status_code = static_cast<int>(http::status::not_found);
            res.result(status_code);
            json::object error;
            error["error"] = "Usuario no encontrado";
            res.body() = json::serialize(error);
            
            emitAuthEvent("delete_account_failed", userInfo.postgresId, userInfo.email, status_code,
                         {{"reason", "user_not_found"}});
            return;
        }
        
        bool keycloakOk = keycloakClient->deleteUser(userOpt->keycloakId);
        bool pgOk = UserService::getInstance().deleteUser(userOpt->id);
        
        if (pgOk && keycloakOk) {
            // Invalidar caché
            
            int status_code = static_cast<int>(http::status::ok);
            res.result(status_code);
            json::object response;
            response["message"] = "Usuario eliminado exitosamente";
            res.body() = json::serialize(response);
            
            emitAuthEvent("user_deleted", userOpt->id, userInfo.email, status_code,
                         {{"clientId", userOpt->clientId}, {"role", userOpt->role}});
        } else {
            int status_code = static_cast<int>(http::status::internal_server_error);
            res.result(status_code);
            json::object error;
            error["error"] = "Error eliminando usuario";
            res.body() = json::serialize(error);
            
            std::string reason = "";
            if (!keycloakOk) reason = "keycloak_delete_failed";
            if (!pgOk) reason = "postgresql_delete_failed";
            
            emitAuthEvent("delete_account_failed", userOpt->id, userInfo.email, status_code,
                         {{"reason", reason}});
        }
    }

    void handle_logout(http::response<http::string_body>& res) {
        try {
            json::value jv = json::parse(req_.body());
            json::object& obj = jv.as_object();
            
            if (!obj.contains("refreshToken")) {
                int status_code = static_cast<int>(http::status::bad_request);
                res.result(status_code);
                json::object error;
                error["error"] = "Se requiere refreshToken";
                res.body() = json::serialize(error);
                return;
            }
            
            std::string refreshToken = std::string(obj.at("refreshToken").as_string());
            
            keycloak::UserInfo userInfo = verifyAndGetUser(req_);
            if (!userInfo.isValid) {
                int status_code = static_cast<int>(http::status::unauthorized);
                res.result(status_code);
                json::object error;
                error["error"] = "Token inválido o expirado";
                res.body() = json::serialize(error);
                
                emitAuthEvent("logout_failed", "", "", status_code,
                             {{"reason", "invalid_token"}});
                return;
            }
            
            bool logoutSuccess = keycloakClient->logout(refreshToken);
            bool sessionsClosed = keycloakClient->logoutAllSessions(userInfo.id);
            
            if (logoutSuccess || sessionsClosed) {
                int status_code = static_cast<int>(http::status::ok);
                res.result(status_code);
                json::object response;
                response["message"] = "Logout exitoso - sesiones cerradas";
                response["refreshInvalidated"] = logoutSuccess;
                response["sessionsClosed"] = sessionsClosed;
                res.body() = json::serialize(response);
                
                emitAuthEvent("logout", userInfo.postgresId, userInfo.email, status_code,
                             {{"refreshInvalidated", logoutSuccess}, {"sessionsClosed", sessionsClosed}});
            } else {
                int status_code = static_cast<int>(http::status::internal_server_error);
                res.result(status_code);
                json::object error;
                error["error"] = "Error al cerrar sesión";
                res.body() = json::serialize(error);
                
                emitAuthEvent("logout_failed", userInfo.postgresId, userInfo.email, status_code,
                             {{"reason", "keycloak_logout_failed"}});
            }
            
        } catch (const std::exception& e) {
            int status_code = static_cast<int>(http::status::bad_request);
            res.result(status_code);
            json::object error;
            error["error"] = e.what();
            res.body() = json::serialize(error);
            
            emitAuthEvent("logout_failed", "", "", status_code,
                         {{"reason", "bad_request"}, {"error", e.what()}});
        }
    }

    void handle_get_user_by_email(http::response<http::string_body>& res) {
        try {
            std::string target(req_.target().begin(), req_.target().end());
            std::string prefix = "/users/by-email/";
            std::string encodedEmail = target.substr(prefix.length());
            std::string email = urlDecode(encodedEmail);
            
            auto userOpt = UserService::getInstance().getUserByEmail(email);
            
            if (!userOpt) {
                res.result(http::status::not_found);
                json::object error;
                error["error"] = "Usuario no encontrado";
                res.body() = json::serialize(error);
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
            obj["profilePic"] = userOpt->profilePic;
            obj["displayName"] = userOpt->displayName.empty() ? 
                                userOpt->firstName + " " + userOpt->lastName : 
                                userOpt->displayName;
            obj["username"] = userOpt->username.empty() ? 
                            userOpt->email.substr(0, userOpt->email.find('@')) : 
                            userOpt->username;
            obj["followers"] = json::array(userOpt->followers.begin(), userOpt->followers.end());
            obj["following"] = json::array(userOpt->following.begin(), userOpt->following.end());
            obj["createdAt"] = userOpt->createdAt;
            
            res.result(http::status::ok);
            res.body() = json::serialize(obj);
            
        } catch (const std::exception& e) {
            res.result(http::status::bad_request);
            json::object error;
            error["error"] = e.what();
            res.body() = json::serialize(error);
        }
    }

    void handle_follow_user(http::response<http::string_body>& res) {
        keycloak::UserInfo userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) {
            res.result(http::status::unauthorized);
            json::object error;
            error["error"] = "Token inválido";
            res.body() = json::serialize(error);
            return;
        }
        
        try {
            json::value jv = json::parse(req_.body());
            json::object& obj = jv.as_object();
            
            std::string targetUserId = std::string(obj.at("userId").as_string());
            
            auto currentUser = UserService::getInstance().getUserByEmail(userInfo.email);
            if (!currentUser) {
                res.result(http::status::not_found);
                json::object error;
                error["error"] = "Usuario no encontrado";
                res.body() = json::serialize(error);
                return;
            }
            
            bool success = UserService::getInstance().followUser(currentUser->id, targetUserId);
            
            if (success) {
                // Invalidar caché de ambos usuarios
                
                res.result(http::status::ok);
                json::object response;
                response["message"] = "Followed successfully";
                res.body() = json::serialize(response);
            } else {
                res.result(http::status::internal_server_error);
                json::object error;
                error["error"] = "Error following user";
                res.body() = json::serialize(error);
            }
        } catch (const std::exception& e) {
            res.result(http::status::bad_request);
            json::object error;
            error["error"] = e.what();
            res.body() = json::serialize(error);
        }
    }

    void handle_unfollow_user(http::response<http::string_body>& res) {
        keycloak::UserInfo userInfo = verifyAndGetUser(req_);
        if (!userInfo.isValid) {
            res.result(http::status::unauthorized);
            json::object error;
            error["error"] = "Token inválido";
            res.body() = json::serialize(error);
            return;
        }
        
        try {
            json::value jv = json::parse(req_.body());
            json::object& obj = jv.as_object();
            
            std::string targetUserId = std::string(obj.at("userId").as_string());
            
            auto currentUser = UserService::getInstance().getUserByEmail(userInfo.email);
            if (!currentUser) {
                res.result(http::status::not_found);
                json::object error;
                error["error"] = "Usuario no encontrado";
                res.body() = json::serialize(error);
                return;
            }
            
            bool success = UserService::getInstance().unfollowUser(currentUser->id, targetUserId);
            
            if (success) {
                // Invalidar caché de ambos usuarios
                
                res.result(http::status::ok);
                json::object response;
                response["message"] = "Unfollowed successfully";
                res.body() = json::serialize(response);
            } else {
                res.result(http::status::internal_server_error);
                json::object error;
                error["error"] = "Error unfollowing user";
                res.body() = json::serialize(error);
            }
        } catch (const std::exception& e) {
            res.result(http::status::bad_request);
            json::object error;
            error["error"] = e.what();
            res.body() = json::serialize(error);
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
                userObj["profilePic"] = user.profilePic;
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
            json::object error;
            error["error"] = e.what();
            res.body() = json::serialize(error);
        }
    }

    void handle_refresh_token(http::response<http::string_body>& res) {
        try {
            json::value jv = json::parse(req_.body());
            json::object& obj = jv.as_object();
            
            if (!obj.contains("refreshToken")) {
                res.result(http::status::bad_request);
                json::object error;
                error["error"] = "Refresh token required";
                res.body() = json::serialize(error);
                return;
            }
            
            std::string refreshToken = std::string(obj.at("refreshToken").as_string());
            
            // ============================================
            // Obtener clientId
            // ============================================
            std::string clientId;
            
            // 1. Intentar obtener del body
            if (obj.contains("clientId")) {
                clientId = std::string(obj.at("clientId").as_string());
            }
            
            // 2. Si no viene en el body, intentar extraer del token actual
            if (clientId.empty()) {
                keycloak::UserInfo userInfo = verifyAndGetUser(req_);
                if (userInfo.isValid && !userInfo.clientId.empty()) {
                    clientId = userInfo.clientId;
                }
            }
            
            // 3. Si aún no tenemos clientId, buscar en BD por email
            if (clientId.empty()) {
                std::string token = extractToken(req_);
                if (!token.empty()) {
                    auto userInfo = keycloakClient->verifyToken(token);
                    if (!userInfo.email.empty()) {
                        auto userOpt = UserService::getInstance().getUserByEmail(userInfo.email);
                        if (userOpt) {
                            clientId = userOpt->clientId;
                        }
                    }
                }
            }
            
            // 4. Si no se encontró clientId, devolver error
            if (clientId.empty()) {
                res.result(http::status::bad_request);
                json::object error;
                error["error"] = "No se pudo determinar el clientId";
                error["detail"] = "Incluye 'clientId' en el body";
                res.body() = json::serialize(error);
                return;
            }
            
            // ============================================
            // Obtener client_secret correspondiente
            // ============================================
            std::string clientSecret;
            
            if (clientId == "alcaldia-duitama") {
                const char* env = std::getenv("CLIENT_ALCALDIA_DUITAMA_SECRET");
                clientSecret = env ? env : "duitama-secret-2024";
            } else if (clientId == "alcaldia-sogamoso") {
                const char* env = std::getenv("CLIENT_ALCALDIA_SOGAMOSO_SECRET");
                clientSecret = env ? env : "sogamoso-secret-2024";
            } else if (clientId == "alcaldia-tunja") {
                const char* env = std::getenv("CLIENT_ALCALDIA_TUNJA_SECRET");
                clientSecret = env ? env : "tunja-secret-2024";
            } else {
                res.result(http::status::bad_request);
                json::object error;
                error["error"] = "Client ID no soportado";
                error["detail"] = "Client ID: " + clientId;
                res.body() = json::serialize(error);
                return;
            }
            
            std::cout << "[Refresh] client_id=" << clientId << " secret=" << std::string(clientSecret.length(), '*') << std::endl;
            
            // ============================================
            // Llamar a Keycloak para refrescar token
            // ============================================
            const char* keycloakRealm = std::getenv("KEYCLOAK_REALM");
            std::string realm = keycloakRealm ? keycloakRealm : "yung-accountant";
            
            std::stringstream ss;
            ss << "client_id=" << clientId
            << "&client_secret=" << clientSecret
            << "&grant_type=refresh_token"
            << "&refresh_token=" << refreshToken;
            
            std::string response = keycloakClient->httpPost(
                "/realms/" + realm + "/protocol/openid-connect/token", 
                ss.str()
            );
            
            std::cout << "[Refresh] Response: " << response.substr(0, 100) << "..." << std::endl;
            
            json::value jvResponse = json::parse(response);
            auto& resObj = jvResponse.as_object();
            
            if (resObj.contains("access_token")) {
                json::object result;
                result["token"] = resObj.at("access_token").as_string();
                
                if (resObj.contains("refresh_token")) {
                    result["refreshToken"] = resObj.at("refresh_token").as_string();
                } else {
                    result["refreshToken"] = refreshToken;
                }
                
                if (resObj.contains("expires_in")) {
                    result["expiresIn"] = resObj.at("expires_in");
                }
                
                result["clientId"] = clientId;
                
                res.result(http::status::ok);
                res.body() = json::serialize(result);
                
                std::cout << "✓ Token refreshed successfully for client: " << clientId << std::endl;
            } else {
                std::string errorDesc = "Unknown error";
                if (resObj.contains("error_description")) {
                    errorDesc = resObj.at("error_description").as_string();
                } else if (resObj.contains("error")) {
                    errorDesc = resObj.at("error").as_string();
                }
                
                res.result(http::status::unauthorized);
                json::object error;
                error["error"] = "Invalid refresh token";
                error["detail"] = errorDesc;
                res.body() = json::serialize(error);
                
                std::cerr << "[Refresh] Failed: " << errorDesc << std::endl;
            }
            
        } catch (const std::exception& e) {
            res.result(http::status::bad_request);
            json::object error;
            error["error"] = e.what();
            res.body() = json::serialize(error);
            
            std::cerr << "[Refresh] Exception: " << e.what() << std::endl;
        }
    }


    void handle_get_clients(http::response<http::string_body>& res) {
        json::array clientsArray;
        
        json::object client1;
        client1["id"] = "alcaldia-duitama";
        client1["name"] = "Alcaldía de Duitama";
        client1["description"] = "Municipio de Duitama, Boyacá";
        clientsArray.push_back(client1);
        
        json::object client2;
        client2["id"] = "alcaldia-sogamoso";
        client2["name"] = "Alcaldía de Sogamoso";
        client2["description"] = "Municipio de Sogamoso, Boyacá";
        clientsArray.push_back(client2);
        
        json::object client3;
        client3["id"] = "alcaldia-tunja";
        client3["name"] = "Alcaldía de Tunja";
        client3["description"] = "Municipio de Tunja, Boyacá";
        clientsArray.push_back(client3);
        
        res.result(http::status::ok);
        res.body() = json::serialize(clientsArray);
    }

    void handle_get_roles(http::response<http::string_body>& res) {
        json::array rolesArray;
        
        json::object role1;
        role1["id"] = "estudiante";
        role1["name"] = "Estudiante";
        role1["description"] = "Estudiante de instituciones educativas";
        rolesArray.push_back(role1);
        
        json::object role2;
        role2["id"] = "ama-de-casa";
        role2["name"] = "Ama de Casa";
        role2["description"] = "Trabajo del hogar";
        rolesArray.push_back(role2);
        
        json::object role3;
        role3["id"] = "trabajador";
        role3["name"] = "Trabajador";
        role3["description"] = "Trabajador independiente o asalariado";
        rolesArray.push_back(role3);
        
        res.result(http::status::ok);
        res.body() = json::serialize(rolesArray);
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
        std::cout << "Auth Service listening on " << address << ":" << port << std::endl;
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
        const char* portEnv = std::getenv("SERVER_PORT");
        unsigned short port = portEnv ? std::stoi(portEnv) : 8080;
        
        const char* keycloakUrl = std::getenv("KEYCLOAK_URL");
        const char* keycloakRealm = std::getenv("KEYCLOAK_REALM");
        
        if (!keycloakUrl) keycloakUrl = "http://keycloak:8080";
        if (!keycloakRealm) keycloakRealm = "yung-accountant";
        
        keycloakClient = std::make_unique<keycloak::KeycloakClient>(keycloakUrl, keycloakRealm);
        
        // Configuración de PostgreSQL
        const char* pgHost = std::getenv("POSTGRES_HOST");
        const char* pgPort = std::getenv("POSTGRES_PORT");
        const char* pgUser = std::getenv("POSTGRES_USER");
        const char* pgPassword = std::getenv("POSTGRES_PASSWORD");
        const char* pgDatabase = std::getenv("POSTGRES_DB");
        
        
        std::cout << "Connecting to PostgreSQL: " << pgHost << ":" << pgPort << " db=" << pgDatabase << std::endl;
        
        bool dbConnected = Database::getInstance().connect(
            pgHost,
            std::stoi(pgPort),
            pgDatabase,
            pgUser,
            pgPassword
        );
        
        if (!dbConnected) {
            std::cerr << "Failed to connect to PostgreSQL database. Exiting..." << std::endl;
            return 1;
        }
        
        // Conexión a Redis
        const char* redisHost = std::getenv("REDIS_HOST");
        const char* redisPort = std::getenv("REDIS_PORT");
        const char* redisPassword = std::getenv("REDIS_PASSWORD");
        
        if (!redisHost) redisHost = "redis";
        if (!redisPort) redisPort = "6379";
        
        std::cout << "Connecting to Redis: " << redisHost << ":" << redisPort << std::endl;
        
        auto& redis = redis::RedisClient::getInstance();
        if (!redis.connect(redisHost, std::stoi(redisPort), redisPassword ? redisPassword : "")) {
            std::cerr << "Warning: Failed to connect to Redis. Continuing without cache..." << std::endl;
        }
        
        // Inicializar Kafka
        const char* kafkaBroker = std::getenv("KAFKA_BROKER");
        if (!kafkaBroker) kafkaBroker = "kafka:9092";
        
        std::cout << "[Kafka] Initializing Kafka producer with broker: " << kafkaBroker << std::endl;
        kafka::getProducer(); 
        
        std::cout << "Auth Service listening on 0.0.0.0:" << port << std::endl;
        std::cout << "Redis cache: " << (redis.isConnected() ? "enabled" : "disabled") << std::endl;
        
        HttpServer server("0.0.0.0", port);
        server.run();
        
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }
    
    return 0;
}