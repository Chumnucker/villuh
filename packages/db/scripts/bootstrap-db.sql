-- Run this ONCE as a Postgres superuser before running any Drizzle migrations.
-- Purpose: Create the villuh_app non-owner role that Drizzle's pgPolicy references.
-- If villuh_app already exists, the IF NOT EXISTS prevents an error.

-- 1. Create the non-owner runtime role
CREATE ROLE villuh_app NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT LOGIN PASSWORD 'villuh_app_password_changeme';

-- 2. Allow villuh_app to connect to the database (replace 'villuh' with your DB name if different)
GRANT CONNECT ON DATABASE villuh TO villuh_app;

-- 3. Allow villuh_app to use the public schema
GRANT USAGE ON SCHEMA public TO villuh_app;

-- 4. Grant DML on all CURRENT tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO villuh_app;

-- 5. Grant DML on all FUTURE tables automatically
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO villuh_app;

-- Phase 2 tables (user, session, account, verification, organization, member, invitation, subscription, role_permissions, plan_limits) inherit privileges via ALTER DEFAULT PRIVILEGES from Phase 1 bootstrap.

-- Re-grant for any tables created since Phase 1 bootstrap
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO villuh_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO villuh_app;

-- After running this script, set environment variables:
--   DATABASE_URL=postgres://owner_user:password@localhost:5432/villuh
--   DATABASE_APP_URL=postgres://villuh_app:villuh_app_password_changeme@localhost:5432/villuh
--   DATABASE_TEST_URL=postgres://villuh_app:villuh_app_password_changeme@localhost:5432/villuh_test
