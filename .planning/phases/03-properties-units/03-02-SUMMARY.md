---
phase: 03-properties-units
plan: 02
subsystem: database
tags: [drizzle, postgresql, rls, audit-log, migrations]

# Dependency graph
requires:
  - phase: 03-properties-units
    provides: Phase 3 npm dependencies, Wave 0 Vitest stubs (03-01)
provides:
  - "properties + property_images Drizzle tables (structured address, nullable lat/lng, notes, archived_at)"
  - "units + unit_statuses Drizzle tables (base_rent integer cents, manual status assignment)"
  - "organization_tag + property_tag Drizzle tables (freeform/catalog tag model)"
  - "ensureDefaultUnitStatuses(organizationId, tx) seed helper"
  - "Live Postgres tables with organization_isolation RLS + audit_log_trigger_fn triggers on all 6 tables"
  - "Repaired drizzle-kit migration snapshot baseline (apps/server/migrations/meta/0012_snapshot.json)"
affects: [03-03, 03-04, 03-05, 03-06, 03-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "organization_isolation pgPolicy + .enableRLS() copied verbatim from role-permissions.ts on every new org-scoped table"
    - "archived_at (nullable timestamptz) soft-archive column on properties/units, no hard delete"
    - "property_images has no soft-delete — hard DB row delete pairs with immediate S3 object delete (D-37)"

key-files:
  created:
    - apps/server/src/schema/properties.ts
    - apps/server/src/schema/units.ts
    - apps/server/src/schema/tags.ts
    - apps/server/src/domain/unit-statuses.ts
    - apps/server/migrations/0013_pink_azazel.sql
    - apps/server/migrations/meta/0012_snapshot.json
    - apps/server/migrations/meta/0013_snapshot.json
  modified:
    - apps/server/src/schema/index.ts
    - apps/server/migrations/meta/_journal.json

key-decisions:
  - "base_rent stored as integer cents, notNull, default 0 (A3) — no float dollars"
  - "Address fields on properties are nullable at the DB layer (structured street/line2/city/region/postal/country); required-ness enforced by 03-03's Zod input schema, not the column constraints, since D-25 allows Mapbox-fallback manual entry"
  - "latitude numeric(9,7) / longitude numeric(10,7) — precise enough for Mapbox-sourced coordinates, nullable since manual addresses may omit them (D-23/D-25)"
  - "Repaired the missing drizzle-kit migration snapshot for migrations 0003-0012 via `drizzle-kit introspect` against the live DB, since those migrations were hand-written SQL and never had a matching meta/*.json committed — this was blocking `generate` entirely (interactive create-vs-rename prompt with no TTY available)"

requirements-completed: [PROP-01, PROP-02, UNIT-01, UNIT-02]

# Metrics
duration: 45min
completed: 2026-08-11
---

# Phase 3 Plan 2: Portfolio Schema + Migration Summary

**Drizzle schemas for properties/units/tags/unit-statuses with organization_isolation RLS, migrated live via a repaired drizzle-kit snapshot baseline, with audit_log triggers on all six new tables.**

## Performance

- **Duration:** ~45 min
- **Tasks:** 2 completed
- **Files modified:** 9 (7 created, 2 modified)

## Accomplishments
- `properties` + `property_images` tables live with structured address, nullable Mapbox lat/lng, sanitized-HTML-ready notes column, and soft-archive (`archived_at`)
- `units` + `unit_statuses` tables live with `base_rent` as integer cents, manual status assignment designed for Phase 4's auto-Occupied hook (D-28), and a catalog seed helper
- `organization_tag` + `property_tag` tables live implementing the freeform/catalog tag model (Pattern 7)
- `ensureDefaultUnitStatuses(organizationId, tx)` idempotently seeds Available/Occupied/Maintenance via `onConflictDoNothing`
- All six new tables carry `organization_isolation` RLS policies (`.enableRLS()`) and `audit_log_trigger_fn` triggers, verified live against Postgres
- Repaired a pre-existing gap in `apps/server/migrations/meta/` (missing snapshots for migrations 0003-0012) that was fully blocking `drizzle-kit generate` — verified the fix doesn't touch any table outside this plan's scope

## Task Commits

Each task was committed atomically:

1. **Task 1: Author Drizzle schema files for portfolio tables** - `94a766b` (feat)
2. **Task 2: [BLOCKING] Generate migration, attach audit triggers, migrate Postgres** - `bdbf22a` (feat)

**Plan metadata:** (this commit) `docs(03-02): complete portfolio schema + migration plan`

## Files Created/Modified
- `apps/server/src/schema/properties.ts` - `properties` + `property_images` tables, RLS, soft-archive
- `apps/server/src/schema/units.ts` - `units` + `unit_statuses` tables, RLS, soft-archive
- `apps/server/src/schema/tags.ts` - `organization_tag` + `property_tag` tables, RLS
- `apps/server/src/schema/index.ts` - re-exports the three new schema modules
- `apps/server/src/domain/unit-statuses.ts` - `ensureDefaultUnitStatuses` idempotent seed helper
- `apps/server/migrations/0013_pink_azazel.sql` - `CREATE TABLE` + RLS policy + audit trigger for all 6 new tables
- `apps/server/migrations/meta/0012_snapshot.json` - repaired baseline snapshot (see Deviations)
- `apps/server/migrations/meta/0013_snapshot.json` - snapshot after Phase 3 tables land
- `apps/server/migrations/meta/_journal.json` - new `0013_pink_azazel` entry

## Decisions Made
- `base_rent` is integer cents, `notNull().default(0)` — matches RESEARCH A3, avoids float-dollar bugs
- Property address columns are nullable at the DB layer; 03-03's mutation input schema is the actual "required" enforcement point, since D-25 requires the manual-entry fallback to work when Mapbox is unavailable
- Unique constraints: `unit_statuses_org_name_unique` / `organization_tag_org_name_unique` on `(organization_id, name)` to make `ensureDefaultUnitStatuses`'s `onConflictDoNothing` idempotent and to enforce Pattern 7's "unique per org name" rule for catalog tags

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Repaired missing drizzle-kit snapshot history that blocked `generate`**
- **Found during:** Task 2, step 1 (`pnpm --filter @villuh/server generate`)
- **Issue:** `apps/server/migrations/meta/` only had snapshots for `0000`-`0002`, but the journal lists migrations through `0012` — migrations 3-12 were hand-authored SQL (column renames, audit trigger fixes, `organization_id` rename, `billing_plans` table) that never got a matching `drizzle-kit generate` run, so no snapshot was ever committed for them. `generate` diffs against the *last* snapshot file present (`0002`), so it thought `role_permissions`, `plan_limits`, `billing_plans`, and the `test_tenant_data → test_organization_data` rename were all uncommitted changes, and needed an interactive "created or renamed?" prompt to disambiguate — which fails hard with no TTY available (`Error: Interactive prompts require a TTY terminal`). Verified this was 100% pre-existing (reproduced identically with Task 1's new schema files stashed out).
- **Fix:** Ran `drizzle-kit introspect` directly against the live `DATABASE_URL` to build an accurate snapshot of the database as it actually exists (post-migration-0012), stripped out the `audit_log_y2026m*` partition tables it picked up (not Drizzle-managed — `audit_log` has never been part of `schema/*.ts`, consistent with the pre-existing convention), and saved the result as `apps/server/migrations/meta/0012_snapshot.json` (chained via `prevId` to the existing `0002_snapshot.json`'s `id`). This became the correct baseline for `generate`, which then ran cleanly with zero prompts.
- **Files modified:** `apps/server/migrations/meta/0012_snapshot.json` (new)
- **Verification:** `pnpm --filter @villuh/server generate` completed non-interactively and produced exactly the 6 expected `CREATE TABLE` statements plus their FKs/policies
- **Committed in:** `bdbf22a` (Task 2 commit)

**2. [Rule 3 - Blocking, scope-trimmed] Removed incidental constraint/index rename churn from the generated migration**
- **Found during:** Task 2, step 1 (same `generate` run as #1)
- **Issue:** Because the repaired baseline was built via introspection (not a byte-for-byte replay of the original `drizzle-kit`-generated names), `plan_limits`'s and `role_permissions`'s foreign-key constraints came back under Postgres's original auto-generated names (`plan_limits_tier_fkey`, `role_permissions_organization_id_fkey`) instead of Drizzle's canonical `{table}_{col}_{refTable}_{refCol}_fk` convention, and 8 indexes on `member`/`session`/`verification`/`account`/`organization`/`invitation` showed as spurious drop-then-recreate pairs (identical name/definition both sides). `generate` proposed renaming/recreating all of these alongside the real Phase 3 changes — none of which are in scope for this plan.
- **Fix:** Hand-trimmed `0013_pink_azazel.sql` to keep only the `CREATE TABLE`/`ENABLE ROW LEVEL SECURITY`/`ADD CONSTRAINT`/`CREATE POLICY` statements for the 6 new tables, and corrected `0013_snapshot.json`'s `plan_limits`/`role_permissions` foreign-key entries back to their real (unchanged) constraint names so future `generate` runs keep recording the DB's true state instead of drifting from it. Verified live via direct SQL query that `plan_limits_tier_fkey`/`role_permissions_organization_id_fkey` and all 8 pre-existing indexes are untouched post-migration.
- **Files modified:** `apps/server/migrations/0013_pink_azazel.sql`, `apps/server/migrations/meta/0013_snapshot.json`
- **Verification:** Post-migrate SQL query confirmed `plan_limits`/`role_permissions` FK names unchanged; `pnpm --filter @villuh/server typecheck` exits 0
- **Committed in:** `bdbf22a` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 - blocking issues in the migration tooling itself, not the application code)
**Impact on plan:** Both were required to make `generate`/`migrate` work at all in this non-interactive environment. Deviation #2 kept the fix scoped strictly to Phase 3's 6 new tables — no pre-existing table's constraint/index names or definitions changed in the live database. `apps/server/migrations/meta/0003_snapshot.json` through `0011_snapshot.json` remain absent (out of scope — `generate` only ever needs the *last* snapshot to diff against, which is now `0012_snapshot.json`); this is noted as pre-existing tech debt, not introduced by this plan.

## Issues Encountered
None beyond the migration-tooling deviations documented above.

## User Setup Required
None — `apps/server/.env` already had a working `DATABASE_URL`/`DATABASE_APP_URL` from a prior session, so the `[BLOCKING]` migrate step ran without needing new credentials.

## Next Phase Readiness
- Portfolio tables are live and queryable under RLS; 03-03 (properties CRUD + notes sanitization), 03-04 (units CRUD + unit-statuses + Stripe sync), 03-05 (S3 gallery), and 03-09 (tags) can all proceed
- `ensureDefaultUnitStatuses` is ready to be called from `unitStatuses.list` / `units.create` (03-04) — not wired to any router yet, by design (plan explicitly deferred router wiring to later plans)
- No blockers for 03-03

---
*Phase: 03-properties-units*
*Completed: 2026-08-11*

## Self-Check: PASSED

Verified on disk: `apps/server/src/schema/properties.ts`, `units.ts`, `tags.ts`, `apps/server/src/domain/unit-statuses.ts`, `apps/server/migrations/0013_pink_azazel.sql`, `apps/server/migrations/meta/0012_snapshot.json` all exist. Verified commits `94a766b` and `bdbf22a` present in `git log`. Verified live Postgres: all 6 tables exist, RLS enabled on all 6, `organization_isolation` policy present on all 6, exactly one `audit_log_trigger_fn`-backed trigger per table (6 total, confirmed via `pg_trigger`), and pre-existing `plan_limits`/`role_permissions` FK constraint names unchanged post-migration. `pnpm --filter @villuh/server typecheck` exits 0.
