#pragma once

#include <string>
#include <vector>
#include <optional>
#include <bsoncxx/oid.hpp>
#include <bsoncxx/document/value.hpp>

struct Purchase {
    std::string id;
    std::string user_id;
    std::string title;
    std::string description;
    double amount;
    std::string frequency;   // one-time, daily, weekly, monthly, yearly
    std::string category;    // food, transport, entertainment, utilities, etc.
    std::string date;        // YYYY-MM-DD
    std::string created_at;
    
    bsoncxx::document::value toBson() const;
    static Purchase fromBson(const bsoncxx::document::view& doc);
};

class PurchaseService {
public:
    static PurchaseService& getInstance();
    
    bool createPurchase(const Purchase& purchase, std::string& purchase_id);
    std::optional<Purchase> getPurchase(const std::string& id);
    std::vector<Purchase> getPurchasesByUser(const std::string& user_id);
    std::vector<Purchase> getPurchasesByUserAndCategory(const std::string& user_id, const std::string& category);
    std::vector<Purchase> getPurchasesByUserAndDateRange(const std::string& user_id, 
                                                          const std::string& start_date, 
                                                          const std::string& end_date);
    bool updatePurchase(const std::string& id, const std::string& title, 
                        const std::string& description, double amount,
                        const std::string& frequency, const std::string& category);
    bool deletePurchase(const std::string& id);
    double getTotalByUser(const std::string& user_id);
    double getTotalByUserAndCategory(const std::string& user_id, const std::string& category);
    
private:
    PurchaseService() = default;
    static std::optional<bsoncxx::oid> parseObjectId(const std::string& id);
};