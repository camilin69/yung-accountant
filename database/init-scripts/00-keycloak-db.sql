-- Creates the Keycloak database idempotently.
-- \gexec sends the SELECT result as a standalone query,
-- bypassing psql's transaction so CREATE DATABASE works.
SELECT 'CREATE DATABASE keycloak'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'keycloak')\gexec
