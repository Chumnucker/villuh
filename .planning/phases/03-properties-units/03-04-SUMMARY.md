---
phase: 03-properties-units
plan: "04"
subsystem: api
tags: [trpc, drizzle, postgres, rls, stripe, plan-limits, vitest]

# Dependency graph
requires:
  - phase: 03-properties-units (Plan 02)
    provides: units + unit_statuses Drizzle tables, ensureDefaultUnitStatuses seed helper
  - phase: 03-properties-units (Plan 03)
    provides: properties tRPC router, assertPlanLimit/countActiveUnits domain helpers, createTrpcCaller test pattern
provides:
  - "units tRPC router: list/get/create/update/archive with plan-limit backstop and soft-archive"
  - "unitStatuses tRPC router: list (auto-seeds catalog)/create/update/reorder/archive, admin-only mutations"
  - "domain/billing-sync.ts: syncOrgUnitQuantity(organizationId, unitCount) — shared Stripe unit-quantity sync"
affects: [03-05+ (landlord UI unit/status screens), 03-09 (tags + me.get quota counts)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "syncOrgUnitQuantity extracted from billing.syncUnits body — called directly by units.create/archive and properties.archive (cascade) after their transaction commits, avoiding a tRPC-to-tRPC call"
    - "Stripe sync happens in a second withOrganization read (post-commit active-unit recount), never inside the same transaction as the mutating write — keeps external API calls out of DB transactions"
    - "unit-statuses catalog: is_system rows can be renamed but never archived/deleted; custom statuses can only be archived while unassigned from any active unit"

key-files:
  created:
    - apps/server/src/modules/units/schemas.ts
    - apps/server/src/modules/units/service.ts
    - apps/server/src/modules/units/router.ts
    - apps/server/src/modules/unit-statuses/schemas.ts
    - apps/server/src/modules/unit-statuses/router.ts
    - apps/server/src/domain/billing-sync.ts
  modified:
    - apps/server/src/router.ts
    - apps/server/src/modules/billing/router.ts
    - apps/server/src/modules/properties/router.ts
    - apps/server/package.json
    - apps/server/src/__tests__/units.test.ts
    - apps/server/src/__tests__/unit-statuses.test.ts
    - apps/server/src/__tests__/plan-limit.test.ts

key-decisions:
  - "unit-statuses business logic lives inline in router.ts (no separate service.ts) — matches the plan's file scope and members/router.ts precedent for smaller CRUD-catalog routers"
  - "listUnits input schema is a fully-optional z.object() so `units.list()` works with no args, mirroring properties.list; propertyId filter is opt-in"
  - "statusId is optional (not required) on units.create — D-28 manual assignment means a unit can exist unassigned until the landlord picks a status"

patterns-established:
  - "Pattern 8 (Stripe unit sync): mutation commits → separate withOrganization recount of countActiveUnits → syncOrgUnitQuantity call outside any transaction"

requirements-completed: [UNIT-01, UNIT-02]

# Metrics
duration: ~40min
completed: 2026-08-11
---

# Phase 03 Plan 04: Units + Unit-Statuses APIs + Stripe Sync Summary

**Units and unit-statuses tRPC routers (CRUD, plan-limit backstop, soft-archive, admin-gated status catalog) plus a `syncOrgUnitQuantity` helper extracted from `billing.syncUnits` and wired into every unit-count-changing mutation (create/archive/cascade-archive) — 19 new passing integration tests, zero regressions.**

## Performance

- **Duration:** ~40 min
- **Tasks:** 2/2 completed
- **Files modified/created:** 13 (6 created, 7 modified)

## Accomplishments
- `units` tRPC router: full CRUD + soft-archive, gated by `permissionProcedure('write')` for mutations, plan-limit enforced on create via the resource-generic `assertPlanLimit` (reused from Plan 03-03, `resource: 'units'`)
- `unitStatuses` tRPC router: `list` auto-seeds Available/Occupied/Maintenance (`ensureDefaultUnitStatuses`, idempotent); `create`/`update`/`reorder`/`archive` gated by `permissionProcedure('admin')` (D-27) — seeded `is_system` rows can be renamed but never archived, and custom statuses can only be archived while unassigned from any active unit
- Extracted `syncOrgUnitQuantity(organizationId, unitCount)` into `domain/billing-sync.ts` from `billing.syncUnits`'s body (Pattern 8); `billing.syncUnits` now delegates to it, and it's called directly (no tRPC-to-tRPC call) from `units.create`, `units.archive`, and — patched into Plan 03-03's `properties.archive` — the cascade-archive path, so Stripe's subscription-item quantity stays consistent no matter which mutation changes the active unit count
- Status assignment (D-28) uses ordinary `permissionProcedure('write')` on `units.create`/`units.update` — separate from the admin-only catalog management on `unitStatuses.*`
- Registered `units` + `unitStatuses` on `appRouter`; added `./schemas/units` and `./schemas/unit-statuses` package exports
- Replaced every `expect.fail` placeholder in `units.test.ts` (8 tests) and `unit-statuses.test.ts` (5 tests) with real integration tests; replaced the `PROP-01`/`UNIT-01` placeholders in `plan-limit.test.ts` (5 tests) with real `PLAN_LIMIT` assertions — `AUTH-03`/`AUTH-04` blocks in the same file remain `expect.fail` on purpose (they reference "Plan 06", out of this plan's scope)

## Task Commits

1. **Task 1: units + unit-statuses routers, Stripe sync helper, tests** - `fd3509d` (feat)
2. **Task 2: Confirm properties.archive Stripe sync + typecheck** - `5cd5399` (fix)

_No plan-metadata-only commit was made separately from this one; STATE.md/ROADMAP.md/this SUMMARY are committed together in the final commit below._

## Files Created/Modified
- `apps/server/src/modules/units/schemas.ts` - `createUnitInputSchema`/`updateUnitInputSchema`/`unitIdInputSchema`/`listUnitsInputSchema` (baseRentCents integer-cents API field, mapped to DB `base_rent`)
- `apps/server/src/modules/units/service.ts` - `listUnits`/`getUnit`/`createUnit`/`updateUnit`/`archiveUnit` — property/status ownership checks, plan-limit enforcement, soft-archive
- `apps/server/src/modules/units/router.ts` - `units` tRPC router; create/archive call `syncOrgUnitQuantity` after their transaction commits
- `apps/server/src/modules/unit-statuses/schemas.ts` - create/update/reorder/archive Zod schemas
- `apps/server/src/modules/unit-statuses/router.ts` - `unitStatuses` tRPC router (business logic inline, no separate service.ts — matches plan's file scope)
- `apps/server/src/domain/billing-sync.ts` - `syncOrgUnitQuantity(organizationId, unitCount)`, extracted from `billing.syncUnits`
- `apps/server/src/router.ts` - registered `units` and `unitStatuses` on `appRouter`
- `apps/server/src/modules/billing/router.ts` - `syncUnits` mutation now delegates to `syncOrgUnitQuantity`
- `apps/server/src/modules/properties/router.ts` - `archive` now recomputes active unit count and calls `syncOrgUnitQuantity` when the cascade archived any units (Task 2)
- `apps/server/package.json` - added `./schemas/units` and `./schemas/unit-statuses` exports
- `apps/server/src/__tests__/units.test.ts` - 8 integration tests (CRUD, cross-org RLS rejection, plan limit, Stripe sync on create/archive, soft-archive)
- `apps/server/src/__tests__/unit-statuses.test.ts` - 5 integration tests (seeding/idempotency, admin-only mutations incl. manager/viewer FORBIDDEN, write-role status assignment)
- `apps/server/src/__tests__/plan-limit.test.ts` - replaced `PROP-01`/`UNIT-01` placeholders with 5 real `PLAN_LIMIT` assertions; left `AUTH-03`/`AUTH-04` (Plan 06 scope) untouched

## Decisions Made
- Kept unit-statuses logic inline in `router.ts` instead of adding a `service.ts` — the plan's `files_modified` frontmatter only lists `schemas.ts`/`router.ts` for this module, and the mutation set (create/update/reorder/archive) is small enough to stay readable inline, consistent with `members/router.ts`'s precedent for similarly-scoped catalog routers.
- Stripe sync always happens in a *second* `withOrganization` call after the mutating transaction commits (recounting `countActiveUnits`), never inside the same transaction as the write — keeps the external Stripe API call out of any DB transaction, avoiding long-held locks if Stripe is slow.
- `properties.archive`'s Stripe sync is conditional on `archivedUnitIds.length > 0` — a property archive with zero active units doesn't change the org's billable unit count, so skip the extra DB read + Stripe call in that case.

## Deviations from Plan

None - plan executed exactly as written. Task 2's "confirm or patch" instruction found the sync call was in fact missing from Plan 03-03's `properties.archive` (expected — Plan 03-03 was scoped to properties/gallery only, and Plan 03-04's `syncOrgUnitQuantity` helper didn't exist yet when it ran), so it was patched per the task's explicit fallback instructions rather than being an unplanned deviation.

## Issues Encountered
- `pnpm --filter @villuh/server test -- <files>` still doesn't filter (same pre-existing pnpm/vitest-args issue documented in Plan 03-03's summary). Used `npx vitest run <files>` from `apps/server` for all verification in this plan, matching the established workaround.
- Full-suite run (`npx vitest run`, no args) now shows 7 failing files / 32 failing tests (down from the pre-existing baseline of 9 files / 51 tests documented in Plan 03-03's summary) — `units.test.ts` and `unit-statuses.test.ts` are fully green and no longer in the failing set. Remaining failures are all pre-existing and out of scope for this plan: `audit.test.ts`/`billing.test.ts`/`org.test.ts`/`permissions.test.ts` (404s against REST endpoints that don't exist under the tRPC-only API), `tags.test.ts` (explicitly deferred to Plan 09 per this plan's `<interfaces>` section), `wizard.test.ts` (Plan 06 scope), and the `AUTH-03`/`AUTH-04` blocks in `plan-limit.test.ts` (also Plan 06 scope, left as `expect.fail` per this plan's explicit instruction).

## User Setup Required
None - no external service configuration required. Stripe calls in tests are mocked (`vi.mock('stripe', ...)`, same pattern as `billing.test.ts`); real `STRIPE_SECRET_KEY` in `.env` is only exercised outside test runs.

## Next Phase Readiness
- `units` and `unitStatuses` routers are live on `appRouter` and fully tested — landlord UI plans (03-05+) can wire directly to `trpc.units.*` and `trpc.unitStatuses.*`.
- `syncOrgUnitQuantity` is the single source of truth for Stripe unit-quantity sync; any future mutation that changes the active-unit count should call it the same way (post-commit, outside any transaction) rather than re-deriving the Stripe update logic.
- Tags API and `me.get` quota counts (currently stubbed at 0 for units/properties) remain deferred to Plan 09, as scoped by this plan's `<interfaces>` section — no blockers introduced here.
- No blockers carried forward.

---
*Phase: 03-properties-units*
*Completed: 2026-08-11*

## Self-Check: PASSED

Verified on disk: `apps/server/src/modules/units/{schemas,service,router}.ts`, `apps/server/src/modules/unit-statuses/{schemas,router}.ts`, and `apps/server/src/domain/billing-sync.ts` all exist. Verified commits `fd3509d` and `5cd5399` present in `git log`. `pnpm --filter @villuh/server typecheck` exits 0. `npx vitest run src/__tests__/units.test.ts src/__tests__/unit-statuses.test.ts src/__tests__/plan-limit.test.ts` — all 19 real (non-placeholder) tests pass; the only 5 failures are the pre-existing `AUTH-03`/`AUTH-04` `expect.fail` placeholders explicitly out of this plan's scope. `npx vitest run src/__tests__/properties.test.ts` (10/10 passed) confirms no regression from the `properties.archive` patch.
