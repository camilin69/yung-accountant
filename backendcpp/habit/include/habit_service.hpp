#pragma once

#include <string>
#include <vector>
#include <optional>
#include <boost/json.hpp>
#include <pqxx/pqxx>
#include <shared_mutex>

struct Habit {
    std::string id;
    std::string userId;
    std::string name;
    bool isActive;
    int currentStreak;
    int bestStreak;
    std::string createdAt;
    std::string updatedAt;
};

struct HabitCheck {
    std::string checkDate;
    bool completed;
    std::string note;
};

// ============================================
// CONSTANTES DE SETS PARA CACHÉ
// ============================================
namespace CacheSets {
    constexpr const char* HABITS_USER = "habits:set:user";
}

class HabitService {
public:
    static HabitService& getInstance();
    
    std::vector<Habit> getHabitsByUser(const std::string& userId);
    std::optional<Habit> getHabitById(const std::string& id, const std::string& userId);
    std::optional<Habit> createHabit(const Habit& habit);
    bool updateHabit(const std::string& id, const std::string& userId, const boost::json::object& updates);
    bool deleteHabit(const std::string& id, const std::string& userId);
    
    // Checks (dentro del JSONB)
    std::vector<HabitCheck> getChecks(const std::string& habitId);
    bool addCheck(const std::string& habitId, const HabitCheck& check);
    bool deleteCheck(const std::string& habitId, const std::string& checkDate);
    
    int calculateStreak(const std::string& habitId);
    void invalidateCache(const std::string& userId);
    
    // Serialization
    std::string habitToJson(const Habit& h);
    Habit jsonToHabit(const std::string& json);
    std::string habitsToJson(const std::vector<Habit>& habits);
    std::vector<Habit> jsonToHabits(const std::string& json);
    
private:
    HabitService() = default;
    HabitService(const HabitService&) = delete;
    HabitService& operator=(const HabitService&) = delete;
    
    mutable std::shared_mutex cache_mutex_;
    
    int calculateStreakFromChecks(const std::vector<HabitCheck>& checks);
    Habit rowToHabit(const pqxx::row& row);
    std::vector<HabitCheck> parseChecks(const std::string& jsonb);
    std::string checksToJsonb(const std::vector<HabitCheck>& checks);
    
    // Cache helpers
    void cacheWithTracking(const std::string& key, const std::string& value,
                          const std::string& setKey, int ttl = 300);
    void invalidateBySet(const std::string& setKey, const std::string& pattern = "");
};

// Prefijos Redis con namespace
namespace RedisKeys {
    const std::string HABITS_USER_PREFIX = "habits:user:";
    const int CACHE_TTL = 300;
}