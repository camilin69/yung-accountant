#include "habit_service.hpp"
#include "database.hpp"
#include "redis_client.hpp"
#include <pqxx/pqxx>
#include <iostream>
#include <boost/json.hpp>
#include <algorithm>
#include <ctime>
#include <cstring>

// ============================================
// POOL CONNECTION
// ============================================

// ============================================
// SERIALIZACIÓN
// ============================================
std::string HabitService::habitToJson(const Habit& h) {
    boost::json::object obj;
    obj["id"] = h.id;
    obj["userId"] = h.userId;
    obj["name"] = h.name;
    obj["isActive"] = h.isActive;
    obj["currentStreak"] = h.currentStreak;
    obj["bestStreak"] = h.bestStreak;
    obj["createdAt"] = h.createdAt;
    obj["updatedAt"] = h.updatedAt;
    return boost::json::serialize(obj);
}

Habit HabitService::jsonToHabit(const std::string& json) {
    auto jv = boost::json::parse(json);
    auto& obj = jv.as_object();
    Habit h;
    h.id = boost::json::value_to<std::string>(obj.at("id"));
    h.userId = boost::json::value_to<std::string>(obj.at("userId"));
    h.name = boost::json::value_to<std::string>(obj.at("name"));
    h.isActive = obj.at("isActive").as_bool();
    h.currentStreak = obj.at("currentStreak").as_int64();
    h.bestStreak = obj.at("bestStreak").as_int64();
    h.createdAt = boost::json::value_to<std::string>(obj.at("createdAt"));
    h.updatedAt = boost::json::value_to<std::string>(obj.at("updatedAt"));
    return h;
}

std::string HabitService::habitsToJson(const std::vector<Habit>& habits) {
    boost::json::array arr;
    for (const auto& h : habits) arr.push_back(boost::json::parse(habitToJson(h)));
    return boost::json::serialize(arr);
}

std::vector<Habit> HabitService::jsonToHabits(const std::string& json) {
    std::vector<Habit> result;
    auto jv = boost::json::parse(json);
    for (const auto& item : jv.as_array()) result.push_back(jsonToHabit(boost::json::serialize(item)));
    return result;
}

// ============================================
// CHECKS JSONB HELPERS
// ============================================
std::vector<HabitCheck> HabitService::parseChecks(const std::string& jsonb) {
    std::vector<HabitCheck> checks;
    if (jsonb.empty() || jsonb == "[]") return checks;
    
    try {
        auto jv = boost::json::parse(jsonb);
        for (const auto& item : jv.as_array()) {
            auto& obj = item.as_object();
            HabitCheck c;
            c.checkDate = boost::json::value_to<std::string>(obj.at("checkDate"));
            c.completed = obj.at("completed").as_bool();
            c.note = obj.contains("note") && !obj.at("note").is_null() 
                ? boost::json::value_to<std::string>(obj.at("note")) : "";
            checks.push_back(c);
        }
    } catch (const std::exception& e) {
        std::cerr << "Error parsing checks JSONB: " << e.what() << std::endl;
    }
    return checks;
}

std::string HabitService::checksToJsonb(const std::vector<HabitCheck>& checks) {
    boost::json::array arr;
    for (const auto& c : checks) {
        boost::json::object obj;
        obj["checkDate"] = c.checkDate;
        obj["completed"] = c.completed;
        obj["note"] = c.note.empty() ? nullptr : boost::json::value(c.note);
        arr.push_back(obj);
    }
    return boost::json::serialize(arr);
}

// ============================================
// SINGLETON
// ============================================
HabitService& HabitService::getInstance() {
    static HabitService instance;
    return instance;
}

// ============================================
// CACHE HELPERS
// ============================================
void HabitService::cacheWithTracking(const std::string& key, const std::string& value,
                                     const std::string& setKey, int ttl) {
    auto& redis = redis::RedisClient::getInstance();
    if (!redis.isConnected()) return;
    
    if (redis.set(key, value, ttl)) {
        redis.sadd(setKey, key);
        redis.expire(setKey, ttl * 2);
    }
}

void HabitService::invalidateBySet(const std::string& setKey, const std::string& pattern) {
    auto& redis = redis::RedisClient::getInstance();
    if (!redis.isConnected()) return;
    
    if (!pattern.empty()) {
        redis.delByPattern(pattern);
    }
    auto members = redis.smembers(setKey);
    for (const auto& key : members) {
        if (!redis.exists(key)) redis.srem(setKey, key);
    }
}

// ============================================
// CRUD HABITS
// ============================================
std::vector<Habit> HabitService::getHabitsByUser(const std::string& userId) {
    auto& redis = redis::RedisClient::getInstance();
    std::string cacheKey = RedisKeys::HABITS_USER_PREFIX + userId;
    
    if (redis.isConnected()) {
        auto cached = redis.get(cacheKey);
        if (cached) {
            std::cout << "[Redis] Cache HIT: habits for " << userId << std::endl;
            return jsonToHabits(*cached);
        }
    }
    
    std::vector<Habit> habits;
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "SELECT * FROM habits WHERE user_id = $1::uuid ORDER BY created_at DESC", userId);
        txn.commit();
        
        for (const auto& row : result) habits.push_back(rowToHabit(row));
        
        if (redis.isConnected()) {
            cacheWithTracking(cacheKey, habitsToJson(habits), CacheSets::HABITS_USER, RedisKeys::CACHE_TTL);
        }
    } catch (const std::exception& e) {
        std::cerr << "Error getting habits: " << e.what() << std::endl;
    }
    return habits;
}

std::optional<Habit> HabitService::getHabitById(const std::string& id, const std::string& userId) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "SELECT * FROM habits WHERE id = $1::uuid AND user_id = $2::uuid", id, userId);
        txn.commit();
        if (!result.empty()) return rowToHabit(result[0]);
        return std::nullopt;
    } catch (const std::exception& e) {
        std::cerr << "Error getting habit: " << e.what() << std::endl;
        return std::nullopt;
    }
}

std::optional<Habit> HabitService::createHabit(const Habit& habit) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "INSERT INTO habits (user_id, name, is_active, current_streak, best_streak, checks) "
            "VALUES ($1::uuid,$2,$3,$4,$5,'[]'::jsonb) RETURNING id, created_at, updated_at",
            habit.userId, habit.name, habit.isActive, habit.currentStreak, habit.bestStreak);
        txn.commit();
        
        if (!result.empty()) {
            Habit h = habit;
            h.id = result[0]["id"].as<std::string>();
            h.createdAt = result[0]["created_at"].as<std::string>();
            h.updatedAt = result[0]["updated_at"].as<std::string>();
            invalidateCache(habit.userId);
            return h;
        }
        return std::nullopt;
    } catch (const std::exception& e) {
        std::cerr << "Error creating habit: " << e.what() << std::endl;
        return std::nullopt;
    }
}

bool HabitService::updateHabit(const std::string& id, const std::string& userId, const boost::json::object& updates) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        std::vector<std::string> setClauses;
        std::vector<std::string> paramValues;
        
        // ✅ Usar parámetros posicionales en lugar de txn.quote()
        if (updates.contains("name")) {
            setClauses.push_back("name = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(std::string(updates.at("name").as_string()));
        }
        if (updates.contains("isActive")) {
            setClauses.push_back("is_active = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(updates.at("isActive").as_bool() ? "true" : "false");
        }
        if (updates.contains("currentStreak")) {
            setClauses.push_back("current_streak = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(std::to_string(updates.at("currentStreak").as_int64()));
        }
        if (updates.contains("bestStreak")) {
            setClauses.push_back("best_streak = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(std::to_string(updates.at("bestStreak").as_int64()));
        }
        
        if (setClauses.empty()) return false;
        
        std::string query = "UPDATE habits SET ";
        for (size_t i = 0; i < setClauses.size(); ++i) {
            if (i > 0) query += ", ";
            query += setClauses[i];
        }
        query += ", updated_at = CURRENT_TIMESTAMP WHERE id = $" + 
                 std::to_string(paramValues.size() + 1) + "::uuid AND user_id = $" + 
                 std::to_string(paramValues.size() + 2) + "::uuid";
        
        paramValues.push_back(id);
        paramValues.push_back(userId);
        
        pqxx::result result;
        switch (paramValues.size()) {
            case 2: result = txn.exec_params(query, paramValues[0], paramValues[1]); break;
            case 3: result = txn.exec_params(query, paramValues[0], paramValues[1], paramValues[2]); break;
            case 4: result = txn.exec_params(query, paramValues[0], paramValues[1], paramValues[2], paramValues[3]); break;
            case 5: result = txn.exec_params(query, paramValues[0], paramValues[1], paramValues[2], paramValues[3], paramValues[4]); break;
            case 6: result = txn.exec_params(query, paramValues[0], paramValues[1], paramValues[2], paramValues[3], paramValues[4], paramValues[5]); break;
            default: return false;
        }
        
        txn.commit();
        
        if (result.affected_rows() > 0) {
            invalidateCache(userId);
            return true;
        }
        return false;
    } catch (const std::exception& e) {
        std::cerr << "Error updating habit: " << e.what() << std::endl;
        return false;
    }
}

bool HabitService::deleteHabit(const std::string& id, const std::string& userId) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        auto result = txn.exec_params(
            "DELETE FROM habits WHERE id = $1::uuid AND user_id = $2::uuid", id, userId);
        txn.commit();
        if (result.affected_rows() > 0) {
            invalidateCache(userId);
            return true;
        }
        return false;
    } catch (const std::exception& e) {
        std::cerr << "Error deleting habit: " << e.what() << std::endl;
        return false;
    }
}

// ============================================
// CHECKS (JSONB)
// ============================================
std::vector<HabitCheck> HabitService::getChecks(const std::string& habitId, const std::string& userId) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        auto result = txn.exec_params("SELECT checks FROM habits WHERE id = $1::uuid AND user_id = $2::uuid", habitId, userId);
        txn.commit();
        if (!result.empty()) {
            return parseChecks(result[0]["checks"].as<std::string>());
        }
    } catch (const std::exception& e) {
        std::cerr << "Error getting checks: " << e.what() << std::endl;
    }
    return {};
}

bool HabitService::addCheck(const std::string& habitId, const std::string& userId, const HabitCheck& check) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);

        // Obtener checks actuales
        auto result = txn.exec_params("SELECT checks FROM habits WHERE id = $1::uuid AND user_id = $2::uuid", habitId, userId);
        if (result.empty()) {
            txn.commit();
            return false;
        }

        auto checks = parseChecks(result[0]["checks"].as<std::string>());

        // Buscar si ya existe un check para esa fecha
        auto it = std::find_if(checks.begin(), checks.end(),
            [&](const HabitCheck& c) { return c.checkDate == check.checkDate; });

        if (it != checks.end()) {
            // Actualizar existente
            it->completed = check.completed;
            it->note = check.note;
        } else {
            // Agregar nuevo
            checks.push_back(check);
        }

        // Actualizar JSONB y streak
        int currentStreak = calculateStreakFromChecks(checks);

        // bestStreak: look at the longest streak in the ENTIRE history,
        // not just the recent one (calculateStreakFromChecks only counts
        // chains ending today/yesterday).
        auto streakResult = txn.exec_params("SELECT best_streak FROM habits WHERE id = $1::uuid AND user_id = $2::uuid", habitId, userId);
        int bestStreak = streakResult.empty() ? 0 : streakResult[0]["best_streak"].as<int>();
        int allTimeBest = calculateAllTimeBestStreak(checks);
        if (allTimeBest > bestStreak) bestStreak = allTimeBest;
        if (currentStreak > bestStreak) bestStreak = currentStreak;

        txn.exec_params(
            "UPDATE habits SET checks = $1::jsonb, current_streak = $2, best_streak = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4::uuid",
            checksToJsonb(checks), currentStreak, bestStreak, habitId);
        txn.commit();

        // Invalidate the Redis cache so the next GET /habits returns fresh streaks
        invalidateCache(userId);
        return true;
    } catch (const std::exception& e) {
        std::cerr << "Error adding check: " << e.what() << std::endl;
        return false;
    }
}

bool HabitService::deleteCheck(const std::string& habitId, const std::string& userId, const std::string& checkDate) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);

        auto result = txn.exec_params("SELECT checks FROM habits WHERE id = $1::uuid AND user_id = $2::uuid", habitId, userId);
        if (result.empty()) {
            txn.commit();
            return false;
        }

        auto checks = parseChecks(result[0]["checks"].as<std::string>());
        checks.erase(std::remove_if(checks.begin(), checks.end(),
            [&](const HabitCheck& c) { return c.checkDate == checkDate; }), checks.end());

        // Recalculate streaks after removing the check
        int currentStreak = calculateStreakFromChecks(checks);
        int allTimeBest = calculateAllTimeBestStreak(checks);

        txn.exec_params(
            "UPDATE habits SET checks = $1::jsonb, current_streak = $2, best_streak = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4::uuid",
            checksToJsonb(checks), currentStreak, allTimeBest, habitId);
        txn.commit();

        invalidateCache(userId);
        return true;
    } catch (const std::exception& e) {
        std::cerr << "Error deleting check: " << e.what() << std::endl;
        return false;
    }
}

int HabitService::calculateStreak(const std::string& habitId, const std::string& userId) {
    auto checks = getChecks(habitId, userId);
    return calculateStreakFromChecks(checks);
}

int HabitService::calculateStreakFromChecks(const std::vector<HabitCheck>& checks) {
    if (checks.empty()) return 0;
    
    // Filtrar solo completados y ordenar por fecha descendente
    std::vector<HabitCheck> completed;
    for (const auto& c : checks) {
        if (c.completed) completed.push_back(c);
    }
    if (completed.empty()) return 0;
    
    std::sort(completed.begin(), completed.end(), 
        [](const HabitCheck& a, const HabitCheck& b) { return a.checkDate > b.checkDate; });
    
    // Verificar si el más reciente es hoy o ayer
    time_t now = time(nullptr);
    char todayStr[11]; 
    strftime(todayStr, sizeof(todayStr), "%Y-%m-%d", localtime(&now));
    time_t yesterday = now - 86400;
    char yesterdayStr[11]; 
    strftime(yesterdayStr, sizeof(yesterdayStr), "%Y-%m-%d", localtime(&yesterday));
    
    std::string today(todayStr), yest(yesterdayStr);
    if (completed[0].checkDate != today && completed[0].checkDate != yest) return 0;
    
    // Contar streak
    int streak = 0;
    for (size_t i = 0; i < completed.size(); ++i) {
        if (i == 0) { streak++; continue; }
        // Verificar que sea consecutivo con el anterior
        struct tm tm1 = {}, tm2 = {};
        strptime(completed[i-1].checkDate.c_str(), "%Y-%m-%d", &tm1);
        strptime(completed[i].checkDate.c_str(), "%Y-%m-%d", &tm2);
        time_t t1 = mktime(&tm1), t2 = mktime(&tm2);
        if (difftime(t1, t2) <= 86400) streak++;
        else break;
    }
    return streak;
}

int HabitService::calculateAllTimeBestStreak(const std::vector<HabitCheck>& checks) {
    if (checks.empty()) return 0;

    // Collect only completed checks, sort by date ascending
    std::vector<HabitCheck> completed;
    for (const auto& c : checks) {
        if (c.completed) completed.push_back(c);
    }
    if (completed.empty()) return 0;

    std::sort(completed.begin(), completed.end(),
        [](const HabitCheck& a, const HabitCheck& b) { return a.checkDate < b.checkDate; });

    // Walk through the sorted list and find the longest consecutive run
    int best = 1;
    int current = 1;
    for (size_t i = 1; i < completed.size(); ++i) {
        // Check if this date is exactly one day after the previous one
        struct tm tm1 = {}, tm2 = {};
        strptime(completed[i - 1].checkDate.c_str(), "%Y-%m-%d", &tm1);
        strptime(completed[i].checkDate.c_str(), "%Y-%m-%d", &tm2);
        time_t t1 = mktime(&tm1), t2 = mktime(&tm2);
        double diffSeconds = difftime(t2, t1);
        if (diffSeconds > 0 && diffSeconds <= 86400) {
            current++;
            if (current > best) best = current;
        } else {
            current = 1;
        }
    }
    return best;
}

// ============================================
// CACHE
// ============================================
void HabitService::invalidateCache(const std::string& userId) {
    auto& redis = redis::RedisClient::getInstance();
    if (!redis.isConnected()) return;
    
    std::string cacheKey = RedisKeys::HABITS_USER_PREFIX + userId;
    redis.del(cacheKey);
    redis.srem(CacheSets::HABITS_USER, cacheKey);
    
    std::cout << "[Redis] Invalidated habits cache for: " << userId << std::endl;
}

// ============================================
// ROW MAPPER
// ============================================
Habit HabitService::rowToHabit(const pqxx::row& row) {
    Habit h;
    try { h.id = row["id"].is_null() ? "" : row["id"].as<std::string>(); } catch (...) { h.id = ""; }
    try { h.userId = row["user_id"].is_null() ? "" : row["user_id"].as<std::string>(); } catch (...) { h.userId = ""; }
    try { h.name = row["name"].is_null() ? "" : row["name"].as<std::string>(); } catch (...) { h.name = ""; }
    try { h.isActive = row["is_active"].is_null() ? true : row["is_active"].as<bool>(); } catch (...) { h.isActive = true; }
    try { h.currentStreak = row["current_streak"].is_null() ? 0 : row["current_streak"].as<int>(); } catch (...) { h.currentStreak = 0; }
    try { h.bestStreak = row["best_streak"].is_null() ? 0 : row["best_streak"].as<int>(); } catch (...) { h.bestStreak = 0; }
    try { h.createdAt = row["created_at"].is_null() ? "" : row["created_at"].as<std::string>(); } catch (...) { h.createdAt = ""; }
    try { h.updatedAt = row["updated_at"].is_null() ? "" : row["updated_at"].as<std::string>(); } catch (...) { h.updatedAt = ""; }
    return h;
}