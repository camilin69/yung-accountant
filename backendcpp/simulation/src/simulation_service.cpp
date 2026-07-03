#include "simulation_service.hpp"
#include "database.hpp"
#include "redis_client.hpp"
#include <pqxx/pqxx>
#include <iostream>
#include <boost/json.hpp>

// ============================================
// POOL CONNECTION
// ============================================

// ============================================
// SERIALIZACIÓN
// ============================================
std::string SimulationService::simulationToJson(const SimulationTransaction& s) {
    boost::json::object obj;
    obj["id"] = s.id;
    obj["userId"] = s.userId;
    obj["amount"] = s.amount;
    obj["categoryId"] = s.categoryId.empty() ? nullptr : boost::json::value(s.categoryId);
    obj["categoryName"] = s.categoryName.empty() ? nullptr : boost::json::value(s.categoryName);
    obj["description"] = s.description.empty() ? nullptr : boost::json::value(s.description);
    obj["startDate"] = s.startDate;
    obj["endDate"] = s.endDate;
    obj["days"] = s.days;
    obj["weeks"] = s.weeks;
    obj["months"] = s.months;
    obj["period"] = s.period;
    obj["createdAt"] = s.createdAt;
    return boost::json::serialize(obj);
}

SimulationTransaction SimulationService::jsonToSimulation(const std::string& json) {
    auto jv = boost::json::parse(json);
    auto& obj = jv.as_object();
    SimulationTransaction s;
    s.id = boost::json::value_to<std::string>(obj.at("id"));
    s.userId = boost::json::value_to<std::string>(obj.at("userId"));
    s.amount = obj.at("amount").as_double();
    s.categoryId = obj.at("categoryId").is_null() ? "" : boost::json::value_to<std::string>(obj.at("categoryId"));
    s.categoryName = obj.at("categoryName").is_null() ? "" : boost::json::value_to<std::string>(obj.at("categoryName"));
    s.description = obj.at("description").is_null() ? "" : boost::json::value_to<std::string>(obj.at("description"));
    s.startDate = boost::json::value_to<std::string>(obj.at("startDate"));
    s.endDate = boost::json::value_to<std::string>(obj.at("endDate"));
    s.days = obj.at("days").as_double();
    s.weeks = obj.at("weeks").as_double();
    s.months = obj.at("months").as_double();
    s.period = boost::json::value_to<std::string>(obj.at("period"));
    s.createdAt = boost::json::value_to<std::string>(obj.at("createdAt"));
    return s;
}

std::string SimulationService::simulationsToJson(const std::vector<SimulationTransaction>& simulations) {
    boost::json::array arr;
    for (const auto& s : simulations) arr.push_back(boost::json::parse(simulationToJson(s)));
    return boost::json::serialize(arr);
}

std::vector<SimulationTransaction> SimulationService::jsonToSimulations(const std::string& json) {
    std::vector<SimulationTransaction> result;
    auto jv = boost::json::parse(json);
    for (const auto& item : jv.as_array()) result.push_back(jsonToSimulation(boost::json::serialize(item)));
    return result;
}

// ============================================
// SINGLETON
// ============================================
SimulationService& SimulationService::getInstance() {
    static SimulationService instance;
    return instance;
}

// ============================================
// CACHE HELPERS
// ============================================
void SimulationService::cacheWithTracking(const std::string& key, const std::string& value,
                                          const std::string& setKey, int ttl) {
    auto& redis = redis::RedisClient::getInstance();
    if (!redis.isConnected()) return;
    
    if (redis.set(key, value, ttl)) {
        redis.sadd(setKey, key);
        redis.expire(setKey, ttl * 2);
    }
}

void SimulationService::invalidateBySet(const std::string& setKey, const std::string& pattern) {
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
// CRUD
// ============================================
std::vector<SimulationTransaction> SimulationService::getSimulationsByUser(const std::string& userId) {
    auto& redis = redis::RedisClient::getInstance();
    std::string cacheKey = RedisKeys::SIMULATIONS_USER_PREFIX + userId;
    
    if (redis.isConnected()) {
        auto cached = redis.get(cacheKey);
        if (cached) {
            std::cout << "[Redis] Cache HIT: simulations for " << userId << std::endl;
            return jsonToSimulations(*cached);
        }
    }
    
    std::vector<SimulationTransaction> simulations;
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "SELECT s.*, c.name as category_name FROM simulation_transactions s "
            "LEFT JOIN categories c ON s.category_id = c.id "
            "WHERE s.user_id = $1::uuid ORDER BY s.created_at DESC", userId);
        txn.commit();
        
        for (const auto& row : result) {
            SimulationTransaction sim = rowToSimulation(row);
            if (!row["category_name"].is_null()) {
                sim.categoryName = row["category_name"].as<std::string>();
            }
            simulations.push_back(sim);
        }
        
        if (redis.isConnected()) {
            cacheWithTracking(cacheKey, simulationsToJson(simulations), 
                            CacheSets::SIMULATIONS_USER, RedisKeys::CACHE_TTL);
        }
    } catch (const std::exception& e) {
        std::cerr << "Error getting simulations: " << e.what() << std::endl;
    }
    return simulations;
}

std::optional<SimulationTransaction> SimulationService::getSimulationById(
    const std::string& id, const std::string& userId) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "SELECT s.*, c.name as category_name FROM simulation_transactions s "
            "LEFT JOIN categories c ON s.category_id = c.id "
            "WHERE s.id = $1::uuid AND s.user_id = $2::uuid", id, userId);
        txn.commit();
        if (!result.empty()) {
            SimulationTransaction sim = rowToSimulation(result[0]);
            if (!result[0]["category_name"].is_null()) {
                sim.categoryName = result[0]["category_name"].as<std::string>();
            }
            return sim;
        }
        return std::nullopt;
    } catch (const std::exception& e) {
        std::cerr << "Error getting simulation: " << e.what() << std::endl;
        return std::nullopt;
    }
}

std::optional<SimulationTransaction> SimulationService::createSimulation(const SimulationTransaction& sim) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "INSERT INTO simulation_transactions (user_id, amount, category_id, description, "
            "start_date, end_date, days, weeks, months, period) "
            "VALUES ($1::uuid,$2,$3::uuid,$4,$5::date,$6::date,$7,$8,$9,$10) "
            "RETURNING id, created_at",
            sim.userId, sim.amount, 
            sim.categoryId.empty() ? std::optional<std::string>() : std::optional<std::string>(sim.categoryId),
            sim.description.empty() ? std::optional<std::string>() : std::optional<std::string>(sim.description),
            sim.startDate, sim.endDate, sim.days, sim.weeks, sim.months, sim.period);
        txn.commit();
        
        if (!result.empty()) {
            SimulationTransaction s = sim;
            s.id = result[0]["id"].as<std::string>();
            s.createdAt = result[0]["created_at"].as<std::string>();
            invalidateCache(sim.userId);
            return s;
        }
        return std::nullopt;
    } catch (const std::exception& e) {
        std::cerr << "Error creating simulation: " << e.what() << std::endl;
        return std::nullopt;
    }
}

bool SimulationService::updateSimulation(const std::string& id, const std::string& userId, 
                                          const boost::json::object& updates) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        
        std::vector<std::string> setClauses;
        std::vector<std::string> paramValues;
        
        auto toDouble = [](const boost::json::value& v) -> double {
            if (v.is_int64()) return static_cast<double>(v.as_int64());
            if (v.is_double()) return v.as_double();
            return v.to_number<double>();
        };
        
        // ✅ Usar parámetros posicionales en lugar de txn.quote()
        if (updates.contains("amount")) {
            setClauses.push_back("amount = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(std::to_string(toDouble(updates.at("amount"))));
        }
        if (updates.contains("categoryId")) {
            setClauses.push_back("category_id = $" + std::to_string(paramValues.size() + 1) + "::uuid");
            paramValues.push_back(std::string(updates.at("categoryId").as_string()));
        }
        if (updates.contains("description")) {
            setClauses.push_back("description = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(std::string(updates.at("description").as_string()));
        }
        if (updates.contains("startDate")) {
            setClauses.push_back("start_date = $" + std::to_string(paramValues.size() + 1) + "::date");
            paramValues.push_back(std::string(updates.at("startDate").as_string()));
        }
        if (updates.contains("endDate")) {
            setClauses.push_back("end_date = $" + std::to_string(paramValues.size() + 1) + "::date");
            paramValues.push_back(std::string(updates.at("endDate").as_string()));
        }
        if (updates.contains("days")) {
            setClauses.push_back("days = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(std::to_string(toDouble(updates.at("days"))));
        }
        if (updates.contains("weeks")) {
            setClauses.push_back("weeks = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(std::to_string(toDouble(updates.at("weeks"))));
        }
        if (updates.contains("months")) {
            setClauses.push_back("months = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(std::to_string(toDouble(updates.at("months"))));
        }
        if (updates.contains("period")) {
            setClauses.push_back("period = $" + std::to_string(paramValues.size() + 1));
            paramValues.push_back(std::string(updates.at("period").as_string()));
        }
        
        if (setClauses.empty()) return false;
        
        std::string query = "UPDATE simulation_transactions SET ";
        for (size_t i = 0; i < setClauses.size(); ++i) {
            if (i > 0) query += ", ";
            query += setClauses[i];
        }
        query += " WHERE id = $" + std::to_string(paramValues.size() + 1) + 
                 "::uuid AND user_id = $" + std::to_string(paramValues.size() + 2) + "::uuid";
        
        paramValues.push_back(id);
        paramValues.push_back(userId);
        
        pqxx::result result;
        switch (paramValues.size()) {
            case 2: result = txn.exec_params(query, paramValues[0], paramValues[1]); break;
            case 3: result = txn.exec_params(query, paramValues[0], paramValues[1], paramValues[2]); break;
            case 4: result = txn.exec_params(query, paramValues[0], paramValues[1], paramValues[2], paramValues[3]); break;
            case 5: result = txn.exec_params(query, paramValues[0], paramValues[1], paramValues[2], paramValues[3], paramValues[4]); break;
            case 6: result = txn.exec_params(query, paramValues[0], paramValues[1], paramValues[2], paramValues[3], paramValues[4], paramValues[5]); break;
            case 7: result = txn.exec_params(query, paramValues[0], paramValues[1], paramValues[2], paramValues[3], paramValues[4], paramValues[5], paramValues[6]); break;
            case 8: result = txn.exec_params(query, paramValues[0], paramValues[1], paramValues[2], paramValues[3], paramValues[4], paramValues[5], paramValues[6], paramValues[7]); break;
            case 9: result = txn.exec_params(query, paramValues[0], paramValues[1], paramValues[2], paramValues[3], paramValues[4], paramValues[5], paramValues[6], paramValues[7], paramValues[8]); break;
            case 10: result = txn.exec_params(query, paramValues[0], paramValues[1], paramValues[2], paramValues[3], paramValues[4], paramValues[5], paramValues[6], paramValues[7], paramValues[8], paramValues[9]); break;
            case 11: result = txn.exec_params(query, paramValues[0], paramValues[1], paramValues[2], paramValues[3], paramValues[4], paramValues[5], paramValues[6], paramValues[7], paramValues[8], paramValues[9], paramValues[10]); break;
            default: return false;
        }
        
        txn.commit();
        
        if (result.affected_rows() > 0) {
            invalidateCache(userId);
            return true;
        }
        return false;
    } catch (const std::exception& e) {
        std::cerr << "Error updating simulation: " << e.what() << std::endl;
        return false;
    }
}

bool SimulationService::deleteSimulation(const std::string& id, const std::string& userId) {
    try {
        PoolConnection pooled_conn;
        auto& conn = pooled_conn.get();
        pqxx::work txn(conn);
        auto result = txn.exec_params(
            "DELETE FROM simulation_transactions WHERE id = $1::uuid AND user_id = $2::uuid", id, userId);
        txn.commit();
        if (result.affected_rows() > 0) {
            invalidateCache(userId);
            return true;
        }
        return false;
    } catch (const std::exception& e) {
        std::cerr << "Error deleting simulation: " << e.what() << std::endl;
        return false;
    }
}

// ============================================
// CACHE
// ============================================
void SimulationService::invalidateCache(const std::string& userId) {
    auto& redis = redis::RedisClient::getInstance();
    if (!redis.isConnected()) return;
    
    std::string cacheKey = RedisKeys::SIMULATIONS_USER_PREFIX + userId;
    redis.del(cacheKey);
    redis.srem(CacheSets::SIMULATIONS_USER, cacheKey);
    
    std::cout << "[Redis] Invalidated simulations cache for: " << userId << std::endl;
}

// ============================================
// ROW MAPPER
// ============================================
SimulationTransaction SimulationService::rowToSimulation(const pqxx::row& row) {
    SimulationTransaction s;
    try { s.id = row["id"].is_null() ? "" : row["id"].as<std::string>(); } catch (...) { s.id = ""; }
    try { s.userId = row["user_id"].is_null() ? "" : row["user_id"].as<std::string>(); } catch (...) { s.userId = ""; }
    try { s.amount = row["amount"].is_null() ? 0 : row["amount"].as<double>(); } catch (...) { s.amount = 0; }
    try { s.categoryId = row["category_id"].is_null() ? "" : row["category_id"].as<std::string>(); } catch (...) { s.categoryId = ""; }
    try { s.description = row["description"].is_null() ? "" : row["description"].as<std::string>(); } catch (...) { s.description = ""; }
    try { s.startDate = row["start_date"].is_null() ? "" : row["start_date"].as<std::string>(); } catch (...) { s.startDate = ""; }
    try { s.endDate = row["end_date"].is_null() ? "" : row["end_date"].as<std::string>(); } catch (...) { s.endDate = ""; }
    try { s.days = row["days"].is_null() ? 0 : row["days"].as<double>(); } catch (...) { s.days = 0; }
    try { s.weeks = row["weeks"].is_null() ? 0 : row["weeks"].as<double>(); } catch (...) { s.weeks = 0; }
    try { s.months = row["months"].is_null() ? 0 : row["months"].as<double>(); } catch (...) { s.months = 0; }
    try { s.period = row["period"].is_null() ? "" : row["period"].as<std::string>(); } catch (...) { s.period = ""; }
    try { s.createdAt = row["created_at"].is_null() ? "" : row["created_at"].as<std::string>(); } catch (...) { s.createdAt = ""; }
    return s;
}