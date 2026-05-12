// src/tokenizer.hpp
#pragma once

#include <string>
#include <vector>
#include <unordered_map>
#include <memory>

class Tokenizer {
public:
    Tokenizer(const std::string& tokenizerPath);
    
    struct TokenizedInput {
        std::vector<int64_t> input_ids;
        std::vector<int64_t> attention_mask;
        std::vector<int64_t> token_type_ids;
        int sequence_length;
    };
    
    TokenizedInput encode(const std::string& text, int max_length = 128);
    std::vector<TokenizedInput> encode_batch(const std::vector<std::string>& texts, int max_length = 128);
    int getVocabSize() const { return static_cast<int>(vocab_.size()); }
    
private:
    void loadFromTokenizerJson(const std::string& path);
    void loadVocab(const std::string& path);
    std::vector<int64_t> tokenize(const std::string& text);
    
    std::unordered_map<std::string, int64_t> vocab_;
    std::unordered_map<int64_t, std::string> id_to_token_;
    std::string subword_prefix_ = "##";
    int64_t cls_token_id_ = 101;
    int64_t sep_token_id_ = 102;
    int64_t pad_token_id_ = 0;
    int64_t unk_token_id_ = 100;
};