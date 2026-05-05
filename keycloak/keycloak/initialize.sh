#!/bin/bash
set -e

echo "=== Keycloak Initialization ==="

# Configuración
KEYCLOAK_URL="${KEYCLOAK_URL:-http://keycloak:8080}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-yung-accountant}"
KEYCLOAK_ADMIN="${KEYCLOAK_ADMIN:-admin}"
KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-admin123}"

# Secrets
CLIENT_ALCALDIA_DUITAMA_SECRET="${CLIENT_ALCALDIA_DUITAMA_SECRET:-duitama-secret-2024}"
CLIENT_ALCALDIA_SOGAMOSO_SECRET="${CLIENT_ALCALDIA_SOGAMOSO_SECRET:-sogamoso-secret-2024}"
CLIENT_ALCALDIA_TUNJA_SECRET="${CLIENT_ALCALDIA_TUNJA_SECRET:-tunja-secret-2024}"

echo "Keycloak URL: $KEYCLOAK_URL"
echo "Realm: $KEYCLOAK_REALM"

# 1. Obtener token de administración
echo "Obteniendo token de administración..."
ADMIN_TOKEN=$(curl -s -X POST "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "client_id=admin-cli" \
    -d "username=$KEYCLOAK_ADMIN" \
    -d "password=$KEYCLOAK_ADMIN_PASSWORD" \
    -d "grant_type=password" | jq -r '.access_token')

if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" = "null" ]; then
    echo "❌ Failed to get admin token"
    exit 1
fi

echo "✓ Admin token obtained"

# 2. Crear realm (si no existe)
echo "Creando realm: $KEYCLOAK_REALM..."
curl -s -X POST "$KEYCLOAK_URL/admin/realms" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"realm\": \"$KEYCLOAK_REALM\",
        \"enabled\": true,
        \"displayName\": \"Yung Accountant\",
        \"loginWithEmailAllowed\": true
    }" || echo "  (Realm may already exist)"

# 3. Configurar tiempos de token en el realm
echo "Configurando tiempos de token en el realm..."
curl -s -X PUT "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "accessTokenLifespan": 3600,
        "refreshTokenLifespan": 86400,
        "ssoSessionIdleTimeout": 86400,
        "ssoSessionMaxLifespan": 86400
    }' || echo "  (Config may already exist)"

# Función para crear cliente
create_client() {
    local client_id=$1
    local client_secret=$2
    local client_name=$3
    local client_desc=$4
    
    echo "=========================================="
    echo "Creando cliente: $client_name ($client_id)"
    echo "=========================================="
    
    # Verificar si el cliente ya existe
    EXISTING_CLIENT=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients?clientId=$client_id" \
        -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.[0].id')
    
    if [ "$EXISTING_CLIENT" != "null" ] && [ -n "$EXISTING_CLIENT" ]; then
        echo "  ✓ Client already exists with UUID: $EXISTING_CLIENT"
        CLIENT_UUID=$EXISTING_CLIENT
    else
        # Crear cliente SIN accessTokenLifespan en el body principal
        echo "  → Creating client..."
        curl -s -X POST "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H "Content-Type: application/json" \
            -d "{
                \"clientId\": \"$client_id\",
                \"name\": \"$client_name\",
                \"description\": \"$client_desc\",
                \"enabled\": true,
                \"publicClient\": false,
                \"serviceAccountsEnabled\": true,
                \"secret\": \"$client_secret\",
                \"standardFlowEnabled\": true,
                \"directAccessGrantsEnabled\": true
            }"
        
        sleep 1
        
        # Obtener el UUID del cliente
        echo "  → Obteniendo UUID del cliente..."
        CLIENT_UUID=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients?clientId=$client_id" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H "Content-Type: application/json" | jq -r '.[0].id')
    fi
    
    if [ -z "$CLIENT_UUID" ] || [ "$CLIENT_UUID" = "null" ]; then
        echo "  ❌ Failed to get client UUID for $client_id"
        return
    fi
    
    echo "  ✓ Client UUID: $CLIENT_UUID"
    
    # Configurar tiempos de token específicos para el cliente (usando attributes)
    echo "  → Configurando tiempos de token para el cliente..."
    curl -s -X PUT "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients/$CLIENT_UUID" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"attributes\": {
                \"access.token.lifespan\": \"3600\",
                \"refresh.token.lifespan\": \"86400\"
            }
        }" || echo "  (Token config may already exist)"
    
    # Crear roles
    echo "  → Creando roles dentro del cliente..."
    
    for role in "ama-de-casa" "estudiante" "trabajador"; do
        echo "    - Creando rol: $role"
        curl -s -X POST "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients/$CLIENT_UUID/roles" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H "Content-Type: application/json" \
            -d "{
                \"name\": \"$role\",
                \"description\": \"Rol para $role\"
            }" 2>/dev/null || echo "      (Role may already exist)"
    done
    
    # Crear mappers
    echo "  → Creando mappers para atributos..."
    
    create_mapper() {
        local mapper_name=$1
        local user_attribute=$2
        local claim_name=$3
        
        curl -s -X POST "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients/$CLIENT_UUID/protocol-mappers/models" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H "Content-Type: application/json" \
            -d "{
                \"name\": \"$mapper_name\",
                \"protocol\": \"openid-connect\",
                \"protocolMapper\": \"oidc-usermodel-attribute-mapper\",
                \"consentRequired\": false,
                \"config\": {
                    \"user.attribute\": \"$user_attribute\",
                    \"claim.name\": \"$claim_name\",
                    \"access.token.claim\": \"true\",
                    \"id.token.claim\": \"true\",
                    \"userinfo.token.claim\": \"true\",
                    \"jsonType.label\": \"String\"
                }
            }" 2>/dev/null || echo "      (Mapper may already exist)"
    }
    
    create_mapper "mongoId" "mongoId" "mongoId"
    create_mapper "age" "age" "age"
    create_mapper "clientId" "clientId" "clientId"
    create_mapper "role" "role" "role"
    
    echo "  ✓ Cliente configurado: $client_name"
    echo ""
}

# Crear los 3 clientes
create_client "alcaldia-duitama" "$CLIENT_ALCALDIA_DUITAMA_SECRET" "Alcaldía de Duitama" "Servicios para la Alcaldía de Duitama"
create_client "alcaldia-sogamoso" "$CLIENT_ALCALDIA_SOGAMOSO_SECRET" "Alcaldía de Sogamoso" "Servicios para la Alcaldía de Sogamoso"
create_client "alcaldia-tunja" "$CLIENT_ALCALDIA_TUNJA_SECRET" "Alcaldía de Tunja" "Servicios para la Alcaldía de Tunja"

echo ""
echo "=== Keycloak initialization completed! ==="
echo "Configuración:"
echo "  - Access token lifespan: 3600s (1 hora)"
echo "  - Refresh token lifespan: 86400s (24 horas)"
echo ""
echo "Clientes creados:"
echo "  ✓ alcaldia-duitama"
echo "  ✓ alcaldia-sogamoso"
echo "  ✓ alcaldia-tunja"