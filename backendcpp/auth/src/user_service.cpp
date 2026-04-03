#include "user_service.hpp"
#include "database.hpp"
#include <mongocxx/collection.hpp>
#include <mongocxx/exception/exception.hpp>
#include <bsoncxx/builder/stream/document.hpp>
#include <iostream>
#include <ctime>

bsoncxx::document::value User::toBson() const {
    using bsoncxx::builder::stream::document;
    using bsoncxx::builder::stream::finalize;
    
    document doc{};
    if (!id.empty()) {
        try {
            doc << "_id" << bsoncxx::oid(id);
        } catch (...) {}
    }
    doc << "email" << email
        << "firstName" << firstName
        << "lastName" << lastName
        << "age" << age
        << "clientId" << clientId
        << "role" << role
        << "keycloakId" << keycloakId
        << "createdAt" << createdAt;
    
    return doc << finalize;
}

User User::fromBson(const bsoncxx::document::view& doc) {
    User user;
    
    auto idElem = doc["_id"];
    if (idElem && idElem.type() == bsoncxx::type::k_oid) {
        user.id = idElem.get_oid().value.to_string();
    }
    
    auto emailElem = doc["email"];
    if (emailElem && emailElem.type() == bsoncxx::type::k_string) {
        user.email = emailElem.get_string().value.to_string();
    }
    
    auto firstNameElem = doc["firstName"];
    if (firstNameElem && firstNameElem.type() == bsoncxx::type::k_string) {
        user.firstName = firstNameElem.get_string().value.to_string();
    }
    
    auto lastNameElem = doc["lastName"];
    if (lastNameElem && lastNameElem.type() == bsoncxx::type::k_string) {
        user.lastName = lastNameElem.get_string().value.to_string();
    }
    
    auto ageElem = doc["age"];
    if (ageElem && ageElem.type() == bsoncxx::type::k_int32) {
        user.age = ageElem.get_int32();
    }
    
    auto clientIdElem = doc["clientId"];
    if (clientIdElem && clientIdElem.type() == bsoncxx::type::k_string) {
        user.clientId = clientIdElem.get_string().value.to_string();
    }
    
    auto roleElem = doc["role"];
    if (roleElem && roleElem.type() == bsoncxx::type::k_string) {
        user.role = roleElem.get_string().value.to_string();
    }
    
    auto keycloakIdElem = doc["keycloakId"];
    if (keycloakIdElem && keycloakIdElem.type() == bsoncxx::type::k_string) {
        user.keycloakId = keycloakIdElem.get_string().value.to_string();
    }
    
    auto createdAtElem = doc["createdAt"];
    if (createdAtElem && createdAtElem.type() == bsoncxx::type::k_string) {
        user.createdAt = createdAtElem.get_string().value.to_string();
    }
    
    return user;
}

UserService& UserService::getInstance() {
    static UserService instance;
    return instance;
}

std::optional<bsoncxx::oid> UserService::parseObjectId(const std::string& id) {
    try {
        return bsoncxx::oid(id);
    } catch (...) {
        return std::nullopt;
    }
}

bool UserService::createUser(const User& user, std::string& userId) {
    try {
        auto collection = Database::getInstance().getCollection("users");
        auto doc = user.toBson();
        auto result = collection.insert_one(doc.view());
        
        if (result) {
            auto insertedId = result->inserted_id();
            if (insertedId.type() == bsoncxx::type::k_oid) {
                userId = insertedId.get_oid().value.to_string();
                return true;
            }
        }
        return false;
    } catch (const mongocxx::exception& e) {
        std::cerr << "MongoDB error in createUser: " << e.what() << std::endl;
        return false;
    }
}

std::optional<User> UserService::getUserByEmail(const std::string& email) {
    try {
        auto collection = Database::getInstance().getCollection("users");
        auto filter = bsoncxx::builder::stream::document{} 
            << "email" << email 
            << bsoncxx::builder::stream::finalize;
        
        auto result = collection.find_one(filter.view());
        if (result) {
            return User::fromBson(result->view());
        }
        return std::nullopt;
    } catch (const std::exception& e) {
        std::cerr << "Error in getUserByEmail: " << e.what() << std::endl;
        return std::nullopt;
    }
}

std::optional<User> UserService::getUserById(const std::string& id) {
    try {
        auto oidOpt = parseObjectId(id);
        if (!oidOpt) return std::nullopt;
        
        auto collection = Database::getInstance().getCollection("users");
        auto filter = bsoncxx::builder::stream::document{} 
            << "_id" << *oidOpt 
            << bsoncxx::builder::stream::finalize;
        
        auto result = collection.find_one(filter.view());
        if (result) {
            return User::fromBson(result->view());
        }
        return std::nullopt;
    } catch (const std::exception& e) {
        std::cerr << "Error in getUserById: " << e.what() << std::endl;
        return std::nullopt;
    }
}

std::vector<User> UserService::getAllUsers() {
    std::vector<User> users;
    try {
        auto collection = Database::getInstance().getCollection("users");
        auto cursor = collection.find({});
        
        for (auto&& doc : cursor) {
            users.push_back(User::fromBson(doc));
        }
    } catch (const std::exception& e) {
        std::cerr << "Error in getAllUsers: " << e.what() << std::endl;
    }
    return users;
}

bool UserService::updateUser(const std::string& id, const std::string& firstName, 
                              const std::string& lastName, int age) {
    try {
        auto oidOpt = parseObjectId(id);
        if (!oidOpt) return false;
        
        auto collection = Database::getInstance().getCollection("users");
        auto filter = bsoncxx::builder::stream::document{} 
            << "_id" << *oidOpt 
            << bsoncxx::builder::stream::finalize;
        
        auto update = bsoncxx::builder::stream::document{} 
            << "$set" << bsoncxx::builder::stream::open_document
            << "firstName" << firstName
            << "lastName" << lastName
            << "age" << age
            << bsoncxx::builder::stream::close_document
            << bsoncxx::builder::stream::finalize;
        
        auto result = collection.update_one(filter.view(), update.view());
        return result && result->modified_count() > 0;
    } catch (const std::exception& e) {
        std::cerr << "Error in updateUser: " << e.what() << std::endl;
        return false;
    }
}

std::optional<User> UserService::getUserByKeycloakId(const std::string& keycloakId) {
    try {
        auto collection = Database::getInstance().getCollection("users");
        auto filter = bsoncxx::builder::stream::document{} 
            << "keycloakId" << keycloakId 
            << bsoncxx::builder::stream::finalize;
        
        auto result = collection.find_one(filter.view());
        if (result) {
            return User::fromBson(result->view());
        }
        return std::nullopt;
    } catch (const std::exception& e) {
        std::cerr << "Error in getUserByKeycloakId: " << e.what() << std::endl;
        return std::nullopt;
    }
}

bool UserService::deleteUser(const std::string& id) {
    try {
        auto oidOpt = parseObjectId(id);
        if (!oidOpt) return false;
        
        auto collection = Database::getInstance().getCollection("users");
        auto filter = bsoncxx::builder::stream::document{} 
            << "_id" << *oidOpt 
            << bsoncxx::builder::stream::finalize;
        
        auto result = collection.delete_one(filter.view());
        return result && result->deleted_count() > 0;
    } catch (const std::exception& e) {
        std::cerr << "Error in deleteUser: " << e.what() << std::endl;
        return false;
    }
}

bool UserService::updateKeycloakId(const std::string& id, const std::string& keycloakId) {
    try {
        auto oidOpt = parseObjectId(id);
        if (!oidOpt) return false;
        
        auto collection = Database::getInstance().getCollection("users");
        auto filter = bsoncxx::builder::stream::document{} 
            << "_id" << *oidOpt 
            << bsoncxx::builder::stream::finalize;
        
        auto update = bsoncxx::builder::stream::document{} 
            << "$set" << bsoncxx::builder::stream::open_document
            << "keycloakId" << keycloakId
            << bsoncxx::builder::stream::close_document
            << bsoncxx::builder::stream::finalize;
        
        auto result = collection.update_one(filter.view(), update.view());
        return result && result->modified_count() > 0;
    } catch (const std::exception& e) {
        std::cerr << "Error in updateKeycloakId: " << e.what() << std::endl;
        return false;
    }
}