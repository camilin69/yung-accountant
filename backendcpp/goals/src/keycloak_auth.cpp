#include "keycloak_auth.hpp"
#include <iostream>
#include <sstream>
#include <curl/curl.h>
#include <boost/json.hpp>

namespace keycloak {
namespace json = boost::json;

std::string getEnv(const std::string& key, const std::string& defaultValue = "") {
    const char* val = std::getenv(key.c_str());
    return val ? std::string(val) : defaultValue;
}

size_t WriteCallback(void* contents, size_t size, size_t nmemb, std::string* output) {
    size_t total = size * nmemb;
    output->append((char*)contents, total);
    return total;
}

KeycloakClient::KeycloakClient(const std::string& keycloakUrl, const std::string& realm)
    : keycloakUrl_(keycloakUrl), realm_(realm) {
    std::cout << "KeycloakClient initialized: " << keycloakUrl_ << "/realms/" << realm_ << std::endl;
}

std::string KeycloakClient::getClientSecret(const std::string& clientId) {
    if (clientId == "alcaldia-duitama") {
        return getEnv("CLIENT_ALCALDIA_DUITAMA_SECRET", "duitama-secret-2024");
    } else if (clientId == "alcaldia-sogamoso") {
        return getEnv("CLIENT_ALCALDIA_SOGAMOSO_SECRET", "sogamoso-secret-2024");
    } else if (clientId == "alcaldia-tunja") {
        return getEnv("CLIENT_ALCALDIA_TUNJA_SECRET", "tunja-secret-2024");
    }
    return "";
}

std::string KeycloakClient::httpPost(const std::string& endpoint, const std::string& data) {
    CURL* curl = curl_easy_init();
    if (!curl) return "";
    
    std::string url = keycloakUrl_ + endpoint;
    std::string response;
    
    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, data.c_str());
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 10L);
    
    CURLcode res = curl_easy_perform(curl);
    if (res != CURLE_OK) {
        std::cerr << "CURL POST error: " << curl_easy_strerror(res) << std::endl;
    }
    
    curl_easy_cleanup(curl);
    return response;
}

std::string KeycloakClient::httpGet(const std::string& endpoint, const std::string& token) {
    CURL* curl = curl_easy_init();
    if (!curl) return "";
    
    std::string url = keycloakUrl_ + endpoint;
    std::string response;
    struct curl_slist* headers = nullptr;
    
    if (!token.empty()) {
        std::string authHeader = "Authorization: Bearer " + token;
        headers = curl_slist_append(headers, authHeader.c_str());
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    }
    
    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 10L);
    
    curl_easy_perform(curl);
    curl_easy_cleanup(curl);
    
    if (headers) curl_slist_free_all(headers);
    
    return response;
}

std::string KeycloakClient::getAdminToken() {
    std::stringstream ss;
    ss << "client_id=admin-cli"
       << "&grant_type=password"
       << "&username=admin"
       << "&password=admin123";
    
    std::string response = httpPost("/realms/master/protocol/openid-connect/token", ss.str());
    
    try {
        json::value jv = json::parse(response);
        if (jv.as_object().contains("access_token")) {
            return std::string(jv.as_object().at("access_token").as_string());
        }
    } catch (const std::exception& e) {
        std::cerr << "Error getting admin token: " << e.what() << std::endl;
    }
    
    return "";
}

UserInfo KeycloakClient::verifyToken(const std::string& token) {
    UserInfo info;
    info.isValid = false;
    
    std::string cleanToken = token;
    if (cleanToken.find("Bearer ") == 0) {
        cleanToken = cleanToken.substr(7);
    }
    
    // Probar con cada cliente
    std::vector<std::string> clients = {"alcaldia-duitama", "alcaldia-sogamoso", "alcaldia-tunja"};
    
    for (const auto& clientId : clients) {
        std::string clientSecret = getClientSecret(clientId);
        if (clientSecret.empty()) continue;
        
        std::stringstream ss;
        ss << "client_id=" << clientId
           << "&client_secret=" << clientSecret
           << "&token=" << cleanToken;
        
        std::string response = httpPost("/realms/" + realm_ + "/protocol/openid-connect/token/introspect", ss.str());
        
        try {
            json::value jv = json::parse(response);
            auto& obj = jv.as_object();
            
            if (obj.contains("active") && obj.at("active").as_bool()) {
                info.isValid = true;
                info.clientId = clientId;
                
                // Campos principales
                if (obj.contains("sub")) info.id = std::string(obj.at("sub").as_string());
                if (obj.contains("email")) info.email = std::string(obj.at("email").as_string());
                if (obj.contains("preferred_username")) info.username = std::string(obj.at("preferred_username").as_string());
                if (obj.contains("given_name")) info.firstName = std::string(obj.at("given_name").as_string());
                if (obj.contains("family_name")) info.lastName = std::string(obj.at("family_name").as_string());
                
                // Extraer mongoId de los atributos (Keycloak los pone en "attributes")
                if (obj.contains("attributes")) {
                    auto& attrs = obj.at("attributes").as_object();
                    
                    if (attrs.contains("mongoId")) {
                        auto& mongoIdArray = attrs.at("mongoId").as_array();
                        if (mongoIdArray.size() > 0) {
                            info.mongoId = std::string(mongoIdArray[0].as_string());
                        }
                    }
                    if (attrs.contains("age")) {
                        auto& ageArray = attrs.at("age").as_array();
                        if (ageArray.size() > 0) {
                            try {
                                info.age = std::stoi(std::string(ageArray[0].as_string()));
                            } catch (...) {}
                        }
                    }
                    if (attrs.contains("clientId")) {
                        auto& clientIdArray = attrs.at("clientId").as_array();
                        if (clientIdArray.size() > 0) {
                            info.clientId = std::string(clientIdArray[0].as_string());
                        }
                    }
                    if (attrs.contains("role")) {
                        auto& roleArray = attrs.at("role").as_array();
                        if (roleArray.size() > 0) {
                            info.role = std::string(roleArray[0].as_string());
                        }
                    }
                }
                
                // Si no encontró mongoId en attributes, intentar directamente
                if (info.mongoId.empty() && obj.contains("mongoId")) {
                    info.mongoId = std::string(obj.at("mongoId").as_string());
                }
                if (info.role.empty() && obj.contains("role")) {
                    info.role = std::string(obj.at("role").as_string());
                }
                
                // Roles del realm
                if (obj.contains("realm_access")) {
                    auto& realmAccess = obj.at("realm_access").as_object();
                    if (realmAccess.contains("roles")) {
                        for (const auto& role : realmAccess.at("roles").as_array()) {
                            info.roles.push_back(std::string(role.as_string()));
                        }
                    }
                }
                
                std::cout << "✓ Token válido para: " << info.email 
                          << " | mongoId: " << info.mongoId 
                          << " | role: " << info.role 
                          << " | clientId: " << info.clientId << std::endl;
                return info;
            }
        } catch (const std::exception& e) {
            std::cerr << "Error parsing introspection response: " << e.what() << std::endl;
            continue;
        }
    }
    
    info.error = "Token inválido o expirado";
    return info;
}

} // namespace keycloak