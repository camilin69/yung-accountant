#include "goal_service.hpp"
#include "database.hpp"
#include <mongocxx/collection.hpp>
#include <bsoncxx/builder/stream/document.hpp>
#include <iostream>
#include <ctime>

// ============================================
// DAY IMPLEMENTATION
// ============================================

bsoncxx::document::value Day::toBson() const {
    using bsoncxx::builder::stream::document;
    using bsoncxx::builder::stream::finalize;
    
    document doc{};
    if (!id.empty()) {
        try {
            doc << "_id" << bsoncxx::oid(id);
        } catch (...) {}
    }
    doc << "goal_id" << goal_id
        << "date" << date
        << "created_at" << created_at;
    
    return doc << finalize;
}

Day Day::fromBson(const bsoncxx::document::view& doc) {
    Day day;
    
    auto id_elem = doc["_id"];
    if (id_elem && id_elem.type() == bsoncxx::type::k_oid) {
        day.id = id_elem.get_oid().value.to_string();
    }
    
    auto goal_elem = doc["goal_id"];
    if (goal_elem && goal_elem.type() == bsoncxx::type::k_string) {
        day.goal_id = goal_elem.get_string().value.to_string();
    }
    
    auto date_elem = doc["date"];
    if (date_elem && date_elem.type() == bsoncxx::type::k_string) {
        day.date = date_elem.get_string().value.to_string();
    }
    
    auto created_elem = doc["created_at"];
    if (created_elem && created_elem.type() == bsoncxx::type::k_string) {
        day.created_at = created_elem.get_string().value.to_string();
    }
    
    return day;
}

// ============================================
// EVENT IMPLEMENTATION
// ============================================

bsoncxx::document::value Event::toBson() const {
    using bsoncxx::builder::stream::document;
    using bsoncxx::builder::stream::finalize;
    
    document doc{};
    if (!id.empty()) {
        try {
            doc << "_id" << bsoncxx::oid(id);
        } catch (...) {}
    }
    doc << "day_id" << day_id
        << "title" << title
        << "description" << description
        << "amount" << amount
        << "created_at" << created_at;
    
    return doc << finalize;
}

Event Event::fromBson(const bsoncxx::document::view& doc) {
    Event event;
    
    auto id_elem = doc["_id"];
    if (id_elem && id_elem.type() == bsoncxx::type::k_oid) {
        event.id = id_elem.get_oid().value.to_string();
    }
    
    auto day_elem = doc["day_id"];
    if (day_elem && day_elem.type() == bsoncxx::type::k_string) {
        event.day_id = day_elem.get_string().value.to_string();
    }
    
    auto title_elem = doc["title"];
    if (title_elem && title_elem.type() == bsoncxx::type::k_string) {
        event.title = title_elem.get_string().value.to_string();
    }
    
    auto desc_elem = doc["description"];
    if (desc_elem && desc_elem.type() == bsoncxx::type::k_string) {
        event.description = desc_elem.get_string().value.to_string();
    }
    
    auto amount_elem = doc["amount"];
    if (amount_elem && amount_elem.type() == bsoncxx::type::k_double) {
        event.amount = amount_elem.get_double();
    }
    
    auto created_elem = doc["created_at"];
    if (created_elem && created_elem.type() == bsoncxx::type::k_string) {
        event.created_at = created_elem.get_string().value.to_string();
    }
    
    return event;
}

// ============================================
// GOAL IMPLEMENTATION
// ============================================

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

// ============================================
// GOAL SERVICE - INIT
// ============================================

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

// ============================================
// GOAL SERVICE - GOAL METHODS
// ============================================

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

bool GoalService::deleteGoal(const std::string& id) {
    try {
        auto oid_opt = parseObjectId(id);
        if (!oid_opt) return false;
        
        // Cascade delete: eliminar todos los días asociados a esta meta
        deleteDaysByGoal(id);
        
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

double GoalService::calculateGoalProgress(const std::string& goal_id) {
    auto days = getDaysByGoal(goal_id);
    double total = 0.0;
    for (const auto& day : days) {
        // Sumar los totales de cada día (que es la suma de sus eventos)
        total += getDayTotal(day.id);
    }
    
    // Actualizar el current_amount de la meta
    auto goal = getGoal(goal_id);
    if (goal) {
        auto oid_opt = parseObjectId(goal_id);
        if (oid_opt) {
            auto collection = Database::getInstance().getCollection("goals");
            auto filter = bsoncxx::builder::stream::document{} 
                << "_id" << *oid_opt 
                << bsoncxx::builder::stream::finalize;
            
            auto update = bsoncxx::builder::stream::document{} 
                << "$set" << bsoncxx::builder::stream::open_document
                << "current_amount" << total
                << bsoncxx::builder::stream::close_document
                << bsoncxx::builder::stream::finalize;
            
            collection.update_one(filter.view(), update.view());
        }
    }
    
    return total;
}

// ============================================
// GOAL SERVICE - DAY METHODS
// ============================================
bool GoalService::dayExistsForGoal(const std::string& goal_id, const std::string& date) {
    try {
        auto collection = Database::getInstance().getCollection("days");
        auto filter = bsoncxx::builder::stream::document{} 
            << "goal_id" << goal_id
            << "date" << date
            << bsoncxx::builder::stream::finalize;
        
        auto result = collection.find_one(filter.view());
        return static_cast<bool>(result);
    } catch (const std::exception& e) {
        std::cerr << "Error checking day existence: " << e.what() << std::endl;
        return false;
    }
}

double GoalService::getDayTotal(const std::string& day_id) {
    auto events = getEventsByDay(day_id);
    double total = 0.0;
    for (const auto& event : events) {
        total += event.amount;
    }
    return total;
}

bool GoalService::createDay(const Day& day, std::string& day_id) {
    try {
        auto collection = Database::getInstance().getCollection("days");
        auto doc = day.toBson();
        auto result = collection.insert_one(doc.view());
        
        if (result) {
            auto inserted_id = result->inserted_id();
            if (inserted_id.type() == bsoncxx::type::k_oid) {
                day_id = inserted_id.get_oid().value.to_string();
                return true;
            }
        }
        return false;
    } catch (const std::exception& e) {
        std::cerr << "Error creating day: " << e.what() << std::endl;
        return false;
    }
}

std::optional<Day> GoalService::getDay(const std::string& id) {
    try {
        auto oid_opt = parseObjectId(id);
        if (!oid_opt) return std::nullopt;
        
        auto collection = Database::getInstance().getCollection("days");
        auto filter = bsoncxx::builder::stream::document{} 
            << "_id" << *oid_opt 
            << bsoncxx::builder::stream::finalize;
        
        auto result = collection.find_one(filter.view());
        if (result) {
            return Day::fromBson(result->view());
        }
        return std::nullopt;
    } catch (const std::exception& e) {
        std::cerr << "Error getting day: " << e.what() << std::endl;
        return std::nullopt;
    }
}

std::vector<Day> GoalService::getDaysByGoal(const std::string& goal_id) {
    std::vector<Day> days;
    try {
        auto collection = Database::getInstance().getCollection("days");
        auto filter = bsoncxx::builder::stream::document{} 
            << "goal_id" << goal_id 
            << bsoncxx::builder::stream::finalize;
        
        auto cursor = collection.find(filter.view());
        
        for (auto&& doc : cursor) {
            days.push_back(Day::fromBson(doc));
        }
    } catch (const std::exception& e) {
        std::cerr << "Error getting days by goal: " << e.what() << std::endl;
    }
    return days;
}

bool GoalService::updateDay(const std::string& id, const std::string& date) {
    try {
        auto oid_opt = parseObjectId(id);
        if (!oid_opt) return false;
        
        // Obtener el day para saber el goal_id antes de actualizar
        auto old_day = getDay(id);
        if (!old_day) return false;
        
        auto collection = Database::getInstance().getCollection("days");
        auto filter = bsoncxx::builder::stream::document{} 
            << "_id" << *oid_opt 
            << bsoncxx::builder::stream::finalize;
        
        auto update = bsoncxx::builder::stream::document{} 
            << "$set" << bsoncxx::builder::stream::open_document
            << "date" << date
            << bsoncxx::builder::stream::close_document
            << bsoncxx::builder::stream::finalize;
        
        auto result = collection.update_one(filter.view(), update.view());
        
        if (result && result->modified_count() > 0) {
            // Recalcular el progreso de la meta
            calculateGoalProgress(old_day->goal_id);
            return true;
        }
        return false;
    } catch (const std::exception& e) {
        std::cerr << "Error updating day: " << e.what() << std::endl;
        return false;
    }
}

bool GoalService::deleteDay(const std::string& id) {
    try {
        // Obtener el day antes de eliminarlo para conocer el goal_id
        auto day = getDay(id);
        if (!day) return false;
        
        // Cascade delete: eliminar todos los eventos asociados a este día
        deleteEventsByDay(id);
        
        auto collection = Database::getInstance().getCollection("days");
        auto filter = bsoncxx::builder::stream::document{} 
            << "_id" << *parseObjectId(id) 
            << bsoncxx::builder::stream::finalize;
        
        auto result = collection.delete_one(filter.view());
        
        if (result && result->deleted_count() > 0) {
            // Recalcular el progreso de la meta
            calculateGoalProgress(day->goal_id);
            return true;
        }
        return false;
    } catch (const std::exception& e) {
        std::cerr << "Error deleting day: " << e.what() << std::endl;
        return false;
    }
}

void GoalService::deleteDaysByGoal(const std::string& goal_id) {
    try {
        auto days = getDaysByGoal(goal_id);
        for (const auto& day : days) {
            deleteDay(day.id);
        }
    } catch (const std::exception& e) {
        std::cerr << "Error deleting days by goal: " << e.what() << std::endl;
    }
}

// ============================================
// GOAL SERVICE - EVENT METHODS
// ============================================

bool GoalService::createEvent(const Event& event, std::string& event_id) {
    try {
        auto collection = Database::getInstance().getCollection("events");
        auto doc = event.toBson();
        auto result = collection.insert_one(doc.view());
        
        if (result) {
            auto inserted_id = result->inserted_id();
            if (inserted_id.type() == bsoncxx::type::k_oid) {
                event_id = inserted_id.get_oid().value.to_string();
                return true;
            }
        }
        return false;
    } catch (const std::exception& e) {
        std::cerr << "Error creating event: " << e.what() << std::endl;
        return false;
    }
}

std::optional<Event> GoalService::getEvent(const std::string& id) {
    try {
        auto oid_opt = parseObjectId(id);
        if (!oid_opt) return std::nullopt;
        
        auto collection = Database::getInstance().getCollection("events");
        auto filter = bsoncxx::builder::stream::document{} 
            << "_id" << *oid_opt 
            << bsoncxx::builder::stream::finalize;
        
        auto result = collection.find_one(filter.view());
        if (result) {
            return Event::fromBson(result->view());
        }
        return std::nullopt;
    } catch (const std::exception& e) {
        std::cerr << "Error getting event: " << e.what() << std::endl;
        return std::nullopt;
    }
}

std::vector<Event> GoalService::getEventsByDay(const std::string& day_id) {
    std::vector<Event> events;
    try {
        auto collection = Database::getInstance().getCollection("events");
        auto filter = bsoncxx::builder::stream::document{} 
            << "day_id" << day_id 
            << bsoncxx::builder::stream::finalize;
        
        auto cursor = collection.find(filter.view());
        
        for (auto&& doc : cursor) {
            events.push_back(Event::fromBson(doc));
        }
    } catch (const std::exception& e) {
        std::cerr << "Error getting events by day: " << e.what() << std::endl;
    }
    return events;
}

bool GoalService::updateEvent(const std::string& id, const std::string& title, 
                               const std::string& description, double amount) {
    try {
        auto oid_opt = parseObjectId(id);
        if (!oid_opt) return false;
        
        auto collection = Database::getInstance().getCollection("events");
        auto filter = bsoncxx::builder::stream::document{} 
            << "_id" << *oid_opt 
            << bsoncxx::builder::stream::finalize;
        
        auto update = bsoncxx::builder::stream::document{} 
            << "$set" << bsoncxx::builder::stream::open_document
            << "title" << title
            << "description" << description
            << "amount" << amount
            << bsoncxx::builder::stream::close_document
            << bsoncxx::builder::stream::finalize;
        
        auto result = collection.update_one(filter.view(), update.view());
        return result && result->modified_count() > 0;
    } catch (const std::exception& e) {
        std::cerr << "Error updating event: " << e.what() << std::endl;
        return false;
    }
}

bool GoalService::deleteEvent(const std::string& id) {
    try {
        auto oid_opt = parseObjectId(id);
        if (!oid_opt) return false;
        
        auto collection = Database::getInstance().getCollection("events");
        auto filter = bsoncxx::builder::stream::document{} 
            << "_id" << *oid_opt 
            << bsoncxx::builder::stream::finalize;
        
        auto result = collection.delete_one(filter.view());
        return result && result->deleted_count() > 0;
    } catch (const std::exception& e) {
        std::cerr << "Error deleting event: " << e.what() << std::endl;
        return false;
    }
}

void GoalService::deleteEventsByDay(const std::string& day_id) {
    try {
        auto collection = Database::getInstance().getCollection("events");
        auto filter = bsoncxx::builder::stream::document{} 
            << "day_id" << day_id 
            << bsoncxx::builder::stream::finalize;
        
        collection.delete_many(filter.view());
    } catch (const std::exception& e) {
        std::cerr << "Error deleting events by day: " << e.what() << std::endl;
    }
}