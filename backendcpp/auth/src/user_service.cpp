#include "user_service.hpp"
#include "database.hpp"
#include "redis_client.hpp"
#include <pqxx/pqxx>
#include <iostream>
#include <ctime>
#include <sstream>
#include <algorithm>

// ============================================
// SERIALIZACIÓN
// ============================================
std::string UserService::vectorToJsonArray(const std::vector<std::string>& vec) {
    boost::json::array arr;
    for (const auto& v : vec) arr.push_back(boost::json::value(v));
    return boost::json::serialize(arr);
}

std::vector<std::string> UserService::jsonArrayToVector(const boost::json::array& arr) {
    std::vector<std::string> result;
    for (const auto& item : arr) {
        result.push_back(boost::json::value_to<std::string>(item));
    }
    return result;
}

std::string UserService::userToJson(const user::User& u) {
    boost::json::object obj;
    obj["id"] = u.id;
    obj["email"] = u.email;
    obj["firstName"] = u.firstName;
    obj["lastName"] = u.lastName;
    obj["age"] = u.age;
    obj["clientId"] = u.clientId;
    obj["role"] = u.role;
    obj["keycloakId"] = u.keycloakId;
    obj["profilePic"] = u.profilePic.empty() ? nullptr : boost::json::value(u.profilePic);
    obj["username"] = u.username.empty() ? nullptr : boost::json::value(u.username);
    obj["displayName"] = u.displayName.empty() ? nullptr : boost::json::value(u.displayName);
    obj["bio"] = u.bio.empty() ? nullptr : boost::json::value(u.bio);
    obj["location"] = u.location.empty() ? nullptr : boost::json::value(u.location);
    obj["website"] = u.website.empty() ? nullptr : boost::json::value(u.website);
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

user::User UserService::jsonToUser(const std::string& json) {
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
    u.profilePic = obj.at("profilePic").is_null() ? "" : boost::json::value_to<std::string>(obj.at("profilePic"));
    u.username = obj.at("username").is_null() ? "" : boost::json::value_to<std::string>(obj.at("username"));
    u.displayName = obj.at("displayName").is_null() ? "" : boost::json::value_to<std::string>(obj.at("displayName"));
    u.bio = obj.at("bio").is_null() ? "" : boost::json::value_to<std::string>(obj.at("bio"));
    u.location = obj.at("location").is_null() ? "" : boost::json::value_to<std::string>(obj.at("location"));
    u.website = obj.at("website").is_null() ? "" : boost::json::value_to<std::string>(obj.at("website"));
    u.plan = boost::json::value_to<std::string>(obj.at("plan"));
    u.createdAt = boost::json::value_to<std::string>(obj.at("createdAt"));
    u.updatedAt = boost::json::value_to<std::string>(obj.at("updatedAt"));
    
    if (obj.contains("followers") && !obj.at("followers").is_null()) {
        for (const auto& f : obj.at("followers").as_array()) {
            u.followers.push_back(boost::json::value_to<std::string>(f));
        }
    }
    if (obj.contains("following") && !obj.at("following").is_null()) {
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
// CACHE KEYS (con prefijo auth:)
// ============================================
std::string UserService::getUserCacheKey(const std::string& userId) {
    return "auth:user:id:" + userId;
}

std::string UserService::getUserEmailCacheKey(const std::string& email) {
    return "auth:user:email:" + email;
}

std::string UserService::getKeycloakUserCacheKey(const std::string& keycloakId) {
    return "auth:user:keycloak:" + keycloakId;
}

// ============================================
// CACHE HELPERS
// ============================================
void UserService::cacheWithTracking(const std::string& key, const std::string& value,
                                    const std::string& setKey, int ttl) {
    auto& redis = redis::RedisClient::getInstance();
    if (!redis.isConnected()) return;
    
    if (redis.set(key, value, ttl)) {
        redis.sadd(setKey, key);
    }
}

void UserService::invalidateBySet(const std::string& setKey, const std::string& pattern) {
    auto& redis = redis::RedisClient::getInstance();
    if (!redis.isConnected()) return;
    
    bool success = redis.delSet(setKey);
    
    if (!success && !pattern.empty()) {
        std::cerr << "[Cache] SET '" << setKey << "' not found, using SCAN fallback" << std::endl;
        redis.delByPattern(pattern);
    }
}

// ============================================
// ROW MAPPER
// ============================================
user::User UserService::rowToUser(const pqxx::row& row) {
    user::User u;
    
    try { u.id = row["id"].is_null() ? "" : row["id"].as<std::string>(); } catch (...) { u.id = ""; }
    try { u.email = row["email"].is_null() ? "" : row["email"].as<std::string>(); } catch (...) { u.email = ""; }
    try { u.firstName = row["first_name"].is_null() ? "" : row["first_name"].as<std::string>(); } catch (...) { u.firstName = ""; }
    try { u.lastName = row["last_name"].is_null() ? "" : row["last_name"].as<std::string>(); } catch (...) { u.lastName = ""; }
    try { u.age = row["age"].is_null() ? 0 : row["age"].as<int>(); } catch (...) { u.age = 0; }
    try { u.clientId = row["client_id"].is_null() ? "" : row["client_id"].as<std::string>(); } catch (...) { u.clientId = ""; }
    try { u.role = row["role"].is_null() ? "" : row["role"].as<std::string>(); } catch (...) { u.role = ""; }
    try { u.keycloakId = row["keycloak_id"].is_null() ? "" : row["keycloak_id"].as<std::string>(); } catch (...) { u.keycloakId = ""; }
    try { u.profilePic = row["profile_pic"].is_null() ? "" : row["profile_pic"].as<std::string>(); } catch (...) { u.profilePic = ""; }
    try { u.username = row["username"].is_null() ? "" : row["username"].as<std::string>(); } catch (...) { u.username = ""; }
    try { u.displayName = row["display_name"].is_null() ? "" : row["display_name"].as<std::string>(); } catch (...) { u.displayName = u.firstName + " " + u.lastName; }
    try { u.bio = row["bio"].is_null() ? "" : row["bio"].as<std::string>(); } catch (...) { u.bio = ""; }
    try { u.location = row["location"].is_null() ? "" : row["location"].as<std::string>(); } catch (...) { u.location = ""; }
    try { u.website = row["website"].is_null() ? "" : row["website"].as<std::string>(); } catch (...) { u.website = ""; }
    try { u.plan = row["plan"].is_null() ? "free" : row["plan"].as<std::string>(); } catch (...) { u.plan = "free"; }
    try { u.createdAt = row["created_at"].is_null() ? "" : row["created_at"].as<std::string>(); } catch (...) { u.createdAt = ""; }
    try { u.updatedAt = row["updated_at"].is_null() ? "" : row["updated_at"].as<std::string>(); } catch (...) { u.updatedAt = ""; }
    
    // followers y following: UUID[] convertido a vector de strings
    try {
        if (!row["followers"].is_null()) {
            std::string followersStr = row["followers"].as<std::string>();
            if (followersStr != "{}" && followersStr != "") {
                std::string content = followersStr.substr(1, followersStr.size() - 2);
                if (!content.empty()) {
                    std::stringstream ss(content);
                    std::string id;
                    while (std::getline(ss, id, ',')) {
                        id.erase(std::remove(id.begin(), id.end(), '"'), id.end());
                        id.erase(std::remove(id.begin(), id.end(), ' '), id.end());
                        if (!id.empty()) u.followers.push_back(id);
                    }
                }
            }
        }
    } catch (...) {}
    
    try {
        if (!row["following"].is_null()) {
            std::string followingStr = row["following"].as<std::string>();
            if (followingStr != "{}" && followingStr != "") {
                std::string content = followingStr.substr(1, followingStr.size() - 2);
                if (!content.empty()) {
                    std::stringstream ss(content);
                    std::string id;
                    while (std::getline(ss, id, ',')) {
                        id.erase(std::remove(id.begin(), id.end(), '"'), id.end());
                        id.erase(std::remove(id.begin(), id.end(), ' '), id.end());
                        if (!id.empty()) u.following.push_back(id);
                    }
                }
            }
        }
    } catch (...) {}
    
    return u;
}

// ============================================
// CRUD CON POOL DE CONEXIONES Y CACHÉ
// ============================================

std::optional<user::User> UserService::getUserByUsername(const std::string& username) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
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
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        std::string displayName = user.displayName.empty() ? 
            makeDisplayName(user.firstName, user.lastName) : user.displayName;
        std::string username = user.username.empty() ? 
            makeDefaultUsername(user.email) : user.username;
        
        // ✅ pqxx maneja automáticamente la conversión de vector<string> a array SQL
        pqxx::result result = txn.exec_params(
            "INSERT INTO users ("
            "email, first_name, last_name, age, client_id, role, "
            "keycloak_id, profile_pic, username, display_name, bio, "
            "location, website, plan, followers, following, created_at"
            ") VALUES ("
            "$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP"
            ") RETURNING id",
            user.email, user.firstName, user.lastName, user.age,
            user.clientId, user.role, user.keycloakId, user.profilePic,
            username, displayName, user.bio, user.location, user.website,
            user.plan.empty() ? "free" : user.plan,
            user.followers,   // ✅ Conversión automática
            user.following);  // ✅ Sin arrayToDBString
        
        txn.commit();
        
        if (!result.empty()) {
            userId = result[0][0].as<std::string>();
            
            // Cachear
            auto& redis = redis::RedisClient::getInstance();
            if (redis.isConnected()) {
                user::User cached = user;
                cached.id = userId;
                cached.displayName = displayName;
                cached.username = username;
                std::string json = userToJson(cached);
                
                std::string idKey = getUserCacheKey(userId);
                std::string emailKey = getUserEmailCacheKey(user.email);
                
                redis.set(idKey, json, 300);
                redis.sadd(CacheSets::USERS_ID, idKey);
                
                redis.set(emailKey, json, 300);
                redis.sadd(CacheSets::USERS_EMAIL, emailKey);
                
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
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params("SELECT * FROM users WHERE id = $1::uuid", id);
        txn.commit();
        
        if (!result.empty()) {
            user::User user = rowToUser(result[0]);
            if (redis.isConnected()) {
                std::string json = userToJson(user);
                std::string idKey = getUserCacheKey(id);
                std::string emailKey = getUserEmailCacheKey(user.email);
                
                redis.set(idKey, json, 300);
                redis.sadd(CacheSets::USERS_ID, idKey);
                
                redis.set(emailKey, json, 300);
                redis.sadd(CacheSets::USERS_EMAIL, emailKey);
                
                if (!user.keycloakId.empty()) {
                    std::string kcKey = getKeycloakUserCacheKey(user.keycloakId);
                    redis.set(kcKey, json, 300);
                    redis.sadd(CacheSets::USERS_KEYCLOAK, kcKey);
                }
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
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params("SELECT * FROM users WHERE email = $1", email);
        txn.commit();
        
        if (!result.empty()) {
            user::User user = rowToUser(result[0]);
            if (redis.isConnected()) {
                std::string json = userToJson(user);
                std::string emailKey = getUserEmailCacheKey(email);
                std::string idKey = getUserCacheKey(user.id);
                
                redis.set(emailKey, json, 300);
                redis.sadd(CacheSets::USERS_EMAIL, emailKey);
                
                redis.set(idKey, json, 300);
                redis.sadd(CacheSets::USERS_ID, idKey);
                
                if (!user.keycloakId.empty()) {
                    std::string kcKey = getKeycloakUserCacheKey(user.keycloakId);
                    redis.set(kcKey, json, 300);
                    redis.sadd(CacheSets::USERS_KEYCLOAK, kcKey);
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
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params("SELECT * FROM users WHERE keycloak_id = $1", keycloakId);
        txn.commit();
        
        if (!result.empty()) {
            user::User user = rowToUser(result[0]);
            if (redis.isConnected()) {
                std::string json = userToJson(user);
                std::string kcKey = getKeycloakUserCacheKey(keycloakId);
                std::string idKey = getUserCacheKey(user.id);
                std::string emailKey = getUserEmailCacheKey(user.email);
                
                redis.set(kcKey, json, 300);
                redis.sadd(CacheSets::USERS_KEYCLOAK, kcKey);
                
                redis.set(idKey, json, 300);
                redis.sadd(CacheSets::USERS_ID, idKey);
                
                redis.set(emailKey, json, 300);
                redis.sadd(CacheSets::USERS_EMAIL, emailKey);
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
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
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
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "UPDATE users SET first_name = $1, last_name = $2, age = $3, "
            "display_name = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5::uuid",
            firstName, lastName, age, firstName + " " + lastName, id);
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
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        std::string displayName = userData.displayName.empty() ? 
            makeDisplayName(userData.firstName, userData.lastName) : userData.displayName;
        
        pqxx::result result = txn.exec_params(
            "UPDATE users SET first_name = $1, last_name = $2, age = $3, "
            "client_id = $4, role = $5, display_name = $6, bio = $7, "
            "location = $8, website = $9, profile_pic = $10, "
            "updated_at = CURRENT_TIMESTAMP WHERE id = $11::uuid",
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
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "UPDATE users SET keycloak_id = $1 WHERE id = $2::uuid", keycloakId, id);
        txn.commit();
        
        if (result.affected_rows() > 0) {
            invalidateUserCache(id);
        }
        return result.affected_rows() > 0;
    } catch (const std::exception& e) {
        std::cerr << "Error in updateKeycloakId: " << e.what() << std::endl;
        return false;
    }
}

bool UserService::deleteUser(const std::string& id) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
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
// SOCIAL (CORREGIDO CON UUID[])
// ============================================
bool UserService::followUser(const std::string& userId, const std::string& targetUserId) {
    if (userId == targetUserId) return false;
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        // ✅ Usar casts ::uuid y '{}'::UUID[]
        txn.exec_params(
            "UPDATE users SET following = array_append(COALESCE(following, '{}'::UUID[]), $1::uuid) "
            "WHERE id = $2::uuid AND NOT ($1::uuid = ANY(COALESCE(following, '{}'::UUID[])))",
            targetUserId, userId);
        
        txn.exec_params(
            "UPDATE users SET followers = array_append(COALESCE(followers, '{}'::UUID[]), $1::uuid) "
            "WHERE id = $2::uuid AND NOT ($1::uuid = ANY(COALESCE(followers, '{}'::UUID[])))",
            userId, targetUserId);
        
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
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        // ✅ Usar casts ::uuid y '{}'::UUID[]
        txn.exec_params(
            "UPDATE users SET following = array_remove(COALESCE(following, '{}'::UUID[]), $1::uuid) "
            "WHERE id = $2::uuid",
            targetUserId, userId);
        
        txn.exec_params(
            "UPDATE users SET followers = array_remove(COALESCE(followers, '{}'::UUID[]), $1::uuid) "
            "WHERE id = $2::uuid",
            userId, targetUserId);
        
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
// CACHE INVALIDATION (CON SETS + SCAN FALLBACK)
// ============================================
void UserService::invalidateUserCache(const std::string& userId) {
    auto& redis = redis::RedisClient::getInstance();
    if (!redis.isConnected()) return;
    
    // Obtener el usuario antes de invalidar para borrar sus otras claves
    auto userOpt = getUserById(userId);
    
    std::string idKey = getUserCacheKey(userId);
    redis.del(idKey);
    redis.srem(CacheSets::USERS_ID, idKey);
    
    if (userOpt) {
        std::string emailKey = getUserEmailCacheKey(userOpt->email);
        redis.del(emailKey);
        redis.srem(CacheSets::USERS_EMAIL, emailKey);
        
        if (!userOpt->keycloakId.empty()) {
            std::string kcKey = getKeycloakUserCacheKey(userOpt->keycloakId);
            redis.del(kcKey);
            redis.srem(CacheSets::USERS_KEYCLOAK, kcKey);
        }
    }
    
    std::cout << "[Redis] Invalidated cache for user: " << userId << std::endl;
}

void UserService::invalidateUserCacheByEmail(const std::string& email) {
    auto& redis = redis::RedisClient::getInstance();
    if (!redis.isConnected()) return;
    
    std::string emailKey = getUserEmailCacheKey(email);
    redis.del(emailKey);
    redis.srem(CacheSets::USERS_EMAIL, emailKey);
    
    std::cout << "[Redis] Invalidated email cache: " << email << std::endl;
}

void UserService::invalidateUsersListCache() {
    invalidateBySet(CacheSets::USERS_LIST, "auth:users:list:*");
}