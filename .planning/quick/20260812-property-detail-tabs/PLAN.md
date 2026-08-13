---
slug: property-detail-tabs
created: 2026-08-12
tracking: quick
---

# Property detail page: tabbed redesign

Restructure the property detail page (`/properties/[propertyId]`) from one
flat view into five route-backed tabs: About, Units, Gallery, Tenants,
Analytics. Expands Phase 3 scope (property detail) beyond its original
roadmap plans — tracked here as a quick task per user decision rather than
an inserted roadmap phase.

## Decisions (locked in via discussion)

- **Tracking:** GSD quick task, no ROADMAP.md changes.
- **Routing:** real URL routes per tab (`/properties/[id]`, `/units`,
  `/gallery`, `/tenants`, `/analytics`) via a `(detail)` route group nested
  layout — shareable links, browser history. `/edit` stays a sibling outside
  the group (no tabs/header wrapper).
- **Tab bar:** new `@coss/p-tabs-7` (Base UI) `Tabs`/`TabsList`/`TabsTab`
  primitive from `@villuh/ui`, `variant="underline"`, icon slots, driven by
  real `<Link>`s (`render` prop) + `usePathname` active-tab detection —
  `TabsTrigger`/`TabsContent` kept as aliases so `UnitDetailTabs` (existing
  client-tab consumer) needed no changes.
- **Metric cards:** ported 1:1 from an external codebase
  (`MetricKpiCard` → `packages/ui/src/metric-card/`), including its
  `@bklit/area-chart` sparkline dependency chain (`@visx`, `d3`,
  `@number-flow/react`, `motion`) — vendored into `packages/ui/src/charts/`.
  Third metric = Occupancy rate (placeholder, alongside Revenue/Tenants —
  none of that data exists yet).
- **About tab hero:** the property's cover photo, absolutely positioned,
  low opacity, radial-gradient mask fade, `pointer-events-none` — decorative
  ambient backdrop only, About tab only. Replaces the old carousel entirely
  (`property-gallery-carousel.tsx` deleted, no longer used anywhere).
- **Units tab:** `UnitsList` reused as-is via a new `lockedPropertyId` prop
  — server query always filtered to the property, Property filter chip and
  column hidden. `PropertyUnitsSection` retired.
- **Gallery tab:** 2-column image grid; click opens a ported `Lightbox`
  (pan/zoom/drag/keyboard, spring-animated) — installed into
  `packages/ui/src/lightbox.tsx` verbatim (imports from `motion/react`,
  already a real dependency via the chart port, so no adaptation needed).
- **Tenants / Analytics:** stub "coming soon" panels, matching the existing
  `UnitDetailTabs` stub convention.
- **lucide-react**: re-added to `packages/ui` dependencies (used outside the
  `PlatformIcon`/Solar abstraction elsewhere in the app).

## Result

- `apps/landlord-web/app/(app)/properties/[propertyId]/(detail)/` —
  `layout.tsx` (header + tabs nav) + `page.tsx`/`units`/`gallery`/`tenants`/
  `analytics` pages.
- `apps/landlord-web/app/(app)/properties/[propertyId]/edit/` — untouched
  sibling, outside the tabs layout.
- New templates: `property-about-template.tsx`, `property-units-template.tsx`,
  `property-gallery-template.tsx`, `property-tenants-template.tsx`,
  `property-analytics-template.tsx`.
- New component: `property-tabs-nav.tsx`.
- `packages/ui`: `tabs.tsx` (Base UI), `metric-card/`, `charts/`,
  `lightbox.tsx`, `lucide-react` restored.
- `units-columns.tsx` / `units/components/list/index.tsx`: `hidePropertyColumn`
  / `lockedPropertyId` support.
- Deleted (superseded): `property-template.tsx`, `property-units-section.tsx`,
  `property-gallery-carousel.tsx`.

## Follow-up: directional slide between tabs (tried, reverted)

Attempted a directional slide between property tabs (forward/back based on
tab order) via `(app)/template.tsx`'s View Transition, since tabs are real
routes and Next.js 16.1.7 doesn't yet support the `transitionTypes` prop on
`Link`/`useRouter` used in newer Next.js versions. Diffed the previous vs.
next pathname instead, and anchored the property header/tab bar with a
`view-transition-name` so only the content would slide.

First pass had a real bug (computed the slide class on a render that React
then discarded via the "adjust state during render" pattern, so it always
fell back to the plain fade) — fixed by storing the computed class in state
alongside the pathname. Still didn't produce a visible slide after the fix,
and rather than keep chasing it, reverted entirely per user request:

- `(app)/template.tsx` back to the original plain `page-fade` on every
  navigation (no tab-direction logic).
- `packages/ui/src/globals.css` — removed the `tab-slide-forward`/
  `tab-slide-back` keyframes and the `property-tabs-header` anchor rules.
- `(detail)/layout.tsx` — removed the `[view-transition-name:...]` wrapper
  div around the header + tab bar (kept as plain direct children of
  `Page.Shell`, as originally built).

Net effect: property tabs behave exactly as originally shipped — a plain
cross-fade on navigation, no directional slide. Also restored the
address/phone row in the property header, which had gone missing from
`(detail)/layout.tsx` at some point during this work (unclear cause) —
that fix was kept since it's unrelated to the slide experiment.

## Verification

- `apps/landlord-web`: `tsc --noEmit` clean, `eslint .` clean (pre-existing
  unrelated errors in `property-form.tsx` / `archive-property-dialog.tsx`
  left untouched), `next build` succeeds — all 5 nested routes + `/edit`
  resolve correctly.
- `packages/ui`: `tsc --noEmit` clean, `eslint` clean on new files.
- Not done: no live authenticated browser walkthrough (no browser tooling
  in this session) — verify visually before considering this closed out.

## Follow-up: Property Details card redesign + new fields

User feedback: the About tab's "Property Details" card (address/phone/units/
added in a cramped 3-col icon-grid) wasn't good, and the property record was
missing data other landlord software commonly tracks. Scoped down via
discussion to a small, high-value slice rather than the full universe
(explicitly deferred: all purchase-price/mortgage/insurance/tax financial
fields, utilities tracking).

**New `properties` columns** (`apps/server/src/schema/properties.ts`):
`property_type`, `year_built`, `parking_type`, `parking_spaces` — plain
`text`/`integer`, not Postgres enums, consistent with how this schema
already avoids `pgEnum` (unit statuses use a catalog table instead). Fixed
option sets (`PROPERTY_TYPES`, `PARKING_TYPES`) + label maps live in
`modules/properties/schemas.ts`, exported via `@villuh/server/schemas/properties`
so client and server share one source of truth.

- **Amenities**: deliberately *not* a new field — reused the existing
  `organization_tag`/`property_tag` system (already surfaced via `TagPicker`
  in the property header), zero schema work needed.
- **Migration**: `migrations/0015_property_type_year_built_parking.sql`,
  hand-written (4 `ALTER TABLE ... ADD COLUMN` statements) and appended to
  `meta/_journal.json` by hand — `drizzle-kit generate` is currently broken
  in this repo (pre-existing issue, unrelated to this work: several
  `meta/*_snapshot.json` files are missing, breaking the snapshot chain
  `generate` needs to diff against). Applied directly via `pnpm migrate`
  against the local dev DB (a native Postgres on `:5432`, not the
  `docker-compose` one — `pnpm db:up` fails locally with a port conflict for
  the same reason). Verified column-by-column with `psql \d properties`
  after applying.
- **Icons**: added `IconCalendar`, `IconGarage`, `IconRuler` to
  `packages/ui/src/icon.tsx` (Solar linear icons — `calendar`, `garage`,
  `ruler` — none of the three existed in the mapped set before).
- **About card** (`property-about-template.tsx`): replaced the 3-column
  `QuickFact` icon-grid with a single vertical list of full-width labeled
  rows (`DetailRow`), matching this codebase's existing `border-b
  last:border-b-0` stacked-row convention (see `archive-property-dialog.tsx`)
  since no reusable description-list component existed anywhere in the repo.
  Address is the only row allowed to wrap instead of truncate. New rows only
  render when data exists (property type / year built / parking / total sq
  ft) — no empty "—" placeholders for fields most properties won't have
  filled in yet. Total square footage and unit count are computed
  client-side from the `units` array `properties.get` already returns; no
  new query needed.
- **Create/edit form** (`property-form.tsx`): added Property type + Parking
  type `Select`s and Year built + Parking spaces number `Input`s. Form state
  needed a local `PropertyFormValues` type distinct from `CreatePropertyInput`
  (enum/number fields widened to controlled strings, `UNSET` sentinel for
  "not selected" — same pattern as `unit-form-sheet.tsx`'s `UNASSIGNED_STATUS`),
  converted back via `toApiInput()` before `.parse()`.
- **Service layer** (`modules/properties/service.ts`): `createProperty` /
  `updateProperty` persist the 4 new fields following the existing
  null-coalescing pattern for optional columns.

Verification: `tsc --noEmit` and `eslint` clean across `apps/server`,
`packages/ui`, `apps/landlord-web`. Migration applied and columns confirmed
in the live dev DB. Not done: no live authenticated browser walkthrough (no
browser tooling in this session) — verify visually before considering this
closed out.

## Follow-up: extracted formatters + PropertyDetailProvider

Two rounds of cleanup on top of the above, both user-driven:

1. **Formatters out of the template.** `propertyTypeLabel()` / `formatParking()`
   moved from `property-about-template.tsx` into
   `modules/properties/lib/property-display.ts` — reusable, not tied to one
   component.
2. **`PropertyDetailProvider`.** Initially wrapped only `{children}` in
   `(detail)/layout.tsx`, with the layout itself still fetching
   `properties.get` via `Page.Boundary` and destructuring `property`/`units`
   from the render-prop for the header. Restructured per user feedback to
   match this app's own `UserProvider`/`LayoutTemplate` convention
   (`app/(app)/layout.tsx`) instead: the provider now **owns the fetch**
   (`trpc.properties.get.useQuery` + `Page.Boundary` internally, taking
   `propertyId` + `pending` as props) and wraps the **entire** `Page.Shell`
   content — header, tabs nav, and tab content alike — so everything reads
   via `usePropertyDetail()` with no render-prop/context split.

   This required pulling the header and tab nav out of `layout.tsx` into
   their own components (`modules/properties/components/view/header.tsx`,
   `.../view/navigation.tsx` — the latter a straight rename of the old
   `components/property/property-tabs-nav.tsx`) since a component can't
   consume a context it also renders the `.Provider` for — `layout.tsx`
   itself stays a thin composition shell (`<PropertyDetailProvider><PropertyDetailHeader
   /><PropertyTabsNav />{children}</PropertyDetailProvider>`), no extra
   wrapper component needed since header/nav/children are just siblings
   *inside* the provider, not inside the component that renders it.
   `PropertyDetailsCard` moved to `components/view/about/` alongside it.

Verification: `tsc --noEmit` and `eslint` clean on `apps/landlord-web` after
both rounds.
