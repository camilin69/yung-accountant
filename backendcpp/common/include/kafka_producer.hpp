#pragma once

#include <librdkafka/rdkafkacpp.h>
#include <string>
#include <memory>
#include <boost/json.hpp>

namespace kafka {

class Producer {
public:
    Producer(const std::string& brokers);
    ~Producer();
    
    bool produce(const std::string& topic, const boost::json::value& event);
    bool produce(const std::string& topic, const std::string& key, const boost::json::value& event);
    void flush(int timeout_ms = 5000);
    
private:
    std::unique_ptr<RdKafka::Producer> producer_;
    std::string errstr;
};

// Singleton para tener un solo productor en todo el servicio
Producer& getProducer();

} // namespace kafka