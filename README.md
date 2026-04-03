# cuenta-confiable
Arquitectura de Software (Electiva II), proyecto para la gestión financiera personal.

## Backendcpp

### Auth
Microservice meant for administrate users, using keycloak for authorization, exposes the API's:
# Auth Service - Cuenta Confiable

Servicio de autenticación y gestión de usuarios del backend de Cuenta Confiable.

## Tecnologías

- **C++ 17** con Boost.Beast
- **MongoDB** para almacenamiento de perfiles
- **Keycloak** para autenticación OAuth2/OIDC
- **Apache Kafka** para eventos
- **Docker** para contenedorización

## Puerto

| Servicio | Puerto |
|----------|--------|
| Auth Service | 8081 |

## Endpoints

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| POST | `/users/register` | Registro de nuevo usuario | No |
| POST | `/auth/login` | Inicio de sesión | No |
| POST | `/auth/logout` | Cierre de sesión | Sí (Bearer) |
| GET | `/users/me` | Obtener perfil del usuario autenticado | Sí (Bearer) |
| PUT | `/users/update` | Actualizar perfil (nombre, apellido, edad) | Sí (Bearer) |
| DELETE | `/users/delete` | Eliminar cuenta de usuario | Sí (Bearer) |
| GET | `/health` | Health check del servicio | No |

## Eventos Kafka (topic: `auth-events`)

| Evento | Descripción | Código HTTP |
|--------|-------------|-------------|
| `user_registered` | Usuario registrado exitosamente | 201 |
| `login_success` | Inicio de sesión exitoso | 200 |
| `login_failed` | Intento de login fallido | 401, 404 |
| `logout` | Cierre de sesión | 200 |
| `user_updated` | Perfil actualizado | 200 |
| `user_deleted` | Cuenta eliminada | 200 |
| `get_profile_success` | Obtención de perfil exitosa | 200 |
| `get_profile_failed` | Obtención de perfil fallida | 401, 404 |
| `update_profile_failed` | Actualización de perfil fallida | 400, 401, 404, 500 |
| `delete_account_failed` | Eliminación de cuenta fallida | 401, 404, 500 |

## Flujo de autenticación

1. El cliente se registra (`POST /users/register`) → Se guarda en MongoDB y Keycloak
2. El cliente inicia sesión (`POST /auth/login`) → Keycloak valida credenciales y devuelve JWT
3. El cliente envía el JWT en el header `Authorization: Bearer <token>` para endpoints protegidos
4. El servicio valida el token con Keycloak antes de procesar la petición
5. El cliente cierra sesión (`POST /auth/logout`) → Se invalida el refresh token

## Ejemplos de uso

### 1. Registrar usuario

**Petición:**
```json
POST http://localhost:8081/users/register
Content-Type: application/json

{
    "email": "juan@ejemplo.com",
    "password": "password123",
    "firstName": "Juan",
    "lastName": "Pérez",
    "age": 30,
    "clientId": "alcaldia-duitama",
    "role": "estudiante"
}
```

# Goals Service - Cuenta Confiable

Servicio de gestión de metas financieras del backend de Cuenta Confiable.

## Tecnologías

- **C++ 17** con Boost.Beast
- **MongoDB** para almacenamiento de metas
- **Keycloak** para autenticación OAuth2/OIDC
- **Apache Kafka** para eventos
- **Docker** para contenedorización

## Puerto

| Servicio | Puerto |
|----------|--------|
| Goals Service | 8082 |

## Endpoints

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| GET | `/goals` | Listar todas las metas del usuario | Sí (Bearer) |
| POST | `/goals` | Crear una nueva meta | Sí (Bearer) |
| GET | `/goals/{id}` | Obtener una meta específica | Sí (Bearer) |
| PUT | `/goals/{id}` | Actualizar una meta | Sí (Bearer) |
| PATCH | `/goals/{id}/add-amount` | Agregar monto a una meta | Sí (Bearer) |
| DELETE | `/goals/{id}` | Eliminar una meta | Sí (Bearer) |
| GET | `/health` | Health check del servicio | No |

## Eventos Kafka (topic: `goal-events`)

| Evento | Descripción | Código HTTP |
|--------|-------------|-------------|
| `goal_created` | Meta creada exitosamente | 200 |
| `goal_updated` | Meta actualizada exitosamente | 200 |
| `amount_added` | Monto agregado a la meta | 200 |
| `goal_achieved` | Meta alcanzada | 200 |
| `goal_deleted` | Meta eliminada | 200 |
| `list_goals_success` | Listado de metas exitoso | 200 |
| `list_goals_failed` | Listado de metas fallido | 401 |
| `get_goal_success` | Obtención de meta exitosa | 200 |
| `get_goal_failed` | Obtención de meta fallida | 401, 404 |
| `goal_creation_failed` | Creación de meta fallida | 400, 401, 500 |
| `goal_update_failed` | Actualización de meta fallida | 400, 401, 403, 404 |
| `add_amount_failed` | Adición de monto fallida | 400, 401, 403, 404 |
| `goal_deletion_failed` | Eliminación de meta fallida | 401, 403, 404 |

## Estructura de datos

### Meta (Goal)

```json
{
    "id": "69cf47c3cbd694a4250b80d1",
    "user_id": "69cf47c3cbd694a4250b80d1",
    "title": "Ahorrar para viaje",
    "description": "Viaje a Europa",
    "target_amount": 5000.00,
    "current_amount": 1500.00,
    "progress_percentage": 30.00,
    "created_at": "Fri Apr  3 10:00:00 2026"
}
```

# Purchases Service - Cuenta Confiable

Servicio de gestión de compras y gastos del backend de Cuenta Confiable.

## Tecnologías

- **C++ 17** con Boost.Beast
- **MongoDB** para almacenamiento de compras
- **Keycloak** para autenticación OAuth2/OIDC
- **Apache Kafka** para eventos
- **Docker** para contenedorización

## Puerto

| Servicio | Puerto |
|----------|--------|
| Purchases Service | 8083 |

## Endpoints

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| GET | `/purchases` | Listar todas las compras del usuario | Sí (Bearer) |
| GET | `/purchases/total` | Obtener total de compras | Sí (Bearer) |
| GET | `/purchases/category/{category}` | Listar compras por categoría | Sí (Bearer) |
| POST | `/purchases` | Registrar una nueva compra | Sí (Bearer) |
| GET | `/purchases/{id}` | Obtener una compra específica | Sí (Bearer) |
| PUT | `/purchases/{id}` | Actualizar una compra | Sí (Bearer) |
| DELETE | `/purchases/{id}` | Eliminar una compra | Sí (Bearer) |
| GET | `/health` | Health check del servicio | No |

## Eventos Kafka (topic: `purchase-events`)

| Evento | Descripción | Código HTTP |
|--------|-------------|-------------|
| `purchase_created` | Compra registrada exitosamente | 200 |
| `purchase_updated` | Compra actualizada exitosamente | 200 |
| `purchase_deleted` | Compra eliminada exitosamente | 200 |
| `list_purchases_success` | Listado de compras exitoso | 200 |
| `list_purchases_failed` | Listado de compras fallido | 401 |
| `get_purchase_success` | Obtención de compra exitosa | 200 |
| `get_purchase_failed` | Obtención de compra fallida | 401, 404 |
| `get_total_success` | Obtención de total exitosa | 200 |
| `get_total_failed` | Obtención de total fallida | 401 |
| `get_by_category_success` | Filtro por categoría exitoso | 200 |
| `get_by_category_failed` | Filtro por categoría fallido | 401 |
| `purchase_creation_failed` | Creación de compra fallida | 400, 401, 500 |
| `purchase_update_failed` | Actualización de compra fallida | 400, 401, 403, 404 |
| `purchase_deletion_failed` | Eliminación de compra fallida | 401, 403, 404 |

## Estructura de datos

### Compra (Purchase)

```json
{
    "id": "69cf47c3cbd694a4250b80d1",
    "user_id": "69cf47c3cbd694a4250b80d1",
    "title": "Compra de mercado",
    "description": "Mercado mensual",
    "amount": 250000.00,
    "frequency": "monthly",
    "category": "food",
    "date": "2026-04-03",
    "created_at": "Fri Apr  3 10:00:00 2026"
}
```

# Savings Service - Cuenta Confiable

Servicio de gestión de ahorros del backend de Cuenta Confiable.

## Tecnologías

- **C++ 17** con Boost.Beast
- **MongoDB** para almacenamiento de ahorros
- **Keycloak** para autenticación OAuth2/OIDC
- **Apache Kafka** para eventos
- **Docker** para contenedorización

## Puerto

| Servicio | Puerto |
|----------|--------|
| Savings Service | 8084 |

## Endpoints

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| GET | `/savings` | Listar todos los ahorros del usuario | Sí (Bearer) |
| GET | `/savings/total` | Obtener total de ahorros | Sí (Bearer) |
| POST | `/savings` | Crear un nuevo ahorro | Sí (Bearer) |
| GET | `/savings/{id}` | Obtener un ahorro específico | Sí (Bearer) |
| PUT | `/savings/{id}` | Actualizar un ahorro | Sí (Bearer) |
| PATCH | `/savings/{id}/add-amount` | Agregar monto a un ahorro | Sí (Bearer) |
| DELETE | `/savings/{id}` | Eliminar un ahorro | Sí (Bearer) |
| GET | `/health` | Health check del servicio | No |

## Eventos Kafka (topic: `savings-events`)

| Evento | Descripción | Código HTTP |
|--------|-------------|-------------|
| `saving_created` | Ahorro creado exitosamente | 200 |
| `saving_updated` | Ahorro actualizado exitosamente | 200 |
| `amount_added_to_saving` | Monto agregado al ahorro | 200 |
| `saving_goal_achieved` | Meta de ahorro alcanzada | 200 |
| `saving_deleted` | Ahorro eliminado exitosamente | 200 |
| `list_savings_success` | Listado de ahorros exitoso | 200 |
| `list_savings_failed` | Listado de ahorros fallido | 401 |
| `get_saving_success` | Obtención de ahorro exitosa | 200 |
| `get_saving_failed` | Obtención de ahorro fallida | 401, 404 |
| `get_total_success` | Obtención de total exitosa | 200 |
| `get_total_failed` | Obtención de total fallida | 401 |
| `saving_creation_failed` | Creación de ahorro fallida | 400, 401, 500 |
| `saving_update_failed` | Actualización de ahorro fallida | 400, 401, 403, 404 |
| `add_amount_failed` | Adición de monto fallida | 400, 401, 403, 404 |
| `saving_deletion_failed` | Eliminación de ahorro fallida | 401, 403, 404 |

## Estructura de datos

### Ahorro (Saving)

```json
{
    "id": "69cf47c3cbd694a4250b80d1",
    "user_id": "69cf47c3cbd694a4250b80d1",
    "title": "Ahorro para viaje",
    "description": "Viaje a la playa",
    "amount": 500000.00,
    "goal_date": "2026-12-31",
    "created_at": "Fri Apr  3 10:00:00 2026"
}
```

### Storage
# Storage Service - Cuenta Confiable

Servicio de gestión de cuentas (wallets) y transacciones del backend de Cuenta Confiable.

## Tecnologías

- **C++ 17** con Boost.Beast
- **MongoDB** para almacenamiento de cuentas y transacciones
- **Keycloak** para autenticación OAuth2/OIDC
- **Apache Kafka** para eventos
- **Docker** para contenedorización

## Puerto

| Servicio | Puerto |
|----------|--------|
| Storage Service | 8085 |

## Endpoints - Wallets (Cuentas)

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| GET | `/wallets` | Listar todas las cuentas del usuario | Sí (Bearer) |
| GET | `/wallets/total` | Obtener balance total de todas las cuentas | Sí (Bearer) |
| GET | `/wallets/type/{type}` | Listar cuentas por tipo | Sí (Bearer) |
| POST | `/wallets` | Crear una nueva cuenta | Sí (Bearer) |
| GET | `/wallets/{id}` | Obtener una cuenta específica | Sí (Bearer) |
| PUT | `/wallets/{id}` | Actualizar una cuenta | Sí (Bearer) |
| DELETE | `/wallets/{id}` | Eliminar una cuenta (y sus transacciones) | Sí (Bearer) |

## Endpoints - Transactions (Movimientos)

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| GET | `/transactions` | Listar todas las transacciones del usuario | Sí (Bearer) |
| GET | `/transactions/wallet/{wallet_id}` | Listar transacciones de una cuenta | Sí (Bearer) |
| POST | `/transactions` | Registrar una nueva transacción | Sí (Bearer) |
| PUT | `/transactions/{id}` | Actualizar una transacción | Sí (Bearer) |
| DELETE | `/transactions/{id}` | Eliminar una transacción | Sí (Bearer) |
| GET | `/health` | Health check del servicio | No |

## Tipos de Wallet (Cuentas)

| Tipo | Descripción |
|------|-------------|
| `bank_account` | Cuenta bancaria tradicional |
| `digital_wallet` | Billetera digital (Nequi, RappiPay) |
| `cash` | Efectivo físico |
| `savings_goal` | Meta de ahorro |

## Tipos de Transacción

| Tipo | Descripción |
|------|-------------|
| `income` | Ingreso (suma al balance) |
| `expense` | Gasto (resta del balance) |
| `transfer` | Transferencia entre cuentas |

## Eventos Kafka (topic: `storage-events`)

| Evento | Descripción | Código HTTP |
|--------|-------------|-------------|
| `wallet_created` | Cuenta creada exitosamente | 200 |
| `wallet_updated` | Cuenta actualizada exitosamente | 200 |
| `wallet_deleted` | Cuenta eliminada exitosamente | 200 |
| `transaction_created` | Transacción registrada exitosamente | 200 |
| `transaction_updated` | Transacción actualizada exitosamente | 200 |
| `transaction_deleted` | Transacción eliminada exitosamente | 200 |
| `list_wallets_success` | Listado de cuentas exitoso | 200 |
| `list_wallets_failed` | Listado de cuentas fallido | 401 |
| `list_transactions_success` | Listado de transacciones exitoso | 200 |
| `list_transactions_failed` | Listado de transacciones fallido | 401 |
| `get_wallet_success` | Obtención de cuenta exitosa | 200 |
| `get_wallet_failed` | Obtención de cuenta fallida | 401, 404 |
| `get_total_success` | Obtención de total exitosa | 200 |
| `get_total_failed` | Obtención de total fallida | 401 |
| `get_by_type_success` | Filtro por tipo exitoso | 200 |
| `get_by_type_failed` | Filtro por tipo fallido | 401 |
| `wallet_creation_failed` | Creación de cuenta fallida | 400, 401, 500 |
| `wallet_update_failed` | Actualización de cuenta fallida | 400, 401, 403, 404 |
| `wallet_deletion_failed` | Eliminación de cuenta fallida | 401, 403, 404 |
| `transaction_creation_failed` | Creación de transacción fallida | 400, 401, 500 |
| `transaction_update_failed` | Actualización de transacción fallida | 400, 401, 403, 404 |
| `transaction_deletion_failed` | Eliminación de transacción fallida | 401, 403, 404 |

## Estructura de datos

### Wallet (Cuenta)

```json
{
    "id": "69cf47c3cbd694a4250b80d1",
    "user_id": "69cf47c3cbd694a4250b80d1",
    "name": "Cuenta de ahorros Bancolombia",
    "type": "bank_account",
    "bank_name": "Bancolombia",
    "balance": 1500000.00,
    "initial_balance": 1000000.00,
    "currency": "COP",
    "account_number": "123456789",
    "created_at": "Fri Apr  3 10:00:00 2026",
    "last_updated": "Fri Apr  3 10:00:00 2026"
}
```
# Keycloak - Cuenta Confiable

Servicio de autenticación y autorización centralizado del backend de Cuenta Confiable.

## Tecnologías

- **Keycloak 22.0.5** (Quarkus distribution)
- **OpenID Connect** (OIDC) para autenticación
- **OAuth 2.0** para autorización
- **JWT** (JSON Web Tokens) para tokens de acceso
- **Docker** para contenedorización

## Puerto

| Servicio | Puerto |
|----------|--------|
| Keycloak Admin Console | 8080 |
| Keycloak API (OIDC) | 8080 |

## Acceso a la consola de administración

| Campo | Valor |
|-------|-------|
| URL | `http://localhost:8080` |
| Usuario | `admin` |
| Contraseña | `admin123` |

## Realm: `cuenta-confiable`

El realm `cuenta-confiable` contiene toda la configuración de autenticación para la plataforma.

### Clientes (Clients)

Cada alcaldía tiene su propio cliente en Keycloak:

| Cliente ID | Nombre | Descripción |
|------------|--------|-------------|
| `alcaldia-duitama` | Alcaldía de Duitama | Servicios para la Alcaldía de Duitama |
| `alcaldia-sogamoso` | Alcaldía de Sogamoso | Servicios para la Alcaldía de Sogamoso |
| `alcaldia-tunja` | Alcaldía de Tunja | Servicios para la Alcaldía de Tunja |

### Secrets de clientes

| Cliente | Secret |
|---------|--------|
| `alcaldia-duitama` | `duitama-secret-2024` |
| `alcaldia-sogamoso` | `sogamoso-secret-2024` |
| `alcaldia-tunja` | `tunja-secret-2024` |

### Roles por cliente

Cada cliente tiene los siguientes roles:

| Rol | Descripción |
|-----|-------------|
| `ama-de-casa` | Rol para amas de casa |
| `estudiante` | Rol para estudiantes |
| `trabajador` | Rol para trabajadores |

### Mapeadores de atributos (Protocol Mappers)

Para cada cliente se configuraron los siguientes mapeadores que incluyen atributos del usuario en el token JWT:

| Mapper | Atributo | Claim en token |
|--------|----------|----------------|
| `mongoId` | `mongoId` | `mongoId` |
| `age` | `age` | `age` |
| `clientId` | `clientId` | `clientId` |
| `role` | `role` | `role` |

## Endpoints OIDC

| Endpoint | Descripción |
|----------|-------------|
| `{KEYCLOAK_URL}/realms/{realm}/protocol/openid-connect/token` | Obtención de tokens |
| `{KEYCLOAK_URL}/realms/{realm}/protocol/openid-connect/logout` | Cierre de sesión |
| `{KEYCLOAK_URL}/realms/{realm}/protocol/openid-connect/token/introspect` | Introspección de tokens |
| `{KEYCLOAK_URL}/realms/{realm}/protocol/openid-connect/userinfo` | Información del usuario |
| `{KEYCLOAK_URL}/realms/{realm}/protocol/openid-connect/certs` | Certificados públicos |
| `{KEYCLOAK_URL}/admin/realms/{realm}/users` | Administración de usuarios |
| `{KEYCLOAK_URL}/admin/realms/{realm}/clients` | Administración de clientes |

## Tokens

### Access Token (JWT)

El access token contiene la siguiente información del usuario:

```json
{
    "exp": 1775192003,
    "iat": 1775191703,
    "jti": "4d391d32-bbaa-47c7-af01-1086e1e2b28b",
    "iss": "http://localhost:8080/realms/cuenta-confiable",
    "aud": "account",
    "sub": "0399a537-6b8b-4a52-946b-a99e892d6a5e",
    "typ": "Bearer",
    "azp": "alcaldia-duitama",
    "session_state": "d9147201-72af-4f23-b369-655d3e53d3a9",
    "name": "Juan Vargas",
    "given_name": "Juan",
    "family_name": "Vargas",
    "preferred_username": "juan@duitama.gov.co",
    "email": "juan@duitama.gov.co",
    "email_verified": true,
    "mongoId": "69cf47c3cbd694a4250b80d1",
    "age": "21",
    "clientId": "alcaldia-duitama",
    "role": "estudiante",
    "realm_access": {
        "roles": ["default-roles-cuenta-confiable", "offline_access", "uma_authorization"]
    }
}
```


# Kafka - Cuenta Confiable

Sistema de mensajería y eventos para la comunicación asíncrona entre microservicios del backend de Cuenta Confiable.

## Tecnologías

- **Apache Kafka 3.5.0** como broker de mensajes
- **Zookeeper** para gestión de cluster
- **Kafka UI** para interfaz visual
- **librdkafka** para clientes en C++
- **Docker** para contenedorización

## Puertos

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| Kafka Broker | 9092 | Puerto para conexión de productores/consumidores |
| Zookeeper | 2181 | Gestión del cluster Kafka |
| Kafka UI | 8086 | Interfaz web para visualización de eventos |

## Componentes

### Zookeeper

Servicio de coordinación distribuida que mantiene la metadata del cluster Kafka (topics, particiones, consumidores).

### Kafka Broker

Servidor central que recibe, almacena y distribuye los mensajes entre productores y consumidores.

### Kafka UI

Interfaz web para visualizar topics, mensajes, particiones y consumidores en tiempo real.

**Acceso:** `http://localhost:8086`

## Topics

| Topic | Productor | Descripción |
|-------|-----------|-------------|
| `auth-events` | Auth Service | Eventos de autenticación y usuarios |
| `goal-events` | Goals Service | Eventos de metas financieras |
| `purchase-events` | Purchases Service | Eventos de compras y gastos |
| `savings-events` | Savings Service | Eventos de ahorros |
| `storage-events` | Storage Service | Eventos de cuentas y transacciones |
| `metrics` | Todos los servicios | Métricas de rendimiento |
| `alerts` | Event Consumer | Alertas generadas por eventos |
| `notifications` | Event Consumer | Notificaciones para usuarios |

## Configuración de Topics

| Parámetro | Valor |
|-----------|-------|
| Particiones por topic | 3 |
| Factor de replicación | 1 |
| Retención de mensajes | 7 días (por defecto) |

## Eventos por servicio

### Auth Events (`auth-events`)

| Evento | Descripción | Campos adicionales |
|--------|-------------|-------------------|
| `user_registered` | Usuario registrado | clientId, role, age |
| `login_success` | Login exitoso | clientId, role |
| `login_failed` | Login fallido | reason, clientId |
| `logout` | Cierre de sesión | session_closed |
| `user_updated` | Perfil actualizado | old_*, new_* |
| `user_deleted` | Cuenta eliminada | clientId, role |

### Goal Events (`goal-events`)

| Evento | Descripción | Campos adicionales |
|--------|-------------|-------------------|
| `goal_created` | Meta creada | title, target_amount, current_amount |
| `goal_updated` | Meta actualizada | old_title, old_target, new_title, new_target |
| `amount_added` | Monto agregado | amount_added, new_current_amount |
| `goal_achieved` | Meta alcanzada | amount_added, new_current_amount |
| `goal_deleted` | Meta eliminada | title, target_amount, current_amount |

### Purchase Events (`purchase-events`)

| Evento | Descripción | Campos adicionales |
|--------|-------------|-------------------|
| `purchase_created` | Compra creada | title, amount, category, frequency |
| `purchase_updated` | Compra actualizada | old_title, old_amount, new_title, new_amount, category |
| `purchase_deleted` | Compra eliminada | title, amount, category |

### Savings Events (`savings-events`)

| Evento | Descripción | Campos adicionales |
|--------|-------------|-------------------|
| `saving_created` | Ahorro creado | title, amount, goal_date |
| `saving_updated` | Ahorro actualizado | old_title, old_amount, new_title, new_amount, goal_date |
| `amount_added_to_saving` | Monto agregado | amount_added, new_amount |
| `saving_goal_achieved` | Meta alcanzada | amount_added, new_amount |
| `saving_deleted` | Ahorro eliminado | title, amount, goal_date |

### Storage Events (`storage-events`)

| Evento | Descripción | Campos adicionales |
|--------|-------------|-------------------|
| `wallet_created` | Cuenta creada | name, type, bank_name, balance, currency |
| `wallet_updated` | Cuenta actualizada | old_name, old_balance, new_name, new_balance |
| `wallet_deleted` | Cuenta eliminada | name, type, balance |
| `transaction_created` | Transacción creada | wallet_id, type, category, amount, description |
| `transaction_updated` | Transacción actualizada | old_*, new_*, wallet_id, new_wallet_balance |
| `transaction_deleted` | Transacción eliminada | transaction_type, transaction_amount, wallet_id |

## Estructura de un evento

Todos los eventos comparten una estructura base:

```json
{
    "type": "nombre_del_evento",
    "service": "auth|goals|purchases|savings|storage",
    "user_id": "69cf47c3cbd694a4250b80d1",
    "timestamp": 1775192003,
    "status_code": 200,
    "...": "campos específicos del evento"
}
```


