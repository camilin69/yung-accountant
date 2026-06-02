// embedding-onnx/src/embedding_service.cpp
#include "embedding_service.hpp"
#include <iostream>
#include <cmath>
#include <algorithm>

EmbeddingService::EmbeddingService(const std::string& modelPath, 
                                   const std::string& tokenizerPath, 
                                   int numThreads)
    : memoryInfo_(Ort::MemoryInfo::CreateCpu(OrtArenaAllocator, OrtMemTypeDefault))
    , tokenizer_(std::make_unique<Tokenizer>(tokenizerPath))
    , numThreads_(numThreads) {
    
    env_ = std::make_unique<Ort::Env>(ORT_LOGGING_LEVEL_WARNING, "EmbeddingService");
    
    Ort::SessionOptions sessionOptions;
    sessionOptions.SetIntraOpNumThreads(numThreads_);
    sessionOptions.SetInterOpNumThreads(1);
    sessionOptions.SetGraphOptimizationLevel(GraphOptimizationLevel::ORT_ENABLE_ALL);
    sessionOptions.AddConfigEntry("session.intra_op.allow_spinning", "0");
    sessionOptions.AddConfigEntry("session.inter_op.allow_spinning", "0");
    
    session_ = std::make_unique<Ort::Session>(*env_, modelPath.c_str(), sessionOptions);
    
    Ort::AllocatorWithDefaultOptions allocator;
    
    // Guardar nombres como std::string
    size_t numInputNodes = session_->GetInputCount();
    for (size_t i = 0; i < numInputNodes; i++) {
        auto name = session_->GetInputNameAllocated(i, allocator);
        inputNames_.push_back(std::string(name.get()));
        std::cout << "  Input[" << i << "]: " << name.get() << std::endl;
    }
    
    size_t numOutputNodes = session_->GetOutputCount();
    for (size_t i = 0; i < numOutputNodes; i++) {
        auto name = session_->GetOutputNameAllocated(i, allocator);
        outputNames_.push_back(std::string(name.get()));
        std::cout << "  Output[" << i << "]: " << name.get() << std::endl;
    }
    
    // Convertir a const char* para ONNX Runtime
    for (auto& name : inputNames_) {
        inputNamesPtr_.push_back(name.c_str());
    }
    for (auto& name : outputNames_) {
        outputNamesPtr_.push_back(name.c_str());
    }
    
    std::cout << "Model loaded: " << dimension_ << " dimensions" << std::endl;
}

std::vector<float> EmbeddingService::getEmbedding(const std::string& text) {
    auto batch = getEmbeddings({text});
    return batch.empty() ? std::vector<float>() : batch[0];
}

std::vector<std::vector<float>> EmbeddingService::getEmbeddings(
    const std::vector<std::string>& texts) {
    
    std::vector<std::vector<float>> results;
    
    if (texts.empty()) return results;
    
    // Procesar un texto a la vez porque el modelo espera batch_size=1
    for (const auto& text : texts) {
        std::vector<std::string> single = {text};
        
        try {
            auto tokenized = tokenizer_->encode_batch(single, maxLength_);
            int batchSize = 1;
            int seqLength = static_cast<int>(tokenized[0].input_ids.size());
            
            std::vector<int64_t> shape = {batchSize, seqLength};
            std::vector<int64_t> inputIds = tokenized[0].input_ids;
            std::vector<int64_t> attentionMask = tokenized[0].attention_mask;
            std::vector<int64_t> tokenTypeIds = tokenized[0].token_type_ids;
            
            Ort::Value inputTensor = Ort::Value::CreateTensor<int64_t>(
                memoryInfo_, inputIds.data(), inputIds.size(),
                shape.data(), shape.size());
            
            Ort::Value maskTensor = Ort::Value::CreateTensor<int64_t>(
                memoryInfo_, attentionMask.data(), attentionMask.size(),
                shape.data(), shape.size());
            
            Ort::Value typeTensor = Ort::Value::CreateTensor<int64_t>(
                memoryInfo_, tokenTypeIds.data(), tokenTypeIds.size(),
                shape.data(), shape.size());
            
            std::vector<Ort::Value> inputTensors;
            inputTensors.push_back(std::move(inputTensor));
            inputTensors.push_back(std::move(maskTensor));
            inputTensors.push_back(std::move(typeTensor));
            
            std::vector<const char*> outNames = {outputNamesPtr_[0]};
            
            auto outputTensors = session_->Run(Ort::RunOptions{nullptr},
                inputNamesPtr_.data(), inputTensors.data(), inputTensors.size(),
                outNames.data(), 1);
            
            float* outputData = outputTensors[0].GetTensorMutableData<float>();
            auto outputShape = outputTensors[0].GetTensorTypeAndShapeInfo().GetShape();
            
            int hiddenSize = static_cast<int>(outputShape[2]);
            
            int offset = 0;
            std::vector<float> tokenEmbeddings(
                outputData + offset, 
                outputData + offset + seqLength * hiddenSize);
            
            auto embedding = meanPooling(tokenEmbeddings, tokenized[0].attention_mask, 
                                         tokenized[0].sequence_length, hiddenSize);
            results.push_back(embedding);
            
        } catch (const Ort::Exception& e) {
            std::cerr << "ONNX Error: " << e.what() << std::endl;
            results.push_back(std::vector<float>(384, 0.0f));
        }
    }
    
    return results;
}


std::vector<float> EmbeddingService::meanPooling(
    const std::vector<float>& tokenEmbeddings,
    const std::vector<int64_t>& attentionMask,
    int seqLength, int hiddenSize) {
    
    std::vector<float> pooled(hiddenSize, 0.0f);
    float sumMask = 0.0f;
    
    for (int i = 0; i < seqLength; i++) {
        float mask = static_cast<float>(attentionMask[i]);
        if (mask > 0) {
            for (int j = 0; j < hiddenSize; j++) {
                pooled[j] += tokenEmbeddings[i * hiddenSize + j] * mask;
            }
            sumMask += mask;
        }
    }
    
    if (sumMask > 0) {
        for (int j = 0; j < hiddenSize; j++) {
            pooled[j] /= sumMask;
        }
    }
    
    float norm = 0.0f;
    for (float v : pooled) norm += v * v;
    norm = std::sqrt(norm);
    
    if (norm > 0) {
        for (float& v : pooled) v /= norm;
    }
    
    return pooled;
}