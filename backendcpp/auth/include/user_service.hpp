// user_service.hpp
#pragma once

#include <string>
#include <vector>
#include <optional>
#include <pqxx/pqxx>

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
    bool updateFullProfile(const std::string& id, const User& user);
    bool updateKeycloakId(const std::string& id, const std::string& keycloakId);
    bool deleteUser(const std::string& id);
    bool followUser(const std::string& userId, const std::string& targetUserId);
    bool unfollowUser(const std::string& userId, const std::string& targetUserId);
    
private:
    UserService() = default;
    
    User rowToUser(const pqxx::row& row);
    std::vector<std::string> parseArrayFromDB(const std::string& arrayStr);
};