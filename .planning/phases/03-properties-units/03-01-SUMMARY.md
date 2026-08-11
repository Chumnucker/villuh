---
phase: 03-properties-units
plan: 01
subsystem: testing
tags: [vitest, aws-sdk-s3, sanitize-html, mapbox, tiptap, dnd-kit, radix-ui, shadcn]

# Dependency graph
requires:
  - phase: 02-auth-billing
    provides: PLAN_LIMIT error shape (Pattern 2), permissionProcedure, withOrganization RLS pattern
provides:
  - Phase 3 npm dependencies (S3 SDK, sanitize-html, Mapbox, TipTap, dnd-kit)
  - S3_*/AWS_*/NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN documented in .env.example files
  - "@villuh/ui Tabs primitive (Tabs/TabsList/TabsTrigger/TabsContent)"
  - Wave 0 Vitest stub files for properties/units/tags/unit-statuses/gallery
  - Extended plan-limit.test.ts with properties/units PLAN_LIMIT stub cases
affects: [03-02, 03-03, 03-04, 03-05, 03-06, 03-07, 03-09]

# Tech tracking
tech-stack:
  added: ["@aws-sdk/client-s3@3.1108.0", "@aws-sdk/s3-request-presigner@3.1108.0", "sanitize-html@2.17.6", "@types/sanitize-html", "@mapbox/search-js-react@1.6.0", "@tiptap/react@3.30.0", "@tiptap/starter-kit@3.30.0", "@tiptap/extension-link@3.30.0", "@tiptap/pm@3.30.0", "@dnd-kit/core@6.3.1", "@dnd-kit/sortable@10.0.0", "@dnd-kit/utilities"]
  patterns: ["Wave 0 expect.fail() TODO stubs pointing at the exact implementing plan (03-03/03-04/03-09)", "shadcn radix-luma Tabs styled to match existing dialog/select/button conventions (rounded-3xl, bg-secondary, data-[state=active])"]

key-files:
  created:
    - packages/ui/src/tabs.tsx
    - apps/server/src/__tests__/properties.test.ts
    - apps/server/src/__tests__/units.test.ts
    - apps/server/src/__tests__/tags.test.ts
    - apps/server/src/__tests__/unit-statuses.test.ts
    - apps/server/src/__tests__/gallery.test.ts
  modified:
    - apps/server/package.json
    - apps/server/.env.example
    - apps/landlord-web/package.json
    - apps/landlord-web/.env.example
    - packages/ui/src/index.ts
    - apps/server/src/__tests__/plan-limit.test.ts

key-decisions:
  - "Tabs primitive built directly on radix-ui's bundled Tabs export (already a @villuh/ui dependency) rather than running the shadcn CLI, matching hand-written primitives like dialog.tsx/select.tsx"
  - "Added @types/sanitize-html as a server devDependency — sanitize-html 2.17.6 ships no bundled type declarations"
  - "gallery.test.ts mocks @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner module-level (Assumption A6) so Wave 0 stubs run without a real bucket"

patterns-established:
  - "Wave 0 stub tests reference the exact Plan ID that will implement them (e.g. 'TODO: Plan 03-03 implements properties.create') for easy traceability during later waves"

requirements-completed: [PROP-01, UNIT-01]

# Metrics
duration: 25min
completed: 2026-08-11
---

# Phase 3 Plan 1: Wave 0 Bootstrap Summary

**Installed S3/Mapbox/TipTap/dnd-kit dependencies, documented their env vars, added a `Tabs` primitive to `@villuh/ui`, and created five `expect.fail` Vitest stub files (plus extended `plan-limit.test.ts`) so later Phase 3 waves have Nyquist hooks in place before any real APIs exist.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 2 completed
- **Files modified:** 12 (6 created, 6 modified)

## Accomplishments
- Server (`@villuh/server`) and landlord-web (`@villuh/landlord-web`) now declare all Phase 3 SDK dependencies at the exact RESEARCH-pinned versions
- `.env.example` files document `S3_BUCKET`/`AWS_REGION`/`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/`S3_ENDPOINT` and `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` without committing real secrets
- `@villuh/ui` exports a `Tabs` family styled to match the existing radix-luma design system, ready for the UNIT-03/04 stub history tabs
- All Wave 0 Vitest files from `03-VALIDATION.md` exist, import cleanly, and fail closed via `expect.fail(...)` (verified by running the full server suite)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Phase 3 dependencies and document env vars** - `53484ce` (feat)
2. **Task 2: Add Tabs to @villuh/ui and Wave 0 Vitest stubs** - `93ce72e` (feat)

**Plan metadata:** (this commit) `docs(03-01): complete Wave 0 bootstrap plan`

## Files Created/Modified
- `packages/ui/src/tabs.tsx` - Tabs/TabsList/TabsTrigger/TabsContent built on radix-ui's Tabs export
- `packages/ui/src/index.ts` - export the new tabs module
- `apps/server/src/__tests__/properties.test.ts` - PROP-01 CRUD, notes sanitization, soft-archive cascade, RLS stubs
- `apps/server/src/__tests__/units.test.ts` - UNIT-01 CRUD, PLAN_LIMIT, Stripe syncUnits, soft-archive stubs
- `apps/server/src/__tests__/tags.test.ts` - PROP-02 freeform/promote/delete-detach stubs
- `apps/server/src/__tests__/unit-statuses.test.ts` - UNIT-02 seed defaults + admin-only mutation stubs
- `apps/server/src/__tests__/gallery.test.ts` - S3-mocked gallery limit/cover/delete stubs
- `apps/server/src/__tests__/plan-limit.test.ts` - added properties/units PLAN_LIMIT describe blocks
- `apps/server/package.json` - added `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `sanitize-html`, `@types/sanitize-html`
- `apps/server/.env.example` - added S3/AWS env documentation
- `apps/landlord-web/package.json` - added `@mapbox/search-js-react`, `@tiptap/*`, `@dnd-kit/*`
- `apps/landlord-web/.env.example` - added `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`

## Decisions Made
- Built `tabs.tsx` by hand (matching `dialog.tsx`/`select.tsx` conventions) instead of invoking the shadcn CLI, since `radix-ui`'s bundled `Tabs` re-export was already available as a dependency and the CLI isn't wired into this sandbox
- Added `@types/sanitize-html` as a devDependency since the library ships no bundled types (needed for `tsc --noEmit` to stay clean ahead of Plan 03-03's `sanitizeNotesHtml`)

## Deviations from Plan

None in the implementation itself - plan executed exactly as written. `@types/sanitize-html` was already anticipated by the plan's own acceptance criteria ("as a devDependency if types are not bundled").

**State tracking note:** This plan's frontmatter lists `requirements: [PROP-01, UNIT-01]`, but those same requirement IDs also appear in five other Phase 3 plans' frontmatter (03-02, 03-03, 03-05, 03-07, 03-08 for PROP-01; 03-02, 03-04, 03-06 for UNIT-01) — Phase 3 plans use `requirements` to mean "contributes to," not "fully delivers." Running `requirements.mark-complete PROP-01 UNIT-01` would have incorrectly flipped `.planning/REQUIREMENTS.md` to `Complete` after only the Wave 0 bootstrap plan (deps/env/stubs, no actual CRUD yet). Skipped that mechanical step and left both requirements `Pending` in REQUIREMENTS.md — they should only flip to Complete once their last contributing plan (03-08 for PROP-01, 03-06 for UNIT-01) lands.

## Issues Encountered
None.

## User Setup Required

**External services require manual configuration before live gallery/Mapbox features work in later waves** (per plan `user_setup`):
- `S3_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (optionally `S3_ENDPOINT` for R2/MinIO) in `apps/server/.env`
- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` in `apps/landlord-web/.env` (URL-restricted to landlord hosts)

Neither blocks Wave 0-3 work — S3 is mocked in tests and Mapbox falls back to manual address fields (D-25).

## Next Phase Readiness
- Wave 1 (03-02: Drizzle schemas + migration + audit triggers) can proceed immediately — no blockers
- Wave 0 Vitest stubs give Waves 2-4 (03-03/03-04/03-09) concrete test files to fill in as real assertions replace `expect.fail`
- Tabs primitive is ready for 03-06's UNIT-03/04 stub history tabs

---
*Phase: 03-properties-units*
*Completed: 2026-08-11*

## Self-Check: PASSED

All created files verified present on disk; all task/summary commit hashes (`53484ce`, `93ce72e`, `703ae4d`) verified in git log.
