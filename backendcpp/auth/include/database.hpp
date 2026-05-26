// database.hpp
#pragma once
#include <iostream>
#include <atomic>
#include <pqxx/pqxx>
#include <string>
#include <memory>
#include <mutex>
#include <queue>
#include <condition_variable>
#include <thread>
#include <chrono>

class ConnectionPool {
public:
    ConnectionPool(const std::string& conn_string, size_t pool_size = 10)
        : conn_string_(conn_string), pool_size_(pool_size), active_connections_(0) {
        for (size_t i = 0; i < pool_size; ++i) {
            try {
                auto conn = std::make_unique<pqxx::connection>(conn_string);
                pool_.push(std::move(conn));
            } catch (const std::exception& e) {
                std::cerr << "[POOL] Failed to create connection: " << e.what() << std::endl;
            }
        }
        std::cout << "[POOL] Created " << pool_.size() << " connections" << std::endl;
    }
    
    ~ConnectionPool() {
        std::lock_guard<std::mutex> lock(mutex_);
        while (!pool_.empty()) {
            pool_.pop();
        }
    }
    
    // Obtener conexión del pool (espera si no hay disponibles)
    std::unique_ptr<pqxx::connection> acquire(int timeout_ms = 5000) {
    std::unique_lock<std::mutex> lock(mutex_);
    
    if (pool_.empty() && active_connections_ >= pool_size_) {
        auto deadline = std::chrono::steady_clock::now() + std::chrono::milliseconds(timeout_ms);
        if (!cv_.wait_until(lock, deadline, [this] { return !pool_.empty(); })) {
            throw std::runtime_error("Connection pool timeout");
        }
    }
    
    if (pool_.empty() && active_connections_ < pool_size_) {
        lock.unlock();
        auto conn = std::make_unique<pqxx::connection>(conn_string_);
        lock.lock();
        active_connections_++;
        return conn;
    }
    
    auto conn = std::move(pool_.front());
    pool_.pop();
    active_connections_++;
    
    // Verificar que la conexion siga viva y reconectar si es necesario
    if (!conn->is_open()) {
        std::cerr << "[POOL] Dead connection detected, reconnecting..." << std::endl;
        try {
            conn = std::make_unique<pqxx::connection>(conn_string_);
        } catch (const std::exception& e) {
            std::cerr << "[POOL] Reconnection failed: " << e.what() << std::endl;
            active_connections_--;
            throw;
        }
    }
    
    return conn;
}
    
    // Devolver conexión al pool
    void release(std::unique_ptr<pqxx::connection> conn) {
        if (!conn) return;
        
        std::lock_guard<std::mutex> lock(mutex_);
        active_connections_--;
        
        // Verificar que la conexión esté sana antes de devolverla
        if (conn->is_open()) {
            pool_.push(std::move(conn));
        } else {
            // Reemplazar conexión muerta
            try {
                pool_.push(std::make_unique<pqxx::connection>(conn_string_));
            } catch (...) {
                // Si no podemos crear una nueva, al menos reducimos el contador
            }
        }
        
        cv_.notify_one();
    }
    
    size_t available() const { return pool_.size(); }
    size_t active() const { return active_connections_; }

private:
    std::string conn_string_;
    size_t pool_size_;
    std::queue<std::unique_ptr<pqxx::connection>> pool_;
    std::mutex mutex_;
    std::condition_variable cv_;
    std::atomic<size_t> active_connections_;
};

class Database {
public:
    static Database& getInstance();
    bool connect(const std::string& host, int port, 
                 const std::string& dbname, 
                 const std::string& user, 
                 const std::string& password);
    bool isConnected() const { return connected_; }

    std::unique_ptr<pqxx::connection> acquireConnection() {
        return pool_->acquire();
    }

    void releaseConnection(std::unique_ptr<pqxx::connection> conn) {
        pool_->release(std::move(conn));
    }
    
    const std::string& getConnectionString() const { return connection_string_; }
    
    
    void disconnect();
    
    Database() = default;
    ~Database() { disconnect(); }
    
private:
    Database(const Database&) = delete;
    Database& operator=(const Database&) = delete;
    
    static std::unique_ptr<Database> instance_;
    static std::once_flag init_flag_;
    
    std::string connection_string_;
    std::unique_ptr<ConnectionPool> pool_;
    bool connected_ = false;
};

class PoolConnection {
public:
    PoolConnection() : conn_(Database::getInstance().acquireConnection()) {}
    ~PoolConnection() { 
        if (conn_) Database::getInstance().releaseConnection(std::move(conn_)); 
    }
    
    pqxx::connection& get() { return *conn_; }
    
    PoolConnection(const PoolConnection&) = delete;
    PoolConnection& operator=(const PoolConnection&) = delete;
    PoolConnection(PoolConnection&&) = default;

private:
    std::unique_ptr<pqxx::connection> conn_;
};