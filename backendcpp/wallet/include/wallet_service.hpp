#pragma once

#include <string>
#include <vector>
#include <optional>
#include <boost/json.hpp>
#include <pqxx/pqxx>

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
    
private:
    WalletService() = default;
    
    Wallet rowToWallet(const pqxx::row& row);
    
    std::string walletToJson(const Wallet& w);
    Wallet jsonToWallet(const std::string& json);
    std::string walletsToJson(const std::vector<Wallet>& wallets);
    std::vector<Wallet> jsonToWallets(const std::string& json);
};