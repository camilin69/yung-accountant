// common/include/validators.hpp — Input validation (no keycloak dependency)
#pragma once

#include <string>
#include <regex>
#include <algorithm>
#include <cctype>

namespace security {

struct ValidationResult {
    bool valid = true;
    std::string error;
};

inline ValidationResult validateEmail(const std::string& email) {
    if (email.empty()) return {false, "Email is required"};
    if (email.length() > 254) return {false, "Email too long (max 254 chars)"};
    static const std::regex emailRegex(R"(^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$)");
    if (!std::regex_match(email, emailRegex)) return {false, "Invalid email format"};
    return {true, ""};
}

inline ValidationResult validateString(const std::string& name, const std::string& value,
                                         size_t minLen = 1, size_t maxLen = 255) {
    if (value.length() < minLen) return {false, name + " must be at least " + std::to_string(minLen) + " chars"};
    if (value.length() > maxLen) return {false, name + " too long (max " + std::to_string(maxLen) + " chars)"};
    return {true, ""};
}

inline ValidationResult validateAmount(double amount, double min = 0.01, double max = 999999999.99) {
    if (amount < min) return {false, "Amount must be at least " + std::to_string(min)};
    if (amount > max) return {false, "Amount too large (max " + std::to_string(max) + ")"};
    return {true, ""};
}

inline ValidationResult validateAge(int age, int min = 13, int max = 120) {
    if (age < min) return {false, "Age must be at least " + std::to_string(min)};
    if (age > max) return {false, "Age too large (max " + std::to_string(max) + ")"};
    return {true, ""};
}

inline ValidationResult validateDate(const std::string& date) {
    static const std::regex dateRegex(R"(^\d{4}-\d{2}-\d{2}$)");
    if (!std::regex_match(date, dateRegex)) return {false, "Invalid date format (YYYY-MM-DD)"};
    return {true, ""};
}

inline std::string sanitize(const std::string& input, size_t maxLen = 500) {
    std::string result = input.substr(0, maxLen);
    result.erase(std::remove_if(result.begin(), result.end(),
        [](unsigned char c) { return c < 32 && c != '\n' && c != '\t'; }), result.end());
    return result;
}

} // namespace security
