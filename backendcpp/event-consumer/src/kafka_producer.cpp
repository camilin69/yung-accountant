#include "kafka_producer.hpp"
#include <iostream>

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
    std::string errstr;  // ← DECLARAR errstr AQUÍ
    
    conf->set("bootstrap.servers", brokers, errstr);
    
    ProducerEventCb* event_cb = new ProducerEventCb;
    conf->set("event_cb", event_cb, errstr);
    
    DeliveryReportCb* dr_cb = new DeliveryReportCb;
    conf->set("dr_cb", dr_cb, errstr);
    
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

// ============================================
// CONSUMER IMPLEMENTATION
// ============================================

class ConsumerEventCb : public RdKafka::EventCb {
public:
    void event_cb(RdKafka::Event& event) override {
        switch (event.type()) {
            case RdKafka::Event::EVENT_ERROR:
                std::cerr << "[Kafka Consumer ERROR] " << RdKafka::err2str(event.err()) << std::endl;
                break;
            case RdKafka::Event::EVENT_LOG:
                std::cerr << "[Kafka Consumer LOG] " << event.str() << std::endl;
                break;
            default:
                break;
        }
    }
};

Consumer::Consumer(const std::string& brokers, const std::string& group_id) {
    RdKafka::Conf* conf = RdKafka::Conf::create(RdKafka::Conf::CONF_GLOBAL);
    std::string errstr;  // ← DECLARAR errstr AQUÍ
    
    conf->set("bootstrap.servers", brokers, errstr);
    conf->set("group.id", group_id, errstr);
    conf->set("auto.offset.reset", "earliest", errstr);
    conf->set("enable.auto.commit", "true", errstr);
    
    ConsumerEventCb* event_cb = new ConsumerEventCb;
    conf->set("event_cb", event_cb, errstr);
    
    consumer_.reset(RdKafka::KafkaConsumer::create(conf, errstr));
    if (!consumer_) {
        std::cerr << "[Kafka] Failed to create consumer: " << errstr << std::endl;
    } else {
        std::cout << "[Kafka] Consumer initialized with broker: " << brokers << ", group: " << group_id << std::endl;
    }
    
    delete conf;
}

Consumer::~Consumer() {
    if (consumer_) {
        consumer_->close();
    }
}

bool Consumer::subscribe(const std::vector<std::string>& topics) {
    RdKafka::ErrorCode err = consumer_->subscribe(topics);
    if (err != RdKafka::ERR_NO_ERROR) {
        std::cerr << "[Kafka] Failed to subscribe: " << RdKafka::err2str(err) << std::endl;
        return false;
    }
    std::cout << "[Kafka] Subscribed to topics: ";
    for (const auto& t : topics) std::cout << t << " ";
    std::cout << std::endl;
    return true;
}

boost::json::value Consumer::consume(int timeout_ms) {
    RdKafka::Message* msg = consumer_->consume(timeout_ms);
    
    boost::json::value result;
    
    if (msg->err() == RdKafka::ERR_NO_ERROR) {
        try {
            std::string payload(static_cast<const char*>(msg->payload()), msg->len());
            result = boost::json::parse(payload);
        } catch (const std::exception& e) {
            std::cerr << "[Kafka] Error parsing JSON: " << e.what() << std::endl;
        }
    } else if (msg->err() != RdKafka::ERR__TIMED_OUT) {
        std::cerr << "[Kafka] Consumer error: " << msg->errstr() << std::endl;
    }
    
    delete msg;
    return result;
}

void Consumer::commit() {
    consumer_->commitSync();
}

} // namespace kafka