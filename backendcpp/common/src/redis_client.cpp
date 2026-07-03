// common/src/redis_client.cpp — pooled Redis connections
#include "redis_client.hpp"
#include <iostream>

namespace redis {

RedisClient& RedisClient::getInstance() {
    static RedisClient instance;
    return instance;
}

bool RedisClient::connect(const std::string& host, int port, const std::string& password) {
    bool ok = pool_.connect(host, port, password);
    if (ok) std::cout << "[Redis] Pool of " << pool_.poolSize()
                      << " connections established to " << host << ":" << port << std::endl;
    else     std::cerr << "[Redis] Pool connection failed" << std::endl;
    return ok;
}

bool RedisClient::set(const std::string& key, const std::string& value, int ttl_seconds) {
    PooledConnection conn(pool_);
    if (!conn) return false;
    redisReply* reply = (redisReply*)redisCommand(conn.get(),
        "SETEX %s %d %b", key.c_str(), ttl_seconds, value.c_str(), value.size());
    if (!reply) return false;
    bool ok = (reply->type == REDIS_REPLY_STATUS && std::string(reply->str) == "OK");
    freeReplyObject(reply);
    return ok;
}

std::optional<std::string> RedisClient::get(const std::string& key) {
    PooledConnection conn(pool_);
    if (!conn) return std::nullopt;
    redisReply* reply = (redisReply*)redisCommand(conn.get(), "GET %s", key.c_str());
    if (!reply) return std::nullopt;
    std::optional<std::string> result;
    if (reply->type == REDIS_REPLY_STRING)
        result = std::string(reply->str, reply->len);
    freeReplyObject(reply);
    return result;
}

bool RedisClient::del(const std::string& key) {
    PooledConnection conn(pool_);
    if (!conn) return false;
    redisReply* reply = (redisReply*)redisCommand(conn.get(), "DEL %s", key.c_str());
    if (!reply) return false;
    bool ok = (reply->type == REDIS_REPLY_INTEGER && reply->integer > 0);
    freeReplyObject(reply);
    return ok;
}

bool RedisClient::exists(const std::string& key) {
    PooledConnection conn(pool_);
    if (!conn) return false;
    redisReply* reply = (redisReply*)redisCommand(conn.get(), "EXISTS %s", key.c_str());
    if (!reply) return false;
    bool ok = (reply->type == REDIS_REPLY_INTEGER && reply->integer == 1);
    freeReplyObject(reply);
    return ok;
}

bool RedisClient::expire(const std::string& key, int seconds) {
    PooledConnection conn(pool_);
    if (!conn) return false;
    redisReply* reply = (redisReply*)redisCommand(conn.get(), "EXPIRE %s %d", key.c_str(), seconds);
    if (!reply) return false;
    bool ok = (reply->type == REDIS_REPLY_INTEGER && reply->integer == 1);
    freeReplyObject(reply);
    return ok;
}

bool RedisClient::incrBy(const std::string& key, int delta) {
    PooledConnection conn(pool_);
    if (!conn) return false;
    redisReply* reply = (redisReply*)redisCommand(conn.get(), "INCRBY %s %d", key.c_str(), delta);
    if (!reply) return false;
    freeReplyObject(reply);
    return true;
}

bool RedisClient::sadd(const std::string& set_key, const std::string& member) {
    PooledConnection conn(pool_);
    if (!conn) return false;
    redisReply* reply = (redisReply*)redisCommand(
        conn.get(), "SADD %s %b", set_key.c_str(), member.c_str(), member.size());
    if (!reply) return false;
    freeReplyObject(reply);
    return true;
}

bool RedisClient::srem(const std::string& set_key, const std::string& member) {
    PooledConnection conn(pool_);
    if (!conn) return false;
    redisReply* reply = (redisReply*)redisCommand(
        conn.get(), "SREM %s %b", set_key.c_str(), member.c_str(), member.size());
    if (!reply) return false;
    freeReplyObject(reply);
    return true;
}

std::vector<std::string> RedisClient::smembers(const std::string& set_key) {
    PooledConnection conn(pool_);
    std::vector<std::string> members;
    if (!conn) return members;
    redisReply* reply = (redisReply*)redisCommand(conn.get(), "SMEMBERS %s", set_key.c_str());
    if (!reply || reply->type != REDIS_REPLY_ARRAY) {
        if (reply) freeReplyObject(reply);
        return members;
    }
    for (size_t i = 0; i < reply->elements; ++i)
        if (reply->element[i]->type == REDIS_REPLY_STRING)
            members.emplace_back(reply->element[i]->str, reply->element[i]->len);
    freeReplyObject(reply);
    return members;
}

bool RedisClient::delSet(const std::string& set_key) {
    auto members = smembers(set_key);
    if (members.empty()) {
        PooledConnection conn(pool_);
        if (!conn) return false;
        redisReply* r = (redisReply*)redisCommand(conn.get(), "DEL %s", set_key.c_str());
        if (r) { freeReplyObject(r); return true; }
        return false;
    }
    PooledConnection conn(pool_);
    if (!conn) return false;
    redisAppendCommand(conn.get(), "MULTI");
    for (const auto& m : members)
        redisAppendCommand(conn.get(), "DEL %s", m.c_str());
    redisAppendCommand(conn.get(), "DEL %s", set_key.c_str());
    redisAppendCommand(conn.get(), "EXEC");
    redisReply* reply = nullptr;
    redisGetReply(conn.get(), (void**)&reply); freeReplyObject(reply);
    for (size_t i = 0; i < members.size(); ++i)
        { redisGetReply(conn.get(), (void**)&reply); if (reply) freeReplyObject(reply); }
    redisGetReply(conn.get(), (void**)&reply); freeReplyObject(reply);
    redisGetReply(conn.get(), (void**)&reply);
    bool ok = (reply && reply->type != REDIS_REPLY_ERROR);
    if (reply) freeReplyObject(reply);
    return ok;
}

bool RedisClient::delByPattern(const std::string& pattern) {
    if (!pool_.isConnected()) return false;
    scanAndDelete(pattern);
    return true;
}

int RedisClient::scanAndDelete(const std::string& pattern, size_t count) {
    int deleted = 0;
    std::string cursor = "0";
    int iters = 0;

    do {
        PooledConnection conn(pool_);
        if (!conn) break;
        redisReply* scan = (redisReply*)redisCommand(
            conn.get(), "SCAN %s MATCH %s COUNT %zu", cursor.c_str(), pattern.c_str(), count);
        if (!scan || scan->type != REDIS_REPLY_ARRAY || scan->elements != 2) {
            if (scan) freeReplyObject(scan);
            break;
        }
        cursor = std::string(scan->element[0]->str);
        redisReply* keys = scan->element[1];
        if (keys->type == REDIS_REPLY_ARRAY && keys->elements > 0) {
            redisAppendCommand(conn.get(), "MULTI");
            for (size_t i = 0; i < keys->elements; ++i)
                redisAppendCommand(conn.get(), "DEL %s", keys->element[i]->str);
            redisAppendCommand(conn.get(), "EXEC");
            redisReply* r = nullptr;
            redisGetReply(conn.get(), (void**)&r); freeReplyObject(r);
            for (size_t i = 0; i < keys->elements; ++i)
                { redisGetReply(conn.get(), (void**)&r); if (r) { deleted += r->integer; freeReplyObject(r); } }
            redisGetReply(conn.get(), (void**)&r);
            if (r) freeReplyObject(r);
        }
        freeReplyObject(scan);
        if (++iters >= 1000) break;
    } while (cursor != "0");

    return deleted;
}

void RedisClient::disconnect() {
    // Pool destructor handles cleanup
}

} // namespace redis
