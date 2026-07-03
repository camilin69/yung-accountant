// common/include/security.hpp — RBAC helpers (needs keycloak_auth.hpp)
#pragma once

#include "keycloak_auth.hpp"
#include <vector>
#include <algorithm>

namespace security {

inline bool hasRole(const keycloak::UserInfo& user, const std::vector<std::string>& required) {
    for (const auto& r : required) {
        if (std::find(user.roles.begin(), user.roles.end(), r) != user.roles.end())
            return true;
        if (user.role == r) return true;
    }
    return false;
}

inline bool isAdmin(const keycloak::UserInfo& user) {
    return hasRole(user, {"admin", "administrador"});
}

inline bool isTrabajador(const keycloak::UserInfo& user) {
    return hasRole(user, {"trabajador"});
}

} // namespace security
