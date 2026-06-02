// include/types.hpp
#pragma once

#include <string>
#include <vector>

namespace keycloak {
    struct UserInfo {
        std::string id;
        std::string email;
        std::string username;
        std::string firstName;
        std::string lastName;
        std::string postgresId;
        std::string clientId;
        std::string role;
        int age = 0;
        bool isValid = false;
        std::string error;
        std::vector<std::string> roles;
    };
}