// embedding-onnx/src/tokenizer.cpp
#include "tokenizer.hpp"
#include <fstream>
#include <sstream>
#include <algorithm>
#include <iostream>
#include <filesystem>
#include <nlohmann/json.hpp>

using json = nlohmann::json;
namespace fs = std::filesystem;

Tokenizer::Tokenizer(const std::string& tokenizerPath) {
    fs::path path(tokenizerPath);
    std::cout << "Loading tokenizer from: " << tokenizerPath << std::endl;
    
    bool loaded = false;
    
    fs::path jsonPath = path / "tokenizer.json";
    if (fs::exists(jsonPath)) {
        std::cout << "  Found tokenizer.json" << std::endl;
        try {
            loadFromTokenizerJson(jsonPath.string());
            loaded = true;
        } catch (const std::exception& e) {
            std::cerr << " Failed: " << e.what() << std::endl;
        }
    }
    
    if (!loaded) {
        fs::path vocabPath = path / "vocab.txt";
        if (fs::exists(vocabPath)) {
            std::cout << "  Found vocab.txt" << std::endl;
            loadVocab(vocabPath.string());
            loaded = true;
        }
    }
    
    std::cout << "✅ Tokenizer loaded: " << vocab_.size() << " tokens" << std::endl;
}

void Tokenizer::loadFromTokenizerJson(const std::string& path) {
    std::ifstream file(path);
    json jv;
    file >> jv;  // nlohmann::json usa >> para parsear
    
    if (jv.contains("model")) {
        auto& model = jv["model"];
        
        if (model.contains("vocab")) {
            for (auto& [key, value] : model["vocab"].items()) {
                int64_t id = value.get<int64_t>();
                vocab_[key] = id;
                id_to_token_[id] = key;
            }
        }
        
        if (model.contains("unk_token")) {
            std::string unk = model["unk_token"].get<std::string>();
            if (vocab_.count(unk)) unk_token_id_ = vocab_[unk];
        }
    }
    
    if (jv.contains("added_tokens")) {
        for (auto& token : jv["added_tokens"]) {
            std::string content = token["content"].get<std::string>();
            int id = token["id"].get<int>();
            if (content == "[CLS]") cls_token_id_ = id;
            else if (content == "[SEP]") sep_token_id_ = id;
            else if (content == "[PAD]") pad_token_id_ = id;
            else if (content == "[UNK]") unk_token_id_ = id;
        }
    }
    
    if (jv.contains("decoder") && jv["decoder"].contains("prefix")) {
        subword_prefix_ = jv["decoder"]["prefix"].get<std::string>();
    }
}

void Tokenizer::loadVocab(const std::string& path) {
    std::ifstream file(path);
    std::string line;
    int64_t id = 0;
    while (std::getline(file, line)) {
        if (!line.empty() && line.back() == '\r') line.pop_back();
        if (!line.empty()) {
            vocab_[line] = id;
            id_to_token_[id] = line;
            id++;
        }
    }
}

Tokenizer::TokenizedInput Tokenizer::encode(const std::string& text, int max_length) {
    auto tokens = tokenize(text);
    
    // Truncar o padding
    if (static_cast<int>(tokens.size()) > max_length) {
        tokens.resize(max_length);
        tokens.back() = sep_token_id_;
    }
    
    int seq_len = static_cast<int>(tokens.size());
    std::vector<int64_t> attention_mask(seq_len, 1);
    std::vector<int64_t> token_type_ids(seq_len, 0);
    
    // Padding al máximo
    tokens.resize(max_length, pad_token_id_);
    attention_mask.resize(max_length, 0);
    token_type_ids.resize(max_length, 0);
    
    return {tokens, attention_mask, token_type_ids, seq_len};
}

std::vector<Tokenizer::TokenizedInput> Tokenizer::encode_batch(
    const std::vector<std::string>& texts, int max_length) {
    
    std::vector<TokenizedInput> batch;
    
    // Usar el max_length exacto que el modelo espera (128 en este caso)
    int fixed_length = max_length;
    
    for (const auto& text : texts) {
        auto tokens = tokenize(text);
        
        // Truncar si es necesario
        if (static_cast<int>(tokens.size()) > fixed_length) {
            tokens.resize(fixed_length);
            tokens.back() = sep_token_id_;
        }
        
        int seq_len = static_cast<int>(tokens.size());
        
        // Crear vectores de tamano fijo llenos de 0
        std::vector<int64_t> input_ids(fixed_length, pad_token_id_);
        std::vector<int64_t> attention_mask(fixed_length, 0);
        std::vector<int64_t> token_type_ids(fixed_length, 0);
        
        // Copiar tokens reales
        std::copy(tokens.begin(), tokens.end(), input_ids.begin());
        
        // Marcar posiciones validas con 1 en attention_mask
        std::fill(attention_mask.begin(), attention_mask.begin() + seq_len, 1);
        
        batch.push_back({input_ids, attention_mask, token_type_ids, seq_len});
    }
    
    return batch;
}


std::vector<int64_t> Tokenizer::tokenize(const std::string& text) {
    std::vector<int64_t> tokens = {cls_token_id_};  // [CLS]
    
    // Convertir a minúsculas
    std::string lower = text;
    std::transform(lower.begin(), lower.end(), lower.begin(), ::tolower);
    
    // Tokenización por palabras y subpalabras
    std::istringstream iss(lower);
    std::string word;
    
    while (iss >> word) {
        // Buscar la palabra completa primero
        auto it = vocab_.find(word);
        if (it != vocab_.end()) {
            tokens.push_back(it->second);
        } else {
            // Intentar subpalabras con el prefijo (## para BERT)
            bool found = false;
            for (size_t i = 1; i < word.length() && !found; i++) {
                std::string prefix = word.substr(0, word.length() - i);
                std::string suffix = subword_prefix_ + word.substr(word.length() - i);
                
                auto itPref = vocab_.find(prefix);
                auto itSuf = vocab_.find(suffix);
                
                if (itPref != vocab_.end() && itSuf != vocab_.end()) {
                    tokens.push_back(itPref->second);
                    tokens.push_back(itSuf->second);
                    found = true;
                }
            }
            
            if (!found) {
                // Buscar por caracteres individuales
                for (char c : word) {
                    std::string charStr = subword_prefix_ + c;
                    auto itChar = vocab_.find(charStr);
                    if (itChar != vocab_.end()) {
                        tokens.push_back(itChar->second);
                    } else {
                        tokens.push_back(unk_token_id_);
                    }
                }
            }
        }
    }
    
    tokens.push_back(sep_token_id_);  // [SEP]
    return tokens;
}