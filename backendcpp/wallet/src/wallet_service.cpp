#include "wallet_service.hpp"
#include "database.hpp"
#include "redis_client.hpp"
#include <pqxx/pqxx>
#include <iostream>
#include <boost/json.hpp>

// ============================================
// POOL CONNECTION
// ============================================

// ============================================
// SERIALIZACIÓN
// ============================================
std::string WalletService::walletToJson(const Wallet& w) {
    boost::json::object obj;
    obj["id"] = w.id;
    obj["userId"] = w.userId;
    obj["name"] = w.name;
    obj["type"] = w.type;
    obj["bankName"] = w.bankName.empty() ? nullptr : boost::json::value(w.bankName);
    obj["lastFourDigits"] = w.lastFourDigits.empty() ? nullptr : boost::json::value(w.lastFourDigits);
    obj["color"] = w.color.empty() ? nullptr : boost::json::value(w.color);
    obj["icon"] = w.icon.empty() ? nullptr : boost::json::value(w.icon);
    obj["currentBalance"] = w.currentBalance;
    obj["isActive"] = w.isActive;
    obj["createdAt"] = w.createdAt;
    obj["updatedAt"] = w.updatedAt;
    return boost::json::serialize(obj);
}

Wallet WalletService::jsonToWallet(const std::string& json) {
    auto jv = boost::json::parse(json);
    auto& obj = jv.as_object();
    Wallet w;
    w.id = boost::json::value_to<std::string>(obj.at("id"));
    w.userId = boost::json::value_to<std::string>(obj.at("userId"));
    w.name = boost::json::value_to<std::string>(obj.at("name"));
    w.type = boost::json::value_to<std::string>(obj.at("type"));
    w.bankName = obj.at("bankName").is_null() ? "" : boost::json::value_to<std::string>(obj.at("bankName"));
    w.lastFourDigits = obj.at("lastFourDigits").is_null() ? "" : boost::json::value_to<std::string>(obj.at("lastFourDigits"));
    w.color = obj.at("color").is_null() ? "" : boost::json::value_to<std::string>(obj.at("color"));
    w.icon = obj.at("icon").is_null() ? "" : boost::json::value_to<std::string>(obj.at("icon"));
    w.currentBalance = obj.at("currentBalance").as_double();
    w.isActive = obj.at("isActive").as_bool();
    w.createdAt = boost::json::value_to<std::string>(obj.at("createdAt"));
    w.updatedAt = boost::json::value_to<std::string>(obj.at("updatedAt"));
    return w;
}

std::string WalletService::walletsToJson(const std::vector<Wallet>& wallets) {
    boost::json::array arr;
    for (const auto& w : wallets) arr.push_back(boost::json::parse(walletToJson(w)));
    return boost::json::serialize(arr);
}

std::vector<Wallet> WalletService::jsonToWallets(const std::string& json) {
    std::vector<Wallet> result;
    auto jv = boost::json::parse(json);
    for (const auto& item : jv.as_array()) result.push_back(jsonToWallet(boost::json::serialize(item)));
    return result;
}

// ============================================
// SINGLETON
// ============================================
WalletService& WalletService::getInstance() {
    static WalletService instance;
    return instance;
}

// ============================================
// CACHE HELPERS
// ============================================
void WalletService::cacheWithTracking(const std::string& key, const std::string& value,
                                      const std::string& setKey, int ttl) {
    auto& redis = redis::RedisClient::getInstance();
    if (!redis.isConnected()) return;
    
    if (redis.set(key, value, ttl)) {
        redis.sadd(setKey, key);
        redis.expire(setKey, ttl * 2);
    }
}

void WalletService::invalidateBySet(const std::string& setKey, const std::string& pattern) {
    auto& redis = redis::RedisClient::getInstance();
    if (!redis.isConnected()) return;
    
    if (!pattern.empty()) {
        redis.delByPattern(pattern);
    }
    auto members = redis.smembers(setKey);
    for (const auto& key : members) {
        if (!redis.exists(key)) redis.srem(setKey, key);
    }
}

// ============================================
// CRUD
// ============================================
std::vector<Wallet> WalletService::getWalletsByUser(const std::string& userId) {
    auto& redis = redis::RedisClient::getInstance();
    std::string cacheKey = RedisKeys::WALLETS_USER_PREFIX + userId;
    
    if (redis.isConnected()) {
        auto cached = redis.get(cacheKey);
        if (cached) {
            std::cout << "[Redis] Cache HIT: wallets for " << userId << std::endl;
            return jsonToWallets(*cached);
        }
    }
    
    std::vector<Wallet> wallets;
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "SELECT * FROM wallets WHERE user_id = $1::uuid ORDER BY created_at DESC", userId);
        txn.commit();
        for (const auto& row : result) wallets.push_back(rowToWallet(row));
        
        if (redis.isConnected()) {
            cacheWithTracking(cacheKey, walletsToJson(wallets), CacheSets::WALLETS_USER, RedisKeys::CACHE_TTL);
        }
    } catch (const std::exception& e) {
        std::cerr << "Error getting wallets: " << e.what() << std::endl;
    }
    return wallets;
}

std::optional<Wallet> WalletService::getWalletById(const std::string& id, const std::string& userId) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "SELECT * FROM wallets WHERE id = $1::uuid AND user_id = $2::uuid", id, userId);
        txn.commit();
        if (!result.empty()) return rowToWallet(result[0]);
        return std::nullopt;
    } catch (const std::exception& e) {
        std::cerr << "Error getting wallet: " << e.what() << std::endl;
        return std::nullopt;
    }
}

std::optional<Wallet> WalletService::createWallet(const Wallet& wallet) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "INSERT INTO wallets (user_id, name, type, bank_name, last_four_digits, color, icon, current_balance, is_active) "
            "VALUES ($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, created_at, updated_at",
            wallet.userId, wallet.name, wallet.type, 
            wallet.bankName.empty() ? std::optional<std::string>() : std::optional<std::string>(wallet.bankName),
            wallet.lastFourDigits.empty() ? std::optional<std::string>() : std::optional<std::string>(wallet.lastFourDigits),
            wallet.color, wallet.icon, wallet.currentBalance, wallet.isActive);
        txn.commit();
        
        if (!result.empty()) {
            Wallet w = wallet;
            w.id = result[0]["id"].as<std::string>();
            w.createdAt = result[0]["created_at"].as<std::string>();
            w.updatedAt = result[0]["updated_at"].as<std::string>();
            invalidateCache(wallet.userId);
            return w;
        }
        return std::nullopt;
    } catch (const std::exception& e) {
        std::cerr << "Error creating wallet: " << e.what() << std::endl;
        return std::nullopt;
    }
}

bool WalletService::updateWallet(const std::string& id, const std::string& userId, const boost::json::object& updates) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        std::vector<std::string> setClauses;
        std::vector<std::string> paramValues;
        
        auto toDouble = [](const boost::json::value& v) -> double {
            if (v.is_int64()) return static_cast<double>(v.as_int64());
            if (v.is_double()) return v.as_double();
            return v.to_number<double>();
        };
        
        // ✅ Usar parámetros posicionales en lugar de txn.quote()
        if (updates.contains("name")) {
            setClauses.push_back("name = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(std::string(updates.at("name").as_string()));
        }
        if (updates.contains("type")) {
            setClauses.push_back("type = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(std::string(updates.at("type").as_string()));
        }
        if (updates.contains("bankName")) {
            setClauses.push_back("bank_name = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(std::string(updates.at("bankName").as_string()));
        }
        if (updates.contains("lastFourDigits")) {
            setClauses.push_back("last_four_digits = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(std::string(updates.at("lastFourDigits").as_string()));
        }
        if (updates.contains("color")) {
            setClauses.push_back("color = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(std::string(updates.at("color").as_string()));
        }
        if (updates.contains("icon")) {
            setClauses.push_back("icon = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(std::string(updates.at("icon").as_string()));
        }
        if (updates.contains("currentBalance")) {
            setClauses.push_back("current_balance = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(std::to_string(toDouble(updates.at("currentBalance"))));
        }
        if (updates.contains("isActive")) {
            setClauses.push_back("is_active = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(updates.at("isActive").as_bool() ? "true" : "false");
        }
        
        if (setClauses.empty()) return false;
        
        std::string query = "UPDATE wallets SET ";
        for (size_t i = 0; i < setClauses.size(); ++i) {
            if (i > 0) query += ", ";
            query += setClauses[i];
        }
        query += ", updated_at = CURRENT_TIMESTAMP WHERE id = $" + 
                 std::to_string(paramValues.size() + 1) + "::uuid AND user_id = $" + 
                 std::to_string(paramValues.size() + 2) + "::uuid";
        
        paramValues.push_back(id);
        paramValues.push_back(userId);
        
        pqxx::result result;
        switch (paramValues.size()) {
            case 2: result = txn.exec_params(query, paramValues[0], paramValues[1]); break;
            case 3: result = txn.exec_params(query, paramValues[0], paramValues[1], paramValues[2]); break;
            case 4: result = txn.exec_params(query, paramValues[0], paramValues[1], paramValues[2], paramValues[3]); break;
            case 5: result = txn.exec_params(query, paramValues[0], paramValues[1], paramValues[2], paramValues[3], paramValues[4]); break;
            case 6: result = txn.exec_params(query, paramValues[0], paramValues[1], paramValues[2], paramValues[3], paramValues[4], paramValues[5]); break;
            case 7: result = txn.exec_params(query, paramValues[0], paramValues[1], paramValues[2], paramValues[3], paramValues[4], paramValues[5], paramValues[6]); break;
            case 8: result = txn.exec_params(query, paramValues[0], paramValues[1], paramValues[2], paramValues[3], paramValues[4], paramValues[5], paramValues[6], paramValues[7]); break;
            case 9: result = txn.exec_params(query, paramValues[0], paramValues[1], paramValues[2], paramValues[3], paramValues[4], paramValues[5], paramValues[6], paramValues[7], paramValues[8]); break;
            case 10: result = txn.exec_params(query, paramValues[0], paramValues[1], paramValues[2], paramValues[3], paramValues[4], paramValues[5], paramValues[6], paramValues[7], paramValues[8], paramValues[9]); break;
            default: return false;
        }
        
        txn.commit();
        
        if (result.affected_rows() > 0) {
            invalidateCache(userId);
            return true;
        }
        return false;
    } catch (const std::exception& e) {
        std::cerr << "Error updating wallet: " << e.what() << std::endl;
        return false;
    }
}

bool WalletService::deleteWallet(const std::string& id, const std::string& userId) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        auto result = txn.exec_params(
            "DELETE FROM wallets WHERE id = $1::uuid AND user_id = $2::uuid", id, userId);
        txn.commit();
        if (result.affected_rows() > 0) {
            invalidateCache(userId);
            return true;
        }
        return false;
    } catch (const std::exception& e) {
        std::cerr << "Error deleting wallet: " << e.what() << std::endl;
        return false;
    }
}

// ============================================
// CACHE
// ============================================
void WalletService::invalidateCache(const std::string& userId) {
    auto& redis = redis::RedisClient::getInstance();
    if (!redis.isConnected()) return;
    
    std::string cacheKey = RedisKeys::WALLETS_USER_PREFIX + userId;
    redis.del(cacheKey);
    redis.srem(CacheSets::WALLETS_USER, cacheKey);
    
    std::cout << "[Redis] Invalidated wallets cache for: " << userId << std::endl;
}

// ============================================
// ROW MAPPER
// ============================================
Wallet WalletService::rowToWallet(const pqxx::row& row) {
    Wallet w;
    try { w.id = row["id"].is_null() ? "" : row["id"].as<std::string>(); } catch (...) { w.id = ""; }
    try { w.userId = row["user_id"].is_null() ? "" : row["user_id"].as<std::string>(); } catch (...) { w.userId = ""; }
    try { w.name = row["name"].is_null() ? "" : row["name"].as<std::string>(); } catch (...) { w.name = ""; }
    try { w.type = row["type"].is_null() ? "" : row["type"].as<std::string>(); } catch (...) { w.type = ""; }
    try { w.bankName = row["bank_name"].is_null() ? "" : row["bank_name"].as<std::string>(); } catch (...) { w.bankName = ""; }
    try { w.lastFourDigits = row["last_four_digits"].is_null() ? "" : row["last_four_digits"].as<std::string>(); } catch (...) { w.lastFourDigits = ""; }
    try { w.color = row["color"].is_null() ? "" : row["color"].as<std::string>(); } catch (...) { w.color = ""; }
    try { w.icon = row["icon"].is_null() ? "" : row["icon"].as<std::string>(); } catch (...) { w.icon = ""; }
    try { w.currentBalance = row["current_balance"].is_null() ? 0 : row["current_balance"].as<double>(); } catch (...) { w.currentBalance = 0; }
    try { w.isActive = row["is_active"].is_null() ? true : row["is_active"].as<bool>(); } catch (...) { w.isActive = true; }
    try { w.createdAt = row["created_at"].is_null() ? "" : row["created_at"].as<std::string>(); } catch (...) { w.createdAt = ""; }
    try { w.updatedAt = row["updated_at"].is_null() ? "" : row["updated_at"].as<std::string>(); } catch (...) { w.updatedAt = ""; }
    return w;
}