#pragma once

#include <string>
#include <vector>
#include <optional>
#include <boost/json.hpp>
#include <pqxx/pqxx> 

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
    
private:
    DebtService() = default;
    
    // Helpers
    Debt rowToDebt(const pqxx::row& row);
    DebtPayment rowToPayment(const pqxx::row& row);
    VariableInterest rowToInterest(const pqxx::row& row);
    
    std::string debtToJson(const Debt& d);
    Debt jsonToDebt(const std::string& json);
    std::string debtsToJson(const std::vector<Debt>& debts);
    std::vector<Debt> jsonToDebts(const std::string& json);
    std::string paymentsToJson(const std::vector<DebtPayment>& payments);
    std::vector<DebtPayment> jsonToPayments(const std::string& json);
};