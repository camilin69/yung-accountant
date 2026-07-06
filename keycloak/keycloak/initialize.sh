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

# ── Frontend web client ────────────────────────────────────────────
FRONTEND_CLIENT_ID="${FRONTEND_CLIENT_ID:?FRONTEND_CLIENT_ID must be set}"
FRONTEND_CLIENT_NAME="${FRONTEND_CLIENT_NAME:?FRONTEND_CLIENT_NAME must be set}"
FRONTEND_CLIENT_DESC="${FRONTEND_CLIENT_DESC:?FRONTEND_CLIENT_DESC must be set}"

# ── Google OAuth ───────────────────────────────────────────────────
GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-}"
GOOGLE_CLIENT_SECRET="${GOOGLE_CLIENT_SECRET:-}"

# ── SMTP (Resend) ───────────────────────────────────────────────────
KC_SMTP_HOST="${KC_SMTP_HOST:?KC_SMTP_HOST must be set}"
KC_SMTP_PORT="${KC_SMTP_PORT:?KC_SMTP_PORT must be set}"
KC_SMTP_FROM="${KC_SMTP_FROM:?KC_SMTP_FROM must be set}"
KC_SMTP_FROM_DISPLAY_NAME="${KC_SMTP_FROM_DISPLAY_NAME:?KC_SMTP_FROM_DISPLAY_NAME must be set}"
KC_SMTP_USER="${KC_SMTP_USER:?KC_SMTP_USER must be set}"
KC_SMTP_PASSWORD="${KC_SMTP_PASSWORD:?KC_SMTP_PASSWORD must be set}"

# ── Brute force ────────────────────────────────────────────────────
BRUTE_FORCE_MAX_FAILURES="${BRUTE_FORCE_MAX_FAILURES:-10}"

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
# 3b. Configurar Brute Force Detection
# ============================================
echo ""
echo "Configuring brute force detection (max ${BRUTE_FORCE_MAX_FAILURES} attempts)..."

curl -s -X PUT "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"realm\": \"$KEYCLOAK_REALM\",
        \"bruteForceProtected\": true,
        \"permanentLockout\": false,
        \"failureFactor\": ${BRUTE_FORCE_MAX_FAILURES},
        \"waitIncrementSeconds\": 60,
        \"quickLoginCheckMilliSeconds\": 1000,
        \"minimumQuickLoginWaitSeconds\": 60,
        \"maxFailureWaitSeconds\": 900,
        \"maxDeltaTimeSeconds\": 43200
    }" > /dev/null

echo "  ✓ Brute force enabled: ${BRUTE_FORCE_MAX_FAILURES} max failures"

# ============================================
# 3c. Configurar SMTP (Resend)
# ============================================
echo ""
echo "Configuring SMTP (Resend — noreply@yung-accountant.com)..."

curl -s -X PUT "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"realm\": \"$KEYCLOAK_REALM\",
        \"smtpServer\": {
            \"host\": \"$KC_SMTP_HOST\",
            \"port\": \"$KC_SMTP_PORT\",
            \"from\": \"$KC_SMTP_FROM\",
            \"fromDisplayName\": \"$KC_SMTP_FROM_DISPLAY_NAME\",
            \"replyTo\": \"noreply@yung-accountant.com\",
            \"replyToDisplayName\": \"Yung Accountant\",
            \"auth\": true,
            \"starttls\": true,
            \"ssl\": false,
            \"user\": \"$KC_SMTP_USER\",
            \"password\": \"$KC_SMTP_PASSWORD\"
        }
    }" > /dev/null

echo "  ✓ SMTP configured: $KC_SMTP_FROM via $KC_SMTP_HOST:$KC_SMTP_PORT"

# ============================================
# 3d. Configurar Google Identity Provider
# ============================================
echo ""
echo "Configuring Google Identity Provider..."

# Duplicate the built-in "first broker login" flow and disable the
# Review Profile step so Google users are auto-created without any form.
echo "  → Creating 'google broker' flow (first broker login minus Review Profile)..."
GB_FLOW_EXISTS=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/authentication/flows" \
    -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.[] | select(.alias=="google broker") | .alias // empty')
if [ "$GB_FLOW_EXISTS" != "google broker" ]; then
    # Copy the built-in "first broker login" flow
    curl -s -X POST "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/authentication/flows/first%20broker%20login/copy" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"newName\":\"google broker\"}" > /dev/null
    sleep 1

    # Find the Review Profile execution and disable it
    GB_FLOW_ID=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/authentication/flows" \
        -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.[] | select(.alias=="google broker") | .id')
    if [ -n "$GB_FLOW_ID" ] && [ "$GB_FLOW_ID" != "null" ]; then
        REVIEW_EXEC_ID=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/authentication/flows/$GB_FLOW_ID/executions" \
            -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.[] | select(.displayName=="Review Profile") | .id // empty')
        if [ -n "$REVIEW_EXEC_ID" ] && [ "$REVIEW_EXEC_ID" != "null" ]; then
            curl -s -X PUT "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/authentication/flows/$GB_FLOW_ID/executions" \
                -H "Authorization: Bearer $ADMIN_TOKEN" \
                -H "Content-Type: application/json" \
                -d "{\"id\":\"$REVIEW_EXEC_ID\",\"requirement\":\"DISABLED\"}" > /dev/null
            echo "    ✓ 'google broker' flow created (Review Profile → DISABLED)"
        fi
    fi
else
    echo "    ✓ 'google broker' flow already exists"
    # Make sure Review Profile is still disabled (previous run may have missed it)
    GB_FLOW_ID=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/authentication/flows" \
        -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.[] | select(.alias=="google broker") | .id')
    if [ -n "$GB_FLOW_ID" ] && [ "$GB_FLOW_ID" != "null" ]; then
        REVIEW_EXEC_ID=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/authentication/flows/$GB_FLOW_ID/executions" \
            -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.[] | select(.displayName=="Review Profile") | .id // empty')
        if [ -n "$REVIEW_EXEC_ID" ] && [ "$REVIEW_EXEC_ID" != "null" ]; then
            REQUIREMENT=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/authentication/flows/$GB_FLOW_ID/executions" \
                -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.[] | select(.displayName=="Review Profile") | .requirement // empty')
            if [ "$REQUIREMENT" != "DISABLED" ]; then
                curl -s -X PUT "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/authentication/flows/$GB_FLOW_ID/executions" \
                    -H "Authorization: Bearer $ADMIN_TOKEN" \
                    -H "Content-Type: application/json" \
                    -d "{\"id\":\"$REVIEW_EXEC_ID\",\"requirement\":\"DISABLED\"}" > /dev/null
                echo "    ✓ 'google broker' flow: Review Profile → DISABLED"
            fi
        fi
    fi
fi

if [ -n "$GOOGLE_CLIENT_ID" ] && [ -n "$GOOGLE_CLIENT_SECRET" ]; then
    # Check if Google IdP already exists
    GOOGLE_IDP_ALIAS=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/identity-provider/instances" \
        -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.[] | select(.alias=="google") | .alias // empty')

    if [ "$GOOGLE_IDP_ALIAS" = "google" ]; then
        # Update existing Google IdP
        curl -s -X PUT "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/identity-provider/instances/google" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H "Content-Type: application/json" \
            -d "{
                \"alias\": \"google\",
                \"providerId\": \"google\",
                \"enabled\": true,
                \"trustEmail\": true,
                \"storeToken\": false,
                \"addReadTokenRoleOnCreate\": false,
                \"authenticateByDefault\": false,
                \"linkOnly\": false,
                \"firstBrokerLoginFlowAlias\": \"google broker\",
                \"config\": {
                    \"clientId\": \"$GOOGLE_CLIENT_ID\",
                    \"clientSecret\": \"$GOOGLE_CLIENT_SECRET\",
                    \"defaultScope\": \"openid profile email\",
                    \"syncMode\": \"FORCE\",
                    \"useJwksUrl\": \"true\"
                }
            }" > /dev/null
        echo "  ✓ Google IdP updated"
    else
        # Create Google IdP
        curl -s -X POST "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/identity-provider/instances" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H "Content-Type: application/json" \
            -d "{
                \"alias\": \"google\",
                \"providerId\": \"google\",
                \"enabled\": true,
                \"trustEmail\": true,
                \"storeToken\": false,
                \"addReadTokenRoleOnCreate\": false,
                \"authenticateByDefault\": false,
                \"linkOnly\": false,
                \"firstBrokerLoginFlowAlias\": \"google broker\",
                \"config\": {
                    \"clientId\": \"$GOOGLE_CLIENT_ID\",
                    \"clientSecret\": \"$GOOGLE_CLIENT_SECRET\",
                    \"defaultScope\": \"openid profile email\",
                    \"syncMode\": \"FORCE\",
                    \"useJwksUrl\": \"true\"
                }
            }" > /dev/null
        echo "  ✓ Google IdP created"
    fi
else
    echo "  ⚠️  GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set — skipping Google IdP"
fi

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
        # Update redirect URIs (needed for Google OAuth callback)
        curl -s -X PUT "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients/$CLIENT_UUID" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H "Content-Type: application/json" \
            -d "{
                \"clientId\": \"$client_id\",
                \"redirectUris\": [
                    \"http://localhost:8081/auth/google/callback\",
                    \"https://yung-accountant-back.duckdns.org/auth/google/callback\"
                ]
            }" > /dev/null
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
                \"redirectUris\": [
                    \"http://localhost:8081/auth/google/callback\",
                    \"https://yung-accountant-back.duckdns.org/auth/google/callback\"
                ],
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

    # Verify the actual client secret matches .env
    ACTUAL_SECRET=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients/$CLIENT_UUID/client-secret" \
        -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.value // empty')
    if [ -n "$ACTUAL_SECRET" ] && [ "$ACTUAL_SECRET" != "null" ]; then
        if [ "$ACTUAL_SECRET" != "$client_secret" ]; then
            echo "  ⚠️  SECRET MISMATCH — Update backendcpp/.env and keycloak/.env!"
            echo "  .env value: $client_secret"
            echo "  Keycloak:   $ACTUAL_SECRET  ← USE THIS"
        else
            echo "  ✓ Client secret matches .env"
        fi
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

    # Grant token-exchange permission to the service account
    # Keycloak 22 requires fine-grained permissions on the client itself.
    echo "  → Enabling token-exchange..."
    RM_CLIENT_UUID=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients?clientId=realm-management" \
        -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.[0].id // empty')
    if [ -n "$RM_CLIENT_UUID" ]; then
        # Step 1: Ensure token-exchange role exists in realm-management
        TE_ROLE_UUID=$(curl -s -X GET \
            "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients/$RM_CLIENT_UUID/roles/token-exchange" \
            -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.id // empty')
        if [ -z "$TE_ROLE_UUID" ] || [ "$TE_ROLE_UUID" = "null" ]; then
            curl -s -X POST \
                "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients/$RM_CLIENT_UUID/roles" \
                -H "Authorization: Bearer $ADMIN_TOKEN" \
                -H "Content-Type: application/json" \
                -d "{\"name\":\"token-exchange\",\"description\":\"Token exchange for external IdP\"}" > /dev/null
            sleep 1
            TE_ROLE_UUID=$(curl -s -X GET \
                "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients/$RM_CLIENT_UUID/roles/token-exchange" \
                -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.id // empty')
        fi

        # Step 2: Assign token-exchange role to service account
        if [ -n "$SA_USER" ] && [ -n "$TE_ROLE_UUID" ] && [ "$TE_ROLE_UUID" != "null" ]; then
            curl -s -X POST \
                "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/users/$SA_USER/role-mappings/clients/$RM_CLIENT_UUID" \
                -H "Authorization: Bearer $ADMIN_TOKEN" \
                -H "Content-Type: application/json" \
                -d "[{\"id\":\"$TE_ROLE_UUID\",\"name\":\"token-exchange\"}]" > /dev/null
        fi

        # Step 3: Create & add the token-exchange client scope
        TE_SCOPE_ID=$(curl -s -X GET \
            "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/client-scopes" \
            -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.[] | select(.name=="token-exchange") | .id // empty')
        if [ -z "$TE_SCOPE_ID" ] || [ "$TE_SCOPE_ID" = "null" ]; then
            # Create it — protocol=openid-connect, realm-wide default scope
            curl -s -X POST \
                "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/client-scopes" \
                -H "Authorization: Bearer $ADMIN_TOKEN" \
                -H "Content-Type: application/json" \
                -d "{\"name\":\"token-exchange\",\"description\":\"Token Exchange scope\",\"protocol\":\"openid-connect\",\"attributes\":{\"include.in.token.scope\":\"true\",\"display.on.consent.screen\":\"false\"},\"type\":\"optional\"}" > /dev/null
            sleep 1
            TE_SCOPE_ID=$(curl -s -X GET \
                "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/client-scopes" \
                -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.[] | select(.name=="token-exchange") | .id // empty')
        fi
        if [ -n "$TE_SCOPE_ID" ] && [ "$TE_SCOPE_ID" != "null" ]; then
            curl -s -X PUT \
                "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients/$CLIENT_UUID/optional-client-scopes/$TE_SCOPE_ID" \
                -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null
        fi

        # Step 4: Enable fine-grained authorization & grant token-exchange to svc account
        curl -s -X PUT \
            "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients/$CLIENT_UUID/management/permissions" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H "Content-Type: application/json" \
            -d "{\"enabled\":true}" > /dev/null
        sleep 1

        RS_ID=$(curl -s -X GET \
            "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients/$CLIENT_UUID/authz/resource-server" \
            -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.id // empty')

        if [ -n "$RS_ID" ] && [ -n "$SA_USER" ]; then
            # Create a client policy referencing the service account
            curl -s -X POST \
                "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients/$CLIENT_UUID/authz/resource-server/policy/client" \
                -H "Authorization: Bearer $ADMIN_TOKEN" \
                -H "Content-Type: application/json" \
                -d "{\"name\":\"te-sa-policy\",\"logic\":\"POSITIVE\",\"decisionStrategy\":\"UNANIMOUS\",\"clients\":[\"$SA_USER\"]}" > /dev/null
            sleep 1

            # Get the scope-based token-exchange permission
            TE_PERM_ID=$(curl -s -X GET \
                "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients/$CLIENT_UUID/authz/resource-server/permission/scope" \
                -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.[] | select(.scopes[]?=="token-exchange") | .id // empty')

            if [ -n "$TE_PERM_ID" ]; then
                # Add the client policy to the token-exchange permission
                POLICIES_JSON=$(curl -s -X GET \
                    "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients/$CLIENT_UUID/authz/resource-server/permission/scope/$TE_PERM_ID" \
                    -H "Authorization: Bearer $ADMIN_TOKEN")
                EXISTING_POLS=$(echo "$POLICIES_JSON" | jq -c '.policies // []')
                NEW_POLS=$(echo "$EXISTING_POLS" | jq -c '. + [{"id":"te-sa-policy"}]' 2>/dev/null || echo '[{"id":"te-sa-policy"}]')
                curl -s -X PUT \
                    "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients/$CLIENT_UUID/authz/resource-server/permission/scope/$TE_PERM_ID" \
                    -H "Authorization: Bearer $ADMIN_TOKEN" \
                    -H "Content-Type: application/json" \
                    -d "{\"id\":\"$TE_PERM_ID\",\"name\":\"token-exchange.permission\",\"type\":\"scope\",\"logic\":\"POSITIVE\",\"decisionStrategy\":\"UNANIMOUS\",\"scopes\":[\"token-exchange\"],\"policies\":$NEW_POLS}" > /dev/null
            fi
        fi

        echo "    ✓ token-exchange configured"
    fi

    echo "  ✓ Client configured: $client_name"
}

# Crear los 3 clientes de backend + frontend web público
create_client "$CLIENT_DUITAMA_ID"     "$CLIENT_ALCALDIA_DUITAMA_SECRET"  "$CLIENT_DUITAMA_NAME"     "$CLIENT_DUITAMA_DESC"
create_client "$CLIENT_SOGAMOSO_ID"    "$CLIENT_ALCALDIA_SOGAMOSO_SECRET" "$CLIENT_SOGAMOSO_NAME"    "$CLIENT_SOGAMOSO_DESC"
create_client "$CLIENT_TUNJA_ID"       "$CLIENT_ALCALDIA_TUNJA_SECRET"    "$CLIENT_TUNJA_NAME"       "$CLIENT_TUNJA_DESC"

# ── Frontend web client (public, no secret) ────────────────────────
echo ""
echo "=========================================="
echo "Client: $FRONTEND_CLIENT_NAME ($FRONTEND_CLIENT_ID) [PUBLIC]"
echo "=========================================="

FRONTEND_CLIENT_UUID=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients?clientId=$FRONTEND_CLIENT_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.[0].id // empty')

if [ -n "$FRONTEND_CLIENT_UUID" ]; then
    echo "  ✓ Already exists: $FRONTEND_CLIENT_UUID"
    # Update redirect URIs even if exists
    curl -s -X PUT "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients/$FRONTEND_CLIENT_UUID" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"clientId\": \"$FRONTEND_CLIENT_ID\",
            \"name\": \"$FRONTEND_CLIENT_NAME\",
            \"description\": \"$FRONTEND_CLIENT_DESC\",
            \"enabled\": true,
            \"publicClient\": true,
            \"standardFlowEnabled\": true,
            \"directAccessGrantsEnabled\": true,
            \"redirectUris\": [
                \"http://localhost:5173/*\",
                \"http://localhost:4173/*\",
                \"https://yung-accountant.duckdns.org/*\",
                \"http://127.0.0.1:5173/*\",
                \"http://127.0.0.1:4173/*\",
                \"http://localhost:8081/*\",
                \"https://yung-accountant-back.duckdns.org/*\"
            ],
            \"webOrigins\": [\"+\"],
            \"attributes\": {
                \"post.logout.redirect.uris\": \"+\"
            }
        }" > /dev/null
else
    curl -s -X POST "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"clientId\": \"$FRONTEND_CLIENT_ID\",
            \"name\": \"$FRONTEND_CLIENT_NAME\",
            \"description\": \"$FRONTEND_CLIENT_DESC\",
            \"enabled\": true,
            \"publicClient\": true,
            \"standardFlowEnabled\": true,
            \"directAccessGrantsEnabled\": true,
            \"redirectUris\": [
                \"http://localhost:5173/*\",
                \"http://localhost:4173/*\",
                \"https://yung-accountant.duckdns.org/*\",
                \"http://127.0.0.1:5173/*\",
                \"http://127.0.0.1:4173/*\",
                \"http://localhost:8081/*\",
                \"https://yung-accountant-back.duckdns.org/*\"
            ],
            \"webOrigins\": [\"+\"],
            \"attributes\": {
                \"post.logout.redirect.uris\": \"+\"
            }
        }" > /dev/null

    sleep 2
    FRONTEND_CLIENT_UUID=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients?clientId=$FRONTEND_CLIENT_ID" \
        -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.[0].id')

    if [ -z "$FRONTEND_CLIENT_UUID" ] || [ "$FRONTEND_CLIENT_UUID" = "null" ]; then
        echo "  ❌ Failed to create frontend client"
    else
        echo "  ✓ Created: $FRONTEND_CLIENT_UUID"
    fi
fi

echo ""
echo "=========================================="
echo "=== Initialization Complete ==="
echo "=========================================="
echo "Realm: $KEYCLOAK_REALM"
echo "Access Token: ${ACCESS_TOKEN_LIFESPAN}s"
echo "Clients: $CLIENT_DUITAMA_ID, $CLIENT_SOGAMOSO_ID, $CLIENT_TUNJA_ID, $FRONTEND_CLIENT_ID (public)"
echo "Brute Force: enabled (${BRUTE_FORCE_MAX_FAILURES} max failures)"
if [ -n "$GOOGLE_CLIENT_ID" ]; then
    echo "Google IdP: enabled"
else
    echo "Google IdP: skipped (not configured)"
fi
