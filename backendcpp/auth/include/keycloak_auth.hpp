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
    
    // Auth methods
    std::string login(const std::string& email, 
                      const std::string& password,
                      const std::string& clientId,
                      std::string& refreshToken);
    
    bool registerUser(const std::string& email,
                      const std::string& password,
                      const std::string& firstName,
                      const std::string& lastName,
                      int age,
                      const std::string& clientId,
                      const std::string& role,
                      const std::string& postgresId,
                      std::string& keycloakId);
    
    UserInfo verifyToken(const std::string& token);

    bool updateUserAttributes(const std::string& keycloakId,
                              const std::string& firstName,
                              const std::string& lastName,
                              int age,
                              const std::string& clientId,
                              const std::string& role);
    
    bool updateUserRole(const std::string& keycloakId,
                        const std::string& clientId,
                        const std::string& oldRole,
                        const std::string& newRole);
    
    bool logout(const std::string& refreshToken);
    bool logoutAllSessions(const std::string& userId);
    bool deleteUser(const std::string& keycloakId);
    std::string getRefreshToken(const std::string& email, const std::string& clientId);
    std::string getUserIdByEmail(const std::string& email);
    
    // HTTP helpers
    std::string httpPost(const std::string& endpoint, const std::string& data);
    std::string httpPostWithAuth(const std::string& endpoint, const std::string& data, const std::string& token);
    std::string httpGet(const std::string& endpoint, const std::string& token);
    std::string httpPut(const std::string& endpoint, const std::string& data, const std::string& token);
    std::string httpDelete(const std::string& endpoint, const std::string& token);
    
private:
    std::string keycloakUrl_;
    std::string realm_;

    // Admin helpers
    std::string getAdminToken();
    std::string getClientUuid(const std::string& clientId, const std::string& adminToken);
    std::string getRoleUuid(const std::string& clientUuid, const std::string& roleName, const std::string& adminToken);
    void assignRole(const std::string& userId, const std::string& clientUuid, const std::string& roleUuid, const std::string& adminToken);
    
    std::string getClientSecret(const std::string& clientId);
};

} // namespace keycloak