#pragma once

#include <string>
#include <vector>
#include <optional>
#include <bsoncxx/oid.hpp>
#include <bsoncxx/document/value.hpp>

// ============================================
// STRUCT DAY
// ============================================
struct Day {
    std::string id;
    std::string goal_id;
    std::string date;           // YYYY-MM-DD
    std::string created_at;
    
    bsoncxx::document::value toBson() const;
    static Day fromBson(const bsoncxx::document::view& doc);
};

// ============================================
// STRUCT EVENT
// ============================================
struct Event {
    std::string id;
    std::string day_id;
    std::string title;
    std::string description;
    double amount;
    std::string created_at;
    
    bsoncxx::document::value toBson() const;
    static Event fromBson(const bsoncxx::document::view& doc);
};

// ============================================
// STRUCT GOAL
// ============================================
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

// ============================================
// CLASS GOAL SERVICE
// ============================================
class GoalService {
public:
    static GoalService& getInstance();
    
    // ========== GOAL OPERATIONS ==========
    bool createGoal(const Goal& goal, std::string& goal_id);
    std::optional<Goal> getGoal(const std::string& id);
    std::vector<Goal> getGoalsByUser(const std::string& user_id);
    bool updateGoal(const std::string& id, const std::string& title, 
                    const std::string& description, double target_amount);
    bool deleteGoal(const std::string& id);
    double getProgressPercentage(const std::string& id);
    
    // ========== DAY OPERATIONS ==========
    bool dayExistsForGoal(const std::string& goal_id, const std::string& date);
    double getDayTotal(const std::string& day_id);
    bool createDay(const Day& day, std::string& day_id);
    std::optional<Day> getDay(const std::string& id);
    std::vector<Day> getDaysByGoal(const std::string& goal_id);
    bool updateDay(const std::string& id, const std::string& date);
    bool deleteDay(const std::string& id);
    void deleteDaysByGoal(const std::string& goal_id);  // Cascade delete
    
    // ========== EVENT OPERATIONS ==========
    bool createEvent(const Event& event, std::string& event_id);
    std::optional<Event> getEvent(const std::string& id);
    std::vector<Event> getEventsByDay(const std::string& day_id);
    bool updateEvent(const std::string& id, const std::string& title, 
                     const std::string& description, double amount);
    bool deleteEvent(const std::string& id);
    void deleteEventsByDay(const std::string& day_id);  // Cascade delete
    
    // ========== UTILITY ==========
    double calculateGoalProgress(const std::string& goal_id);
    
private:
    GoalService() = default;
    static std::optional<bsoncxx::oid> parseObjectId(const std::string& id);
};