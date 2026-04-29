---
plan: 01-03
phase: 01-infrastructure-foundation
status: complete
completed: 2026-04-29
commits:
  - 9386a4c
  - ace4546
subsystem: db-package
tags: [drizzle-orm, postgres, rls, row-level-security, schema, bootstrap]
dependency_graph:
  requires: [01-01]
  provides: [packages/db runtime client, packages/db migration client, RLS schema, bootstrap SQL]
  affects: [01-04 (migrations), 01-05 (RLS integration tests), packages/server (imports @villuh/db)]
tech_stack:
  added: [drizzle-orm@0.45.2, postgres@3.4.9]
  patterns: [two-connection-string RLS, pgRole.existing(), pgPolicy tenant_isolation, enableRLS()]
key_files:
  created:
    - packages/db/src/index.ts
    - packages/db/src/migrate.ts
    - packages/db/drizzle.config.ts
    - packages/db/src/schema/landlords.ts
    - packages/db/src/schema/index.ts
    - packages/db/scripts/bootstrap-db.sql
    - packages/db/.env.example
    - packages/db/migrations/.gitkeep
  modified:
    - packages/db/package.json (added drizzle-orm + postgres dependencies)
decisions:
  - drizzle-orm 0.45.2 uses .enableRLS() not .withRLS() — plan referenced older API; fixed inline (Rule 1)
  - drizzle-orm 0.45.2 uses timestamp('col', { withTimezone:true }) not timestamptz() — fixed inline (Rule 1)
  - pgRole('villuh_app').existing() ensures Drizzle never issues CREATE ROLE DDL — role pre-created by bootstrap-db.sql
  - DATABASE_APP_URL (villuh_app role) is the ONLY connection string allowed at runtime; DATABASE_URL (owner) is migration-only
metrics:
  duration: "~20 minutes"
  completed: "2026-04-29"
---

# Phase 1 Plan 03: @villuh/db Package Summary

**One-liner:** @villuh/db package with two-connection-string Drizzle clients, RLS-enabled schema using pgPolicy + enableRLS(), and superuser bootstrap SQL.

## Summary

Created the @villuh/db package data layer. Two separate Drizzle clients enforce the security invariant: `src/index.ts` connects via `DATABASE_APP_URL` (villuh_app non-owner role, RLS enforced) for all runtime queries; `src/migrate.ts` connects via `DATABASE_URL` (owner role) for migrations only. drizzle.config.ts is wired to the owner URL with `entities: { roles: true }` so pgRole() references compile without errors.

The schema defines a `test_tenant_data` demonstration table with a `pgPolicy('tenant_isolation')` filter using `current_setting('app.current_landlord_id', true)::uuid` and `.enableRLS()` to enable row-level security at the table level. The `villuhApp` role is marked `.existing()` so Drizzle never attempts to CREATE it — the role is provisioned by `scripts/bootstrap-db.sql` which must be run once by a superuser before migrations.

TypeScript compilation passes with zero errors (pnpm --filter @villuh/db typecheck).

## Key Files Created

- `packages/db/src/index.ts` — Runtime db export using DATABASE_APP_URL (villuh_app role). Imports schema barrel for typed queries.
- `packages/db/src/migrate.ts` — Migration runner using DATABASE_URL (owner role, max:1). Top-level await with ESM-compatible __dirname.
- `packages/db/drizzle.config.ts` — Drizzle Kit config: dialect postgresql, schema ./src/schema, out ./migrations, dbCredentials.url = DATABASE_URL, entities.roles:true.
- `packages/db/src/schema/landlords.ts` — test_tenant_data table with pgPolicy tenant_isolation (permissive, for all, to villuhApp). RLS enabled via .enableRLS(). villuhApp declared as .existing().
- `packages/db/src/schema/index.ts` — Barrel re-export: `export * from './landlords.js'`
- `packages/db/scripts/bootstrap-db.sql` — Superuser one-time script: CREATE ROLE villuh_app, GRANT CONNECT, GRANT USAGE ON SCHEMA public, GRANT DML on current tables, ALTER DEFAULT PRIVILEGES for future tables.
- `packages/db/.env.example` — Documents the three required env vars with comments explaining owner vs non-owner roles.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] drizzle-orm 0.45.2 API: .withRLS() does not exist**
- **Found during:** Task 2 typecheck
- **Issue:** Plan specified `.withRLS()` but drizzle-orm 0.45.2 exposes `.enableRLS()` on PgTableWithColumns. The type declaration at `pg-core/table.d.ts` line 22 confirms `enableRLS: () => Omit<PgTableWithColumns<T>, 'enableRLS'>`.
- **Fix:** Changed `.withRLS()` to `.enableRLS()` in landlords.ts.
- **Files modified:** `packages/db/src/schema/landlords.ts`
- **Commit:** ace4546

**2. [Rule 1 - Bug] drizzle-orm 0.45.2 API: timestamptz() does not exist**
- **Found during:** Task 2 typecheck
- **Issue:** Plan specified `timestamptz` import but drizzle-orm 0.45.2 exports only `timestamp`. The TIMESTAMPTZ equivalent is `timestamp('col', { withTimezone: true })`.
- **Fix:** Replaced `timestamptz('created_at')` with `timestamp('created_at', { withTimezone: true })`. Functional behavior is identical — the generated SQL column type is TIMESTAMPTZ.
- **Files modified:** `packages/db/src/schema/landlords.ts`
- **Commit:** ace4546

## Security Notes

The two-connection-string invariant is enforced at the code level:
- `packages/db/src/index.ts` — contains only `DATABASE_APP_URL` (verified: grep returns 0 for DATABASE_URL)
- `packages/db/src/migrate.ts` — contains only `DATABASE_URL` (verified: grep returns 0 for DATABASE_APP_URL)
- `packages/db/drizzle.config.ts` — `dbCredentials.url = process.env.DATABASE_URL!` (owner only)

Bootstrap SQL uses a placeholder password `villuh_app_password_changeme` — developer must change before production use. The file is intentionally committed (it is a script, not a secret).

## Self-Check: PASSED

- `packages/db/src/index.ts` — FOUND; contains DATABASE_APP_URL
- `packages/db/src/migrate.ts` — FOUND; contains DATABASE_URL, max:1; does NOT contain DATABASE_APP_URL
- `packages/db/drizzle.config.ts` — FOUND; contains dialect postgresql, entities.roles:true, DATABASE_URL
- `packages/db/src/schema/landlords.ts` — FOUND; contains pgRole('villuh_app').existing(), pgPolicy('tenant_isolation'), current_setting('app.current_landlord_id', true)::uuid, .enableRLS()
- `packages/db/src/schema/index.ts` — FOUND; contains export * from './landlords.js'
- `packages/db/scripts/bootstrap-db.sql` — FOUND; contains CREATE ROLE villuh_app, ALTER DEFAULT PRIVILEGES
- `packages/db/migrations/.gitkeep` — FOUND
- `pnpm --filter @villuh/db typecheck` — PASSED (zero errors)
- Commit 9386a4c — VERIFIED (feat(01-03): install DB deps)
- Commit ace4546 — VERIFIED (feat(01-03): create Drizzle schema)
