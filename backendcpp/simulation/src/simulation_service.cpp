#include "simulation_service.hpp"
#include "database.hpp"
#include "redis_client.hpp"
#include <pqxx/pqxx>
#include <iostream>
#include <boost/json.hpp>

// ============================================
// SERIALIZACIÓN
// ============================================
std::string SimulationService::simulationToJson(const SimulationTransaction& s) {
    boost::json::object obj;
    obj["id"] = s.id;
    obj["userId"] = s.userId;
    obj["amount"] = s.amount;
    obj["categoryId"] = s.categoryId;
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
    s.categoryId = boost::json::value_to<std::string>(obj.at("categoryId"));
    s.categoryName = obj.at("categoryName").is_null() ? "" : boost::json::value_to<std::string>(obj.at("categoryName"));
    s.description = obj.at("description").is_null() ? "" : boost::json::value_to<std::string>(obj.at("description"));
    s.startDate = boost::json::value_to<std::string>(obj.at("startDate"));
    s.endDate = boost::json::value_to<std::string>(obj.at("endDate"));
    s.days = obj.at("days").as_int64();
    s.weeks = obj.at("weeks").as_int64();
    s.months = obj.at("months").as_int64();
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
// CRUD
// ============================================
std::vector<SimulationTransaction> SimulationService::getSimulationsByUser(const std::string& userId) {
    auto& redis = redis::RedisClient::getInstance();
    std::string cacheKey = "simulations:user:" + userId;
    
    if (redis.isConnected()) {
        auto cached = redis.get(cacheKey);
        if (cached) {
            std::cout << "[Redis] Cache HIT: simulations for " << userId << std::endl;
            return jsonToSimulations(*cached);
        }
    }
    
    std::vector<SimulationTransaction> simulations;
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "SELECT s.*, c.name as category_name FROM simulation_transactions s "
            "LEFT JOIN categories c ON s.category_id = c.id "
            "WHERE s.user_id = $1 ORDER BY s.created_at DESC", userId);
        txn.commit();
        
        for (const auto& row : result) {
            SimulationTransaction sim = rowToSimulation(row);
            if (!row["category_name"].is_null()) {
                sim.categoryName = row["category_name"].as<std::string>();
            }
            simulations.push_back(sim);
        }
        
        if (redis.isConnected()) {
            redis.set(cacheKey, simulationsToJson(simulations), 300);
        }
    } catch (const std::exception& e) {
        std::cerr << "Error getting simulations: " << e.what() << std::endl;
    }
    return simulations;
}

std::optional<SimulationTransaction> SimulationService::getSimulationById(const std::string& id, const std::string& userId) {
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "SELECT s.*, c.name as category_name FROM simulation_transactions s "
            "LEFT JOIN categories c ON s.category_id = c.id "
            "WHERE s.id = $1 AND s.user_id = $2", id, userId);
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
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        pqxx::result result = txn.exec_params(
            "INSERT INTO simulation_transactions (user_id, amount, category_id, description, "
            "start_date, end_date, days, weeks, months, period) "
            "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, created_at",
            sim.userId, sim.amount, sim.categoryId, sim.description,
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

bool SimulationService::updateSimulation(const std::string& id, const std::string& userId, const boost::json::object& updates) {
    try {
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        
        auto toDouble = [](const boost::json::value& v) -> double {
            if (v.is_int64()) return static_cast<double>(v.as_int64());
            if (v.is_double()) return v.as_double();
            return v.to_number<double>();
        };
        
        std::string query = "UPDATE simulation_transactions SET ";
        std::vector<std::string> parts;
        auto quote = [&](const std::string& s) { return txn.quote(s); };
        
        if (updates.contains("amount")) parts.push_back("amount = " + std::to_string(toDouble(updates.at("amount"))));
        if (updates.contains("categoryId")) parts.push_back("category_id = " + quote(std::string(updates.at("categoryId").as_string())));
        if (updates.contains("description")) parts.push_back("description = " + quote(std::string(updates.at("description").as_string())));
        if (updates.contains("startDate")) parts.push_back("start_date = " + quote(std::string(updates.at("startDate").as_string())) + "::date");
        if (updates.contains("endDate")) parts.push_back("end_date = " + quote(std::string(updates.at("endDate").as_string())) + "::date");
        
        // Usar toDouble para days, weeks, months
        if (updates.contains("days")) parts.push_back("days = " + std::to_string(toDouble(updates.at("days"))));
        if (updates.contains("weeks")) parts.push_back("weeks = " + std::to_string(toDouble(updates.at("weeks"))));
        if (updates.contains("months")) parts.push_back("months = " + std::to_string(toDouble(updates.at("months"))));
        
        if (updates.contains("period")) parts.push_back("period = " + quote(std::string(updates.at("period").as_string())));
        
        if (parts.empty()) return false;
        
        for (size_t i = 0; i < parts.size(); ++i) { if (i > 0) query += ", "; query += parts[i]; }
        query += " WHERE id = " + quote(id) + " AND user_id = " + quote(userId);
        
        pqxx::result result = txn.exec(query);
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
        auto& conn = Database::getInstance().getConnection();
        pqxx::work txn(conn);
        auto result = txn.exec_params("DELETE FROM simulation_transactions WHERE id = $1 AND user_id = $2", id, userId);
        txn.commit();
        if (result.affected_rows() > 0) {
            invalidateCache(userId);
            return true;
        }
        return false;
    } catch (const std::exception& e) { return false; }
}

// ============================================
// CACHE
// ============================================
void SimulationService::invalidateCache(const std::string& userId) {
    auto& redis = redis::RedisClient::getInstance();
    if (redis.isConnected()) {
        redis.del("simulations:user:" + userId);
        std::cout << "[Redis] Invalidated simulations cache for: " << userId << std::endl;
    }
}

// ============================================
// ROW MAPPER
// ============================================
SimulationTransaction SimulationService::rowToSimulation(const pqxx::row& row) {
    SimulationTransaction s;
    s.id = row["id"].as<std::string>();
    s.userId = row["user_id"].as<std::string>();
    s.amount = row["amount"].as<double>();
    s.categoryId = row["category_id"].is_null() ? "" : row["category_id"].as<std::string>();
    s.description = row["description"].is_null() ? "" : row["description"].as<std::string>();
    s.startDate = row["start_date"].as<std::string>();
    s.endDate = row["end_date"].as<std::string>();
    s.days = row["days"].as<double>();
    s.weeks = row["weeks"].as<double>();
    s.months = row["months"].as<double>();
    s.period = row["period"].as<std::string>();
    s.createdAt = row["created_at"].as<std::string>();
    return s;
}