#include "kafka_producer.hpp"
#include <iostream>
#include <cstdlib>

namespace kafka {

class ProducerEventCb : public RdKafka::EventCb {
public:
    void event_cb(RdKafka::Event& event) override {
        switch (event.type()) {
            case RdKafka::Event::EVENT_ERROR:
                std::cerr << "[Kafka ERROR] " << RdKafka::err2str(event.err()) << std::endl;
                break;
            case RdKafka::Event::EVENT_LOG:
                std::cerr << "[Kafka LOG] " << event.str() << std::endl;
                break;
            default:
                break;
        }
    }
};

class DeliveryReportCb : public RdKafka::DeliveryReportCb {
public:
    void dr_cb(RdKafka::Message& message) override {
        if (message.err()) {
            std::cerr << "[Kafka DELIVERY FAILED] " << message.errstr() << std::endl;
        }
    }
};

Producer::Producer(const std::string& brokers) {
    RdKafka::Conf* conf = RdKafka::Conf::create(RdKafka::Conf::CONF_GLOBAL);
    
    conf->set("bootstrap.servers", brokers, errstr);
    
    ProducerEventCb* event_cb = new ProducerEventCb;
    conf->set("event_cb", event_cb, errstr);
    
    DeliveryReportCb* dr_cb = new DeliveryReportCb;
    conf->set("dr_cb", dr_cb, errstr);
    
    // Configurar compresión para mejor rendimiento
    conf->set("compression.type", "snappy", errstr);
    
    producer_.reset(RdKafka::Producer::create(conf, errstr));
    if (!producer_) {
        std::cerr << "[Kafka] Failed to create producer: " << errstr << std::endl;
    } else {
        std::cout << "[Kafka] Producer initialized with broker: " << brokers << std::endl;
    }
    
    delete conf;
}

Producer::~Producer() {
    flush();
}

bool Producer::produce(const std::string& topic, const boost::json::value& event) {
    return produce(topic, "", event);
}

bool Producer::produce(const std::string& topic, const std::string& key, const boost::json::value& event) {
    if (!producer_) return false;
    
    std::string event_str = boost::json::serialize(event);
    
    RdKafka::ErrorCode err = producer_->produce(
        topic, RdKafka::Topic::PARTITION_UA,
        RdKafka::Producer::RK_MSG_COPY,
        const_cast<char*>(event_str.c_str()), event_str.size(),
        key.empty() ? nullptr : key.c_str(), key.size(),
        0, nullptr, nullptr
    );
    
    if (err != RdKafka::ERR_NO_ERROR) {
        std::cerr << "[Kafka] Failed to produce message: " << RdKafka::err2str(err) << std::endl;
        return false;
    }
    
    producer_->poll(0);
    return true;
}

void Producer::flush(int timeout_ms) {
    if (producer_) {
        producer_->flush(timeout_ms);
    }
}

// Singleton
Producer& getProducer() {
    static std::unique_ptr<Producer> instance;
    static std::once_flag init_flag;
    
    std::call_once(init_flag, []() {
        const char* broker = std::getenv("KAFKA_BROKER");
        if (!broker) broker = "kafka:9092";
        instance = std::make_unique<Producer>(broker);
    });
    
    return *instance;
}

} // namespace kafka