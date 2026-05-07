#include "wallet_service.hpp"
#include "database.hpp"
#include "redis_client.hpp"
#include <pqxx/pqxx>
#include <iostream>
#include <boost/json.hpp>

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
    obj["color"] = w.color;
    obj["icon"] = w.icon;
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
    w.color = boost::json::value_to<std::string>(obj.at("color"));
    w.icon = boost::json::value_to<std::string>(obj.at("icon"));
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
// CRUD
// ============================================
std::vector<Wallet> WalletService::getWalletsByUser(const std::string& userId) {
    auto& redis = redis::RedisClient::getInstance();
    std::string cacheKey = "wallets:user:" + userId;
    
    if (redis.isConnected()) {
        auto cached = redis.get(cacheKey);
        if (cached) {
            std::cout << "[Redis] Cache HIT: wallets for " << userId << std::endl;
            return jsonToWallets(*cached);
        }
    }
    
    std::vector<Wallet> wallets;
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "SELECT * FROM wallets WHERE user_id = $1 ORDER BY created_at DESC", userId);
        txn.commit();
        for (const auto& row : result) wallets.push_back(rowToWallet(row));
        
        if (redis.isConnected()) {
            redis.set(cacheKey, walletsToJson(wallets), 300);
        }
    } catch (const std::exception& e) {
        std::cerr << "Error getting wallets: " << e.what() << std::endl;
    }
    return wallets;
}

std::optional<Wallet> WalletService::getWalletById(const std::string& id, const std::string& userId) {
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "SELECT * FROM wallets WHERE id = $1 AND user_id = $2", id, userId);
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
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "INSERT INTO wallets (user_id, name, type, bank_name, last_four_digits, color, icon, current_balance, is_active) "
            "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, created_at, updated_at",
            wallet.userId, wallet.name, wallet.type, wallet.bankName, wallet.lastFourDigits,
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
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        
        std::string query = "UPDATE wallets SET ";
        std::vector<std::string> parts;
        auto quote = [&](const std::string& s) { return txn.quote(s); };
        auto toDouble = [](const boost::json::value& v) -> double {
            if (v.is_int64()) return static_cast<double>(v.as_int64());
            if (v.is_double()) return v.as_double();
            return v.to_number<double>();
        };
        
        if (updates.contains("name")) parts.push_back("name = " + quote(std::string(updates.at("name").as_string())));
        if (updates.contains("type")) parts.push_back("type = " + quote(std::string(updates.at("type").as_string())));
        if (updates.contains("bankName")) parts.push_back("bank_name = " + quote(std::string(updates.at("bankName").as_string())));
        if (updates.contains("lastFourDigits")) parts.push_back("last_four_digits = " + quote(std::string(updates.at("lastFourDigits").as_string())));
        if (updates.contains("color")) parts.push_back("color = " + quote(std::string(updates.at("color").as_string())));
        if (updates.contains("icon")) parts.push_back("icon = " + quote(std::string(updates.at("icon").as_string())));
        if (updates.contains("currentBalance")) parts.push_back("current_balance = " + std::to_string(toDouble(updates.at("currentBalance"))));
        if (updates.contains("isActive")) parts.push_back("is_active = " + std::string(updates.at("isActive").as_bool() ? "true" : "false"));
        
        if (parts.empty()) return false;
        
        for (size_t i = 0; i < parts.size(); ++i) { if (i > 0) query += ", "; query += parts[i]; }
        query += ", updated_at = CURRENT_TIMESTAMP WHERE id = " + quote(id) + " AND user_id = " + quote(userId);
        
        pqxx::result result = txn.exec(query);
        txn.commit();
        
        if (result.affected_rows() > 0) { invalidateCache(userId); return true; }
        return false;
    } catch (const std::exception& e) {
        std::cerr << "Error updating wallet: " << e.what() << std::endl;
        return false;
    }
}

bool WalletService::deleteWallet(const std::string& id, const std::string& userId) {
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        auto result = txn.exec_params("DELETE FROM wallets WHERE id = $1 AND user_id = $2", id, userId);
        txn.commit();
        if (result.affected_rows() > 0) { invalidateCache(userId); return true; }
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
    if (redis.isConnected()) {
        redis.del("wallets:user:" + userId);
        std::cout << "[Redis] Invalidated wallets cache for: " << userId << std::endl;
    }
}

// ============================================
// ROW MAPPER
// ============================================
Wallet WalletService::rowToWallet(const pqxx::row& row) {
    Wallet w;
    w.id = row["id"].as<std::string>();
    w.userId = row["user_id"].as<std::string>();
    w.name = row["name"].as<std::string>();
    w.type = row["type"].as<std::string>();
    w.bankName = row["bank_name"].is_null() ? "" : row["bank_name"].as<std::string>();
    w.lastFourDigits = row["last_four_digits"].is_null() ? "" : row["last_four_digits"].as<std::string>();
    w.color = row["color"].is_null() ? "" : row["color"].as<std::string>();
    w.icon = row["icon"].is_null() ? "" : row["icon"].as<std::string>();
    w.currentBalance = row["current_balance"].as<double>();
    w.isActive = row["is_active"].as<bool>();
    w.createdAt = row["created_at"].as<std::string>();
    w.updatedAt = row["updated_at"].as<std::string>();
    return w;
}