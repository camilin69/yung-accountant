#include "keycloak_auth.hpp"
#include <iostream>
#include <sstream>
#include <curl/curl.h>
#include <boost/json.hpp>
#include "database.hpp"   
#include <pqxx/pqxx> 

namespace keycloak {
namespace json = boost::json;

// ============================================
// FUNCIÓN GLOBAL (no método de la clase)
// ============================================
std::string getEnv(const std::string& key, const std::string& defaultValue) {
    const char* val = std::getenv(key.c_str());
    return val ? std::string(val) : defaultValue;
}

size_t WriteCallback(void* contents, size_t size, size_t nmemb, std::string* output) {
    size_t total = size * nmemb;
    output->append((char*)contents, total);
    return total;
}

// ============================================
// CONSTRUCTOR
// ============================================

KeycloakClient::KeycloakClient(const std::string& keycloakUrl, const std::string& realm)
    : keycloakUrl_(keycloakUrl), realm_(realm) {
    std::cout << "KeycloakClient initialized: " << keycloakUrl_ << "/realms/" << realm_ << std::endl;
}

// ============================================
// CLIENT SECRETS
// ============================================

std::string KeycloakClient::getClientSecret(const std::string& clientId) {
    if (clientId == "alcaldia-duitama") {
        return getEnv("CLIENT_ALCALDIA_DUITAMA_SECRET", "duitama-secret-2024");
    } else if (clientId == "alcaldia-sogamoso") {
        return getEnv("CLIENT_ALCALDIA_SOGAMOSO_SECRET", "sogamoso-secret-2024");
    } else if (clientId == "alcaldia-tunja") {
        return getEnv("CLIENT_ALCALDIA_TUNJA_SECRET", "tunja-secret-2024");
    }
    return "";
}

// ============================================
// HTTP METHODS
// ============================================

std::string KeycloakClient::httpPost(const std::string& endpoint, const std::string& data) {
    CURL* curl = curl_easy_init();
    if (!curl) return "";
    
    std::string url = keycloakUrl_ + endpoint;
    std::string response;
    
    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, data.c_str());
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 10L);
    
    CURLcode res = curl_easy_perform(curl);
    if (res != CURLE_OK) {
        std::cerr << "CURL POST error: " << curl_easy_strerror(res) << std::endl;
    }
    
    curl_easy_cleanup(curl);
    return response;
}

std::string KeycloakClient::httpPostWithAuth(const std::string& endpoint, const std::string& data, const std::string& token) {
    CURL* curl = curl_easy_init();
    if (!curl) return "";
    
    std::string url = keycloakUrl_ + endpoint;
    std::string response;
    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, "Content-Type: application/json");
    std::string authHeader = "Authorization: Bearer " + token;
    headers = curl_slist_append(headers, authHeader.c_str());
    
    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, data.c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 10L);
    
    curl_easy_perform(curl);
    curl_easy_cleanup(curl);
    curl_slist_free_all(headers);
    
    return response;
}

std::string KeycloakClient::httpGet(const std::string& endpoint, const std::string& token) {
    CURL* curl = curl_easy_init();
    if (!curl) return "";
    
    std::string url = keycloakUrl_ + endpoint;
    std::string response;
    struct curl_slist* headers = nullptr;
    
    if (!token.empty()) {
        std::string authHeader = "Authorization: Bearer " + token;
        headers = curl_slist_append(headers, authHeader.c_str());
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    }
    
    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 10L);
    
    curl_easy_perform(curl);
    curl_easy_cleanup(curl);
    
    if (headers) curl_slist_free_all(headers);
    
    return response;
}

std::string KeycloakClient::httpPut(const std::string& endpoint, const std::string& data, const std::string& token) {
    CURL* curl = curl_easy_init();
    if (!curl) return "";
    
    std::string url = keycloakUrl_ + endpoint;
    std::string response;
    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, "Content-Type: application/json");
    std::string authHeader = "Authorization: Bearer " + token;
    headers = curl_slist_append(headers, authHeader.c_str());
    
    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "PUT");
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, data.c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 10L);
    
    CURLcode res = curl_easy_perform(curl);
    long httpCode = 0;
    curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &httpCode);
    
    curl_easy_cleanup(curl);
    curl_slist_free_all(headers);
    
    if (res == CURLE_OK && (httpCode == 204 || httpCode == 200)) {
        return "success";
    }
    
    std::cerr << "✗ HTTP PUT error: " << httpCode << std::endl;
    return "";
}

std::string KeycloakClient::httpDelete(const std::string& endpoint, const std::string& token) {
    CURL* curl = curl_easy_init();
    if (!curl) return "";
    
    std::string url = keycloakUrl_ + endpoint;
    std::string response;
    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, "Content-Type: application/json");
    std::string authHeader = "Authorization: Bearer " + token;
    headers = curl_slist_append(headers, authHeader.c_str());
    
    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "DELETE");
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 10L);
    
    CURLcode res = curl_easy_perform(curl);
    long httpCode = 0;
    curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &httpCode);
    
    curl_easy_cleanup(curl);
    curl_slist_free_all(headers);
    
    if (res == CURLE_OK && httpCode == 204) {
        return "success";
    }
    
    return "";
}

// ============================================
// ADMIN TOKEN
// ============================================

std::string KeycloakClient::getAdminToken() {
    std::stringstream ss;
    ss << "client_id=admin-cli"
       << "&grant_type=password"
       << "&username=admin"
       << "&password=admin123";
    
    std::string response = httpPost("/realms/master/protocol/openid-connect/token", ss.str());
    
    try {
        json::value jv = json::parse(response);
        if (jv.as_object().contains("access_token")) {
            return std::string(jv.as_object().at("access_token").as_string());
        }
    } catch (const std::exception& e) {
        std::cerr << "Error getting admin token: " << e.what() << std::endl;
    }
    
    return "";
}

// ============================================
// CLIENT HELPERS
// ============================================

std::string KeycloakClient::getClientUuid(const std::string& clientId, const std::string& adminToken) {
    std::string endpoint = "/admin/realms/" + realm_ + "/clients?clientId=" + clientId;
    std::string response = httpGet(endpoint, adminToken);
    
    std::cout << "Buscando cliente UUID para: " << clientId << std::endl;
    std::cout << "Endpoint: " << endpoint << std::endl;
    
    try {
        json::value jv = json::parse(response);
        if (jv.is_array() && jv.as_array().size() > 0) {
            std::string uuid = std::string(jv.as_array()[0].as_object().at("id").as_string());
            std::cout << "  ✓ Client UUID: " << uuid << std::endl;
            return uuid;
        } else {
            std::cout << "  No client found with clientId: " << clientId << std::endl;
        }
    } catch (const std::exception& e) {
        std::cerr << "Error getting client UUID: " << e.what() << std::endl;
        std::cerr << "Response was: " << response << std::endl;
    }
    
    return "";
}

std::string KeycloakClient::getRoleUuid(const std::string& clientUuid, const std::string& roleName, const std::string& adminToken) {
    std::string endpoint = "/admin/realms/" + realm_ + "/clients/" + clientUuid + "/roles";
    std::string response = httpGet(endpoint, adminToken);
    
    std::cout << "Buscando rol: " << roleName << " en cliente UUID: " << clientUuid << std::endl;
    
    try {
        json::value jv = json::parse(response);
        if (jv.is_array()) {
            for (const auto& role : jv.as_array()) {
                std::string currentRoleName = std::string(role.as_object().at("name").as_string());
                std::cout << "  - Rol encontrado: " << currentRoleName << std::endl;
                if (currentRoleName == roleName) {
                    std::string roleUuid = std::string(role.as_object().at("id").as_string());
                    std::cout << "  ✓ Rol UUID: " << roleUuid << std::endl;
                    return roleUuid;
                }
            }
        }
    } catch (const std::exception& e) {
        std::cerr << "Error getting role UUID: " << e.what() << std::endl;
        std::cerr << "Response was: " << response << std::endl;
    }
    
    std::cerr << "Role not found: " << roleName << std::endl;
    return "";
}

void KeycloakClient::assignRole(const std::string& userId, const std::string& clientUuid, 
                                 const std::string& roleUuid, const std::string& adminToken) {
    
    // Primero obtener el nombre del rol
    std::string roleName = "";
    std::string endpoint = "/admin/realms/" + realm_ + "/clients/" + clientUuid + "/roles";
    std::string response = httpGet(endpoint, adminToken);
    
    try {
        json::value jv = json::parse(response);
        if (jv.is_array()) {
            for (const auto& role : jv.as_array()) {
                if (std::string(role.as_object().at("id").as_string()) == roleUuid) {
                    roleName = std::string(role.as_object().at("name").as_string());
                    break;
                }
            }
        }
    } catch (const std::exception& e) {
        std::cerr << "Error getting role name: " << e.what() << std::endl;
    }
    
    if (roleName.empty()) {
        std::cerr << "Could not find role name for UUID: " << roleUuid << std::endl;
        return;
    }
    
    std::string url = keycloakUrl_ + "/admin/realms/" + realm_ + "/users/" + userId + "/role-mappings/clients/" + clientUuid;
    
    json::array rolesArray;
    json::object roleObj;
    roleObj["id"] = roleUuid;
    roleObj["name"] = roleName;
    rolesArray.push_back(roleObj);
    
    std::string rolesJson = json::serialize(rolesArray);
    
    std::cout << "Asignando rol: " << roleName << " (UUID: " << roleUuid << ")" << std::endl;
    std::cout << "URL: " << url << std::endl;
    std::cout << "Body: " << rolesJson << std::endl;
    
    CURL* curl = curl_easy_init();
    if (!curl) return;
    
    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, "Content-Type: application/json");
    std::string authHeader = "Authorization: Bearer " + adminToken;
    headers = curl_slist_append(headers, authHeader.c_str());
    
    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, rolesJson.c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 10L);
    
    CURLcode res = curl_easy_perform(curl);
    long httpCode = 0;
    curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &httpCode);
    
    if (res == CURLE_OK && httpCode == 204) {
        std::cout << "✓ Rol '" << roleName << "' asignado correctamente" << std::endl;
    } else {
        std::cerr << "✗ Error asignando rol: HTTP " << httpCode << std::endl;
        // Obtener respuesta de error
        std::string errorResponse;
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &errorResponse);
        std::cerr << "Response: " << errorResponse << std::endl;
    }
    
    curl_easy_cleanup(curl);
    curl_slist_free_all(headers);
}

// ============================================
// REGISTER USER
// ============================================

bool KeycloakClient::registerUser(const std::string& email,
                                  const std::string& password,
                                  const std::string& firstName,
                                  const std::string& lastName,
                                  int age,
                                  const std::string& clientId,
                                  const std::string& role,
                                  const std::string& postgresId,  // Cambiado
                                  std::string& keycloakId) {
    
    std::string adminToken = getAdminToken();
    if (adminToken.empty()) {
        std::cerr << "Failed to get admin token" << std::endl;
        return false;
    }
    
    // 1. Crear usuario en Keycloak
    json::object userObj;
    userObj["username"] = email;
    userObj["email"] = email;
    userObj["firstName"] = firstName;
    userObj["lastName"] = lastName;
    userObj["enabled"] = true;
    userObj["emailVerified"] = true;
    
    json::object attributes;
    attributes["postgresId"] = json::array({postgresId});  // Cambiado
    attributes["age"] = json::array({std::to_string(age)});
    attributes["clientId"] = json::array({clientId});
    attributes["role"] = json::array({role});
    userObj["attributes"] = attributes;
    
    // Credenciales
    json::array credentials;
    json::object cred;
    cred["type"] = "password";
    cred["value"] = password;
    cred["temporary"] = false;
    credentials.push_back(cred);
    userObj["credentials"] = credentials;
    
    std::string userJson = json::serialize(userObj);
    
    std::string response = httpPostWithAuth("/admin/realms/" + realm_ + "/users", userJson, adminToken);
    
    // Obtener el ID REAL que Keycloak asignó al usuario
    std::string realKeycloakId = getUserIdByEmail(email);
    if (realKeycloakId.empty()) {
        std::cerr << "Failed to get user ID from Keycloak" << std::endl;
        return false;
    }
    
    keycloakId = realKeycloakId;
    
    // Obtener UUID del cliente
    std::string clientUuid = getClientUuid(clientId, adminToken);
    if (clientUuid.empty()) {
        std::cerr << "Client not found: " << clientId << std::endl;
        return false;
    }
    
    // Obtener UUID del rol
    std::string roleUuid = getRoleUuid(clientUuid, role, adminToken);
    if (roleUuid.empty()) {
        std::cerr << "Role not found: " << role << " for client " << clientId << std::endl;
        return false;
    }
    
    // Asignar rol al usuario
    assignRole(realKeycloakId, clientUuid, roleUuid, adminToken);
    
    std::cout << "✓ Usuario registrado en Keycloak: " << email 
              << " | Keycloak ID: " << realKeycloakId
              << " | postgresId: " << postgresId  // Cambiado
              << " | Rol: " << role << std::endl;
    
    return true;
}


// ============================================
// LOGIN
// ============================================

std::string KeycloakClient::login(const std::string& email, 
                                  const std::string& password,
                                  const std::string& clientId,
                                  std::string& refreshToken) { 
    
    std::string clientSecret = getClientSecret(clientId);
    if (clientSecret.empty()) {
        std::cerr << "Client secret not found for: " << clientId << std::endl;
        return "";
    }
    
    std::stringstream ss;
    ss << "client_id=" << clientId
       << "&client_secret=" << clientSecret
       << "&grant_type=password"
       << "&username=" << email
       << "&password=" << password;
    
    std::string response = httpPost("/realms/" + realm_ + "/protocol/openid-connect/token", ss.str());
    
    try {
        json::value jv = json::parse(response);
        auto& obj = jv.as_object();
        
        if (obj.contains("access_token")) {
            if (obj.contains("refresh_token")) {
                refreshToken = std::string(obj.at("refresh_token").as_string());
            }
            std::cout << "✓ Login exitoso para: " << email << " en cliente: " << clientId << std::endl;
            return std::string(obj.at("access_token").as_string());
        }
        
        if (obj.contains("error")) {
            std::cerr << "Keycloak login error: " << obj.at("error_description").as_string() << std::endl;
        }
    } catch (const std::exception& e) {
        std::cerr << "Error parsing login response: " << e.what() << std::endl;
    }
    
    return "";
}

// ============================================
// UPDATE USER IN KEYCLOAK
// ============================================

bool KeycloakClient::updateUserAttributes(const std::string& keycloakId,
                                           const std::string& firstName,
                                           const std::string& lastName,
                                           int age,
                                           const std::string& clientId,
                                           const std::string& role) {
    std::string adminToken = getAdminToken();
    if (adminToken.empty()) {
        std::cerr << "Failed to get admin token" << std::endl;
        return false;
    }
    
    // 1. Obtener los atributos ACTUALES del usuario primero
    std::string currentAttrs = httpGet("/admin/realms/" + realm_ + "/users/" + keycloakId, adminToken);
    
    std::string existingPostgresId;
    try {
        auto jv = json::parse(currentAttrs);
        auto& obj = jv.as_object();
        if (obj.contains("attributes")) {
            auto& attrs = obj.at("attributes").as_object();
            if (attrs.contains("postgresId")) {
                existingPostgresId = std::string(attrs.at("postgresId").as_array()[0].as_string());
            }
        }
    } catch (...) {
        std::cerr << "Could not parse existing attributes" << std::endl;
    }
    
    // 2. Si no se encontró, buscar en BD
    if (existingPostgresId.empty()) {
        try {
            auto& conn = Database::getInstance().getConnection();
            pqxx::work txn(conn);
            auto result = txn.exec_params("SELECT id FROM users WHERE keycloak_id = $1", keycloakId);
            txn.commit();
            if (!result.empty()) {
                existingPostgresId = result[0][0].as<std::string>();
            }
        } catch (const std::exception& e) {
            std::cerr << "Error looking up postgresId: " << e.what() << std::endl;
        }
    }
    
    // 3. Construir atributos PRESERVANDO postgresId
    json::object userObj;
    userObj["firstName"] = firstName;
    userObj["lastName"] = lastName;
    
    json::object attributes;
    if (!existingPostgresId.empty()) {
        attributes["postgresId"] = json::array({existingPostgresId});  // ← PRESERVAR
    }
    attributes["age"] = json::array({std::to_string(age)});
    attributes["clientId"] = json::array({clientId});
    attributes["role"] = json::array({role});
    userObj["attributes"] = attributes;
    
    std::string userJson = json::serialize(userObj);
    std::string endpoint = "/admin/realms/" + realm_ + "/users/" + keycloakId;
    
    std::string response = httpPut(endpoint, userJson, adminToken);
    
    if (!response.empty()) {
        std::cout << "✓ Usuario actualizado en Keycloak: " << keycloakId 
                  << " | role: " << role << " | clientId: " << clientId
                  << " | postgresId: " << (existingPostgresId.empty() ? "NOT FOUND" : "preserved") << std::endl;
        return true;
    }
    
    std::cerr << "✗ Error actualizando atributos del usuario en Keycloak" << std::endl;
    return false;
}

bool KeycloakClient::updateUserRole(const std::string& keycloakId,
                                     const std::string& clientId,
                                     const std::string& oldRole,
                                     const std::string& newRole) {
    std::string adminToken = getAdminToken();
    if (adminToken.empty()) {
        std::cerr << "Failed to get admin token" << std::endl;
        return false;
    }
    
    std::cout << "=== Actualizando rol en Keycloak (FULMINANTE) ===" << std::endl;
    std::cout << "  Usuario: " << keycloakId << std::endl;
    std::cout << "  Cliente: " << clientId << std::endl;
    std::cout << "  Rol nuevo: " << newRole << std::endl;
    
    // 1. Obtener UUID del cliente
    std::string clientUuid = getClientUuid(clientId, adminToken);
    if (clientUuid.empty()) {
        std::cerr << "  ❌ Client not found: " << clientId << std::endl;
        return false;
    }
    std::cout << "  ✓ Client UUID: " << clientUuid << std::endl;
    
    // 2. Obtener UUID del nuevo rol
    std::string newRoleUuid = getRoleUuid(clientUuid, newRole, adminToken);
    if (newRoleUuid.empty()) {
        std::cerr << "  ❌ Role not found: " << newRole << " for client " << clientId << std::endl;
        return false;
    }
    std::cout << "  ✓ New role UUID: " << newRoleUuid << std::endl;
    
    // 3. REMOVER TODOS LOS ROLES DEL USUARIO (de todos los clientes y realm)
    std::cout << "  → Removiendo TODOS los roles existentes..." << std::endl;
    
    // 3.1 Remover roles de realm
    std::string realmRolesEndpoint = "/admin/realms/" + realm_ + "/users/" + keycloakId + "/role-mappings/realm";
    std::string realmRolesResponse = httpGet(realmRolesEndpoint, adminToken);
    
    try {
        json::value jv = json::parse(realmRolesResponse);
        if (jv.is_array() && jv.as_array().size() > 0) {
            std::string rolesJson = json::serialize(jv.as_array());
            
            CURL* curl = curl_easy_init();
            if (curl) {
                struct curl_slist* headers = nullptr;
                headers = curl_slist_append(headers, "Content-Type: application/json");
                std::string authHeader = "Authorization: Bearer " + adminToken;
                headers = curl_slist_append(headers, authHeader.c_str());
                
                curl_easy_setopt(curl, CURLOPT_URL, (keycloakUrl_ + realmRolesEndpoint).c_str());
                curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "DELETE");
                curl_easy_setopt(curl, CURLOPT_POSTFIELDS, rolesJson.c_str());
                curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
                curl_easy_setopt(curl, CURLOPT_TIMEOUT, 10L);
                
                CURLcode res = curl_easy_perform(curl);
                long httpCode = 0;
                curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &httpCode);
                
                curl_easy_cleanup(curl);
                curl_slist_free_all(headers);
                
                if (res == CURLE_OK && httpCode == 204) {
                    std::cout << "    ✓ Roles de realm removidos" << std::endl;
                }
            }
        }
    } catch (const std::exception& e) {
        std::cerr << "    ⚠ Error: " << e.what() << std::endl;
    }
    
    // 3.2 Obtener TODOS los clientes y remover roles de cada uno
    std::string clientsEndpoint = "/admin/realms/" + realm_ + "/clients";
    std::string clientsResponse = httpGet(clientsEndpoint, adminToken);
    
    try {
        json::value jv = json::parse(clientsResponse);
        if (jv.is_array()) {
            for (const auto& client : jv.as_array()) {
                std::string currentClientId = std::string(client.as_object().at("clientId").as_string());
                std::string currentClientUuid = std::string(client.as_object().at("id").as_string());
                
                // Saltar el cliente admin-cli
                if (currentClientId == "admin-cli") continue;
                
                std::string clientRolesEndpoint = "/admin/realms/" + realm_ + "/users/" + keycloakId + "/role-mappings/clients/" + currentClientUuid;
                std::string clientRolesResponse = httpGet(clientRolesEndpoint, adminToken);
                
                try {
                    json::value rolesJv = json::parse(clientRolesResponse);
                    if (rolesJv.is_array() && rolesJv.as_array().size() > 0) {
                        std::string rolesJson = json::serialize(rolesJv.as_array());
                        
                        CURL* curl = curl_easy_init();
                        if (curl) {
                            struct curl_slist* headers = nullptr;
                            headers = curl_slist_append(headers, "Content-Type: application/json");
                            std::string authHeader = "Authorization: Bearer " + adminToken;
                            headers = curl_slist_append(headers, authHeader.c_str());
                            
                            curl_easy_setopt(curl, CURLOPT_URL, (keycloakUrl_ + clientRolesEndpoint).c_str());
                            curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "DELETE");
                            curl_easy_setopt(curl, CURLOPT_POSTFIELDS, rolesJson.c_str());
                            curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
                            curl_easy_setopt(curl, CURLOPT_TIMEOUT, 10L);
                            
                            CURLcode res = curl_easy_perform(curl);
                            long httpCode = 0;
                            curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &httpCode);
                            
                            curl_easy_cleanup(curl);
                            curl_slist_free_all(headers);
                            
                            if (res == CURLE_OK && httpCode == 204) {
                                std::cout << "    ✓ Roles removidos del cliente: " << currentClientId << std::endl;
                            }
                        }
                    }
                } catch (...) {
                    // Ignorar errores
                }
            }
        }
    } catch (const std::exception& e) {
        std::cerr << "    ⚠ Error getting clients: " << e.what() << std::endl;
    }
    
    // 4. Asignar SOLO el nuevo rol
    std::cout << "  → Asignando nuevo rol: " << newRole << " en cliente: " << clientId << std::endl;
    
    json::array rolesArray;
    json::object roleObj;
    roleObj["id"] = newRoleUuid;
    roleObj["name"] = newRole;
    rolesArray.push_back(roleObj);
    
    std::string rolesJson = json::serialize(rolesArray);
    
    std::string clientRolesEndpoint = "/admin/realms/" + realm_ + "/users/" + keycloakId + "/role-mappings/clients/" + clientUuid;
    
    CURL* curl = curl_easy_init();
    if (!curl) return false;
    
    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, "Content-Type: application/json");
    std::string authHeader = "Authorization: Bearer " + adminToken;
    headers = curl_slist_append(headers, authHeader.c_str());
    
    curl_easy_setopt(curl, CURLOPT_URL, (keycloakUrl_ + clientRolesEndpoint).c_str());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, rolesJson.c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 10L);
    
    CURLcode res = curl_easy_perform(curl);
    long httpCode = 0;
    curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &httpCode);
    
    curl_easy_cleanup(curl);
    curl_slist_free_all(headers);
    
    if (res == CURLE_OK && (httpCode == 204 || httpCode == 200)) {
        std::cout << "  ✓ Nuevo rol asignado: " << newRole << std::endl;
        return true;
    }
    
    std::cerr << "  ✗ Error asignando nuevo rol: HTTP " << httpCode << std::endl;
    return false;
}

// ============================================
// DELETE USER FROM KEYCLOAK
// ============================================

bool KeycloakClient::deleteUser(const std::string& keycloakId) {
    std::string adminToken = getAdminToken();
    if (adminToken.empty()) {
        std::cerr << "Failed to get admin token" << std::endl;
        return false;
    }
    
    std::string endpoint = "/admin/realms/" + realm_ + "/users/" + keycloakId;
    std::string response = httpDelete(endpoint, adminToken);
    
    std::cout << "✓ Usuario eliminado de Keycloak: " << keycloakId << std::endl;
    return true;
}


// ============================================
// LOGOUT
// ============================================
bool KeycloakClient::logout(const std::string& refreshToken) {
    if (refreshToken.empty()) {
        std::cerr << "No refresh token provided" << std::endl;
        return false;
    }
    
    std::stringstream ss;
    ss << "client_id=admin-cli"
       << "&refresh_token=" << refreshToken;
    
    std::string response = httpPost("/realms/" + realm_ + "/protocol/openid-connect/logout", ss.str());
    
    std::cout << "✓ Refresh token invalidado" << std::endl;
    return true;
}

bool KeycloakClient::logoutAllSessions(const std::string& userId) {
    std::string adminToken = getAdminToken();
    if (adminToken.empty()) {
        std::cerr << "Failed to get admin token" << std::endl;
        return false;
    }
    
    std::string endpoint = "/admin/realms/" + realm_ + "/users/" + userId + "/logout";
    std::string response = httpPostWithAuth(endpoint, "", adminToken);
    
    std::cout << "✓ Todas las sesiones del usuario cerradas en Keycloak" << std::endl;
    return true;
}


// ============================================
// GET REFRESH TOKEN
// ============================================

std::string KeycloakClient::getRefreshToken(const std::string& email, const std::string& clientId) {
    std::string clientSecret = getClientSecret(clientId);
    if (clientSecret.empty()) {
        return "";
    }
    
    std::stringstream ss;
    ss << "client_id=" << clientId
       << "&client_secret=" << clientSecret
       << "&grant_type=password"
       << "&username=" << email
       << "&password=dummy";  // Necesitamos la contraseña real, mejor guardar refresh token en login
    
    // Mejor: guardar el refresh token durante el login
    return "";
}

// ============================================
// VERIFY TOKEN
// ============================================

UserInfo KeycloakClient::verifyToken(const std::string& token) {
    UserInfo info;
    info.isValid = false;
    
    std::string cleanToken = token;
    if (cleanToken.find("Bearer ") == 0) {
        cleanToken = cleanToken.substr(7);
    }
    
    std::vector<std::string> clients = {"alcaldia-duitama", "alcaldia-sogamoso", "alcaldia-tunja"};
    
    for (const auto& clientId : clients) {
        std::string clientSecret = getClientSecret(clientId);
        if (clientSecret.empty()) continue;
        
        std::stringstream ss;
        ss << "client_id=" << clientId
           << "&client_secret=" << clientSecret
           << "&token=" << cleanToken;
        
        std::string response = httpPost("/realms/" + realm_ + "/protocol/openid-connect/token/introspect", ss.str());
        
        try {
            json::value jv = json::parse(response);
            auto& obj = jv.as_object();
            
            if (obj.contains("active") && obj.at("active").as_bool()) {
                info.isValid = true;
                info.clientId = clientId;
                
                // Campos principales
                if (obj.contains("sub")) info.id = std::string(obj.at("sub").as_string());
                if (obj.contains("email")) info.email = std::string(obj.at("email").as_string());
                if (obj.contains("preferred_username")) info.username = std::string(obj.at("preferred_username").as_string());
                if (obj.contains("given_name")) info.firstName = std::string(obj.at("given_name").as_string());
                if (obj.contains("family_name")) info.lastName = std::string(obj.at("family_name").as_string());
                
                if (obj.contains("postgresId")) {  // Cambiado
                    info.postgresId = std::string(obj.at("postgresId").as_string());
                }
                if (obj.contains("age")) {
                    try {
                        info.age = std::stoi(std::string(obj.at("age").as_string()));
                    } catch (...) {
                        info.age = 0;
                    }
                }
                if (obj.contains("clientId")) {
                    info.clientId = std::string(obj.at("clientId").as_string());
                }
                if (obj.contains("role")) {
                    info.role = std::string(obj.at("role").as_string());
                }
                
                // Roles del realm
                if (obj.contains("realm_access")) {
                    auto& realmAccess = obj.at("realm_access").as_object();
                    if (realmAccess.contains("roles")) {
                        for (const auto& role : realmAccess.at("roles").as_array()) {
                            info.roles.push_back(std::string(role.as_string()));
                        }
                    }
                }
                
                std::cout << "✓ Token válido para: " << info.email 
                          << " | postgresId: " << info.postgresId  // Cambiado
                          << " | role: " << info.role 
                          << " | clientId: " << info.clientId << std::endl;
                return info;
            }
        } catch (const std::exception& e) {
            std::cerr << "Error parsing introspection response: " << e.what() << std::endl;
            continue;
        }
    }
    
    info.error = "Token inválido o expirado";
    return info;
}

std::string KeycloakClient::getUserIdByEmail(const std::string& email) {
    std::string adminToken = getAdminToken();
    if (adminToken.empty()) {
        std::cerr << "Failed to get admin token" << std::endl;
        return "";
    }
    
    std::string endpoint = "/admin/realms/" + realm_ + "/users?email=" + email;
    std::string response = httpGet(endpoint, adminToken);
    
    std::cout << "Buscando usuario por email: " << email << std::endl;
    std::cout << "Response: " << response << std::endl;
    
    try {
        json::value jv = json::parse(response);
        if (jv.is_array() && jv.as_array().size() > 0) {
            auto& user = jv.as_array()[0].as_object();
            if (user.contains("id")) {
                std::string userId = std::string(user.at("id").as_string());
                std::cout << "✓ User ID encontrado: " << userId << " para email: " << email << std::endl;
                return userId;
            }
        }
        std::cerr << "No user found with email: " << email << std::endl;
    } catch (const std::exception& e) {
        std::cerr << "Error getting user ID: " << e.what() << std::endl;
        std::cerr << "Response was: " << response << std::endl;
    }
    
    return "";
}

} // namespace keycloak