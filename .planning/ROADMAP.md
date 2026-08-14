# Roadmap: Villuh Lease

## Overview

Villuh Lease is built in 8 phases following the natural dependency chain of the product. Infrastructure and auth are established first so every subsequent feature is built on a secure, multi-tenant foundation. The entity hierarchy (properties → units → tenants → leases → documents) is delivered in order because each layer depends on the one before it. The onboarding flow engine — the core differentiator — is built after its dependencies (DocuSign, Stripe Connect, tenant profiles) are fully operational. Rent tracking, communications, and the reporting/admin layer follow as independent capabilities that consume the completed data model.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Infrastructure Foundation** - Express + tRPC backend scaffold, Postgres + Drizzle with RLS, audit log pattern, monorepo wiring, codebase cleanup

- [ ] **Phase 2: Auth & Billing** - Better Auth (email/password + Google OAuth, org/roles), Stripe Subscriptions, plan limits, setup wizard, settings
- [ ] **Phase 3: Properties & Units** - Full CRUD for properties and units, S3 image upload, custom tags/statuses, proration, lease expiry alerts
- [ ] **Phase 3.1: URL Query State (nuqs)** *(INSERTED)* - Reusable nuqs primitives for overlay open/close state and data-table filter/sort/pagination state; migrate all landlord-web consumers
- [ ] **Phase 3.2: Floor Plans** *(INSERTED)* - Reusable per-property unit layouts (beds/baths/default sq ft + 25-image gallery) that units inherit from, plus a new wide two-column `WizardDialog` primitive in `@villuh/ui`
- [ ] **Phase 3.3: Amenities** *(INSERTED)* - Org amenity catalog scoped property/unit/both, property assignments with reservability + 10-image gallery, unit assignments with bulk apply; reservations designed but deferred past Phase 4
- [ ] **Phase 4: Tenants, Leases & Documents** - Tenant profiles, co-tenants, lease entity, DocuSign integration, document lifecycle, signed PDF storage
- [ ] **Phase 5: Onboarding Flow Engine** - Flow builder, 5 step types, conditional branching, tenant invite system, Stripe Connect payment step, preview mode
- [ ] **Phase 6: Rent Ledger** - Auto-generated monthly entries, manual payment recording, partial payments, late fees, Railway Cron overdue job
- [ ] **Phase 7: Communications** - Resend + Twilio email/SMS, two-way threads, AI drafting, bulk send, templates, in-app notifications
- [ ] **Phase 8: Reporting, Search & Admin** - Financial reports, global search, operator admin panel, CSV import wizard, full data export

## Phase Details

### Phase 1: Infrastructure Foundation
**Goal**: The monorepo runs a working Express + tRPC API with Postgres, Drizzle-managed migrations, and Postgres RLS enforced at the DB layer — every subsequent phase builds on this secure, correctly wired foundation
**Depends on**: Nothing (first phase)
**Requirements**: None (foundational scaffolding — prerequisites for all 70 v1 requirements)
**Success Criteria** (what must be TRUE):
  1. An Express API server starts in the monorepo and responds to health-check / tRPC requests from the Next.js frontends via `@villuh/api`
  2. Drizzle migrations run against a Postgres instance and the `villuh_app` non-owner role is enforced — an integration test confirms that cross-tenant data is invisible to a different landlord's session
  3. The audit log pattern (`audit_log` table + triggers) is in place and records changes on at least one table
  4. Codebase is clean: Toaster is mounted, one icon library is in use, and `.vscode/github-accounts.json` is removed from version control
**Plans**: 6 plans (01-01 through 01-06)

**Wave dependency notes:**
- **Wave 1** — 01-01: Monorepo scaffold (unblocks everything)
- **Wave 2** *(blocked on Wave 1 completion)* — 01-02: Express/tRPC server + withTenant, 01-03: @villuh/db package, 01-06: Icon consolidation + Toaster (run in parallel)
- **Wave 3** *(blocked on Wave 2 completion, specifically 01-03)* — 01-04: Postgres provision + migrations (checkpoint required)
- **Wave 4** *(blocked on Wave 3 completion)* — 01-05: RLS + audit log integration tests

**Cross-cutting constraints:**
- `villuh_app` non-owner role must exist in Postgres before any migration runs (all waves)
- `DATABASE_APP_URL` must point to `villuh_app` credentials; `DATABASE_URL` must point to owner credentials (all waves)
Plans:
- [x] 01-01-PLAN.md — pnpm workspace monorepo scaffold + root config + file relocation (2026-04-29)
- [x] 01-02-PLAN.md — API server + withTenant wrapper + typed client (originally Hono; live stack Express+tRPC) (2026-04-29)
- [x] 01-03-PLAN.md — @villuh/db package: Drizzle schema, RLS policy, db clients, bootstrap SQL (2026-04-29)
- [x] 01-04-PLAN.md — [BLOCKING] Postgres provision + drizzle-kit generate + audit log SQL injection + migrate (2026-04-30)
- [x] 01-05-PLAN.md — RLS cross-tenant isolation + audit log integration tests (vitest) (2026-04-30)
- [x] 01-06-PLAN.md — Icon consolidation (lucide-react → PlatformIcon) + Toaster mount (2026-04-29)

### Phase 2: Auth & Billing
**Goal**: Landlords can create accounts, invite team members, and are on a billing plan with enforced limits — the full auth and subscription lifecycle works end to end
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08, AUTH-09, SETT-01, SETT-02
**Success Criteria** (what must be TRUE):
  1. Landlord can sign up with email/password or Google OAuth, log in, and reset their password via email link
  2. Landlord can invite a team member, assign them a role (owner / manager / viewer), and the invitee has only the permissions their role allows
  3. New landlord is guided through a property → unit → tenant setup wizard on first login before reaching the main app
  4. Landlord is on a subscription tier; creating properties beyond the plan limit is hard-blocked with a prompt to upgrade
  5. Landlord can view invoices, change plan, and manage connected accounts (Stripe Connect, DocuSign) from the Settings page; a personal audit log of account activity is visible in settings
**Plans**: 12 plans (02-01 through 02-12)

**Wave dependency notes:**
- **Wave 1** — 02-01: Test infrastructure + Better Auth/role_permissions/plan_limits schema + [BLOCKING] schema push (unblocks everything)
- **Wave 2** *(blocked on 02-01)* — 02-02: Better Auth server config + Resend email + auth middleware + /api/auth/* mount
- **Wave 3** *(blocked on 02-02)* — 02-03: Auth pages (login/register/forgot/reset), 02-04: Org auto-create + role permissions + team API + /api/me, 02-05: Stripe billing routes (trial-start, setup-intent, subscribe, upgrade, invoices, sync-units), 02-07: server account + audit-log routes + tests — all parallel
- **Wave 4** *(blocked on Wave 3)* — 02-06 *(blocked on Wave 3)*: plan limits + wizard (checkPlanLimit + subscriptionExpiredGate + Next.js middleware + 4-step wizard), 02-08 *(blocked on 02-04, 02-05)*: server Stripe Connect + DocuSign routes (Stripe Connect OAuth callback + DocuSign Connect stub routes + AUTH-06 tests)
- **Wave 5** *(blocked on 02-06 + 02-07 + 02-08)* — 02-09: settings layout + Account + Audit Log pages, 02-10: Team page (UI), 02-11: Billing settings page (Stripe Elements) — 3 parallel
- **Wave 6** *(blocked on 02-09)* — 02-12: persistent UI (banner + upgrade modal) + (app) layout edit + accept-invitation + Integrations page (must follow 02-09 because both touch (app)/layout.tsx)

**Cross-cutting constraints:**
- BETTER_AUTH_SECRET, GOOGLE_CLIENT_ID/SECRET, RESEND_API_KEY, STRIPE_SECRET_KEY/WEBHOOK_SECRET/STARTER/GROWTH/PRO_PRICE_ID, STRIPE_CLIENT_ID env vars must be configured before Plan 02 ships
- Better Auth Drizzle adapter MUST point at DATABASE_APP_URL (villuh_app role) — never DATABASE_URL (Pitfall 1)
- No global JSON body parser on Express — Stripe webhook needs raw body via `express.raw()` (Pitfall 4)
- Stripe trial subscription created via direct stripeClient.subscriptions.create (NOT authClient.subscription.upgrade — Pitfall 5)
- session.activeOrganizationId is the landlord_id for RLS — never user.id (Pitfall 7)
Plans:
- [ ] 02-01-PLAN.md — Test infrastructure + Better Auth/role_permissions/plan_limits schema + migrations + [BLOCKING] schema push
- [ ] 02-02-PLAN.md — Better Auth server config + Resend email senders + authMiddleware + /api/auth/* mount
- [ ] 02-03-PLAN.md — Auth client + 4 auth pages (login, register, forgot-password, reset-password) per UI-SPEC Screens 1-4
- [ ] 02-04-PLAN.md — Org auto-create hook + configurable role_permissions middleware + team management API + /api/me
- [ ] 02-05-PLAN.md — Stripe billing routes (trial-start, setup-intent, subscribe, upgrade, invoices, payment-method, sync-units)
- [ ] 02-06-PLAN.md — checkPlanLimit + subscriptionExpiredGate + Next.js routing middleware + 4-step setup wizard
- [ ] 02-07-PLAN.md — Server: /api/account (profile + password) + /api/audit-log routes + audit.test.ts SETT-02 tests
- [ ] 02-08-PLAN.md — Server: Stripe Connect OAuth callback + DocuSign Connect stub routes + AUTH-06 tests
- [ ] 02-09-PLAN.md — Web: (app) layout shell + Settings layout + sidebar + Account page + Audit Log page
- [ ] 02-10-PLAN.md — Web: Team settings page (member list + invite form + role permissions editor + remove dialog)
- [ ] 02-11-PLAN.md — Web: Billing settings page (usage summary + plan selector + Stripe Elements payment method + invoice list)
- [ ] 02-12-PLAN.md — Web: Usage Warning Banner + Upgrade Modal + (app) layout edit + accept-invitation page + Integrations page (Stripe Connect + DocuSign cards)
**UI hint**: yes

### Phase 3: Properties & Units
**Goal**: Landlords can fully manage their property portfolio and individual units — every structural entity that leases and tenants will reference exists and is queryable
**Depends on**: Phase 2
**Requirements**: PROP-01, PROP-02, PROP-03, PROP-04, PROP-05, UNIT-01, UNIT-02, UNIT-03, UNIT-04, UNIT-05
**Success Criteria** (what must be TRUE):
  1. Landlord can create, edit, and soft-archive a property with name, structured address, notes, custom tags, and an S3 image gallery
  2. Landlord can create, edit, and soft-archive units (from `/units` and under a property) with label, sq ft, base rent, and custom availability statuses
  3. Plan limits gate property/unit creates in UI and on the server; `me.get` quotas reflect active counts
  4. Unit detail exposes stub empty Rent history and Tenant history tabs (live history deferred)
  5. PROP-03 dashboard, PROP-04/05 lease-expiry alerts/notices, and UNIT-05 proration are explicitly deferred (CONTEXT overrides older roadmap wording)
**Plans**: 9 plans (03-01 through 03-09)

**Wave dependency notes:**
- **Wave 0** — 03-01: Vitest stubs + deps + env + Tabs
- **Wave 1** — 03-02: Drizzle schemas + [BLOCKING] migrate + audit triggers
- **Wave 2** — 03-03: properties + uploads APIs (depends on 02)
- **Wave 3** — 03-04: units + statuses + Stripe sync (depends on 03)
- **Wave 4** — 03-09: tags API + me.get quotas (depends on 04; sequential for router.ts ownership); 03-05: PlanLimitGate + properties UI + Mapbox + TipTap (depends on 04; parallel with 09 — tags UI deferred to 07)
- **Wave 5** — 03-06: Units UI + stub history tabs (depends on 05)
- **Wave 6** — 03-07: Gallery + TagPicker + status catalog (depends on 05+06+09)
- **Wave 7** — 03-08: Archive dialogs + deferral docs + human verify (depends on 07)

Plans:
- [x] 03-01-PLAN.md — Wave 0 stubs, deps, env, Tabs
- [x] 03-02-PLAN.md — Portfolio schema + [BLOCKING] migrate + audit triggers
- [x] 03-03-PLAN.md — Properties CRUD, sanitize notes, S3 gallery API
- [x] 03-04-PLAN.md — Units + statuses APIs + Stripe sync
- [x] 03-05-PLAN.md — PlanLimitGate + properties list/create/edit/detail (Mapbox/TipTap); tags placeholder only
- [x] 03-06-PLAN.md — Units list/Sheet/detail + UNIT-03/04 stub tabs
- [x] 03-07-PLAN.md — Gallery DnD + TagPicker + status catalog UI
- [ ] 03-08-PLAN.md — Archive confirms + deferred REQ docs + human verify
- [x] 03-09-PLAN.md — Tags API + live me.get quotas
**UI hint**: yes

### Phase 3.1: URL Query State (nuqs) — INSERTED
**Goal**: Overlay open/close state and data-table filter/sort/pagination state live in the URL, so any view is a shareable link — delivered as a reusable abstraction where a new overlay or a new filter costs one config line
**Depends on**: Phase 3
**Requirements**: None (cross-cutting frontend infrastructure)
**Success Criteria** (what must be TRUE):
  1. A pasted URL cold-restores the exact table state (search, multiple field/operator/value filters, sort, page) and any open overlay, fetching the overlay's record by id
  2. Adding a filter to an existing table is one line in that table's config; adding an overlay is one line in that module's config plus the component — no third place to update
  3. Browser back closes an open overlay without clearing filter state; filter/sort/page changes do not pollute history
  4. All landlord-web overlay call sites and the units DataTable are migrated; `useDataTableQuery` and the per-template `useState` trios are deleted
  5. No intercepting or parallel routes are introduced; `DataTable`, `DataGrid`, column defs, and the toolbar are unmodified
**Plans**: 8 plans (03.1-01 through 03.1-08)

**Wave dependency notes:**
- **Wave 0** — 03.1-01: nuqs deps, packages/ui vitest node project, URL key registry, shared type contracts (unblocks everything)
- **Wave 1** *(parallel)* — 03.1-02: filter/sort/page parsers (TDD) + `<NuqsAdapter>` in both root layouts; 03.1-04: overlay primitives (`createOverlays`, `<AppOverlays>`, `<OverlayBody>`)
- **Wave 2** — 03.1-03: `defineTable` + `useDataTableQueryState` (depends on 02 for parsers, 04 for barrel ownership)
- **Wave 3** — 03.1-05: units table migration + human verify (depends on 03)
- **Wave 4** — 03.1-06: units overlays + the single `<AppOverlays>` mount (depends on 04 and 05 — shares `units/components/list/index.tsx` with 05)
- **Wave 5** — 03.1-07: properties overlays + gallery lightbox (depends on 06 — shares the global mount file)
- **Wave 6** — 03.1-08: delete `useDataTableQuery`, full gate sweep, 11 manual scenarios (depends on 07)

**Cross-cutting constraints:**
- `DataTable`, `DataGrid`, `DataTableToolbar`, `filters.tsx`, and the units column defs must not be modified (D-05, D-28). `data-table.tsx`'s only permitted diff is 03.1-08's deletion of the dead `useDataTableQuery`.
- Parser maps and `urlKeys` objects are built once at module scope and frozen, and every non-primitive-default parser declares `eq` (D-41) — violating this makes the search box silently never commit.
- `pnpm --filter @villuh/landlord-web build` is a gate on every wave that touches app code, not just typecheck (D-39, D-48).
- No component test infrastructure exists (D-46); everything above the parser layer is manually verified at the 03.1-05 and 03.1-08 checkpoints.

Plans:
- [x] 03.1-01-PLAN.md — nuqs deps, vitest harness, URL key registry, shared type contracts *(3/8 complete)*
- [x] 03.1-02-PLAN.md — filter/sort/page parsers (TDD) + `<NuqsAdapter>` in both root layouts
- [ ] 03.1-03-PLAN.md — `defineTable` + `useDataTableQueryState` (the URL-backed twin)
- [x] 03.1-04-PLAN.md — `createOverlays`, `<AppOverlays>`, `<OverlayBody>`
- [ ] 03.1-05-PLAN.md — units table migration + browser verify *(checkpoint)*
- [ ] 03.1-06-PLAN.md — units overlays + the single global overlay mount
- [ ] 03.1-07-PLAN.md — properties overlays + page-mounted gallery lightbox
- [ ] 03.1-08-PLAN.md — delete `useDataTableQuery`, gate sweep, manual sign-off *(checkpoint)*
**Context**: `.planning/phases/03.1-url-query-state/03.1-CONTEXT.md`
**UI hint**: no — zero visual change; overlays and tables keep their existing appearance, only their state source moves to the URL

### Phase 3.2: Floor Plans — INSERTED
**Goal**: A property owns reusable floor plans (name, beds, baths, optional default square footage, gallery of up to 25 images) that its units inherit from unless individually overridden — created and edited through a new wide two-column wizard dialog variant built as a reusable `@villuh/ui` primitive
**Depends on**: Phase 3.1
**Requirements**: None (extends PROP/UNIT domain)
**Success Criteria** (what must be TRUE):
  1. A landlord can create a floor plan through a three-step wizard (Details → Gallery → Review) that opens in a wide two-column dialog with a left sidebar carrying the title, description and a vertical stepper; abandoning it mid-flow leaves no database row and no S3 object
  2. Editing a plan reopens the same wizard with values loaded, every step directly clickable and no review gate; the four pre-existing dialogs are visually unchanged and `packages/ui/src/dialog.tsx` has a zero-byte diff
  3. A unit can be assigned one floor plan of its own property and inherits beds/baths/square footage from it; editing the plan updates every non-overridden unit, an overridden unit keeps its own value, and clearing a field returns it to inheriting
  4. A floor plan gallery accepts up to 25 images with the 26th refused server-side, first image as cover, drag reorder, and `objectKey`-only persistence with presigned GET at read time
  5. Cross-property plan assignment is rejected server-side, archiving a plan leaves assigned units intact and still inheriting, and cross-organization access is blocked by RLS
**Plans**: 8 plans (03.2-01 through 03.2-08)

**Wave dependency notes:**
- **Wave 1** *(no deps, parallel)* — 03.2-01: schema + [BLOCKING] migration; 03.2-05: `WizardDialog` primitive in `@villuh/ui`
- **Wave 2** *(blocked on 01, parallel)* — 03.2-02: floorPlans module + gallery + uploads presign + registration; 03.2-03: units input widening + D-27a immutability + cross-property rejection
- **Wave 3** *(blocked on 02+03)* — 03.2-04: floor-plans.test.ts (D-48 suite)
- **Wave 4** *(GATED on Phase 3.1, blocked on 02+05)* — 03.2-06: floor plan wizard components (carries the loud 3.1 precondition — first UI plan)
- **Wave 5** *(GATED on Phase 3.1, blocked on 06)* — 03.2-07: FloorPlansSection + card + archive + overlay registration + template + human-verify
- **Wave 6** *(GATED on Phase 3.1, blocked on 02+06)* — 03.2-08: floor plan resolver + unit form assignment + units table columns + human-verify

**Cross-cutting constraints:**
- `packages/ui/src/dialog.tsx` must not be modified (D-29) — `wizard-dialog.tsx` composes its exports.
- Assignment must never copy plan values into unit columns; NULL means inherit and resolution happens at read time (D-19).
- Both new tables need hand-written audit triggers appended to the generated migration (D-21) — Drizzle does not emit them.
- Floor plans live inside `modules/properties/`, not a module of their own (D-37).
- **Shell contract for this phase: Linux bash** (this work is on Linux, not the Windows PowerShell 5.1 of D-49/D-50 — superseded for 03.2 acceptance criteria; every plan carries a `<shell_contract>` note and uses `main` as the git base).

**Context**: `.planning/phases/03.2-floor-plans/03.2-CONTEXT.md`
**UI hint**: yes — new `WizardDialog` primitive, floor plans settings section, unit form and units table changes

Plans:
- [x] 03.2-01-PLAN.md — Drizzle schema (floor_plans + floor_plan_images) + 3 units columns + [BLOCKING] migration + audit triggers
- [x] 03.2-02-PLAN.md — floorPlans module (CRUD + nested gallery) + uploads.presignFloorPlanImage + registration
- [x] 03.2-03-PLAN.md — units input widening + D-27a property immutability + cross-property rejection
- [x] 03.2-04-PLAN.md — floor-plans.test.ts (D-48 integration suite)
- [x] 03.2-05-PLAN.md — `WizardDialog` primitive in `@villuh/ui` (composes dialog.tsx, zero-byte diff)
- [x] 03.2-06-PLAN.md — floor plan wizard components + display lib + staged-gallery retarget *(GATED on 3.1)*
- [ ] 03.2-07-PLAN.md — FloorPlansSection + card + archive + overlay registration + template *(GATED on 3.1, checkpoint)*
- [ ] 03.2-08-PLAN.md — floor plan resolver + unit form assignment + units table columns *(GATED on 3.1, checkpoint)*

### Phase 3.3: Amenities — INSERTED
**Goal**: An organization owns one amenity catalog scoped to properties, units, or both, and assigns entries to properties (with reservability config and a photo gallery) and to units (individually or in bulk) — so amenity labels stay consistent enough to filter and search on instead of drifting into unmatchable free text
**Depends on**: Phase 3.2 (soft — no shared files); **hard gate on Phase 3.1**
**Requirements**: None (extends PROP/UNIT domain)
**Success Criteria** (what must be TRUE):
  1. A landlord can create, rename, re-icon, and archive org catalog amenities scoped `property`, `unit`, or `both`; archiving hides an entry from pickers while every existing assignment keeps rendering unchanged
  2. Renaming a catalog amenity updates the label on every assignment that still carried the old catalog name, and leaves deliberately customized per-property labels untouched
  3. A landlord can attach catalog or freeform amenities to a property, mark one reservable and whether it requires approval, attach up to 10 photos with the 11th refused server-side, and promote a freeform entry into the catalog without creating a duplicate by name
  4. A landlord can assign unit amenities from the unit form and in bulk from a multi-row units table selection; re-applying an amenity to units that already have it is idempotent rather than an error
  5. A `unit`-scoped amenity is rejected server-side on a property (and vice versa), cross-organization access is blocked by RLS, and the amenity detail sheet cold-loads open from a pasted URL
  6. The property About tab renders real amenities and the tag-based amenity stopgap is removed
**Plans**: 9 plans across 6 waves
Plans:
- [x] 03.3-01-PLAN.md — Data foundation: 2 enums, 4 tables + RLS, full Zod contract, hand-authored 0019 migration (dual-DB apply) [BLOCKING wave 1]
- [x] 03.3-02-PLAN.md — Catalog API + seed + rename propagation + promote + amenities.test.ts (catalog cases)
- [x] 03.3-03-PLAN.md — Icon foundation (38 PlatformIcon mappings) + icon-color picker + read-only chip row
- [x] 03.3-04-PLAN.md — Property assignment API + nested gallery + presignAmenityImage (10-cap) + tests
- [x] 03.3-05-PLAN.md — Unit assignment API incl. one-query bulkAdd/bulkRemove/listByProperty + tests
- [ ] 03.3-06-PLAN.md — Dual-mode AmenityPicker + GalleryManager extraction (D-31)
- [ ] 03.3-07-PLAN.md — Property settings surface: overlay registry + amenity sheet + catalog dialog + card (+ checkpoint)
- [ ] 03.3-08-PLAN.md — Units UI: DataTable row-selection extend + form picker + column + bulk-actions (+ checkpoint)
- [ ] 03.3-09-PLAN.md — About-tab real amenity chips + tags-as-amenities stopgap removal (D-14)

**Cross-cutting constraints:**
- **Phase 3.1 must be complete first (COMPLETE).** The units amenities column touches the 3.1-migrated units table (`list/columns.tsx`, `list/index.tsx`). The amenity sheet uses `createOverlays`; any reservations table uses `defineTable`.
- All four new tables need hand-written audit triggers appended to the hand-authored migration — Drizzle does not emit them (and `drizzle-kit generate` is blocked; migration 0019 is hand-authored).
- Gallery rows persist `objectKey` only, with presigned GET at read time.
- Catalog archives, never deletes — deleting must not strip an amenity and its photos from every property using it.
- Reservations are explicitly **out of scope** — designed in the spec, built in a later phase after Phase 4 (they require tenants and a resident request surface).
- **Shell environment for this phase is Linux + bash with `rg` on PATH; git base branch is `master` (D-48 — supersedes the Windows PowerShell 5.1 guidance in D-49/D-50 for Phase 3.3).** Every acceptance command is POSIX bash and must be executed before its result is recorded, especially any expected to return non-zero.

**Spec**: `docs/superpowers/specs/2026-08-13-amenities-design.md`
**UI hint**: yes — amenities settings page, amenity detail sheet, catalog dialog, unit picker, units-table bulk actions, About tab chips

### Phase 4: Tenants, Leases & Documents
**Goal**: Landlords can manage the full tenant-lease-document lifecycle — from creating a tenant profile through signing documents via DocuSign and storing the signed PDF
**Depends on**: Phase 3
**Requirements**: TENT-01, TENT-02, TENT-03, TENT-04, TENT-05, TENT-06, LEASE-01, LEASE-02, LEASE-03, LEASE-04, LEASE-05, LEASE-06, LEASE-07, LEASE-08, LEASE-09, LEASE-10, LEASE-11, LEASE-12, LEASE-13
**Success Criteria** (what must be TRUE):
  1. Landlord can create a tenant profile (including co-tenants) linked to a unit, and view an activity timeline for that tenant showing all system events, document views, and logins
  2. Landlord can create a lease record with all required fields and set its activation mode (auto / manual / scheduled); lease and tenant are archived with data retained when the lease ends
  3. Landlord can upload a document (Lease, Addendum, Notice, or Misc), send it for e-signature via DocuSign (template or ad-hoc PDF), and configure multi-party signing order including co-tenant order and optional landlord countersign
  4. When a signer declines, the step is marked failed, the landlord is notified, and the landlord can resend (new envelope) or void the existing envelope from within Villuh
  5. Signed PDFs are stored in S3 and accessible via one-click download or inline browser preview; tenant can preview the PDF on their invite page before the DocuSign step
**Plans**: TBD

**Decomposition (2026-08-13):** Phase 4 is split into independent slices, each with its own spec → plan → execution cycle:
- **Tenant slice** (`TENT-01–04`) — tenant profiles, co-tenants, tenancy↔unit link, activity timeline, archive/retention. **Designed & planned** (execution deferred until Phase 4 reaches the queue). Spec: `docs/superpowers/specs/2026-08-13-tenant-slice-design.md`; Plan: `docs/superpowers/plans/2026-08-13-tenant-slice.md` (commit `c215578`). Architecture: a "tenancy seam" (`tenants` / `tenancies` / `tenancy_members`) the future Lease entity extends without migration; occupancy derived, not written; activity timeline derived from `audit_log`.
- **Lease slice** (`LEASE-01/02/04/05` + record fields) — lease entity, activation modes, addendums. *Not yet designed.*
- **Documents/e-sign slice** (`LEASE-03/06/07/08/09/10/11/12/13`, `TENT-05/06` import/export) — DocuSign lifecycle, signed-PDF storage, CSV import/export. *Not yet designed.*

**UI hint**: yes

### Phase 5: Onboarding Flow Engine
**Goal**: Landlords can build a configurable onboarding flow, send a tenant a magic-link invite, and the tenant completes all steps (including signing, payment, and form fill) on a branded invite page — the product's core differentiator is fully operational
**Depends on**: Phase 4
**Requirements**: FLOW-01, FLOW-02, FLOW-03, FLOW-04, FLOW-05, FLOW-06, FLOW-07, FLOW-08, FLOW-09, FLOW-10
**Success Criteria** (what must be TRUE):
  1. Landlord can build an onboarding flow with ordered steps, conditional branching, and all 5 step types: signature_required, acknowledgment, document_view_only, form_fill (custom landlord-defined fields), and payment (Stripe Checkout via Stripe Connect)
  2. Landlord can save a flow as a reusable template and apply it to any tenant/unit combination; the flow locks from editing once an instance is active
  3. Landlord can preview the tenant invite experience from the flow builder before sending
  4. Tenant receives a magic-link invite, lands on a branded invite page, and completes each sequential step (the page renders from the flow snapshot, not the live definition)
  5. Landlord can configure invite expiry, and can resend, revoke, or regenerate the invite link; each tenant has one onboarding instance that can be reset and re-triggered
**Plans**: TBD
**UI hint**: yes

### Phase 6: Rent Ledger
**Goal**: Landlords have a live, accurate rent ledger for every active lease — entries are auto-generated, overdue status is applied by a scheduled job, and all payment recording and adjustment operations work
**Depends on**: Phase 4
**Requirements**: LEDG-01, LEDG-02, LEDG-03, LEDG-04, LEDG-05, LEDG-06, LEDG-07
**Success Criteria** (what must be TRUE):
  1. A monthly rent entry is automatically generated for each active lease on the due date; entries become overdue automatically after the due day plus the configured grace period via a Railway Cron job
  2. Landlord can record a manual payment (full or partial) using a fixed method enum; the system tracks the remaining balance after partial payments
  3. Late fees are calculated and added to the ledger automatically after the grace period expires
  4. Landlord can apply structured ledger adjustments (credit, late fee waiver, partial payment) with a required reason code
**Plans**: TBD
**UI hint**: yes

### Phase 7: Communications
**Goal**: Landlords can message tenants via email and SMS, view two-way conversation history, use AI-assisted drafting, and receive in-app notifications — all tenant communication flows through one place
**Depends on**: Phase 4
**Requirements**: COMM-01, COMM-02, COMM-03, COMM-04, COMM-05, COMM-06, COMM-07, COMM-08, COMM-09
**Success Criteria** (what must be TRUE):
  1. Landlord can send an email or SMS to an individual tenant or bulk-send to multiple selected tenants in one action
  2. Landlord can view a two-way threaded conversation history per tenant; inbound tenant replies are routed to the correct thread
  3. Landlord can create message templates with variable chips ({{tenant_name}}, {{rent_amount}}, etc.) and use AI-assisted drafting that references the full tenant profile, lease, and payment history
  4. TCPA/CAN-SPAM opt-outs are handled automatically; tenants who opt out do not receive further messages
  5. Landlord sees in-app notifications (bell icon, unread count, notification feed) and can configure per-event notification preferences across in-app, email, and SMS channels
**Plans**: TBD
**UI hint**: yes

### Phase 8: Reporting, Search & Admin
**Goal**: Landlords have financial visibility and fast lookup across their entire portfolio; operators have full control over all accounts — the platform is complete and ready for production
**Depends on**: Phase 6, Phase 7
**Requirements**: REPT-01, SRCH-01, ADMN-01, ADMN-02
**Success Criteria** (what must be TRUE):
  1. Landlord can view a reports page with revenue summary, payment trends, and occupancy rate — all filterable by date range
  2. Landlord can search across tenants, units, and properties by name from a global search bar accessible from any page
  3. Operator can access an admin panel to impersonate any landlord account, override billing, delete data, and view all accounts, subscriptions, and usage metrics
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 3.1 → 3.2 → 3.3 → 4 → 5 → 6 → 7 → 8
(Phase 6 and Phase 7 depend on Phase 4 and can be planned in parallel, but execute sequentially)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Infrastructure Foundation | 6/6 | Complete | All plans done 2026-04-29–30 |
| 2. Auth & Billing | 0/12 | Not started | - |
| 3. Properties & Units | 8/9 | In Progress|  |
| 3.1 URL Query State (nuqs) | 0/TBD | Context ready | - |
| 3.2 Floor Plans | 6/8 | In Progress|  |
| 3.3 Amenities | 5/9 | In Progress|  |
| 4. Tenants, Leases & Documents | 0/TBD | Not started | - |
| 5. Onboarding Flow Engine | 0/TBD | Not started | - |
| 6. Rent Ledger | 0/TBD | Not started | - |
| 7. Communications | 0/TBD | Not started | - |
| 8. Reporting, Search & Admin | 0/TBD | Not started | - |
