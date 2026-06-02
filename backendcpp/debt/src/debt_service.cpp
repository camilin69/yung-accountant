#include "debt_service.hpp"
#include "database.hpp"
#include "redis_client.hpp"
#include <pqxx/pqxx>
#include <iostream>
#include <boost/json.hpp>
#include <sstream>

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
std::string DebtService::debtToJson(const Debt& d) {
    boost::json::object obj;
    obj["id"] = d.id;
    obj["userId"] = d.userId;
    obj["type"] = d.type;
    obj["creditorName"] = d.creditorName;
    obj["walletId"] = d.walletId.empty() ? nullptr : boost::json::value(d.walletId);
    obj["categoryId"] = d.categoryId.empty() ? nullptr : boost::json::value(d.categoryId);
    obj["originalAmount"] = d.originalAmount;
    obj["remainingBalance"] = d.remainingBalance;
    obj["interestRate"] = d.interestRate;
    obj["interestType"] = d.interestType;
    obj["compoundMonths"] = d.compoundMonths;
    obj["termMonths"] = d.termMonths;
    obj["monthlyPayment"] = d.monthlyPayment;
    obj["startDate"] = d.startDate;
    obj["nextDueDate"] = d.nextDueDate;
    obj["status"] = d.status;
    obj["notes"] = d.notes.empty() ? nullptr : boost::json::value(d.notes);
    obj["realAmountToPay"] = d.realAmountToPay;
    obj["realInterests"] = d.realInterests;
    obj["createdAt"] = d.createdAt;
    obj["updatedAt"] = d.updatedAt;
    return boost::json::serialize(obj);
}

Debt DebtService::jsonToDebt(const std::string& json) {
    auto jv = boost::json::parse(json);
    auto& obj = jv.as_object();
    Debt d;
    d.id = boost::json::value_to<std::string>(obj.at("id"));
    d.userId = boost::json::value_to<std::string>(obj.at("userId"));
    d.type = boost::json::value_to<std::string>(obj.at("type"));
    d.creditorName = boost::json::value_to<std::string>(obj.at("creditorName"));
    d.walletId = obj.at("walletId").is_null() ? "" : boost::json::value_to<std::string>(obj.at("walletId"));
    d.categoryId = obj.at("categoryId").is_null() ? "" : boost::json::value_to<std::string>(obj.at("categoryId"));
    d.originalAmount = obj.at("originalAmount").as_double();
    d.remainingBalance = obj.at("remainingBalance").as_double();
    d.interestRate = obj.at("interestRate").as_double();
    d.interestType = boost::json::value_to<std::string>(obj.at("interestType"));
    d.compoundMonths = obj.contains("compoundMonths") ? static_cast<int>(obj.at("compoundMonths").as_int64()) : 0;
    d.termMonths = obj.at("termMonths").as_int64();
    d.monthlyPayment = obj.at("monthlyPayment").as_double();
    d.startDate = boost::json::value_to<std::string>(obj.at("startDate"));
    d.nextDueDate = boost::json::value_to<std::string>(obj.at("nextDueDate"));
    d.status = boost::json::value_to<std::string>(obj.at("status"));
    d.notes = obj.at("notes").is_null() ? "" : boost::json::value_to<std::string>(obj.at("notes"));
    d.realAmountToPay = obj.at("realAmountToPay").as_double();
    d.realInterests = obj.at("realInterests").as_double();
    d.createdAt = boost::json::value_to<std::string>(obj.at("createdAt"));
    d.updatedAt = boost::json::value_to<std::string>(obj.at("updatedAt"));
    return d;
}

std::string DebtService::debtsToJson(const std::vector<Debt>& debts) {
    boost::json::array arr;
    for (const auto& d : debts) arr.push_back(boost::json::parse(debtToJson(d)));
    return boost::json::serialize(arr);
}

std::vector<Debt> DebtService::jsonToDebts(const std::string& json) {
    std::vector<Debt> result;
    auto jv = boost::json::parse(json);
    for (const auto& item : jv.as_array()) result.push_back(jsonToDebt(boost::json::serialize(item)));
    return result;
}

std::string DebtService::paymentsToJson(const std::vector<DebtPayment>& payments) {
    boost::json::array arr;
    for (const auto& p : payments) {
        boost::json::object obj;
        obj["id"] = p.id;
        obj["debtId"] = p.debtId;
        obj["amount"] = p.amount;
        obj["date"] = p.date;
        obj["interestAmount"] = p.interestAmount;
        obj["principalAmount"] = p.principalAmount;
        obj["remainingBalance"] = p.remainingBalance;
        obj["notes"] = p.notes.empty() ? nullptr : boost::json::value(p.notes);
        obj["createdAt"] = p.createdAt;
        arr.push_back(obj);
    }
    return boost::json::serialize(arr);
}

std::vector<DebtPayment> DebtService::jsonToPayments(const std::string& json) {
    std::vector<DebtPayment> result;
    auto jv = boost::json::parse(json);
    for (const auto& item : jv.as_array()) {
        auto& obj = item.as_object();
        DebtPayment p;
        p.id = boost::json::value_to<std::string>(obj.at("id"));
        p.debtId = boost::json::value_to<std::string>(obj.at("debtId"));
        p.amount = obj.at("amount").as_double();
        p.date = boost::json::value_to<std::string>(obj.at("date"));
        p.interestAmount = obj.at("interestAmount").as_double();
        p.principalAmount = obj.at("principalAmount").as_double();
        p.remainingBalance = obj.at("remainingBalance").as_double();
        p.notes = obj.at("notes").is_null() ? "" : boost::json::value_to<std::string>(obj.at("notes"));
        p.createdAt = boost::json::value_to<std::string>(obj.at("createdAt"));
        result.push_back(p);
    }
    return result;
}

// ============================================
// SINGLETON
// ============================================
DebtService& DebtService::getInstance() {
    static DebtService instance;
    return instance;
}

// ============================================
// CACHE HELPERS
// ============================================
void DebtService::cacheWithTracking(const std::string& key, const std::string& value,
                                    const std::string& setKey, int ttl) {
    auto& redis = redis::RedisClient::getInstance();
    if (!redis.isConnected()) return;
    
    if (redis.set(key, value, ttl)) {
        redis.sadd(setKey, key);
    }
}

void DebtService::invalidateBySet(const std::string& setKey, const std::string& pattern) {
    auto& redis = redis::RedisClient::getInstance();
    if (!redis.isConnected()) return;
    
    bool success = redis.delSet(setKey);
    
    if (!success && !pattern.empty()) {
        std::cerr << "[Cache] SET '" << setKey << "' not found, using SCAN fallback" << std::endl;
        redis.delByPattern(pattern);
    }
}

void DebtService::invalidateWalletCache(const std::string& userId) {
    auto& redis = redis::RedisClient::getInstance();
    if (redis.isConnected()) {
        redis.del("wallets:user:" + userId);
    }
}

void DebtService::invalidateTransactionCache(const std::string& userId) {
    auto& redis = redis::RedisClient::getInstance();
    if (!redis.isConnected()) return;
    
    // Usar SETS + SCAN fallback (igual que los demas)
    invalidateBySet(CacheSets::TRANSACTIONS_USER, "transactions:user:" + userId + ":*");
    
    std::cout << "[Redis] Invalidated transactions cache for: " << userId << std::endl;
}

// ============================================
// CRUD DEUDAS
// ============================================
std::vector<Debt> DebtService::getDebtsByUser(const std::string& userId) {
    auto& redis = redis::RedisClient::getInstance();
    std::string cacheKey = RedisKeys::DEBTS_USER_PREFIX + userId;
    
    if (redis.isConnected()) {
        auto cached = redis.get(cacheKey);
        if (cached) {
            std::cout << "[Redis] Cache HIT: debts for " << userId << std::endl;
            return jsonToDebts(*cached);
        }
    }
    
    std::vector<Debt> debts;
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "SELECT * FROM debts WHERE user_id = $1::uuid ORDER BY created_at DESC", userId);
        txn.commit();
        
        for (const auto& row : result) debts.push_back(rowToDebt(row));
        
        if (redis.isConnected()) {
            cacheWithTracking(cacheKey, debtsToJson(debts), CacheSets::DEBTS_USER, RedisKeys::CACHE_TTL);
        }
    } catch (const std::exception& e) {
        std::cerr << "Error getting debts: " << e.what() << std::endl;
    }
    return debts;
}

std::optional<Debt> DebtService::getDebtById(const std::string& id, const std::string& userId) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "SELECT * FROM debts WHERE id = $1::uuid AND user_id = $2::uuid", id, userId);
        txn.commit();
        if (!result.empty()) return rowToDebt(result[0]);
        return std::nullopt;
    } catch (const std::exception& e) {
        std::cerr << "Error getting debt: " << e.what() << std::endl;
        return std::nullopt;
    }
}

std::optional<Debt> DebtService::createDebt(const Debt& debt) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        // 1. Insertar deuda (con compound_months)
        pqxx::result result = txn.exec_params(
            "INSERT INTO debts (user_id, type, creditor_name, wallet_id, category_id, "
            "original_amount, remaining_balance, interest_rate, interest_type, "
            "compound_months, term_months, monthly_payment, start_date, next_due_date, "
            "status, notes, real_amount_to_pay, real_interests) "
            "VALUES ($1::uuid,$2,$3,$4::uuid,$5::uuid,$6,$7,$8,$9,$10,$11,$12,$13::date,$14::date,$15,$16,$17,$18) "
            "RETURNING id, created_at, updated_at",
            debt.userId, debt.type, debt.creditorName, 
            debt.walletId.empty() ? std::optional<std::string>() : std::optional<std::string>(debt.walletId),
            debt.categoryId.empty() ? std::optional<std::string>() : std::optional<std::string>(debt.categoryId),
            debt.originalAmount, debt.remainingBalance, debt.interestRate, debt.interestType,
            debt.compoundMonths, debt.termMonths, debt.monthlyPayment, 
            debt.startDate, debt.nextDueDate,
            debt.status, debt.notes, debt.realAmountToPay, debt.realInterests);
        
        if (result.empty()) {
            txn.commit();
            return std::nullopt;
        }
        
        std::string debtId = result[0]["id"].as<std::string>();
        
        // 2. Actualizar balance de wallet
        if (!debt.walletId.empty()) {
            if (debt.type == "borrowed") {
                txn.exec_params(
                    "UPDATE wallets SET current_balance = current_balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2::uuid",
                    debt.originalAmount, debt.walletId);
            } else {
                txn.exec_params(
                    "UPDATE wallets SET current_balance = current_balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2::uuid",
                    debt.originalAmount, debt.walletId);
            }
        }
        
        // 3. Crear transacción asociada (usando parámetros posicionales para tags)
        std::string description = (debt.type == "borrowed" ? "Loan received from " : "Loan given to ") + debt.creditorName;
        std::vector<std::string> tags = {debt.type, "debt", debtId};
        
        txn.exec_params(
            "INSERT INTO transactions (user_id, wallet_id, category_id, amount, description, date, tags) "
            "VALUES ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6::timestamp,$7)",
            debt.userId, 
            debt.walletId.empty() ? std::optional<std::string>() : std::optional<std::string>(debt.walletId),
            debt.categoryId.empty() ? std::optional<std::string>() : std::optional<std::string>(debt.categoryId),
            debt.originalAmount, description, debt.startDate, tags);
        
        txn.commit();
        
        // 4. Invalidar cachés
        invalidateCache(debt.userId);
        invalidateWalletCache(debt.userId);
        invalidateTransactionCache(debt.userId);
        
        Debt d = debt;
        d.id = debtId;
        d.createdAt = result[0]["created_at"].as<std::string>();
        d.updatedAt = result[0]["updated_at"].as<std::string>();
        return d;
        
    } catch (const std::exception& e) {
        std::cerr << "Error creating debt: " << e.what() << std::endl;
        return std::nullopt;
    }
}

bool DebtService::updateDebt(const std::string& id, const std::string& userId, const boost::json::object& updates) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        // Obtener datos originales
        auto oldResult = txn.exec_params(
            "SELECT * FROM debts WHERE id = $1::uuid AND user_id = $2::uuid", id, userId);
        if (oldResult.empty()) {
            txn.commit();
            return false;
        }
        
        auto old = oldResult[0];
        std::string oldWalletId = old["wallet_id"].is_null() ? "" : old["wallet_id"].as<std::string>();
        std::string oldType = old["type"].as<std::string>();
        double oldAmount = old["original_amount"].as<double>();
        
        // Construir update con parámetros posicionales
        std::vector<std::string> setClauses;
        std::vector<std::string> paramValues;
        
        auto toDouble = [](const boost::json::value& v) -> double {
            if (v.is_int64()) return static_cast<double>(v.as_int64());
            if (v.is_double()) return v.as_double();
            return v.to_number<double>();
        };
        
        if (updates.contains("remainingBalance")) {
            setClauses.push_back("remaining_balance = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(std::to_string(toDouble(updates.at("remainingBalance"))));
        }
        if (updates.contains("status")) {
            setClauses.push_back("status = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(std::string(updates.at("status").as_string()));
        }
        if (updates.contains("nextDueDate")) {
            setClauses.push_back("next_due_date = $" + std::to_string(paramValues.size() + 1) + "::date");
            paramValues.push_back(std::string(updates.at("nextDueDate").as_string()));
        }
        if (updates.contains("notes")) {
            setClauses.push_back("notes = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(std::string(updates.at("notes").as_string()));
        }
        if (updates.contains("originalAmount")) {
            setClauses.push_back("original_amount = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(std::to_string(toDouble(updates.at("originalAmount"))));
        }
        if (updates.contains("interestRate")) {
            setClauses.push_back("interest_rate = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(std::to_string(toDouble(updates.at("interestRate"))));
        }
        if (updates.contains("monthlyPayment")) {
            setClauses.push_back("monthly_payment = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(std::to_string(toDouble(updates.at("monthlyPayment"))));
        }
        if (updates.contains("realAmountToPay")) {
            setClauses.push_back("real_amount_to_pay = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(std::to_string(toDouble(updates.at("realAmountToPay"))));
        }
        if (updates.contains("realInterests")) {
            setClauses.push_back("real_interests = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(std::to_string(toDouble(updates.at("realInterests"))));
        }
        if (updates.contains("compoundMonths")) {
            setClauses.push_back("compound_months = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(std::to_string(static_cast<int>(updates.at("compoundMonths").as_int64())));
        }
        
        // Si cambió walletId
        bool walletChanged = false;
        std::string newWalletId = oldWalletId;
        if (updates.contains("walletId")) {
            newWalletId = std::string(updates.at("walletId").as_string());
            walletChanged = (newWalletId != oldWalletId);
            setClauses.push_back("wallet_id = $" + std::to_string(paramValues.size() + 1) + "::uuid");
            paramValues.push_back(newWalletId);
        }
        
        if (setClauses.empty()) {
            txn.commit();
            return false;
        }
        
        // Construir query
        std::string query = "UPDATE debts SET ";
        for (size_t i = 0; i < setClauses.size(); ++i) {
            if (i > 0) query += ", ";
            query += setClauses[i];
        }
        query += ", updated_at = CURRENT_TIMESTAMP WHERE id = $" + 
                 std::to_string(paramValues.size() + 1) + "::uuid AND user_id = $" + 
                 std::to_string(paramValues.size() + 2) + "::uuid";
        
        paramValues.push_back(id);
        paramValues.push_back(userId);
        
        // Ejecutar con switch de parámetros
        pqxx::result result;
        switch (paramValues.size()) {
            case 2:
                result = txn.exec_params(query, paramValues[0], paramValues[1]);
                break;
            case 3:
                result = txn.exec_params(query, paramValues[0], paramValues[1], paramValues[2]);
                break;
            case 4:
                result = txn.exec_params(query, paramValues[0], paramValues[1], paramValues[2], paramValues[3]);
                break;
            case 5:
                result = txn.exec_params(query, paramValues[0], paramValues[1], paramValues[2], paramValues[3], paramValues[4]);
                break;
            case 6:
                result = txn.exec_params(query, paramValues[0], paramValues[1], paramValues[2], paramValues[3], paramValues[4], paramValues[5]);
                break;
            case 7:
                result = txn.exec_params(query, paramValues[0], paramValues[1], paramValues[2], paramValues[3], paramValues[4], paramValues[5], paramValues[6]);
                break;
            case 8:
                result = txn.exec_params(query, paramValues[0], paramValues[1], paramValues[2], paramValues[3], paramValues[4], paramValues[5], paramValues[6], paramValues[7]);
                break;
            case 9:
                result = txn.exec_params(query, paramValues[0], paramValues[1], paramValues[2], paramValues[3], paramValues[4], paramValues[5], paramValues[6], paramValues[7], paramValues[8]);
                break;
            case 10:
                result = txn.exec_params(query, paramValues[0], paramValues[1], paramValues[2], paramValues[3], paramValues[4], paramValues[5], paramValues[6], paramValues[7], paramValues[8], paramValues[9]);
                break;
            case 11:
                result = txn.exec_params(query, paramValues[0], paramValues[1], paramValues[2], paramValues[3], paramValues[4], paramValues[5], paramValues[6], paramValues[7], paramValues[8], paramValues[9], paramValues[10]);
                break;
            case 12:
                result = txn.exec_params(query, paramValues[0], paramValues[1], paramValues[2], paramValues[3], paramValues[4], paramValues[5], paramValues[6], paramValues[7], paramValues[8], paramValues[9], paramValues[10], paramValues[11]);
                break;
            case 13:
                result = txn.exec_params(query, paramValues[0], paramValues[1], paramValues[2], paramValues[3], paramValues[4], paramValues[5], paramValues[6], paramValues[7], paramValues[8], paramValues[9], paramValues[10], paramValues[11], paramValues[12]);
                break;
            default:
                txn.commit();
                return false;
        }
        
        if (result.affected_rows() > 0) {
            double newAmount = updates.contains("originalAmount") ? toDouble(updates.at("originalAmount")) : oldAmount;
            
            if (walletChanged) {
                if (!oldWalletId.empty()) {
                    if (oldType == "borrowed") {
                        txn.exec_params("UPDATE wallets SET current_balance = current_balance - $1 WHERE id = $2::uuid", oldAmount, oldWalletId);
                    } else {
                        txn.exec_params("UPDATE wallets SET current_balance = current_balance + $1 WHERE id = $2::uuid", oldAmount, oldWalletId);
                    }
                }
                if (!newWalletId.empty()) {
                    if (oldType == "borrowed") {
                        txn.exec_params("UPDATE wallets SET current_balance = current_balance + $1 WHERE id = $2::uuid", newAmount, newWalletId);
                    } else {
                        txn.exec_params("UPDATE wallets SET current_balance = current_balance - $1 WHERE id = $2::uuid", newAmount, newWalletId);
                    }
                }
            } else if (updates.contains("originalAmount") && !oldWalletId.empty()) {
                double diff = newAmount - oldAmount;
                if (diff != 0) {
                    if (oldType == "borrowed") {
                        txn.exec_params("UPDATE wallets SET current_balance = current_balance + $1 WHERE id = $2::uuid", diff, oldWalletId);
                    } else {
                        txn.exec_params("UPDATE wallets SET current_balance = current_balance - $1 WHERE id = $2::uuid", diff, oldWalletId);
                    }
                }
            }
            
            txn.commit();
            invalidateCache(userId);
            invalidateWalletCache(userId);
            invalidateTransactionCache(userId);
            return true;
        }
        
        txn.commit();
        return false;
    } catch (const std::exception& e) {
        std::cerr << "Error updating debt: " << e.what() << std::endl;
        return false;
    }
}

bool DebtService::deleteDebt(const std::string& id, const std::string& userId) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        auto debtResult = txn.exec_params(
            "SELECT * FROM debts WHERE id = $1::uuid AND user_id = $2::uuid", id, userId);
        if (debtResult.empty()) {
            txn.commit();
            return false;
        }
        
        auto row = debtResult[0];
        std::string walletId = row["wallet_id"].is_null() ? "" : row["wallet_id"].as<std::string>();
        std::string debtType = row["type"].as<std::string>();
        double originalAmount = row["original_amount"].as<double>();
        
        txn.exec_params("DELETE FROM transactions WHERE $1 = ANY(tags)", id);
        txn.exec_params("DELETE FROM debt_payments WHERE debt_id = $1::uuid", id);
        
        if (!walletId.empty() && originalAmount > 0) {
            if (debtType == "borrowed") {
                txn.exec_params("UPDATE wallets SET current_balance = current_balance - $1 WHERE id = $2::uuid", originalAmount, walletId);
            } else {
                txn.exec_params("UPDATE wallets SET current_balance = current_balance + $1 WHERE id = $2::uuid", originalAmount, walletId);
            }
        }
        
        auto result = txn.exec_params(
            "DELETE FROM debts WHERE id = $1::uuid AND user_id = $2::uuid", id, userId);
        txn.commit();
        
        if (result.affected_rows() > 0) {
            invalidateCache(userId);
            invalidateWalletCache(userId);
            invalidateTransactionCache(userId);
            return true;
        }
        return false;
    } catch (const std::exception& e) {
        std::cerr << "Error deleting debt: " << e.what() << std::endl;
        return false;
    }
}

// ============================================
// PAGOS
// ============================================
std::vector<DebtPayment> DebtService::getPayments(const std::string& debtId) {
    std::vector<DebtPayment> payments;
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        auto result = txn.exec_params(
            "SELECT * FROM debt_payments WHERE debt_id = $1::uuid ORDER BY date DESC", debtId);
        txn.commit();
        for (const auto& row : result) payments.push_back(rowToPayment(row));
    } catch (const std::exception& e) {
        std::cerr << "Error getting payments: " << e.what() << std::endl;
    }
    return payments;
}

std::optional<DebtPayment> DebtService::addPayment(const DebtPayment& payment) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        std::string userId, walletId, debtType, creditorName;
        auto debtResult = txn.exec_params(
            "SELECT user_id, wallet_id, type, creditor_name FROM debts WHERE id = $1::uuid", payment.debtId);
        if (!debtResult.empty()) {
            userId = debtResult[0]["user_id"].as<std::string>();
            walletId = debtResult[0]["wallet_id"].is_null() ? "" : debtResult[0]["wallet_id"].as<std::string>();
            debtType = debtResult[0]["type"].as<std::string>();
            creditorName = debtResult[0]["creditor_name"].as<std::string>();
        }
        
        std::string categoryId;
        std::string categoryName = debtType == "borrowed" ? "Debt Payment" : "Debt Collection";
        auto catResult = txn.exec_params(
            "SELECT id FROM categories WHERE name = $1 AND is_system = true LIMIT 1", categoryName);
        if (!catResult.empty()) {
            categoryId = catResult[0]["id"].as<std::string>();
        }
        
        std::string description = debtType == "borrowed" 
            ? "Payment to " + creditorName 
            : "Payment received from " + creditorName;
        
        std::vector<std::string> tags = {"debt-payment", payment.debtId};
        
        auto txResult = txn.exec_params(
            "INSERT INTO transactions (user_id, wallet_id, category_id, amount, description, date, tags) "
            "VALUES ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6::timestamp,$7) RETURNING id",
            userId, 
            walletId.empty() ? std::optional<std::string>() : std::optional<std::string>(walletId),
            categoryId.empty() ? std::optional<std::string>() : std::optional<std::string>(categoryId),
            payment.amount, description, payment.date, tags);
        
        std::string transactionId = txResult[0]["id"].as<std::string>();
        
        txn.exec_params("UPDATE debts SET remaining_balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2::uuid",
            payment.remainingBalance, payment.debtId);
        
        if (!walletId.empty()) {
            if (debtType == "borrowed") {
                txn.exec_params("UPDATE wallets SET current_balance = current_balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2::uuid",
                    payment.amount, walletId);
            } else {
                txn.exec_params("UPDATE wallets SET current_balance = current_balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2::uuid",
                    payment.amount, walletId);
            }
        }
        
        auto result = txn.exec_params(
            "INSERT INTO debt_payments (debt_id, transaction_id, category_id, amount, date, interest_amount, principal_amount, remaining_balance, notes) "
            "VALUES ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,$8,$9) RETURNING id, created_at",
            payment.debtId, transactionId, 
            categoryId.empty() ? std::optional<std::string>() : std::optional<std::string>(categoryId),
            payment.amount, payment.date, payment.interestAmount,
            payment.principalAmount, payment.remainingBalance, payment.notes);
        
        txn.commit();
        
        DebtPayment p = payment;
        p.id = result[0]["id"].as<std::string>();
        p.createdAt = result[0]["created_at"].as<std::string>();

        if (!userId.empty()) {
            invalidateCache(userId);
            invalidateWalletCache(userId);
            invalidateTransactionCache(userId);
        }
        return p;
    } catch (const std::exception& e) {
        std::cerr << "Error adding payment: " << e.what() << std::endl;
        return std::nullopt;
    }
}

bool DebtService::deletePayment(const std::string& paymentId) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        auto payResult = txn.exec_params(
            "SELECT debt_id, amount, transaction_id FROM debt_payments WHERE id = $1::uuid", paymentId);
        if (payResult.empty()) {
            txn.commit();
            return false;
        }
        
        std::string debtId = payResult[0]["debt_id"].as<std::string>();
        double amount = payResult[0]["amount"].as<double>();
        std::string txId = payResult[0]["transaction_id"].is_null() ? "" : payResult[0]["transaction_id"].as<std::string>();
        
        std::string userId, walletId, debtType;
        auto debtResult = txn.exec_params("SELECT user_id, wallet_id, type FROM debts WHERE id = $1::uuid", debtId);
        if (!debtResult.empty()) {
            userId = debtResult[0]["user_id"].as<std::string>();
            walletId = debtResult[0]["wallet_id"].is_null() ? "" : debtResult[0]["wallet_id"].as<std::string>();
            debtType = debtResult[0]["type"].as<std::string>();
        }
        
        if (!walletId.empty()) {
            if (debtType == "borrowed") {
                txn.exec_params("UPDATE wallets SET current_balance = current_balance + $1 WHERE id = $2::uuid", amount, walletId);
            } else {
                txn.exec_params("UPDATE wallets SET current_balance = current_balance - $1 WHERE id = $2::uuid", amount, walletId);
            }
        }
        
        if (!txId.empty()) {
            txn.exec_params("DELETE FROM transactions WHERE id = $1::uuid", txId);
        }
        
        auto result = txn.exec_params("DELETE FROM debt_payments WHERE id = $1::uuid", paymentId);
        txn.commit();
        
        if (!userId.empty()) {
            invalidateCache(userId);
            invalidateWalletCache(userId);
            invalidateTransactionCache(userId);
        }
        return result.affected_rows() > 0;
    } catch (const std::exception& e) {
        std::cerr << "Error deleting payment: " << e.what() << std::endl;
        return false;
    }
}

// ============================================
// INTERESES VARIABLES
// ============================================
std::vector<VariableInterest> DebtService::getVariableInterests(const std::string& debtId) {
    std::vector<VariableInterest> interests;
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        auto result = txn.exec_params(
            "SELECT * FROM variable_interests WHERE debt_id = $1::uuid ORDER BY month", debtId);
        txn.commit();
        for (const auto& row : result) interests.push_back(rowToInterest(row));
    } catch (const std::exception& e) {
        std::cerr << "Error getting variable interests: " << e.what() << std::endl;
    }
    return interests;
}

bool DebtService::addVariableInterest(const VariableInterest& interest) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        txn.exec_params(
            "INSERT INTO variable_interests (debt_id, month, rate) VALUES ($1::uuid,$2,$3) "
            "ON CONFLICT (debt_id, month) DO UPDATE SET rate = $3",
            interest.debtId, interest.month, interest.rate);
        txn.commit();
        return true;
    } catch (const std::exception& e) {
        std::cerr << "Error adding variable interest: " << e.what() << std::endl;
        return false;
    }
}

// ============================================
// CACHE
// ============================================
void DebtService::invalidateCache(const std::string& userId) {
    auto& redis = redis::RedisClient::getInstance();
    if (!redis.isConnected()) return;
    
    std::string cacheKey = RedisKeys::DEBTS_USER_PREFIX + userId;
    redis.del(cacheKey);
    redis.srem(CacheSets::DEBTS_USER, cacheKey);
    
    std::cout << "[Redis] Invalidated debt cache for: " << userId << std::endl;
}

// ============================================
// ROW MAPPERS
// ============================================
Debt DebtService::rowToDebt(const pqxx::row& row) {
    Debt d;
    try { d.id = row["id"].is_null() ? "" : row["id"].as<std::string>(); } catch (...) { d.id = ""; }
    try { d.userId = row["user_id"].is_null() ? "" : row["user_id"].as<std::string>(); } catch (...) { d.userId = ""; }
    try { d.type = row["type"].is_null() ? "" : row["type"].as<std::string>(); } catch (...) { d.type = ""; }
    try { d.creditorName = row["creditor_name"].is_null() ? "" : row["creditor_name"].as<std::string>(); } catch (...) { d.creditorName = ""; }
    try { d.walletId = row["wallet_id"].is_null() ? "" : row["wallet_id"].as<std::string>(); } catch (...) { d.walletId = ""; }
    try { d.categoryId = row["category_id"].is_null() ? "" : row["category_id"].as<std::string>(); } catch (...) { d.categoryId = ""; }
    try { d.originalAmount = row["original_amount"].is_null() ? 0 : row["original_amount"].as<double>(); } catch (...) { d.originalAmount = 0; }
    try { d.remainingBalance = row["remaining_balance"].is_null() ? 0 : row["remaining_balance"].as<double>(); } catch (...) { d.remainingBalance = 0; }
    try { d.interestRate = row["interest_rate"].is_null() ? 0 : row["interest_rate"].as<double>(); } catch (...) { d.interestRate = 0; }
    try { d.interestType = row["interest_type"].is_null() ? "fixed" : row["interest_type"].as<std::string>(); } catch (...) { d.interestType = "fixed"; }
    try { d.compoundMonths = row["compound_months"].is_null() ? 0 : row["compound_months"].as<int>(); } catch (...) { d.compoundMonths = 0; }
    try { d.termMonths = row["term_months"].is_null() ? 0 : row["term_months"].as<int>(); } catch (...) { d.termMonths = 0; }
    try { d.monthlyPayment = row["monthly_payment"].is_null() ? 0 : row["monthly_payment"].as<double>(); } catch (...) { d.monthlyPayment = 0; }
    try { d.startDate = row["start_date"].is_null() ? "" : row["start_date"].as<std::string>(); } catch (...) { d.startDate = ""; }
    try { d.nextDueDate = row["next_due_date"].is_null() ? "" : row["next_due_date"].as<std::string>(); } catch (...) { d.nextDueDate = ""; }
    try { d.status = row["status"].is_null() ? "active" : row["status"].as<std::string>(); } catch (...) { d.status = "active"; }
    try { d.notes = row["notes"].is_null() ? "" : row["notes"].as<std::string>(); } catch (...) { d.notes = ""; }
    try { d.realAmountToPay = row["real_amount_to_pay"].is_null() ? 0 : row["real_amount_to_pay"].as<double>(); } catch (...) { d.realAmountToPay = 0; }
    try { d.realInterests = row["real_interests"].is_null() ? 0 : row["real_interests"].as<double>(); } catch (...) { d.realInterests = 0; }
    try { d.createdAt = row["created_at"].is_null() ? "" : row["created_at"].as<std::string>(); } catch (...) { d.createdAt = ""; }
    try { d.updatedAt = row["updated_at"].is_null() ? "" : row["updated_at"].as<std::string>(); } catch (...) { d.updatedAt = ""; }
    return d;
}

DebtPayment DebtService::rowToPayment(const pqxx::row& row) {
    DebtPayment p;
    try { p.id = row["id"].is_null() ? "" : row["id"].as<std::string>(); } catch (...) { p.id = ""; }
    try { p.debtId = row["debt_id"].is_null() ? "" : row["debt_id"].as<std::string>(); } catch (...) { p.debtId = ""; }
    try { p.amount = row["amount"].is_null() ? 0 : row["amount"].as<double>(); } catch (...) { p.amount = 0; }
    try { p.date = row["date"].is_null() ? "" : row["date"].as<std::string>(); } catch (...) { p.date = ""; }
    try { p.interestAmount = row["interest_amount"].is_null() ? 0 : row["interest_amount"].as<double>(); } catch (...) { p.interestAmount = 0; }
    try { p.principalAmount = row["principal_amount"].is_null() ? 0 : row["principal_amount"].as<double>(); } catch (...) { p.principalAmount = 0; }
    try { p.remainingBalance = row["remaining_balance"].is_null() ? 0 : row["remaining_balance"].as<double>(); } catch (...) { p.remainingBalance = 0; }
    try { p.notes = row["notes"].is_null() ? "" : row["notes"].as<std::string>(); } catch (...) { p.notes = ""; }
    try { p.createdAt = row["created_at"].is_null() ? "" : row["created_at"].as<std::string>(); } catch (...) { p.createdAt = ""; }
    return p;
}

VariableInterest DebtService::rowToInterest(const pqxx::row& row) {
    VariableInterest vi;
    try { vi.id = row["id"].is_null() ? "" : row["id"].as<std::string>(); } catch (...) { vi.id = ""; }
    try { vi.debtId = row["debt_id"].is_null() ? "" : row["debt_id"].as<std::string>(); } catch (...) { vi.debtId = ""; }
    try { vi.month = row["month"].is_null() ? 0 : row["month"].as<int>(); } catch (...) { vi.month = 0; }
    try { vi.rate = row["rate"].is_null() ? 0 : row["rate"].as<double>(); } catch (...) { vi.rate = 0; }
    try { vi.createdAt = row["created_at"].is_null() ? "" : row["created_at"].as<std::string>(); } catch (...) { vi.createdAt = ""; }
    return vi;
}