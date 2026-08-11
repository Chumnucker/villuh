---
phase: 03-properties-units
plan: "09"
subsystem: api
tags: [trpc, drizzle, postgres, rls, zod, vitest, plan-limits]

# Dependency graph
requires:
  - phase: 03-properties-units (Plan 03)
    provides: properties tRPC router, countActiveProperties, withOrganization pattern
  - phase: 03-properties-units (Plan 04)
    provides: units tRPC router, countActiveUnits, exclusive ownership of router.ts/package.json after this plan
provides:
  - "tags tRPC router: org catalog CRUD (write-gated) + freeform property tags + promote + bulk set"
  - "me.get: live countActiveProperties/countActiveUnits quota counts (replacing 0-stubs)"
affects: [03-07 (TagPicker UI), 03-05+ (PlanLimitGate accurate counts)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fixed Zod enum palette (TAG_ICON_KEYS/TAG_COLOR_KEYS) at the schema layer rejects arbitrary icon/color values before they reach the DB — same shape as unit-statuses but enforced via z.enum instead of free-text (D-21, T-03-16)"
    - "Tag business logic inline in tags/router.ts (no service.ts) — matches unit-statuses/router.ts precedent and this plan's files_modified scope"
    - "promoteFreeform dedups by organization_tag_org_name_unique: reuses an existing catalog tag with the same name instead of erroring, since two independently-freeform-labeled tags promoting to the same name should converge"

key-files:
  created:
    - apps/server/src/modules/tags/schemas.ts
    - apps/server/src/modules/tags/router.ts
  modified:
    - apps/server/src/router.ts
    - apps/server/package.json
    - apps/server/src/modules/me/router.ts
    - apps/server/src/__tests__/tags.test.ts

key-decisions:
  - "Added setPropertyTags (bulk-replace catalog-backed tags on a property) and attachOrganizationTag/removePropertyTag/listPropertyTags/listOrganizationTags/updateOrganizationTag beyond the plan's minimal interface list, since the <interfaces> section named both 'setPropertyTags' and 'addFreeform' as expected surface and Plan 07's TagPicker needs read + attach/detach endpoints, not just create/promote/delete"
  - "promoteFreeform looks up an existing organization_tag by name first and reuses it if found, rather than always inserting — avoids violating organization_tag_org_name_unique when two properties independently freeform-tag the same label before either is promoted"

requirements-completed: [PROP-02]

# Metrics
duration: ~35min
completed: 2026-08-11
---

# Phase 03 Plan 09: Tags tRPC API + Live me.get Quota Counts Summary

**Full tags tRPC router (org catalog CRUD, freeform property tags, promote-to-catalog, bulk set, cascade-detach delete) gated by a fixed Zod-enum icon/color palette, plus `me.get` wired to `countActiveProperties`/`countActiveUnits` replacing the hardcoded `0` quota stubs — 10 new passing integration tests, zero regressions.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 2/2 completed
- **Files modified/created:** 6 (2 created, 4 modified)

## Accomplishments
- `tags` tRPC router: `listOrganizationTags`/`createOrganizationTag`/`updateOrganizationTag`/`deleteOrganizationTag` (org catalog, write-gated), `listPropertyTags`/`addFreeform`/`attachOrganizationTag`/`setPropertyTags`/`removePropertyTag` (property-level assignment, write-gated), `promoteFreeform` (write-gated, dedups by name)
- Fixed palette enforcement: `TAG_ICON_KEYS` (14 keys) and `TAG_COLOR_KEYS` (8 keys) as `z.enum` — any icon/color outside the UI-SPEC-locked set is rejected by Zod before it reaches the DB (D-21, T-03-16), verified by a dedicated rejection test
- `deleteOrganizationTag` (D-20): single `withOrganization` transaction deletes every `property_tag` row referencing the catalog tag, then deletes the catalog row itself — verified across two properties in one test
- `me.get` `counts.properties`/`counts.units` now call `countActiveProperties`/`countActiveUnits` (same helpers used by plan-limit checks and Stripe sync) instead of hardcoded `0` — verified end-to-end: create property+unit → counts become 1/1 → archive property (D-31 cascade) → counts drop back to 0/0
- Registered `tags` on `appRouter`; added `./schemas/tags` package export
- Replaced all 6 `expect.fail` placeholders in `tags.test.ts` and added 4 more cases (icon palette rejection, cross-org RLS isolation, bulk `setPropertyTags`, `me.get` quota) — 10 tests total, all green

## Task Commits

1. **Task 1: tags router + register on AppRouter** - `c242833` (feat)
2. **Task 2: me.get real quota counts + tags tests** - `0ad6d5d` (feat)

_No plan-metadata-only commit was made separately from this one; STATE.md/ROADMAP.md/this SUMMARY are committed together in the final commit below._

## Files Created/Modified
- `apps/server/src/modules/tags/schemas.ts` - `TAG_ICON_KEYS`/`TAG_COLOR_KEYS` fixed-palette Zod enums; create/update/delete organization-tag schemas; add-freeform/attach/set/remove/promote property-tag schemas
- `apps/server/src/modules/tags/router.ts` - `tagsRouter`; org catalog CRUD (write-gated) + property tag assignment (freeform, attach, bulk set, remove, promote); `requireProperty`/`requireOrganizationTag` local ownership guards (no separate service.ts, matching unit-statuses precedent)
- `apps/server/src/router.ts` - registered `tags` on `appRouter`
- `apps/server/package.json` - added `./schemas/tags` export
- `apps/server/src/modules/me/router.ts` - `counts.units`/`counts.properties` now `countActiveUnits`/`countActiveProperties` instead of hardcoded `0`
- `apps/server/src/__tests__/tags.test.ts` - 10 integration tests: freeform add + palette rejection, promote (success + FORBIDDEN for viewer), delete cascade-detach (success + FORBIDDEN for viewer), cross-org RLS isolation, bulk `setPropertyTags`, `me.get` quota live counts across create/archive

## Decisions Made
- Implemented the full property-tag assignment surface (`listPropertyTags`, `attachOrganizationTag`, `setPropertyTags`, `removePropertyTag`) beyond the plan's minimal named interface (`setPropertyTags / addFreeform, promoteFreeform`) — the plan's own `<interfaces>` line names both `setPropertyTags` and `addFreeform`, and Plan 07's TagPicker UI (multi-select combobox with attach/detach) needs list + attach + bulk-set + remove, not just add + promote + delete. This is additive surface, not a scope change to the plan's data model or permission rules.
- `promoteFreeform` reuses an existing `organization_tag` row by name instead of always inserting: `organization_tag_org_name_unique` would otherwise throw if two properties freeform-tagged the same label (e.g. "Luxury") before either was promoted. Reuse-by-name keeps promote idempotent and avoids a confusing unique-constraint 500.
- Kept tag business logic inline in `tags/router.ts` (no `service.ts`) — consistent with `unit-statuses/router.ts`'s precedent (Plan 04) and this plan's `files_modified` frontmatter, which only lists `schemas.ts`/`router.ts` for the tags module.

## Deviations from Plan

None - plan executed exactly as written. The additional `setPropertyTags`/`attachOrganizationTag`/`listPropertyTags`/`removePropertyTag`/`updateOrganizationTag` procedures beyond the two headline flows (`addFreeform`, `promoteFreeform`, `deleteOrganizationTag`) were explicitly named in the plan's own `<interfaces>` section (`setPropertyTags / addFreeform`) and are required read/write surface for the plan's stated purpose ("unblocks TagPicker UI in Plan 07") — not unplanned scope creep.

## Issues Encountered
None. `pnpm --filter @villuh/server test -- <files>` still doesn't filter (same pre-existing pnpm/vitest-args issue documented in Plans 03/04's summaries); used `npx vitest run <files>` from `apps/server` for all verification, matching the established workaround.

Ran `properties.test.ts`, `units.test.ts`, `unit-statuses.test.ts`, `plan-limit.test.ts`, and `gallery.test.ts` alongside `tags.test.ts` to confirm the `me.get` change introduced no regressions: 34 passed, 5 failed — the 5 failures are the pre-existing `AUTH-03`/`AUTH-04` `expect.fail` placeholders in `plan-limit.test.ts` (explicitly Plan 06 scope per Plan 04's summary), unrelated to this plan's changes.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `tags` router is live on `appRouter` and fully tested — Plan 07's TagPicker UI can wire directly to `trpc.tags.*` (list/add/attach/set/remove/promote) and the org tag management surface (`trpc.tags.{list,create,update,delete}OrganizationTag`).
- `me.get`'s `org.quota.{properties,units}` now reflects real active-row counts — `PlanLimitGate` (Plan 05+) will show accurate quota usage instead of always-available `0/limit`.
- No blockers carried forward.

---
*Phase: 03-properties-units*
*Completed: 2026-08-11*

## Self-Check: PASSED

Verified on disk: `apps/server/src/modules/tags/{schemas,router}.ts` both exist. Verified commits `c242833` and `0ad6d5d` present in `git log`. `pnpm --filter @villuh/server typecheck` exits 0. `npx vitest run src/__tests__/tags.test.ts` — 10/10 tests pass. `npx vitest run src/__tests__/properties.test.ts src/__tests__/units.test.ts src/__tests__/unit-statuses.test.ts src/__tests__/plan-limit.test.ts src/__tests__/gallery.test.ts` — 34/39 pass, the only 5 failures are the pre-existing `AUTH-03`/`AUTH-04` `expect.fail` placeholders explicitly out of this plan's scope (Plan 06).
