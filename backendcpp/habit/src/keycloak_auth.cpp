#include "keycloak_auth.hpp"
#include <iostream>
#include <sstream>
#include <curl/curl.h>
#include <boost/json.hpp>

namespace keycloak {
namespace json = boost::json;

size_t WriteCallback(void* contents, size_t size, size_t nmemb, std::string* output) {
    size_t total = size * nmemb;
    output->append((char*)contents, total);
    return total;
}

KeycloakClient::KeycloakClient(const std::string& keycloakUrl, const std::string& realm)
    : keycloakUrl_(keycloakUrl), realm_(realm) {
    std::cout << "KeycloakClient initialized: " << keycloakUrl_ << "/realms/" << realm_ << std::endl;
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

std::string KeycloakClient::getClientSecret(const std::string& clientId) {
    if (clientId == "alcaldia-duitama") {
        const char* secret = std::getenv("CLIENT_ALCALDIA_DUITAMA_SECRET");
        return secret ? secret : "duitama-secret-2024";
    } else if (clientId == "alcaldia-sogamoso") {
        const char* secret = std::getenv("CLIENT_ALCALDIA_SOGAMOSO_SECRET");
        return secret ? secret : "sogamoso-secret-2024";
    } else if (clientId == "alcaldia-tunja") {
        const char* secret = std::getenv("CLIENT_ALCALDIA_TUNJA_SECRET");
        return secret ? secret : "tunja-secret-2024";
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
                
                if (obj.contains("postgresId")) {
                    info.postgresId = std::string(obj.at("postgresId").as_string());
                }
                if (obj.contains("age")) {
                    try {
                        info.age = std::stoi(std::string(obj.at("age").as_string()));
                    } catch (...) {
                        info.age = 0;
                    }
                }
                if (obj.contains("clientId")) {
                    info.clientId = std::string(obj.at("clientId").as_string());
                }
                if (obj.contains("role")) {
                    info.role = std::string(obj.at("role").as_string());
                }
                
                std::cout << "✓ Token válido para: " << info.email 
                          << " | postgresId: " << info.postgresId
                          << " | role: " << info.role << std::endl;
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