#pragma once

#include <string>
#include <vector>
#include <optional>
#include <map>
#include <bsoncxx/oid.hpp>
#include <bsoncxx/document/value.hpp>

struct Wallet {
    std::string id;
    std::string user_id;
    std::string name;           // e.g., "Cuenta de ahorros", "Nequi", "Colchón", "Fondo de emergencia"
    std::string type;           // "bank_account", "digital_wallet", "cash", "savings_goal"
    std::string bank_name;      // "Bancolombia", "Nequi", "RappiPay", "Efectivo", etc.
    double balance;             // saldo actual
    double initial_balance;     // saldo inicial
    std::string currency;       // "COP", "USD"
    std::string account_number; // número de cuenta (opcional)
    std::map<std::string, std::string> metadata;
    std::string created_at;
    std::string last_updated;
    
    bsoncxx::document::value toBson() const;
    static Wallet fromBson(const bsoncxx::document::view& doc);
};

struct Transaction {
    std::string id;
    std::string wallet_id;
    std::string user_id;
    std::string type;           // "income", "expense", "transfer"
    std::string category;       // "salary", "food", "transport", "savings", etc.
    double amount;
    std::string description;
    std::string date;
    std::string created_at;
    
    bsoncxx::document::value toBson() const;
    static Transaction fromBson(const bsoncxx::document::view& doc);
};

class StorageService {
public:
    static StorageService& getInstance();
    
    // Wallet operations
    bool createWallet(const Wallet& wallet, std::string& wallet_id);
    std::optional<Wallet> getWallet(const std::string& id);
    std::vector<Wallet> getWalletsByUser(const std::string& user_id);
    std::vector<Wallet> getWalletsByType(const std::string& user_id, const std::string& type);
    bool updateWallet(const std::string& id, const std::string& name, 
                  const std::string& type, const std::string& bank_name,
                  double balance, const std::string& currency,
                  const std::string& account_number);
    bool deleteWallet(const std::string& id);
    double getTotalBalanceByUser(const std::string& user_id);
    
    // Transaction operations
    bool addTransaction(const Transaction& transaction, std::string& transaction_id);
    std::optional<Transaction> getTransactionById(const std::string& id);
    std::vector<Transaction> getTransactionsByWallet(const std::string& wallet_id);
    std::vector<Transaction> getTransactionsByUser(const std::string& user_id);
    std::vector<Transaction> getTransactionsByDateRange(const std::string& user_id, 
                                                         const std::string& start_date, 
                                                         const std::string& end_date);
    bool updateTransaction(const std::string& id, const Transaction& transaction);
    bool deleteTransaction(const std::string& id);  
    static std::optional<bsoncxx::oid> parseObjectId(const std::string& id);
    
private:
    StorageService() = default;
};