#include "category_service.hpp"
#include "database.hpp"
#include "redis_client.hpp"
#include <pqxx/pqxx>
#include <iostream>

// ============================================
// POOL CONNECTION
// ============================================
class PoolConnection {
public:
    PoolConnection() : conn_(Database::getInstance().acquireConnection()) {}
    ~PoolConnection() { 
        if (conn_) Database::getInstance().releaseConnection(std::move(conn_)); 
    }
    
    pqxx::connection& get() { return *conn_; }
    
    PoolConnection(const PoolConnection&) = delete;
    PoolConnection& operator=(const PoolConnection&) = delete;
    PoolConnection(PoolConnection&&) = default;

private:
    std::unique_ptr<pqxx::connection> conn_;
};

// ============================================
// SERIALIZACIÓN
// ============================================
std::string CategoryService::categoryToJson(const Category& cat) {
    boost::json::object obj;
    obj["id"] = cat.id;
    obj["userId"] = cat.userId.empty() ? nullptr : boost::json::value(cat.userId);
    obj["name"] = cat.name;
    obj["type"] = cat.type;
    obj["icon"] = cat.icon;
    obj["color"] = cat.color;
    obj["isSystem"] = cat.isSystem;
    obj["isDefault"] = cat.isDefault;
    obj["createdAt"] = cat.createdAt;
    return boost::json::serialize(obj);
}

Category CategoryService::jsonToCategory(const std::string& json) {
    auto jv = boost::json::parse(json);
    auto& obj = jv.as_object();
    
    Category cat;
    cat.id = boost::json::value_to<std::string>(obj.at("id"));
    cat.userId = obj.at("userId").is_null() ? "" : boost::json::value_to<std::string>(obj.at("userId"));
    cat.name = boost::json::value_to<std::string>(obj.at("name"));
    cat.type = boost::json::value_to<std::string>(obj.at("type"));
    cat.icon = boost::json::value_to<std::string>(obj.at("icon"));
    cat.color = boost::json::value_to<std::string>(obj.at("color"));
    cat.isSystem = obj.at("isSystem").as_bool();
    cat.isDefault = obj.at("isDefault").as_bool();
    cat.createdAt = boost::json::value_to<std::string>(obj.at("createdAt"));
    return cat;
}

std::string CategoryService::categoriesToJson(const std::vector<Category>& cats) {
    boost::json::array arr;
    for (const auto& cat : cats) {
        arr.push_back(boost::json::parse(categoryToJson(cat)));
    }
    return boost::json::serialize(arr);
}

std::vector<Category> CategoryService::jsonToCategories(const std::string& json) {
    std::vector<Category> result;
    auto jv = boost::json::parse(json);
    for (const auto& item : jv.as_array()) {
        result.push_back(jsonToCategory(boost::json::serialize(item)));
    }
    return result;
}

// ============================================
// SINGLETON
// ============================================
CategoryService& CategoryService::getInstance() {
    static CategoryService instance;
    return instance;
}

// ============================================
// CACHE HELPERS
// ============================================
void CategoryService::cacheWithTracking(const std::string& key, const std::string& value,
                                        const std::string& setKey, int ttl) {
    auto& redis = redis::RedisClient::getInstance();
    if (!redis.isConnected()) return;
    
    if (redis.set(key, value, ttl)) {
        redis.sadd(setKey, key);
    }
}

void CategoryService::invalidateBySet(const std::string& setKey, const std::string& pattern) {
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
Category CategoryService::rowToCategory(const pqxx::row& row, bool isSystem) {
    Category cat;
    try { cat.id = row["id"].is_null() ? "" : row["id"].as<std::string>(); } catch (...) { cat.id = ""; }
    try { cat.userId = row["user_id"].is_null() ? "" : row["user_id"].as<std::string>(); } catch (...) { cat.userId = ""; }
    try { cat.name = row["name"].is_null() ? "" : row["name"].as<std::string>(); } catch (...) { cat.name = ""; }
    try { cat.type = row["type"].is_null() ? "" : row["type"].as<std::string>(); } catch (...) { cat.type = ""; }
    try { cat.icon = row["icon"].is_null() ? "" : row["icon"].as<std::string>(); } catch (...) { cat.icon = ""; }
    try { cat.color = row["color"].is_null() ? "" : row["color"].as<std::string>(); } catch (...) { cat.color = ""; }
    try { cat.isSystem = isSystem; } catch (...) { cat.isSystem = false; }
    try { cat.isDefault = row["is_default"].is_null() ? false : row["is_default"].as<bool>(); } catch (...) { cat.isDefault = false; }
    try { cat.createdAt = row["created_at"].is_null() ? "" : row["created_at"].as<std::string>(); } catch (...) { cat.createdAt = ""; }
    return cat;
}

// ============================================
// CATEGORÍAS DEL SISTEMA (con Redis + SETS)
// ============================================
std::vector<Category> CategoryService::getSystemCategories() {
    auto& redis = redis::RedisClient::getInstance();
    
    if (redis.isConnected()) {
        auto cached = redis.get(RedisKeys::SYSTEM_CATEGORIES);
        if (cached) {
            std::cout << "[Redis] Cache HIT: system categories" << std::endl;
            return jsonToCategories(*cached);
        }
        std::cout << "[Redis] Cache MISS: system categories" << std::endl;
    }
    
    std::vector<Category> categories;
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec(
            "SELECT id, name, type, icon, color, is_system, is_default, created_at "
            "FROM categories WHERE user_id IS NULL ORDER BY type, name");
        txn.commit();
        
        for (const auto& row : result) {
            categories.push_back(rowToCategory(row, true));
        }
        
        if (redis.isConnected()) {
            std::string json = categoriesToJson(categories);
            redis.set(RedisKeys::SYSTEM_CATEGORIES, json, RedisKeys::CACHE_TTL);
            redis.sadd(CacheSets::SYSTEM_CATEGORIES, RedisKeys::SYSTEM_CATEGORIES);
            std::cout << "[Redis] Cached " << categories.size() << " system categories" << std::endl;
        }
    } catch (const std::exception& e) {
        std::cerr << "Error getting system categories: " << e.what() << std::endl;
    }
    return categories;
}

// ============================================
// CATEGORÍAS DE USUARIO (con Redis + SETS)
// ============================================
std::vector<Category> CategoryService::getUserCategories(const std::string& userId) {
    if (userId.empty()) {
        std::cerr << "[ERROR] getUserCategories called with empty userId" << std::endl;
        return {};
    }
    
    auto& redis = redis::RedisClient::getInstance();
    std::string redisKey = RedisKeys::USER_CATEGORIES_PREFIX + userId;
    
    if (redis.isConnected()) {
        auto cached = redis.get(redisKey);
        if (cached) {
            std::cout << "[Redis] Cache HIT: user categories for " << userId << std::endl;
            return jsonToCategories(*cached);
        }
        std::cout << "[Redis] Cache MISS: user categories for " << userId << std::endl;
    }
    
    std::vector<Category> categories;
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "SELECT id, user_id, name, type, icon, color, is_default, created_at "
            "FROM categories WHERE user_id = $1::uuid ORDER BY name", userId);
        txn.commit();
        
        for (const auto& row : result) {
            categories.push_back(rowToCategory(row, false));
        }
        
        if (redis.isConnected()) {
            std::string json = categoriesToJson(categories);
            redis.set(redisKey, json, RedisKeys::CACHE_TTL);
            redis.sadd(CacheSets::USER_CATEGORIES, redisKey);
            std::cout << "[Redis] Cached " << categories.size() << " user categories" << std::endl;
        }
    } catch (const std::exception& e) {
        std::cerr << "Error getting user categories: " << e.what() << std::endl;
    }
    return categories;
}

// ============================================
// TODAS LAS CATEGORÍAS
// ============================================
std::vector<Category> CategoryService::getAllCategories(const std::string& userId) {
    auto system = getSystemCategories();
    auto user = getUserCategories(userId);
    
    std::vector<Category> all;
    all.reserve(system.size() + user.size());
    all.insert(all.end(), system.begin(), system.end());
    all.insert(all.end(), user.begin(), user.end());
    return all;
}

// ============================================
// CATEGORÍA POR ID
// ============================================
std::optional<Category> CategoryService::getCategoryById(const std::string& id, const std::string& userId) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "SELECT id, user_id, name, type, icon, color, is_default, is_system, created_at "
            "FROM categories WHERE id = $1::uuid AND (user_id = $2::uuid OR is_system = true)", 
            id, userId);
        txn.commit();
        
        if (!result.empty()) {
            const auto& row = result[0];
            bool isSystem = row["is_system"].as<bool>();
            return rowToCategory(row, isSystem);
        }
        return std::nullopt;
    } catch (const std::exception& e) {
        std::cerr << "Error getting category by id: " << e.what() << std::endl;
        return std::nullopt;
    }
}

// ============================================
// CREAR CATEGORÍA DE USUARIO
// ============================================
std::optional<Category> CategoryService::createUserCategory(const Category& category) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        // ✅ Usar parámetros posicionales (sin inyección SQL)
        pqxx::result result = txn.exec_params(
            "INSERT INTO categories (user_id, name, type, icon, color, is_default) "
            "VALUES ($1::uuid, $2, $3, $4, $5, $6) RETURNING id, created_at",
            category.userId, category.name, category.type, 
            category.icon, category.color, category.isDefault);
        txn.commit();
        
        if (!result.empty()) {
            Category newCat = category;
            newCat.id = result[0]["id"].as<std::string>();
            newCat.createdAt = result[0]["created_at"].as<std::string>();
            newCat.isSystem = false;
            
            invalidateUserCache(category.userId);
            std::cout << "✓ Category created: " << newCat.id << " - " << newCat.name << std::endl;
            return newCat;
        }
        return std::nullopt;
    } catch (const std::exception& e) {
        std::cerr << "Error creating category: " << e.what() << std::endl;
        return std::nullopt;
    }
}

// ============================================
// ACTUALIZAR CATEGORÍA DE USUARIO (CORREGIDO SIN INYECCIÓN SQL)
// ============================================
bool CategoryService::updateUserCategory(const std::string& id, const std::string& userId, 
                                          const boost::json::object& updates) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        std::vector<std::string> setClauses;
        std::vector<std::string> paramValues;
        
        // ✅ Usar parámetros posicionales en lugar de txn.quote()
        if (updates.contains("name")) {
            setClauses.push_back("name = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(std::string(updates.at("name").as_string()));
        }
        if (updates.contains("type")) {
            setClauses.push_back("type = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(std::string(updates.at("type").as_string()));
        }
        if (updates.contains("icon")) {
            setClauses.push_back("icon = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(std::string(updates.at("icon").as_string()));
        }
        if (updates.contains("color")) {
            setClauses.push_back("color = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(std::string(updates.at("color").as_string()));
        }
        
        if (setClauses.empty()) {
            return false;
        }
        
        // Construir query con parámetros posicionales
        std::string query = "UPDATE categories SET ";
        for (size_t i = 0; i < setClauses.size(); ++i) {
            if (i > 0) query += ", ";
            query += setClauses[i];
        }
        query += " WHERE id = $" + std::to_string(paramValues.size() + 1) +
                 " AND user_id = $" + std::to_string(paramValues.size() + 2) +
                 " AND is_system = false";
        
        // Agregar parámetros WHERE
        paramValues.push_back(id);
        paramValues.push_back(userId);
        
        // Ejecutar con los parámetros correctos
        pqxx::result result;
        switch (paramValues.size()) {
            case 3: // 1 SET + 2 WHERE
                result = txn.exec_params(query, paramValues[0], paramValues[1], paramValues[2]);
                break;
            case 4: // 2 SET + 2 WHERE
                result = txn.exec_params(query, paramValues[0], paramValues[1], 
                                        paramValues[2], paramValues[3]);
                break;
            case 5: // 3 SET + 2 WHERE
                result = txn.exec_params(query, paramValues[0], paramValues[1], 
                                        paramValues[2], paramValues[3], paramValues[4]);
                break;
            case 6: // 4 SET + 2 WHERE
                result = txn.exec_params(query, paramValues[0], paramValues[1], 
                                        paramValues[2], paramValues[3], 
                                        paramValues[4], paramValues[5]);
                break;
            default:
                return false;
        }
        
        txn.commit();
        
        if (result.affected_rows() > 0) {
            invalidateUserCache(userId);
            std::cout << "✓ User category updated: " << id << std::endl;
            return true;
        }
        return false;
        
    } catch (const std::exception& e) {
        std::cerr << "Error updating user category: " << e.what() << std::endl;
        return false;
    }
}

// ============================================
// ELIMINAR CATEGORÍA DE USUARIO
// ============================================
bool CategoryService::deleteUserCategory(const std::string& id, const std::string& userId) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        // Verificar transacciones asociadas
        pqxx::result check = txn.exec_params(
            "SELECT COUNT(*) FROM transactions WHERE category_id = $1::uuid", id);
        if (!check.empty() && check[0][0].as<int>() > 0) {
            txn.commit();
            std::cerr << "Cannot delete category " << id << " - has transactions" << std::endl;
            return false;
        }
        
        pqxx::result result = txn.exec_params(
            "DELETE FROM categories WHERE id = $1::uuid AND user_id = $2::uuid AND is_system = false", 
            id, userId);
        txn.commit();
        
        if (result.affected_rows() > 0) {
            invalidateUserCache(userId);
            std::cout << "✓ Category deleted: " << id << std::endl;
            return true;
        }
        return false;
    } catch (const std::exception& e) {
        std::cerr << "Error deleting category: " << e.what() << std::endl;
        return false;
    }
}

// ============================================
// INVALIDACIÓN DE CACHÉ (CON SETS + SCAN FALLBACK)
// ============================================
void CategoryService::invalidateUserCache(const std::string& userId) {
    auto& redis = redis::RedisClient::getInstance();
    if (!redis.isConnected()) return;
    
    std::string redisKey = RedisKeys::USER_CATEGORIES_PREFIX + userId;
    redis.del(redisKey);
    redis.srem(CacheSets::USER_CATEGORIES, redisKey);
    
    std::cout << "[Redis] Invalidated user category cache: " << userId << std::endl;
}

void CategoryService::invalidateSystemCache() {
    auto& redis = redis::RedisClient::getInstance();
    if (!redis.isConnected()) return;
    
    redis.del(RedisKeys::SYSTEM_CATEGORIES);
    redis.srem(CacheSets::SYSTEM_CATEGORIES, RedisKeys::SYSTEM_CATEGORIES);
    
    std::cout << "[Redis] Invalidated system categories cache" << std::endl;
}