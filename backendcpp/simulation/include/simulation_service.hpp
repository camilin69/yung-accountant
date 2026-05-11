#pragma once

#include <string>
#include <vector>
#include <optional>
#include <boost/json.hpp>
#include <pqxx/pqxx>

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
    
private:
    SimulationService() = default;
    
    SimulationTransaction rowToSimulation(const pqxx::row& row);
    
    std::string simulationToJson(const SimulationTransaction& s);
    SimulationTransaction jsonToSimulation(const std::string& json);
    std::string simulationsToJson(const std::vector<SimulationTransaction>& simulations);
    std::vector<SimulationTransaction> jsonToSimulations(const std::string& json);
};