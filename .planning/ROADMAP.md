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
- [ ] 03-01-PLAN.md — Wave 0 stubs, deps, env, Tabs
- [ ] 03-02-PLAN.md — Portfolio schema + [BLOCKING] migrate + audit triggers
- [ ] 03-03-PLAN.md — Properties CRUD, sanitize notes, S3 gallery API
- [ ] 03-04-PLAN.md — Units + statuses APIs + Stripe sync
- [ ] 03-05-PLAN.md — PlanLimitGate + properties list/create/edit/detail (Mapbox/TipTap); tags placeholder only
- [ ] 03-06-PLAN.md — Units list/Sheet/detail + UNIT-03/04 stub tabs
- [ ] 03-07-PLAN.md — Gallery DnD + TagPicker + status catalog UI
- [ ] 03-08-PLAN.md — Archive confirms + deferred REQ docs + human verify
- [ ] 03-09-PLAN.md — Tags API + live me.get quotas
**UI hint**: yes

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
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8
(Phase 6 and Phase 7 depend on Phase 4 and can be planned in parallel, but execute sequentially)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Infrastructure Foundation | 6/6 | Complete | All plans done 2026-04-29–30 |
| 2. Auth & Billing | 0/12 | Not started | - |
| 3. Properties & Units | 0/8 | Planned | - |
| 4. Tenants, Leases & Documents | 0/TBD | Not started | - |
| 5. Onboarding Flow Engine | 0/TBD | Not started | - |
| 6. Rent Ledger | 0/TBD | Not started | - |
| 7. Communications | 0/TBD | Not started | - |
| 8. Reporting, Search & Admin | 0/TBD | Not started | - |
