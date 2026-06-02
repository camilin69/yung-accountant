#pragma once

#include <string>
#include <vector>
#include <optional>
#include <boost/json.hpp>
#include <pqxx/pqxx>
#include <shared_mutex>

struct Wallet {
    std::string id;
    std::string userId;
    std::string name;
    std::string type;         // 'cash', 'bank_account', 'credit_card', 'debit_card', 'other'
    std::string bankName;
    std::string lastFourDigits;
    std::string color;
    std::string icon;
    double currentBalance;
    bool isActive;
    std::string createdAt;
    std::string updatedAt;
};

// ============================================
// CONSTANTES DE SETS PARA CACHÉ
// ============================================
namespace CacheSets {
    constexpr const char* WALLETS_USER = "wallets:set:user";
}

class WalletService {
public:
    static WalletService& getInstance();
    
    // CRUD
    std::vector<Wallet> getWalletsByUser(const std::string& userId);
    std::optional<Wallet> getWalletById(const std::string& id, const std::string& userId);
    std::optional<Wallet> createWallet(const Wallet& wallet);
    bool updateWallet(const std::string& id, const std::string& userId, const boost::json::object& updates);
    bool deleteWallet(const std::string& id, const std::string& userId);
    
    // Cache
    void invalidateCache(const std::string& userId);
    
    // Serialization
    std::string walletToJson(const Wallet& w);
    Wallet jsonToWallet(const std::string& json);
    std::string walletsToJson(const std::vector<Wallet>& wallets);
    std::vector<Wallet> jsonToWallets(const std::string& json);
    
private:
    WalletService() = default;
    WalletService(const WalletService&) = delete;
    WalletService& operator=(const WalletService&) = delete;
    
    mutable std::shared_mutex cache_mutex_;
    
    Wallet rowToWallet(const pqxx::row& row);
    
    // Cache helpers
    void cacheWithTracking(const std::string& key, const std::string& value,
                          const std::string& setKey, int ttl = 300);
    void invalidateBySet(const std::string& setKey, const std::string& pattern = "");
};

// Prefijos Redis con namespace
namespace RedisKeys {
    const std::string WALLETS_USER_PREFIX = "wallets:user:";
    const int CACHE_TTL = 300;
}