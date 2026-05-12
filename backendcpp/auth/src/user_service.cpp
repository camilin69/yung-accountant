#include "user_service.hpp"
#include "database.hpp"
#include "redis_client.hpp"
#include <pqxx/pqxx>
#include <iostream>
#include <ctime>
#include <sstream>
#include <algorithm>

// ============================================
// HELPERS DE SERIALIZACIÓN MANUAL (sin tag_invoke)
// ============================================
static std::string userToJson(const user::User& u) {
    boost::json::object obj;
    obj["id"] = u.id;
    obj["email"] = u.email;
    obj["firstName"] = u.firstName;
    obj["lastName"] = u.lastName;
    obj["age"] = u.age;
    obj["clientId"] = u.clientId;
    obj["role"] = u.role;
    obj["keycloakId"] = u.keycloakId;
    obj["profilePic"] = u.profilePic;
    obj["username"] = u.username;
    obj["displayName"] = u.displayName;
    obj["bio"] = u.bio;
    obj["location"] = u.location;
    obj["website"] = u.website;
    obj["plan"] = u.plan;
    obj["createdAt"] = u.createdAt;
    obj["updatedAt"] = u.updatedAt;
    
    boost::json::array followers;
    for (const auto& f : u.followers) followers.push_back(boost::json::value(f));
    obj["followers"] = followers;
    
    boost::json::array following;
    for (const auto& f : u.following) following.push_back(boost::json::value(f));
    obj["following"] = following;
    
    return boost::json::serialize(obj);
}

static user::User jsonToUser(const std::string& json) {
    auto jv = boost::json::parse(json);
    auto& obj = jv.as_object();
    
    user::User u;
    u.id = boost::json::value_to<std::string>(obj.at("id"));
    u.email = boost::json::value_to<std::string>(obj.at("email"));
    u.firstName = boost::json::value_to<std::string>(obj.at("firstName"));
    u.lastName = boost::json::value_to<std::string>(obj.at("lastName"));
    u.age = obj.at("age").as_int64();
    u.clientId = boost::json::value_to<std::string>(obj.at("clientId"));
    u.role = boost::json::value_to<std::string>(obj.at("role"));
    u.keycloakId = boost::json::value_to<std::string>(obj.at("keycloakId"));
    u.profilePic = boost::json::value_to<std::string>(obj.at("profilePic"));
    u.username = boost::json::value_to<std::string>(obj.at("username"));
    u.displayName = boost::json::value_to<std::string>(obj.at("displayName"));
    u.bio = boost::json::value_to<std::string>(obj.at("bio"));
    u.location = boost::json::value_to<std::string>(obj.at("location"));
    u.website = boost::json::value_to<std::string>(obj.at("website"));
    u.plan = boost::json::value_to<std::string>(obj.at("plan"));
    u.createdAt = boost::json::value_to<std::string>(obj.at("createdAt"));
    u.updatedAt = boost::json::value_to<std::string>(obj.at("updatedAt"));
    
    if (obj.contains("followers")) {
        for (const auto& f : obj.at("followers").as_array()) {
            u.followers.push_back(boost::json::value_to<std::string>(f));
        }
    }
    if (obj.contains("following")) {
        for (const auto& f : obj.at("following").as_array()) {
            u.following.push_back(boost::json::value_to<std::string>(f));
        }
    }
    return u;
}

// ============================================
// SINGLETON
// ============================================
UserService& UserService::getInstance() {
    static UserService instance;
    return instance;
}

// ============================================
// CACHE KEYS
// ============================================
std::string UserService::getUserCacheKey(const std::string& userId) {
    return "user:id:" + userId;
}

std::string UserService::getUserEmailCacheKey(const std::string& email) {
    return "user:email:" + email;
}

std::string UserService::getKeycloakUserCacheKey(const std::string& keycloakId) {
    return "user:keycloak:" + keycloakId;
}

// ============================================
// DATABASE HELPERS
// ============================================
std::string UserService::arrayToDBString(const std::vector<std::string>& arr) {
    if (arr.empty()) return "{}";
    std::string result = "{";
    for (size_t i = 0; i < arr.size(); ++i) {
        if (i > 0) result += ",";
        result += "\"" + arr[i] + "\"";
    }
    result += "}";
    return result;
}

std::vector<std::string> UserService::parseArrayFromDB(const std::string& arrayStr) {
    std::vector<std::string> result;
    if (arrayStr.empty() || arrayStr == "{}") return result;
    std::string content = arrayStr.substr(1, arrayStr.length() - 2);
    std::stringstream ss(content);
    std::string item;
    while (std::getline(ss, item, ',')) {
        item.erase(remove(item.begin(), item.end(), '"'), item.end());
        item.erase(remove(item.begin(), item.end(), ' '), item.end());
        if (!item.empty()) result.push_back(item);
    }
    return result;
}

user::User UserService::rowToUser(const pqxx::row& row) {
    user::User u;
    if (!row["id"].is_null()) u.id = row["id"].as<std::string>();
    if (!row["email"].is_null()) u.email = row["email"].as<std::string>();
    if (!row["first_name"].is_null()) u.firstName = row["first_name"].as<std::string>();
    if (!row["last_name"].is_null()) u.lastName = row["last_name"].as<std::string>();
    if (!row["age"].is_null()) u.age = row["age"].as<int>();
    if (!row["client_id"].is_null()) u.clientId = row["client_id"].as<std::string>();
    if (!row["role"].is_null()) u.role = row["role"].as<std::string>();
    if (!row["keycloak_id"].is_null()) u.keycloakId = row["keycloak_id"].as<std::string>();
    if (!row["profile_pic"].is_null()) u.profilePic = row["profile_pic"].as<std::string>();
    if (!row["username"].is_null()) u.username = row["username"].as<std::string>();
    if (!row["display_name"].is_null()) u.displayName = row["display_name"].as<std::string>();
    else if (!u.firstName.empty()) u.displayName = u.firstName + " " + u.lastName;
    if (!row["bio"].is_null()) u.bio = row["bio"].as<std::string>();
    if (!row["location"].is_null()) u.location = row["location"].as<std::string>();
    if (!row["website"].is_null()) u.website = row["website"].as<std::string>();
    if (!row["plan"].is_null()) u.plan = row["plan"].as<std::string>();
    if (!row["created_at"].is_null()) u.createdAt = row["created_at"].as<std::string>();
    if (!row["updated_at"].is_null()) u.updatedAt = row["updated_at"].as<std::string>();
    if (!row["followers"].is_null()) u.followers = parseArrayFromDB(row["followers"].as<std::string>());
    if (!row["following"].is_null()) u.following = parseArrayFromDB(row["following"].as<std::string>());
    return u;
}

// ============================================
// CRUD CON CACHÉ REDIS MANUAL
// ============================================
std::optional<user::User> UserService::getUserByUsername(const std::string& username) {
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "SELECT * FROM users WHERE username = $1 OR email = $1",
            username);
        txn.commit();
        
        if (!result.empty()) {
            return rowToUser(result[0]);
        }
        return std::nullopt;
    } catch (const std::exception& e) {
        std::cerr << "Error in getUserByUsername: " << e.what() << std::endl;
        return std::nullopt;
    }
}

bool UserService::createUser(const user::User& user, std::string& userId) {
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
        
        std::string displayName = user.displayName.empty() ? 
            makeDisplayName(user.firstName, user.lastName) : user.displayName;
        std::string username = user.username.empty() ? 
            makeDefaultUsername(user.email) : user.username;
        
        pqxx::result result = txn.exec_params(query,
            user.email, user.firstName, user.lastName, user.age,
            user.clientId, user.role, user.keycloakId, user.profilePic,
            username, displayName, user.bio, user.location, user.website,
            user.plan.empty() ? "free" : user.plan,
            arrayToDBString(user.followers), arrayToDBString(user.following));
        
        txn.commit();
        
        if (!result.empty()) {
            userId = result[0][0].as<std::string>();
            
            auto& redis = redis::RedisClient::getInstance();
            if (redis.isConnected()) {
                user::User cached = user;
                cached.id = userId;
                std::string json = userToJson(cached);
                redis.set(getUserCacheKey(userId), json, 300);
                redis.set(getUserEmailCacheKey(user.email), json, 300);
                std::cout << "[Redis] Cached new user: " << userId << std::endl;
            }
            
            std::cout << "✓ User created: " << userId << " - " << user.email << std::endl;
            return true;
        }
        return false;
    } catch (const std::exception& e) {
        std::cerr << "Error in createUser: " << e.what() << std::endl;
        return false;
    }
}

std::optional<user::User> UserService::getUserById(const std::string& id) {
    auto& redis = redis::RedisClient::getInstance();
    if (redis.isConnected()) {
        auto cached = redis.get(getUserCacheKey(id));
        if (cached) {
            std::cout << "[Redis] Cache HIT for user ID: " << id << std::endl;
            return jsonToUser(*cached);
        }
        std::cout << "[Redis] Cache MISS for user ID: " << id << std::endl;
    }
    
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params("SELECT * FROM users WHERE id = $1::uuid", id);
        txn.commit();
        
        if (!result.empty()) {
            user::User user = rowToUser(result[0]);
            if (redis.isConnected()) {
                std::string json = userToJson(user);
                redis.set(getUserCacheKey(id), json, 300);
                redis.set(getUserEmailCacheKey(user.email), json, 300);
            }
            return user;
        }
        return std::nullopt;
    } catch (const std::exception& e) {
        std::cerr << "Error in getUserById: " << e.what() << std::endl;
        return std::nullopt;
    }
}

std::optional<user::User> UserService::getUserByEmail(const std::string& email) {
    auto& redis = redis::RedisClient::getInstance();
    if (redis.isConnected()) {
        auto cached = redis.get(getUserEmailCacheKey(email));
        if (cached) {
            std::cout << "[Redis] Cache HIT for email: " << email << std::endl;
            return jsonToUser(*cached);
        }
        std::cout << "[Redis] Cache MISS for email: " << email << std::endl;
    }
    
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params("SELECT * FROM users WHERE email = $1", email);
        txn.commit();
        
        if (!result.empty()) {
            user::User user = rowToUser(result[0]);
            if (redis.isConnected()) {
                std::string json = userToJson(user);
                redis.set(getUserEmailCacheKey(email), json, 300);
                redis.set(getUserCacheKey(user.id), json, 300);
                if (!user.keycloakId.empty()) {
                    redis.set(getKeycloakUserCacheKey(user.keycloakId), json, 300);
                }
            }
            return user;
        }
        return std::nullopt;
    } catch (const std::exception& e) {
        std::cerr << "Error in getUserByEmail: " << e.what() << std::endl;
        return std::nullopt;
    }
}

std::optional<user::User> UserService::getUserByKeycloakId(const std::string& keycloakId) {
    if (keycloakId.empty()) return std::nullopt;
    
    auto& redis = redis::RedisClient::getInstance();
    if (redis.isConnected()) {
        auto cached = redis.get(getKeycloakUserCacheKey(keycloakId));
        if (cached) {
            std::cout << "[Redis] Cache HIT for keycloak: " << keycloakId << std::endl;
            return jsonToUser(*cached);
        }
    }
    
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params("SELECT * FROM users WHERE keycloak_id = $1", keycloakId);
        txn.commit();
        
        if (!result.empty()) {
            user::User user = rowToUser(result[0]);
            if (redis.isConnected()) {
                std::string json = userToJson(user);
                redis.set(getKeycloakUserCacheKey(keycloakId), json, 300);
                redis.set(getUserCacheKey(user.id), json, 300);
                redis.set(getUserEmailCacheKey(user.email), json, 300);
            }
            return user;
        }
        return std::nullopt;
    } catch (const std::exception& e) {
        std::cerr << "Error in getUserByKeycloakId: " << e.what() << std::endl;
        return std::nullopt;
    }
}

std::vector<user::User> UserService::getAllUsers() {
    std::vector<user::User> users;
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec("SELECT * FROM users ORDER BY created_at DESC");
        txn.commit();
        for (const auto& row : result) users.push_back(rowToUser(row));
        std::cout << "✓ Retrieved " << users.size() << " users" << std::endl;
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
        std::string query = "UPDATE users SET first_name = $1, last_name = $2, age = $3, "
                           "display_name = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5::uuid";
        pqxx::result result = txn.exec_params(query, firstName, lastName, age, firstName + " " + lastName, id);
        txn.commit();
        
        if (result.affected_rows() > 0) {
            invalidateUserCache(id);
            return true;
        }
        return false;
    } catch (const std::exception& e) {
        std::cerr << "Error in updateUser: " << e.what() << std::endl;
        return false;
    }
}

bool UserService::updateFullProfile(const std::string& id, const user::User& userData) {
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        std::string displayName = userData.displayName.empty() ? 
            makeDisplayName(userData.firstName, userData.lastName) : userData.displayName;
        
        std::string query = "UPDATE users SET first_name = $1, last_name = $2, age = $3, "
                           "client_id = $4, role = $5, display_name = $6, bio = $7, "
                           "location = $8, website = $9, profile_pic = $10, "
                           "updated_at = CURRENT_TIMESTAMP WHERE id = $11::uuid";
        pqxx::result result = txn.exec_params(query,
            userData.firstName, userData.lastName, userData.age, userData.clientId,
            userData.role, displayName, userData.bio, userData.location,
            userData.website, userData.profilePic, id);
        txn.commit();
        
        if (result.affected_rows() > 0) {
            invalidateUserCache(id);
            std::cout << "✓ User profile updated: " << id << std::endl;
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
        pqxx::result result = txn.exec_params(
            "UPDATE users SET keycloak_id = $1 WHERE id = $2::uuid", keycloakId, id);
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
        pqxx::result result = txn.exec_params("DELETE FROM users WHERE id = $1::uuid", id);
        txn.commit();
        
        if (result.affected_rows() > 0) {
            invalidateUserCache(id);
            std::cout << "✓ User deleted: " << id << std::endl;
            return true;
        }
        return false;
    } catch (const std::exception& e) {
        std::cerr << "Error in deleteUser: " << e.what() << std::endl;
        return false;
    }
}

// ============================================
// SOCIAL
// ============================================
bool UserService::followUser(const std::string& userId, const std::string& targetUserId) {
    if (userId == targetUserId) return false;
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        txn.exec_params("UPDATE users SET following = array_append(following, $1) WHERE id = $2::uuid", targetUserId, userId);
        txn.exec_params("UPDATE users SET followers = array_append(followers, $1) WHERE id = $2::uuid", userId, targetUserId);
        txn.commit();
        invalidateUserCache(userId);
        invalidateUserCache(targetUserId);
        std::cout << "✓ " << userId << " now follows " << targetUserId << std::endl;
        return true;
    } catch (const std::exception& e) {
        std::cerr << "Error in followUser: " << e.what() << std::endl;
        return false;
    }
}

bool UserService::unfollowUser(const std::string& userId, const std::string& targetUserId) {
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        txn.exec_params("UPDATE users SET following = array_remove(following, $1) WHERE id = $2::uuid", targetUserId, userId);
        txn.exec_params("UPDATE users SET followers = array_remove(followers, $1) WHERE id = $2::uuid", userId, targetUserId);
        txn.commit();
        invalidateUserCache(userId);
        invalidateUserCache(targetUserId);
        std::cout << "✓ " << userId << " unfollowed " << targetUserId << std::endl;
        return true;
    } catch (const std::exception& e) {
        std::cerr << "Error in unfollowUser: " << e.what() << std::endl;
        return false;
    }
}

// ============================================
// CACHE INVALIDATION
// ============================================
void UserService::invalidateUserCache(const std::string& userId) {
    auto& redis = redis::RedisClient::getInstance();
    if (!redis.isConnected()) return;
    
    redis.del(getUserCacheKey(userId));
    
    auto userOpt = getUserById(userId);
    if (userOpt) {
        redis.del(getUserEmailCacheKey(userOpt->email));
        if (!userOpt->keycloakId.empty()) redis.del(getKeycloakUserCacheKey(userOpt->keycloakId));
    }
    std::cout << "[Redis] Invalidated cache for user: " << userId << std::endl;
}

void UserService::invalidateUserCacheByEmail(const std::string& email) {
    auto& redis = redis::RedisClient::getInstance();
    if (!redis.isConnected()) return;
    redis.del(getUserEmailCacheKey(email));
    std::cout << "[Redis] Invalidated email cache: " << email << std::endl;
}

void UserService::invalidateUsersListCache() {
    auto& redis = redis::RedisClient::getInstance();
    if (!redis.isConnected()) return;
    redis.delByPattern("users:list:*");
    std::cout << "[Redis] Invalidated users list cache" << std::endl;
}