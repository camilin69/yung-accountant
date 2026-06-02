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

# ============================================
# 1. Obtener token de administración
# ============================================
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

# ============================================
# 2. Crear realm si no existe
# ============================================
echo "Creando realm: $KEYCLOAK_REALM..."
REALM_EXISTS=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM" \
    -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.realm // empty')

if [ "$REALM_EXISTS" = "$KEYCLOAK_REALM" ]; then
    echo "  ✓ Realm already exists"
else
    curl -s -X POST "$KEYCLOAK_URL/admin/realms" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"realm\": \"$KEYCLOAK_REALM\",
            \"enabled\": true,
            \"displayName\": \"Yung Accountant\",
            \"loginWithEmailAllowed\": true,
            \"registrationAllowed\": false,
            \"resetPasswordAllowed\": true,
            \"rememberMe\": true
        }"
    echo "  ✓ Realm created"
fi

# ============================================
# 3. Configurar tiempos de token EN EL REALM
# ============================================
echo "Configurando tiempos de token..."

curl -s -X PUT "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"realm\": \"$KEYCLOAK_REALM\",
        \"enabled\": true,
        \"accessTokenLifespan\": 1800,
        \"accessTokenLifespanForImplicitFlow\": 900,
        \"ssoSessionIdleTimeout\": 86400,
        \"ssoSessionMaxLifespan\": 604800,
        \"offlineSessionIdleTimeout\": 2592000,
        \"offlineSessionMaxLifespan\": 5184000,
        \"refreshTokenMaxReuse\": 0,
        \"clientSessionIdleTimeout\": 0,
        \"clientSessionMaxLifespan\": 0
    }" > /dev/null

echo "  ✓ Token times configured:"
echo "    - Access Token: 1800s (30 min)"
echo "    - SSO Session Idle: 86400s (24 hours)"
echo "    - SSO Session Max: 604800s (7 days)"

# ============================================
# 4. Crear clientes
# ============================================
create_client() {
    local client_id=$1
    local client_secret=$2
    local client_name=$3
    local client_desc=$4
    
    echo ""
    echo "=========================================="
    echo "Client: $client_name ($client_id)"
    echo "=========================================="
    
    # Verificar si existe
    CLIENT_UUID=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients?clientId=$client_id" \
        -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.[0].id // empty')
    
    if [ -n "$CLIENT_UUID" ]; then
        echo "  ✓ Already exists: $CLIENT_UUID"
    else
        echo "  → Creating..."
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
                \"directAccessGrantsEnabled\": true,
                \"attributes\": {
                    \"access.token.lifespan\": \"1800\",
                    \"client.offline.session.idle.timeout\": \"0\",
                    \"client.offline.session.max.lifespan\": \"0\"
                }
            }" > /dev/null
        
        sleep 2
        
        CLIENT_UUID=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients?clientId=$client_id" \
            -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.[0].id')
        
        if [ -z "$CLIENT_UUID" ] || [ "$CLIENT_UUID" = "null" ]; then
            echo "  ❌ Failed to create client"
            return
        fi
        echo "  ✓ Created: $CLIENT_UUID"
    fi
    
    # Obtener service account user
    SA_USER=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients/$CLIENT_UUID/service-account-user" \
        -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.id // empty')
    echo "  Service Account: ${SA_USER:-N/A}"
    
    # Crear roles
    echo "  → Creating roles..."
    for role in "ama-de-casa" "estudiante" "trabajador"; do
        EXISTS=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients/$CLIENT_UUID/roles/$role" \
            -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.name // empty')
        
        if [ "$EXISTS" = "$role" ]; then
            echo "    - Role '$role' already exists"
        else
            curl -s -X POST "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients/$CLIENT_UUID/roles" \
                -H "Authorization: Bearer $ADMIN_TOKEN" \
                -H "Content-Type: application/json" \
                -d "{\"name\": \"$role\", \"description\": \"Rol $role\"}" > /dev/null
            echo "    - Role '$role' created"
        fi
    done
    
    # Crear mappers
    echo "  → Creating mappers..."
    
    create_mapper() {
        local name=$1
        local attr=$2
        local claim=$3
        
        EXISTS=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients/$CLIENT_UUID/protocol-mappers/models?name=$name" \
            -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.[0].name // empty')
        
        if [ "$EXISTS" = "$name" ]; then
            echo "    - Mapper '$name' already exists"
        else
            curl -s -X POST "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients/$CLIENT_UUID/protocol-mappers/models" \
                -H "Authorization: Bearer $ADMIN_TOKEN" \
                -H "Content-Type: application/json" \
                -d "{
                    \"name\": \"$name\",
                    \"protocol\": \"openid-connect\",
                    \"protocolMapper\": \"oidc-usermodel-attribute-mapper\",
                    \"consentRequired\": false,
                    \"config\": {
                        \"user.attribute\": \"$attr\",
                        \"claim.name\": \"$claim\",
                        \"access.token.claim\": \"true\",
                        \"id.token.claim\": \"true\",
                        \"userinfo.token.claim\": \"true\",
                        \"jsonType.label\": \"String\"
                    }
                }" > /dev/null
            echo "    - Mapper '$name' created"
        fi
    }
    
    create_mapper "postgresId" "postgresId" "postgresId"
    create_mapper "age" "age" "age"
    create_mapper "clientId" "clientId" "clientId"
    create_mapper "role" "role" "role"
    
    echo "  ✓ Client configured: $client_name"
}

# Crear los 3 clientes
create_client "alcaldia-duitama" "$CLIENT_ALCALDIA_DUITAMA_SECRET" "Alcaldía de Duitama" "Servicios para la Alcaldía de Duitama"
create_client "alcaldia-sogamoso" "$CLIENT_ALCALDIA_SOGAMOSO_SECRET" "Alcaldía de Sogamoso" "Servicios para la Alcaldía de Sogamoso"
create_client "alcaldia-tunja" "$CLIENT_ALCALDIA_TUNJA_SECRET" "Alcaldía de Tunja" "Servicios para la Alcaldía de Tunja"

echo ""
echo "=========================================="
echo "=== Initialization Complete ==="
echo "=========================================="
echo "Realm: $KEYCLOAK_REALM"
echo "Access Token: 30 min"
echo "SSO Session: 30 min idle / 24h max"
echo "Clients: alcaldia-duitama, alcaldia-sogamoso, alcaldia-tunja"