-- Run as the migrate owner (chum) against ONE database (villuh or villuh_test).
-- ALTER DEFAULT PRIVILEGES only applies to tables created by the role that runs this.

GRANT USAGE ON SCHEMA public TO villuh_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO villuh_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO villuh_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO villuh_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO villuh_app;
