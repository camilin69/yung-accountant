// src/main.cpp
#include "embedding_service.hpp"
#include "http_server.hpp"
#include <iostream>
#include <vector>
#include <chrono>
#include <cstdlib>
#include <nlohmann/json.hpp>
#include <signal.h>

using json = nlohmann::json;

// Variable global para el servidor
EmbeddingHttpServer* g_server = nullptr;

void signalHandler(int signum) {
    std::cout << "Received signal " << signum << ", shutting down..." << std::endl;
    if (g_server) {
        g_server->stop();
    }
    exit(0);
}

int main(int argc, char* argv[]) {
    signal(SIGINT, signalHandler);
    signal(SIGTERM, signalHandler);
    
    try {
        const char* modelPath = std::getenv("MODEL_PATH") ? 
                                std::getenv("MODEL_PATH") : "/app/models/model.onnx";
        const char* tokenizerPath = std::getenv("TOKENIZER_PATH") ? 
                                     std::getenv("TOKENIZER_PATH") : "/app/models/tokenizer";
        const char* portStr = std::getenv("PORT") ? std::getenv("PORT") : "8090";
        const char* threadsStr = std::getenv("NUM_THREADS") ? std::getenv("NUM_THREADS") : "4";
        
        unsigned short port = static_cast<unsigned short>(std::stoi(portStr));
        int numThreads = std::stoi(threadsStr);
        
        std::cout << "Embedding Service (ONNX Runtime)" << std::endl;
        
        EmbeddingService service(modelPath, tokenizerPath, numThreads);
        
        auto handler = [&service](const json& request) -> json {
            json response;
            
            try {
                if (!request.contains("texts") || !request["texts"].is_array()) {
                    response["error"] = "Missing or invalid 'texts' field";
                    return response;
                }
                
                std::vector<std::string> texts;
                for (const auto& t : request["texts"]) {
                    texts.push_back(t.get<std::string>());
                }
                
                auto start = std::chrono::high_resolution_clock::now();
                auto embeddings = service.getEmbeddings(texts);
                auto end = std::chrono::high_resolution_clock::now();
                
                json arr = json::array();
                for (const auto& emb : embeddings) {
                    arr.push_back(emb);
                }
                
                auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
                
                response["embeddings"] = arr;
                response["dimensions"] = service.getDimension();
                response["model"] = "all-MiniLM-L6-v2";
                response["processing_time_ms"] = duration.count();
                response["batch_size"] = texts.size();
                
            } catch (const std::exception& e) {
                response["error"] = std::string("Error: ") + e.what();
            } catch (...) {
                response["error"] = "Unknown error";
            }
            
            return response;
        };
        
        EmbeddingHttpServer server("0.0.0.0", port, handler);
        g_server = &server;
        server.run();
        
    } catch (const std::exception& e) {
        std::cerr << "Fatal error: " << e.what() << std::endl;
        return 1;
    }
    
    return 0;
}