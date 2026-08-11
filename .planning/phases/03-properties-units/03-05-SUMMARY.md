---
phase: 03-properties-units
plan: 05
subsystem: ui
tags: [react, nextjs, tanstack-form, trpc, mapbox, tiptap, zod]

requires:
  - phase: 03-properties-units
    provides: properties CRUD + gallery tRPC router (03-03), units + unit-statuses tRPC router (03-04), me.get live quota counts (03-09)
provides:
  - PlanLimitGate + LimitReachedDialog reusable plan-limit UI (resource properties|units)
  - propertyNew / propertyDetail / propertyEdit routes
  - Properties Screens 1-3: card list, create/edit form (Mapbox address + TipTap notes), detail overview + nested units section
affects: [03-06-units-ui, 03-07-gallery-tagpicker-statuscatalog, 03-08-archive-dialogs]

tech-stack:
  added: ["@tiptap/extension-placeholder@3.30.0"]
  patterns:
    - "PlanLimitGate wraps a create-trigger element; cloneElement intercepts onClick at quota, otherwise passes through unchanged"
    - "usePropertyFormInstance() wrapper hook exports its useForm return type (PropertyFormApi) so sibling components (AddressFields) can accept the same TanStack Form instance as a typed prop"
    - "AddressFields wraps only the street Input in Mapbox AddressAutofill; onRetrieve imperatively calls form.setFieldValue for the remaining structured fields — manual editing always available as the D-25 fallback"
    - "NotesEditor is a controlled TipTap wrapper (value/onChange HTML string) reconciled via useEffect + editor.commands.setContent when unfocused, so external form.reset() stays in sync with the editor's own internal document state"

key-files:
  created:
    - apps/landlord-web/modules/app/components/plan-limit/plan-limit-gate.tsx
    - apps/landlord-web/modules/app/components/plan-limit/limit-reached-dialog.tsx
    - apps/landlord-web/modules/app/components/properties/property-card.tsx
    - apps/landlord-web/modules/app/components/properties/property-form.tsx
    - apps/landlord-web/modules/app/components/properties/address-fields.tsx
    - apps/landlord-web/modules/app/components/properties/notes-editor.tsx
    - apps/landlord-web/modules/app/components/properties/property-units-section.tsx
    - "apps/landlord-web/app/(app)/properties/page.tsx"
    - "apps/landlord-web/app/(app)/properties/new/page.tsx"
    - "apps/landlord-web/app/(app)/properties/[propertyId]/page.tsx"
    - "apps/landlord-web/app/(app)/properties/[propertyId]/edit/page.tsx"
  modified:
    - apps/landlord-web/app/routes.ts
    - apps/server/src/modules/properties/service.ts

key-decisions:
  - "Added unitCount to properties.service.listProperties via a single grouped query (not N+1) rather than a new endpoint — the UI-SPEC card footer requires it and no other Phase 3 plan owns it"
  - "Added @tiptap/extension-placeholder@3.30.0 (matching the pinned @tiptap/* version) for the D-16 'Add notes…' placeholder — no existing dependency covered this"
  - "Property card tags prop defaults to an empty array; properties.list does not join tags yet (Plan 07 wires TagPicker + the tags catalog into this payload)"
  - "Archive property button calls an optional onArchive callback that Plan 08 will supply with the confirm dialog trigger — clicking it today is a no-op, per the plan's explicit decision"

patterns-established:
  - "Sibling form subcomponents (AddressFields, NotesEditor) receive either the concrete TanStack Form instance type or plain value/onChange props depending on whether they touch one field or several"

requirements-completed: [PROP-01]

duration: 55min
completed: 2026-08-11
---

# Phase 3 Plan 05: PlanLimitGate + Properties UI (Mapbox + TipTap) Summary

**Landlord Properties screens 1-3 (card list, create/edit form, detail overview) wired to tRPC with a reusable PlanLimitGate, Mapbox-assisted structured address, and a locked-subset TipTap notes editor.**

## Performance

- **Duration:** ~55 min across 2 tasks
- **Completed:** 2026-08-11
- **Tasks:** 2
- **Files modified:** 15 (11 created, 2 modified for app code; 3 dependency-manifest files for the Rule 3 deviation)

## Accomplishments

- `PlanLimitGate` + `LimitReachedDialog`: generic quota-gate wrapper reading `me.get` → `org.quota.{properties|units}`, intercepting the create trigger's click at/over limit instead of navigating; also exports `isPlanLimitError`/`getPlanLimitMeta` helpers for the D-43 mutation-error backstop
- `propertyNew` / `propertyDetail` / `propertyEdit` added to `ROUTES`
- `/properties`: card grid (skeleton loading, empty state, `{unitCount} units` footer, up to 3 tag chips), Add property behind the gate
- `/properties/new` and `/properties/[propertyId]/edit`: shared `PropertyForm` (TanStack Form + `@villuh/server/schemas/properties` Zod schemas) with `AddressFields` (Mapbox `AddressAutofill` assist + always-editable structured fields + no-token fallback) and `NotesEditor` (TipTap `StarterKit` restricted to bold/italic/lists/link/H2-H3, `Placeholder` extension, `immediatelyRender: false`)
- `/properties/[propertyId]`: overview card (address, phone, sanitized notes HTML), empty Gallery shell (heading + copy only, Plan 07 wires uploads), `PropertyUnitsSection` (units table + Add unit behind the units gate)
- Tags kept strictly as a labeled placeholder slot on the form and omitted from the detail view — no `tags.*` calls, no throwaway chip editor

## Task Commits

Each task was committed atomically:

1. **Task 1: PlanLimitGate + LimitReachedDialog + ROUTES extensions** — `3f67f88` (feat) — committed in a prior session turn
2. **Task 2: Properties pages — cards, form (Mapbox+TipTap), detail overview** — `6a7b534` (feat)

_Note: Task 1's commit predates this turn (see prior session); verified present in `git log` before continuing Task 2._

## Files Created/Modified

- `apps/landlord-web/modules/app/components/properties/property-card.tsx` - Screen 1 card composition (cover placeholder, name, address, tag chips, unit count)
- `apps/landlord-web/modules/app/components/properties/property-form.tsx` - Shared create/edit form; owns the tRPC mutations, invalidation, and navigation
- `apps/landlord-web/modules/app/components/properties/address-fields.tsx` - Mapbox-assisted structured address subform
- `apps/landlord-web/modules/app/components/properties/notes-editor.tsx` - TipTap notes editor locked to the D-14 toolbar subset
- `apps/landlord-web/modules/app/components/properties/property-units-section.tsx` - Nested units table + gated Add unit hook point for Plan 06
- `apps/landlord-web/app/(app)/properties/page.tsx` - Screen 1 list page
- `apps/landlord-web/app/(app)/properties/new/page.tsx` - Screen 2 create page
- `apps/landlord-web/app/(app)/properties/[propertyId]/page.tsx` - Screen 3 detail page
- `apps/landlord-web/app/(app)/properties/[propertyId]/edit/page.tsx` - Screen 2 edit page
- `apps/server/src/modules/properties/service.ts` - `listProperties` now returns `unitCount` per property
- `apps/landlord-web/package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` - added `@tiptap/extension-placeholder@3.30.0`

## Decisions Made

- Reused the TanStack Form instance's own inferred type (`PropertyFormApi = ReturnType<typeof usePropertyFormInstance>`) rather than hand-rolling the full 12-parameter `ReactFormExtendedApi` generic, so `AddressFields` can accept the concrete form without fighting TanStack's invariant generics
- `AddressFields` wraps a plain `Input` (not a native `<input>`) inside Mapbox's `AddressAutofill`; the custom element progressively enhances whatever real `<input>` DOM node ends up nested inside it, so this holds without forking the Input component
- Deferred rendering of an empty-tags block on the detail page entirely (rather than inventing "no tags yet" copy not specified in the UI-SPEC's Copywriting Contract)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added `unitCount` to `properties.list`**
- **Found during:** Task 2 (PropertyCard)
- **Issue:** UI-SPEC Screen 1 locks the card footer to `{unitCount} units`, but no existing endpoint exposed a per-property unit count — `properties.get` returns full unit rows (fine for one property) but `properties.list` returned bare `PropertyRow[]`
- **Fix:** `listProperties` now runs a second grouped `count(*)` query over `units` (keyed by `propertyId`, active-only) and merges the count onto each row — one extra query for the whole list, not N+1 per card
- **Files modified:** `apps/server/src/modules/properties/service.ts`
- **Verification:** `apps/server/src/__tests__/properties.test.ts` (9/9 passing); landlord-web + server `typecheck`/`lint` clean
- **Committed in:** `6a7b534` (Task 2 commit)

**2. [Rule 3 - Blocking] Added `@tiptap/extension-placeholder@3.30.0`**
- **Found during:** Task 2 (NotesEditor)
- **Issue:** D-16 requires an "Add notes…" placeholder inside the TipTap editor; the installed `@tiptap/*` set (starter-kit, link, pm, react) has no built-in placeholder mechanism, and faking one without the official extension would mean hand-rolling ProseMirror decorations
- **Fix:** `pnpm --filter @villuh/landlord-web add @tiptap/extension-placeholder@3.30.0` — exact version match to the rest of the pinned `@tiptap/*` set
- **Files modified:** `apps/landlord-web/package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`
- **Verification:** `pnpm --filter @villuh/landlord-web typecheck`/`lint` clean
- **Committed in:** `6a7b534` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 blocking)
**Impact on plan:** Both were required for the UI-SPEC's locked card footer and notes placeholder contracts to actually work. No scope creep beyond those two points — no gallery, tag, or archive functionality was implemented ahead of Plans 07/08.

## Issues Encountered

- **Concurrent unrelated working-tree activity:** during execution, unrelated uncommitted changes appeared in the working tree from outside this session — a Zod v4 syntax migration (`z.string().uuid()` → `z.uuid()`, `z.string().email()` → `z.email()`) across `apps/server/src/modules/{members,tags,unit-statuses,units,uploads,properties}/schemas.ts`, plus a live `turbo dev` process actively serving `/properties` and `/properties/new`. Neither of these was staged or committed by this plan — only the files explicitly listed above were staged (`git add <specific paths>`, never `git add -A`). The Zod syntax change is a no-op for this plan's imports (same inferred shapes) but is left for whoever is making that change to commit separately.
- The pre-existing `apps/landlord-web/app/routes.ts` / `apps/landlord-web/modules/app/config/sidebar-nav.ts` "inbox" nav additions (present since before this plan started) remain uncommitted in the working tree, as instructed — this plan's `routes.ts` additions (`propertyNew`/`propertyDetail`/`propertyEdit`) were already committed in Task 1 (`3f67f88`) before the inbox lines were re-applied on top via `git stash pop`.
- Full `apps/server` test suite has 26 pre-existing failures (audit-log, billing, org, permissions, plan-limit subscription-gate, wizard) unrelated to this plan — all are stale-route or explicit `expect.fail('TODO: Plan N implements …')` placeholders for later phases/plans. `properties.test.ts` (the only suite touching code this plan modified) passes 9/9.

## Known Stubs

- **Gallery section** (`apps/landlord-web/app/(app)/properties/[propertyId]/page.tsx`): renders the UI-SPEC's empty-state copy only ("No photos yet…") — no upload/reorder/cover wiring. Intentional; Plan 07 owns Gallery per the plan's interfaces.
- **Tags** (`property-form.tsx` Tags slot, and no tag chips rendered on the detail page): placeholder label only, `PropertyCard`'s `tags` prop defaults to `[]` since `properties.list`/`properties.get` don't join tags yet. Intentional; Plan 07 wires `TagPicker` + the Plan 09 tags API into these payloads.
- **Archive property button** (`[propertyId]/page.tsx`): renders and is clickable but its `onClick` is a no-op (`() => undefined`) — no confirm dialog yet. Intentional per the plan's explicit decision; Plan 08 implements `ArchivePropertyDialog` and wires the trigger.
- **PropertyUnitsSection `onAddUnit`**: optional prop, currently unpassed from the detail page, so "Add unit" opens nothing beyond the `PlanLimitGate` check. Intentional; Plan 06 wires the create-unit Sheet.

## User Setup Required

None - no external service configuration required. (`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` is already documented in `apps/landlord-web/.env.example`; `AddressFields` degrades to manual-only entry with a hint when it's unset, per D-25.)

## Next Phase Readiness

- Plan 06 (Units UI) can build the create/edit Sheet and pass it into `PropertyUnitsSection`'s `onAddUnit`
- Plan 07 (Gallery + TagPicker + status catalog) has clear hook points: the empty Gallery `Card` section on detail, the Tags placeholder slot on the form, and `PropertyCard.tags`/detail tag rendering all await the tags-payload join
- Plan 08 (Archive dialogs) can wire `ArchivePropertyDialog` onto the existing Archive property button's `onClick`
- No blockers

---
*Phase: 03-properties-units*
*Completed: 2026-08-11*

## Self-Check: PASSED

All 11 created files verified present on disk; both task commits (`3f67f88`, `6a7b534`) verified present in `git log`.
