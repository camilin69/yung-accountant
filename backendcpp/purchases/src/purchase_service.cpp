#include "purchase_service.hpp"
#include "database.hpp"
#include <mongocxx/collection.hpp>
#include <bsoncxx/builder/stream/document.hpp>
#include <iostream>
#include <ctime>

bsoncxx::document::value Purchase::toBson() const {
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
        << "frequency" << frequency
        << "category" << category
        << "date" << date
        << "created_at" << created_at;
    
    return doc << finalize;
}

Purchase Purchase::fromBson(const bsoncxx::document::view& doc) {
    Purchase purchase;
    
    auto id_elem = doc["_id"];
    if (id_elem && id_elem.type() == bsoncxx::type::k_oid) {
        purchase.id = id_elem.get_oid().value.to_string();
    }
    
    auto user_elem = doc["user_id"];
    if (user_elem && user_elem.type() == bsoncxx::type::k_string) {
        purchase.user_id = user_elem.get_string().value.to_string();
    }
    
    auto title_elem = doc["title"];
    if (title_elem && title_elem.type() == bsoncxx::type::k_string) {
        purchase.title = title_elem.get_string().value.to_string();
    }
    
    auto desc_elem = doc["description"];
    if (desc_elem && desc_elem.type() == bsoncxx::type::k_string) {
        purchase.description = desc_elem.get_string().value.to_string();
    }
    
    auto amount_elem = doc["amount"];
    if (amount_elem && amount_elem.type() == bsoncxx::type::k_double) {
        purchase.amount = amount_elem.get_double();
    }
    
    auto freq_elem = doc["frequency"];
    if (freq_elem && freq_elem.type() == bsoncxx::type::k_string) {
        purchase.frequency = freq_elem.get_string().value.to_string();
    }
    
    auto cat_elem = doc["category"];
    if (cat_elem && cat_elem.type() == bsoncxx::type::k_string) {
        purchase.category = cat_elem.get_string().value.to_string();
    }
    
    auto date_elem = doc["date"];
    if (date_elem && date_elem.type() == bsoncxx::type::k_string) {
        purchase.date = date_elem.get_string().value.to_string();
    }
    
    auto created_elem = doc["created_at"];
    if (created_elem && created_elem.type() == bsoncxx::type::k_string) {
        purchase.created_at = created_elem.get_string().value.to_string();
    }
    
    return purchase;
}

PurchaseService& PurchaseService::getInstance() {
    static PurchaseService instance;
    return instance;
}

std::optional<bsoncxx::oid> PurchaseService::parseObjectId(const std::string& id) {
    try {
        return bsoncxx::oid(id);
    } catch (...) {
        return std::nullopt;
    }
}

bool PurchaseService::createPurchase(const Purchase& purchase, std::string& purchase_id) {
    try {
        auto collection = Database::getInstance().getCollection("purchases");
        auto doc = purchase.toBson();
        auto result = collection.insert_one(doc.view());
        
        if (result) {
            auto inserted_id = result->inserted_id();
            if (inserted_id.type() == bsoncxx::type::k_oid) {
                purchase_id = inserted_id.get_oid().value.to_string();
                return true;
            }
        }
        return false;
    } catch (const std::exception& e) {
        std::cerr << "Error creating purchase: " << e.what() << std::endl;
        return false;
    }
}

std::optional<Purchase> PurchaseService::getPurchase(const std::string& id) {
    try {
        auto oid_opt = parseObjectId(id);
        if (!oid_opt) return std::nullopt;
        
        auto collection = Database::getInstance().getCollection("purchases");
        auto filter = bsoncxx::builder::stream::document{} 
            << "_id" << *oid_opt 
            << bsoncxx::builder::stream::finalize;
        
        auto result = collection.find_one(filter.view());
        if (result) {
            return Purchase::fromBson(result->view());
        }
        return std::nullopt;
    } catch (const std::exception& e) {
        std::cerr << "Error getting purchase: " << e.what() << std::endl;
        return std::nullopt;
    }
}

std::vector<Purchase> PurchaseService::getPurchasesByUser(const std::string& user_id) {
    std::vector<Purchase> purchases;
    try {
        auto collection = Database::getInstance().getCollection("purchases");
        auto filter = bsoncxx::builder::stream::document{} 
            << "user_id" << user_id 
            << bsoncxx::builder::stream::finalize;
        
        auto cursor = collection.find(filter.view());
        
        for (auto&& doc : cursor) {
            purchases.push_back(Purchase::fromBson(doc));
        }
    } catch (const std::exception& e) {
        std::cerr << "Error getting purchases by user: " << e.what() << std::endl;
    }
    return purchases;
}

std::vector<Purchase> PurchaseService::getPurchasesByUserAndCategory(const std::string& user_id, 
                                                                      const std::string& category) {
    std::vector<Purchase> purchases;
    try {
        auto collection = Database::getInstance().getCollection("purchases");
        auto filter = bsoncxx::builder::stream::document{} 
            << "user_id" << user_id
            << "category" << category
            << bsoncxx::builder::stream::finalize;
        
        auto cursor = collection.find(filter.view());
        
        for (auto&& doc : cursor) {
            purchases.push_back(Purchase::fromBson(doc));
        }
    } catch (const std::exception& e) {
        std::cerr << "Error getting purchases by category: " << e.what() << std::endl;
    }
    return purchases;
}

std::vector<Purchase> PurchaseService::getPurchasesByUserAndDateRange(const std::string& user_id,
                                                                       const std::string& start_date,
                                                                       const std::string& end_date) {
    std::vector<Purchase> purchases;
    try {
        auto collection = Database::getInstance().getCollection("purchases");
        auto filter = bsoncxx::builder::stream::document{} 
            << "user_id" << user_id
            << "date" << bsoncxx::builder::stream::open_document
            << "$gte" << start_date
            << "$lte" << end_date
            << bsoncxx::builder::stream::close_document
            << bsoncxx::builder::stream::finalize;
        
        auto cursor = collection.find(filter.view());
        
        for (auto&& doc : cursor) {
            purchases.push_back(Purchase::fromBson(doc));
        }
    } catch (const std::exception& e) {
        std::cerr << "Error getting purchases by date range: " << e.what() << std::endl;
    }
    return purchases;
}

bool PurchaseService::updatePurchase(const std::string& id, const std::string& title, 
                                      const std::string& description, double amount,
                                      const std::string& frequency, const std::string& category) {
    try {
        auto oid_opt = parseObjectId(id);
        if (!oid_opt) return false;
        
        auto collection = Database::getInstance().getCollection("purchases");
        auto filter = bsoncxx::builder::stream::document{} 
            << "_id" << *oid_opt 
            << bsoncxx::builder::stream::finalize;
        
        auto update = bsoncxx::builder::stream::document{} 
            << "$set" << bsoncxx::builder::stream::open_document
            << "title" << title
            << "description" << description
            << "amount" << amount
            << "frequency" << frequency
            << "category" << category
            << bsoncxx::builder::stream::close_document
            << bsoncxx::builder::stream::finalize;
        
        auto result = collection.update_one(filter.view(), update.view());
        return result && result->modified_count() > 0;
    } catch (const std::exception& e) {
        std::cerr << "Error updating purchase: " << e.what() << std::endl;
        return false;
    }
}

bool PurchaseService::deletePurchase(const std::string& id) {
    try {
        auto oid_opt = parseObjectId(id);
        if (!oid_opt) return false;
        
        auto collection = Database::getInstance().getCollection("purchases");
        auto filter = bsoncxx::builder::stream::document{} 
            << "_id" << *oid_opt 
            << bsoncxx::builder::stream::finalize;
        
        auto result = collection.delete_one(filter.view());
        return result && result->deleted_count() > 0;
    } catch (const std::exception& e) {
        std::cerr << "Error deleting purchase: " << e.what() << std::endl;
        return false;
    }
}

double PurchaseService::getTotalByUser(const std::string& user_id) {
    double total = 0.0;
    try {
        auto collection = Database::getInstance().getCollection("purchases");
        auto filter = bsoncxx::builder::stream::document{} 
            << "user_id" << user_id 
            << bsoncxx::builder::stream::finalize;
        
        auto cursor = collection.find(filter.view());
        
        for (auto&& doc : cursor) {
            auto purchase = Purchase::fromBson(doc);
            total += purchase.amount;
        }
    } catch (const std::exception& e) {
        std::cerr << "Error calculating total: " << e.what() << std::endl;
    }
    return total;
}

double PurchaseService::getTotalByUserAndCategory(const std::string& user_id, const std::string& category) {
    double total = 0.0;
    try {
        auto collection = Database::getInstance().getCollection("purchases");
        auto filter = bsoncxx::builder::stream::document{} 
            << "user_id" << user_id
            << "category" << category
            << bsoncxx::builder::stream::finalize;
        
        auto cursor = collection.find(filter.view());
        
        for (auto&& doc : cursor) {
            auto purchase = Purchase::fromBson(doc);
            total += purchase.amount;
        }
    } catch (const std::exception& e) {
        std::cerr << "Error calculating total by category: " << e.what() << std::endl;
    }
    return total;
}