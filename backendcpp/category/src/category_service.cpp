#include "category_service.hpp"
#include "database.hpp"
#include "redis_client.hpp"
#include <pqxx/pqxx>
#include <iostream>

namespace {
    const std::string REDIS_SYSTEM_KEY = "categories:system";
    const std::string REDIS_USER_PREFIX = "categories:user:";
    const int CACHE_TTL = 300;
}

// ============================================
// HELPERS DE SERIALIZACIÓN MANUAL
// ============================================
static std::string categoryToJson(const Category& cat) {
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

static Category jsonToCategory(const std::string& json) {
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

static std::string categoriesToJson(const std::vector<Category>& cats) {
    boost::json::array arr;
    for (const auto& cat : cats) {
        arr.push_back(boost::json::parse(categoryToJson(cat)));
    }
    return boost::json::serialize(arr);
}

static std::vector<Category> jsonToCategories(const std::string& json) {
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
// CATEGORÍAS DEL SISTEMA (con Redis)
// ============================================
std::vector<Category> CategoryService::getSystemCategories() {
    auto& redis = redis::RedisClient::getInstance();
    
    if (redis.isConnected()) {
        auto cached = redis.get(REDIS_SYSTEM_KEY);
        if (cached) {
            std::cout << "[Redis] Cache HIT: system categories" << std::endl;
            return jsonToCategories(*cached);
        }
        std::cout << "[Redis] Cache MISS: system categories" << std::endl;
    }
    
    std::vector<Category> categories;
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec(
            "SELECT id, name, type, icon, color, is_system, is_default, created_at "
            "FROM categories WHERE user_id is NULL ORDER BY type, name");
        txn.commit();
        
        for (const auto& row : result) {
            Category cat;
            cat.id = row["id"].as<std::string>();
            cat.name = row["name"].as<std::string>();
            cat.type = row["type"].as<std::string>();
            cat.icon = row["icon"].as<std::string>();
            cat.color = row["color"].as<std::string>();
            cat.isSystem = row["is_system"].as<bool>(); 
            cat.isDefault = row["is_default"].as<bool>(); 
            cat.createdAt = row["created_at"].as<std::string>();
            categories.push_back(cat);
        }
        
        if (redis.isConnected()) {
            redis.set(REDIS_SYSTEM_KEY, categoriesToJson(categories), CACHE_TTL);
            std::cout << "[Redis] Cached " << categories.size() << " system categories" << std::endl;
        }
    } catch (const std::exception& e) {
        std::cerr << "Error getting system categories: " << e.what() << std::endl;
    }
    return categories;
}

// ============================================
// CATEGORÍAS DE USUARIO (con Redis)
// ============================================
std::vector<Category> CategoryService::getUserCategories(const std::string& userId) {
    if (userId.empty()) {
        std::cerr << "[ERROR] getUserCategories called with empty userId" << std::endl;
        return {};
    }
    auto& redis = redis::RedisClient::getInstance();
    std::string redisKey = REDIS_USER_PREFIX + userId;
    
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
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "SELECT id, user_id, name, type, icon, color, is_default, created_at "
            "FROM categories WHERE user_id = $1 ORDER BY name", userId);
        txn.commit();
        
        for (const auto& row : result) {
            Category cat;
            cat.id = row["id"].as<std::string>();
            cat.userId = row["user_id"].as<std::string>();
            cat.name = row["name"].as<std::string>();
            cat.type = row["type"].as<std::string>();
            cat.icon = row["icon"].as<std::string>();
            cat.color = row["color"].as<std::string>();
            cat.isDefault = row["is_default"].as<bool>();
            cat.isSystem = false;
            cat.createdAt = row["created_at"].as<std::string>();
            categories.push_back(cat);
        }
        
        if (redis.isConnected()) {
            redis.set(redisKey, categoriesToJson(categories), CACHE_TTL);
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
    all.insert(all.end(), system.begin(), system.end());
    all.insert(all.end(), user.begin(), user.end());
    return all;
}

// ============================================
// CATEGORÍA POR ID
// ============================================
std::optional<Category> CategoryService::getCategoryById(const std::string& id, const std::string& userId) {
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "SELECT id, user_id, name, type, icon, color, is_default, is_system, created_at "
            "FROM categories WHERE id = $1 AND (user_id = $2 OR is_system = true)", id, userId);
        txn.commit();
        
        if (!result.empty()) {
            const auto& row = result[0];
            Category cat;
            cat.id = row["id"].as<std::string>();
            cat.userId = row["user_id"].is_null() ? "" : row["user_id"].as<std::string>();
            cat.name = row["name"].as<std::string>();
            cat.type = row["type"].as<std::string>();
            cat.icon = row["icon"].as<std::string>();
            cat.color = row["color"].as<std::string>();
            cat.isDefault = row["is_default"].as<bool>();
            cat.isSystem = row["is_system"].as<bool>();
            cat.createdAt = row["created_at"].as<std::string>();
            return cat;
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
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "INSERT INTO categories (id, user_id, name, type, icon, color, is_default) "
            "VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6) RETURNING id, created_at",
            category.userId, category.name, category.type, category.icon, category.color, category.isDefault);
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
// ACTUALIZAR CATEGORÍA DE USUARIO
// ============================================
bool CategoryService::updateUserCategory(const std::string& id, const std::string& userId, const boost::json::object& updates) {
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        
        std::string query = "UPDATE categories SET ";
        std::vector<std::string> setParts;
        
        if (updates.contains("name")) {
            setParts.push_back("name = " + txn.quote(std::string(updates.at("name").as_string())));
        }
        if (updates.contains("type")) {
            setParts.push_back("type = " + txn.quote(std::string(updates.at("type").as_string())));
        }
        if (updates.contains("icon")) {
            setParts.push_back("icon = " + txn.quote(std::string(updates.at("icon").as_string())));
        }
        if (updates.contains("color")) {
            setParts.push_back("color = " + txn.quote(std::string(updates.at("color").as_string())));
        }
        
        if (setParts.empty()) {
            return false;
        }
        
        // Unir las partes
        for (size_t i = 0; i < setParts.size(); ++i) {
            if (i > 0) query += ", ";
            query += setParts[i];
        }
        
        // Agregar WHERE con valores escapados
        query += " WHERE id = " + txn.quote(id) + 
                 " AND user_id = " + txn.quote(userId) +
                 " AND is_system = false";  // Solo categorías de usuario
        
        std::cout << "[UPDATE] Query: " << query << std::endl;
        
        pqxx::result result = txn.exec(query);
        
        if (result.affected_rows() == 0) {
            txn.commit();
            std::cerr << "[UPDATE] No rows affected for category: " << id << std::endl;
            return false;
        }
        
        txn.commit();
        
        invalidateUserCache(userId);
        std::cout << "✓ User category updated: " << id << std::endl;
        return true;
        
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
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        
        // Verificar transacciones asociadas
        pqxx::result check = txn.exec_params("SELECT COUNT(*) FROM transactions WHERE category_id = $1", id);
        if (!check.empty() && check[0][0].as<int>() > 0) {
            std::cerr << "Cannot delete category " << id << " - has transactions" << std::endl;
            return false;
        }
        
        pqxx::result result = txn.exec_params(
            "DELETE FROM categories WHERE id = $1 AND user_id = $2 AND is_system = false", id, userId);
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
// INVALIDACIÓN DE CACHÉ
// ============================================
void CategoryService::invalidateUserCache(const std::string& userId) {
    auto& redis = redis::RedisClient::getInstance();
    if (redis.isConnected()) {
        redis.del(REDIS_USER_PREFIX + userId);
        std::cout << "[Redis] Invalidated user category cache: " << userId << std::endl;
    }
}

void CategoryService::invalidateSystemCache() {
    auto& redis = redis::RedisClient::getInstance();
    if (redis.isConnected()) {
        redis.del(REDIS_SYSTEM_KEY);
        std::cout << "[Redis] Invalidated system categories cache" << std::endl;
    }
}