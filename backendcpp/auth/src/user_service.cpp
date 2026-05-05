// user_service.cpp
#include "user_service.hpp"
#include "database.hpp"
#include <pqxx/pqxx>
#include <iostream>
#include <ctime>
#include <sstream>
#include <algorithm>

UserService& UserService::getInstance() {
    static UserService instance;
    return instance;
}

User UserService::rowToUser(const pqxx::row& row) {
    User user;
    
    // Convertir UUID a string
    if (!row["id"].is_null()) {
        user.id = row["id"].as<std::string>();
    }
    
    if (!row["email"].is_null()) {
        user.email = row["email"].as<std::string>();
    }
    
    if (!row["first_name"].is_null()) {
        user.firstName = row["first_name"].as<std::string>();
    }
    
    if (!row["last_name"].is_null()) {
        user.lastName = row["last_name"].as<std::string>();
    }
    
    if (!row["age"].is_null()) {
        user.age = row["age"].as<int>();
    }
    
    if (!row["client_id"].is_null()) {
        user.clientId = row["client_id"].as<std::string>();
    }
    
    if (!row["role"].is_null()) {
        user.role = row["role"].as<std::string>();
    }
    
    if (!row["keycloak_id"].is_null()) {
        user.keycloakId = row["keycloak_id"].as<std::string>();
    }
    
    if (!row["profile_pic"].is_null()) {
        user.profilePic = row["profile_pic"].as<std::string>();
    }
    
    if (!row["username"].is_null()) {
        user.username = row["username"].as<std::string>();
    }
    
    if (!row["display_name"].is_null()) {
        user.displayName = row["display_name"].as<std::string>();
    } else if (!user.firstName.empty() && !user.lastName.empty()) {
        user.displayName = user.firstName + " " + user.lastName;
    }
    
    if (!row["bio"].is_null()) {
        user.bio = row["bio"].as<std::string>();
    }
    
    if (!row["location"].is_null()) {
        user.location = row["location"].as<std::string>();
    }
    
    if (!row["website"].is_null()) {
        user.website = row["website"].as<std::string>();
    }
    
    if (!row["plan"].is_null()) {
        user.plan = row["plan"].as<std::string>();
    }
    
    if (!row["created_at"].is_null()) {
        user.createdAt = row["created_at"].as<std::string>();
    }
    
    if (!row["updated_at"].is_null()) {
        user.updatedAt = row["updated_at"].as<std::string>();
    }
    
    // Parsear arrays de PostgreSQL
    if (!row["followers"].is_null()) {
        std::string followersStr = row["followers"].as<std::string>();
        user.followers = parseArrayFromDB(followersStr);
    }
    
    if (!row["following"].is_null()) {
        std::string followingStr = row["following"].as<std::string>();
        user.following = parseArrayFromDB(followingStr);
    }
    
    return user;
}

std::vector<std::string> UserService::parseArrayFromDB(const std::string& arrayStr) {
    std::vector<std::string> result;
    if (arrayStr.empty() || arrayStr == "{}") return result;
    
    // Remover llaves
    std::string content = arrayStr.substr(1, arrayStr.length() - 2);
    
    std::stringstream ss(content);
    std::string item;
    
    while (std::getline(ss, item, ',')) {
        // Limpiar comillas y espacios
        item.erase(remove(item.begin(), item.end(), '"'), item.end());
        item.erase(remove(item.begin(), item.end(), ' '), item.end());
        if (!item.empty()) {
            result.push_back(item);
        }
    }
    
    return result;
}

bool UserService::createUser(const User& user, std::string& userId) {
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        
        std::string query = "INSERT INTO users ("
            "email, first_name, last_name, age, client_id, role, "
            "keycloak_id, profile_pic, username, display_name, bio, "
            "location, website, plan, followers, following, created_at"
            ") VALUES ("
            "$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP"
            ") RETURNING id";
        
        pqxx::result result = txn.exec_params(
            query,
            user.email,
            user.firstName,
            user.lastName,
            user.age,
            user.clientId,
            user.role,
            user.keycloakId,
            user.profilePic,
            user.username,
            user.displayName.empty() ? user.firstName + " " + user.lastName : user.displayName,
            user.bio,
            user.location,
            user.website,
            user.plan.empty() ? "free" : user.plan,
            user.followers,
            user.following
        );
        
        txn.commit();
        
        if (!result.empty()) {
            userId = result[0][0].as<std::string>();
            return true;
        }
        
        return false;
    } catch (const std::exception& e) {
        std::cerr << "PostgreSQL error in createUser: " << e.what() << std::endl;
        return false;
    }
}

std::optional<User> UserService::getUserByEmail(const std::string& email) {
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        
        std::string query = "SELECT * FROM users WHERE email = $1";
        pqxx::result result = txn.exec_params(query, email);
        
        txn.commit();
        
        if (!result.empty()) {
            return rowToUser(result[0]);
        }
        
        return std::nullopt;
    } catch (const std::exception& e) {
        std::cerr << "Error in getUserByEmail: " << e.what() << std::endl;
        return std::nullopt;
    }
}

std::optional<User> UserService::getUserById(const std::string& id) {
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        
        std::string query = "SELECT * FROM users WHERE id = $1::uuid";
        pqxx::result result = txn.exec_params(query, id);
        
        txn.commit();
        
        if (!result.empty()) {
            return rowToUser(result[0]);
        }
        
        return std::nullopt;
    } catch (const std::exception& e) {
        std::cerr << "Error in getUserById: " << e.what() << std::endl;
        return std::nullopt;
    }
}

std::optional<User> UserService::getUserByKeycloakId(const std::string& keycloakId) {
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        
        std::string query = "SELECT * FROM users WHERE keycloak_id = $1";
        pqxx::result result = txn.exec_params(query, keycloakId);
        
        txn.commit();
        
        if (!result.empty()) {
            return rowToUser(result[0]);
        }
        
        return std::nullopt;
    } catch (const std::exception& e) {
        std::cerr << "Error in getUserByKeycloakId: " << e.what() << std::endl;
        return std::nullopt;
    }
}

std::vector<User> UserService::getAllUsers() {
    std::vector<User> users;
    
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        
        std::string query = "SELECT * FROM users ORDER BY created_at DESC";
        pqxx::result result = txn.exec(query);
        
        txn.commit();
        
        for (const auto& row : result) {
            users.push_back(rowToUser(row));
        }
    } catch (const std::exception& e) {
        std::cerr << "Error in getAllUsers: " << e.what() << std::endl;
    }
    
    return users;
}

bool UserService::updateUser(const std::string& id, const std::string& firstName, 
                              const std::string& lastName, int age) {
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        
        std::string displayName = firstName + " " + lastName;
        
        std::string query = "UPDATE users SET "
            "first_name = $1, last_name = $2, age = $3, "
            "display_name = $4, updated_at = CURRENT_TIMESTAMP "
            "WHERE id = $5::uuid";
        
        pqxx::result result = txn.exec_params(
            query, firstName, lastName, age, displayName, id
        );
        
        txn.commit();
        
        return result.affected_rows() > 0;
    } catch (const std::exception& e) {
        std::cerr << "Error in updateUser: " << e.what() << std::endl;
        return false;
    }
}

bool UserService::updateFullProfile(const std::string& id, const User& userData) {
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        
        std::string displayName = userData.firstName + " " + userData.lastName;
        
        std::string query = "UPDATE users SET "
            "first_name = $1, last_name = $2, age = $3, "
            "client_id = $4, role = $5, display_name = $6, "
            "bio = $7, location = $8, website = $9, profile_pic = $10, "
            "updated_at = CURRENT_TIMESTAMP "
            "WHERE id = $11::uuid";
        
        pqxx::result result = txn.exec_params(
            query,
            userData.firstName,
            userData.lastName,
            userData.age,
            userData.clientId,
            userData.role,
            displayName,
            userData.bio,
            userData.location,
            userData.website,
            userData.profilePic,
            id
        );
        
        txn.commit();
        
        if (result.affected_rows() > 0) {
            std::cout << "✓ Usuario actualizado en PostgreSQL: " << id << std::endl;
            std::cout << "  - firstName: " << userData.firstName << std::endl;
            std::cout << "  - lastName: " << userData.lastName << std::endl;
            std::cout << "  - displayName: " << displayName << std::endl;
            return true;
        }
        
        return false;
    } catch (const std::exception& e) {
        std::cerr << "Error in updateFullProfile: " << e.what() << std::endl;
        return false;
    }
}

bool UserService::updateKeycloakId(const std::string& id, const std::string& keycloakId) {
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        
        std::string query = "UPDATE users SET keycloak_id = $1 WHERE id = $2::uuid";
        pqxx::result result = txn.exec_params(query, keycloakId, id);
        
        txn.commit();
        
        return result.affected_rows() > 0;
    } catch (const std::exception& e) {
        std::cerr << "Error in updateKeycloakId: " << e.what() << std::endl;
        return false;
    }
}

bool UserService::deleteUser(const std::string& id) {
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        
        std::string query = "DELETE FROM users WHERE id = $1::uuid";
        pqxx::result result = txn.exec_params(query, id);
        
        txn.commit();
        
        return result.affected_rows() > 0;
    } catch (const std::exception& e) {
        std::cerr << "Error in deleteUser: " << e.what() << std::endl;
        return false;
    }
}

bool UserService::followUser(const std::string& userId, const std::string& targetUserId) {
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        
        // Agregar targetUserId a following del usuario actual
        std::string query1 = "UPDATE users SET following = array_append(following, $1) WHERE id = $2::uuid";
        pqxx::result result1 = txn.exec_params(query1, targetUserId, userId);
        
        // Agregar userId a followers del usuario objetivo
        std::string query2 = "UPDATE users SET followers = array_append(followers, $1) WHERE id = $2::uuid";
        pqxx::result result2 = txn.exec_params(query2, userId, targetUserId);
        
        txn.commit();
        
        return result1.affected_rows() > 0 && result2.affected_rows() > 0;
    } catch (const std::exception& e) {
        std::cerr << "Error in followUser: " << e.what() << std::endl;
        return false;
    }
}

bool UserService::unfollowUser(const std::string& userId, const std::string& targetUserId) {
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        
        // Remover targetUserId de following del usuario actual
        std::string query1 = "UPDATE users SET following = array_remove(following, $1) WHERE id = $2::uuid";
        pqxx::result result1 = txn.exec_params(query1, targetUserId, userId);
        
        // Remover userId de followers del usuario objetivo
        std::string query2 = "UPDATE users SET followers = array_remove(followers, $1) WHERE id = $2::uuid";
        pqxx::result result2 = txn.exec_params(query2, userId, targetUserId);
        
        txn.commit();
        
        return result1.affected_rows() > 0 && result2.affected_rows() > 0;
    } catch (const std::exception& e) {
        std::cerr << "Error in unfollowUser: " << e.what() << std::endl;
        return false;
    }
}