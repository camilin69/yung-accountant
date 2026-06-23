#!/bin/bash
set -e

echo "=== Keycloak Initialization ==="

# ── Required: connection & credentials ──────────────────────────
KEYCLOAK_URL="${KEYCLOAK_URL:?KEYCLOAK_URL must be set}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:?KEYCLOAK_REALM must be set}"
KEYCLOAK_ADMIN="${KEYCLOAK_ADMIN:?KEYCLOAK_ADMIN must be set}"
KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:?KEYCLOAK_ADMIN_PASSWORD must be set}"

# ── Required: token lifetimes ───────────────────────────────────
ACCESS_TOKEN_LIFESPAN="${ACCESS_TOKEN_LIFESPAN:?ACCESS_TOKEN_LIFESPAN must be set}"
ACCESS_TOKEN_LIFESPAN_IMPLICIT="${ACCESS_TOKEN_LIFESPAN_IMPLICIT:?ACCESS_TOKEN_LIFESPAN_IMPLICIT must be set}"
SSO_SESSION_IDLE_TIMEOUT="${SSO_SESSION_IDLE_TIMEOUT:?SSO_SESSION_IDLE_TIMEOUT must be set}"
SSO_SESSION_MAX_LIFESPAN="${SSO_SESSION_MAX_LIFESPAN:?SSO_SESSION_MAX_LIFESPAN must be set}"
OFFLINE_SESSION_IDLE_TIMEOUT="${OFFLINE_SESSION_IDLE_TIMEOUT:?OFFLINE_SESSION_IDLE_TIMEOUT must be set}"
OFFLINE_SESSION_MAX_LIFESPAN="${OFFLINE_SESSION_MAX_LIFESPAN:?OFFLINE_SESSION_MAX_LIFESPAN must be set}"
CLIENT_TOKEN_LIFESPAN="${CLIENT_TOKEN_LIFESPAN:?CLIENT_TOKEN_LIFESPAN must be set}"

# ── Required: realm display name ─────────────────────────────────
KEYCLOAK_REALM_DISPLAY_NAME="${KEYCLOAK_REALM_DISPLAY_NAME:?KEYCLOAK_REALM_DISPLAY_NAME must be set}"

# ── Required: role names (space-separated) ───────────────────────
KEYCLOAK_ROLES="${KEYCLOAK_ROLES:?KEYCLOAK_ROLES must be set}"

# ── Required: protocol mapper names (space-separated) ────────────
KEYCLOAK_MAPPERS="${KEYCLOAK_MAPPERS:?KEYCLOAK_MAPPERS must be set}"

# ── Required: client secrets ─────────────────────────────────────
CLIENT_ALCALDIA_DUITAMA_SECRET="${CLIENT_ALCALDIA_DUITAMA_SECRET:?CLIENT_ALCALDIA_DUITAMA_SECRET must be set}"
CLIENT_ALCALDIA_SOGAMOSO_SECRET="${CLIENT_ALCALDIA_SOGAMOSO_SECRET:?CLIENT_ALCALDIA_SOGAMOSO_SECRET must be set}"
CLIENT_ALCALDIA_TUNJA_SECRET="${CLIENT_ALCALDIA_TUNJA_SECRET:?CLIENT_ALCALDIA_TUNJA_SECRET must be set}"

# ── Required: client metadata ────────────────────────────────────
CLIENT_DUITAMA_ID="${CLIENT_DUITAMA_ID:?CLIENT_DUITAMA_ID must be set}"
CLIENT_DUITAMA_NAME="${CLIENT_DUITAMA_NAME:?CLIENT_DUITAMA_NAME must be set}"
CLIENT_DUITAMA_DESC="${CLIENT_DUITAMA_DESC:?CLIENT_DUITAMA_DESC must be set}"
CLIENT_SOGAMOSO_ID="${CLIENT_SOGAMOSO_ID:?CLIENT_SOGAMOSO_ID must be set}"
CLIENT_SOGAMOSO_NAME="${CLIENT_SOGAMOSO_NAME:?CLIENT_SOGAMOSO_NAME must be set}"
CLIENT_SOGAMOSO_DESC="${CLIENT_SOGAMOSO_DESC:?CLIENT_SOGAMOSO_DESC must be set}"
CLIENT_TUNJA_ID="${CLIENT_TUNJA_ID:?CLIENT_TUNJA_ID must be set}"
CLIENT_TUNJA_NAME="${CLIENT_TUNJA_NAME:?CLIENT_TUNJA_NAME must be set}"
CLIENT_TUNJA_DESC="${CLIENT_TUNJA_DESC:?CLIENT_TUNJA_DESC must be set}"

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
            \"displayName\": \"$KEYCLOAK_REALM_DISPLAY_NAME\",
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
        \"accessTokenLifespan\": $ACCESS_TOKEN_LIFESPAN,
        \"accessTokenLifespanForImplicitFlow\": $ACCESS_TOKEN_LIFESPAN_IMPLICIT,
        \"ssoSessionIdleTimeout\": $SSO_SESSION_IDLE_TIMEOUT,
        \"ssoSessionMaxLifespan\": $SSO_SESSION_MAX_LIFESPAN,
        \"offlineSessionIdleTimeout\": $OFFLINE_SESSION_IDLE_TIMEOUT,
        \"offlineSessionMaxLifespan\": $OFFLINE_SESSION_MAX_LIFESPAN,
        \"refreshTokenMaxReuse\": 0,
        \"clientSessionIdleTimeout\": 0,
        \"clientSessionMaxLifespan\": 0
    }" > /dev/null

echo "  ✓ Token times configured:"
echo "    - Access Token: ${ACCESS_TOKEN_LIFESPAN}s"
echo "    - SSO Session Idle: ${SSO_SESSION_IDLE_TIMEOUT}s"
echo "    - SSO Session Max: ${SSO_SESSION_MAX_LIFESPAN}s"

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
                    \"access.token.lifespan\": \"$CLIENT_TOKEN_LIFESPAN\",
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
    for role in $KEYCLOAK_ROLES; do
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

    for mapper in $KEYCLOAK_MAPPERS; do
        create_mapper "$mapper" "$mapper" "$mapper"
    done

    echo "  ✓ Client configured: $client_name"
}

# Crear los 3 clientes
create_client "$CLIENT_DUITAMA_ID"     "$CLIENT_ALCALDIA_DUITAMA_SECRET"  "$CLIENT_DUITAMA_NAME"     "$CLIENT_DUITAMA_DESC"
create_client "$CLIENT_SOGAMOSO_ID"    "$CLIENT_ALCALDIA_SOGAMOSO_SECRET" "$CLIENT_SOGAMOSO_NAME"    "$CLIENT_SOGAMOSO_DESC"
create_client "$CLIENT_TUNJA_ID"       "$CLIENT_ALCALDIA_TUNJA_SECRET"    "$CLIENT_TUNJA_NAME"       "$CLIENT_TUNJA_DESC"

echo ""
echo "=========================================="
echo "=== Initialization Complete ==="
echo "=========================================="
echo "Realm: $KEYCLOAK_REALM"
echo "Access Token: ${ACCESS_TOKEN_LIFESPAN}s"
echo "Clients: $CLIENT_DUITAMA_ID, $CLIENT_SOGAMOSO_ID, $CLIENT_TUNJA_ID"
