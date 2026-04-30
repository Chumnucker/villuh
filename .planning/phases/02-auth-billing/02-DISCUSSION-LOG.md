# Phase 2: Auth & Billing - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-30
**Phase:** 02-auth-billing
**Areas discussed:** Role permissions model, Subscription tier + metering, Setup wizard flow, Plan enforcement architecture

---

## Role permissions model

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed roles, fixed permissions | Hardcoded permission sets, no customization | |
| Landlord can customise permissions per role | Toggle what each role can/can't do | ✓ |
| Per-member overrides only | Roles have defaults, landlord can override per member | |

**Gated actions:** Write operations, financial actions, communications, admin

| Default role | Permissions |
|---|---|
| Owner | All |
| Manager | Writes + financial + comms (no admin) |
| Viewer | Read-only |

**Storage:** `role_permissions(landlord_id, role, action, allowed)` DB table

**Enforcement:** Both — Hono enforces + frontend hides based on /me response

**Org model:** One org per landlord (Better Auth org plugin). `org.id = landlord_id` in RLS.

**Property scoping:** Org-wide in Phase 2 (no per-property member scoping)

**Role source:** Better Auth org roles extended by our role_permissions table

**Invite flow:** Email link → invitee signs up or logs in → joins org (Better Auth built-in)

**Permission change effect:** Immediate — all members with that role affected instantly

---

## Subscription tier + metering

| Option | Description | Selected |
|--------|-------------|----------|
| Any unit that exists in system | Regardless of occupancy | ✓ |
| Units with active lease only | Vacant units don't count | |
| Units not in Maintenance status | Manually set status | |

**Billing model:** Stripe licensed quantity (not event-based metering)

**Tier limits:**
- Starter: 1–5 units, 1 property, 1 additional member
- Growth: 6–20 units, 5 properties, 3 members
- Pro: 21–50 units, unlimited properties, unlimited members

**Trial:** 30 days, full Pro access, no credit card required

**Stripe Connect scope:** Phase 2 = Settings UI only. Payment flow = Phase 5.

**Feature gates beyond limits:** Claude's discretion

**Stripe product structure:** One product, 3 prices, quantity = unit count

**Trial expiry:** Read-only access (no lock-out)

**Subscription state in DB:** Better Auth Stripe plugin tables + `subscription_tier` + `subscription_status` columns on org row

**Billing settings:** Current plan + usage, invoice history, plan change, payment methods

**Billing UI:** Fully custom — no redirect to Stripe-hosted pages

**Plan/card UI:** Custom plan selector + Stripe Elements embedded. No Checkout redirect. Direct Stripe API.

**Invoice history:** Fetch from Stripe API at render time (no DB caching)

**Unit quantity sync:** On unit create/delete, synchronous Stripe subscription quantity update from Hono route

**Custom webhook events:**
- `customer.subscription.deleted` → read-only mode
- `invoice.payment_failed` → notify + grace period
- `customer.subscription.updated` → sync tier column

---

## Setup wizard flow

**Visual style:** Full-screen multi-step page at `app/(onboarding)/onboarding/` with own layout (no main app chrome)

**Dismissible:** No — must complete all 4 steps

**Wizard steps:**
1. Property (name, address)
2. Unit (label, base rent)
3. Tenant (name, email)
4. Pricing table (Start trial CTA, no card required, Pro pre-selected)

**Submit model:** Each step submits immediately (entity created in DB). Going back edits existing entity.

**Completion flag:** `setup_completed` boolean on org row. All 4 steps required.

**Resume detection:**
- Steps 1–3: data-derived (DB check for existing entities)
- Step 4: check if Stripe subscription or trial exists

**Routing guard:** Next.js middleware: unauthenticated → /login, setup incomplete → /onboarding, else allow

**Auth pages:** Separate `/login` and `/register` (not `/signup`)

**OAuth:** Google OAuth button on both /login and /register

**Register fields:** Name, email, password only

**Email verification:** Required before wizard

**Password reset:** /forgot-password → Resend email link → /reset-password?token=...

**Email provider:** Resend (same as Phase 7 comms)

**After wizard:** Redirect to dashboard

**Progress bar:** "Step 1 of 4" with visual fill bar

---

## Plan enforcement architecture

**Limit enforcement:** Per-route guard function `checkPlanLimit(c, 'resource', count)` in Hono

**402 response shape:** `{ code: 'PLAN_LIMIT', resource: 'units', limit: 5, current: 5, upgrade_to: 'growth' }`

**Plan limits storage:** `plan_limits` DB table (editable without deploy). Operator-only — not exposed via Hono routes in Phase 2.

**Trial expired gate:** Hono middleware on all write routes → 402 `{ code: 'SUBSCRIPTION_REQUIRED' }`

**/me endpoint:** Returns `{ tier, unit_count, unit_limit, property_count, property_limit, member_count, member_limit, subscription_status, permissions }`

**Usage warning banner:** In-app at 80%+ capacity on any resource

**Upgrade modal:** Shows current vs next tier limits + pricing. CTA → /settings/billing (no inline payment).

**Settings structure:** Sidebar nav — /settings/account | /settings/team | /settings/billing | /settings/integrations | /settings/audit-log

**Integrations in Phase 2:** Stripe Connect + DocuSign OAuth connect (DocuSign full flow = Phase 4)

---

## Claude's Discretion

- Exact feature gates per tier (which features Starter vs Growth vs Pro)
- Better Auth session configuration (duration, refresh strategy)
- Grace period duration for payment failure
- RLS policy for role_permissions table
- Stripe price IDs and product naming
- DocuSign OAuth specifics in Settings > Integrations

## Deferred Ideas

- Property-level member scoping → future phase
- Per-member permission overrides → future phase
- Operator admin panel for plan_limits → Phase 8
- Stripe Customer Portal → decided against; using custom UI
- Grace period for payment failure → Phase 2 iteration
