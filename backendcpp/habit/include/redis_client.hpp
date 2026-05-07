#pragma once

#include <hiredis/hiredis.h>
#include <string>
#include <memory>
#include <optional>
#include <functional>
#include <iostream>
#include <boost/json.hpp>


namespace redis {

class RedisClient {
public:
    static RedisClient& getInstance();
    
    bool connect(const std::string& host, int port, const std::string& password = "");
    bool isConnected() const { return ctx_ != nullptr; }
    
    bool set(const std::string& key, const std::string& value, int ttl_seconds = 300);
    std::optional<std::string> get(const std::string& key);
    bool del(const std::string& key);
    bool exists(const std::string& key);
    bool delByPattern(const std::string& pattern);
    
    template<typename T>
    bool setJson(const std::string& key, const T& data, int ttl_seconds = 300) {
        try {
            boost::json::value jv = boost::json::value_from(data);
            std::string json_str = boost::json::serialize(jv);
            return set(key, json_str, ttl_seconds);
        } catch (const std::exception& e) {
            std::cerr << "Error serializing JSON for Redis: " << e.what() << std::endl;
            return false;
        }
    }
    
    template<typename T>
    std::optional<T> getJson(const std::string& key) {
        auto value = get(key);
        if (!value) return std::nullopt;
        
        try {
            boost::json::value jv = boost::json::parse(*value);
            return boost::json::value_to<T>(jv);
        } catch (const std::exception& e) {
            std::cerr << "Error parsing JSON from Redis: " << e.what() << std::endl;
            return std::nullopt;
        }
    }
    
    void disconnect();
    
private:
    RedisClient() = default;
    ~RedisClient() { disconnect(); }
    
    RedisClient(const RedisClient&) = delete;
    RedisClient& operator=(const RedisClient&) = delete;
    
    redisContext* ctx_ = nullptr;
    bool connected_ = false;
};

} // namespace redis