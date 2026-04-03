#include "goal_service.hpp"
#include "database.hpp"
#include <mongocxx/collection.hpp>
#include <bsoncxx/builder/stream/document.hpp>
#include <iostream>
#include <ctime>

bsoncxx::document::value Goal::toBson() const {
    using bsoncxx::builder::stream::document;
    using bsoncxx::builder::stream::finalize;
    
    document doc{};
    if (!id.empty()) {
        try {
            doc << "_id" << bsoncxx::oid(id);
        } catch (...) {}
    }
    doc << "user_id" << user_id
        << "title" << title
        << "description" << description
        << "target_amount" << target_amount
        << "current_amount" << current_amount
        << "created_at" << created_at;
    
    return doc << finalize;
}

Goal Goal::fromBson(const bsoncxx::document::view& doc) {
    Goal goal;
    
    auto id_elem = doc["_id"];
    if (id_elem && id_elem.type() == bsoncxx::type::k_oid) {
        goal.id = id_elem.get_oid().value.to_string();
    }
    
    auto user_elem = doc["user_id"];
    if (user_elem && user_elem.type() == bsoncxx::type::k_string) {
        goal.user_id = user_elem.get_string().value.to_string();
    }
    
    auto title_elem = doc["title"];
    if (title_elem && title_elem.type() == bsoncxx::type::k_string) {
        goal.title = title_elem.get_string().value.to_string();
    }
    
    auto desc_elem = doc["description"];
    if (desc_elem && desc_elem.type() == bsoncxx::type::k_string) {
        goal.description = desc_elem.get_string().value.to_string();
    }
    
    auto target_elem = doc["target_amount"];
    if (target_elem && target_elem.type() == bsoncxx::type::k_double) {
        goal.target_amount = target_elem.get_double();
    }
    
    auto current_elem = doc["current_amount"];
    if (current_elem && current_elem.type() == bsoncxx::type::k_double) {
        goal.current_amount = current_elem.get_double();
    }
    
    auto created_elem = doc["created_at"];
    if (created_elem && created_elem.type() == bsoncxx::type::k_string) {
        goal.created_at = created_elem.get_string().value.to_string();
    }
    
    return goal;
}

GoalService& GoalService::getInstance() {
    static GoalService instance;
    return instance;
}

std::optional<bsoncxx::oid> GoalService::parseObjectId(const std::string& id) {
    try {
        return bsoncxx::oid(id);
    } catch (...) {
        return std::nullopt;
    }
}

bool GoalService::createGoal(const Goal& goal, std::string& goal_id) {
    try {
        auto collection = Database::getInstance().getCollection("goals");
        auto doc = goal.toBson();
        auto result = collection.insert_one(doc.view());
        
        if (result) {
            auto inserted_id = result->inserted_id();
            if (inserted_id.type() == bsoncxx::type::k_oid) {
                goal_id = inserted_id.get_oid().value.to_string();
                return true;
            }
        }
        return false;
    } catch (const std::exception& e) {
        std::cerr << "Error creating goal: " << e.what() << std::endl;
        return false;
    }
}

std::optional<Goal> GoalService::getGoal(const std::string& id) {
    try {
        auto oid_opt = parseObjectId(id);
        if (!oid_opt) return std::nullopt;
        
        auto collection = Database::getInstance().getCollection("goals");
        auto filter = bsoncxx::builder::stream::document{} 
            << "_id" << *oid_opt 
            << bsoncxx::builder::stream::finalize;
        
        auto result = collection.find_one(filter.view());
        if (result) {
            return Goal::fromBson(result->view());
        }
        return std::nullopt;
    } catch (const std::exception& e) {
        std::cerr << "Error getting goal: " << e.what() << std::endl;
        return std::nullopt;
    }
}

std::vector<Goal> GoalService::getGoalsByUser(const std::string& user_id) {
    std::vector<Goal> goals;
    try {
        auto collection = Database::getInstance().getCollection("goals");
        auto filter = bsoncxx::builder::stream::document{} 
            << "user_id" << user_id 
            << bsoncxx::builder::stream::finalize;
        
        auto cursor = collection.find(filter.view());
        
        for (auto&& doc : cursor) {
            goals.push_back(Goal::fromBson(doc));
        }
    } catch (const std::exception& e) {
        std::cerr << "Error getting goals by user: " << e.what() << std::endl;
    }
    return goals;
}

bool GoalService::updateGoal(const std::string& id, const std::string& title, 
                              const std::string& description, double target_amount) {
    try {
        auto oid_opt = parseObjectId(id);
        if (!oid_opt) return false;
        
        auto collection = Database::getInstance().getCollection("goals");
        auto filter = bsoncxx::builder::stream::document{} 
            << "_id" << *oid_opt 
            << bsoncxx::builder::stream::finalize;
        
        auto update = bsoncxx::builder::stream::document{} 
            << "$set" << bsoncxx::builder::stream::open_document
            << "title" << title
            << "description" << description
            << "target_amount" << target_amount
            << bsoncxx::builder::stream::close_document
            << bsoncxx::builder::stream::finalize;
        
        auto result = collection.update_one(filter.view(), update.view());
        return result && result->modified_count() > 0;
    } catch (const std::exception& e) {
        std::cerr << "Error updating goal: " << e.what() << std::endl;
        return false;
    }
}

bool GoalService::addAmount(const std::string& id, double amount) {
    try {
        auto oid_opt = parseObjectId(id);
        if (!oid_opt) return false;
        
        auto collection = Database::getInstance().getCollection("goals");
        auto filter = bsoncxx::builder::stream::document{} 
            << "_id" << *oid_opt 
            << bsoncxx::builder::stream::finalize;
        
        auto update = bsoncxx::builder::stream::document{} 
            << "$inc" << bsoncxx::builder::stream::open_document
            << "current_amount" << amount
            << bsoncxx::builder::stream::close_document
            << bsoncxx::builder::stream::finalize;
        
        auto result = collection.update_one(filter.view(), update.view());
        return result && result->modified_count() > 0;
    } catch (const std::exception& e) {
        std::cerr << "Error adding amount: " << e.what() << std::endl;
        return false;
    }
}

bool GoalService::deleteGoal(const std::string& id) {
    try {
        auto oid_opt = parseObjectId(id);
        if (!oid_opt) return false;
        
        auto collection = Database::getInstance().getCollection("goals");
        auto filter = bsoncxx::builder::stream::document{} 
            << "_id" << *oid_opt 
            << bsoncxx::builder::stream::finalize;
        
        auto result = collection.delete_one(filter.view());
        return result && result->deleted_count() > 0;
    } catch (const std::exception& e) {
        std::cerr << "Error deleting goal: " << e.what() << std::endl;
        return false;
    }
}

double GoalService::getProgressPercentage(const std::string& id) {
    auto goal = getGoal(id);
    if (!goal || goal->target_amount <= 0) return 0.0;
    return (goal->current_amount / goal->target_amount) * 100.0;
}