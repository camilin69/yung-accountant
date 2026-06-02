#pragma once

#include <string>
#include <vector>
#include <optional>
#include <pqxx/pqxx>  
#include <boost/json.hpp>
#include <shared_mutex>

struct Category {
    std::string id;
    std::string userId;
    std::string name;
    std::string type;        // 'income' o 'expense'
    std::string icon;
    std::string color;
    bool isSystem = false;   // true = categoría del sistema (inmutable)
    bool isDefault = false;  // true = categoría por defecto
    std::string createdAt;
};

// ============================================
// CONSTANTES DE SETS PARA CACHÉ
// ============================================
namespace CacheSets {
    constexpr const char* SYSTEM_CATEGORIES = "categories:set:system";
    constexpr const char* USER_CATEGORIES = "categories:set:user";
}

class CategoryService {
public:
    static CategoryService& getInstance();
    
    // Obtener categorías
    std::vector<Category> getSystemCategories();
    std::vector<Category> getUserCategories(const std::string& userId);
    std::vector<Category> getAllCategories(const std::string& userId);
    std::optional<Category> getCategoryById(const std::string& id, const std::string& userId);
    
    // CRUD de categorías de usuario
    std::optional<Category> createUserCategory(const Category& category);
    bool updateUserCategory(const std::string& id, const std::string& userId, const boost::json::object& updates);
    bool deleteUserCategory(const std::string& id, const std::string& userId);
    
    // Cache
    void invalidateUserCache(const std::string& userId);
    void invalidateSystemCache();
    
    // Serialization
    std::string categoryToJson(const Category& cat);
    Category jsonToCategory(const std::string& json);
    std::string categoriesToJson(const std::vector<Category>& cats);
    std::vector<Category> jsonToCategories(const std::string& json);
    
private:
    CategoryService() = default;
    CategoryService(const CategoryService&) = delete;
    CategoryService& operator=(const CategoryService&) = delete;
    
    mutable std::shared_mutex cache_mutex_;
    
    // Cache helpers
    void cacheWithTracking(const std::string& key, const std::string& value,
                          const std::string& setKey, int ttl = 300);
    void invalidateBySet(const std::string& setKey, const std::string& pattern = "");
    
    // Row mapper
    Category rowToCategory(const pqxx::row& row, bool isSystem);
};

// Prefijos Redis con namespace
namespace RedisKeys {
    const std::string SYSTEM_CATEGORIES = "categories:system";
    const std::string USER_CATEGORIES_PREFIX = "categories:user:";
    const int CACHE_TTL = 300;
}