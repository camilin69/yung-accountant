#pragma once

#include <string>
#include <vector>
#include <optional>
#include <boost/json.hpp>
#include <pqxx/pqxx>

struct Transaction {
    std::string id;
    std::string userId;
    std::string walletId;
    std::string categoryId;
    std::string categoryName;
    double amount;
    std::string description;
    std::string date;
    std::vector<std::string> tags;
    std::string createdAt;
    std::string updatedAt;
};

class TransactionService {
public:
    static TransactionService& getInstance();
    
    // CRUD
    std::vector<Transaction> getTransactionsByUser(const std::string& userId, int limit = 100, int offset = 0);
    std::optional<Transaction> getTransactionById(const std::string& id, const std::string& userId);
    std::optional<Transaction> createTransaction(const Transaction& transaction);
    bool updateTransaction(const std::string& id, const std::string& userId, const boost::json::object& updates);
    bool deleteTransaction(const std::string& id, const std::string& userId);
    
    // Filters
    std::vector<Transaction> getTransactionsByWallet(const std::string& walletId, const std::string& userId);
    std::vector<Transaction> getTransactionsByCategory(const std::string& categoryId, const std::string& userId);
    std::vector<Transaction> getTransactionsByDateRange(const std::string& userId, const std::string& startDate, const std::string& endDate);
    
    // Cache
    void invalidateCache(const std::string& userId);
    
private:
    TransactionService() = default;
    
    Transaction rowToTransaction(const pqxx::row& row);
    
    std::string transactionToJson(const Transaction& t);
    Transaction jsonToTransaction(const std::string& json);
    std::string transactionsToJson(const std::vector<Transaction>& transactions);
    std::vector<Transaction> jsonToTransactions(const std::string& json);
    std::string tagsToDbArray(const std::vector<std::string>& tags);
    std::vector<std::string> parseTags(const std::string& dbArray);
};