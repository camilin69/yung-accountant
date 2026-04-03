#include "database.hpp"
#include <iostream>

std::unique_ptr<Database> Database::instance_;
std::once_flag Database::init_flag_;

Database& Database::getInstance() {
    std::call_once(init_flag_, []() {
        instance_ = std::make_unique<Database>();
    });
    return *instance_;
}

bool Database::connect(const std::string& uri_str, const std::string& db_name) {
    try {
        mongo_instance_ = std::make_unique<mongocxx::instance>();
        mongocxx::uri uri(uri_str);
        client_ = std::make_unique<mongocxx::client>(uri);
        db_name_ = db_name;
        
        auto db = (*client_)[db_name_];
        auto ping_cmd = bsoncxx::builder::stream::document{} 
            << "ping" << 1 
            << bsoncxx::builder::stream::finalize;
        db.run_command(ping_cmd.view());
        
        connected_ = true;
        std::cout << "✓ Connected to MongoDB: " << db_name_ << std::endl;
        return true;
    } catch (const std::exception& e) {
        std::cerr << "✗ MongoDB connection error: " << e.what() << std::endl;
        connected_ = false;
        return false;
    }
}

mongocxx::collection Database::getCollection(const std::string& collection_name) {
    if (!connected_ || !client_) {
        throw std::runtime_error("Database not connected");
    }
    return (*client_)[db_name_][collection_name];
}