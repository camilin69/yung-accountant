// src/redis_client.cpp
#include "redis_client.hpp"

namespace redis {

RedisClient& RedisClient::getInstance() {
    static RedisClient instance;
    return instance;
}

bool RedisClient::connect(const std::string& host, int port, const std::string& password) {
    std::lock_guard<std::mutex> lock(mutex_);  // ← Thread-safe
    
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
    std::lock_guard<std::mutex> lock(mutex_);  // ← Thread-safe
    
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
    std::lock_guard<std::mutex> lock(mutex_);  // ← Thread-safe
    
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
    std::lock_guard<std::mutex> lock(mutex_);  // ← Thread-safe
    
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
    std::lock_guard<std::mutex> lock(mutex_);  // ← Thread-safe
    
    if (!connected_ || !ctx_) return false;
    
    redisReply* reply = (redisReply*)redisCommand(ctx_, "EXISTS %s", key.c_str());
    
    if (!reply) return false;
    
    bool exists = (reply->type == REDIS_REPLY_INTEGER && reply->integer == 1);
    freeReplyObject(reply);
    return exists;
}

bool RedisClient::delByPattern(const std::string& pattern) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    if (!connected_ || !ctx_) {
        std::cerr << "[Redis] Cannot delete by pattern: not connected" << std::endl;
        return false;
    }
    
    std::cout << "[Redis] Deleting keys by pattern (using SCAN): " << pattern << std::endl;
    
    int deleted_count = scanAndDelete(pattern, 100);
    
    if (deleted_count > 0) {
        std::cout << "[Redis] Successfully deleted " << deleted_count 
                  << " keys matching pattern: " << pattern << std::endl;
        return true;
    } else {
        std::cout << "[Redis] No keys found matching pattern: " << pattern << std::endl;
        return false;
    }
}
int RedisClient::scanAndDelete(const std::string& pattern, size_t count) {
    // No necesita lock porque ya lo tiene delByPattern
    
    int deleted_count = 0;
    std::string cursor = "0";
    int iterations = 0;
    const int MAX_ITERATIONS = 1000; // Seguridad: evitar bucle infinito
    
    do {
        // Escanear en lotes pequeños (no bloqueante)
        redisReply* scan_reply = (redisReply*)redisCommand(
            ctx_, 
            "SCAN %s MATCH %s COUNT %zu", 
            cursor.c_str(), 
            pattern.c_str(), 
            count
        );
        
        if (!scan_reply || scan_reply->type != REDIS_REPLY_ARRAY || scan_reply->elements != 2) {
            if (scan_reply) freeReplyObject(scan_reply);
            std::cerr << "[Redis] SCAN failed for pattern: " << pattern << std::endl;
            return deleted_count;
        }
        
        // Actualizar cursor para siguiente iteración
        cursor = std::string(scan_reply->element[0]->str);
        
        // Obtener array de claves encontradas en este lote
        redisReply* keys_reply = scan_reply->element[1];
        
        if (keys_reply->type == REDIS_REPLY_ARRAY && keys_reply->elements > 0) {
            // Usar pipeline para borrar múltiples claves eficientemente
            redisAppendCommand(ctx_, "MULTI");
            
            for (size_t i = 0; i < keys_reply->elements; ++i) {
                if (keys_reply->element[i]->type == REDIS_REPLY_STRING) {
                    redisAppendCommand(ctx_, "DEL %s", keys_reply->element[i]->str);
                }
            }
            
            redisAppendCommand(ctx_, "EXEC");
            
            // Consumir respuestas del pipeline en orden
            redisReply* reply = nullptr;
            
            // MULTI
            if (redisGetReply(ctx_, (void**)&reply) == REDIS_OK) {
                freeReplyObject(reply);
            }
            
            // DEL para cada clave
            for (size_t i = 0; i < keys_reply->elements; ++i) {
                if (redisGetReply(ctx_, (void**)&reply) == REDIS_OK) {
                    if (reply && reply->type == REDIS_REPLY_INTEGER) {
                        deleted_count += reply->integer;
                    }
                    freeReplyObject(reply);
                }
            }
            
            // EXEC
            if (redisGetReply(ctx_, (void**)&reply) == REDIS_OK) {
                freeReplyObject(reply);
            }
        }
        
        freeReplyObject(scan_reply);
        
        // Protección contra bucles infinitos
        if (++iterations >= MAX_ITERATIONS) {
            std::cerr << "[Redis] SCAN reached max iterations (" << MAX_ITERATIONS 
                      << "), stopping. Deleted so far: " << deleted_count << std::endl;
            break;
        }
        
    } while (cursor != "0"); // "0" significa que terminó de escanear toda la DB
    
    return deleted_count;
}



bool RedisClient::expire(const std::string& key, int seconds) {
    std::lock_guard<std::mutex> lock(mutex_);  // ← Thread-safe
    
    if (!connected_ || !ctx_) return false;
    
    redisReply* reply = (redisReply*)redisCommand(ctx_, "EXPIRE %s %d", key.c_str(), seconds);
    
    if (!reply) return false;
    
    bool success = (reply->type == REDIS_REPLY_INTEGER && reply->integer == 1);
    freeReplyObject(reply);
    return success;
}

bool RedisClient::incrBy(const std::string& key, int delta) {
    std::lock_guard<std::mutex> lock(mutex_);  // ← Thread-safe
    
    if (!connected_ || !ctx_) return false;
    
    redisReply* reply = (redisReply*)redisCommand(ctx_, "INCRBY %s %d", key.c_str(), delta);
    
    if (!reply) return false;
    
    bool success = (reply->type == REDIS_REPLY_INTEGER);
    freeReplyObject(reply);
    return success;
}

bool RedisClient::sadd(const std::string& set_key, const std::string& member) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    if (!connected_ || !ctx_) return false;
    
    redisReply* reply = (redisReply*)redisCommand(
        ctx_, "SADD %s %b", set_key.c_str(), member.c_str(), member.size());
    
    if (!reply) return false;
    bool success = (reply->type == REDIS_REPLY_INTEGER && reply->integer >= 0);
    freeReplyObject(reply);
    return success;
}

bool RedisClient::srem(const std::string& set_key, const std::string& member) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    if (!connected_ || !ctx_) return false;
    
    redisReply* reply = (redisReply*)redisCommand(
        ctx_, "SREM %s %b", set_key.c_str(), member.c_str(), member.size());
    
    if (!reply) return false;
    bool success = (reply->type == REDIS_REPLY_INTEGER && reply->integer >= 0);
    freeReplyObject(reply);
    return success;
}

std::vector<std::string> RedisClient::smembers(const std::string& set_key) {
    std::lock_guard<std::mutex> lock(mutex_);
    std::vector<std::string> members;
    
    if (!connected_ || !ctx_) return members;
    
    redisReply* reply = (redisReply*)redisCommand(ctx_, "SMEMBERS %s", set_key.c_str());
    
    if (!reply || reply->type != REDIS_REPLY_ARRAY) {
        if (reply) freeReplyObject(reply);
        return members;
    }
    
    for (size_t i = 0; i < reply->elements; ++i) {
        if (reply->element[i]->type == REDIS_REPLY_STRING) {
            members.emplace_back(reply->element[i]->str, reply->element[i]->len);
        }
    }
    
    freeReplyObject(reply);
    return members;
}

bool RedisClient::delSet(const std::string& set_key) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    if (!connected_ || !ctx_) return false;
    
    // Obtener todos los miembros del set
    redisReply* members_reply = (redisReply*)redisCommand(ctx_, "SMEMBERS %s", set_key.c_str());
    if (!members_reply || members_reply->type != REDIS_REPLY_ARRAY) {
        if (members_reply) freeReplyObject(members_reply);
        return false;
    }
    
    if (members_reply->elements == 0) {
        freeReplyObject(members_reply);
        // Borrar el set vacío
        redisReply* del_reply = (redisReply*)redisCommand(ctx_, "DEL %s", set_key.c_str());
        if (del_reply) freeReplyObject(del_reply);
        return true;
    }
    
    // Pipeline: borrar todas las claves + el set
    redisAppendCommand(ctx_, "MULTI");
    
    for (size_t i = 0; i < members_reply->elements; ++i) {
        if (members_reply->element[i]->type == REDIS_REPLY_STRING) {
            redisAppendCommand(ctx_, "DEL %s", members_reply->element[i]->str);
        }
    }
    
    redisAppendCommand(ctx_, "DEL %s", set_key.c_str());
    redisAppendCommand(ctx_, "EXEC");
    
    // Consumir respuestas
    redisReply* reply = nullptr;
    redisGetReply(ctx_, (void**)&reply); freeReplyObject(reply); // MULTI
    
    for (size_t i = 0; i < members_reply->elements; ++i) {
        redisGetReply(ctx_, (void**)&reply); freeReplyObject(reply); // DEL key
    }
    
    redisGetReply(ctx_, (void**)&reply); freeReplyObject(reply); // DEL set
    redisGetReply(ctx_, (void**)&reply); // EXEC
    
    bool success = (reply && reply->type != REDIS_REPLY_ERROR);
    if (reply) freeReplyObject(reply);
    freeReplyObject(members_reply);
    
    if (success) {
        std::cout << "[Redis] Deleted set '" << set_key << "' with " 
                  << members_reply->elements << " keys" << std::endl;
    }
    
    return success;
}


void RedisClient::disconnect() {
    std::lock_guard<std::mutex> lock(mutex_);  // ← Thread-safe
    
    if (ctx_) {
        redisFree(ctx_);
        ctx_ = nullptr;
    }
    connected_ = false;
}

} // namespace redis