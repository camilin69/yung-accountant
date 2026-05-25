#include "transaction_service.hpp"
#include "database.hpp"
#include "redis_client.hpp"
#include <pqxx/pqxx>
#include <iostream>
#include <boost/json.hpp>
#include <sstream>
#include <algorithm>

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
std::string TransactionService::transactionToJson(const Transaction& t) {
    boost::json::object obj;
    obj["id"] = t.id;
    obj["userId"] = t.userId;
    obj["walletId"] = t.walletId.empty() ? nullptr : boost::json::value(t.walletId);
    obj["categoryId"] = t.categoryId.empty() ? nullptr : boost::json::value(t.categoryId);
    obj["categoryName"] = t.categoryName.empty() ? nullptr : boost::json::value(t.categoryName);
    obj["amount"] = t.amount;
    obj["description"] = t.description.empty() ? nullptr : boost::json::value(t.description);
    obj["date"] = t.date;
    boost::json::array tagsArr;
    for (const auto& tag : t.tags) tagsArr.push_back(boost::json::value(tag));
    obj["tags"] = tagsArr;
    obj["createdAt"] = t.createdAt;
    obj["updatedAt"] = t.updatedAt;
    return boost::json::serialize(obj);
}

Transaction TransactionService::jsonToTransaction(const std::string& json) {
    auto jv = boost::json::parse(json);
    auto& obj = jv.as_object();
    Transaction t;
    t.id = boost::json::value_to<std::string>(obj.at("id"));
    t.userId = boost::json::value_to<std::string>(obj.at("userId"));
    t.walletId = obj.at("walletId").is_null() ? "" : boost::json::value_to<std::string>(obj.at("walletId"));
    t.categoryId = obj.at("categoryId").is_null() ? "" : boost::json::value_to<std::string>(obj.at("categoryId"));
    t.categoryName = obj.at("categoryName").is_null() ? "" : boost::json::value_to<std::string>(obj.at("categoryName"));
    t.amount = obj.at("amount").as_double();
    t.description = obj.at("description").is_null() ? "" : boost::json::value_to<std::string>(obj.at("description"));
    t.date = boost::json::value_to<std::string>(obj.at("date"));
    for (const auto& tag : obj.at("tags").as_array()) {
        t.tags.push_back(boost::json::value_to<std::string>(tag));
    }
    t.createdAt = boost::json::value_to<std::string>(obj.at("createdAt"));
    t.updatedAt = boost::json::value_to<std::string>(obj.at("updatedAt"));
    return t;
}

std::string TransactionService::transactionsToJson(const std::vector<Transaction>& transactions) {
    boost::json::array arr;
    for (const auto& t : transactions) arr.push_back(boost::json::parse(transactionToJson(t)));
    return boost::json::serialize(arr);
}

std::vector<Transaction> TransactionService::jsonToTransactions(const std::string& json) {
    std::vector<Transaction> result;
    auto jv = boost::json::parse(json);
    for (const auto& item : jv.as_array()) result.push_back(jsonToTransaction(boost::json::serialize(item)));
    return result;
}

// ============================================
// SINGLETON
// ============================================
TransactionService& TransactionService::getInstance() {
    static TransactionService instance;
    return instance;
}

// ============================================
// CACHE HELPERS
// ============================================
void TransactionService::cacheWithTracking(const std::string& key, const std::string& value,
                                           const std::string& setKey, int ttl) {
    auto& redis = redis::RedisClient::getInstance();
    if (!redis.isConnected()) return;
    
    if (redis.set(key, value, ttl)) {
        redis.sadd(setKey, key);
    }
}

void TransactionService::invalidateBySet(const std::string& setKey, const std::string& pattern) {
    auto& redis = redis::RedisClient::getInstance();
    if (!redis.isConnected()) return;
    
    bool success = redis.delSet(setKey);
    
    if (!success && !pattern.empty()) {
        std::cerr << "[Cache] SET '" << setKey << "' not found, using SCAN fallback" << std::endl;
        redis.delByPattern(pattern);
    }
}

void TransactionService::invalidateWalletCache(const std::string& userId) {
    auto& redis = redis::RedisClient::getInstance();
    if (redis.isConnected()) {
        redis.del("wallets:user:" + userId);
    }
}

// ============================================
// CRUD
// ============================================
std::vector<Transaction> TransactionService::getTransactionsByUser(const std::string& userId, int limit, int offset) {
    auto& redis = redis::RedisClient::getInstance();
    std::string cacheKey = RedisKeys::TRANSACTIONS_USER_PREFIX + userId + ":" + 
                           std::to_string(limit) + ":" + std::to_string(offset);
    
    if (redis.isConnected()) {
        auto cached = redis.get(cacheKey);
        if (cached) {
            std::cout << "[Redis] Cache HIT: transactions for " << userId << std::endl;
            return jsonToTransactions(*cached);
        }
    }
    
    std::vector<Transaction> transactions;
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "SELECT t.*, c.name as category_name FROM transactions t "
            "LEFT JOIN categories c ON t.category_id = c.id "
            "WHERE t.user_id = $1::uuid ORDER BY t.date DESC LIMIT $2 OFFSET $3",
            userId, limit, offset);
        txn.commit();
        
        for (const auto& row : result) {
            Transaction t = rowToTransaction(row);
            if (!row["category_name"].is_null()) {
                t.categoryName = row["category_name"].as<std::string>();
            }
            transactions.push_back(t);
        }
        
        if (redis.isConnected()) {
            cacheWithTracking(cacheKey, transactionsToJson(transactions), 
                            CacheSets::TRANSACTIONS_USER, RedisKeys::CACHE_TTL);
        }
    } catch (const std::exception& e) {
        std::cerr << "Error getting transactions: " << e.what() << std::endl;
    }
    return transactions;
}

std::optional<Transaction> TransactionService::getTransactionById(const std::string& id, const std::string& userId) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "SELECT t.*, c.name as category_name FROM transactions t "
            "LEFT JOIN categories c ON t.category_id = c.id "
            "WHERE t.id = $1::uuid AND t.user_id = $2::uuid", id, userId);
        txn.commit();
        if (!result.empty()) {
            Transaction t = rowToTransaction(result[0]);
            if (!result[0]["category_name"].is_null()) {
                t.categoryName = result[0]["category_name"].as<std::string>();
            }
            return t;
        }
        return std::nullopt;
    } catch (const std::exception& e) {
        std::cerr << "Error getting transaction: " << e.what() << std::endl;
        return std::nullopt;
    }
}

std::optional<Transaction> TransactionService::createTransaction(const Transaction& transaction) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        // ✅ Pasar tags como vector (pqxx lo convierte automáticamente)
        pqxx::result result = txn.exec_params(
            "INSERT INTO transactions (user_id, wallet_id, category_id, amount, description, date, tags) "
            "VALUES ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6::timestamp,$7) "
            "RETURNING id, created_at, updated_at",
            transaction.userId, 
            transaction.walletId.empty() ? std::optional<std::string>() : std::optional<std::string>(transaction.walletId),
            transaction.categoryId.empty() ? std::optional<std::string>() : std::optional<std::string>(transaction.categoryId),
            transaction.amount, 
            transaction.description.empty() ? std::optional<std::string>() : std::optional<std::string>(transaction.description),
            transaction.date, 
            transaction.tags);
        
        // Actualizar balance de la wallet
        if (!transaction.categoryId.empty()) {
            auto catResult = txn.exec_params("SELECT type FROM categories WHERE id = $1::uuid", transaction.categoryId);
            if (!catResult.empty()) {
                std::string catType = catResult[0]["type"].as<std::string>();
                if (!transaction.walletId.empty()) {
                    if (catType == "income") {
                        txn.exec_params("UPDATE wallets SET current_balance = current_balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2::uuid",
                            transaction.amount, transaction.walletId);
                    } else {
                        txn.exec_params("UPDATE wallets SET current_balance = current_balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2::uuid",
                            transaction.amount, transaction.walletId);
                    }
                }
            }
        }
        
        txn.commit();
        
        if (!result.empty()) {
            Transaction t = transaction;
            t.id = result[0]["id"].as<std::string>();
            t.createdAt = result[0]["created_at"].as<std::string>();
            t.updatedAt = result[0]["updated_at"].as<std::string>();
            
            invalidateCache(transaction.userId);
            invalidateWalletCache(transaction.userId);
            
            return t;
        }
        return std::nullopt;
    } catch (const std::exception& e) {
        std::cerr << "Error creating transaction: " << e.what() << std::endl;
        return std::nullopt;
    }
}

bool TransactionService::updateTransaction(const std::string& id, const std::string& userId, 
                                            const boost::json::object& updates) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        auto toDouble = [](const boost::json::value& v) -> double {
            if (v.is_int64()) return static_cast<double>(v.as_int64());
            if (v.is_double()) return v.as_double();
            return v.to_number<double>();
        };
        
        // Obtener transacción original
        auto oldTx = txn.exec_params(
            "SELECT amount, wallet_id, category_id FROM transactions WHERE id = $1::uuid", id);
        if (oldTx.empty()) {
            txn.commit();
            return false;
        }
        
        double oldAmount = oldTx[0]["amount"].as<double>();
        std::string oldWalletId = oldTx[0]["wallet_id"].is_null() ? "" : oldTx[0]["wallet_id"].as<std::string>();
        std::string oldCategoryId = oldTx[0]["category_id"].is_null() ? "" : oldTx[0]["category_id"].as<std::string>();
        
        std::string oldCatType;
        if (!oldCategoryId.empty()) {
            auto catResult = txn.exec_params("SELECT type FROM categories WHERE id = $1::uuid", oldCategoryId);
            if (!catResult.empty()) oldCatType = catResult[0]["type"].as<std::string>();
        }
        
        // Construir update con parámetros posicionales
        std::vector<std::string> setClauses;
        std::vector<std::string> paramValues;
        
        if (updates.contains("amount")) {
            setClauses.push_back("amount = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(std::to_string(toDouble(updates.at("amount"))));
        }
        if (updates.contains("description")) {
            setClauses.push_back("description = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(std::string(updates.at("description").as_string()));
        }
        if (updates.contains("categoryId")) {
            setClauses.push_back("category_id = $" + std::to_string(paramValues.size() + 1) + "::uuid");
            paramValues.push_back(std::string(updates.at("categoryId").as_string()));
        }
        if (updates.contains("walletId")) {
            setClauses.push_back("wallet_id = $" + std::to_string(paramValues.size() + 1) + "::uuid");
            paramValues.push_back(std::string(updates.at("walletId").as_string()));
        }
        if (updates.contains("date")) {
            setClauses.push_back("date = $" + std::to_string(paramValues.size() + 1) + "::timestamp");
            paramValues.push_back(std::string(updates.at("date").as_string()));
        }
        if (updates.contains("tags")) {
            setClauses.push_back("tags = $" + std::to_string(paramValues.size() + 1));
            std::vector<std::string> tags;
            for (const auto& tag : updates.at("tags").as_array()) {
                tags.push_back(boost::json::value_to<std::string>(tag));
            }
            paramValues.push_back(pqxx::to_string(tags));
        }
        
        if (setClauses.empty()) {
            txn.commit();
            return false;
        }
        
        std::string query = "UPDATE transactions SET ";
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
            default: txn.commit(); return false;
        }
        
        if (result.affected_rows() > 0) {
            double newAmount = updates.contains("amount") ? toDouble(updates.at("amount")) : oldAmount;
            std::string newWalletId = updates.contains("walletId") ? std::string(updates.at("walletId").as_string()) : oldWalletId;
            std::string newCategoryId = updates.contains("categoryId") ? std::string(updates.at("categoryId").as_string()) : oldCategoryId;
            
            std::string newCatType;
            if (!newCategoryId.empty()) {
                auto catResult = txn.exec_params("SELECT type FROM categories WHERE id = $1::uuid", newCategoryId);
                if (!catResult.empty()) newCatType = catResult[0]["type"].as<std::string>();
            }
            
            if (newWalletId == oldWalletId && !newWalletId.empty()) {
                if (oldCatType == "income") {
                    txn.exec_params("UPDATE wallets SET current_balance = current_balance - $1 WHERE id = $2::uuid", oldAmount, oldWalletId);
                } else if (oldCatType == "expense") {
                    txn.exec_params("UPDATE wallets SET current_balance = current_balance + $1 WHERE id = $2::uuid", oldAmount, oldWalletId);
                }
                if (newCatType == "income") {
                    txn.exec_params("UPDATE wallets SET current_balance = current_balance + $1 WHERE id = $2::uuid", newAmount, newWalletId);
                } else if (newCatType == "expense") {
                    txn.exec_params("UPDATE wallets SET current_balance = current_balance - $1 WHERE id = $2::uuid", newAmount, newWalletId);
                }
            } else {
                if (!oldWalletId.empty()) {
                    if (oldCatType == "income") {
                        txn.exec_params("UPDATE wallets SET current_balance = current_balance - $1 WHERE id = $2::uuid", oldAmount, oldWalletId);
                    } else if (oldCatType == "expense") {
                        txn.exec_params("UPDATE wallets SET current_balance = current_balance + $1 WHERE id = $2::uuid", oldAmount, oldWalletId);
                    }
                }
                if (!newWalletId.empty()) {
                    if (newCatType == "income") {
                        txn.exec_params("UPDATE wallets SET current_balance = current_balance + $1 WHERE id = $2::uuid", newAmount, newWalletId);
                    } else if (newCatType == "expense") {
                        txn.exec_params("UPDATE wallets SET current_balance = current_balance - $1 WHERE id = $2::uuid", newAmount, newWalletId);
                    }
                }
            }
            
            txn.commit();
            invalidateCache(userId);
            invalidateWalletCache(userId);
            return true;
        }
        
        txn.commit();
        return false;
    } catch (const std::exception& e) {
        std::cerr << "Error updating transaction: " << e.what() << std::endl;
        return false;
    }
}

bool TransactionService::deleteTransaction(const std::string& id, const std::string& userId) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        auto txResult = txn.exec_params(
            "SELECT amount, wallet_id, category_id FROM transactions WHERE id = $1::uuid", id);
        if (txResult.empty()) {
            txn.commit();
            return false;
        }
        
        double amount = txResult[0]["amount"].as<double>();
        std::string walletId = txResult[0]["wallet_id"].is_null() ? "" : txResult[0]["wallet_id"].as<std::string>();
        std::string categoryId = txResult[0]["category_id"].is_null() ? "" : txResult[0]["category_id"].as<std::string>();
        
        if (!walletId.empty() && !categoryId.empty()) {
            auto catResult = txn.exec_params("SELECT type FROM categories WHERE id = $1::uuid", categoryId);
            if (!catResult.empty()) {
                std::string catType = catResult[0]["type"].as<std::string>();
                if (catType == "income") {
                    txn.exec_params("UPDATE wallets SET current_balance = current_balance - $1 WHERE id = $2::uuid", amount, walletId);
                } else if (catType == "expense") {
                    txn.exec_params("UPDATE wallets SET current_balance = current_balance + $1 WHERE id = $2::uuid", amount, walletId);
                }
            }
        }
        
        auto result = txn.exec_params(
            "DELETE FROM transactions WHERE id = $1::uuid AND user_id = $2::uuid", id, userId);
        txn.commit();
        
        if (result.affected_rows() > 0) {
            invalidateCache(userId);
            invalidateWalletCache(userId);
            return true;
        }
        return false;
    } catch (const std::exception& e) {
        std::cerr << "Error deleting transaction: " << e.what() << std::endl;
        return false;
    }
}

// ============================================
// FILTERS
// ============================================
std::vector<Transaction> TransactionService::getTransactionsByWallet(const std::string& walletId, const std::string& userId) {
    std::vector<Transaction> transactions;
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "SELECT t.*, c.name as category_name FROM transactions t "
            "LEFT JOIN categories c ON t.category_id = c.id "
            "WHERE t.wallet_id = $1::uuid AND t.user_id = $2::uuid ORDER BY t.date DESC", 
            walletId, userId);
        txn.commit();
        for (const auto& row : result) {
            Transaction t = rowToTransaction(row);
            if (!row["category_name"].is_null()) t.categoryName = row["category_name"].as<std::string>();
            transactions.push_back(t);
        }
    } catch (const std::exception& e) {
        std::cerr << "Error getting transactions by wallet: " << e.what() << std::endl;
    }
    return transactions;
}

std::vector<Transaction> TransactionService::getTransactionsByCategory(const std::string& categoryId, const std::string& userId) {
    std::vector<Transaction> transactions;
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "SELECT t.*, c.name as category_name FROM transactions t "
            "LEFT JOIN categories c ON t.category_id = c.id "
            "WHERE t.category_id = $1::uuid AND t.user_id = $2::uuid ORDER BY t.date DESC", 
            categoryId, userId);
        txn.commit();
        for (const auto& row : result) {
            Transaction t = rowToTransaction(row);
            if (!row["category_name"].is_null()) t.categoryName = row["category_name"].as<std::string>();
            transactions.push_back(t);
        }
    } catch (const std::exception& e) {
        std::cerr << "Error getting transactions by category: " << e.what() << std::endl;
    }
    return transactions;
}

std::vector<Transaction> TransactionService::getTransactionsByDateRange(const std::string& userId, 
                                                                         const std::string& startDate, 
                                                                         const std::string& endDate) {
    std::vector<Transaction> transactions;
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "SELECT t.*, c.name as category_name FROM transactions t "
            "LEFT JOIN categories c ON t.category_id = c.id "
            "WHERE t.user_id = $1::uuid AND t.date >= $2::timestamp AND t.date <= $3::timestamp "
            "ORDER BY t.date DESC",
            userId, startDate, endDate);
        txn.commit();
        for (const auto& row : result) {
            Transaction t = rowToTransaction(row);
            if (!row["category_name"].is_null()) t.categoryName = row["category_name"].as<std::string>();
            transactions.push_back(t);
        }
    } catch (const std::exception& e) {
        std::cerr << "Error getting transactions by date range: " << e.what() << std::endl;
    }
    return transactions;
}

// ============================================
// CACHE
// ============================================
void TransactionService::invalidateCache(const std::string& userId) {
    auto& redis = redis::RedisClient::getInstance();
    if (!redis.isConnected()) return;
    
    // Usar SETS para invalidar (más eficiente que delByPattern)
    invalidateBySet(CacheSets::TRANSACTIONS_USER, RedisKeys::TRANSACTIONS_USER_PREFIX + userId + ":*");
    
    std::cout << "[Redis] Invalidated transactions cache for: " << userId << std::endl;
}

// ============================================
// ROW MAPPER
// ============================================
Transaction TransactionService::rowToTransaction(const pqxx::row& row) {
    Transaction t;
    try { t.id = row["id"].is_null() ? "" : row["id"].as<std::string>(); } catch (...) { t.id = ""; }
    try { t.userId = row["user_id"].is_null() ? "" : row["user_id"].as<std::string>(); } catch (...) { t.userId = ""; }
    try { t.walletId = row["wallet_id"].is_null() ? "" : row["wallet_id"].as<std::string>(); } catch (...) { t.walletId = ""; }
    try { t.categoryId = row["category_id"].is_null() ? "" : row["category_id"].as<std::string>(); } catch (...) { t.categoryId = ""; }
    try { t.amount = row["amount"].is_null() ? 0 : row["amount"].as<double>(); } catch (...) { t.amount = 0; }
    try { t.description = row["description"].is_null() ? "" : row["description"].as<std::string>(); } catch (...) { t.description = ""; }
    try { t.date = row["date"].is_null() ? "" : row["date"].as<std::string>(); } catch (...) { t.date = ""; }
    try { t.createdAt = row["created_at"].is_null() ? "" : row["created_at"].as<std::string>(); } catch (...) { t.createdAt = ""; }
    try { t.updatedAt = row["updated_at"].is_null() ? "" : row["updated_at"].as<std::string>(); } catch (...) { t.updatedAt = ""; }
    
    // Parsear tags
    try {
        if (!row["tags"].is_null()) {
            std::string tagsStr = row["tags"].as<std::string>();
            if (tagsStr != "{}" && tagsStr != "") {
                std::string content = tagsStr.substr(1, tagsStr.size() - 2);
                if (!content.empty()) {
                    std::stringstream ss(content);
                    std::string tag;
                    while (std::getline(ss, tag, ',')) {
                        tag.erase(std::remove(tag.begin(), tag.end(), '"'), tag.end());
                        tag.erase(std::remove(tag.begin(), tag.end(), ' '), tag.end());
                        if (!tag.empty()) t.tags.push_back(tag);
                    }
                }
            }
        }
    } catch (...) {}
    
    return t;
}