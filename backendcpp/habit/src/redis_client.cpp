// src/redis_client.cpp
#include "redis_client.hpp"
#include <iostream>

namespace redis {

RedisClient& RedisClient::getInstance() {
    static RedisClient instance;
    return instance;
}

bool RedisClient::connect(const std::string& host, int port, const std::string& password) {
    if (ctx_) {
        disconnect();
    }
    
    struct timeval timeout = { 3, 0 };
    ctx_ = redisConnectWithTimeout(host.c_str(), port, timeout);
    
    if (ctx_ == nullptr || ctx_->err) {
        if (ctx_) {
            std::cerr << "Redis connection error: " << ctx_->errstr << std::endl;
            redisFree(ctx_);
            ctx_ = nullptr;
        } else {
            std::cerr << "Redis connection error: Can't allocate redis context" << std::endl;
        }
        connected_ = false;
        return false;
    }
    
    if (!password.empty()) {
        redisReply* reply = (redisReply*)redisCommand(ctx_, "AUTH %s", password.c_str());
        if (reply) {
            if (reply->type == REDIS_REPLY_ERROR) {
                std::cerr << "Redis AUTH error: " << reply->str << std::endl;
                freeReplyObject(reply);
                disconnect();
                return false;
            }
            freeReplyObject(reply);
        }
    }
    
    connected_ = true;
    std::cout << "✓ Connected to Redis at " << host << ":" << port << std::endl;
    return true;
}

bool RedisClient::set(const std::string& key, const std::string& value, int ttl_seconds) {
    if (!connected_ || !ctx_) return false;
    
    redisReply* reply = (redisReply*)redisCommand(ctx_, 
        "SETEX %s %d %b", 
        key.c_str(), ttl_seconds, 
        value.c_str(), value.size());
    
    if (!reply) return false;
    
    bool success = (reply->type == REDIS_REPLY_STATUS && 
                    std::string(reply->str) == "OK");
    freeReplyObject(reply);
    
    if (success) {
        std::cout << "[Redis] Cached key: " << key << " for " << ttl_seconds << "s" << std::endl;
    }
    
    return success;
}

std::optional<std::string> RedisClient::get(const std::string& key) {
    if (!connected_ || !ctx_) return std::nullopt;
    
    redisReply* reply = (redisReply*)redisCommand(ctx_, "GET %s", key.c_str());
    
    if (!reply) return std::nullopt;
    
    std::optional<std::string> result;
    if (reply->type == REDIS_REPLY_STRING) {
        result = std::string(reply->str, reply->len);
        std::cout << "[Redis] Cache HIT for key: " << key << std::endl;
    } else {
        std::cout << "[Redis] Cache MISS for key: " << key << std::endl;
    }
    
    freeReplyObject(reply);
    return result;
}

bool RedisClient::del(const std::string& key) {
    if (!connected_ || !ctx_) return false;
    
    redisReply* reply = (redisReply*)redisCommand(ctx_, "DEL %s", key.c_str());
    
    if (!reply) return false;
    
    bool success = (reply->type == REDIS_REPLY_INTEGER && reply->integer > 0);
    freeReplyObject(reply);
    
    if (success) {
        std::cout << "[Redis] Deleted key: " << key << std::endl;
    }
    
    return success;
}

bool RedisClient::exists(const std::string& key) {
    if (!connected_ || !ctx_) return false;
    
    redisReply* reply = (redisReply*)redisCommand(ctx_, "EXISTS %s", key.c_str());
    
    if (!reply) return false;
    
    bool exists = (reply->type == REDIS_REPLY_INTEGER && reply->integer == 1);
    freeReplyObject(reply);
    return exists;
}

void RedisClient::disconnect() {
    if (ctx_) {
        redisFree(ctx_);
        ctx_ = nullptr;
    }
    connected_ = false;
}
bool RedisClient::delByPattern(const std::string& pattern) {
    if (!connected_ || !ctx_) return false;
    
    // Primero obtener todas las keys que coinciden con el patrón
    redisReply* keys_reply = (redisReply*)redisCommand(ctx_, "KEYS %s", pattern.c_str());
    
    if (!keys_reply) return false;
    
    if (keys_reply->type != REDIS_REPLY_ARRAY) {
        freeReplyObject(keys_reply);
        return false;
    }
    
    // Eliminar cada key encontrada
    int deleted_count = 0;
    for (size_t i = 0; i < keys_reply->elements; ++i) {
        if (keys_reply->element[i]->type == REDIS_REPLY_STRING) {
            std::string key(keys_reply->element[i]->str, keys_reply->element[i]->len);
            redisReply* del_reply = (redisReply*)redisCommand(ctx_, "DEL %s", key.c_str());
            if (del_reply && del_reply->type == REDIS_REPLY_INTEGER) {
                deleted_count += del_reply->integer;
            }
            if (del_reply) freeReplyObject(del_reply);
        }
    }
    
    freeReplyObject(keys_reply);
    
    if (deleted_count > 0) {
        std::cout << "[Redis] Deleted " << deleted_count << " keys matching pattern: " << pattern << std::endl;
    }
    
    return deleted_count > 0;
}

} // namespace redis