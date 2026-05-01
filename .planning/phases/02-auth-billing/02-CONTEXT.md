# Phase 2: Auth & Billing - Context

**Gathered:** 2026-04-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Landlords can create accounts, invite team members, and are on a billing plan with enforced limits — the full auth and subscription lifecycle works end to end. This phase delivers: Better Auth with email/password + Google OAuth, org-based multi-tenancy, configurable role permissions, Stripe subscription billing (metered per unit), setup wizard, settings page.

</domain>

<decisions>
## Implementation Decisions

### Auth & Organization Model
- **D-01:** Better Auth with org plugin — one org per landlord account. Better Auth org.id is the Postgres `landlord_id` used in RLS (direct mapping, no separate landlord entity).
- **D-02:** Auth pages: separate `/login` and `/register` pages. Google OAuth buttons on both pages. Better Auth handles new vs returning user — new user lands at setup wizard after auth.
- **D-03:** `/register` collects: name, email, password only. Everything else goes in the setup wizard.
- **D-04:** Email verification required before wizard access. Better Auth built-in email verify flow.
- **D-05:** Email provider for auth emails (verify, reset, invite): Resend. Same provider as Phase 7 comms.
- **D-06:** Password reset: `/forgot-password` → Resend email link → `/reset-password?token=...` → new password. Better Auth built-in flow, Villuh provides the UI pages.

### Role Permissions Model
- **D-07:** Configurable per-role permissions — landlord can customise what manager/viewer can do. Not fixed hardcoded sets.
- **D-08:** Gated action categories: write operations (create/edit/delete), financial actions, communications, admin (invite members, billing, settings).
- **D-09:** Default permission sets: Owner → all. Manager → writes + financial + comms (no admin). Viewer → read-only.
- **D-10:** Storage: `role_permissions` table — `(landlord_id, role, action, allowed)`. One row per org × role × action. Permissions configurable by the owner.
- **D-11:** Enforcement: Hono enforces on every write route + frontend hides forbidden actions based on `/api/me` response. Belt-and-suspenders.
- **D-12:** Org-wide roles in Phase 2 — no property-scoping. All team members have org-wide access at their role level.
- **D-13:** Role source of truth: Better Auth org roles (membership + role name). Extended by our `role_permissions` table for per-action configuration.
- **D-14:** Invite flow: email invite link → invitee signs up or logs in → joins org with assigned role. Better Auth org invitation built-in.
- **D-15:** Role permission changes are immediate — apply to all members with that role instantly. No per-member copies.

### Subscription Tiers & Billing
- **D-16:** Active unit = any unit that exists in the system (not tied to occupancy or lease status).
- **D-17:** Billing model: Stripe licensed quantity — report total unit count, charge = quantity × per-unit price for the tier. Not event-based metering.
- **D-18:** Tier limits:
  - Starter: 1–5 units, 1 property, 1 additional team member
  - Growth: 6–20 units, 5 properties, 3 team members
  - Pro: 21–50 units, unlimited properties, unlimited team members
- **D-19:** Trial: 30 days, full Pro access, no credit card required. Trial starts on signup.
- **D-20:** Stripe product structure: one product, 3 prices (one per tier). Subscription quantity = unit count.
- **D-21:** Unit quantity sync: on unit create/delete, update Stripe subscription quantity synchronously from the Hono route.
- **D-22:** Custom Stripe webhook logic (beyond Better Auth Stripe plugin defaults):
  - `customer.subscription.deleted` → set landlord `subscription_status = 'expired'` (read-only mode)
  - `invoice.payment_failed` → notify landlord in-app + start grace period
  - `customer.subscription.updated` → sync `subscription_tier` column on org row
- **D-23:** Subscription state in DB: Better Auth Stripe plugin tables (Stripe customer/subscription IDs) + denormalized `subscription_tier` enum and `subscription_status` enum on the org row for fast plan-gate checks.
- **D-24:** Feature gates beyond unit/property/member limits: Claude's discretion (planner decides which features gate per tier based on what makes sense to upsell, e.g. Starter: no bulk comms, no AI drafting; Growth+: unlock those).
- **D-25:** Trial expired → read-only access (can view, cannot create/edit/delete anything).

### Billing UI
- **D-26:** Fully custom billing UI inside Villuh — no redirect to Stripe Customer Portal.
- **D-27:** Plan selection: custom plan selector UI with Stripe Elements embedded in the page. No Checkout redirect. Stripe API called directly from Hono.
- **D-28:** Payment method management: Stripe Elements + SetupIntent to save card. All in Villuh UI.
- **D-29:** Invoice history: fetched from Stripe API at render time via Hono (no caching in DB for Phase 2).
- **D-30:** Billing settings page shows: current plan + usage (units/tier limit), invoice history, plan upgrade/downgrade UI, payment method management.
- **D-31:** Stripe Connect onboarding UI lives in Settings > Integrations. Landlord connects their Stripe account in Phase 2. Actual payment flow (Stripe Checkout) used in Phase 5 onboarding engine.

### Setup Wizard
- **D-32:** Wizard is a 4-step full-screen flow at `app/(onboarding)/onboarding/` with its own layout (no sidebar/nav). Mandatory — landlord cannot access the main app until all 4 steps are complete.
- **D-33:** Wizard steps:
  - Step 1: Create property (name, address)
  - Step 2: Add unit (label, base rent)
  - Step 3: Add tenant (name, email)
  - Step 4: Pricing table (select plan or start trial — no card required for trial)
- **D-34:** Each step submits immediately to API (entity created in DB). Going back lets landlord edit the existing entity.
- **D-35:** On browser close/resume: wizard resumes at first incomplete step. Steps 1–3 derived from DB (has property? has unit? has tenant for that unit?). Step 4 complete if landlord has an active Stripe subscription or trial.
- **D-36:** `setup_completed` boolean on the org/landlord row. Flipped to `true` only after all 4 steps complete. Next.js middleware redirects incomplete-setup authenticated users to `/onboarding`.
- **D-37:** Progress bar: "Step 1 of 4", "Step 2 of 4", etc. with visual progress bar.
- **D-38:** After wizard completion → redirect to dashboard.
- **D-39:** Step 4 pricing table: shows all 3 tiers with limits and pricing. "Start trial" CTA (no card required). Trial pre-selected as Pro. Landlord confirms trial start.

### Plan Enforcement Architecture
- **D-40:** Plan limits stored in `plan_limits` DB table (editable without a code deploy). Table structure: `(tier, resource, limit)`. Managed via DB admin only — not exposed via any Hono route in Phase 2.
- **D-41:** Per-route guard function: `checkPlanLimit(c, 'units', currentCount)` called at the top of gated Hono routes. Returns 402 when over limit.
- **D-42:** 402 response shape: `{ code: 'PLAN_LIMIT', resource: 'units', limit: 5, current: 5, upgrade_to: 'growth' }`.
- **D-43:** Trial/subscription expired gate: Hono middleware on all write routes. Returns 402 with `{ code: 'SUBSCRIPTION_REQUIRED' }` when `subscription_status = 'expired'`.
- **D-44:** `/api/me` response includes: `{ tier, unit_count, unit_limit, property_count, property_limit, member_count, member_limit, subscription_status, permissions }`. Frontend uses this to hide forbidden actions and show usage.
- **D-45:** Usage warning banner: shown in-app when landlord is at 80%+ of any limit. Disappears after upgrade.
- **D-46:** Upgrade modal (on hitting limit): shows current tier vs next tier limits + pricing. CTA navigates to `/settings/billing` (not inline payment).

### Settings Page Structure
- **D-47:** Settings layout: sidebar nav within `/settings` with sub-routes:
  - `/settings/account` — name, email, password change, profile
  - `/settings/team` — team member list, invite, role management, remove members
  - `/settings/billing` — plan, usage, invoices, payment method, upgrade/downgrade
  - `/settings/integrations` — Stripe Connect (connect/disconnect), DocuSign (connect/disconnect)
  - `/settings/audit-log` — personal audit log of landlord account activity
- **D-48:** Settings > Integrations includes DocuSign in Phase 2 (UI to connect account), even though DocuSign is used in Phase 4. Connects early to allow time for DocuSign developer approval.

### Next.js Routing & Middleware
- **D-49:** Next.js middleware handles routing guard:
  - Unauthenticated → redirect to `/login`
  - Authenticated + `setup_completed = false` → redirect to `/onboarding`
  - Authenticated + `setup_completed = true` → allow through
- **D-50:** Route structure: `app/(auth)/login/`, `app/(auth)/register/`, `app/(auth)/forgot-password/`, `app/(auth)/reset-password/`, `app/(onboarding)/onboarding/` (separate layout groups from main app).

### Claude's Discretion
- Exact feature gates per tier (which features are Starter-only vs Growth+ vs Pro-only)
- Specific Stripe webhook handling for grace period duration on payment failure
- Better Auth session configuration (session duration, refresh token strategy)
- RLS policy details for `role_permissions` table
- Exact Stripe price IDs and product naming conventions
- DocuSign OAuth connect flow specifics (deferred to Phase 4 for full implementation)

</decisions>

<specifics>
## Specific Ideas

- Billing UI is fully custom — no redirect to any Stripe-hosted page (Checkout, Customer Portal). All payment flows use Stripe.js + Elements embedded in Villuh.
- `subscription_tier` and `subscription_status` denormalized on org row for fast plan-gate checks without joining Better Auth tables.
- Stripe Connect: Phase 2 builds the "connect your Stripe account" UI in Settings > Integrations. The actual payment collection (Stripe Checkout for tenant deposits) is Phase 5 scope.
- DocuSign in Settings > Integrations: UI to initiate DocuSign OAuth connection, even though the actual DocuSign document flows come in Phase 4. Connecting early accounts for DocuSign developer approval timeline.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Auth & Billing Architecture
- `CLAUDE.md` — Critical constraints: Better Auth only (no custom JWT), two separate Stripe webhook endpoints (subscriptions vs Connect), webhook raw body handling, multi-tenancy via Postgres RLS
- `.planning/ROADMAP.md` §Phase 2 — Success criteria and requirement IDs (AUTH-01 through AUTH-09, SETT-01, SETT-02)
- `.planning/REQUIREMENTS.md` §Auth & Billing — Full requirement text for AUTH-01 through AUTH-09

### Phase 1 Foundation (what Phase 2 builds on)
- `.planning/phases/01-infrastructure-foundation/01-02-SUMMARY.md` — Hono server, withTenant wrapper, RPC client patterns
- `.planning/phases/01-infrastructure-foundation/01-03-SUMMARY.md` — @villuh/db package, Drizzle schema, DB client patterns
- `.planning/phases/01-infrastructure-foundation/01-05-SUMMARY.md` — RLS integration test patterns (DATABASE_TEST_URL, withTestTenant)

### Codebase Maps
- `.planning/codebase/ARCHITECTURE.md` — Next.js App Router RSC patterns, module structure
- `.planning/codebase/STACK.md` — Current dependencies (Tailwind v4, @base-ui/react, component patterns)
- `.planning/codebase/CONVENTIONS.md` — Code conventions to follow

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/web/modules/common/ui/` — Button, input, card, dialog primitives (from shadcn via @base-ui/react). Auth forms and wizard steps should use these.
- `packages/web/modules/app/components/theme-provider.tsx` — ThemeProvider wraps the app. Wizard layout needs its own wrapper.
- `packages/web/modules/app/providers/layout-provider.tsx` — LayoutProvider for breadcrumb context. Main app layout already has this; wizard layout should not include it.
- `packages/web/modules/common/ui/goey-toaster.tsx` + Toaster in `app/layout.tsx` — Toast available for auth success/error feedback.
- `packages/server/src/lib/tenant.ts` — `withTenant(landlordId, actorId, fn)` pattern: every Hono request sets `SET LOCAL app.current_landlord_id` and `app.current_user_id`. Auth middleware must set this on every authenticated request.
- `packages/db/migrations/` — Drizzle migration pattern: generate via `drizzle-kit generate`, custom SQL injected as `--custom` migrations. Phase 2 will need new tables: `role_permissions`, `plan_limits`, subscription columns on org table.

### Established Patterns
- Module structure: `packages/web/modules/{domain}/` for domain-specific code, `modules/common/` for shared UI. Phase 2 auth module → `modules/auth/`, billing module → `modules/billing/`.
- RLS: All tenant tables use `SET LOCAL app.current_landlord_id`. Better Auth org.id maps directly to this value.
- Drizzle schema: `packages/db/src/schema/` — new tables (role_permissions, plan_limits) go here.
- Hono routes: `packages/server/src/routes/` convention (inferred from Phase 1 plan).

### Integration Points
- Better Auth mounts at `/api/auth/**` in Hono. Next.js RPC client connects to Hono for all other routes.
- Stripe webhook at `/webhooks/stripe/subscriptions` (separate from Stripe Connect at `/webhooks/stripe/connect`).
- `packages/db/.env` has `DATABASE_URL`, `DATABASE_APP_URL`, `DATABASE_TEST_URL`, `DATABASE_OWNER_TEST_URL` — Phase 2 adds env vars for Better Auth, Stripe, Resend, Google OAuth.

</code_context>

<deferred>
## Deferred Ideas

- Property-level member scoping (members assigned to specific properties) — deferred to a later phase. Phase 2 uses org-wide roles.
- Per-member permission overrides (overriding role defaults per individual) — not in Phase 2. Landlord configures per-role only.
- Operator admin panel for viewing/editing plan_limits table — Phase 8 scope.
- Stripe Customer Portal (landlord invoice/card management via Stripe) — decided against; using fully custom UI instead.
- Grace period for payment failure (N-day window before write block) — deferred. Phase 2 hard-blocks writes on subscription expired.
- Notification preferences (/settings/notifications) — included in REQUIREMENTS.md SETT-01. Deferred to Phase 7 alongside COMM-09 (communications infrastructure). Phase 2 Settings sidebar ships without a Notifications sub-route.

</deferred>

---

*Phase: 02-auth-billing*
*Context gathered: 2026-04-30*
