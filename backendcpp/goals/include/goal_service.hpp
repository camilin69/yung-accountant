#pragma once

#include <string>
#include <vector>
#include <optional>
#include <bsoncxx/oid.hpp>
#include <bsoncxx/document/value.hpp>

struct Goal {
    std::string id;
    std::string user_id;
    std::string title;
    std::string description;
    double target_amount;
    double current_amount;
    std::string created_at;
    
    bsoncxx::document::value toBson() const;
    static Goal fromBson(const bsoncxx::document::view& doc);
};

class GoalService {
public:
    static GoalService& getInstance();
    
    bool createGoal(const Goal& goal, std::string& goal_id);
    std::optional<Goal> getGoal(const std::string& id);
    std::vector<Goal> getGoalsByUser(const std::string& user_id);
    bool updateGoal(const std::string& id, const std::string& title, 
                    const std::string& description, double target_amount);
    bool addAmount(const std::string& id, double amount);
    bool deleteGoal(const std::string& id);
    double getProgressPercentage(const std::string& id);
    
private:
    GoalService() = default;
    static std::optional<bsoncxx::oid> parseObjectId(const std::string& id);
};