// common/include/rate_limiter.hpp — Token-bucket rate limiter
#pragma once

#include <string>
#include <unordered_map>
#include <mutex>
#include <chrono>

namespace security {

class RateLimiter {
public:
    RateLimiter(size_t maxRequests = 100, std::chrono::seconds window = std::chrono::seconds(60))
        : maxRequests_(maxRequests), window_(window) {}

    // Returns true if the request is allowed, false if rate limited
    bool allow(const std::string& key) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto now = std::chrono::steady_clock::now();
        auto& bucket = buckets_[key];

        // Reset window if expired
        if (now - bucket.windowStart > window_) {
            bucket.windowStart = now;
            bucket.count = 0;
        }

        bucket.count++;
        return bucket.count <= maxRequests_;
    }

    // Clean up stale entries periodically
    void cleanup() {
        std::lock_guard<std::mutex> lock(mutex_);
        auto now = std::chrono::steady_clock::now();
        for (auto it = buckets_.begin(); it != buckets_.end(); ) {
            if (now - it->second.windowStart > window_ * 2) {
                it = buckets_.erase(it);
            } else {
                ++it;
            }
        }
    }

    static RateLimiter& instance() {
        static RateLimiter limiter;
        return limiter;
    }

private:
    struct Bucket {
        std::chrono::steady_clock::time_point windowStart{std::chrono::steady_clock::now()};
        size_t count = 0;
    };

    size_t maxRequests_;
    std::chrono::seconds window_;
    std::unordered_map<std::string, Bucket> buckets_;
    std::mutex mutex_;
};

} // namespace security
