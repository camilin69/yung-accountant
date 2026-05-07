// database.cpp
#include "database.hpp"
#include <iostream>
#include <sstream>

std::unique_ptr<Database> Database::instance_;
std::once_flag Database::init_flag_;

Database& Database::getInstance() {
    std::call_once(init_flag_, []() {
        instance_ = std::make_unique<Database>();
    });
    return *instance_;
}

void Database::disconnect() {
    if (conn_) {
        conn_.reset();  // En lugar de llamar a close()
    }
}

bool Database::connect(const std::string& host, int port, 
                       const std::string& dbname, 
                       const std::string& user, 
                       const std::string& password) {
    try {
        std::stringstream conn_str;
        conn_str << "host=" << host 
                 << " port=" << port
                 << " dbname=" << dbname
                 << " user=" << user
                 << " password=" << password
                 << " connect_timeout=10";
        
        conn_ = std::make_unique<pqxx::connection>(conn_str.str());
        
        if (conn_->is_open()) {
            connected_ = true;
            std::cout << "✓ Connected to PostgreSQL: " << dbname << " at " << host << ":" << port << std::endl;
            return true;
        }
    } catch (const std::exception& e) {
        std::cerr << "✗ PostgreSQL connection error: " << e.what() << std::endl;
        connected_ = false;
    }
    return false;
}