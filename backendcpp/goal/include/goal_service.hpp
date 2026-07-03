#pragma once

#include <string>
#include <vector>
#include <optional>
#include <boost/json.hpp>
#include <pqxx/pqxx>
#include <shared_mutex>

struct Goal {
    std::string id;
    std::string userId;
    std::string name;
    double targetAmount;
    double currentAmount;
    std::string targetDate;
    std::string priority;      // 'high', 'medium', 'low'
    std::string status;        // 'active', 'completed', 'failed'
    std::string context;
    std::string purchaseCategoryId;
    std::string completedAt;
    std::string createdAt;
    std::string updatedAt;
};

struct GoalTransaction {
    std::string id;
    std::string goalId;
    double amount;
    std::string type;          // 'add' o 'remove'
    std::string note;
    std::string date;
    std::string walletId;
    std::string createdAt;
};

// ============================================
// CONSTANTES DE SETS PARA CACHÉ
// ============================================
namespace CacheSets {
    constexpr const char* GOALS_USER = "goals:set:user";
    constexpr const char* GOAL_TRANSACTIONS = "goals:set:transactions";
    constexpr const char* TRANSACTIONS_USER = "transactions:set:user";
}

class GoalService {
public:
    static GoalService& getInstance();
    
    // CRUD Goals
    std::vector<Goal> getGoalsByUser(const std::string& userId);
    std::optional<Goal> getGoalById(const std::string& id, const std::string& userId);
    std::optional<Goal> createGoal(const Goal& goal);
    bool updateGoal(const std::string& id, const std::string& userId, const boost::json::object& updates);
    bool deleteGoal(const std::string& id, const std::string& userId);
    
    // Goal Transactions
    std::vector<GoalTransaction> getGoalTransactions(const std::string& goalId, const std::string& userId);
    std::optional<GoalTransaction> addGoalTransaction(const GoalTransaction& transaction, const std::string& userId);
    bool deleteGoalTransaction(const std::string& transactionId, const std::string& userId);
    
    // Cache
    void invalidateCache(const std::string& userId);
    
    // Serialization
    std::string goalToJson(const Goal& g);
    Goal jsonToGoal(const std::string& json);
    std::string goalsToJson(const std::vector<Goal>& goals);
    std::vector<Goal> jsonToGoals(const std::string& json);
    std::string transactionsToJson(const std::vector<GoalTransaction>& transactions);
    std::vector<GoalTransaction> jsonToTransactions(const std::string& json);
    
private:
    GoalService() = default;
    GoalService(const GoalService&) = delete;
    GoalService& operator=(const GoalService&) = delete;
    
    mutable std::shared_mutex cache_mutex_;
    
    Goal rowToGoal(const pqxx::row& row);
    GoalTransaction rowToTransaction(const pqxx::row& row);
    
    // Cache helpers
    void cacheWithTracking(const std::string& key, const std::string& value,
                          const std::string& setKey, int ttl = 300);
    void invalidateBySet(const std::string& setKey, const std::string& pattern = "");
    void invalidateWalletCache(const std::string& userId);
    void invalidateTransactionCache(const std::string& userId);
};

// Prefijos Redis con namespace
namespace RedisKeys {
    const std::string GOALS_USER_PREFIX = "goals:user:";
    const std::string WALLETS_USER_PREFIX = "wallets:user:";      // Cross-service
    const std::string TRANSACTIONS_USER_PREFIX = "transactions:user:"; // Cross-service
    const int CACHE_TTL = 300;
}