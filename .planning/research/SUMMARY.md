# Research Summary: Villuh Lease

**Domain:** Landlord SaaS / Multi-tenant B2B operating system (1–50 units)
**Researched:** 2026-04-29
**Overall confidence:** HIGH (stack versions from npm registry live; architecture patterns verified against official docs via Context7)

---

## Executive Summary

Villuh Lease operates in a mature but underserved SaaS vertical. The 1–50 unit independent landlord segment has no competitor that delivers a structured, sequential onboarding workflow engine — every existing tool (TurboTenant, Avail, Hemlane, RentRedi) requires landlords to manually coordinate lease signing, deposit collection, and document handoff across disconnected tools. Villuh's core value proposition — "zero to signed lease in one flow" — is a genuine market gap, not a marketing claim.

The technical stack is well-chosen and constrained: Next.js + Hono + Postgres + Drizzle + Better Auth. The most architecturally consequential decision is the multi-tenancy strategy. Postgres RLS enforced via `set_config` session variables (not application-layer WHERE clauses) is the correct approach, but it carries a critical prerequisite: the app must run as a non-owner Postgres role (`villuh_app`), or all RLS policies are silently bypassed. This decision must be made before the first table is created.

The onboarding flow engine is the product's highest-value differentiator and its most complex component. Two design decisions are load-bearing for correctness: (1) storing a `snapshot_json` of the flow at instance creation time so mid-execution edits can't corrupt active tenants, and (2) using a custom `onboarding_session` token for the invite page rather than Better Auth's magic link plugin (which has 5-minute expiry defaults unsuitable for multi-step onboarding). Both decisions must be made before any flow engine code is written.

---

## Key Findings

### Stack

- **Next.js 16.1.7** (upgrade to 16.2.4 early) + **Hono 4.12.15** + **Postgres** via `postgres` porsager driver 3.4.9 + **Drizzle 0.45.2**
- **Better Auth 1.6.9** has all required plugins bundled: `organization`, `organization/access`, `admin`, `magic-link`, `one-time-token`; `@better-auth/stripe@1.6.9` is a separate scoped package
- **Stripe 22.1.0** (two separate integrations: Subscriptions + Connect — two webhook endpoints, two secrets)
- **Twilio 6.0.0** requires Node >=20 — this is the hard floor; pin `.nvmrc` to Node 22 LTS immediately
- **Zod 4.3.6** — use v4 throughout; `@hono/zod-validator@0.7.6` explicitly supports `^4.0.0`
- **@anthropic-ai/sdk 0.91.1** for AI message drafting
- Railway Cron is a platform HTTP trigger, not an npm package — expose a `POST /internal/cron/mark-overdue` endpoint with secret header validation

### Features

**Table stakes (all correctly in scope):** Property/unit/tenant data model, lease records, rent ledger with manual payment logging, late fee calculation, email to tenants, document storage + e-sign, lease expiry reminders, mobile-responsive UI, basic search, data export.

**Primary differentiator:** The onboarding flow engine — configurable sequential steps with conditional branching, 5 step types (signature, acknowledgment, document view, form fill, payment), reusable templates, and a tenant invite page with preview mode. No competitor in this segment has this.

**Secondary differentiators:** AI message drafting with full tenant context (Claude, unique because the data is all in one place), Stripe Connect deposit payment inside the flow, configurable signing order for co-tenants.

**Anti-features (correctly excluded):** Tenant screening (FCRA liability), listing syndication (API maintenance nightmare), full accounting (different product), maintenance marketplace (two-sided network problem), tenant portal (deferred to v2).

### Architecture

- **RLS pattern:** `withTenant(landlordId, fn)` wrapper executes `SET LOCAL app.current_landlord_id` inside every transaction. App runs as `villuh_app` role (non-owner). Policies on all tenant tables use `current_setting('app.current_landlord_id', true)::uuid`. PgBouncer transaction-mode compatible.
- **Two Postgres connection strings:** `DATABASE_URL` (owner, migrations only) vs `DATABASE_APP_URL` (restricted `villuh_app`, Hono runtime)
- **Hono structure:** `server/` directory in monorepo, `app.route()` per domain, exported `AppType` for type-safe `hono/client` RPC in Next.js
- **Webhook architecture:** Idempotency table (`webhook_events` with unique `(provider, provider_event_id)`), synchronous processing, raw body required for signature verification — no global JSON body parser
- **S3:** Presigned PUT from Hono, browser uploads directly, store only `objectKey` in DB (never URLs)
- **Flow engine:** Copy steps to instance at activation (`snapshot_json`), server-side step advancement with precondition validation, `locked_at` on flow template while instance is active

### Pitfalls (critical)

1. **RLS bypassed by owner role** — create `villuh_app` role before the first migration or every policy is silently a no-op
2. **Two Stripe webhook endpoints** — `/webhooks/stripe/subscriptions` and `/webhooks/stripe/connect` with separate secrets; conflation is fatal
3. **Stripe Connect not charges-enabled** — `return_url` arrival ≠ onboarding complete; gate payment step on `account.updated` webhook with `charges_enabled: true`
4. **Flow snapshot vs. live definition** — invite page must render from `snapshot_json` on the instance, not live flow steps
5. **Magic link for tenant onboarding** — Better Auth magic link has 5-min expiry (`allowedAttempts: 1`); use a custom `onboarding_session` token with landlord-configurable expiry
6. **DocuSign declined is terminal** — "resend" = create new envelope; old `envelope_id` must be replaced
7. **CDC not wired at table creation** — define `audit_log` pattern in Phase 1; retrofitting is expensive

---

## Implications for Roadmap

Based on combined research, the natural phase structure follows the feature dependency chain:

1. **Infrastructure Foundation** — Hono scaffold, Postgres + Drizzle, RLS setup (`villuh_app` role, `withTenant()`), Better Auth integration, shared types + Hono RPC client, pre-Phase 1 cleanup (remove committed `.vscode/github-accounts.json`, mount Toaster, pick one icon library)
   - Addresses: critical pitfalls P1, P2, P13, P14, P15, P16, P17 — all Phase 1 decisions
   - Phase must not end without RLS integration test confirming cross-tenant isolation

2. **Auth & Billing** — Better Auth organization plugin, role/permission model (landlord/manager/viewer), Stripe Subscriptions, plan limits/feature gates, guided setup wizard, billing UI, password reset
   - Addresses: pitfalls P3, P9, P10, P11 — two webhook endpoints, raw body, org/RLS bridge
   - Plan limits must gate property creation before properties phase begins

3. **Properties & Units** — CRUD, S3 image upload, rent/tenant history tables, custom tags, availability statuses, proration calculation, lease expiry alerts
   - Tenant and lease records reference `unit_id` — must exist before tenants phase

4. **Tenants, Leases & Documents** — Tenant profiles, co-tenants, lease entity + activation modes, DocuSign integration (both template + ad-hoc), document lifecycle state machine, S3 signed PDF storage, activity timeline, addendum workflow
   - Addresses: pitfalls P5, P6, P12 — reconciliation endpoint, strategy abstraction, declined envelope handling
   - DocuSign developer account + sandbox must be set up before this phase begins

5. **Onboarding Flow Engine** — Flow builder, step types, conditions_json, flow locking + snapshot model, tenant invite system (custom session token), invite page, DocuSign webhook → step advance, Stripe Connect + payment step, flow preview mode
   - Addresses: pitfalls P4, P7, P8 — Connect charges-enabled gate, snapshot model, custom invite token
   - Most complex phase; needs the deepest planning pass

6. **Rent Ledger** — Auto-generate monthly entries (Railway Cron HTTP endpoint), manual payment recording, partial payments, late fees, adjustments, grace period + overdue cron
   - Requires active leases; independent of flow engine

7. **Communications** — Resend email + Twilio SMS, webhook receivers, message templates, Claude AI drafting, in-app notifications, bulk send, TCPA opt-out, notification preferences
   - Inbound routing architecture is TBD — flag for dedicated research/design at phase start
   - AI drafting: full tenant + lease + payment history context; server-side only

8. **Reporting, Search & Admin** — Financial reports, global search (Postgres full-text/pg_trgm), operator admin panel (impersonation, billing override), CSV import wizard, full data export
   - Read-only aggregation over completed data model; no upstream dependencies

**Phase ordering rationale:**
- Infrastructure must precede everything (RLS + auth are foundational)
- Billing must gate property creation (plan limits enforced from the start)
- Properties → Units → Tenants/Leases (entity hierarchy)
- Documents (DocuSign) must precede Flow Engine (signature steps depend on it)
- Rent Ledger and Communications are largely independent of each other after Phase 4

**Research flags for phases:**
- Phase 1: Drizzle RLS `enableRLS()` + SET LOCAL middleware exact integration — needs integration testing
- Phase 4: DocuSign JWT Grant setup, exact HMAC header for Connect webhook, IP allowlist on Railway
- Phase 5: Onboarding session token architecture — custom design needed (no standard library)
- Phase 7: Inbound SMS/email routing — architecture TBD, will need dedicated research sprint

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack (versions) | HIGH | npm registry live queries on 2026-04-29 |
| Stack (integration patterns) | MEDIUM | Hono + Drizzle RLS wiring needs integration testing; Better Auth org/RLS bridge needs validation |
| Features (table stakes) | HIGH | Stable, well-documented vertical |
| Features (differentiators) | MEDIUM | Onboarding flow engine novelty verified by competitor absence at Aug 2025 cutoff |
| Architecture (RLS + Hono + Better Auth) | HIGH | All core patterns verified via Context7 against official docs |
| Architecture (DocuSign specifics) | LOW→MEDIUM | HMAC header name unverified; overall integration pattern is standard |
| Pitfalls | HIGH | Most critical pitfalls verified against official SDK docs |

---

## Gaps to Address

- **DocuSign developer account setup** is a prerequisite for Phase 4 — this must be scheduled early (approval process takes time)
- **Railway PgBouncer mode** — confirm transaction-mode pooling (not session mode) for `set_config` compatibility before Phase 1 ships
- **Inbound message routing** (Twilio/Resend) — architecture not decided; needs a dedicated research pass at Phase 7 start
- **Twilio inbound SMS** — dedicated number vs. messaging service; webhook routing for two-way threads
- **`postgres` (porsager) driver vs. `pg`** — confirm Better Auth Drizzle adapter uses the right driver internally during Phase 2 setup
