# Phase 3: Properties & Units - Context

**Gathered:** 2026-08-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Landlords can fully manage their property portfolio and individual units — every structural entity that leases and tenants will reference exists and is queryable. This phase delivers CRUD for properties and units, org-level tags and custom unit statuses, S3 image gallery, Mapbox-assisted addresses, TipTap notes, soft-archive delete flows, and a reusable plan-limit gate for create actions.

**Explicitly out of this phase’s build:** property dashboard stats/alerts (PROP-03), lease-expiry alerts / renewal notices (PROP-04/05), live rent/tenant history (UNIT-03/04 — stub empty tabs only), and mid-month prorated rent (UNIT-05 — needs leases).

</domain>

<decisions>
## Implementation Decisions

### Scope cut
- **D-01:** Deliver full PROP/UNIT product intent for properties + units CRUD and supporting models, with the explicit deferrals below — not a thin stub of the phase.
- **D-02:** S3 property image gallery is **in** Phase 3 (PROP-01).
- **D-03:** PROP-04 / PROP-05 (lease expiry alert threshold + automatic renewal notices) are **out** — require leases (Phase 4+).
- **D-04:** UNIT-03 / UNIT-04: ship **stub empty history tabs** on unit detail (rent history, tenant history) — no fake data; tabs exist for navigation continuity.
- **D-05:** PROP-03 property dashboard (total units, occupancy, monthly rent, alerts) is **deferred** until more entities exist and product vision for “what to show” is clearer. Do **not** build a stats/alerts strip in Phase 3.
- **D-06:** UNIT-05 (prorated rent on mid-month lease start) is **out** of Phase 3 — requires lease records; revisit with leases.

### Navigation & IA
- **D-07:** Units appear in **both** places: sidebar `/units` and nested under a property.
- **D-08:** After creating a property → navigate to **property detail**.
- **D-09:** Properties list UI = **cards** (not a dense table as the primary list).
- **D-10:** Create unit from **both** property detail and the Units page (Units page includes a **property picker**).

### Property form
- **D-11:** Address is **structured** (street, city, region, postal, country) with optional **line2**; entry assisted by **Mapbox**.
- **D-12:** Phone is **optional**.
- **D-13:** Notes are **optional markdown**, edited with **TipTap** WYSIWYG.
- **D-14:** TipTap subset: basic **bold / italic / lists / links / headings** only.
- **D-15:** Sanitize notes **server-side always** (strip HTML/scripts); never trust client HTML.
- **D-16:** Empty notes allowed; UI placeholder **“Add notes…”**.
- **D-17:** Tags: **freeform** on a property **and** org **catalog** tags; freeform can be **promoted** to org catalog when permitted; tags have **icon + color**.

### Tags (permissions & UX)
- **D-18:** Promote freeform → org tag requires **`write`** permission.
- **D-19:** Edit/delete org catalog tags: **same as promote** (`write`).
- **D-20:** Deleting an org tag that is in use: **cascade detach** from properties **and delete** the tag.
- **D-21:** Icon + color picker: **fixed palette** (preset colors + fixed icon set) — not free hex / arbitrary icons.

### Mapbox address UX
- **D-22:** Autocomplete **only** as the assisted path → selection **fills structured fields**.
- **D-23:** Store **lat/lng** when address is set via Mapbox (**required** for Mapbox-sourced addresses).
- **D-24:** Countries: any Mapbox supports (configurable), not a hardcoded single-country allowlist for v1.
- **D-25:** Fallback: if Mapbox fails/unavailable → **manual structured fields** still work.

### Unit status
- **D-26:** Org-defined **custom statuses**; seed **Available / Occupied / Maintenance**.
- **D-27:** Only **owner/admin** may edit the status catalog (create/rename/reorder/archive statuses).
- **D-28:** Phase 3 status assignment is **manual**; design schema/API so Phase 4 can **auto-set Occupied** when a lease is active.
- **D-29:** Status UI: **color badge + icon**.

### Delete / archive
- **D-30:** Property delete = **soft archive** (not hard delete).
- **D-31:** Archiving a property **cascade soft-archives** its units in the same operation.
- **D-32:** Unit delete = **soft archive**.
- **D-33:** Property archive confirm UX: dialog must **list every affected unit** (and any other cascading data), explain **archive vs permanent delete**, then require **typing the property name**.

### S3 gallery
- **D-34:** Max **25** images per property.
- **D-35:** **First in order = cover**; landlord can **drag-reorder**.
- **D-36:** Common web image types (JPEG/PNG/WebP/GIF; HEIC if practical); **10MB** max per file.
- **D-37:** Delete image = **immediate** S3 object delete **+** DB row remove (no soft-delete for gallery rows).
- **D-38:** Persist **`objectKey` only** in DB; pre-signed GET URLs at read time (project S3 rule).

### Plan-limit UX
- **D-39:** Build a reusable **PlanLimitGate** (wrap triggers such as “Create property” / “Create unit”). If org quota for that resource is at/over limit, open a **LimitReachedDialog** instead of the create dialog/flow.
- **D-40:** Dialog shows: attempted action, which limit was hit (e.g. properties 10/10), and upgrade/billing CTA.
- **D-41:** Quotas come from **shared org data already loaded early** (prefer `me.get` → `org.quota`, already shaped as `{ units, properties, members: { count, limit } }`). Gate components read that cache — callers pass **resource/action type**, not raw counts.
- **D-42:** Extensible pattern (Phase 3 wires **properties** + **units**; members already limited elsewhere).
- **D-43:** **UI + server both enforce**. Mutations still return **`402` / `PLAN_LIMIT`** as hard backstop (align with Phase 2 D-41/D-42). Invalidate/refetch `me.get` (or quota) after successful creates/archives that change counts.

### Claude's Discretion
- Exact TipTap package set / toolbar chrome within the locked subset
- Mapbox SDK choice and env wiring details
- Soft-archive column naming (`archived_at` vs `deleted_at`) consistent with existing schema conventions
- Whether property cards show cover thumb + tag chips + unit count snippet (no PROP-03 dashboard)
- PlanLimitGate API shape (HOC vs render-prop vs provider) as long as D-39–D-43 hold
- Fixed tag icon/color palette contents
- UNIT stub tab empty-state copy

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase & requirements
- `.planning/ROADMAP.md` — Phase 3 goal, success criteria (note: success criteria still mention PROP-03/04/05 and UNIT history/proration; **CONTEXT decisions override** for deferrals)
- `.planning/REQUIREMENTS.md` — PROP-01…05, UNIT-01…05
- `.planning/PROJECT.md` — product scope for properties/units
- `.planning/STATE.md` — current project position

### Prior phase decisions
- `.planning/phases/02-auth-billing/02-CONTEXT.md` — plan limits (D-40–D-46), `/me` quota shape (D-44), upgrade modal → billing (D-46), permissions model (`write` / `admin`)
- `.planning/phases/01-infrastructure-foundation/01-CONTEXT.md` — RLS, org isolation, stack foundations

### Architecture / cache
- `.planning/decisions/ADR-001-cache-strategy.md` — TanStack Query = UI cache; Postgres = source of truth; mutation → invalidate
- `CLAUDE.md` — tRPC-only fetching, S3 `objectKey` rule, RLS `withOrganization`, Express+tRPC (not Hono)

### Code entry points
- `apps/server/src/modules/me/router.ts` — `me.get` returns `org.quota.{units,properties,members}`
- `apps/server/src/schema/plan-limits.ts` — `plan_limits` table
- `apps/server/src/domain/errors.ts` — `PLAN_LIMIT` error code
- `apps/server/src/modules/members/router.ts` — existing plan-limit enforcement pattern on create
- `apps/landlord-web/app/routes.ts` — `ROUTES.properties`, `ROUTES.units`
- `apps/landlord-web/modules/app/config/sidebar-nav.ts` — Portfolio nav already lists Properties + Units
- `packages/ui/src/dialog.tsx` — Dialog primitives for LimitReachedDialog / archive confirm
- `packages/api/src/invalidate.ts` — mutation invalidation helpers

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `me.get` quota object: ready for PlanLimitGate without a second quotas endpoint (counts for properties/units are currently stubbed at `0` until entities exist — wire real counts when tables land).
- `@villuh/ui` Dialog / Sheet for create, archive confirm, and limit-reached UX.
- Landlord sidebar + `ROUTES.properties` / `ROUTES.units` already reserved.
- TanStack Form + Zod + `@villuh/server/schemas` pattern (profile settings) for property/unit forms.
- `invalidateOnSuccess` / `invalidateQueries` for post-mutation cache updates (`me.get` after create/archive).

### Established Patterns
- Org isolation via `withOrganization` + RLS on all org-scoped procedures.
- Plan limit: check before create → `forbidden(..., 'PLAN_LIMIT', { resource, limit, current, ... })` (members router is the reference).
- Auth UI: cookie-only Proxy + layout `requireMe`; client `MeProvider` with `initialUser`.
- Soft product language for archive vs delete should match confirm copy in D-33.

### Integration Points
- New property/unit/tag/status/gallery tables + tRPC routers under `apps/server/src/modules/`.
- Mapbox: new env secrets + client autocomplete component on property form.
- S3: first gallery upload pipeline in landlord-web + server (presign upload + store `objectKey`).
- TipTap: new editor dependency in landlord-web (or shared package if reuse expected).
- Stripe unit quantity sync (Phase 2 D-21): unit create/archive must update subscription quantity when billing is active — planner must not drop this side effect.

</code_context>

<specifics>
## Specific Ideas

- PlanLimitGate should feel productized: wrapping the create trigger so users never briefly open an empty create dialog when already at cap — intercept → LimitReachedDialog with action + quota + upgrade path.
- Prefer reading quotas from existing early-loaded `me` data so gate usage stays “pass resource type only.”
- Property archive confirm is deliberately heavy (list all affected units + type name) to prevent accidental cascade.
- Dashboard skipped on purpose — revisit after leases/tenants give meaningful occupancy/rent/alert signals.

</specifics>

<deferred>
## Deferred Ideas

- **PROP-03** — Property dashboard (units, occupancy, rent total, alerts) — deferred until more of the product exists
- **PROP-04** — Per-property lease expiry alert threshold
- **PROP-05** — Automatic tenant renewal notices (email/SMS)
- **UNIT-03 / UNIT-04** — Live rent history & tenant history (Phase 3 = empty stub tabs only)
- **UNIT-05** — Mid-month prorated rent + override (needs leases)

</deferred>

---

*Phase: 3-properties-units*
*Context gathered: 2026-08-11*
