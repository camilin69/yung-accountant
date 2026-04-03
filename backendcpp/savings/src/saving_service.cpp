#include "saving_service.hpp"
#include "database.hpp"
#include <mongocxx/collection.hpp>
#include <bsoncxx/builder/stream/document.hpp>
#include <iostream>
#include <ctime>

bsoncxx::document::value Saving::toBson() const {
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
        << "amount" << amount
        << "goal_date" << goal_date
        << "created_at" << created_at;
    
    return doc << finalize;
}

Saving Saving::fromBson(const bsoncxx::document::view& doc) {
    Saving saving;
    
    auto id_elem = doc["_id"];
    if (id_elem && id_elem.type() == bsoncxx::type::k_oid) {
        saving.id = id_elem.get_oid().value.to_string();
    }
    
    auto user_elem = doc["user_id"];
    if (user_elem && user_elem.type() == bsoncxx::type::k_string) {
        saving.user_id = user_elem.get_string().value.to_string();
    }
    
    auto title_elem = doc["title"];
    if (title_elem && title_elem.type() == bsoncxx::type::k_string) {
        saving.title = title_elem.get_string().value.to_string();
    }
    
    auto desc_elem = doc["description"];
    if (desc_elem && desc_elem.type() == bsoncxx::type::k_string) {
        saving.description = desc_elem.get_string().value.to_string();
    }
    
    auto amount_elem = doc["amount"];
    if (amount_elem && amount_elem.type() == bsoncxx::type::k_double) {
        saving.amount = amount_elem.get_double();
    }
    
    auto goal_date_elem = doc["goal_date"];
    if (goal_date_elem && goal_date_elem.type() == bsoncxx::type::k_string) {
        saving.goal_date = goal_date_elem.get_string().value.to_string();
    }
    
    auto created_elem = doc["created_at"];
    if (created_elem && created_elem.type() == bsoncxx::type::k_string) {
        saving.created_at = created_elem.get_string().value.to_string();
    }
    
    return saving;
}

SavingService& SavingService::getInstance() {
    static SavingService instance;
    return instance;
}

std::optional<bsoncxx::oid> SavingService::parseObjectId(const std::string& id) {
    try {
        return bsoncxx::oid(id);
    } catch (...) {
        return std::nullopt;
    }
}

bool SavingService::createSaving(const Saving& saving, std::string& saving_id) {
    try {
        auto collection = Database::getInstance().getCollection("savings");
        auto doc = saving.toBson();
        auto result = collection.insert_one(doc.view());
        
        if (result) {
            auto inserted_id = result->inserted_id();
            if (inserted_id.type() == bsoncxx::type::k_oid) {
                saving_id = inserted_id.get_oid().value.to_string();
                return true;
            }
        }
        return false;
    } catch (const std::exception& e) {
        std::cerr << "Error creating saving: " << e.what() << std::endl;
        return false;
    }
}

std::optional<Saving> SavingService::getSaving(const std::string& id) {
    try {
        auto oid_opt = parseObjectId(id);
        if (!oid_opt) return std::nullopt;
        
        auto collection = Database::getInstance().getCollection("savings");
        auto filter = bsoncxx::builder::stream::document{} 
            << "_id" << *oid_opt 
            << bsoncxx::builder::stream::finalize;
        
        auto result = collection.find_one(filter.view());
        if (result) {
            return Saving::fromBson(result->view());
        }
        return std::nullopt;
    } catch (const std::exception& e) {
        std::cerr << "Error getting saving: " << e.what() << std::endl;
        return std::nullopt;
    }
}

std::vector<Saving> SavingService::getSavingsByUser(const std::string& user_id) {
    std::vector<Saving> savings;
    try {
        auto collection = Database::getInstance().getCollection("savings");
        auto filter = bsoncxx::builder::stream::document{} 
            << "user_id" << user_id 
            << bsoncxx::builder::stream::finalize;
        
        auto cursor = collection.find(filter.view());
        
        for (auto&& doc : cursor) {
            savings.push_back(Saving::fromBson(doc));
        }
    } catch (const std::exception& e) {
        std::cerr << "Error getting savings by user: " << e.what() << std::endl;
    }
    return savings;
}

std::vector<Saving> SavingService::getSavingsByUserAndDateRange(const std::string& user_id,
                                                                 const std::string& start_date,
                                                                 const std::string& end_date) {
    std::vector<Saving> savings;
    try {
        auto collection = Database::getInstance().getCollection("savings");
        auto filter = bsoncxx::builder::stream::document{} 
            << "user_id" << user_id
            << "goal_date" << bsoncxx::builder::stream::open_document
            << "$gte" << start_date
            << "$lte" << end_date
            << bsoncxx::builder::stream::close_document
            << bsoncxx::builder::stream::finalize;
        
        auto cursor = collection.find(filter.view());
        
        for (auto&& doc : cursor) {
            savings.push_back(Saving::fromBson(doc));
        }
    } catch (const std::exception& e) {
        std::cerr << "Error getting savings by date range: " << e.what() << std::endl;
    }
    return savings;
}

bool SavingService::updateSaving(const std::string& id, const std::string& title, 
                                  const std::string& description, double amount,
                                  const std::string& goal_date) {
    try {
        auto oid_opt = parseObjectId(id);
        if (!oid_opt) return false;
        
        auto collection = Database::getInstance().getCollection("savings");
        auto filter = bsoncxx::builder::stream::document{} 
            << "_id" << *oid_opt 
            << bsoncxx::builder::stream::finalize;
        
        auto update = bsoncxx::builder::stream::document{} 
            << "$set" << bsoncxx::builder::stream::open_document
            << "title" << title
            << "description" << description
            << "amount" << amount
            << "goal_date" << goal_date
            << bsoncxx::builder::stream::close_document
            << bsoncxx::builder::stream::finalize;
        
        auto result = collection.update_one(filter.view(), update.view());
        return result && result->modified_count() > 0;
    } catch (const std::exception& e) {
        std::cerr << "Error updating saving: " << e.what() << std::endl;
        return false;
    }
}

bool SavingService::addAmount(const std::string& id, double amount) {
    try {
        auto oid_opt = parseObjectId(id);
        if (!oid_opt) return false;
        
        auto collection = Database::getInstance().getCollection("savings");
        auto filter = bsoncxx::builder::stream::document{} 
            << "_id" << *oid_opt 
            << bsoncxx::builder::stream::finalize;
        
        auto update = bsoncxx::builder::stream::document{} 
            << "$inc" << bsoncxx::builder::stream::open_document
            << "amount" << amount
            << bsoncxx::builder::stream::close_document
            << bsoncxx::builder::stream::finalize;
        
        auto result = collection.update_one(filter.view(), update.view());
        return result && result->modified_count() > 0;
    } catch (const std::exception& e) {
        std::cerr << "Error adding amount: " << e.what() << std::endl;
        return false;
    }
}

bool SavingService::deleteSaving(const std::string& id) {
    try {
        auto oid_opt = parseObjectId(id);
        if (!oid_opt) return false;
        
        auto collection = Database::getInstance().getCollection("savings");
        auto filter = bsoncxx::builder::stream::document{} 
            << "_id" << *oid_opt 
            << bsoncxx::builder::stream::finalize;
        
        auto result = collection.delete_one(filter.view());
        return result && result->deleted_count() > 0;
    } catch (const std::exception& e) {
        std::cerr << "Error deleting saving: " << e.what() << std::endl;
        return false;
    }
}

double SavingService::getTotalByUser(const std::string& user_id) {
    double total = 0.0;
    try {
        auto collection = Database::getInstance().getCollection("savings");
        auto filter = bsoncxx::builder::stream::document{} 
            << "user_id" << user_id 
            << bsoncxx::builder::stream::finalize;
        
        auto cursor = collection.find(filter.view());
        
        for (auto&& doc : cursor) {
            auto saving = Saving::fromBson(doc);
            total += saving.amount;
        }
    } catch (const std::exception& e) {
        std::cerr << "Error calculating total: " << e.what() << std::endl;
    }
    return total;
}