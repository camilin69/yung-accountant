// common/include/redis_client.hpp
#pragma once

#include <hiredis/hiredis.h>
#include <string>
#include <memory>
#include <optional>
#include <functional>
#include <iostream>
#include <boost/json.hpp>
#include <mutex>
#include <vector>
#include <queue>
#include <condition_variable>
#include <chrono>
#include <thread>

namespace redis {

// ── Connection pool ─────────────────────────────────────────────
class RedisPool {
public:
    RedisPool(size_t poolSize = 5) : poolSize_(poolSize) {}

    ~RedisPool() {
        for (auto* ctx : pool_) { if (ctx) redisFree(ctx); }
        pool_.clear();
    }

    bool connect(const std::string& host, int port, const std::string& password = "") {
        std::lock_guard<std::mutex> lock(mutex_);
        for (size_t i = 0; i < poolSize_; ++i) {
            struct timeval timeout = { 3, 0 };
            redisContext* ctx = redisConnectWithTimeout(host.c_str(), port, timeout);
            if (!ctx || ctx->err) {
                if (ctx) redisFree(ctx);
                return false;
            }
            if (!password.empty()) {
                redisReply* reply = (redisReply*)redisCommand(ctx, "AUTH %s", password.c_str());
                if (reply) {
                    if (reply->type == REDIS_REPLY_ERROR) { freeReplyObject(reply); redisFree(ctx); return false; }
                    freeReplyObject(reply);
                }
            }
            pool_.push_back(ctx);
            available_.push(ctx);
        }
        host_ = host; port_ = port; password_ = password;
        connected_ = true;
        return true;
    }

    redisContext* acquire(std::chrono::milliseconds timeout = std::chrono::milliseconds(5000)) {
        std::unique_lock<std::mutex> lock(mutex_);
        if (!cv_.wait_for(lock, timeout, [this] { return !available_.empty(); })) {
            return nullptr;
        }
        auto* ctx = available_.front();
        available_.pop();
        // Health check: reconnect if dead
        if (ctx->err != 0) {
            redisFree(ctx);
            struct timeval tv = { 3, 0 };
            ctx = redisConnectWithTimeout(host_.c_str(), port_, tv);
            if (ctx && !password_.empty()) {
                redisReply* r = (redisReply*)redisCommand(ctx, "AUTH %s", password_.c_str());
                if (r) freeReplyObject(r);
            }
            if (!ctx || ctx->err) return nullptr;
        }
        return ctx;
    }

    void release(redisContext* ctx) {
        std::lock_guard<std::mutex> lock(mutex_);
        available_.push(ctx);
        cv_.notify_one();
    }

    bool isConnected() const { return connected_; }
    size_t poolSize() const { return poolSize_; }

private:
    std::vector<redisContext*> pool_;
    std::queue<redisContext*> available_;
    std::mutex mutex_;
    std::condition_variable cv_;
    size_t poolSize_;
    bool connected_ = false;
    std::string host_, password_;
    int port_ = 6379;
};

// ── RAII connection guard ───────────────────────────────────────
class PooledConnection {
public:
    PooledConnection(RedisPool& pool) : pool_(pool), ctx_(pool.acquire()) {}
    ~PooledConnection() { if (ctx_) pool_.release(ctx_); }

    redisContext* get() { return ctx_; }
    operator bool() const { return ctx_ != nullptr; }

    PooledConnection(const PooledConnection&) = delete;
    PooledConnection& operator=(const PooledConnection&) = delete;

private:
    RedisPool& pool_;
    redisContext* ctx_;
};

// ── Redis client (pooled) ───────────────────────────────────────
class RedisClient {
public:
    static RedisClient& getInstance();

    bool connect(const std::string& host, int port, const std::string& password = "");
    bool isConnected() const { return pool_.isConnected(); }

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
            return set(key, boost::json::serialize(jv), ttl_seconds);
        } catch (const std::exception& e) {
            std::cerr << "[Redis] JSON serialize error: " << e.what() << std::endl;
            return false;
        }
    }

    template<typename T>
    std::optional<T> getJson(const std::string& key) {
        auto value = get(key);
        if (!value) return std::nullopt;
        try {
            return boost::json::value_to<T>(boost::json::parse(*value));
        } catch (const std::exception& e) {
            std::cerr << "[Redis] JSON parse error: " << e.what() << std::endl;
            return std::nullopt;
        }
    }

    bool sadd(const std::string& set_key, const std::string& member);
    bool srem(const std::string& set_key, const std::string& member);
    std::vector<std::string> smembers(const std::string& set_key);
    bool delSet(const std::string& set_key);
    bool delByPattern(const std::string& pattern);

    void disconnect();

private:
    RedisClient() = default;
    ~RedisClient() { disconnect(); }
    RedisClient(const RedisClient&) = delete;
    RedisClient& operator=(const RedisClient&) = delete;

    int scanAndDelete(const std::string& pattern, size_t count = 100);

    RedisPool pool_{5};  // Pool of 5 connections
};

} // namespace redis
