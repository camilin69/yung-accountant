// embedding-onnx/src/embedding_service.hpp
#pragma once

#include <string>
#include <vector>
#include <memory>
#include <onnxruntime_cxx_api.h>
#include "tokenizer.hpp"

class EmbeddingService {
public:
    EmbeddingService(const std::string& modelPath, const std::string& tokenizerPath, int numThreads = 4);
    
    std::vector<float> getEmbedding(const std::string& text);
    std::vector<std::vector<float>> getEmbeddings(const std::vector<std::string>& texts);
    std::vector<float> meanPooling(const std::vector<float>& tokenEmbeddings, 
                                   const std::vector<int64_t>& attentionMask, 
                                   int seqLength, int hiddenSize);
    
    int getDimension() const { return dimension_; }
    int getMaxLength() const { return maxLength_; }
    
private:
    std::unique_ptr<Ort::Env> env_;
    std::unique_ptr<Ort::Session> session_;
    Ort::MemoryInfo memoryInfo_;
    std::unique_ptr<Tokenizer> tokenizer_;
    std::vector<std::string> inputNames_;  
    std::vector<std::string> outputNames_;  
    std::vector<const char*> inputNamesPtr_; 
    std::vector<const char*> outputNamesPtr_;
    int dimension_ = 384;
    int maxLength_ = 128;
    int numThreads_ = 4;
};