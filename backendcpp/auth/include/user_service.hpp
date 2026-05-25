#pragma once

#include <string>
#include <vector>
#include <optional>
#include <pqxx/pqxx>
#include <boost/json.hpp>
#include <shared_mutex>

namespace user {
    struct User {
        std::string id;
        std::string email;
        std::string firstName;
        std::string lastName;
        int age;
        std::string clientId;
        std::string role;
        std::string keycloakId;
        std::string createdAt;
        std::string updatedAt;
        
        std::string profilePic;
        std::string username;
        std::string displayName;
        std::string bio;
        std::string location;
        std::string website;
        std::string plan;
        
        std::vector<std::string> followers;
        std::vector<std::string> following;
    };
}

// ============================================
// CONSTANTES DE SETS PARA CACHÉ
// ============================================
namespace CacheSets {
    constexpr const char* USERS_LIST = "auth:set:users:list";
    constexpr const char* USERS_ID = "auth:set:users:id";
    constexpr const char* USERS_EMAIL = "auth:set:users:email";
    constexpr const char* USERS_KEYCLOAK = "auth:set:users:keycloak";
}

class UserService {
public:
    static UserService& getInstance();
    
    // CRUD
    bool createUser(const user::User& user, std::string& userId);
    std::optional<user::User> getUserById(const std::string& id);
    std::optional<user::User> getUserByEmail(const std::string& email);
    std::optional<user::User> getUserByUsername(const std::string& username);
    std::optional<user::User> getUserByKeycloakId(const std::string& keycloakId);
    std::vector<user::User> getAllUsers();
    bool updateUser(const std::string& id, const std::string& firstName, 
                    const std::string& lastName, int age);
    bool updateFullProfile(const std::string& id, const user::User& user);
    bool updateKeycloakId(const std::string& id, const std::string& keycloakId);
    bool deleteUser(const std::string& id);
    
    // Social
    bool followUser(const std::string& userId, const std::string& targetUserId);
    bool unfollowUser(const std::string& userId, const std::string& targetUserId);
    
    // Cache
    void invalidateUserCache(const std::string& userId);
    void invalidateUserCacheByEmail(const std::string& email);
    void invalidateUsersListCache();
    
    // Cache keys
    std::string getUserCacheKey(const std::string& userId);
    std::string getUserEmailCacheKey(const std::string& email);
    std::string getKeycloakUserCacheKey(const std::string& keycloakId);
    
    // Serialization
    std::string userToJson(const user::User& u);
    user::User jsonToUser(const std::string& json);
    
private:
    UserService() = default;
    UserService(const UserService&) = delete;
    UserService& operator=(const UserService&) = delete;
    
    mutable std::shared_mutex cache_mutex_;
    
    // Row mapper
    user::User rowToUser(const pqxx::row& row);
    
    // Cache helpers
    void cacheWithTracking(const std::string& key, const std::string& value,
                          const std::string& setKey, int ttl = 300);
    void invalidateBySet(const std::string& setKey, const std::string& pattern = "");
    
    // Serialization helpers
    std::string vectorToJsonArray(const std::vector<std::string>& vec);
    std::vector<std::string> jsonArrayToVector(const boost::json::array& arr);
};

// Helpers inline
inline std::string makeDisplayName(const std::string& firstName, const std::string& lastName) {
    if (firstName.empty() && lastName.empty()) return "";
    return firstName + " " + lastName;
}

inline std::string makeDefaultUsername(const std::string& email) {
    if (email.empty()) return "";
    return email.substr(0, email.find('@'));
}