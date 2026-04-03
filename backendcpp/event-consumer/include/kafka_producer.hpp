#pragma once

#include <librdkafka/rdkafkacpp.h>
#include <string>
#include <memory>
#include <vector>
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
};

class Consumer {
public:
    Consumer(const std::string& brokers, const std::string& group_id);
    ~Consumer();
    
    bool subscribe(const std::vector<std::string>& topics);
    boost::json::value consume(int timeout_ms = 1000);
    void commit();
    
private:
    std::unique_ptr<RdKafka::KafkaConsumer> consumer_;
};

} // namespace kafka