---
phase: 03-properties-units
plan: "03"
subsystem: api
tags: [trpc, drizzle, postgres, rls, s3, aws-sdk, sanitize-html, plan-limits, vitest]

# Dependency graph
requires:
  - phase: 03-properties-units (Plan 02)
    provides: properties/units Drizzle schemas + migration with RLS and audit triggers
provides:
  - "properties tRPC router: list/get/create/update/archive + nested gallery (list/add/reorder/remove)"
  - "uploads tRPC router: presignPropertyImage"
  - "domain/plan-limit.ts: assertPlanLimit(resource) reusable across properties/units/members"
  - "domain/portfolio-counts.ts: countActiveProperties/countActiveUnits (archived_at IS NULL)"
  - "lib/sanitize-notes.ts: sanitizeNotesHtml allowlist for TipTap notes"
  - "modules/uploads/s3.ts: presignPut/presignGet/deleteObject wrapping AWS SDK v3"
affects: [03-04 (units), 03-05+ (landlord UI property/gallery screens)]

# Tech tracking
tech-stack:
  added: ["@aws-sdk/client-s3", "@aws-sdk/s3-request-presigner", "sanitize-html"]
  patterns:
    - "assertPlanLimit({ tx, organizationId, resource, current }) — extracted from members/router.ts, resource-generic PLAN_LIMIT check"
    - "Soft-archive cascade: single withOrganization transaction sets archived_at on parent + children, returns affected child ids for UI confirm"
    - "S3 objectKey-only persistence — DB never stores a URL; presigned GET generated at read time"
    - "createTrpcCaller(cookie) test helper — server-side tRPC caller from a session cookie, no HTTP round-trip"

key-files:
  created:
    - apps/server/src/domain/plan-limit.ts
    - apps/server/src/domain/portfolio-counts.ts
    - apps/server/src/lib/sanitize-notes.ts
    - apps/server/src/modules/uploads/s3.ts
    - apps/server/src/modules/uploads/schemas.ts
    - apps/server/src/modules/uploads/router.ts
    - apps/server/src/modules/properties/schemas.ts
    - apps/server/src/modules/properties/service.ts
    - apps/server/src/modules/properties/router.ts
    - apps/server/migrations/0014_audit_log_partitions_2026h2.sql
  modified:
    - apps/server/src/router.ts
    - apps/server/package.json
    - apps/server/src/__tests__/properties.test.ts
    - apps/server/src/__tests__/gallery.test.ts
    - apps/server/src/__tests__/setup.ts
    - apps/server/vitest.config.ts

key-decisions:
  - "audit_log cleanup in tests: TRUNCATE (not DELETE) — bypasses the immutability trigger that blocked the organization cascade delete"
  - "Vitest 4 migration: replaced invalid top-level singleFork with maxWorkers: 1, keeping default isolate so per-file S3 SDK mocks don't leak across test files"
  - "Gallery images store S3 objectKey only; presigned GET URLs are attached to gallery.list responses at read time, never persisted"

patterns-established:
  - "Pattern: resource-generic plan-limit helper (domain/plan-limit.ts) — future resources add a PlanResource union member + reuse assertPlanLimit"
  - "Pattern: soft-archive cascade returns affected child ids (archivedUnitIds) for confirm-before-destroy UI"

requirements-completed: [PROP-01]

# Metrics
duration: ~65min
completed: 2026-08-11
---

# Phase 03 Plan 03: Properties CRUD + S3 Gallery Summary

**Full properties CRUD (create/update/list/get/archive) with soft-archive cascade to units, sanitized notes, plan-limit enforcement, and an S3 presigned-upload gallery pipeline (25-image cap, cover = sort_order 0, immediate delete) — all under RLS with 15 passing integration tests.**

## Performance

- **Duration:** ~65 min
- **Tasks:** 2/2 completed
- **Files modified/created:** 15 (9 plan files + 6 unplanned test-infra fix files)

## Accomplishments
- `properties` tRPC router: full CRUD + archive cascade, gated by `permissionProcedure('write')` for mutations and `protectedProcedure` for reads, always wrapped in `withOrganization`
- Nested `properties.gallery` router: list (with presigned GET URLs attached at read time), add, reorder (cover = index 0), remove (S3 delete + DB delete in one operation)
- `uploads.presignPropertyImage`: validates MIME allowlist (JPEG/PNG/WebP/GIF), 10MB cap, 25-image gallery cap, and property ownership before presigning
- Extracted `assertPlanLimit` into a reusable, resource-generic domain helper (was inlined in `members/router.ts`)
- Fixed two pre-existing infrastructure bugs that were silently blocking every DB-touching test in the suite (see Deviations)

## Task Commits

1. **Task 1: Domain helpers (plan-limit, portfolio-counts, sanitize-notes, S3 client)** - `0606a39` (feat) — committed earlier in this session, before this executor run resumed
2. **Task 2: properties + uploads tRPC routers and PROP-01/gallery tests** - `ea28fc4` (feat)

**Deviation fix commits:**
- `42dd6f2` (fix) — add missing `audit_log` monthly partitions for Aug–Dec 2026
- `dfd6940` (fix) — test cleanup cascade (TRUNCATE) + serialize Vitest files (`maxWorkers: 1`)

_No plan-metadata-only commit was made separately; STATE.md/ROADMAP.md/this SUMMARY are committed together in the final commit below._

## Files Created/Modified
- `apps/server/src/domain/plan-limit.ts` - `assertPlanLimit({ tx, organizationId, resource, current })`, resource-generic PLAN_LIMIT check
- `apps/server/src/domain/portfolio-counts.ts` - `countActiveProperties`/`countActiveUnits` (archived_at IS NULL)
- `apps/server/src/lib/sanitize-notes.ts` - `sanitizeNotesHtml` allowlist (p, br, strong, em, ul, ol, li, a, h2, h3)
- `apps/server/src/modules/uploads/s3.ts` - `presignPut`/`presignGet`/`deleteObject` wrapping AWS SDK v3, lazy client init
- `apps/server/src/modules/uploads/schemas.ts` - MIME allowlist, `MAX_IMAGE_BYTES` (10MB), `MAX_GALLERY_IMAGES` (25)
- `apps/server/src/modules/uploads/router.ts` - `presignPropertyImage` procedure
- `apps/server/src/modules/properties/schemas.ts` - create/update/gallery Zod schemas
- `apps/server/src/modules/properties/service.ts` - properties + gallery business logic
- `apps/server/src/modules/properties/router.ts` - `properties` tRPC router with nested `gallery` sub-router
- `apps/server/src/router.ts` - registered `properties` and `uploads` on `appRouter`
- `apps/server/package.json` - added `./schemas/properties` and `./schemas/uploads` exports
- `apps/server/src/__tests__/properties.test.ts` - 9 integration tests (CRUD, sanitize, plan limit, archive cascade)
- `apps/server/src/__tests__/gallery.test.ts` - 6 integration tests (presign limits, cover/reorder, delete)
- `apps/server/src/__tests__/setup.ts` - `clearTestUsers()` now `TRUNCATE audit_log` before deleting organizations
- `apps/server/vitest.config.ts` - `maxWorkers: 1` replacing the ignored `singleFork: true`
- `apps/server/migrations/0014_audit_log_partitions_2026h2.sql` - Aug–Dec 2026 `audit_log` partitions

## Decisions Made
- Kept `assertPlanLimit` signature generic over `resource: 'properties' | 'units' | 'members'` so Plan 03-04 (units) can reuse it directly instead of re-inlining the check.
- Gallery `remove` deletes the S3 object before the DB row, inside the same service call (not soft-delete, per D-37) — if S3 delete throws, the DB row is intentionally left in place rather than orphaning the S3 object silently.
- Chose `TRUNCATE` over disabling/re-enabling the audit trigger for test cleanup — simpler, and test databases don't need audit history retained between test files.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `S3Client` mock in `gallery.test.ts` was not constructible**
- **Found during:** Task 2 verification (first gallery test run)
- **Issue:** `vi.mock('@aws-sdk/client-s3', () => ({ S3Client: vi.fn(() => ({ send: vi.fn() })) }))` used an arrow function as the mock implementation; `new S3Client()` in `s3.ts` threw `TypeError: ... is not a constructor`.
- **Fix:** Changed the mock implementation to a named regular function (`vi.fn().mockImplementation(function S3ClientMock() { return { send: vi.fn() } })`), which is a valid constructor target.
- **Files modified:** `apps/server/src/__tests__/gallery.test.ts`
- **Verification:** `gallery.test.ts` presign/delete tests exercise `new S3Client()` without throwing.
- **Committed in:** `ea28fc4` (Task 2 commit)

**2. [Rule 3 - Blocking] Missing `audit_log` partitions for the current half of 2026**
- **Found during:** Task 2 verification — first insert into an audited table (`properties`, and indirectly `role_permissions` seeding on every signup) failed with `PostgresError: no partition of relation "audit_log" found for row`.
- **Issue:** The initial audit-log migration only created monthly partitions through July 2026; any audited write in August+ failed. This blocked **every** test file that signs up a user, not just this plan's new tests — it was a project-wide latent blocker that happened to surface now because the current month rolled past the last precreated partition.
- **Fix:** Added `apps/server/migrations/0014_audit_log_partitions_2026h2.sql` creating partitions for Aug–Dec 2026, applied to both the dev and test databases.
- **Files modified:** `apps/server/migrations/0014_audit_log_partitions_2026h2.sql`, `apps/server/migrations/meta/_journal.json`
- **Verification:** Signup + audited inserts succeed in both properties.test.ts and gallery.test.ts.
- **Committed in:** `42dd6f2` (separate fix commit, kept out of the feature commit for a clean diff)

**3. [Rule 3 - Blocking] `clearTestUsers()` cleanup failed with "audit_log rows are immutable"**
- **Found during:** Task 2 verification, once the partition fix (above) let audited rows actually get written for real test organizations.
- **Issue:** `audit_log_organization_id_fkey` has `ON DELETE CASCADE` (added in migration `0011_organization_id_rename.sql`), but `audit_log` also has a `BEFORE DELETE` trigger (`audit_log_immutable_fn`) that unconditionally raises — even for the table owner. `DELETE FROM organization` in test cleanup therefore always failed once any audited row existed for that org (which is true for every signup, via `role_permissions` seeding). This was a pre-existing, project-wide bug in the FK/trigger design, not something introduced by this plan, but it blocked verification of this plan's tests.
- **Fix:** Changed `clearTestUsers()` to `TRUNCATE audit_log` (bypasses per-row triggers) before the cascade of `DELETE FROM organization`. Left the production FK/trigger design untouched — this is a test-only workaround, not a schema change.
- **Files modified:** `apps/server/src/__tests__/setup.ts`
- **Verification:** `clearTestUsers()` completes without error in both new test files.
- **Committed in:** `dfd6940` (separate fix commit)

**4. [Rule 3 - Blocking] Test files raced against each other on shared DB state**
- **Found during:** Task 2 verification, running `properties.test.ts` + `gallery.test.ts` together after fix #3.
- **Issue:** `vitest.config.ts` set a top-level `singleFork: true`, which is not a valid Vitest 4 option (the v4 "pool rework" replaced `poolOptions.forks.singleFork` with `maxWorkers`); it was silently ignored. Test files ran concurrently, so one file's global `clearTestUsers()` (which deletes ALL users/orgs, not just its own) could delete another file's in-progress test user mid-run, surfacing as `Better Auth: User not found`.
- **Fix:** Replaced with `maxWorkers: 1`. Deliberately did **not** also set `isolate: false` (the naive full migration) — that shares the module registry across files and broke `gallery.test.ts`'s `vi.mock('@aws-sdk/client-s3', ...)` once `properties.test.ts` had already loaded the real AWS SDK module in the same worker (surfaced as `CredentialsProviderError: Could not load credentials from any providers`). `maxWorkers: 1` alone serializes file execution while keeping each file's module graph (and mocks) isolated.
- **Files modified:** `apps/server/vitest.config.ts`
- **Verification:** `npx vitest run src/__tests__/properties.test.ts src/__tests__/gallery.test.ts` → 2 files, 15/15 tests passed, twice in a row.
- **Committed in:** `dfd6940` (same fix commit as #3)

---

**Total deviations:** 4 auto-fixed (all Rule 3 — blocking issues discovered while running this plan's own verification command)
**Impact on plan:** All four were necessary to make this plan's (and, for #2–#4, every other test file's) verification runnable at all. None changed the plan's scope, API surface, or schema — #2–#4 are test-infrastructure/migration fixes, not product code changes.

## Issues Encountered
- `pnpm --filter @villuh/server test -- <files>` does not filter — pnpm's `--` separator does not forward args through this particular script the way expected. Confirmed pre-existing, unrelated to this plan's code. Workaround used for all verification in this plan: `pnpm --filter @villuh/server test <files>` (no `--`) or `npx vitest run <files>` from `apps/server`. Not fixed — out of scope for this plan and orthogonal to the code delivered.
- The full server test suite (`pnpm --filter @villuh/server test` / `npx vitest run` with no args) still has 9 failing files / 51 failing tests unrelated to this plan: `wizard.test.ts` and `units.test.ts` contain explicit `expect.fail('TODO: Plan 03-04 ...')` / `'TODO: Plan 06 ...')` placeholders for future plans, and `audit.test.ts`, `billing.test.ts`, `org.test.ts`, `permissions.test.ts`, `plan-limit.test.ts`, `tags.test.ts`, `unit-statuses.test.ts` fail with 404s against REST endpoints (`/api/audit-log`, etc.) that don't exist yet from earlier phases. Verified these are pre-existing and unaffected by this plan's changes (confirmed by inspecting failure messages — none reference properties/uploads/gallery code). Out of scope per the executor's scope-boundary rule; not fixed.

## User Setup Required
None - no external service configuration required. (S3 credentials are only needed for real, non-test environments; gallery tests mock the AWS SDK per Assumption A6.)

## Next Phase Readiness
- `properties` and `uploads` routers are live on `appRouter` and fully tested — Plan 03-04 (units) can build directly on `countActiveUnits`/`assertPlanLimit(resource: 'units')` without re-deriving the pattern.
- The soft-archive cascade pattern (single transaction, return affected child ids) is established and ready to be reused if units gain their own children.
- Landlord UI plans (03-05+) can wire directly to `trpc.properties.*` and `trpc.uploads.presignPropertyImage` — the gallery flow (presign → client PUT → `gallery.add`) is fully functional end-to-end against the mocked S3 in tests.
- No blockers carried forward. The two test-infra fixes (audit_log partitions, `maxWorkers`) unblock ALL future phases' test suites, not just this one.

---
*Phase: 03-properties-units*
*Completed: 2026-08-11*

## Self-Check: PASSED

All 10 created files confirmed present on disk; all 4 commit hashes (`0606a39`, `ea28fc4`, `42dd6f2`, `dfd6940`) confirmed in `git log`.
