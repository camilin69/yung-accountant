#pragma once

#include <string>
#include <vector>
#include <optional>
#include <bsoncxx/oid.hpp>
#include <bsoncxx/document/value.hpp>

struct Saving {
    std::string id;
    std::string user_id;
    std::string title;
    std::string description;
    double amount;
    std::string goal_date;    // YYYY-MM-DD (fecha objetivo para alcanzar el ahorro)
    std::string created_at;
    
    bsoncxx::document::value toBson() const;
    static Saving fromBson(const bsoncxx::document::view& doc);
};

class SavingService {
public:
    static SavingService& getInstance();
    
    bool createSaving(const Saving& saving, std::string& saving_id);
    std::optional<Saving> getSaving(const std::string& id);
    std::vector<Saving> getSavingsByUser(const std::string& user_id);
    std::vector<Saving> getSavingsByUserAndDateRange(const std::string& user_id,
                                                      const std::string& start_date,
                                                      const std::string& end_date);
    bool updateSaving(const std::string& id, const std::string& title, 
                      const std::string& description, double amount,
                      const std::string& goal_date);
    bool addAmount(const std::string& id, double amount);
    bool deleteSaving(const std::string& id);
    double getTotalByUser(const std::string& user_id);
    
private:
    SavingService() = default;
    static std::optional<bsoncxx::oid> parseObjectId(const std::string& id);
};