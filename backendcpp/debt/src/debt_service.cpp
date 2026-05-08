#include "debt_service.hpp"
#include "database.hpp"
#include "redis_client.hpp"
#include <pqxx/pqxx>
#include <iostream>
#include <boost/json.hpp>

// ============================================
// HELPERS DE SERIALIZACIÓN
// ============================================
std::string DebtService::debtToJson(const Debt& d) {
    boost::json::object obj;
    obj["id"] = d.id;
    obj["userId"] = d.userId;
    obj["type"] = d.type;
    obj["creditorName"] = d.creditorName;
    obj["walletId"] = d.walletId;
    obj["categoryId"] = d.categoryId;
    obj["originalAmount"] = d.originalAmount;
    obj["remainingBalance"] = d.remainingBalance;
    obj["interestRate"] = d.interestRate;
    obj["interestType"] = d.interestType;
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
    d.walletId = boost::json::value_to<std::string>(obj.at("walletId"));
    d.categoryId = boost::json::value_to<std::string>(obj.at("categoryId"));
    d.originalAmount = obj.at("originalAmount").as_double();
    d.remainingBalance = obj.at("remainingBalance").as_double();
    d.interestRate = obj.at("interestRate").as_double();
    d.interestType = boost::json::value_to<std::string>(obj.at("interestType"));
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
// CRUD DEUDAS
// ============================================
std::vector<Debt> DebtService::getDebtsByUser(const std::string& userId) {
    auto& redis = redis::RedisClient::getInstance();
    std::string cacheKey = "debts:user:" + userId;
    
    if (redis.isConnected()) {
        auto cached = redis.get(cacheKey);
        if (cached) {
            std::cout << "[Redis] Cache HIT: debts for " << userId << std::endl;
            return jsonToDebts(*cached);
        }
    }
    
    std::vector<Debt> debts;
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "SELECT * FROM debts WHERE user_id = $1 ORDER BY created_at DESC", userId);
        txn.commit();
        
        for (const auto& row : result) debts.push_back(rowToDebt(row));
        
        if (redis.isConnected()) {
            redis.set(cacheKey, debtsToJson(debts), 300);
        }
    } catch (const std::exception& e) {
        std::cerr << "Error getting debts: " << e.what() << std::endl;
    }
    return debts;
}

std::optional<Debt> DebtService::getDebtById(const std::string& id, const std::string& userId) {
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "SELECT * FROM debts WHERE id = $1 AND user_id = $2", id, userId);
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
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "INSERT INTO debts (user_id, type, creditor_name, wallet_id, category_id, "
            "original_amount, remaining_balance, interest_rate, interest_type, "
            "term_months, monthly_payment, start_date, next_due_date, status, notes, "
            "real_amount_to_pay, real_interests) "
            "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) "
            "RETURNING id, created_at, updated_at",
            debt.userId, debt.type, debt.creditorName, debt.walletId, debt.categoryId,
            debt.originalAmount, debt.remainingBalance, debt.interestRate, debt.interestType,
            debt.termMonths, debt.monthlyPayment, debt.startDate, debt.nextDueDate,
            debt.status, debt.notes, debt.realAmountToPay, debt.realInterests);
        txn.commit();
        
        if (!result.empty()) {
            Debt d = debt;
            d.id = result[0]["id"].as<std::string>();
            d.createdAt = result[0]["created_at"].as<std::string>();
            d.updatedAt = result[0]["updated_at"].as<std::string>();
            invalidateCache(debt.userId);
            return d;
        }
        return std::nullopt;
    } catch (const std::exception& e) {
        std::cerr << "Error creating debt: " << e.what() << std::endl;
        return std::nullopt;
    }
}

bool DebtService::updateDebt(const std::string& id, const std::string& userId, const boost::json::object& updates) {
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        
        // Helper para convertir a double (sin depender de namespace)
        auto toDouble = [](const boost::json::value& v) -> double {
            if (v.is_int64()) return static_cast<double>(v.as_int64());
            if (v.is_double()) return v.as_double();
            return v.to_number<double>();
        };
        
        std::string query = "UPDATE debts SET ";
        std::vector<std::string> setParts;
        auto quote = [&](const std::string& s) { return txn.quote(s); };
        
        if (updates.contains("remainingBalance")) {
            setParts.push_back("remaining_balance = " + std::to_string(toDouble(updates.at("remainingBalance"))));
        }
        if (updates.contains("status")) {
            setParts.push_back("status = " + quote(std::string(updates.at("status").as_string())));
        }
        if (updates.contains("nextDueDate")) {
            setParts.push_back("next_due_date = " + quote(std::string(updates.at("next_due_date").as_string())) + "::date");
        }
        if (updates.contains("notes")) {
            setParts.push_back("notes = " + quote(std::string(updates.at("notes").as_string())));
        }
        if (updates.contains("originalAmount")) {
            setParts.push_back("original_amount = " + std::to_string(toDouble(updates.at("originalAmount"))));
        }
        if (updates.contains("interestRate")) {
            setParts.push_back("interest_rate = " + std::to_string(toDouble(updates.at("interestRate"))));
        }
        if (updates.contains("monthlyPayment")) {
            setParts.push_back("monthly_payment = " + std::to_string(toDouble(updates.at("monthlyPayment"))));
        }
        if (updates.contains("realAmountToPay")) {
            setParts.push_back("real_amount_to_pay = " + std::to_string(toDouble(updates.at("realAmountToPay"))));
        }
        if (updates.contains("realInterests")) {
            setParts.push_back("real_interests = " + std::to_string(toDouble(updates.at("realInterests"))));
        }
        
        if (setParts.empty()) return false;
        
        for (size_t i = 0; i < setParts.size(); ++i) {
            if (i > 0) query += ", ";
            query += setParts[i];
        }
        
        query += ", updated_at = CURRENT_TIMESTAMP WHERE id = " + quote(id) + 
                 " AND user_id = " + quote(userId);
        
        std::cout << "[UPDATE DEBT] Query: " << query << std::endl;
        
        pqxx::result result = txn.exec(query);
        txn.commit();
        
        if (result.affected_rows() > 0) {
            invalidateCache(userId);
            return true;
        }
        return false;
    } catch (const std::exception& e) {
        std::cerr << "Error updating debt: " << e.what() << std::endl;
        return false;
    }
}

bool DebtService::deleteDebt(const std::string& id, const std::string& userId) {
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        auto result = txn.exec_params("DELETE FROM debts WHERE id = $1 AND user_id = $2", id, userId);
        txn.commit();
        if (result.affected_rows() > 0) {
            invalidateCache(userId);
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
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        auto result = txn.exec_params("SELECT * FROM debt_payments WHERE debt_id = $1 ORDER BY date DESC", debtId);
        txn.commit();
        for (const auto& row : result) payments.push_back(rowToPayment(row));
    } catch (const std::exception& e) {
        std::cerr << "Error getting payments: " << e.what() << std::endl;
    }
    return payments;
}

std::optional<DebtPayment> DebtService::addPayment(const DebtPayment& payment) {
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        
        // Obtener userId y walletId antes del commit
        std::string userId, walletId, debtType;
        auto debtResult = txn.exec_params("SELECT user_id, wallet_id, type FROM debts WHERE id = $1", payment.debtId);
        if (!debtResult.empty()) {
            userId = debtResult[0]["user_id"].as<std::string>();
            walletId = debtResult[0]["wallet_id"].is_null() ? "" : debtResult[0]["wallet_id"].as<std::string>();
            debtType = debtResult[0]["type"].as<std::string>();
        }
        
        // 1. Insertar pago
        auto result = txn.exec_params(
            "INSERT INTO debt_payments (debt_id, amount, date, interest_amount, principal_amount, remaining_balance, notes) "
            "VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, created_at",
            payment.debtId, payment.amount, payment.date, payment.interestAmount,
            payment.principalAmount, payment.remainingBalance, payment.notes);
        
        // 2. Actualizar remaining_balance de la deuda
        txn.exec_params("UPDATE debts SET remaining_balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
            payment.remainingBalance, payment.debtId);
        
        // 3. Actualizar balance de la wallet
        if (!walletId.empty()) {
            if (debtType == "borrowed") {
                txn.exec_params("UPDATE wallets SET current_balance = current_balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
                    payment.amount, walletId);
            } else {
                txn.exec_params("UPDATE wallets SET current_balance = current_balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
                    payment.amount, walletId);
            }
        }
        
        txn.commit();
        
        // Invalidar cachés después del commit
        if (!userId.empty()) {
            auto& redis = redis::RedisClient::getInstance();
            if (redis.isConnected()) {
                redis.del("wallets:user:" + userId);
                redis.del("debts:user:" + userId);
                std::cout << "[Redis] Invalidated wallets & debts cache for: " << userId << std::endl;
            }
        }
        
        if (!result.empty()) {
            DebtPayment p = payment;
            p.id = result[0]["id"].as<std::string>();
            p.createdAt = result[0]["created_at"].as<std::string>();
            return p;
        }
        return std::nullopt;
    } catch (const std::exception& e) {
        std::cerr << "Error adding payment: " << e.what() << std::endl;
        return std::nullopt;
    }
}

bool DebtService::deletePayment(const std::string& paymentId) {
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        
        // Obtener info antes de eliminar
        auto payResult = txn.exec_params("SELECT debt_id, amount FROM debt_payments WHERE id = $1", paymentId);
        if (payResult.empty()) return false;
        
        std::string debtId = payResult[0]["debt_id"].as<std::string>();
        double amount = payResult[0]["amount"].as<double>();
        
        // Obtener userId, walletId y tipo
        std::string userId, walletId, debtType;
        auto debtResult = txn.exec_params("SELECT user_id, wallet_id, type FROM debts WHERE id = $1", debtId);
        if (!debtResult.empty()) {
            userId = debtResult[0]["user_id"].as<std::string>();
            walletId = debtResult[0]["wallet_id"].is_null() ? "" : debtResult[0]["wallet_id"].as<std::string>();
            debtType = debtResult[0]["type"].as<std::string>();
        }
        
        // Revertir balance
        if (!walletId.empty()) {
            if (debtType == "borrowed") {
                txn.exec_params("UPDATE wallets SET current_balance = current_balance + $1 WHERE id = $2", amount, walletId);
            } else {
                txn.exec_params("UPDATE wallets SET current_balance = current_balance - $1 WHERE id = $2", amount, walletId);
            }
        }
        
        auto result = txn.exec_params("DELETE FROM debt_payments WHERE id = $1", paymentId);
        txn.commit();
        
        // Invalidar cachés
        if (!userId.empty()) {
            auto& redis = redis::RedisClient::getInstance();
            if (redis.isConnected()) {
                redis.del("wallets:user:" + userId);
                redis.del("debts:user:" + userId);
            }
        }
        
        return result.affected_rows() > 0;
    } catch (const std::exception& e) { return false; }
}

// ============================================
// INTERESES VARIABLES
// ============================================
std::vector<VariableInterest> DebtService::getVariableInterests(const std::string& debtId) {
    std::vector<VariableInterest> interests;
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        auto result = txn.exec_params("SELECT * FROM variable_interests WHERE debt_id = $1 ORDER BY month", debtId);
        txn.commit();
        for (const auto& row : result) interests.push_back(rowToInterest(row));
    } catch (const std::exception& e) {
        std::cerr << "Error getting variable interests: " << e.what() << std::endl;
    }
    return interests;
}

bool DebtService::addVariableInterest(const VariableInterest& interest) {
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        txn.exec_params("INSERT INTO variable_interests (debt_id, month, rate) VALUES ($1,$2,$3) "
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
    if (redis.isConnected()) {
        redis.del("debts:user:" + userId);
        std::cout << "[Redis] Invalidated debt cache for: " << userId << std::endl;
    }
}

// ============================================
// ROW MAPPERS
// ============================================
Debt DebtService::rowToDebt(const pqxx::row& row) {
    Debt d;
    d.id = row["id"].as<std::string>();
    d.userId = row["user_id"].as<std::string>();
    d.type = row["type"].as<std::string>();
    d.creditorName = row["creditor_name"].as<std::string>();
    d.walletId = row["wallet_id"].is_null() ? "" : row["wallet_id"].as<std::string>();
    d.categoryId = row["category_id"].is_null() ? "" : row["category_id"].as<std::string>();
    d.originalAmount = row["original_amount"].as<double>();
    d.remainingBalance = row["remaining_balance"].as<double>();
    d.interestRate = row["interest_rate"].as<double>();
    d.interestType = row["interest_type"].as<std::string>();
    d.termMonths = row["term_months"].as<int>();
    d.monthlyPayment = row["monthly_payment"].as<double>();
    d.startDate = row["start_date"].as<std::string>();
    d.nextDueDate = row["next_due_date"].as<std::string>();
    d.status = row["status"].as<std::string>();
    d.notes = row["notes"].is_null() ? "" : row["notes"].as<std::string>();
    d.realAmountToPay = row["real_amount_to_pay"].is_null() ? 0 : row["real_amount_to_pay"].as<double>();
    d.realInterests = row["real_interests"].is_null() ? 0 : row["real_interests"].as<double>();
    d.createdAt = row["created_at"].as<std::string>();
    d.updatedAt = row["updated_at"].as<std::string>();
    return d;
}

DebtPayment DebtService::rowToPayment(const pqxx::row& row) {
    DebtPayment p;
    p.id = row["id"].as<std::string>();
    p.debtId = row["debt_id"].as<std::string>();
    p.amount = row["amount"].as<double>();
    p.date = row["date"].as<std::string>();
    p.interestAmount = row["interest_amount"].as<double>();
    p.principalAmount = row["principal_amount"].as<double>();
    p.remainingBalance = row["remaining_balance"].as<double>();
    p.notes = row["notes"].is_null() ? "" : row["notes"].as<std::string>();
    p.createdAt = row["created_at"].as<std::string>();
    return p;
}

VariableInterest DebtService::rowToInterest(const pqxx::row& row) {
    VariableInterest vi;
    vi.id = row["id"].as<std::string>();
    vi.debtId = row["debt_id"].as<std::string>();
    vi.month = row["month"].as<int>();
    vi.rate = row["rate"].as<double>();
    vi.createdAt = row["created_at"].as<std::string>();
    return vi;
}