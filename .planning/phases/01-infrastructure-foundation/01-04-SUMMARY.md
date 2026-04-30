---
plan: 01-04
status: complete
completed: 2026-04-30
---

# 01-04 Summary: Postgres Provision + Migrations

## What was built

- Generated Drizzle migration `0000_outgoing_yellow_claw.sql` — `test_tenant_data` table with RLS policy
- Created `0001_audit_log.sql` (custom empty migration via `drizzle-kit generate --custom`) — injected full audit log SQL: partitioned table, 4 monthly partitions (Apr–Jul 2026), RLS policy, `audit_log_trigger_fn` (SECURITY DEFINER), `audit_log_immutable_fn`, both triggers
- Applied both migrations to local Postgres (`villuh` DB) — all tables and triggers active
- Applied same migrations manually to `villuh_test` DB via psql
- Created `packages/db/.env` (not committed) with all four connection strings

## Decisions made

- Added `dotenv` to `packages/db` dependencies — `migrate.ts` needs `import 'dotenv/config'` since `tsx` doesn't auto-load `.env`
- Added `DATABASE_OWNER_TEST_URL` env var — owner client for tests must connect to `villuh_test`, not `villuh` (separate from the migration `DATABASE_URL`)
- Permissions re-granted with `GRANT ... ON ALL TABLES` after migrations — `ALTER DEFAULT PRIVILEGES` in bootstrap-db.sql only covers tables created by the same role that ran it; migrations run as `chum` but bootstrap ran as `postgres`

## Artifacts

- `packages/db/migrations/0000_outgoing_yellow_claw.sql` — initial schema
- `packages/db/migrations/0001_audit_log.sql` — audit log infrastructure
- `packages/db/migrations/meta/_journal.json` — Drizzle tracks both migrations
- `packages/db/.env` — local connection strings (gitignored)
