#include "transaction_service.hpp"
#include "database.hpp"
#include "redis_client.hpp"
#include <pqxx/pqxx>
#include <iostream>
#include <boost/json.hpp>
#include <sstream>
#include <algorithm>

// ============================================
// SERIALIZACIÓN
// ============================================
std::string TransactionService::transactionToJson(const Transaction& t) {
    boost::json::object obj;
    obj["id"] = t.id;
    obj["userId"] = t.userId;
    obj["walletId"] = t.walletId;
    obj["categoryId"] = t.categoryId;
    obj["categoryName"] = t.categoryName;
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
    t.walletId = boost::json::value_to<std::string>(obj.at("walletId"));
    t.categoryId = boost::json::value_to<std::string>(obj.at("categoryId"));
    t.categoryName = boost::json::value_to<std::string>(obj.at("categoryName"));
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

std::string TransactionService::tagsToDbArray(const std::vector<std::string>& tags) {
    if (tags.empty()) return "{}";
    std::string result = "{";
    for (size_t i = 0; i < tags.size(); ++i) {
        if (i > 0) result += ",";
        result += "\"" + tags[i] + "\"";
    }
    result += "}";
    return result;
}

std::vector<std::string> TransactionService::parseTags(const std::string& dbArray) {
    std::vector<std::string> result;
    if (dbArray.empty() || dbArray == "{}") return result;
    std::string content = dbArray.substr(1, dbArray.length() - 2);
    std::stringstream ss(content);
    std::string item;
    while (std::getline(ss, item, ',')) {
        item.erase(std::remove(item.begin(), item.end(), '"'), item.end());
        item.erase(std::remove(item.begin(), item.end(), ' '), item.end());
        if (!item.empty()) result.push_back(item);
    }
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
// CRUD
// ============================================
std::vector<Transaction> TransactionService::getTransactionsByUser(const std::string& userId, int limit, int offset) {
    auto& redis = redis::RedisClient::getInstance();
    std::string cacheKey = "transactions:user:" + userId + ":" + std::to_string(limit) + ":" + std::to_string(offset);
    
    if (redis.isConnected()) {
        auto cached = redis.get(cacheKey);
        if (cached) {
            std::cout << "[Redis] Cache HIT: transactions for " << userId << std::endl;
            return jsonToTransactions(*cached);
        }
    }
    
    std::vector<Transaction> transactions;
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "SELECT t.*, c.name as category_name FROM transactions t "
            "LEFT JOIN categories c ON t.category_id = c.id "
            "WHERE t.user_id = $1 ORDER BY t.date DESC LIMIT $2 OFFSET $3",
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
            redis.set(cacheKey, transactionsToJson(transactions), 300);
        }
    } catch (const std::exception& e) {
        std::cerr << "Error getting transactions: " << e.what() << std::endl;
    }
    return transactions;
}

std::optional<Transaction> TransactionService::getTransactionById(const std::string& id, const std::string& userId) {
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "SELECT t.*, c.name as category_name FROM transactions t "
            "LEFT JOIN categories c ON t.category_id = c.id "
            "WHERE t.id = $1 AND t.user_id = $2", id, userId);
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
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        
        pqxx::result result = txn.exec_params(
            "INSERT INTO transactions (user_id, wallet_id, category_id, amount, description, date, tags) "
            "VALUES ($1,$2,$3,$4,$5,$6::timestamp,$7) RETURNING id, created_at, updated_at",
            transaction.userId, transaction.walletId, transaction.categoryId,
            transaction.amount, transaction.description, transaction.date,
            tagsToDbArray(transaction.tags));
        
        // Actualizar balance de la wallet
        auto catResult = txn.exec_params("SELECT type FROM categories WHERE id = $1", transaction.categoryId);
        if (!catResult.empty()) {
            std::string catType = catResult[0]["type"].as<std::string>();
            if (catType == "income") {
                txn.exec_params("UPDATE wallets SET current_balance = current_balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
                    transaction.amount, transaction.walletId);
            } else {
                txn.exec_params("UPDATE wallets SET current_balance = current_balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
                    transaction.amount, transaction.walletId);
            }
        }
        
        txn.commit();
        
        if (!result.empty()) {
            Transaction t = transaction;
            t.id = result[0]["id"].as<std::string>();
            t.createdAt = result[0]["created_at"].as<std::string>();
            t.updatedAt = result[0]["updated_at"].as<std::string>();
            
            invalidateCache(transaction.userId);
            
            auto& redis = redis::RedisClient::getInstance();
            if (redis.isConnected()) {
                redis.del("wallets:user:" + transaction.userId);
                std::cout << "[Redis] Invalidated wallets cache for: " << transaction.userId << std::endl;
            }
            
            return t;
        }
        return std::nullopt;
    } catch (const std::exception& e) {
        std::cerr << "Error creating transaction: " << e.what() << std::endl;
        return std::nullopt;
    }
}

bool TransactionService::updateTransaction(const std::string& id, const std::string& userId, const boost::json::object& updates) {
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        
        auto toDouble = [](const boost::json::value& v) -> double {
            if (v.is_int64()) return static_cast<double>(v.as_int64());
            if (v.is_double()) return v.as_double();
            return v.to_number<double>();
        };
        auto quote = [&](const std::string& s) { return txn.quote(s); };
        
        // Obtener transacción original para calcular diferencias
        auto oldTx = txn.exec_params("SELECT amount, wallet_id, category_id FROM transactions WHERE id = $1", id);
        if (oldTx.empty()) return false;
        
        double oldAmount = oldTx[0]["amount"].as<double>();
        std::string oldWalletId = oldTx[0]["wallet_id"].is_null() ? "" : oldTx[0]["wallet_id"].as<std::string>();
        std::string oldCategoryId = oldTx[0]["category_id"].is_null() ? "" : oldTx[0]["category_id"].as<std::string>();
        
        // Obtener tipo de categoría original
        std::string oldCatType;
        if (!oldCategoryId.empty()) {
            auto catResult = txn.exec_params("SELECT type FROM categories WHERE id = $1", oldCategoryId);
            if (!catResult.empty()) oldCatType = catResult[0]["type"].as<std::string>();
        }
        
        // Construir query de update
        std::string query = "UPDATE transactions SET ";
        std::vector<std::string> parts;
        
        if (updates.contains("amount")) parts.push_back("amount = " + std::to_string(toDouble(updates.at("amount"))));
        if (updates.contains("description")) parts.push_back("description = " + quote(std::string(updates.at("description").as_string())));
        if (updates.contains("categoryId")) parts.push_back("category_id = " + quote(std::string(updates.at("categoryId").as_string())));
        if (updates.contains("walletId")) parts.push_back("wallet_id = " + quote(std::string(updates.at("walletId").as_string())));
        if (updates.contains("date")) parts.push_back("date = " + quote(std::string(updates.at("date").as_string())) + "::timestamp");
        if (updates.contains("tags")) {
            std::vector<std::string> tags;
            for (const auto& tag : updates.at("tags").as_array()) tags.push_back(boost::json::value_to<std::string>(tag));
            parts.push_back("tags = " + quote(tagsToDbArray(tags)));
        }
        
        if (parts.empty()) return false;
        
        for (size_t i = 0; i < parts.size(); ++i) { if (i > 0) query += ", "; query += parts[i]; }
        query += ", updated_at = CURRENT_TIMESTAMP WHERE id = " + quote(id) + " AND user_id = " + quote(userId);
        
        pqxx::result result = txn.exec(query);
        
        // Ajustar balance de wallet(s)
        if (result.affected_rows() > 0) {
            double newAmount = updates.contains("amount") ? toDouble(updates.at("amount")) : oldAmount;
            std::string newWalletId = updates.contains("walletId") ? std::string(updates.at("walletId").as_string()) : oldWalletId;
            std::string newCategoryId = updates.contains("categoryId") ? std::string(updates.at("categoryId").as_string()) : oldCategoryId;
            
            // Obtener tipo de nueva categoría
            std::string newCatType;
            if (!newCategoryId.empty()) {
                auto catResult = txn.exec_params("SELECT type FROM categories WHERE id = $1", newCategoryId);
                if (!catResult.empty()) newCatType = catResult[0]["type"].as<std::string>();
            }
            
            // Caso 1: Misma wallet, cambió amount o category
            if (newWalletId == oldWalletId && !newWalletId.empty()) {
                // Revertir efecto viejo
                if (oldCatType == "income") {
                    txn.exec_params("UPDATE wallets SET current_balance = current_balance - $1 WHERE id = $2", oldAmount, oldWalletId);
                } else if (oldCatType == "expense") {
                    txn.exec_params("UPDATE wallets SET current_balance = current_balance + $1 WHERE id = $2", oldAmount, oldWalletId);
                }
                // Aplicar efecto nuevo
                if (newCatType == "income") {
                    txn.exec_params("UPDATE wallets SET current_balance = current_balance + $1 WHERE id = $2", newAmount, newWalletId);
                } else if (newCatType == "expense") {
                    txn.exec_params("UPDATE wallets SET current_balance = current_balance - $1 WHERE id = $2", newAmount, newWalletId);
                }
            }
            // Caso 2: Cambió de wallet
            else {
                // Revertir wallet vieja
                if (!oldWalletId.empty()) {
                    if (oldCatType == "income") {
                        txn.exec_params("UPDATE wallets SET current_balance = current_balance - $1 WHERE id = $2", oldAmount, oldWalletId);
                    } else if (oldCatType == "expense") {
                        txn.exec_params("UPDATE wallets SET current_balance = current_balance + $1 WHERE id = $2", oldAmount, oldWalletId);
                    }
                }
                // Aplicar a wallet nueva
                if (!newWalletId.empty()) {
                    if (newCatType == "income") {
                        txn.exec_params("UPDATE wallets SET current_balance = current_balance + $1 WHERE id = $2", newAmount, newWalletId);
                    } else if (newCatType == "expense") {
                        txn.exec_params("UPDATE wallets SET current_balance = current_balance - $1 WHERE id = $2", newAmount, newWalletId);
                    }
                }
            }
            
            txn.commit();
            
            // Invalidar cachés
            invalidateCache(userId);
            auto& redis = redis::RedisClient::getInstance();
            if (redis.isConnected()) {
                redis.del("wallets:user:" + userId);
            }
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
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        
        // Obtener info antes de eliminar
        auto txResult = txn.exec_params("SELECT amount, wallet_id, category_id FROM transactions WHERE id = $1", id);
        if (txResult.empty()) return false;
        
        double amount = txResult[0]["amount"].as<double>();
        std::string walletId = txResult[0]["wallet_id"].is_null() ? "" : txResult[0]["wallet_id"].as<std::string>();
        std::string categoryId = txResult[0]["category_id"].is_null() ? "" : txResult[0]["category_id"].as<std::string>();
        
        // Revertir balance de wallet
        if (!walletId.empty() && !categoryId.empty()) {
            auto catResult = txn.exec_params("SELECT type FROM categories WHERE id = $1", categoryId);
            if (!catResult.empty()) {
                std::string catType = catResult[0]["type"].as<std::string>();
                if (catType == "income") {
                    // Era ingreso → al eliminar, restar de wallet
                    txn.exec_params("UPDATE wallets SET current_balance = current_balance - $1 WHERE id = $2", amount, walletId);
                } else if (catType == "expense") {
                    // Era gasto → al eliminar, devolver a wallet
                    txn.exec_params("UPDATE wallets SET current_balance = current_balance + $1 WHERE id = $2", amount, walletId);
                }
            }
        }
        
        auto result = txn.exec_params("DELETE FROM transactions WHERE id = $1 AND user_id = $2", id, userId);
        txn.commit();
        
        if (result.affected_rows() > 0) {
            invalidateCache(userId);
            auto& redis = redis::RedisClient::getInstance();
            if (redis.isConnected()) {
                redis.del("wallets:user:" + userId);
            }
            return true;
        }
        return false;
    } catch (const std::exception& e) { return false; }
}


// ============================================
// FILTERS
// ============================================
std::vector<Transaction> TransactionService::getTransactionsByWallet(const std::string& walletId, const std::string& userId) {
    std::vector<Transaction> transactions;
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "SELECT t.*, c.name as category_name FROM transactions t "
            "LEFT JOIN categories c ON t.category_id = c.id "
            "WHERE t.wallet_id = $1 AND t.user_id = $2 ORDER BY t.date DESC", walletId, userId);
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
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "SELECT t.*, c.name as category_name FROM transactions t "
            "LEFT JOIN categories c ON t.category_id = c.id "
            "WHERE t.category_id = $1 AND t.user_id = $2 ORDER BY t.date DESC", categoryId, userId);
        txn.commit();
        for (const auto& row : result) {
            Transaction t = rowToTransaction(row);
            if (!row["category_name"].is_null()) t.categoryName = row["category_name"].as<std::string>();
            transactions.push_back(t);
        }
    } catch (const std::exception& e) {}
    return transactions;
}

std::vector<Transaction> TransactionService::getTransactionsByDateRange(const std::string& userId, const std::string& startDate, const std::string& endDate) {
    std::vector<Transaction> transactions;
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "SELECT t.*, c.name as category_name FROM transactions t "
            "LEFT JOIN categories c ON t.category_id = c.id "
            "WHERE t.user_id = $1 AND t.date >= $2::timestamp AND t.date <= $3::timestamp ORDER BY t.date DESC",
            userId, startDate, endDate);
        txn.commit();
        for (const auto& row : result) {
            Transaction t = rowToTransaction(row);
            if (!row["category_name"].is_null()) t.categoryName = row["category_name"].as<std::string>();
            transactions.push_back(t);
        }
    } catch (const std::exception& e) {}
    return transactions;
}

// ============================================
// CACHE
// ============================================
void TransactionService::invalidateCache(const std::string& userId) {
    auto& redis = redis::RedisClient::getInstance();
    if (redis.isConnected()) {
        redis.delByPattern("transactions:user:" + userId + ":*");
        std::cout << "[Redis] Invalidated transactions cache for: " << userId << std::endl;
    }
}

// ============================================
// ROW MAPPER
// ============================================
Transaction TransactionService::rowToTransaction(const pqxx::row& row) {
    Transaction t;
    t.id = row["id"].as<std::string>();
    t.userId = row["user_id"].as<std::string>();
    t.walletId = row["wallet_id"].is_null() ? "" : row["wallet_id"].as<std::string>();
    t.categoryId = row["category_id"].is_null() ? "" : row["category_id"].as<std::string>();
    t.amount = row["amount"].as<double>();
    t.description = row["description"].is_null() ? "" : row["description"].as<std::string>();
    t.date = row["date"].as<std::string>();
    t.tags = parseTags(row["tags"].as<std::string>());
    t.createdAt = row["created_at"].as<std::string>();
    t.updatedAt = row["updated_at"].as<std::string>();
    return t;
}