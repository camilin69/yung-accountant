// database.hpp
#pragma once

#include <pqxx/pqxx>
#include <string>
#include <memory>
#include <mutex>

class Database {
public:
    static Database& getInstance();
    bool connect(const std::string& host, int port, 
                 const std::string& dbname, 
                 const std::string& user, 
                 const std::string& password);
    bool isConnected() const { return conn_ != nullptr && conn_->is_open(); }
    pqxx::connection& getConnection() { return *conn_; }
    
    void disconnect();
    
    // Constructor público
    Database() = default;
    ~Database() { disconnect(); }
    
private:
    Database(const Database&) = delete;
    Database& operator=(const Database&) = delete;
    
    static std::unique_ptr<Database> instance_;
    static std::once_flag init_flag_;
    
    std::unique_ptr<pqxx::connection> conn_;
    bool connected_ = false;
};