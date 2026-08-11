---
phase: 03-properties-units
plan: "06"
subsystem: ui
tags: [react, nextjs, tanstack-form, trpc, radix-tabs]

requires:
  - phase: 03-properties-units
    provides: units + unit-statuses tRPC routers (03-04), PlanLimitGate + Properties UI patterns (03-05)
provides:
  - Units Screens 4-6 (global list, dual-entry create/edit Sheet, unit detail with stub tabs)
  - StatusBadge (D-29 color+icon palette) reusable across the units list, form, and detail
  - ROUTES.unitDetail
affects: [03-07-gallery-tagpicker-statuscatalog, 03-08-archive-dialogs]

tech-stack:
  added: []
  patterns:
    - "UnitFormSheet is a self-contained Sheet: it owns its own trpc.properties.list/unitStatuses.list queries and create/update mutations, so both entry points (global /units and PropertyUnitsSection) render the identical component and only differ by the lockedPropertyId prop"
    - "Client-side joins: units.list/get return bare rows (propertyId, statusId) with no server-side join; the units list and detail pages build propertyId->property and statusId->status Map lookups from separately-fetched properties.list/unitStatuses.list — avoids a backend change for a UI-only need"
    - "Currency UI/API boundary: UnitFormSheet stores baseRent as a dollars string in form state and converts to baseRentCents (Math.round(dollars*100)) only at submit, mirroring the schema's integer-cents contract"

key-files:
  created:
    - apps/landlord-web/modules/app/components/units/status-badge.tsx
    - apps/landlord-web/modules/app/components/units/unit-form-sheet.tsx
    - apps/landlord-web/modules/app/components/units/units-table.tsx
    - apps/landlord-web/modules/app/components/units/unit-detail-tabs.tsx
    - "apps/landlord-web/app/(app)/units/page.tsx"
    - "apps/landlord-web/app/(app)/units/[unitId]/page.tsx"
  modified:
    - apps/landlord-web/app/routes.ts
    - apps/landlord-web/modules/app/components/properties/property-units-section.tsx
    - "apps/landlord-web/app/(app)/properties/[propertyId]/page.tsx"

key-decisions:
  - "PropertyUnitsSection now owns its own UnitFormSheet instance (locked to propertyId) instead of exposing an onAddUnit callback — the plan's dual-entry requirement needs the property detail page to supply propertyId to lock the Select, so the section's public API changed from `onAddUnit` to a required `propertyId` prop"
  - "Status Select shows plain-text option names with a live StatusBadge preview alongside it, rather than embedding the badge inside SelectItem/SelectValue — avoids Radix Select's ItemText content-mirroring edge cases with non-text children while still satisfying the UI-SPEC's 'Badge preview' requirement"

requirements-completed: [UNIT-01, UNIT-02, UNIT-03, UNIT-04]

duration: 65min
completed: 2026-08-11
---

# Phase 03 Plan 06: Units UI — List, Dual-Entry Sheet, Detail with Stub Tabs Summary

**Global Units list (Screen 4), a single reusable `UnitFormSheet` wired to both the global list and the property's nested Units section (Screen 5, D-10), and a unit detail page with a live Overview tab plus two data-free stub tabs for Rent/Tenant history (Screen 6, UNIT-03/04).**

## Performance

- **Duration:** ~65 min across 2 tasks
- **Completed:** 2026-08-11
- **Tasks:** 2
- **Files modified:** 9 (6 created, 3 modified)

## Accomplishments

- `StatusBadge`: `Badge` + 12px leading `PlatformIcon` + label, mapped from the fixed 8-color palette (`slate/blue/green/amber/orange/red/violet/teal`) with a soft `/15` opacity fill; renders an "Unassigned" fallback badge when a unit has no `statusId`
- `UnitFormSheet`: single Sheet component (`sm:max-w-md`, right side) shared by both create entry points and edit — TanStack Form + `@villuh/server/schemas/units` Zod schemas, property Select (disabled + prefilled only when `lockedPropertyId` is passed), Label input, optional square footage, `$`-prefixed base-rent currency input (dollars in UI, converted to integer cents at submit), and a Status Select with a live `StatusBadge` preview; footer CTAs match the UI-SPEC copy exactly (`Create unit`/`Save unit`, `Close without saving`/`Discard changes`)
- `/units` (Screen 4): title + `Add unit` behind `PlanLimitGate`, optional property filter Select, `UnitsTable` (Unit/Property/Status/Base rent/Sq ft/Actions), empty state and loading skeletons per UI-SPEC copy
- `UnitsTable`: property and unit-label cells link to their detail pages; row-level `DropdownMenu` with **Edit unit** (opens the Sheet) and **Archive unit** (Plan 08 wires the confirm dialog onto this trigger, matching the Plan 05 precedent for Archive property)
- `PropertyUnitsSection` now owns its own `UnitFormSheet`, locked + prefilled to the current property (D-10) — the property detail page's Add unit button opens the identical Sheet component used by the global list
- `/units/[unitId]` (Screen 6): breadcrumbs via `setBreadcrumbs`, label + `StatusBadge` + property link, `Edit unit` (opens the same Sheet in edit mode) and `Archive unit` (Plan 08 entry point, no-op today)
- `UnitDetailTabs`: `Overview` (label, property link, sq ft, base rent, status) + `Rent history` / `Tenant history` — both stub-empty with the exact UI-SPEC copy, zero data fetches, zero fabricated rows (UNIT-03/04, D-04, T-03-18)
- `ROUTES.unitDetail(unitId)` added

## Task Commits

Each task was committed atomically:

1. **Task 1: Units list table + UnitFormSheet + property nested create** — `b85e597` (feat)
2. **Task 2: Unit detail page with Overview + stub history tabs (UNIT-03/04)** — `9a9e94d` (feat)

## Files Created/Modified

- `apps/landlord-web/modules/app/components/units/status-badge.tsx` - D-29 color+icon badge, reused by the table, form Select preview, and detail header
- `apps/landlord-web/modules/app/components/units/unit-form-sheet.tsx` - Shared create/edit Sheet; owns its own `properties.list`/`unitStatuses.list` queries and `units.create`/`units.update` mutations
- `apps/landlord-web/modules/app/components/units/units-table.tsx` - Screen 4 table with property/status join built client-side from `properties.list`/`unitStatuses.list`
- `apps/landlord-web/modules/app/components/units/unit-detail-tabs.tsx` - Screen 6 Overview + stub Rent/Tenant history tabs
- `apps/landlord-web/app/(app)/units/page.tsx` - Screen 4 list page
- `apps/landlord-web/app/(app)/units/[unitId]/page.tsx` - Screen 6 detail page
- `apps/landlord-web/app/routes.ts` - added `ROUTES.unitDetail`
- `apps/landlord-web/modules/app/components/properties/property-units-section.tsx` - now takes a required `propertyId` prop and owns its own locked `UnitFormSheet` (replaces the unused `onAddUnit` hook point from Plan 05)
- `apps/landlord-web/app/(app)/properties/[propertyId]/page.tsx` - passes `propertyId={property.id}` to `PropertyUnitsSection` (one-line change required by the prop above — not separately listed in the plan's `files_modified`, but necessary for the plan's explicit "Wire PropertyUnitsSection Add unit" action to compile and work)

## Decisions Made

- Kept `units.list`/`units.get` as bare rows (no backend join) and instead fetched `properties.list` + `unitStatuses.list` client-side to build lookup Maps — avoids a server change for what's purely a display-layer need, and both endpoints were already available and cheap at this portfolio scale (1-50 units)
- `PropertyUnitsSection`'s public API changed from an `onAddUnit` callback (Plan 05's hook point) to a required `propertyId` prop plus an internally-owned Sheet — the alternative (keeping the callback and lifting Sheet state into the property detail page) would have required threading Sheet open-state and the same `UnitFormSheet` import into a page file for no benefit; self-containing it keeps the wiring in one place and the page diff to a single line
- Status Select renders plain-text option names with a separate live `StatusBadge` preview alongside the trigger, rather than nesting the badge inside `SelectItem`/`SelectValue` — sidesteps Radix `Select.Value`'s text-mirroring behavior for non-text children while still delivering the UI-SPEC's "Badge preview" requirement

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Passed `propertyId` from the property detail page into `PropertyUnitsSection`**
- **Found during:** Task 1
- **Issue:** The plan's action ("Wire PropertyUnitsSection Add unit to same Sheet with propertyId prefills") requires the section to know which property it's nested under so it can lock the Sheet's property Select (D-10) — but the property detail page (`apps/landlord-web/app/(app)/properties/[propertyId]/page.tsx`) wasn't in this plan's `files_modified` list, and the section previously took no `propertyId` prop
- **Fix:** Added a required `propertyId` prop to `PropertyUnitsSection` and updated its one call site to pass `property.id`
- **Files modified:** `apps/landlord-web/app/(app)/properties/[propertyId]/page.tsx` (1-line change)
- **Verification:** `pnpm --filter @villuh/landlord-web typecheck` exits 0
- **Committed in:** `b85e597` (Task 1 commit)

## Issues Encountered

- **Unrelated concurrent working-tree activity preserved:** `apps/landlord-web/app/routes.ts` had a pre-existing uncommitted `inbox: r("/inbox"),` line (unrelated nav work) alongside `apps/landlord-web/modules/app/config/sidebar-nav.ts`. To avoid bundling that unrelated line into this plan's commit, the `inbox` line was temporarily removed, `routes.ts` was staged + committed with only the `unitDetail` addition, and the `inbox` line was immediately restored afterward as an unstaged change — `git diff apps/landlord-web/app/routes.ts` after this plan shows only the pre-existing `inbox` addition, matching the state before this session started. `sidebar-nav.ts` was never staged.
- **Unrelated Zod v4 rename left untouched:** `apps/server/src/modules/{members,properties,tags,unit-statuses,units,uploads}/schemas.ts` all show as modified in `git status` (the ongoing `z.string().uuid()` → `z.uuid()` / `z.string().email()` → `z.email()` migration mentioned in Plan 05's summary). None of these files were read, edited, or staged by this plan.
- **`IconWrench` (seeded "Maintenance" status icon, `unit-statuses` domain, Plan 04) does not appear to exist in the installed `@central-icons-react/all` package** — verified via a grep of the package's `index.d.ts` type metadata. This is pre-existing seed data from Plan 04 (`domain/unit-statuses.ts`) and the same icon key is also declared as a valid palette entry in Plan 09's `tags/schemas.ts` `TAG_ICON_KEYS`, so it predates this plan and is out of this plan's scope per the Rule 2/3 scope boundary (pre-existing issue in unrelated files). `StatusBadge` passes `iconKey` straight through to `PlatformIcon` regardless of value (consistent with how tags will handle the same palette), so no behavior was changed here — flagging for whoever owns the icon palette to verify at runtime.

## Known Stubs

- **Rent history / Tenant history tabs** (`unit-detail-tabs.tsx`): intentional stub-empty per UNIT-03/04 delivery mode (D-04) — no `ledger`/`tenant` tRPC calls exist yet in this phase. A future phase (rent ledger / tenant lifecycle) wires real data into these tab panels.
- **Archive unit** (`units-table.tsx` row menu, `[unitId]/page.tsx` header button): renders and is clickable but `onSelect`/`onClick` are no-ops (`() => undefined`) — matches the same intentional pattern Plan 05 used for Archive property. Plan 08 implements `ArchiveUnitDialog` and wires these triggers.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 07 (Gallery + TagPicker + status catalog) is unaffected by this plan; the units status catalog UI (Screen 8) it may touch is separate from the units CRUD delivered here
- Plan 08 (Archive dialogs) has two ready-made no-op hooks to wire: the `Archive unit` row action in `units-table.tsx` and the `Archive unit` header button in `[unitId]/page.tsx`
- No blockers

---
*Phase: 03-properties-units*
*Completed: 2026-08-11*

## Self-Check: PASSED

All 6 created files verified present on disk (`status-badge.tsx`, `unit-form-sheet.tsx`, `units-table.tsx`, `unit-detail-tabs.tsx`, `units/page.tsx`, `units/[unitId]/page.tsx`). Both task commits (`b85e597`, `9a9e94d`) verified present in `git log`. `pnpm --filter @villuh/landlord-web typecheck` exits 0 after both tasks. `git status --short` after both commits shows only the pre-existing unrelated dirty files (routes.ts `inbox` line, sidebar-nav.ts, server schemas.ts Zod-v4 rename) — no stray staged or committed changes from this plan.
