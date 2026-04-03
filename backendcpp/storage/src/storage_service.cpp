#include "storage_service.hpp"
#include "database.hpp"
#include <mongocxx/collection.hpp>
#include <bsoncxx/builder/stream/document.hpp>
#include <bsoncxx/builder/stream/array.hpp>
#include <iostream>
#include <ctime>

// ============================================
// WALLET IMPLEMENTATION
// ============================================

bsoncxx::document::value Wallet::toBson() const {
    using bsoncxx::builder::stream::document;
    using bsoncxx::builder::stream::finalize;
    using bsoncxx::builder::stream::open_document;
    using bsoncxx::builder::stream::close_document;
    
    document doc{};
    
    if (!id.empty()) {
        try {
            doc << "_id" << bsoncxx::oid(id);
        } catch (...) {}
    }
    
    doc << "user_id" << user_id
        << "name" << name
        << "type" << type
        << "bank_name" << bank_name
        << "balance" << balance
        << "initial_balance" << initial_balance
        << "currency" << currency
        << "account_number" << account_number
        << "created_at" << created_at
        << "last_updated" << last_updated;
    
    // Metadata como subdocumento
    if (!metadata.empty()) {
        doc << "metadata" << open_document;
        for (const auto& [key, value] : metadata) {
            doc << key << value;
        }
        doc << close_document;
    } else {
        doc << "metadata" << open_document << close_document;
    }
    
    return doc << finalize;
}

Wallet Wallet::fromBson(const bsoncxx::document::view& doc) {
    Wallet wallet;
    
    auto id_elem = doc["_id"];
    if (id_elem && id_elem.type() == bsoncxx::type::k_oid) {
        wallet.id = id_elem.get_oid().value.to_string();
    }
    
    auto user_elem = doc["user_id"];
    if (user_elem && user_elem.type() == bsoncxx::type::k_string) {
        wallet.user_id = user_elem.get_string().value.to_string();
    }
    
    auto name_elem = doc["name"];
    if (name_elem && name_elem.type() == bsoncxx::type::k_string) {
        wallet.name = name_elem.get_string().value.to_string();
    }
    
    auto type_elem = doc["type"];
    if (type_elem && type_elem.type() == bsoncxx::type::k_string) {
        wallet.type = type_elem.get_string().value.to_string();
    }
    
    auto bank_elem = doc["bank_name"];
    if (bank_elem && bank_elem.type() == bsoncxx::type::k_string) {
        wallet.bank_name = bank_elem.get_string().value.to_string();
    }
    
    auto balance_elem = doc["balance"];
    if (balance_elem && balance_elem.type() == bsoncxx::type::k_double) {
        wallet.balance = balance_elem.get_double();
    }
    
    auto initial_elem = doc["initial_balance"];
    if (initial_elem && initial_elem.type() == bsoncxx::type::k_double) {
        wallet.initial_balance = initial_elem.get_double();
    }
    
    auto currency_elem = doc["currency"];
    if (currency_elem && currency_elem.type() == bsoncxx::type::k_string) {
        wallet.currency = currency_elem.get_string().value.to_string();
    }
    
    auto account_elem = doc["account_number"];
    if (account_elem && account_elem.type() == bsoncxx::type::k_string) {
        wallet.account_number = account_elem.get_string().value.to_string();
    }
    
    auto created_elem = doc["created_at"];
    if (created_elem && created_elem.type() == bsoncxx::type::k_string) {
        wallet.created_at = created_elem.get_string().value.to_string();
    }
    
    auto updated_elem = doc["last_updated"];
    if (updated_elem && updated_elem.type() == bsoncxx::type::k_string) {
        wallet.last_updated = updated_elem.get_string().value.to_string();
    }
    
    // Metadata
    auto metadata_elem = doc["metadata"];
    if (metadata_elem && metadata_elem.type() == bsoncxx::type::k_document) {
        auto metadata_view = metadata_elem.get_document().view();
        for (auto&& elem : metadata_view) {
            std::string key = std::string(elem.key());
            if (elem.type() == bsoncxx::type::k_string) {
                wallet.metadata[key] = elem.get_string().value.to_string();
            }
        }
    }
    
    return wallet;
}

// ============================================
// TRANSACTION IMPLEMENTATION
// ============================================

bsoncxx::document::value Transaction::toBson() const {
    using bsoncxx::builder::stream::document;
    using bsoncxx::builder::stream::finalize;
    
    document doc{};
    
    if (!id.empty()) {
        try {
            doc << "_id" << bsoncxx::oid(id);
        } catch (...) {}
    }
    
    doc << "wallet_id" << wallet_id
        << "user_id" << user_id
        << "type" << type
        << "category" << category
        << "amount" << amount
        << "description" << description
        << "date" << date
        << "created_at" << created_at;
    
    return doc << finalize;
}

Transaction Transaction::fromBson(const bsoncxx::document::view& doc) {
    Transaction transaction;
    
    auto id_elem = doc["_id"];
    if (id_elem && id_elem.type() == bsoncxx::type::k_oid) {
        transaction.id = id_elem.get_oid().value.to_string();
    }
    
    auto wallet_elem = doc["wallet_id"];
    if (wallet_elem && wallet_elem.type() == bsoncxx::type::k_string) {
        transaction.wallet_id = wallet_elem.get_string().value.to_string();
    }
    
    auto user_elem = doc["user_id"];
    if (user_elem && user_elem.type() == bsoncxx::type::k_string) {
        transaction.user_id = user_elem.get_string().value.to_string();
    }
    
    auto type_elem = doc["type"];
    if (type_elem && type_elem.type() == bsoncxx::type::k_string) {
        transaction.type = type_elem.get_string().value.to_string();
    }
    
    auto cat_elem = doc["category"];
    if (cat_elem && cat_elem.type() == bsoncxx::type::k_string) {
        transaction.category = cat_elem.get_string().value.to_string();
    }
    
    auto amount_elem = doc["amount"];
    if (amount_elem && amount_elem.type() == bsoncxx::type::k_double) {
        transaction.amount = amount_elem.get_double();
    }
    
    auto desc_elem = doc["description"];
    if (desc_elem && desc_elem.type() == bsoncxx::type::k_string) {
        transaction.description = desc_elem.get_string().value.to_string();
    }
    
    auto date_elem = doc["date"];
    if (date_elem && date_elem.type() == bsoncxx::type::k_string) {
        transaction.date = date_elem.get_string().value.to_string();
    }
    
    auto created_elem = doc["created_at"];
    if (created_elem && created_elem.type() == bsoncxx::type::k_string) {
        transaction.created_at = created_elem.get_string().value.to_string();
    }
    
    return transaction;
}

// ============================================
// STORAGE SERVICE - WALLET METHODS
// ============================================

StorageService& StorageService::getInstance() {
    static StorageService instance;
    return instance;
}

std::optional<bsoncxx::oid> StorageService::parseObjectId(const std::string& id) {
    try {
        return bsoncxx::oid(id);
    } catch (...) {
        return std::nullopt;
    }
}

bool StorageService::createWallet(const Wallet& wallet, std::string& wallet_id) {
    try {
        auto collection = Database::getInstance().getCollection("wallets");
        auto doc = wallet.toBson();
        auto result = collection.insert_one(doc.view());
        
        if (result) {
            auto inserted_id = result->inserted_id();
            if (inserted_id.type() == bsoncxx::type::k_oid) {
                wallet_id = inserted_id.get_oid().value.to_string();
                return true;
            }
        }
        return false;
    } catch (const std::exception& e) {
        std::cerr << "Error creating wallet: " << e.what() << std::endl;
        return false;
    }
}

std::optional<Wallet> StorageService::getWallet(const std::string& id) {
    try {
        auto oid_opt = parseObjectId(id);
        if (!oid_opt) return std::nullopt;
        
        auto collection = Database::getInstance().getCollection("wallets");
        auto filter = bsoncxx::builder::stream::document{} 
            << "_id" << *oid_opt 
            << bsoncxx::builder::stream::finalize;
        
        auto result = collection.find_one(filter.view());
        if (result) {
            return Wallet::fromBson(result->view());
        }
        return std::nullopt;
    } catch (const std::exception& e) {
        std::cerr << "Error getting wallet: " << e.what() << std::endl;
        return std::nullopt;
    }
}

std::vector<Wallet> StorageService::getWalletsByUser(const std::string& user_id) {
    std::vector<Wallet> wallets;
    try {
        auto collection = Database::getInstance().getCollection("wallets");
        auto filter = bsoncxx::builder::stream::document{} 
            << "user_id" << user_id 
            << bsoncxx::builder::stream::finalize;
        
        auto cursor = collection.find(filter.view());
        
        for (auto&& doc : cursor) {
            wallets.push_back(Wallet::fromBson(doc));
        }
    } catch (const std::exception& e) {
        std::cerr << "Error getting wallets by user: " << e.what() << std::endl;
    }
    return wallets;
}

std::vector<Wallet> StorageService::getWalletsByType(const std::string& user_id, const std::string& type) {
    std::vector<Wallet> wallets;
    try {
        auto collection = Database::getInstance().getCollection("wallets");
        auto filter = bsoncxx::builder::stream::document{} 
            << "user_id" << user_id
            << "type" << type
            << bsoncxx::builder::stream::finalize;
        
        auto cursor = collection.find(filter.view());
        
        for (auto&& doc : cursor) {
            wallets.push_back(Wallet::fromBson(doc));
        }
    } catch (const std::exception& e) {
        std::cerr << "Error getting wallets by type: " << e.what() << std::endl;
    }
    return wallets;
}

bool StorageService::updateWallet(const std::string& id, const std::string& name, 
                                   const std::string& type, const std::string& bank_name,
                                   double balance, const std::string& currency,
                                   const std::string& account_number) {
    try {
        auto oid_opt = parseObjectId(id);
        if (!oid_opt) return false;
        
        auto collection = Database::getInstance().getCollection("wallets");
        auto filter = bsoncxx::builder::stream::document{} 
            << "_id" << *oid_opt 
            << bsoncxx::builder::stream::finalize;
        
        auto t = std::time(nullptr);
        std::string last_updated = std::ctime(&t);
        last_updated.pop_back();
        
        auto update = bsoncxx::builder::stream::document{} 
            << "$set" << bsoncxx::builder::stream::open_document
            << "name" << name
            << "type" << type
            << "bank_name" << bank_name
            << "balance" << balance
            << "currency" << currency
            << "account_number" << account_number
            << "last_updated" << last_updated
            << bsoncxx::builder::stream::close_document
            << bsoncxx::builder::stream::finalize;
        
        auto result = collection.update_one(filter.view(), update.view());
        return result && result->modified_count() > 0;
    } catch (const std::exception& e) {
        std::cerr << "Error updating wallet: " << e.what() << std::endl;
        return false;
    }
}

bool StorageService::deleteWallet(const std::string& id) {
    try {
        auto oid_opt = parseObjectId(id);
        if (!oid_opt) return false;
        
        // 1. Eliminar todas las transacciones asociadas a esta wallet
        auto transactions_collection = Database::getInstance().getCollection("transactions");
        auto filter = bsoncxx::builder::stream::document{} 
            << "wallet_id" << id 
            << bsoncxx::builder::stream::finalize;
        
        auto delete_result = transactions_collection.delete_many(filter.view());
        
        if (delete_result) {
            std::cout << "[Storage] Deleted " << delete_result->deleted_count() 
                      << " transactions associated with wallet: " << id << std::endl;
        }
        
        // 2. Eliminar la wallet
        auto wallets_collection = Database::getInstance().getCollection("wallets");
        auto filter_wallet = bsoncxx::builder::stream::document{} 
            << "_id" << *oid_opt 
            << bsoncxx::builder::stream::finalize;
        
        auto result = wallets_collection.delete_one(filter_wallet.view());
        return result && result->deleted_count() > 0;
        
    } catch (const std::exception& e) {
        std::cerr << "Error deleting wallet and its transactions: " << e.what() << std::endl;
        return false;
    }
}

double StorageService::getTotalBalanceByUser(const std::string& user_id) {
    double total = 0.0;
    try {
        auto collection = Database::getInstance().getCollection("wallets");
        auto filter = bsoncxx::builder::stream::document{} 
            << "user_id" << user_id 
            << bsoncxx::builder::stream::finalize;
        
        auto cursor = collection.find(filter.view());
        
        for (auto&& doc : cursor) {
            auto wallet = Wallet::fromBson(doc);
            total += wallet.balance;
        }
    } catch (const std::exception& e) {
        std::cerr << "Error calculating total balance: " << e.what() << std::endl;
    }
    return total;
}

// ============================================
// STORAGE SERVICE - TRANSACTION METHODS
// ============================================

bool StorageService::addTransaction(const Transaction& transaction, std::string& transaction_id) {
    try {
        auto collection = Database::getInstance().getCollection("transactions");
        auto doc = transaction.toBson();
        auto result = collection.insert_one(doc.view());
        
        if (result) {
            auto inserted_id = result->inserted_id();
            if (inserted_id.type() == bsoncxx::type::k_oid) {
                transaction_id = inserted_id.get_oid().value.to_string();
                
                // Actualizar balance de la wallet asociada
                auto wallet = getWallet(transaction.wallet_id);
                if (wallet) {
                    double new_balance = wallet->balance;
                    if (transaction.type == "income") {
                        new_balance = wallet->balance + transaction.amount;
                    } else if (transaction.type == "expense") {
                        new_balance = wallet->balance - transaction.amount;
                    }
                    
                    // Actualizar la wallet con los nuevos valores (manteniendo el resto igual)
                    updateWallet(
                        transaction.wallet_id,
                        wallet->name,
                        wallet->type,
                        wallet->bank_name,
                        new_balance,
                        wallet->currency,
                        wallet->account_number
                    );
                }
                
                return true;
            }
        }
        return false;
    } catch (const std::exception& e) {
        std::cerr << "Error adding transaction: " << e.what() << std::endl;
        return false;
    }
}

std::optional<Transaction> StorageService::getTransactionById(const std::string& id) {
    try {
        auto oid_opt = parseObjectId(id);
        if (!oid_opt) return std::nullopt;
        
        auto collection = Database::getInstance().getCollection("transactions");
        auto filter = bsoncxx::builder::stream::document{} 
            << "_id" << *oid_opt 
            << bsoncxx::builder::stream::finalize;
        
        auto result = collection.find_one(filter.view());
        if (result) {
            return Transaction::fromBson(result->view());
        }
        return std::nullopt;
    } catch (const std::exception& e) {
        std::cerr << "Error getting transaction by ID: " << e.what() << std::endl;
        return std::nullopt;
    }
}

std::vector<Transaction> StorageService::getTransactionsByWallet(const std::string& wallet_id) {
    std::vector<Transaction> transactions;
    try {
        auto collection = Database::getInstance().getCollection("transactions");
        auto filter = bsoncxx::builder::stream::document{} 
            << "wallet_id" << wallet_id 
            << bsoncxx::builder::stream::finalize;
        
        auto cursor = collection.find(filter.view());
        
        for (auto&& doc : cursor) {
            transactions.push_back(Transaction::fromBson(doc));
        }
    } catch (const std::exception& e) {
        std::cerr << "Error getting transactions by wallet: " << e.what() << std::endl;
    }
    return transactions;
}

std::vector<Transaction> StorageService::getTransactionsByUser(const std::string& user_id) {
    std::vector<Transaction> transactions;
    try {
        auto collection = Database::getInstance().getCollection("transactions");
        auto filter = bsoncxx::builder::stream::document{} 
            << "user_id" << user_id 
            << bsoncxx::builder::stream::finalize;
        
        auto cursor = collection.find(filter.view());
        
        for (auto&& doc : cursor) {
            transactions.push_back(Transaction::fromBson(doc));
        }
    } catch (const std::exception& e) {
        std::cerr << "Error getting transactions by user: " << e.what() << std::endl;
    }
    return transactions;
}

std::vector<Transaction> StorageService::getTransactionsByDateRange(const std::string& user_id,
                                                                     const std::string& start_date,
                                                                     const std::string& end_date) {
    std::vector<Transaction> transactions;
    try {
        auto collection = Database::getInstance().getCollection("transactions");
        auto filter = bsoncxx::builder::stream::document{} 
            << "user_id" << user_id
            << "date" << bsoncxx::builder::stream::open_document
            << "$gte" << start_date
            << "$lte" << end_date
            << bsoncxx::builder::stream::close_document
            << bsoncxx::builder::stream::finalize;
        
        auto cursor = collection.find(filter.view());
        
        for (auto&& doc : cursor) {
            transactions.push_back(Transaction::fromBson(doc));
        }
    } catch (const std::exception& e) {
        std::cerr << "Error getting transactions by date range: " << e.what() << std::endl;
    }
    return transactions;
}

bool StorageService::updateTransaction(const std::string& id, const Transaction& transaction) {
    try {
        auto oid_opt = parseObjectId(id);
        if (!oid_opt) return false;
        
        auto collection = Database::getInstance().getCollection("transactions");
        auto filter = bsoncxx::builder::stream::document{} 
            << "_id" << *oid_opt 
            << bsoncxx::builder::stream::finalize;
        
        auto update = bsoncxx::builder::stream::document{} 
            << "$set" << bsoncxx::builder::stream::open_document
            << "type" << transaction.type
            << "category" << transaction.category
            << "amount" << transaction.amount
            << "description" << transaction.description
            << "date" << transaction.date
            << bsoncxx::builder::stream::close_document
            << bsoncxx::builder::stream::finalize;
        
        auto result = collection.update_one(filter.view(), update.view());
        return result && result->modified_count() > 0;
    } catch (const std::exception& e) {
        std::cerr << "Error updating transaction: " << e.what() << std::endl;
        return false;
    }
}

bool StorageService::deleteTransaction(const std::string& id) {
    try {
        auto oid_opt = parseObjectId(id);
        if (!oid_opt) return false;
        
        auto collection = Database::getInstance().getCollection("transactions");
        auto filter = bsoncxx::builder::stream::document{} 
            << "_id" << *oid_opt 
            << bsoncxx::builder::stream::finalize;
        
        auto result = collection.delete_one(filter.view());
        return result && result->deleted_count() > 0;
    } catch (const std::exception& e) {
        std::cerr << "Error deleting transaction: " << e.what() << std::endl;
        return false;
    }
}