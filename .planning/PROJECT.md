# Villuh Lease

## What This Is

Villuh Lease is a SaaS landlord operating system for independent landlords managing 1–50 units. It centralizes tenant lifecycle management, lease onboarding workflows, rent tracking, and document orchestration in one structured system — replacing the fragmented stack of email, spreadsheets, DocuSign, and payment apps most small landlords use today.

## Core Value

A landlord can onboard a tenant from zero to signed lease in one structured flow — without touching email, a spreadsheet, or a separate e-sign tool.

## Requirements

### Validated

- ✓ Next.js App Router frontend shell — existing
- ✓ Module-based UI component library (button, input, card, dialog, etc.) — existing
- ✓ ThemeProvider (dark/light/system) — existing
- ✓ LayoutProvider with breadcrumb context — existing
- ✓ Gambetta variable font loaded — existing

### Active

**Auth & Billing**
- [ ] Landlord signup/login via email+password and Google OAuth (Better Auth)
- [ ] Role-based access: landlord (owner) / manager / viewer with fully configurable permissions per role
- [ ] 3 subscription tiers: Starter / Growth / Pro with feature gates, property limits, and per-unit pricing
- [ ] 30-day free trial, no free tier; hard block when plan limits hit
- [ ] Stripe metered billing (per active unit, lower per-unit rate at higher tier)
- [ ] Stripe Connect for landlord to receive tenant deposit payments (prompted on payment step creation)
- [ ] Custom billing UI inside Villuh (invoices, plan changes, usage)
- [ ] Guided setup wizard for new landlords (property → unit → tenant)
- [ ] Better Auth native password reset

**Properties**
- [ ] Create/edit/delete properties (name, address, phone, notes, image gallery via S3)
- [ ] Custom tags for organizing properties
- [ ] Property dashboard: total units, occupied units, monthly rent total, alerts
- [ ] Configurable lease expiry alert threshold per landlord
- [ ] Automated tenant renewal notice via email/SMS at threshold

**Units**
- [ ] Create/edit/delete units (property_id, unit_label, sq footage, base_rent, availability_status)
- [ ] Custom availability statuses with defaults: Available / Occupied / Maintenance
- [ ] Rent history tracking per unit
- [ ] Tenant history (chronological list of previous tenants)
- [ ] Proration auto-calculated on lease start, overridable by landlord

**Tenants**
- [ ] Tenant profile: name, email, phone, assigned unit, lease status, onboarding status
- [ ] Multiple tenants per lease (co-tenants)
- [ ] Activity timeline: all events including views and logins
- [ ] Archival: tenant + lease marked inactive on lease end, data retained
- [ ] Guided CSV import wizard: tenants, leases, units, rent history
- [ ] Full data export (all entities)

**Lease & Documents**
- [ ] Lease entity: tenant_id, unit_id, rent_amount, due_day, start_date, end_date, status, grace_period
- [ ] Lease activation mode: configurable per lease (auto / manual / scheduled)
- [ ] Document types: Lease, Addendum, Notice, Misc
- [ ] Addendums attached to lease entity (lease has ordered list of addendums)
- [ ] Mid-lease rent change via addendum + update rent_amount
- [ ] Document lifecycle states: draft → uploaded → sent_for_signature → viewed → signed → archived
- [ ] DocuSign integration: both template library and ad-hoc PDF upload; field config in DocuSign UI
- [ ] Configurable multi-party signing order per document; optional landlord countersign
- [ ] Co-tenant signing order configurable per document
- [ ] Declined signature: step marked failed, landlord notified, can resend or revoke
- [ ] Void envelope from within Villuh via DocuSign API
- [ ] Signed PDF stored in S3, one-click download + in-browser preview panel
- [ ] Tenant sees inline PDF preview before DocuSign step on invite page

**Onboarding Flow Engine**
- [ ] Flow builder: landlord defines ordered steps with full conditional branching (conditions_json)
- [ ] 5 step types: signature_required (DocuSign), acknowledgment, document_view_only, form_fill (landlord defines custom fields: label/type/required), payment (Stripe Checkout → Stripe Connect)
- [ ] Reusable flow templates across any tenant/unit
- [ ] Steps always sequential; flow locked when active (can't edit mid-execution)
- [ ] One onboarding instance per tenant (reset and reuse on re-trigger)
- [ ] Manual trigger: landlord clicks "Start onboarding" per tenant
- [ ] Flow builder preview mode: landlord simulates tenant invite experience
- [ ] Tenant invite page: magic link, dynamic based on configured flow, Villuh + landlord branding
- [ ] Invite expiry: configurable N days; landlord can resend, revoke, or regenerate (new link invalidates old)
- [ ] Tenant identity: magic link only, no additional verification

**Rent Ledger**
- [ ] Auto-generate monthly rent entries per active lease
- [ ] Configurable grace period per lease before "late" status kicks in
- [ ] Daily Railway Cron: mark overdue after due_day + grace period
- [ ] Manual payment recording: fixed enum methods (Zelle, Venmo, Cash, Check, Bank Transfer, Other)
- [ ] Partial payments: log partial amount, system tracks remaining balance
- [ ] Late fees: calculated and added to ledger automatically
- [ ] Structured ledger adjustments: credit, late fee waiver, partial payment (with reason codes)

**Communications**
- [ ] Send email + SMS messages to tenants (Resend + Twilio)
- [ ] Two-way threaded conversation history per tenant
- [ ] Inbound routing via Resend + Twilio webhooks (routing strategy TBD in comms phase)
- [ ] Bulk send: select multiple tenants, send in one action
- [ ] Message templates with variable chips ({{tenant_name}}, {{rent_amount}}, etc.)
- [ ] AI message drafting via Claude: full tenant profile + lease + payment history context; tone learned from landlord's edits
- [ ] TCPA/CAN-SPAM compliance: automatic opt-out handling via Resend/Twilio
- [ ] In-app notification system: bell icon, unread count, notification feed
- [ ] Configurable landlord notification preferences: per-event toggles across in-app, email, SMS

**Financial Reporting**
- [ ] Dedicated reports page: revenue summary, payment trends, occupancy rate with date-range filtering

**Global Search**
- [ ] Search across tenants, units, and properties by name

**Operator Admin Panel**
- [ ] Full control: impersonate landlords, override billing, delete data
- [ ] View all accounts, subscriptions, usage

**Settings**
- [ ] Profile, billing UI, connected accounts (Stripe Connect, DocuSign), notification preferences
- [ ] Landlord-visible audit log in account settings

### Out of Scope

- Full accounting / bookkeeping
- Maintenance marketplace
- Tenant screening / background checks
- Legal contract generation
- Marketing/landing site (app only)
- SMS/email inbound routing strategy (figured out during comms phase)
- Cron monitoring / ops alerting (ops concern for later)
- Native mobile apps (planned later; `-web` suffix reserved for that split)
- Custom domains per landlord (v2+; v1 is `{slug}.villuh.com` / `{slug}.app.villuh.com`)

## Context

**Existing codebase:** Turborepo monorepo with two Next.js frontends (`landlord-web`, `resident-web`), shared Express + tRPC API (`apps/server`), shared packages (`ui`, `auth`, `api`). Frontends deploy to Vercel (two projects or multi-domain), backend + DB to Railway.

**Two user personas (product):**
- *Independent Landlord* (1–20 units): non-tech-savvy, values simplicity, currently on spreadsheets — served via lower-tier plans
- *Portfolio Builder* (10–50+ units): more operationally mature, wants visibility and automation — white-label subdomain + resident portal

**Two portals:**
- *Landlord* — `{slug}.app.villuh.com` — sidebar + top nav ops shell
- *Resident* — `{slug}.villuh.com` — center-aligned resident shell (same design system)

**DocuSign developer account:** Not yet set up — setup is part of the work. Field placement configured in DocuSign UI, not Villuh.

**Stripe architecture:** Two separate integrations — Stripe Subscriptions (landlord pays Villuh) and Stripe Connect (tenant pays landlord for deposits via Stripe Checkout on invite/resident flows).

**Webhook reliability:** Relies on provider-level retries (DocuSign, Stripe, Twilio). No custom retry infrastructure in v1.

**Known codebase concerns (from map):** `--font-mono` CSS variable used for Gambetta display font (semantic mismatch), dual icon libraries historically (lucide removed; PlatformIcon), Toaster mount, test infrastructure evolving.

## Constraints

- **Tech Stack**: Next.js + Express + tRPC + Postgres + Drizzle — monorepo (Hono / Nest / GraphQL out)
- **Frontends**: Separate `landlord-web` and `resident-web` apps; shared `@villuh/ui`, `@villuh/auth`, `@villuh/api`
- **API**: Single Express backend for both portals; typed RPC via tRPC (`AppRouter` → `@villuh/api`)
- **Auth**: Better Auth only — no custom JWT implementation
- **E-signature**: DocuSign non-negotiable for v1
- **Data isolation**: Postgres RLS enforced at DB level for all landlord data
- **Audit**: Full change data capture on all tables
- **Mobile**: Fully responsive — mobile and desktop equally important
- **Timezones**: UTC storage, browser-local display

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Separate Express API backend (monorepo) | Clean API boundary, TypeScript throughout, Railway deployment | Accepted |
| Express + tRPC (not Hono / not `hono/client`) | Live code already Express+tRPC; industry-standard typed RPC for TS monorepos; equal type safety to Hono RPC without migration churn | Accepted (supersedes earlier Hono plan) |
| No NestJS / GraphQL | Too many layers for fixed-workflow SaaS; weak fit for raw-body webhooks + RLS | Accepted |
| Two Next.js apps: landlord-web + resident-web | Separate hosts/auth cookies; shared UI via packages; future mobile keeps `-web` suffix | Accepted |
| Hosts: `{slug}.villuh.com` + `{slug}.app.villuh.com` | White-label both portals without `/admin` or nested `admin.` subdomain | Accepted |
| Shared packages: `@villuh/ui`, `@villuh/auth`, `@villuh/api` | One design system + auth + typed API client across portals | Accepted |
| Shared Postgres RLS multi-tenancy | One DB, `withTenant` + RLS; not per-tenant deploys | Accepted |
| Visual branding + per-landlord subdomain (not custom domains yet) | Covers white-label for scale without DNS/cert complexity in v1 | Accepted |
| DocuSign for e-sign | Core differentiator; landlords expect it | — Pending |
| Postgres RLS for multi-tenancy | Security enforced at DB layer, not just application code | Accepted |
| Full resident portal in scope (not invite-only v1) | Scope expanded: resident app is a first-class portal | Accepted |
| Provider-level webhook retries only | Sufficient for v1; avoids BullMQ/Redis complexity | — Pending |
| Inbound message routing TBD | Architecture not obvious; figured out during comms phase | — Pending |
| Full audit trail (CDC) | Compliance requirement + operator debugging | — Pending |
| 3 billing tiers (Starter/Growth/Pro) | Serves small landlords and larger portfolios via plan limits | — Pending |
| Stripe Connect for deposit payments | Money flows tenant→landlord, not through Villuh | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-08-11 — Express+tRPC locked; dual portals + shared packages*
