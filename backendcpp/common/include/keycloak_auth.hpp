#pragma once

#include <string>
#include <vector>
#include <boost/json.hpp>

namespace keycloak {

struct UserInfo {
    std::string id;          // UUID de Keycloak
    std::string postgresId;  // ID en PostgreSQL
    std::string username;
    std::string email;
    std::string firstName;
    std::string lastName;
    std::string clientId;
    std::string role;
    int age = 0;
    std::vector<std::string> roles;
    bool isValid = false;
    std::string error;
};

class KeycloakClient {
public:
    KeycloakClient(const std::string& keycloakUrl, const std::string& realm);
    
    UserInfo verifyToken(const std::string& token);
    
    // HTTP helpers
    std::string httpPost(const std::string& endpoint, const std::string& data);
    std::string httpGet(const std::string& endpoint, const std::string& token);
    
    // Getters
    std::string getClientSecret(const std::string& clientId);
    
private:
    std::string keycloakUrl_;
    std::string realm_;
};

} // namespace keycloak