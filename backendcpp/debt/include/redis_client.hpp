// src/redis_client.hpp
#pragma once

#include <hiredis/hiredis.h>
#include <string>
#include <memory>
#include <optional>
#include <functional>
#include <iostream>
#include <boost/json.hpp>
#include <mutex> 

namespace redis {

class RedisClient {
public:
    static RedisClient& getInstance();
    
    bool connect(const std::string& host, int port, const std::string& password = "");
    bool isConnected() const { return ctx_ != nullptr && connected_; }
    
    bool set(const std::string& key, const std::string& value, int ttl_seconds = 300);
    std::optional<std::string> get(const std::string& key);
    bool del(const std::string& key);
    bool exists(const std::string& key);
    bool expire(const std::string& key, int seconds);
    bool incrBy(const std::string& key, int delta);
    
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

    bool sadd(const std::string& set_key, const std::string& member);
    bool srem(const std::string& set_key, const std::string& member);
    std::vector<std::string> smembers(const std::string& set_key);
    bool delSet(const std::string& set_key);
    
    bool delByPattern(const std::string& pattern);  // Usa SCAN internamente
    
    void disconnect();
    
private:
    RedisClient() = default;
    ~RedisClient() { disconnect(); }
    
    RedisClient(const RedisClient&) = delete;
    RedisClient& operator=(const RedisClient&) = delete;
    int scanAndDelete(const std::string& pattern, size_t count = 100);
    redisContext* ctx_ = nullptr;
    bool connected_ = false;
    std::mutex mutex_; 
};

} // namespace redis
