#include "habit_service.hpp"
#include "database.hpp"
#include "redis_client.hpp"
#include <pqxx/pqxx>
#include <iostream>
#include <boost/json.hpp>
#include <algorithm>

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
// CRUD HABITS
// ============================================
std::vector<Habit> HabitService::getHabitsByUser(const std::string& userId) {
    auto& redis = redis::RedisClient::getInstance();
    std::string cacheKey = "habits:user:" + userId;
    
    if (redis.isConnected()) {
        auto cached = redis.get(cacheKey);
        if (cached) {
            std::cout << "[Redis] Cache HIT: habits for " << userId << std::endl;
            return jsonToHabits(*cached);
        }
    }
    
    std::vector<Habit> habits;
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "SELECT * FROM habits WHERE user_id = $1 ORDER BY created_at DESC", userId);
        txn.commit();
        
        for (const auto& row : result) habits.push_back(rowToHabit(row));
        
        if (redis.isConnected()) {
            redis.set(cacheKey, habitsToJson(habits), 300);
        }
    } catch (const std::exception& e) {
        std::cerr << "Error getting habits: " << e.what() << std::endl;
    }
    return habits;
}

std::optional<Habit> HabitService::getHabitById(const std::string& id, const std::string& userId) {
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "SELECT * FROM habits WHERE id = $1 AND user_id = $2", id, userId);
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
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "INSERT INTO habits (user_id, name, is_active, current_streak, best_streak, checks) "
            "VALUES ($1,$2,$3,$4,$5,'[]'::jsonb) RETURNING id, created_at, updated_at",
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
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        
        std::string query = "UPDATE habits SET ";
        std::vector<std::string> parts;
        auto quote = [&](const std::string& s) { return txn.quote(s); };
        
        if (updates.contains("name")) parts.push_back("name = " + quote(std::string(updates.at("name").as_string())));
        if (updates.contains("isActive")) parts.push_back("is_active = " + std::string(updates.at("isActive").as_bool() ? "true" : "false"));
        if (updates.contains("currentStreak")) parts.push_back("current_streak = " + std::to_string(updates.at("currentStreak").as_int64()));
        if (updates.contains("bestStreak")) parts.push_back("best_streak = " + std::to_string(updates.at("bestStreak").as_int64()));
        
        if (parts.empty()) return false;
        
        for (size_t i = 0; i < parts.size(); ++i) { if (i > 0) query += ", "; query += parts[i]; }
        query += ", updated_at = CURRENT_TIMESTAMP WHERE id = " + quote(id) + " AND user_id = " + quote(userId);
        
        pqxx::result result = txn.exec(query);
        txn.commit();
        
        if (result.affected_rows() > 0) { invalidateCache(userId); return true; }
        return false;
    } catch (const std::exception& e) {
        std::cerr << "Error updating habit: " << e.what() << std::endl;
        return false;
    }
}

bool HabitService::deleteHabit(const std::string& id, const std::string& userId) {
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        auto result = txn.exec_params("DELETE FROM habits WHERE id = $1 AND user_id = $2", id, userId);
        txn.commit();
        if (result.affected_rows() > 0) { invalidateCache(userId); return true; }
        return false;
    } catch (const std::exception& e) { return false; }
}

// ============================================
// CHECKS (JSONB)
// ============================================
std::vector<HabitCheck> HabitService::getChecks(const std::string& habitId) {
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        auto result = txn.exec_params("SELECT checks FROM habits WHERE id = $1", habitId);
        txn.commit();
        if (!result.empty()) {
            return parseChecks(result[0]["checks"].as<std::string>());
        }
    } catch (const std::exception& e) {
        std::cerr << "Error getting checks: " << e.what() << std::endl;
    }
    return {};
}

bool HabitService::addCheck(const std::string& habitId, const HabitCheck& check) {
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        
        // Obtener checks actuales
        auto result = txn.exec_params("SELECT checks FROM habits WHERE id = $1", habitId);
        if (result.empty()) return false;
        
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
        int newStreak = calculateStreakFromChecks(checks);
        int bestStreak = 0;
        
        auto streakResult = txn.exec_params("SELECT best_streak FROM habits WHERE id = $1", habitId);
        if (!streakResult.empty()) bestStreak = streakResult[0]["best_streak"].as<int>();
        if (newStreak > bestStreak) bestStreak = newStreak;
        
        txn.exec_params(
            "UPDATE habits SET checks = $1::jsonb, current_streak = $2, best_streak = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4",
            checksToJsonb(checks), newStreak, bestStreak, habitId);
        txn.commit();
        return true;
    } catch (const std::exception& e) {
        std::cerr << "Error adding check: " << e.what() << std::endl;
        return false;
    }
}

bool HabitService::deleteCheck(const std::string& habitId, const std::string& checkDate) {
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        
        auto result = txn.exec_params("SELECT checks FROM habits WHERE id = $1", habitId);
        if (result.empty()) return false;
        
        auto checks = parseChecks(result[0]["checks"].as<std::string>());
        checks.erase(std::remove_if(checks.begin(), checks.end(),
            [&](const HabitCheck& c) { return c.checkDate == checkDate; }), checks.end());
        
        txn.exec_params("UPDATE habits SET checks = $1::jsonb, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
            checksToJsonb(checks), habitId);
        txn.commit();
        return true;
    } catch (const std::exception& e) { return false; }
}

int HabitService::calculateStreak(const std::string& habitId) {
    auto checks = getChecks(habitId);
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
    char todayStr[11]; strftime(todayStr, sizeof(todayStr), "%Y-%m-%d", localtime(&now));
    time_t yesterday = now - 86400;
    char yesterdayStr[11]; strftime(yesterdayStr, sizeof(yesterdayStr), "%Y-%m-%d", localtime(&yesterday));
    
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

void HabitService::invalidateCache(const std::string& userId) {
    auto& redis = redis::RedisClient::getInstance();
    if (redis.isConnected()) {
        redis.del("habits:user:" + userId);
    }
}

// ============================================
// ROW MAPPER
// ============================================
Habit HabitService::rowToHabit(const pqxx::row& row) {
    Habit h;
    h.id = row["id"].as<std::string>();
    h.userId = row["user_id"].as<std::string>();
    h.name = row["name"].as<std::string>();
    h.isActive = row["is_active"].as<bool>();
    h.currentStreak = row["current_streak"].as<int>();
    h.bestStreak = row["best_streak"].as<int>();
    h.createdAt = row["created_at"].as<std::string>();
    h.updatedAt = row["updated_at"].as<std::string>();
    return h;
}