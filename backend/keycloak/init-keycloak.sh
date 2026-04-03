#!/bin/bash
set -e

echo "=== Keycloak Initialization ==="

# Configuración
KEYCLOAK_URL="${KEYCLOAK_URL:-http://keycloak:8080}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-cuenta-confiable}"
KEYCLOAK_ADMIN="${KEYCLOAK_ADMIN:-admin}"
KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-admin123}"

# Secrets - leer desde variables de entorno con valores por defecto
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

# 2. Crear realm
echo "Creando realm: $KEYCLOAK_REALM..."
curl -s -X POST "$KEYCLOAK_URL/admin/realms" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"realm\": \"$KEYCLOAK_REALM\",
        \"enabled\": true,
        \"displayName\": \"Cuenta Confiable\",
        \"loginWithEmailAllowed\": true
    }" || echo "  (Realm may already exist)"

# 3. Función para crear cliente, roles y mappers
create_client_with_roles_and_mappers() {
    local client_id=$1
    local client_secret=$2
    local client_name=$3
    local client_desc=$4
    
    echo "=========================================="
    echo "Creando cliente: $client_name ($client_id)"
    echo "=========================================="
    
    # 3.1 Crear cliente
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
    
    # 3.2 Obtener el UUID del cliente recién creado
    echo "  → Obteniendo UUID del cliente..."
    CLIENT_UUID=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients?clientId=$client_id" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" | jq -r '.[0].id')
    
    if [ -z "$CLIENT_UUID" ] || [ "$CLIENT_UUID" = "null" ]; then
        echo "  ❌ Failed to get client UUID for $client_id"
        return
    fi
    
    echo "  ✓ Client UUID: $CLIENT_UUID"
    
    # 3.3 Crear roles dentro del cliente
    echo "  → Creando roles dentro del cliente..."
    
    # Rol: ama-de-casa
    echo "    - Creando rol: ama-de-casa"
    curl -s -X POST "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients/$CLIENT_UUID/roles" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "ama-de-casa",
            "description": "Rol para amas de casa"
        }' || echo "      (Role may already exist)"
    
    # Rol: estudiante
    echo "    - Creando rol: estudiante"
    curl -s -X POST "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients/$CLIENT_UUID/roles" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "estudiante",
            "description": "Rol para estudiantes"
        }' || echo "      (Role may already exist)"
    
    # Rol: trabajador
    echo "    - Creando rol: trabajador"
    curl -s -X POST "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients/$CLIENT_UUID/roles" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "trabajador",
            "description": "Rol para trabajadores"
        }' || echo "      (Role may already exist)"
    
    # 3.4 Crear mappers para incluir atributos en el token
    echo "  → Creando mappers para atributos..."
    
    # Mapper para mongoId
    echo "    - Creando mapper: mongoId"
    curl -s -X POST "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients/$CLIENT_UUID/protocol-mappers/models" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "mongoId",
            "protocol": "openid-connect",
            "protocolMapper": "oidc-usermodel-attribute-mapper",
            "consentRequired": false,
            "config": {
                "user.attribute": "mongoId",
                "claim.name": "mongoId",
                "access.token.claim": "true",
                "id.token.claim": "true",
                "userinfo.token.claim": "true",
                "jsonType.label": "String"
            }
        }' || echo "      (Mapper may already exist)"
    
    # Mapper para age
    echo "    - Creando mapper: age"
    curl -s -X POST "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients/$CLIENT_UUID/protocol-mappers/models" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "age",
            "protocol": "openid-connect",
            "protocolMapper": "oidc-usermodel-attribute-mapper",
            "consentRequired": false,
            "config": {
                "user.attribute": "age",
                "claim.name": "age",
                "access.token.claim": "true",
                "id.token.claim": "true",
                "userinfo.token.claim": "true",
                "jsonType.label": "String"
            }
        }' || echo "      (Mapper may already exist)"
    
    # Mapper para clientId
    echo "    - Creando mapper: clientId"
    curl -s -X POST "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients/$CLIENT_UUID/protocol-mappers/models" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "clientId",
            "protocol": "openid-connect",
            "protocolMapper": "oidc-usermodel-attribute-mapper",
            "consentRequired": false,
            "config": {
                "user.attribute": "clientId",
                "claim.name": "clientId",
                "access.token.claim": "true",
                "id.token.claim": "true",
                "userinfo.token.claim": "true",
                "jsonType.label": "String"
            }
        }' || echo "      (Mapper may already exist)"
    
    # Mapper para role
    echo "    - Creando mapper: role"
    curl -s -X POST "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM/clients/$CLIENT_UUID/protocol-mappers/models" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "role",
            "protocol": "openid-connect",
            "protocolMapper": "oidc-usermodel-attribute-mapper",
            "consentRequired": false,
            "config": {
                "user.attribute": "role",
                "claim.name": "role",
                "access.token.claim": "true",
                "id.token.claim": "true",
                "userinfo.token.claim": "true",
                "jsonType.label": "String"
            }
        }' || echo "      (Mapper may already exist)"
    
    echo "  ✓ Mappers creados para $client_name"
    echo ""
}

# 4. Crear los 3 clientes con sus roles y mappers
create_client_with_roles_and_mappers "alcaldia-duitama" "$CLIENT_ALCALDIA_DUITAMA_SECRET" "Alcaldía de Duitama" "Servicios para la Alcaldía de Duitama"
create_client_with_roles_and_mappers "alcaldia-sogamoso" "$CLIENT_ALCALDIA_SOGAMOSO_SECRET" "Alcaldía de Sogamoso" "Servicios para la Alcaldía de Sogamoso"
create_client_with_roles_and_mappers "alcaldia-tunja" "$CLIENT_ALCALDIA_TUNJA_SECRET" "Alcaldía de Tunja" "Servicios para la Alcaldía de Tunja"

# Actualizar configuración de tokens en el realm
curl -X PUT "$KEYCLOAK_URL/admin/realms/$KEYCLOAK_REALM" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "accessTokenLifespan": 31536000,
        "refreshTokenLifespan": 31536000,
        "ssoSessionIdleTimeout": 31536000,
        "ssoSessionMaxLifespan": 31536000
    }'
    
echo ""
echo "=== Keycloak initialization completed! ==="

