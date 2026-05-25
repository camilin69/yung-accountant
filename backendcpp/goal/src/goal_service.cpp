#include "goal_service.hpp"
#include "database.hpp"
#include "redis_client.hpp"
#include <pqxx/pqxx>
#include <iostream>
#include <boost/json.hpp>

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
std::string GoalService::goalToJson(const Goal& g) {
    boost::json::object obj;
    obj["id"] = g.id;
    obj["userId"] = g.userId;
    obj["name"] = g.name;
    obj["targetAmount"] = g.targetAmount;
    obj["currentAmount"] = g.currentAmount;
    obj["targetDate"] = g.targetDate;
    obj["priority"] = g.priority;
    obj["status"] = g.status;
    obj["context"] = g.context.empty() ? nullptr : boost::json::value(g.context);
    obj["purchaseCategoryId"] = g.purchaseCategoryId.empty() ? nullptr : boost::json::value(g.purchaseCategoryId);
    obj["completedAt"] = g.completedAt.empty() ? nullptr : boost::json::value(g.completedAt);
    obj["createdAt"] = g.createdAt;
    obj["updatedAt"] = g.updatedAt;
    return boost::json::serialize(obj);
}

Goal GoalService::jsonToGoal(const std::string& json) {
    auto jv = boost::json::parse(json);
    auto& obj = jv.as_object();
    Goal g;
    g.id = boost::json::value_to<std::string>(obj.at("id"));
    g.userId = boost::json::value_to<std::string>(obj.at("userId"));
    g.name = boost::json::value_to<std::string>(obj.at("name"));
    g.targetAmount = obj.at("targetAmount").as_double();
    g.currentAmount = obj.at("currentAmount").as_double();
    g.targetDate = boost::json::value_to<std::string>(obj.at("targetDate"));
    g.priority = boost::json::value_to<std::string>(obj.at("priority"));
    g.status = boost::json::value_to<std::string>(obj.at("status"));
    g.context = obj.at("context").is_null() ? "" : boost::json::value_to<std::string>(obj.at("context"));
    g.purchaseCategoryId = obj.at("purchaseCategoryId").is_null() ? "" : boost::json::value_to<std::string>(obj.at("purchaseCategoryId"));
    g.completedAt = obj.at("completedAt").is_null() ? "" : boost::json::value_to<std::string>(obj.at("completedAt"));
    g.createdAt = boost::json::value_to<std::string>(obj.at("createdAt"));
    g.updatedAt = boost::json::value_to<std::string>(obj.at("updatedAt"));
    return g;
}

std::string GoalService::goalsToJson(const std::vector<Goal>& goals) {
    boost::json::array arr;
    for (const auto& g : goals) arr.push_back(boost::json::parse(goalToJson(g)));
    return boost::json::serialize(arr);
}

std::vector<Goal> GoalService::jsonToGoals(const std::string& json) {
    std::vector<Goal> result;
    auto jv = boost::json::parse(json);
    for (const auto& item : jv.as_array()) result.push_back(jsonToGoal(boost::json::serialize(item)));
    return result;
}

std::string GoalService::transactionsToJson(const std::vector<GoalTransaction>& transactions) {
    boost::json::array arr;
    for (const auto& t : transactions) {
        boost::json::object obj;
        obj["id"] = t.id; obj["goalId"] = t.goalId; obj["amount"] = t.amount;
        obj["type"] = t.type; obj["note"] = t.note.empty() ? nullptr : boost::json::value(t.note);
        obj["date"] = t.date; obj["walletId"] = t.walletId.empty() ? nullptr : boost::json::value(t.walletId);
        obj["createdAt"] = t.createdAt;
        arr.push_back(obj);
    }
    return boost::json::serialize(arr);
}

std::vector<GoalTransaction> GoalService::jsonToTransactions(const std::string& json) {
    std::vector<GoalTransaction> result;
    auto jv = boost::json::parse(json);
    for (const auto& item : jv.as_array()) {
        auto& obj = item.as_object();
        GoalTransaction t;
        t.id = boost::json::value_to<std::string>(obj.at("id"));
        t.goalId = boost::json::value_to<std::string>(obj.at("goalId"));
        t.amount = obj.at("amount").as_double();
        t.type = boost::json::value_to<std::string>(obj.at("type"));
        t.note = obj.at("note").is_null() ? "" : boost::json::value_to<std::string>(obj.at("note"));
        t.date = boost::json::value_to<std::string>(obj.at("date"));
        t.walletId = obj.at("walletId").is_null() ? "" : boost::json::value_to<std::string>(obj.at("walletId"));
        t.createdAt = boost::json::value_to<std::string>(obj.at("createdAt"));
        result.push_back(t);
    }
    return result;
}

// ============================================
// SINGLETON
// ============================================
GoalService& GoalService::getInstance() {
    static GoalService instance;
    return instance;
}

// ============================================
// CACHE HELPERS
// ============================================
void GoalService::cacheWithTracking(const std::string& key, const std::string& value,
                                    const std::string& setKey, int ttl) {
    auto& redis = redis::RedisClient::getInstance();
    if (!redis.isConnected()) return;
    
    if (redis.set(key, value, ttl)) {
        redis.sadd(setKey, key);
    }
}

void GoalService::invalidateBySet(const std::string& setKey, const std::string& pattern) {
    auto& redis = redis::RedisClient::getInstance();
    if (!redis.isConnected()) return;
    
    bool success = redis.delSet(setKey);
    
    if (!success && !pattern.empty()) {
        std::cerr << "[Cache] SET '" << setKey << "' not found, using SCAN fallback" << std::endl;
        redis.delByPattern(pattern);
    }
}

void GoalService::invalidateWalletCache(const std::string& userId) {
    auto& redis = redis::RedisClient::getInstance();
    if (redis.isConnected()) {
        redis.del("wallets:user:" + userId);
    }
}

void GoalService::invalidateTransactionCache(const std::string& userId) {
    auto& redis = redis::RedisClient::getInstance();
    if (redis.isConnected()) {
        redis.delByPattern("transactions:user:" + userId + ":*");
    }
}

// ============================================
// CRUD GOALS
// ============================================
std::vector<Goal> GoalService::getGoalsByUser(const std::string& userId) {
    auto& redis = redis::RedisClient::getInstance();
    std::string cacheKey = RedisKeys::GOALS_USER_PREFIX + userId;
    
    if (redis.isConnected()) {
        auto cached = redis.get(cacheKey);
        if (cached) {
            std::cout << "[Redis] Cache HIT: goals for " << userId << std::endl;
            return jsonToGoals(*cached);
        }
    }
    
    std::vector<Goal> goals;
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "SELECT * FROM goals WHERE user_id = $1::uuid ORDER BY created_at DESC", userId);
        txn.commit();
        
        for (const auto& row : result) goals.push_back(rowToGoal(row));
        
        if (redis.isConnected()) {
            cacheWithTracking(cacheKey, goalsToJson(goals), CacheSets::GOALS_USER, RedisKeys::CACHE_TTL);
        }
    } catch (const std::exception& e) {
        std::cerr << "Error getting goals: " << e.what() << std::endl;
    }
    return goals;
}

std::optional<Goal> GoalService::getGoalById(const std::string& id, const std::string& userId) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "SELECT * FROM goals WHERE id = $1::uuid AND user_id = $2::uuid", id, userId);
        txn.commit();
        if (!result.empty()) return rowToGoal(result[0]);
        return std::nullopt;
    } catch (const std::exception& e) {
        std::cerr << "Error getting goal: " << e.what() << std::endl;
        return std::nullopt;
    }
}

std::optional<Goal> GoalService::createGoal(const Goal& goal) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "INSERT INTO goals (user_id, name, target_amount, current_amount, target_date, "
            "priority, status, context, purchase_category_id) "
            "VALUES ($1::uuid,$2,$3,$4,$5::date,$6,$7,$8,$9::uuid) "
            "RETURNING id, created_at, updated_at",
            goal.userId, goal.name, goal.targetAmount, goal.currentAmount, goal.targetDate,
            goal.priority, goal.status, 
            goal.context.empty() ? std::optional<std::string>() : std::optional<std::string>(goal.context),
            goal.purchaseCategoryId.empty() ? std::optional<std::string>() : std::optional<std::string>(goal.purchaseCategoryId));
        txn.commit();
        
        if (!result.empty()) {
            Goal g = goal;
            g.id = result[0]["id"].as<std::string>();
            g.createdAt = result[0]["created_at"].as<std::string>();
            g.updatedAt = result[0]["updated_at"].as<std::string>();
            invalidateCache(goal.userId);
            return g;
        }
        return std::nullopt;
    } catch (const std::exception& e) {
        std::cerr << "Error creating goal: " << e.what() << std::endl;
        return std::nullopt;
    }
}

bool GoalService::updateGoal(const std::string& id, const std::string& userId, const boost::json::object& updates) {
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
        
        if (updates.contains("name")) {
            setClauses.push_back("name = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(std::string(updates.at("name").as_string()));
        }
        if (updates.contains("targetAmount")) {
            setClauses.push_back("target_amount = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(std::to_string(toDouble(updates.at("targetAmount"))));
        }
        if (updates.contains("currentAmount")) {
            setClauses.push_back("current_amount = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(std::to_string(toDouble(updates.at("currentAmount"))));
        }
        if (updates.contains("targetDate")) {
            setClauses.push_back("target_date = $" + std::to_string(paramValues.size() + 1) + "::date");
            paramValues.push_back(std::string(updates.at("targetDate").as_string()));
        }
        if (updates.contains("priority")) {
            setClauses.push_back("priority = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(std::string(updates.at("priority").as_string()));
        }
        if (updates.contains("status")) {
            setClauses.push_back("status = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(std::string(updates.at("status").as_string()));
        }
        if (updates.contains("context")) {
            setClauses.push_back("context = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(std::string(updates.at("context").as_string()));
        }
        if (updates.contains("completedAt")) {
            setClauses.push_back("completed_at = $" + std::to_string(paramValues.size() + 1) + "::timestamp");
            paramValues.push_back(std::string(updates.at("completedAt").as_string()));
        }
        if (updates.contains("purchaseCategoryId")) {
            setClauses.push_back("purchase_category_id = $" + std::to_string(paramValues.size() + 1) + "::uuid");
            paramValues.push_back(std::string(updates.at("purchaseCategoryId").as_string()));
        }
        
        if (setClauses.empty()) return false;
        
        std::string query = "UPDATE goals SET ";
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
            case 11: result = txn.exec_params(query, paramValues[0], paramValues[1], paramValues[2], paramValues[3], paramValues[4], paramValues[5], paramValues[6], paramValues[7], paramValues[8], paramValues[9], paramValues[10]); break;
            default: return false;
        }
        
        txn.commit();
        
        if (result.affected_rows() > 0) {
            invalidateCache(userId);
            return true;
        }
        return false;
    } catch (const std::exception& e) {
        std::cerr << "Error updating goal: " << e.what() << std::endl;
        return false;
    }
}

bool GoalService::deleteGoal(const std::string& id, const std::string& userId) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        auto goalResult = txn.exec_params(
            "SELECT * FROM goals WHERE id = $1::uuid AND user_id = $2::uuid", id, userId);
        if (goalResult.empty()) {
            txn.commit();
            return false;
        }
        
        auto txResults = txn.exec_params(
            "SELECT wallet_id, amount, type FROM goal_transactions WHERE goal_id = $1::uuid", id);
        for (const auto& tx : txResults) {
            std::string walletId = tx["wallet_id"].is_null() ? "" : tx["wallet_id"].as<std::string>();
            double amount = tx["amount"].as<double>();
            std::string type = tx["type"].as<std::string>();
            
            if (!walletId.empty()) {
                if (type == "add") {
                    txn.exec_params("UPDATE wallets SET current_balance = current_balance + $1 WHERE id = $2::uuid", amount, walletId);
                } else {
                    txn.exec_params("UPDATE wallets SET current_balance = current_balance - $1 WHERE id = $2::uuid", amount, walletId);
                }
            }
        }
        
        txn.exec_params("DELETE FROM goal_transactions WHERE goal_id = $1::uuid", id);
        txn.exec_params("DELETE FROM transactions WHERE $1 = ANY(tags)", id);
        
        auto result = txn.exec_params(
            "DELETE FROM goals WHERE id = $1::uuid AND user_id = $2::uuid", id, userId);
        txn.commit();
        
        if (result.affected_rows() > 0) {
            invalidateCache(userId);
            invalidateWalletCache(userId);
            invalidateTransactionCache(userId);
            std::cout << "✓ Goal deleted with all transactions: " << id << std::endl;
            return true;
        }
        return false;
    } catch (const std::exception& e) {
        std::cerr << "Error deleting goal: " << e.what() << std::endl;
        return false;
    }
}

// ============================================
// GOAL TRANSACTIONS
// ============================================
std::vector<GoalTransaction> GoalService::getGoalTransactions(const std::string& goalId) {
    std::vector<GoalTransaction> transactions;
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        auto result = txn.exec_params(
            "SELECT * FROM goal_transactions WHERE goal_id = $1::uuid ORDER BY date DESC", goalId);
        txn.commit();
        for (const auto& row : result) transactions.push_back(rowToTransaction(row));
    } catch (const std::exception& e) {
        std::cerr << "Error getting goal transactions: " << e.what() << std::endl;
    }
    return transactions;
}

std::optional<GoalTransaction> GoalService::addGoalTransaction(const GoalTransaction& transaction) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        std::string userId, goalName;
        auto goalResult = txn.exec_params(
            "SELECT user_id, name FROM goals WHERE id = $1::uuid", transaction.goalId);
        if (!goalResult.empty()) {
            userId = goalResult[0]["user_id"].as<std::string>();
            goalName = goalResult[0]["name"].as<std::string>();
        }
        
        std::string categoryId;
        auto catResult = txn.exec(
            "SELECT id FROM categories WHERE name = 'Goal Transaction' AND is_system = true LIMIT 1");
        if (!catResult.empty()) {
            categoryId = catResult[0]["id"].as<std::string>();
        }
        
        std::string description = transaction.type == "add" 
            ? "Added funds to goal: " + goalName 
            : "Removed funds from goal: " + goalName;
        
        std::vector<std::string> tags = {"goal", transaction.goalId};
        
        auto txResult = txn.exec_params(
            "INSERT INTO transactions (user_id, wallet_id, category_id, amount, description, date, tags) "
            "VALUES ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6::timestamp,$7) RETURNING id",
            userId, 
            transaction.walletId.empty() ? std::optional<std::string>() : std::optional<std::string>(transaction.walletId),
            categoryId.empty() ? std::optional<std::string>() : std::optional<std::string>(categoryId),
            transaction.amount, description, transaction.date, tags);
        
        std::string transactionId = txResult[0]["id"].as<std::string>();
        
        if (transaction.type == "add") {
            txn.exec_params("UPDATE goals SET current_amount = current_amount + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2::uuid",
                transaction.amount, transaction.goalId);
        } else {
            txn.exec_params("UPDATE goals SET current_amount = current_amount - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2::uuid",
                transaction.amount, transaction.goalId);
        }
        
        if (!transaction.walletId.empty()) {
            if (transaction.type == "add") {
                txn.exec_params("UPDATE wallets SET current_balance = current_balance - $1 WHERE id = $2::uuid",
                    transaction.amount, transaction.walletId);
            } else {
                txn.exec_params("UPDATE wallets SET current_balance = current_balance + $1 WHERE id = $2::uuid",
                    transaction.amount, transaction.walletId);
            }
        }
        
        auto result = txn.exec_params(
            "INSERT INTO goal_transactions (goal_id, transaction_id, amount, type, note, date, wallet_id) "
            "VALUES ($1::uuid,$2::uuid,$3,$4,$5,$6::date,$7::uuid) RETURNING id, created_at",
            transaction.goalId, transactionId, transaction.amount, transaction.type,
            transaction.note.empty() ? std::optional<std::string>() : std::optional<std::string>(transaction.note),
            transaction.date,
            transaction.walletId.empty() ? std::optional<std::string>() : std::optional<std::string>(transaction.walletId));
        
        txn.commit();
        
        if (!userId.empty()) {
            invalidateCache(userId);
            invalidateWalletCache(userId);
            invalidateTransactionCache(userId);
        }
        
        GoalTransaction t = transaction;
        t.id = result[0]["id"].as<std::string>();
        t.createdAt = result[0]["created_at"].as<std::string>();
        return t;
        
    } catch (const std::exception& e) { 
        std::cerr << "Error adding goal transaction: " << e.what() << std::endl;
        return std::nullopt; 
    }
}

bool GoalService::deleteGoalTransaction(const std::string& transactionId) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        auto txResult = txn.exec_params(
            "SELECT goal_id, amount, type, wallet_id, transaction_id FROM goal_transactions WHERE id = $1::uuid", 
            transactionId);
        if (txResult.empty()) {
            txn.commit();
            return false;
        }
        
        std::string goalId = txResult[0]["goal_id"].as<std::string>();
        double amount = txResult[0]["amount"].as<double>();
        std::string type = txResult[0]["type"].as<std::string>();
        std::string walletId = txResult[0]["wallet_id"].is_null() ? "" : txResult[0]["wallet_id"].as<std::string>();
        std::string txId = txResult[0]["transaction_id"].is_null() ? "" : txResult[0]["transaction_id"].as<std::string>();
        
        std::string userId;
        auto goalResult = txn.exec_params("SELECT user_id FROM goals WHERE id = $1::uuid", goalId);
        if (!goalResult.empty()) userId = goalResult[0]["user_id"].as<std::string>();
        
        if (type == "add") {
            txn.exec_params("UPDATE goals SET current_amount = current_amount - $1 WHERE id = $2::uuid", amount, goalId);
        } else {
            txn.exec_params("UPDATE goals SET current_amount = current_amount + $1 WHERE id = $2::uuid", amount, goalId);
        }
        
        if (!walletId.empty()) {
            if (type == "add") {
                txn.exec_params("UPDATE wallets SET current_balance = current_balance + $1 WHERE id = $2::uuid", amount, walletId);
            } else {
                txn.exec_params("UPDATE wallets SET current_balance = current_balance - $1 WHERE id = $2::uuid", amount, walletId);
            }
        }
        
        if (!txId.empty()) {
            txn.exec_params("DELETE FROM transactions WHERE id = $1::uuid", txId);
        }
        
        auto result = txn.exec_params("DELETE FROM goal_transactions WHERE id = $1::uuid", transactionId);
        txn.commit();
        
        if (!userId.empty()) {
            invalidateCache(userId);
            invalidateWalletCache(userId);
            invalidateTransactionCache(userId);
        }
        return result.affected_rows() > 0;
    } catch (const std::exception& e) { 
        std::cerr << "Error deleting goal transaction: " << e.what() << std::endl;
        return false; 
    }
}

// ============================================
// CACHE
// ============================================
void GoalService::invalidateCache(const std::string& userId) {
    auto& redis = redis::RedisClient::getInstance();
    if (!redis.isConnected()) return;
    
    std::string cacheKey = RedisKeys::GOALS_USER_PREFIX + userId;
    redis.del(cacheKey);
    redis.srem(CacheSets::GOALS_USER, cacheKey);
    
    std::cout << "[Redis] Invalidated goals cache for: " << userId << std::endl;
}

// ============================================
// ROW MAPPERS
// ============================================
Goal GoalService::rowToGoal(const pqxx::row& row) {
    Goal g;
    try { g.id = row["id"].is_null() ? "" : row["id"].as<std::string>(); } catch (...) { g.id = ""; }
    try { g.userId = row["user_id"].is_null() ? "" : row["user_id"].as<std::string>(); } catch (...) { g.userId = ""; }
    try { g.name = row["name"].is_null() ? "" : row["name"].as<std::string>(); } catch (...) { g.name = ""; }
    try { g.targetAmount = row["target_amount"].is_null() ? 0 : row["target_amount"].as<double>(); } catch (...) { g.targetAmount = 0; }
    try { g.currentAmount = row["current_amount"].is_null() ? 0 : row["current_amount"].as<double>(); } catch (...) { g.currentAmount = 0; }
    try { g.targetDate = row["target_date"].is_null() ? "" : row["target_date"].as<std::string>(); } catch (...) { g.targetDate = ""; }
    try { g.priority = row["priority"].is_null() ? "medium" : row["priority"].as<std::string>(); } catch (...) { g.priority = "medium"; }
    try { g.status = row["status"].is_null() ? "active" : row["status"].as<std::string>(); } catch (...) { g.status = "active"; }
    try { g.context = row["context"].is_null() ? "" : row["context"].as<std::string>(); } catch (...) { g.context = ""; }
    try { g.purchaseCategoryId = row["purchase_category_id"].is_null() ? "" : row["purchase_category_id"].as<std::string>(); } catch (...) { g.purchaseCategoryId = ""; }
    try { g.completedAt = row["completed_at"].is_null() ? "" : row["completed_at"].as<std::string>(); } catch (...) { g.completedAt = ""; }
    try { g.createdAt = row["created_at"].is_null() ? "" : row["created_at"].as<std::string>(); } catch (...) { g.createdAt = ""; }
    try { g.updatedAt = row["updated_at"].is_null() ? "" : row["updated_at"].as<std::string>(); } catch (...) { g.updatedAt = ""; }
    return g;
}

GoalTransaction GoalService::rowToTransaction(const pqxx::row& row) {
    GoalTransaction t;
    try { t.id = row["id"].is_null() ? "" : row["id"].as<std::string>(); } catch (...) { t.id = ""; }
    try { t.goalId = row["goal_id"].is_null() ? "" : row["goal_id"].as<std::string>(); } catch (...) { t.goalId = ""; }
    try { t.amount = row["amount"].is_null() ? 0 : row["amount"].as<double>(); } catch (...) { t.amount = 0; }
    try { t.type = row["type"].is_null() ? "" : row["type"].as<std::string>(); } catch (...) { t.type = ""; }
    try { t.note = row["note"].is_null() ? "" : row["note"].as<std::string>(); } catch (...) { t.note = ""; }
    try { t.date = row["date"].is_null() ? "" : row["date"].as<std::string>(); } catch (...) { t.date = ""; }
    try { t.walletId = row["wallet_id"].is_null() ? "" : row["wallet_id"].as<std::string>(); } catch (...) { t.walletId = ""; }
    try { t.createdAt = row["created_at"].is_null() ? "" : row["created_at"].as<std::string>(); } catch (...) { t.createdAt = ""; }
    return t;
}