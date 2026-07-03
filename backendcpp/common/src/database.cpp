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

        // Enable SSL if configured (env: POSTGRES_SSL_MODE=require)
        const char* sslMode = std::getenv("POSTGRES_SSL_MODE");
        if (sslMode && strlen(sslMode) > 0) {
            conn_str << " sslmode=" << sslMode;
        }
        
        connection_string_ = conn_str.str();
        
        // Probar conexión
        pqxx::connection test_conn(connection_string_);
        if (test_conn.is_open()) {
            connected_ = true;
            pool_ = std::make_unique<ConnectionPool>(connection_string_, 20);

            std::cout << "✓ Connected to PostgreSQL: " << dbname << " at " << host << ":" << port << std::endl;
            return true;
        }
    } catch (const std::exception& e) {
        std::cerr << "✗ PostgreSQL connection error: " << e.what() << std::endl;
        connected_ = false;
    }
    return false;
}

void Database::disconnect() {
    connected_ = false;
}