#pragma once

#include <string>
#include <vector>
#include <optional>
#include <boost/json.hpp>
#include <pqxx/pqxx>
#include <shared_mutex>

struct SimulationTransaction {
    std::string id;
    std::string userId;
    double amount;
    std::string categoryId;
    std::string categoryName;
    std::string description;
    std::string startDate;
    std::string endDate;
    double days;
    double weeks;
    double months;
    std::string period;  // 'day', 'week', 'month'
    std::string createdAt;
};

// ============================================
// CONSTANTES DE SETS PARA CACHÉ
// ============================================
namespace CacheSets {
    constexpr const char* SIMULATIONS_USER = "simulations:set:user";
}

class SimulationService {
public:
    static SimulationService& getInstance();
    
    // CRUD
    std::vector<SimulationTransaction> getSimulationsByUser(const std::string& userId);
    std::optional<SimulationTransaction> getSimulationById(const std::string& id, const std::string& userId);
    std::optional<SimulationTransaction> createSimulation(const SimulationTransaction& sim);
    bool updateSimulation(const std::string& id, const std::string& userId, const boost::json::object& updates);
    bool deleteSimulation(const std::string& id, const std::string& userId);
    
    // Cache
    void invalidateCache(const std::string& userId);
    
    // Serialization
    std::string simulationToJson(const SimulationTransaction& s);
    SimulationTransaction jsonToSimulation(const std::string& json);
    std::string simulationsToJson(const std::vector<SimulationTransaction>& simulations);
    std::vector<SimulationTransaction> jsonToSimulations(const std::string& json);
    
private:
    SimulationService() = default;
    SimulationService(const SimulationService&) = delete;
    SimulationService& operator=(const SimulationService&) = delete;
    
    mutable std::shared_mutex cache_mutex_;
    
    SimulationTransaction rowToSimulation(const pqxx::row& row);
    
    // Cache helpers
    void cacheWithTracking(const std::string& key, const std::string& value,
                          const std::string& setKey, int ttl = 300);
    void invalidateBySet(const std::string& setKey, const std::string& pattern = "");
};

// Prefijos Redis con namespace
namespace RedisKeys {
    const std::string SIMULATIONS_USER_PREFIX = "simulations:user:";
    const int CACHE_TTL = 300;
}