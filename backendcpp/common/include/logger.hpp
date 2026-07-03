#pragma once
// ── Simple rotating file logger (max 10MB per log) ─────────────
// Replaces std::cout/cerr with timestamped, level-tagged output
// that auto-rotates when the current log exceeds MAX_LOG_SIZE.

#include <string>
#include <fstream>
#include <mutex>
#include <ctime>
#include <sstream>
#include <iostream>

namespace logger {

constexpr size_t MAX_LOG_SIZE = 10 * 1024 * 1024; // 10 MB

enum class Level { DEBUG, INFO, WARN, ERROR };

class Logger {
public:
    static Logger& instance() {
        static Logger log;
        return log;
    }

    void log(Level level, const std::string& message) {
        std::lock_guard<std::mutex> lock(mutex_);
        rotate_if_needed();
        if (file_.is_open()) {
            file_ << timestamp() << " [" << level_str(level) << "] " << message << std::endl;
        }
        // Also echo ERROR to stderr for Docker/container visibility
        if (level == Level::ERROR) {
            std::cerr << timestamp() << " [ERROR] " << message << std::endl;
        }
    }

    // Convenience methods
    void debug(const std::string& msg) { log(Level::DEBUG, msg); }
    void info(const std::string& msg)  { log(Level::INFO, msg); }
    void warn(const std::string& msg)  { log(Level::WARN, msg); }
    void error(const std::string& msg) { log(Level::ERROR, msg); }

private:
    Logger() : file_(LOG_PATH, std::ios::app) {
        if (!file_.is_open()) {
            std::cerr << "[Logger] WARNING: Could not open log file: " << LOG_PATH << std::endl;
        }
    }

    void rotate_if_needed() {
        if (!file_.is_open()) return;
        file_.seekp(0, std::ios::end);
        if (file_.tellp() >= static_cast<std::streampos>(MAX_LOG_SIZE)) {
            file_.close();
            std::rename(LOG_PATH, (LOG_PATH + ".old").c_str());
            file_.open(LOG_PATH, std::ios::trunc);
        }
    }

    static std::string timestamp() {
        std::time_t now = std::time(nullptr);
        char buf[32];
        std::strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S", std::localtime(&now));
        return std::string(buf);
    }

    static const char* level_str(Level lvl) {
        switch (lvl) {
            case Level::DEBUG: return "DEBUG";
            case Level::INFO:  return "INFO";
            case Level::WARN:  return "WARN";
            case Level::ERROR: return "ERROR";
        }
        return "???";
    }

    // Configurable via LOG_PATH env var; defaults to stderr-only in Docker (no file)
    static std::string logPath() {
        const char* p = std::getenv("LOG_PATH");
        return p ? std::string(p) : "";
    }
    std::ofstream file_;
    std::mutex mutex_;
};

// ── Shortcut macros for convenient use ─────────────────────────
#define LOG_DEBUG(msg) logger::Logger::instance().debug(msg)
#define LOG_INFO(msg)  logger::Logger::instance().info(msg)
#define LOG_WARN(msg)  logger::Logger::instance().warn(msg)
#define LOG_ERROR(msg) logger::Logger::instance().error(msg)

} // namespace logger
