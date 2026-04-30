# Phase 2: Auth & Billing - Research

**Researched:** 2026-04-30
**Domain:** Better Auth, Stripe Subscriptions, Stripe Connect, Next.js Middleware, Hono Auth Middleware, Resend
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Auth & Organization Model**
- D-01: Better Auth with org plugin — one org per landlord account. Better Auth org.id is the Postgres `landlord_id` used in RLS (direct mapping, no separate landlord entity).
- D-02: Auth pages: separate `/login` and `/register` pages. Google OAuth buttons on both pages. Better Auth handles new vs returning user — new user lands at setup wizard after auth.
- D-03: `/register` collects: name, email, password only. Everything else goes in the setup wizard.
- D-04: Email verification required before wizard access. Better Auth built-in email verify flow.
- D-05: Email provider for auth emails (verify, reset, invite): Resend. Same provider as Phase 7 comms.
- D-06: Password reset: `/forgot-password` → Resend email link → `/reset-password?token=...` → new password. Better Auth built-in flow, Villuh provides the UI pages.

**Role Permissions Model**
- D-07: Configurable per-role permissions — landlord can customise what manager/viewer can do. Not fixed hardcoded sets.
- D-08: Gated action categories: write operations (create/edit/delete), financial actions, communications, admin (invite members, billing, settings).
- D-09: Default permission sets: Owner → all. Manager → writes + financial + comms (no admin). Viewer → read-only.
- D-10: Storage: `role_permissions` table — `(landlord_id, role, action, allowed)`. One row per org × role × action. Permissions configurable by the owner.
- D-11: Enforcement: Hono enforces on every write route + frontend hides forbidden actions based on `/api/me` response. Belt-and-suspenders.
- D-12: Org-wide roles in Phase 2 — no property-scoping.
- D-13: Role source of truth: Better Auth org roles (membership + role name). Extended by our `role_permissions` table for per-action configuration.
- D-14: Invite flow: email invite link → invitee signs up or logs in → joins org with assigned role. Better Auth org invitation built-in.
- D-15: Role permission changes are immediate.

**Subscription Tiers & Billing**
- D-16: Active unit = any unit that exists in the system.
- D-17: Billing model: Stripe licensed quantity — report total unit count, charge = quantity × per-unit price for the tier.
- D-18: Tier limits: Starter (1–5 units, 1 property, 1 additional team member), Growth (6–20 units, 5 properties, 3 team members), Pro (21–50 units, unlimited properties, unlimited team members).
- D-19: Trial: 30 days, full Pro access, no credit card required. Trial starts on signup.
- D-20: Stripe product structure: one product, 3 prices (one per tier). Subscription quantity = unit count.
- D-21: Unit quantity sync: on unit create/delete, update Stripe subscription quantity synchronously from the Hono route.
- D-22: Custom Stripe webhook logic beyond Better Auth defaults: `customer.subscription.deleted` → set `subscription_status = 'expired'`; `invoice.payment_failed` → notify landlord in-app + start grace period; `customer.subscription.updated` → sync `subscription_tier` column.
- D-23: Subscription state in DB: Better Auth Stripe plugin tables + denormalized `subscription_tier` enum and `subscription_status` enum on the org row.
- D-24: Feature gates beyond unit/property/member limits: Claude's discretion.
- D-25: Trial expired → read-only access.

**Billing UI**
- D-26: Fully custom billing UI inside Villuh — no redirect to Stripe Customer Portal.
- D-27: Plan selection: custom plan selector UI with Stripe Elements embedded in the page. No Checkout redirect. Stripe API called directly from Hono.
- D-28: Payment method management: Stripe Elements + SetupIntent to save card. All in Villuh UI.
- D-29: Invoice history: fetched from Stripe API at render time via Hono (no caching in DB for Phase 2).
- D-30: Billing settings page shows: current plan + usage, invoice history, plan upgrade/downgrade UI, payment method management.
- D-31: Stripe Connect onboarding UI lives in Settings > Integrations. Actual payment flow used in Phase 5.

**Setup Wizard**
- D-32: Wizard is a 4-step full-screen flow at `app/(onboarding)/onboarding/` with its own layout. Mandatory.
- D-33: Wizard steps: Step 1 (Create property), Step 2 (Add unit), Step 3 (Add tenant), Step 4 (Pricing table).
- D-34: Each step submits immediately to API (entity created in DB). Going back lets landlord edit the existing entity.
- D-35: On browser close/resume: wizard resumes at first incomplete step.
- D-36: `setup_completed` boolean on the org row. Flipped to `true` only after all 4 steps complete. Next.js middleware redirects incomplete-setup authenticated users to `/onboarding`.
- D-37: Progress bar: "Step 1 of 4" with visual progress bar.
- D-38: After wizard completion → redirect to dashboard.
- D-39: Step 4 pricing table: shows all 3 tiers. "Start trial" CTA (no card required). Trial pre-selected as Pro.

**Plan Enforcement Architecture**
- D-40: Plan limits stored in `plan_limits` DB table (editable without code deploy).
- D-41: Per-route guard function: `checkPlanLimit(c, 'units', currentCount)` returns 402 when over limit.
- D-42: 402 response shape: `{ code: 'PLAN_LIMIT', resource: 'units', limit: 5, current: 5, upgrade_to: 'growth' }`.
- D-43: Trial/subscription expired gate: Hono middleware on all write routes. Returns 402 with `{ code: 'SUBSCRIPTION_REQUIRED' }`.
- D-44: `/api/me` response includes: `{ tier, unit_count, unit_limit, property_count, property_limit, member_count, member_limit, subscription_status, permissions }`.
- D-45: Usage warning banner: shown in-app when landlord is at 80%+ of any limit.
- D-46: Upgrade modal on hitting limit: shows current vs next tier limits + pricing. CTA navigates to `/settings/billing`.

**Settings Page Structure**
- D-47: Settings layout: sidebar nav with sub-routes `/settings/account`, `/settings/team`, `/settings/billing`, `/settings/integrations`, `/settings/audit-log`.
- D-48: Settings > Integrations includes DocuSign in Phase 2 (UI to connect account), even though DocuSign is used in Phase 4.

**Next.js Routing & Middleware**
- D-49: Next.js middleware handles routing guard: Unauthenticated → `/login`; Authenticated + `setup_completed = false` → `/onboarding`; Authenticated + `setup_completed = true` → allow through.
- D-50: Route structure: `app/(auth)/login/`, `app/(auth)/register/`, `app/(auth)/forgot-password/`, `app/(auth)/reset-password/`, `app/(onboarding)/onboarding/`.

### Claude's Discretion
- Exact feature gates per tier (which features are Starter-only vs Growth+ vs Pro-only)
- Specific Stripe webhook handling for grace period duration on payment failure
- Better Auth session configuration (session duration, refresh token strategy)
- RLS policy details for `role_permissions` table
- Exact Stripe price IDs and product naming conventions
- DocuSign OAuth connect flow specifics (deferred to Phase 4 for full implementation)

### Deferred Ideas (OUT OF SCOPE)
- Property-level member scoping
- Per-member permission overrides
- Operator admin panel for plan_limits table
- Stripe Customer Portal
- Grace period for payment failure (hard-block on expired in Phase 2)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | Landlord can sign up and log in with email/password or Google OAuth | Better Auth `emailAndPassword` + `socialProviders.google` configuration; `betterAuth()` server setup + `createAuthClient()` client; Hono handler mount |
| AUTH-02 | Landlord can invite team members and assign roles: owner / manager / viewer with configurable permissions | Better Auth `organization` plugin: `inviteMember`, `sendInvitationEmail`; custom `role_permissions` table; `createAccessControl` + `ac.newRole` |
| AUTH-03 | Platform enforces 3 subscription tiers (Starter / Growth / Pro) with per-tier property limits, feature gates, and per-unit pricing | Better Auth Stripe plugin `subscription.plans` with `limits`; custom `plan_limits` table; `checkPlanLimit` guard function; `subscription_tier` on org row |
| AUTH-04 | New landlords get a 30-day free trial; platform hard-blocks creation when plan limits are hit | Stripe direct API `subscriptions.create` with `trial_period_days=30`, no payment method; Better Auth picks it up via `customer.subscription.created` webhook; D-43 gate middleware |
| AUTH-05 | Landlord is billed per active unit via Stripe metered billing with per-tier unit rates | Stripe licensed quantity subscription (`quantity = unit_count`); Stripe `subscriptions.update({ quantity })` on unit create/delete (D-21) |
| AUTH-06 | Landlord can connect their Stripe account to receive tenant deposit payments (Stripe Connect) | Stripe Connect Standard OAuth flow; Settings > Integrations UI; `connected_account_id` stored on org row |
| AUTH-07 | Landlord can view invoices, change plan, and see usage from within the app billing UI | Custom billing UI with Stripe Elements; Hono route fetches `stripe.invoices.list`; `/settings/billing` page |
| AUTH-08 | New landlord is guided through property → unit → tenant setup wizard on first login | `app/(onboarding)/onboarding/` route group; `setup_completed` flag on org; Next.js middleware redirect (D-49); wizard steps submit to Hono API |
| AUTH-09 | Landlord can reset their password via email link | Better Auth built-in `emailAndPassword.sendResetPassword` with Resend; `/forgot-password` + `/reset-password?token=` UI pages |
| SETT-01 | Landlord can manage profile, billing, connected accounts (Stripe Connect, DocuSign), and notification preferences from settings | `/settings/*` route group with sidebar nav; sub-pages for account, team, billing, integrations, audit-log |
| SETT-02 | Landlord can view a personal audit log of all account activity in settings | Phase 1 `audit_log` table + Postgres triggers already in place; `/settings/audit-log` page fetches from `audit_log` filtered by `actor_id = current user id` |
</phase_requirements>

---

## Summary

Phase 2 is the most architecturally complex phase of the project. It integrates four major external systems — Better Auth, Stripe (subscriptions + Connect), Resend, and DocuSign OAuth — plus implements the routing guard middleware, configurable RBAC, plan enforcement gates, and the onboarding wizard. The phase builds directly on Phase 1's Postgres RLS foundation: Better Auth's org.id becomes the RLS `landlord_id`, the `withTenant` wrapper carries into every auth-protected Hono route, and Phase 1's audit_log triggers fire automatically on all new tables.

The single most important architectural decision to plan around is **billing UI vs Better Auth Stripe plugin scope mismatch** (D-26, D-27): the project requires a fully custom Stripe Elements UI with no Checkout redirect, but the Better Auth Stripe plugin's `subscription.upgrade` endpoint is hardwired to Stripe Checkout. The resolution is to bypass the plugin's subscription-creation flow and use the Stripe API directly from Hono, while still mounting the plugin for: (a) the webhook handler at `/api/auth/stripe/webhook`, (b) the Stripe customer creation hook (`createCustomerOnSignUp`), and (c) the subscription status tables in the DB. The trial start (D-19: no credit card) is implemented via `stripe.subscriptions.create({ trial_period_days: 30, trial_settings: { end_behavior: { missing_payment_method: 'cancel' } } })` — Better Auth's `onSubscriptionCreated` webhook callback fires when Stripe sends `customer.subscription.created`, syncing the subscription record to Better Auth's tables.

The configurable `role_permissions` table (D-07 through D-15) sits alongside Better Auth's org membership — Better Auth owns role names (owner/manager/viewer) on `member.role`, Villuh owns the per-action permission configuration in `role_permissions`. The custom `checkPlanLimit` guard and subscription expiry middleware are pure Hono middleware that run before every write route.

**Primary recommendation:** Mount Better Auth at `/api/auth/*` in Hono, use the Drizzle adapter pointed at `DATABASE_APP_URL` (the `villuh_app` non-owner role), extend the org schema with `setup_completed`, `subscription_tier`, `subscription_status`, and `stripe_connected_account_id` via `additionalFields`. Use Better Auth's Stripe plugin for customer creation + webhook handler + DB subscription table only. Implement plan selection and trial start as direct Stripe API calls from custom Hono routes.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Auth session validation | API / Backend (Hono) | Browser (Better Auth client) | Session cookies verified server-side; client gets typed session object |
| Google OAuth callback | API / Backend (Hono) | — | Better Auth handler owns the OAuth callback at `/api/auth/google/callback` |
| Next.js routing guard (setup_completed) | Frontend Server (Next.js middleware) | — | Middleware runs on every request before page render; redirects are server-side |
| Email/password auth pages (login, register) | Browser / Client | Frontend Server (SSR) | Auth forms are client interactive; pages can be SSR with server data |
| Setup wizard steps | Browser / Client | API / Backend | Each step submits to Hono and persists to DB; wizard state derived from DB |
| Organization creation (on signup) | API / Backend (Hono) | — | `auth.api.createOrganization` called server-side after user creation |
| Role permissions enforcement | API / Backend (Hono) | Browser (UI hide) | Belt-and-suspenders: Hono enforces, frontend hides forbidden actions |
| Subscription trial creation (no card) | API / Backend (Hono) | — | Direct Stripe API call from custom Hono route; no frontend Stripe Elements needed for trial |
| Payment method collection (paid plans) | Browser / Client | API / Backend | Stripe Elements collects card; backend creates SetupIntent → subscription |
| Stripe webhook processing | API / Backend (Hono) | — | Raw body required; Better Auth Stripe plugin handles at `/api/auth/stripe/webhook` |
| Invoice listing | API / Backend (Hono) | Browser | Hono fetches from Stripe API; returned to frontend via RPC |
| Stripe Connect OAuth | Browser / Client | API / Backend | OAuth redirect from browser; callback handled in Hono; account ID stored on org |
| Plan limit enforcement | API / Backend (Hono) | Browser (warn banner) | `checkPlanLimit` middleware per route; `/api/me` response for frontend hints |
| Audit log display (SETT-02) | Browser / Client | API / Backend | Read from `audit_log` table via Hono route; Phase 1 triggers handle writes |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-auth | 1.6.9 | Auth framework: email/password, Google OAuth, org plugin, Stripe plugin | Project constraint (CLAUDE.md); all-in-one, Drizzle adapter, Hono integration |
| stripe | 22.1.0 | Stripe API SDK (server-side) | Official Stripe SDK; required for direct subscription/invoice API calls |
| @stripe/stripe-js | 9.4.0 | Stripe.js browser SDK | Required for client-side Elements initialization |
| @stripe/react-stripe-js | 6.3.0 | React wrapper for Stripe Elements | Standard React integration for PaymentElement |
| resend | 6.12.2 | Transactional email (verify, reset, invite) | Project constraint (D-05); Resend selected for all auth + comms emails |
| @react-email/components | 1.0.12 | React-based email templates | Standard companion to Resend; JSX email authoring |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @better-auth/stripe | Bundled in better-auth | Better Auth Stripe plugin (webhook, DB tables, customer creation) | Mount alongside the stripe SDK for webhook handling |
| drizzle-orm | 0.45.2 (already installed) | ORM for Better Auth Drizzle adapter + custom tables | Already installed in @villuh/db; `drizzleAdapter` from `better-auth/adapters/drizzle` |
| zod | 4.3.6 (already installed) | Runtime validation for Hono request bodies | Already installed; use for all new Hono route bodies |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Better Auth Stripe plugin subscription.upgrade | Stripe Checkout directly | Plugin's checkout endpoint hardwired to redirect; D-26 requires custom UI so we bypass it |
| Custom billing UI (Stripe Elements) | Stripe Customer Portal | D-26 decision locks out the portal; Elements gives full UI control |
| Resend | SendGrid, Postmark | Resend chosen for consistency with Phase 7 comms; same API key |

**Installation:**
```bash
# In packages/server/
pnpm add better-auth stripe resend @react-email/components

# In packages/web/
pnpm add better-auth @stripe/stripe-js @stripe/react-stripe-js
```

**Version verification:** Verified against npm registry on 2026-04-30:
- `better-auth`: 1.6.9 (published 2026-04-24)
- `stripe`: 22.1.0
- `@stripe/stripe-js`: 9.4.0
- `@stripe/react-stripe-js`: 6.3.0
- `resend`: 6.12.2
- `@react-email/components`: 1.0.12

---

## Architecture Patterns

### System Architecture Diagram

```
Browser
  │
  ├─ (unauthenticated) → Next.js middleware → redirect /login
  ├─ (authenticated, no setup) → Next.js middleware → redirect /onboarding
  └─ (authenticated, setup done) → Next.js page routes
         │
         ├─ Auth pages: /login, /register, /forgot-password, /reset-password
         │     └─ Better Auth client (authClient.signIn / signUp / sendVerificationEmail)
         │           └─────────────────────→ Hono: POST/GET /api/auth/*
         │                                          └─ auth.handler(c.req.raw)
         │                                                └─ Better Auth: session, org, email verify
         │
         ├─ Onboarding wizard: /onboarding
         │     └─ Step 1-3: RPC client → Hono routes (create property/unit/tenant)
         │           └─ withTenant(org.id, user.id, ...) → Postgres (RLS enforced)
         │     └─ Step 4: "Start trial" button
         │           └─ RPC → Hono POST /api/billing/trial-start
         │                     └─ stripe.subscriptions.create({ trial_period_days: 30 })
         │                     └─ Better Auth webhook fires → syncs subscription table
         │                     └─ org.setup_completed = true
         │
         ├─ Main app: /dashboard, /properties, /tenants ...
         │     └─ RPC client → Hono routes (all protected)
         │           └─ authMiddleware: auth.api.getSession → c.set('user', session.user)
         │           └─ withTenant(user.landlordId, user.id, fn)
         │           └─ subscriptionGate: check org.subscription_status ≠ 'expired'
         │           └─ checkPlanLimit(c, resource, count) → 402 if over limit
         │
         └─ Settings: /settings/billing
               └─ Plan change (non-trial):
                     └─ Stripe Elements (PaymentElement) in browser
                     └─ createSetupIntent → Hono POST /api/billing/setup-intent
                     └─ stripe.confirmSetup() in browser
                     └─ Hono POST /api/billing/subscribe (attach PM, create subscription)
                           └─ stripe.subscriptions.create({ payment_method, quantity })
                           └─ Better Auth webhook: customer.subscription.created → syncs DB

Stripe Dashboard → webhooks → Hono POST /api/auth/stripe/webhook (Better Auth handler)
                                    └─ Better Auth auto-handles: subscription.created/updated/deleted
                                    └─ onEvent: invoice.payment_failed → set org.subscription_status = 'payment_failed'
                                    └─ onEvent: customer.subscription.deleted → set org.subscription_status = 'expired'
                                    └─ onEvent: customer.subscription.updated → sync org.subscription_tier

Stripe Connect OAuth:
Browser → click "Connect Stripe" → redirect to stripe.com/oauth/authorize
Stripe → redirect to Hono GET /api/billing/stripe-connect/callback?code=...
Hono → stripe.oauth.token(code) → store connected_account_id on org
```

### Recommended Project Structure

```
packages/server/src/
├── auth.ts                      # betterAuth() config — org plugin, Stripe plugin, Drizzle adapter
├── middleware/
│   ├── auth.ts                  # authMiddleware: getSession → set user/session (replaces Phase 1 stub)
│   ├── subscription-gate.ts     # subscriptionExpiredGate: 402 on expired/trial-expired
│   └── plan-limit.ts            # checkPlanLimit(c, resource, count) → 402 PLAN_LIMIT
├── routes/
│   ├── health.ts                # existing
│   ├── billing/
│   │   ├── trial-start.ts       # POST: stripe.subscriptions.create (no card, 30-day trial)
│   │   ├── setup-intent.ts      # POST: stripe.setupIntents.create → clientSecret
│   │   ├── subscribe.ts         # POST: stripe.subscriptions.create (with PM)
│   │   ├── upgrade.ts           # POST: stripe.subscriptions.update (plan change)
│   │   ├── invoices.ts          # GET: stripe.invoices.list
│   │   ├── stripe-connect.ts    # GET callback; POST disconnect
│   │   └── docusign-connect.ts  # GET initiate OAuth; GET callback; POST disconnect
│   └── me.ts                    # GET /api/me → { tier, counts, limits, subscription_status, permissions }

packages/db/src/schema/
├── index.ts                     # barrel (update to export new tables)
├── landlords.ts                 # existing test_tenant_data + villuhApp role
├── auth.ts                      # Better Auth generated schema (user, session, account, verification, org, member, invitation, subscription)
├── role-permissions.ts          # role_permissions table with RLS
└── plan-limits.ts               # plan_limits table (no RLS — system table)

packages/web/
├── lib/
│   ├── api.ts                   # existing hc<AppType> client
│   └── auth-client.ts           # createAuthClient({ plugins: [organizationClient(), stripeClient()] })
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   ├── (onboarding)/
│   │   ├── layout.tsx           # Full-screen, no sidebar/nav
│   │   └── onboarding/
│   │       └── page.tsx         # Wizard controller (step 1-4)
│   ├── (app)/
│   │   └── settings/
│   │       ├── layout.tsx       # Settings sidebar nav
│   │       ├── account/page.tsx
│   │       ├── team/page.tsx
│   │       ├── billing/page.tsx
│   │       ├── integrations/page.tsx
│   │       └── audit-log/page.tsx
│   └── middleware.ts            # Next.js routing guard
├── modules/
│   ├── auth/
│   │   ├── components/          # LoginForm, RegisterForm, ForgotPasswordForm, ResetPasswordForm
│   │   └── hooks/               # useSession (wraps authClient.useSession)
│   ├── billing/
│   │   ├── components/          # PlanSelector, PaymentMethodForm, InvoiceList, UsageSummary, UpgradeModal
│   │   └── hooks/               # useBillingStatus, useSubscription
│   ├── onboarding/
│   │   └── components/          # WizardShell, Step1Property, Step2Unit, Step3Tenant, Step4Pricing
│   └── settings/
│       └── components/          # TeamMemberList, RolePermissionsEditor, IntegrationsPanel, AuditLogTable
```

### Pattern 1: Better Auth Server Configuration (Hono)

**What:** Initialize Better Auth with Drizzle adapter, org plugin, Stripe plugin, email/password, and Google OAuth.

**When to use:** Once per server process in `packages/server/src/auth.ts`.

```typescript
// Source: https://better-auth.com/docs/integrations/hono
// Source: https://better-auth.com/docs/plugins/organization
// Source: https://better-auth.com/docs/plugins/stripe
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { organization } from "better-auth/plugins"
import { stripe } from "@better-auth/stripe"
import { db } from "@villuh/db"
import Stripe from "stripe"

export const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
})

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL!,
  database: drizzleAdapter(db, { provider: "pg" }),
  trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      void sendResetPasswordEmail(user.email, url)
    },
  },
  emailVerification: {
    sendOnSignIn: true,
    sendVerificationEmail: async ({ user, url }) => {
      void sendVerificationEmail(user.email, url)
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  plugins: [
    organization({
      schema: {
        organization: {
          additionalFields: {
            setup_completed: { type: "boolean", defaultValue: false, input: false },
            subscription_tier: { type: "string", defaultValue: "trial", input: false },
            subscription_status: { type: "string", defaultValue: "trialing", input: false },
            stripe_connected_account_id: { type: "string", required: false, input: false },
          },
        },
      },
      sendInvitationEmail: async (data) => {
        const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invitation/${data.id}`
        void sendInvitationEmail(data.email, inviteLink, data.inviter.user.name, data.organization.name, data.role)
      },
      ac, // createAccessControl statement
      roles: { owner, manager, viewer },
    }),
    stripe({
      stripeClient,
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
      createCustomerOnSignUp: false, // We create customer on org creation, not user creation
      organization: { enabled: true },
      subscription: {
        enabled: true,
        plans: [
          { name: "starter", priceId: process.env.STRIPE_STARTER_PRICE_ID!, limits: { units: 5, properties: 1, members: 2 } },
          { name: "growth",  priceId: process.env.STRIPE_GROWTH_PRICE_ID!,  limits: { units: 20, properties: 5, members: 4 } },
          { name: "pro",     priceId: process.env.STRIPE_PRO_PRICE_ID!,     limits: { units: 50, properties: -1, members: -1 },
            freeTrial: { days: 30 } },
        ],
        onSubscriptionCreated: async ({ subscription, plan }) => {
          // Fires for subscriptions created outside checkout (including our direct API call for trial)
          // Sync subscription_tier on org row
          await syncOrgSubscriptionTier(subscription.referenceId, plan?.name ?? "trial", subscription.status)
        },
        onSubscriptionUpdate: async ({ subscription }) => {
          await syncOrgSubscriptionTier(subscription.referenceId, subscription.plan, subscription.status)
        },
        onSubscriptionDeleted: async ({ subscription }) => {
          await setOrgSubscriptionStatus(subscription.referenceId, "expired")
        },
      },
      onEvent: async (event) => {
        switch (event.type) {
          case "invoice.payment_failed":
            await handlePaymentFailed(event)
            break
        }
      },
    }),
  ],
})
```

### Pattern 2: Hono Auth Middleware (replaces Phase 1 stub)

**What:** Resolve Better Auth session on every Hono request; populate `c.set('user', ...)` and `c.set('session', ...)`.

**When to use:** Applied as global Hono middleware before protected routes.

```typescript
// Source: https://better-auth.com/docs/integrations/hono
import { createMiddleware } from "hono/factory"
import { auth } from "../auth.js"

type Session = typeof auth.$Infer.Session

type Variables = {
  user: Session["user"] | null
  session: Session["session"] | null
}

export const authMiddleware = createMiddleware<{ Variables: Variables }>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  c.set("user", session?.user ?? null)
  c.set("session", session?.session ?? null)
  await next()
})
```

**Important:** The Hono Variables type must be updated from the Phase 1 stub (`user: { id: string; landlordId: string } | null`) to `typeof auth.$Infer.Session.user | null` — Better Auth infers the full type including org fields.

### Pattern 3: withTenant Integration with Better Auth

**What:** Extract `landlordId` from Better Auth session (via org membership) and pass to existing `withTenant` wrapper.

**When to use:** All authenticated Hono routes that need DB access.

```typescript
// The user's active org ID = landlordId for RLS
// Better Auth session includes: user.id, session.activeOrganizationId
export async function requireTenant(c: Context): Promise<string> {
  const user = c.get("user")
  const session = c.get("session")
  if (!user || !session?.activeOrganizationId) {
    throw new HTTPException(401, { message: "Unauthorized" })
  }
  return session.activeOrganizationId // This IS the landlord_id for RLS
}

// Usage in routes:
app.post("/api/properties", authMiddleware, async (c) => {
  const landlordId = await requireTenant(c)
  return withTenant(landlordId, c.get("user")!.id, async (tx) => {
    // RLS enforced, audit_log triggers fire automatically
  })
})
```

**Note:** Better Auth's `session.activeOrganizationId` is the org ID (= `landlord_id`). The org must be set as active at login time. This requires calling `authClient.organization.setActive({ organizationId: org.id })` after login when the user has an org.

### Pattern 4: Trial Subscription Start (No Credit Card)

**What:** Create a 30-day Stripe subscription trial without collecting payment method. The Better Auth Stripe plugin's `subscription.upgrade` endpoint is NOT used here — it requires Checkout redirect. Instead, call the Stripe API directly from a custom Hono route.

**When to use:** Wizard Step 4 "Start Trial" button → POST /api/billing/trial-start.

```typescript
// Source: https://docs.stripe.com/billing/subscriptions/trials/free-trials
// Source: Better Auth docs — "customer.subscription.created for new subscriptions outside checkout"

// Server: POST /api/billing/trial-start
import { stripeClient } from "../auth.js"

app.post("/api/billing/trial-start", authMiddleware, async (c) => {
  const user = c.get("user")!
  const session = c.get("session")!
  const landlordId = session.activeOrganizationId!

  // Get or create Stripe customer for the org
  const stripeCustomerId = await getOrCreateStripeCustomer(landlordId, user.email)

  // Create trial subscription directly via Stripe API (no Checkout)
  const subscription = await stripeClient.subscriptions.create({
    customer: stripeCustomerId,
    items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 0 }], // quantity = unit count (starts at 0)
    trial_period_days: 30,
    trial_settings: {
      end_behavior: { missing_payment_method: "cancel" },
    },
    payment_settings: {
      save_default_payment_method: "on_subscription",
    },
    metadata: { landlord_id: landlordId },
  })
  // Better Auth's stripe plugin fires onSubscriptionCreated webhook → syncs DB automatically

  // Mark wizard complete
  await markSetupCompleted(landlordId)

  return c.json({ ok: true, trialEnd: subscription.trial_end })
})
```

### Pattern 5: SetupIntent for Paid Plan (Stripe Elements)

**What:** Collect payment method via Stripe Elements without Checkout redirect. Two-step: (1) create SetupIntent server-side, (2) confirm client-side via `stripe.confirmSetup()`, (3) create subscription server-side with saved PM.

**When to use:** `/settings/billing` plan upgrade (from trial to paid, or plan change).

```typescript
// Source: https://docs.stripe.com/payments/save-and-reuse

// Step 1 - Server: POST /api/billing/setup-intent
const setupIntent = await stripeClient.setupIntents.create({
  customer: stripeCustomerId,
  automatic_payment_methods: { enabled: true },
})
return c.json({ clientSecret: setupIntent.client_secret })

// Step 2 - Client: confirm with PaymentElement
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js"
const { error: confirmError, setupIntent } = await stripe.confirmSetup({
  elements,
  redirect: "if_required", // Important: avoid redirect
  confirmParams: { return_url: `${window.location.origin}/settings/billing` },
})
// On success, setupIntent.payment_method = the saved PM id

// Step 3 - Server: POST /api/billing/subscribe
const subscription = await stripeClient.subscriptions.create({
  customer: stripeCustomerId,
  items: [{ price: process.env[`STRIPE_${tier.toUpperCase()}_PRICE_ID`]!, quantity: unitCount }],
  default_payment_method: paymentMethodId,
  metadata: { landlord_id: landlordId },
})
// Better Auth webhook customer.subscription.created fires → syncs DB
```

### Pattern 6: Next.js Middleware Routing Guard

**What:** Redirect unauthenticated users to `/login`; redirect authenticated users without `setup_completed` to `/onboarding`.

**When to use:** `packages/web/middleware.ts` — runs on all matched routes.

```typescript
// Source: https://better-auth.com/docs/integrations/next
// Uses Node.js runtime (Next.js 15.2+) for full session validation

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-server" // imports the auth instance

export const config = {
  runtime: "nodejs",
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const publicPaths = ["/login", "/register", "/forgot-password", "/reset-password", "/accept-invitation"]
  if (publicPaths.some(p => pathname.startsWith(p))) return NextResponse.next()

  const session = await auth.api.getSession({ headers: request.headers })

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (!session.session.activeOrganizationId) {
    // New user — org not yet created (race condition on signup: handle separately)
    return NextResponse.next()
  }

  const org = session.user // Better Auth injects org fields on user via additionalFields
  // NOTE: setup_completed and subscription_tier are additionalFields on org, not on user
  // Use a lightweight DB check or encode setup_completed in session
  // DECISION: Check via dedicated endpoint or encode in JWT-like claim
  // ASSUMED: We'll fetch org metadata from DB in middleware — acceptable for first-load perf

  if (!pathname.startsWith("/onboarding") && !(org as any).setupCompleted) {
    return NextResponse.redirect(new URL("/onboarding", request.url))
  }

  return NextResponse.next()
}
```

**Important pitfall:** The `setup_completed` field is on the Better Auth `organization` record (via `additionalFields`), not directly on the session user object. The middleware must either:
- Option A: Fetch org record via `auth.api.getOrganization` in middleware (adds one DB call per request)
- Option B: Denormalize `setup_completed` into the session via a custom plugin hook
- **Recommendation:** Option A for Phase 2 (acceptable latency for first-load; optimize later if needed)

### Pattern 7: Configurable Role Permissions (D-07 to D-15)

**What:** Custom `role_permissions` table alongside Better Auth org roles. Better Auth manages which role a member holds; Villuh manages which actions that role is allowed to perform.

**When to use:** On every Hono write route (permission check); `/settings/team` UI for configuring permissions.

```typescript
// role_permissions table schema (Drizzle)
export const rolePermissions = pgTable("role_permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  landlordId: uuid("landlord_id").notNull(),
  role: text("role").notNull(), // "owner" | "manager" | "viewer"
  action: text("action").notNull(), // "write" | "financial" | "communications" | "admin"
  allowed: boolean("allowed").notNull().default(false),
}, (t) => [
  pgPolicy("tenant_isolation", {
    as: "permissive", for: "all", to: villuhApp,
    using: sql`landlord_id = current_setting('app.current_landlord_id', true)::uuid`,
    withCheck: sql`landlord_id = current_setting('app.current_landlord_id', true)::uuid`,
  }),
]).enableRLS()

// Guard function in Hono route
async function requirePermission(c: Context, action: "write" | "financial" | "communications" | "admin") {
  const user = c.get("user")!
  const session = c.get("session")!
  const orgId = session.activeOrganizationId!

  // Get member's role from Better Auth
  const member = await auth.api.getActiveMember({ headers: c.req.raw.headers })
  if (member?.role === "owner") return // Owners always have all permissions

  // Check role_permissions table
  const perm = await db.query.rolePermissions.findFirst({
    where: and(eq(rolePermissions.landlordId, orgId), eq(rolePermissions.role, member.role), eq(rolePermissions.action, action))
  })
  if (!perm?.allowed) throw new HTTPException(403, { message: "Forbidden" })
}
```

### Pattern 8: Plan Limit Guard

**What:** Per-route check against `plan_limits` table (D-40, D-41).

```typescript
// plan_limits table: (tier, resource, limit)
export async function checkPlanLimit(c: Context, resource: "units" | "properties" | "members", currentCount: number) {
  const orgId = c.get("session")!.activeOrganizationId!

  // Read from denormalized org column (fast, no join)
  const org = await db.query.organization.findFirst({ where: eq(organization.id, orgId) })
  const tier = org?.subscriptionTier ?? "starter"

  if (tier === "pro" && resource !== "properties") return // Pro: unlimited units/members

  const limit = await db.query.planLimits.findFirst({
    where: and(eq(planLimits.tier, tier), eq(planLimits.resource, resource))
  })

  if (limit && currentCount >= limit.limit) {
    throw new HTTPException(402, {
      message: JSON.stringify({
        code: "PLAN_LIMIT",
        resource,
        limit: limit.limit,
        current: currentCount,
        upgrade_to: tier === "starter" ? "growth" : "pro",
      }),
    })
  }
}
```

### Anti-Patterns to Avoid

- **Using Better Auth's `subscription.upgrade` for the trial start:** It initiates a Stripe Checkout session and redirects. Use direct `stripeClient.subscriptions.create()` instead.
- **Using Better Auth's `subscription.upgrade` for paid plan changes:** Same issue. Use SetupIntent + `stripe.confirmSetup` + custom Hono route.
- **Pointing `drizzleAdapter` at `DATABASE_URL` (owner role):** Must point at `DATABASE_APP_URL` (`villuh_app` non-owner role) so RLS is enforced on auth queries too.
- **Applying global JSON body parser in Hono:** The Stripe webhook handler at `/api/auth/stripe/webhook` calls `c.req.text()` for raw body; a global JSON parser will consume the body first and break signature verification.
- **Running `npx auth migrate` directly:** This uses Better Auth's internal migration runner which bypasses the Drizzle migration chain. Instead, use `npx auth generate` to get the SQL, then inject into a Drizzle migration file.
- **Storing `setup_completed` only in the session:** The session is issued once; if the user completes setup in another tab, the session in the first tab will still show incomplete. Read from DB (via `auth.api.getOrganization`) in middleware.
- **Setting `app.current_landlord_id` from `user.id`:** The landlord_id is `session.activeOrganizationId`, not `user.id`. These are different UUIDs.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session cookie parsing + JWT verification | Custom session middleware | `auth.api.getSession({ headers })` | Better Auth handles rotation, CSRF, secure cookies |
| Email verification token generation | Custom token + Postgres table | `betterAuth.emailVerification` built-in | Token expiry, replay prevention, re-send logic |
| Password reset tokens | Custom token table | `betterAuth.emailAndPassword.sendResetPassword` | Secure single-use tokens, expiry |
| Google OAuth state + PKCE | Custom OAuth redirect | `betterAuth.socialProviders.google` | PKCE, state validation, account linking built-in |
| Org invitation token | Custom invite system | `auth.api.createInvitation` + `sendInvitationEmail` | Invitation expiry, re-send, role assignment |
| Stripe webhook signature | Manual HMAC | Better Auth Stripe plugin handler (raw body) | `stripe.webhooks.constructEvent` done correctly |
| Stripe customer creation on signup | Custom Stripe API call | `createCustomerOnSignUp` option + plugin | Idempotency, org linking, customer sync |
| Subscription status sync from webhooks | Custom webhook parser | Better Auth Stripe `onSubscriptionCreated/Updated/Deleted` | Event deduplication, subscription table sync |

**Key insight:** Better Auth handles the cryptographic and lifecycle complexity of auth flows. Stripe handles PCI compliance and payment lifecycle. Hand-rolling either creates security vulnerabilities and maintenance burden.

---

## Common Pitfalls

### Pitfall 1: Drizzle Adapter Must Use `DATABASE_APP_URL` (Not `DATABASE_URL`)

**What goes wrong:** Better Auth's `drizzleAdapter` gets pointed at the owner role (`DATABASE_URL`). All auth queries bypass RLS. Cross-tenant session data becomes readable.

**Why it happens:** It's the simpler env var to configure; easy to accidentally paste.

**How to avoid:** In `packages/server/src/auth.ts`, import `db` from `@villuh/db` (which already uses `DATABASE_APP_URL`). Never import `migrationDb` from `@villuh/db`.

**Warning signs:** RLS integration tests pass but auth queries return data from all tenants.

### Pitfall 2: Better Auth Schema Generation Bypasses Drizzle Migration Chain

**What goes wrong:** Running `npx auth generate` or `npx auth migrate` creates/alters tables outside the Drizzle migration files. The migration history in `packages/db/migrations/meta/` becomes inconsistent.

**Why it happens:** Better Auth's CLI generates its own migration SQL.

**How to avoid:** Run `npx auth generate` to get the SQL output, copy it into a new Drizzle custom migration file (`0002_better_auth.sql`), and apply with `pnpm --filter @villuh/db migrate`. Never run `npx auth migrate` in this project.

**Warning signs:** `drizzle-kit` reports unexpected schema drift after `npx auth generate`.

### Pitfall 3: `session.activeOrganizationId` Is Null Until Set

**What goes wrong:** A newly registered user completes email verification but `session.activeOrganizationId` is null because the org hasn't been created yet (or hasn't been set as active).

**Why it happens:** Better Auth creates the user first; org creation is a separate step. After `authClient.organization.create()`, the active org must be set with `authClient.organization.setActive()`.

**How to avoid:** After user registration + email verification, the sign-in flow should: (1) check if user has an org, (2) if not, create one with org.name = user.name, (3) call `setActive({ organizationId: org.id })`. This can be done via a Better Auth `afterUserCreated` hook or an explicit Hono endpoint called on first authenticated page load.

**Warning signs:** `withTenant(null, ...)` calls throw errors; middleware redirects to `/login` instead of `/onboarding`.

### Pitfall 4: Stripe Webhook Raw Body Requirement

**What goes wrong:** Stripe webhook signature verification fails with `No signatures found matching the expected signature for payload`.

**Why it happens:** A JSON body parser middleware runs before the webhook route and parses the body, making `c.req.text()` return an empty string or already-parsed object.

**How to avoid:** Never add global JSON body parsing middleware to the Hono app. The Better Auth Stripe plugin handler calls `c.req.text()` internally. All other routes use Zod validators (`@hono/zod-validator`) which parse per-route, not globally.

**Warning signs:** Stripe CLI shows 400 errors on webhook delivery.

### Pitfall 5: Better Auth Stripe Plugin Uses Checkout for All Subscription Creation

**What goes wrong:** Calling `authClient.subscription.upgrade()` from the onboarding wizard opens a Stripe Checkout page (or a redirect) — violating D-26 (no Checkout redirect).

**Why it happens:** The Better Auth Stripe plugin's `subscription.upgrade` endpoint always creates a Stripe Checkout Session.

**How to avoid:** Use direct `stripeClient.subscriptions.create()` from a custom Hono route for the trial start. Better Auth's `customer.subscription.created` webhook fires when Stripe creates the subscription, syncing it to Better Auth's `subscription` table. The `onSubscriptionCreated` callback fires for externally-created subscriptions.

**Warning signs:** Wizard Step 4 "Start Trial" redirects user away from the wizard page.

### Pitfall 6: `npx auth generate` vs Drizzle Schema — Field Naming Mismatch

**What goes wrong:** Better Auth generates schema with camelCase field names in TypeScript but snake_case columns in SQL. Drizzle ORM field mappings must match.

**Why it happens:** Better Auth handles the ORM-to-SQL mapping internally; when using `drizzleAdapter`, the schema tables passed must match Better Auth's expected names.

**How to avoid:** Use `schema: { ...generatedSchema }` in `drizzleAdapter`. If table names differ from Better Auth defaults, use the `modelName` mapping in the org plugin `schema` option.

**Warning signs:** TypeScript errors from `drizzleAdapter` about mismatched table shapes; Better Auth queries returning empty results.

### Pitfall 7: `setup_completed` Check in Next.js Middleware Performance

**What goes wrong:** Every page request in the app triggers a DB call to check `setup_completed` on the org. This adds 20-50ms to every server render.

**Why it happens:** The middleware can't read org `additionalFields` from the session cookie alone (session contains user and session data, not full org record).

**How to avoid:** Once `setup_completed = true`, set a short-lived cookie or encode it in a custom claim. For Phase 2, the simple approach (DB call in middleware) is acceptable. Profile before optimizing.

**Warning signs:** Server render p95 latency increases noticeably after adding setup_completed check.

---

## Code Examples

### Better Auth Client Setup (Next.js)

```typescript
// Source: https://better-auth.com/docs/integrations/next
// packages/web/lib/auth-client.ts
import { createAuthClient } from "better-auth/react"
import { organizationClient } from "better-auth/client/plugins"
import { stripeClient } from "@better-auth/stripe/client"

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL, // Hono server URL
  plugins: [
    organizationClient(),
    stripeClient({ subscription: true }),
  ],
})

export type Session = typeof authClient.$Infer.Session
```

### Mounting Better Auth in Hono

```typescript
// Source: https://better-auth.com/docs/integrations/hono
// packages/server/src/app.ts (updated)
import { auth } from "./auth.js"

const routes = app
  .route("/api", health)
  .on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw))
  // ... other routes

export type AppType = typeof routes
```

### Organization Creation on First Login

```typescript
// Source: https://better-auth.com/docs/plugins/organization
// Called server-side or client-side after registration + email verification

// Client-side (after sign-in, before wizard):
const { data: org } = await authClient.organization.create({
  name: session.user.name, // org name = landlord name initially
  slug: generateSlug(session.user.name),
})
await authClient.organization.setActive({ organizationId: org.id })
// Now session.activeOrganizationId is set
```

### Subscription Gate Middleware

```typescript
// packages/server/src/middleware/subscription-gate.ts
import { createMiddleware } from "hono/factory"

export const subscriptionExpiredGate = createMiddleware(async (c, next) => {
  const user = c.get("user")
  if (!user) { await next(); return }

  const orgId = c.get("session")?.activeOrganizationId
  if (!orgId) { await next(); return }

  const org = await db.query.organization.findFirst({ where: eq(organization.id, orgId) })
  if (org?.subscriptionStatus === "expired") {
    return c.json({ code: "SUBSCRIPTION_REQUIRED", message: "Subscription expired" }, 402)
  }

  await next()
})
```

### Stripe Connect OAuth Flow

```typescript
// Source: https://docs.stripe.com/connect/oauth-standard-accounts

// Step 1: Generate OAuth URL (server or client)
const connectUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${process.env.STRIPE_CLIENT_ID}&scope=read_write&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${landlordId}`

// Step 2: Callback handler (Hono GET /api/billing/stripe-connect/callback)
app.get("/api/billing/stripe-connect/callback", authMiddleware, async (c) => {
  const { code, state } = c.req.query()
  const { access_token, stripe_user_id } = await stripeClient.oauth.token({ code, grant_type: "authorization_code" })

  // Store connected_account_id on org
  await db.update(organization)
    .set({ stripeConnectedAccountId: stripe_user_id })
    .where(eq(organization.id, state))

  return c.redirect("/settings/integrations?connected=true")
})
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| NextAuth.js session cookies | Better Auth with Drizzle adapter | 2024+ | Type-safe sessions, built-in org plugin, no custom JWT |
| Stripe Checkout for all subscription flows | Stripe Elements + SetupIntent | Stripe Elements v3 | Custom UI without leaving the app |
| `nextjs/middleware` with Edge Runtime | Node.js Runtime middleware (Next.js 15.2+) | Next.js 15.2 | Can call `auth.api.getSession` directly (no fetch to external) |
| Per-row RLS policy with session variables | `SET LOCAL` transaction-scoped config | Phase 1 established | Tenant context resets on transaction end; PgBouncer safe |
| Stripe Customer Portal for billing management | Custom billing UI with Stripe APIs | Project decision D-26 | Full UI control; no redirect away from app |

**Deprecated/outdated:**
- `nextauth` / `next-auth v4`: Replaced by Better Auth for this project
- `@stripe/stripe-js` Checkout redirect: Still available but not used — project uses Elements embedded UI
- Better Auth `subscription.upgrade` for trial start: Plugin assumes Checkout; bypassed in favor of direct Stripe API

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Better Auth `organization.additionalFields` `setup_completed` is readable in Next.js middleware via `auth.api.getOrganization()` without an extra roundtrip to Stripe | Architecture Patterns §Pattern 6 | Middleware may need a separate query pattern; low risk (DB call is straightforward) |
| A2 | `session.activeOrganizationId` is populated on the session object returned by `auth.api.getSession()` after `setActive` is called | Architecture Patterns §Pattern 3 | If not in session, `withTenant` will receive null and throw; would require reading org via separate DB query per request |
| A3 | Better Auth Stripe plugin fires `onSubscriptionCreated` for subscriptions created via direct `stripeClient.subscriptions.create()` (outside checkout) — triggered by `customer.subscription.created` webhook | Pattern 4 | If it doesn't fire, subscription table in DB won't be populated; would require manual DB write in the trial-start Hono route |
| A4 | Stripe Connect Standard OAuth remains available (not deprecated) for the use case of landlords connecting their existing Stripe accounts | Stripe Connect OAuth | Stripe has been moving toward Connect Onboarding; Standard OAuth still available but check at planning time |
| A5 | Next.js 15.2+ Node.js runtime middleware (`runtime: "nodejs"`) works in the current Next.js 16.1.7 installed in this project | Pattern 6 | If not supported, must use the older Edge Runtime approach (betterFetch to get session) — adds 1 network call per request |

---

## Open Questions

1. **Organization creation timing after signup**
   - What we know: Better Auth creates user on signup. Org must be created separately. Better Auth invites are org-scoped (org must exist first).
   - What's unclear: Should org be auto-created server-side in a `afterCreateUser` hook, or client-side after first login? If server-side, what is the initial org name?
   - Recommendation: Auto-create org server-side in `afterCreateUser` hook using user's name as org name. Set as active immediately. This ensures org.id = landlord_id is available before the wizard.

2. **`setup_completed` in Next.js middleware — performance vs correctness**
   - What we know: The field lives on the org record (Better Auth `additionalFields`). Middleware needs it for routing guard.
   - What's unclear: Best mechanism to read it without adding 50ms to every request. Could encode in a signed cookie after setup completion.
   - Recommendation: For Phase 2, do the DB call. Add a signed cookie optimization in Phase 3 if latency is measurable.

3. **Stripe Webhook endpoint — Better Auth's route vs separate `/webhooks/stripe/subscriptions`**
   - What we know: Better Auth Stripe plugin registers at `/api/auth/stripe/webhook`. CLAUDE.md specifies `/webhooks/stripe/subscriptions`.
   - What's unclear: Whether to use Better Auth's default path or configure it to match CLAUDE.md's spec.
   - Recommendation: Configure Better Auth's webhook to be at `/webhooks/stripe/subscriptions` using the `schema` or path override option, OR update CLAUDE.md's convention to use Better Auth's default path. The Stripe Connect webhook stays separate at `/webhooks/stripe/connect`. Research the Better Auth Stripe plugin path configuration option before committing to either.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 22+ | Better Auth, Twilio requirement | ✓ | 24.12.0 | — |
| PostgreSQL | Database | ✓ | 16.11 | — |
| pnpm | Package manager | ✓ | 10.27.0 | — |
| Stripe CLI | Local webhook testing | ✗ | — | Use Stripe Dashboard + ngrok; or deploy to test URL |
| Google OAuth credentials | AUTH-01 | ✗ (env var) | — | Env vars must be configured before Phase 2 executes |
| Stripe keys (secret + webhook secrets) | AUTH-03, AUTH-04, AUTH-05 | ✗ (env var) | — | Stripe account + keys must be set up before Phase 2 |
| Resend API key | AUTH-09, email verify | ✗ (env var) | — | Resend account + key required |
| BETTER_AUTH_SECRET | Better Auth session signing | ✗ (env var) | — | Required; generate with `openssl rand -hex 32` |
| BETTER_AUTH_URL | Better Auth base URL | ✗ (env var) | — | Must be set to Hono server URL |

**Missing dependencies with no fallback:**
- Google OAuth client credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) — must be created in Google Cloud Console before Phase 2 execution
- Stripe account with products/prices created (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_STARTER_PRICE_ID, STRIPE_GROWTH_PRICE_ID, STRIPE_PRO_PRICE_ID) — must exist before Phase 2 execution
- Stripe Connect client ID (STRIPE_CLIENT_ID) — requires Stripe Connect application configuration

**Missing dependencies with fallback:**
- Stripe CLI — use Stripe Dashboard webhook tester + public URL (ngrok or Railway preview) for webhook testing; note this makes webhook testing slower but not blocking

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.5 (installed in @villuh/db; needs install in @villuh/server) |
| Config file | `packages/db/vitest.config.ts` (exists); `packages/server/vitest.config.ts` (Wave 0 gap) |
| Quick run command | `pnpm --filter @villuh/db test` |
| Full suite command | `pnpm --filter @villuh/db test && pnpm --filter @villuh/server test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Email/password signup creates user + org + session | Integration | `pnpm --filter @villuh/server test -- auth.test.ts` | ❌ Wave 0 |
| AUTH-01 | Google OAuth creates session (smoke) | Manual | Manual browser test | N/A |
| AUTH-02 | Invite member → member joins org with correct role | Integration | `pnpm --filter @villuh/server test -- org.test.ts` | ❌ Wave 0 |
| AUTH-02 | Owner can update role permissions; non-owner is denied admin action | Integration | `pnpm --filter @villuh/server test -- permissions.test.ts` | ❌ Wave 0 |
| AUTH-03 | Plan limit gate returns 402 PLAN_LIMIT when over unit limit | Unit | `pnpm --filter @villuh/server test -- plan-limit.test.ts` | ❌ Wave 0 |
| AUTH-04 | Trial start creates Stripe subscription (mocked); org.subscription_status = trialing | Integration | `pnpm --filter @villuh/server test -- billing.test.ts` | ❌ Wave 0 |
| AUTH-05 | Unit quantity sync updates Stripe subscription quantity (mocked) | Unit | `pnpm --filter @villuh/server test -- billing.test.ts` | ❌ Wave 0 |
| AUTH-06 | Stripe Connect callback stores connected_account_id on org | Integration | `pnpm --filter @villuh/server test -- billing.test.ts` | ❌ Wave 0 |
| AUTH-07 | Invoice list fetches from Stripe API (mocked) | Unit | `pnpm --filter @villuh/server test -- billing.test.ts` | ❌ Wave 0 |
| AUTH-08 | Wizard step 1 creates property; step 4 sets setup_completed = true | Integration | `pnpm --filter @villuh/server test -- wizard.test.ts` | ❌ Wave 0 |
| AUTH-09 | Password reset email sends via Resend | Unit (mock Resend) | `pnpm --filter @villuh/server test -- auth.test.ts` | ❌ Wave 0 |
| SETT-01 | Settings routes return 403 for viewer attempting admin action | Integration | `pnpm --filter @villuh/server test -- permissions.test.ts` | ❌ Wave 0 |
| SETT-02 | Audit log entries are readable by the actor | Integration | `pnpm --filter @villuh/db test` (extends existing rls.test.ts) | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm --filter @villuh/db test` (existing suite, fast)
- **Per wave merge:** `pnpm --filter @villuh/db test && pnpm --filter @villuh/server test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `packages/server/vitest.config.ts` — server test infrastructure
- [ ] `packages/server/src/__tests__/setup.ts` — test DB setup (auth test client)
- [ ] `packages/server/src/__tests__/auth.test.ts` — covers AUTH-01, AUTH-09
- [ ] `packages/server/src/__tests__/org.test.ts` — covers AUTH-02
- [ ] `packages/server/src/__tests__/permissions.test.ts` — covers AUTH-02, SETT-01
- [ ] `packages/server/src/__tests__/plan-limit.test.ts` — covers AUTH-03
- [ ] `packages/server/src/__tests__/billing.test.ts` — covers AUTH-04, AUTH-05, AUTH-06, AUTH-07
- [ ] `packages/server/src/__tests__/wizard.test.ts` — covers AUTH-08
- [ ] Framework install: `pnpm add -D vitest --filter @villuh/server`

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Better Auth email/password + Google OAuth; `requireEmailVerification: true` |
| V3 Session Management | yes | Better Auth session cookies (httpOnly, secure, sameSite); `auth.api.getSession` |
| V4 Access Control | yes | Role permissions table + Hono `requirePermission` guard; subscription gate middleware |
| V5 Input Validation | yes | Zod validators via `@hono/zod-validator` on all Hono route bodies |
| V6 Cryptography | yes | Stripe webhook HMAC via `stripe.webhooks.constructEvent` (raw body); Better Auth BETTER_AUTH_SECRET for session signing |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-tenant data access | Information Disclosure | RLS: `SET LOCAL app.current_landlord_id` via `withTenant`; `drizzleAdapter` uses `villuh_app` role |
| Session fixation / hijacking | Spoofing | Better Auth manages session rotation; httpOnly + secure cookies |
| Stripe webhook replay / forgery | Tampering | `stripe.webhooks.constructEvent` validates HMAC; raw body required |
| Invitation link forgery | Spoofing | Better Auth generates invitation tokens with expiry; `requireEmailVerificationOnInvitation: true` |
| Plan limit bypass | Elevation of Privilege | Server-side `checkPlanLimit` on every write route; client UI hints are secondary |
| Org role escalation | Elevation of Privilege | Only owner can change roles/permissions; Hono `requirePermission('admin')` gate |
| Stripe Connect OAuth CSRF | Spoofing | Use `state` parameter = landlordId; verify state on callback |
| Trial abuse (multiple trials per org) | Elevation of Privilege | Better Auth Stripe plugin `preventDuplicateTrials: true`; Stripe trial tied to customer ID |

---

## Sources

### Primary (HIGH confidence)
- `/websites/better-auth` (Context7) — Organization plugin, Stripe plugin, email/password, Google OAuth, Drizzle adapter, Hono integration, Next.js middleware, email verification, password reset, invitation emails, session configuration
- `https://better-auth.com/docs/plugins/stripe` — Stripe plugin webhook handling, organization billing, subscription lifecycle hooks, trial configuration, onEvent callback
- `https://better-auth.com/docs/integrations/hono` — Hono middleware pattern, session middleware, Variables type
- `https://better-auth.com/docs/integrations/next` — Next.js middleware Node.js runtime, session check in middleware
- `https://docs.stripe.com/billing/subscriptions/trials/free-trials` — Trial subscription without credit card, `trial_settings.end_behavior.missing_payment_method`
- `https://docs.stripe.com/payments/save-and-reuse` — SetupIntent pattern for saving payment method, Elements flow

### Secondary (MEDIUM confidence)
- `https://docs.stripe.com/connect/oauth-standard-accounts` — Stripe Connect Standard OAuth flow for Settings > Integrations
- GitHub issue #4631 (better-auth/better-auth) — Confirmed Better Auth Stripe plugin does NOT support trial subscription without Checkout redirect (closed as not planned)
- WebSearch: Stripe subscription `trial_period_days` without payment method — `trial_settings.end_behavior.missing_payment_method: 'cancel'`

### Tertiary (LOW confidence)
- A3 (Assumptions Log): Better Auth fires `onSubscriptionCreated` for externally-created subscriptions — inferred from docs saying "new subscriptions outside the checkout flow"; not tested

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified on npm registry 2026-04-30; Better Auth docs confirmed via Context7
- Architecture: HIGH — direct verification from Better Auth docs + Stripe docs; one major pitfall discovered (Checkout-only for subscription.upgrade) and documented with mitigation
- Pitfalls: HIGH — most pitfalls verified via official docs; A3 is LOW (assumed behavior for externally-created subscriptions)
- Trial flow: MEDIUM — Stripe docs confirm `trial_period_days` without PM; the assumption that Better Auth's webhook picks it up is MEDIUM (doc says "outside checkout" but needs integration test)

**Research date:** 2026-04-30
**Valid until:** 2026-05-30 (stable ecosystem; Better Auth minor versions may add features but patterns are stable)
