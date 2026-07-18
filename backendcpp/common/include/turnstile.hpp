// common/include/turnstile.hpp
// Cloudflare Turnstile server-side verification.
// Fail-open when TURNSTILE_SECRET_KEY is unset (local dev).
// Fail-closed on network error (production).

#pragma once

#include <string>
#include <sstream>
#include <iostream>
#include <cstdlib>
#include <curl/curl.h>
#include <boost/json.hpp>

namespace security {

struct TurnstileResult {
    bool success = false;
    std::string errorCodes;
};

namespace detail {
    inline size_t turnstileWriteCallback(void* contents, size_t size, size_t nmemb, std::string* out) {
        size_t total = size * nmemb;
        out->append(static_cast<char*>(contents), total);
        return total;
    }
} // namespace detail

inline TurnstileResult verifyTurnstile(const std::string& token, const std::string& remoteIp = "") {
    TurnstileResult result;

    // Empty token = no widget interaction = reject
    if (token.empty()) {
        result.success = false;
        result.errorCodes = "token-empty";
        return result;
    }

    // Graceful: allow all requests when secret key is not configured (local dev)
    const char* secret = std::getenv("TURNSTILE_SECRET_KEY");
    if (!secret || !secret[0]) {
        std::cerr << "[Turnstile] TURNSTILE_SECRET_KEY not set — allowing request" << std::endl;
        result.success = true;
        return result;
    }

    CURL* curl = curl_easy_init();
    if (!curl) {
        result.success = false;
        result.errorCodes = "curl-init-failed";
        return result;
    }

    // Build form-urlencoded body: secret=...&response=...&remoteip=...
    std::string data = "secret=" + std::string(secret) + "&response=" + token;
    if (!remoteIp.empty()) {
        data += "&remoteip=" + remoteIp;
    }

    std::string response;
    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, "Content-Type: application/x-www-form-urlencoded");

    curl_easy_setopt(curl, CURLOPT_URL, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, data.c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, detail::turnstileWriteCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 5L);
    curl_easy_setopt(curl, CURLOPT_CONNECTTIMEOUT, 3L);

    CURLcode res = curl_easy_perform(curl);
    if (res != CURLE_OK) {
        std::cerr << "[Turnstile] CURL error: " << curl_easy_strerror(res) << std::endl;
        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);
        // Fail closed: network error = reject the request
        result.success = false;
        result.errorCodes = "curl-error-" + std::to_string(static_cast<int>(res));
        return result;
    }

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);

    // Parse JSON response: {"success": true/false, "error-codes": [...], "challenge_ts": "...", "hostname": "..."}
    try {
        auto jv = boost::json::parse(response);
        auto& obj = jv.as_object();
        result.success = obj["success"].as_bool();

        if (!result.success && obj.contains("error-codes")) {
            std::ostringstream oss;
            auto& codes = obj["error-codes"].as_array();
            for (size_t i = 0; i < codes.size(); ++i) {
                if (i > 0) oss << ", ";
                oss << codes[i].as_string();
            }
            result.errorCodes = oss.str();
            std::cerr << "[Turnstile] Verification failed: " << result.errorCodes << std::endl;
        }
    } catch (const std::exception& e) {
        std::cerr << "[Turnstile] JSON parse error: " << e.what() << std::endl;
        result.success = false;
        result.errorCodes = "parse-error";
    }

    return result;
}

} // namespace security
