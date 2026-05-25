#pragma once

#include <string>
#include <vector>
#include <optional>
#include <boost/json.hpp>
#include <pqxx/pqxx>
#include <shared_mutex>

struct Debt {
    std::string id;
    std::string userId;
    std::string type;          // 'borrowed' o 'lent'
    std::string creditorName;
    std::string walletId;
    std::string categoryId;
    double originalAmount;
    double remainingBalance;
    double interestRate;
    std::string interestType;  // 'fixed' o 'variable'
    int compoundMonths;        // 0 = sin compound, > 0 = capitaliza cada N meses
    int termMonths;
    double monthlyPayment;
    std::string startDate;
    std::string nextDueDate;
    std::string status;        // 'active', 'paid', 'defaulted'
    std::string notes;
    double realAmountToPay;
    double realInterests;
    std::string createdAt;
    std::string updatedAt;
};

struct DebtPayment {
    std::string id;
    std::string debtId;
    double amount;
    std::string date;
    double interestAmount;
    double principalAmount;
    double remainingBalance;
    std::string notes;
    std::string createdAt;
};

struct VariableInterest {
    std::string id;
    std::string debtId;
    int month;
    double rate;
    std::string createdAt;
};

// ============================================
// CONSTANTES DE SETS PARA CACHÉ
// ============================================
namespace CacheSets {
    constexpr const char* DEBTS_USER = "debts:set:user";
    constexpr const char* DEBT_PAYMENTS = "debts:set:payments";
}

class DebtService {
public:
    static DebtService& getInstance();
    
    // CRUD Deudas
    std::vector<Debt> getDebtsByUser(const std::string& userId);
    std::optional<Debt> getDebtById(const std::string& id, const std::string& userId);
    std::optional<Debt> createDebt(const Debt& debt);
    bool updateDebt(const std::string& id, const std::string& userId, const boost::json::object& updates);
    bool deleteDebt(const std::string& id, const std::string& userId);
    
    // Pagos
    std::vector<DebtPayment> getPayments(const std::string& debtId);
    std::optional<DebtPayment> addPayment(const DebtPayment& payment);
    bool deletePayment(const std::string& paymentId);
    
    // Intereses variables
    std::vector<VariableInterest> getVariableInterests(const std::string& debtId);
    bool addVariableInterest(const VariableInterest& interest);
    
    // Cache
    void invalidateCache(const std::string& userId);
    
    // Serialization
    std::string debtToJson(const Debt& d);
    Debt jsonToDebt(const std::string& json);
    std::string debtsToJson(const std::vector<Debt>& debts);
    std::vector<Debt> jsonToDebts(const std::string& json);
    std::string paymentsToJson(const std::vector<DebtPayment>& payments);
    std::vector<DebtPayment> jsonToPayments(const std::string& json);
    
private:
    DebtService() = default;
    DebtService(const DebtService&) = delete;
    DebtService& operator=(const DebtService&) = delete;
    
    mutable std::shared_mutex cache_mutex_;
    
    // Row mappers
    Debt rowToDebt(const pqxx::row& row);
    DebtPayment rowToPayment(const pqxx::row& row);
    VariableInterest rowToInterest(const pqxx::row& row);
    
    // Cache helpers
    void cacheWithTracking(const std::string& key, const std::string& value,
                          const std::string& setKey, int ttl = 300);
    void invalidateBySet(const std::string& setKey, const std::string& pattern = "");
    void invalidateWalletCache(const std::string& userId);
    void invalidateTransactionCache(const std::string& userId);
};

// Prefijos Redis con namespace
namespace RedisKeys {
    const std::string DEBTS_USER_PREFIX = "debts:user:";
    const std::string DEBT_PAYMENTS_PREFIX = "debts:payments:";
    const int CACHE_TTL = 300;
}