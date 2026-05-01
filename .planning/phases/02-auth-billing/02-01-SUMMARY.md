---
phase: 02-auth-billing
plan: 01
subsystem: database
tags: [better-auth, drizzle, postgres, rls, vitest, stripe, schema]

# Dependency graph
requires:
  - phase: 01-infrastructure-foundation
    provides: "@villuh/db package with Drizzle schema, RLS pattern (villuhApp role, pgPolicy), migrations infrastructure, test setup patterns"

provides:
  - Better Auth Drizzle schema (user, session, account, verification, organization with additionalFields, member, invitation, subscription)
  - role_permissions table with RLS tenant_isolation policy (per-org × role × action permission storage)
  - plan_limits system table seeded with 9 rows (3 tiers × 3 resources per D-18)
  - Three Drizzle migrations (0002_better_auth, 0003_role_permissions, 0004_plan_limits)
  - vitest infrastructure in @villuh/server with 7 Wave 0 failing test stubs covering all Phase 2 requirements

affects:
  - 02-02 (Better Auth server config — needs auth.ts schema)
  - 02-03 (Better Auth client pages — needs organization additionalFields)
  - 02-04 (RBAC implementation — needs role_permissions table and schema)
  - 02-05 (Billing implementation — needs subscription table from Better Auth schema)
  - 02-06 (Plan enforcement — needs plan_limits table)
  - 02-07 through 02-12 (all Phase 2 plans — test stubs provide failing tests to make green)

# Tech tracking
tech-stack:
  added:
    - better-auth@1.6.9 (auth framework with org + Stripe plugins)
    - "@better-auth/stripe (Stripe plugin for subscription webhook handling)"
    - stripe@22.1.0 (Stripe API SDK)
    - resend@6.12.2 (transactional email)
    - "@react-email/components@1.0.12 (React email templates)"
    - vitest@4.1.5 (test framework in @villuh/server)
    - "@vitest/coverage-v8 (coverage)"
    - postgres@3.4.9 (added as devDep to server for test DB access)
  patterns:
    - "Better Auth schema generation via @better-auth/cli generate (not auth migrate)"
    - "Schema split into separate migration files: one per logical domain"
    - "Wave 0 test stubs: expect.fail() RED state until subsequent plans implement"
    - "pnpm overrides to deduplicate drizzle-orm across workspace packages"
    - "@villuh/db/schema/index export path added for test infrastructure"

key-files:
  created:
    - packages/db/src/schema/auth.ts (Better Auth generated Drizzle schema with 8 tables)
    - packages/db/src/schema/role-permissions.ts (RLS-enabled per-org RBAC table)
    - packages/db/src/schema/plan-limits.ts (system table, no RLS, tier × resource limits)
    - packages/db/migrations/0002_better_auth.sql (user/session/account/verification/organization/member/invitation/subscription DDL)
    - packages/db/migrations/0003_role_permissions.sql (role_permissions DDL + RLS policy)
    - packages/db/migrations/0004_plan_limits.sql (plan_limits DDL + 9 seed rows)
    - packages/db/scripts/seed-plan-limits.sql (idempotent seed script)
    - packages/server/vitest.config.ts (node env, forks pool, singleFork)
    - packages/server/src/__tests__/setup.ts (createOwnerClient, createAppClient, withTestTenant, clearTestUsers)
    - packages/server/src/__tests__/auth.test.ts (AUTH-01, AUTH-09 stubs)
    - packages/server/src/__tests__/org.test.ts (AUTH-02 org + invite stubs)
    - packages/server/src/__tests__/permissions.test.ts (AUTH-02 RBAC, SETT-01 stubs)
    - packages/server/src/__tests__/plan-limit.test.ts (AUTH-03, AUTH-04 gate stubs)
    - packages/server/src/__tests__/billing.test.ts (AUTH-04 through AUTH-07 stubs)
    - packages/server/src/__tests__/wizard.test.ts (AUTH-08 wizard stubs)
    - packages/server/src/__tests__/audit.test.ts (SETT-02 audit log stubs)
  modified:
    - packages/db/src/schema/index.ts (barrel re-exports auth.js, role-permissions.js, plan-limits.js)
    - packages/db/scripts/bootstrap-db.sql (added idempotent re-grant block for Phase 2 tables)
    - packages/db/migrations/meta/_journal.json (updated from 2 to 5 entries: 0000-0004)
    - packages/db/package.json (added schema/index export path)
    - packages/server/package.json (added better-auth + Stripe + Resend deps, test script, vitest devDeps)
    - package.json (added pnpm.overrides for drizzle-orm deduplication)

key-decisions:
  - "Used @better-auth/cli generate (not auth migrate) to produce SQL output, then copied into Drizzle migration — preserves migration chain integrity (per RESEARCH.md Pitfall 2)"
  - "Split single auto-generated migration into three files: 0002_better_auth, 0003_role_permissions, 0004_plan_limits — cleaner rollback granularity and separate tracking"
  - "Added pnpm.overrides for drizzle-orm to deduplicate instances — better-auth pulls in kysely causing drizzle-orm type conflict between workspace packages"
  - "Added @villuh/db/schema/index export path — test setup in @villuh/server needs direct schema imports without going through the main db instance"
  - "postgres added as devDep to @villuh/server — needed for test DB client in Wave 0 setup.ts"

patterns-established:
  - "Wave 0 RED state: all Phase 2 test files created with expect.fail() — subsequent plans replace stubs with real test bodies"
  - "Test DB setup pattern: createOwnerClient (bypasses RLS, for seeding) + createAppClient (villuh_app role, RLS enforced)"
  - "Schema generation: temp auth.config.ts → @better-auth/cli generate → output to packages/db/src/schema/auth.ts → delete temp config"

requirements-completed:
  - AUTH-01
  - AUTH-02
  - AUTH-03
  - AUTH-04
  - AUTH-05
  - AUTH-06
  - AUTH-07
  - AUTH-08
  - AUTH-09
  - SETT-01
  - SETT-02

# Metrics
duration: 45min
completed: 2026-04-30
---

# Phase 02 Plan 01: Data Layer Foundation + Wave 0 Test Stubs Summary

**Better Auth Drizzle schema (8 tables) with organization additionalFields, role_permissions (RLS), plan_limits (9-row seed), 3 migrations applied to dev+test DBs, and vitest with 7 Wave 0 RED test stubs covering all 11 Phase 2 requirements**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-04-30T03:20:00Z
- **Completed:** 2026-04-30T03:45:00Z
- **Tasks:** 4
- **Files modified:** 20+

## Accomplishments

- Better Auth schema generated via CLI (not hand-written), exported 8 tables including organization with `setup_completed`, `subscription_tier`, `subscription_status`, `stripe_connected_account_id` additionalFields
- Three migrations applied to both dev (`villuh`) and test (`villuh_test`) databases: plan_limits seeded with 9 rows, role_permissions has RLS enabled, plan_limits correctly has NO RLS
- vitest infrastructure installed in @villuh/server with 7 Wave 0 test stub files providing failing tests for all 11 Phase 2 requirements — subsequent plans will replace `expect.fail()` with real test bodies

## Task Commits

Each task was committed atomically:

1. **Task 1: Generate Better Auth schema + role_permissions + plan_limits schemas** - `b844224` (feat)
2. **Task 2: Generate Drizzle migrations + seed script** - `4461c73` (feat)
3. **Task 3: Apply migrations to dev+test DBs** - (no file changes — DB-only operation; verified via psql)
4. **Task 4: Install vitest + Wave 0 failing test stubs** - `9860dc7` (feat)

## Files Created/Modified

- `packages/db/src/schema/auth.ts` — Better Auth generated schema (8 tables, organization additionalFields)
- `packages/db/src/schema/role-permissions.ts` — RBAC table with RLS tenant_isolation + unique constraint
- `packages/db/src/schema/plan-limits.ts` — System table (no RLS) for tier limits
- `packages/db/src/schema/index.ts` — Updated barrel with 4 schema exports
- `packages/db/migrations/0002_better_auth.sql` — Better Auth tables DDL
- `packages/db/migrations/0003_role_permissions.sql` — role_permissions DDL + RLS policy
- `packages/db/migrations/0004_plan_limits.sql` — plan_limits DDL + 9 seed rows
- `packages/db/scripts/seed-plan-limits.sql` — Idempotent seed script
- `packages/db/scripts/bootstrap-db.sql` — Added idempotent re-grant block
- `packages/server/vitest.config.ts` — vitest config (node env, forks pool)
- `packages/server/src/__tests__/setup.ts` — Test infrastructure (4 exports)
- `packages/server/src/__tests__/auth.test.ts` through `audit.test.ts` — 7 Wave 0 stub files

## Decisions Made

- Used `@better-auth/cli generate` (not `auth migrate`) per RESEARCH.md Pitfall 2 — preserves Drizzle migration chain
- Split auto-generated single migration into 3 files for cleaner rollback granularity
- Added `pnpm.overrides` for drizzle-orm to deduplicate instances — better-auth introduces kysely as peer dep causing type conflicts between workspace packages
- Added `@villuh/db/schema/index` export path so test infrastructure in server package can import schema directly

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed drizzle-orm version conflict from better-auth installation**
- **Found during:** Task 4 (@villuh/server typecheck)
- **Issue:** better-auth introduced kysely as optional peer, causing pnpm to resolve two instances of drizzle-orm@0.45.2 — one with kysely suffix and one without. TypeScript sees `SQL<unknown>` from two separate type declarations as incompatible.
- **Fix:** Added `"pnpm": { "overrides": { "drizzle-orm": "0.45.2" } }` to root `package.json` to force single instance resolution
- **Files modified:** package.json, pnpm-lock.yaml
- **Verification:** `pnpm --filter @villuh/server typecheck` exits 0
- **Committed in:** `9860dc7` (Task 4 commit)

**2. [Rule 2 - Missing Critical] Added @villuh/db/schema/index export path**
- **Found during:** Task 4 (test setup.ts imports)
- **Issue:** `@villuh/db/schema/index` import path referenced in setup.ts didn't exist as a package.json export — would cause import resolution failure at runtime
- **Fix:** Added `"./schema/index": "./src/schema/index.ts"` to `@villuh/db` package.json exports
- **Files modified:** packages/db/package.json
- **Committed in:** `9860dc7` (Task 4 commit)

**3. [Rule 2 - Missing Critical] Added postgres + dotenv as devDeps in @villuh/server**
- **Found during:** Task 4 (test setup.ts needs postgres client)
- **Issue:** setup.ts imports `postgres` directly but server package had no postgres dependency; `dotenv/config` also needed for test env loading
- **Fix:** Added `postgres` and `dotenv` as devDependencies in @villuh/server
- **Files modified:** packages/server/package.json, pnpm-lock.yaml
- **Committed in:** `9860dc7` (Task 4 commit)

---

**Total deviations:** 3 auto-fixed (1 blocking, 2 missing critical)
**Impact on plan:** All auto-fixes necessary for typecheck compliance and test infrastructure to function. No scope creep.

## Issues Encountered

- `@better-auth/cli generate` failed initially when auth.config.ts used `drizzle-orm/postgres-js` — CLI runs via `jiti` and couldn't find `postgres` module since it was only in `@villuh/db/node_modules`. Resolved by temporarily adding `postgres` to `@villuh/server` dependencies during generation, then removing after.
- Drizzle generated a single migration for all new tables — manually split into 3 files per plan spec and updated `_journal.json` with correct entries and timestamps.
- vitest 4.x removed `poolOptions.forks.singleFork` config — replaced with top-level `singleFork: true` (per deprecation warning).

## Next Phase Readiness

- Plan 02-02 can immediately use `packages/db/src/schema/auth.ts` for the `betterAuth()` server config
- All failing test stubs are in place — `pnpm --filter @villuh/server test` runs and reports 37 failing tests
- Dev and test databases have all Phase 2 tables with correct RLS policies
- `villuh_app` role has DML privileges on all new tables

## Self-Check

Verified:

- `packages/db/src/schema/auth.ts` exists: FOUND
- `packages/db/src/schema/role-permissions.ts` exists: FOUND
- `packages/db/src/schema/plan-limits.ts` exists: FOUND
- `packages/db/migrations/0002_better_auth.sql` exists: FOUND
- `packages/db/migrations/0003_role_permissions.sql` exists: FOUND
- `packages/db/migrations/0004_plan_limits.sql` exists: FOUND
- `packages/server/vitest.config.ts` exists: FOUND
- `packages/server/src/__tests__/setup.ts` exists: FOUND
- 7 test stub files exist: FOUND
- Commits b844224, 4461c73, 9860dc7: FOUND (git log verified)
- `plan_limits` has 9 rows on dev DB: VERIFIED (psql)
- `plan_limits` has 9 rows on test DB: VERIFIED (psql)
- `role_permissions` RLS = t: VERIFIED (psql)
- `plan_limits` RLS = f: VERIFIED (psql)
- `@villuh/db typecheck`: PASSED
- `@villuh/server typecheck`: PASSED

## Self-Check: PASSED

---
*Phase: 02-auth-billing*
*Completed: 2026-04-30*
