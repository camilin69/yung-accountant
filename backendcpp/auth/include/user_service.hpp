#pragma once

#include <string>
#include <vector>
#include <optional>
#include <bsoncxx/oid.hpp>
#include <bsoncxx/document/value.hpp>

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
    
    bsoncxx::document::value toBson() const;
    static User fromBson(const bsoncxx::document::view& doc);
};

class UserService {
public:
    static UserService& getInstance();
    
    bool createUser(const User& user, std::string& userId);
    std::optional<User> getUserById(const std::string& id);
    std::optional<User> getUserByEmail(const std::string& email);
    std::optional<User> getUserByKeycloakId(const std::string& keycloakId);
    std::vector<User> getAllUsers();
    bool updateUser(const std::string& id, const std::string& firstName, 
                    const std::string& lastName, int age);
    bool deleteUser(const std::string& id);
    bool updateKeycloakId(const std::string& id, const std::string& keycloakId);
    
private:
    UserService() = default;
    static std::optional<bsoncxx::oid> parseObjectId(const std::string& id);
};