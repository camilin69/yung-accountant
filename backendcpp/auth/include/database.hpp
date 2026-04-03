#pragma once

#include <mongocxx/client.hpp>
#include <mongocxx/instance.hpp>
#include <mongocxx/uri.hpp>
#include <bsoncxx/json.hpp>
#include <bsoncxx/builder/stream/document.hpp>
#include <string>
#include <memory>
#include <mutex>

class Database {
public:
    Database() = default;
    ~Database() = default;
    static Database& getInstance();
    bool connect(const std::string& uri_str, const std::string& db_name);
    mongocxx::collection getCollection(const std::string& collection_name);
    bool isConnected() const { return client_ != nullptr; }

private:
    
    static std::unique_ptr<Database> instance_;
    static std::once_flag init_flag_;
    
    std::unique_ptr<mongocxx::instance> mongo_instance_;
    std::unique_ptr<mongocxx::client> client_;
    std::string db_name_;
    bool connected_ = false;
};