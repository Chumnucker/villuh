-- Run once as a superuser (local compose user `chum` is superuser).
-- Creates the RLS runtime role and the test database. Idempotent.

SELECT 'CREATE DATABASE villuh_test OWNER chum'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'villuh_test')\gexec

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'villuh_app') THEN
    CREATE ROLE villuh_app
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT
      LOGIN PASSWORD 'villuh_app_password_changeme';
  END IF;
END
$$;

GRANT CONNECT ON DATABASE villuh TO villuh_app;
GRANT CONNECT ON DATABASE villuh_test TO villuh_app;
