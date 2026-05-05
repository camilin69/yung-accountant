#include <boost/beast/core.hpp>
#include <boost/beast/http.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <boost/json.hpp>
#include <iostream>
#include <memory>
#include <ctime>
#include <vector>
#include <thread>
#include <chrono>
#include "database.hpp"
#include "kafka_producer.hpp"

namespace beast = boost::beast;
namespace http = beast::http;
namespace net = boost::asio;
namespace json = boost::json;
using tcp = net::ip::tcp;

std::unique_ptr<kafka::Consumer> consumer;
std::unique_ptr<kafka::Producer> producer;

// Lista de topics que el consumer debe monitorear
std::vector<std::string> topics = {
    "auth-events",
    "goal-events", 
    "purchase-events",
    "savings-events",
    "storage-events",
    "metrics"
};

void processEvent(const json::value& event) {
    try {
        auto& obj = event.as_object();
        std::string type = std::string(obj.at("type").as_string());
        std::string service = std::string(obj.at("service").as_string());
        std::string user_id = std::string(obj.at("user_id").as_string());
        long timestamp = obj.at("timestamp").as_int64();
        
        // Mostrar en consola
        std::cout << "[EVENT] " << service << "/" << type 
                  << " - User: " << user_id << std::endl;
        
        // Si es un evento importante, generar alerta
        if (type == "login_failed") {
            std::cout << "[ALERT] Failed login attempt for user: " << user_id << std::endl;
            
            // Reenviar a topic de alertas
            json::object alert;
            alert["type"] = type;
            alert["service"] = service;
            alert["user_id"] = user_id;
            alert["timestamp"] = timestamp;
            producer->produce("alerts", alert);
        }
        
        if (type == "goal_achieved") {
            std::cout << "[CONGRATS] User " << user_id << " achieved a goal!" << std::endl;
        }
        
        if (type == "purchase_created" && obj.contains("data")) {
            auto& data = obj.at("data").as_object();
            if (data.contains("amount")) {
                double amount = data.at("amount").as_double();
                if (amount > 1000000) {  // Más de 1 millón
                    std::cout << "[HIGH SPENDING] User " << user_id 
                              << " spent $" << amount << std::endl;
                }
            }
        }
        
    } catch (const std::exception& e) {
        std::cerr << "Error processing event: " << e.what() << std::endl;
    }
}

int main() {
    try {
        const char* kafka_broker = std::getenv("KAFKA_BROKER");
        if (!kafka_broker) kafka_broker = "kafka:9092";
        
        const char* mongo_uri = std::getenv("MONGODB_URI");
        const char* mongo_db = std::getenv("MONGODB_DB");
        
        if (!mongo_uri) mongo_uri = "mongodb://admin:secret123@mongodb:27017";
        if (!mongo_db) mongo_db = "yung-accountant";
        
        // Conectar a MongoDB
        Database::getInstance().connect(mongo_uri, mongo_db);
        
        // Inicializar productor y consumidor
        producer = std::make_unique<kafka::Producer>(kafka_broker);
        consumer = std::make_unique<kafka::Consumer>(kafka_broker, "event-monitor");
        
        // Suscribirse a todos los topics
        consumer->subscribe(topics);
        
        std::cout << "\n========================================" << std::endl;
        std::cout << "Event Consumer started. Listening for events..." << std::endl;
        std::cout << "Topics: ";
        for (const auto& t : topics) std::cout << t << " ";
        std::cout << std::endl;
        std::cout << "========================================\n" << std::endl;
        
        // Loop principal con reconexión automática
        int reconnect_attempts = 0;
        const int max_reconnect_attempts = 10;
        
        while (true) {
            try {
                auto event = consumer->consume(1000);
                if (!event.is_null()) {
                    processEvent(event);
                    reconnect_attempts = 0;
                }
            } catch (const std::exception& e) {
                std::cerr << "[Kafka] Consumer error: " << e.what() << std::endl;
                reconnect_attempts++;
                
                if (reconnect_attempts >= max_reconnect_attempts) {
                    std::cerr << "[Kafka] Max reconnection attempts reached. Exiting..." << std::endl;
                    break;
                }
                
                std::cerr << "[Kafka] Reconnecting in 5 seconds... (attempt " 
                          << reconnect_attempts << "/" << max_reconnect_attempts << ")" << std::endl;
                std::this_thread::sleep_for(std::chrono::seconds(5));
                
                consumer = std::make_unique<kafka::Consumer>(kafka_broker, "event-monitor");
                consumer->subscribe(topics);
            }
        }
        
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }
    
    return 0;
}