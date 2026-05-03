---
phase: 02-auth-billing
plan: 06
subsystem: auth-billing
tags: [wizard, onboarding, plan-limits, subscription-gate, routing-guard]
dependency_graph:
  requires: [02-03, 02-04, 02-05]
  provides:
    - checkPlanLimit (D-42 shape, plan_limits table lookup)
    - subscriptionExpiredGate middleware (D-43, only blocks 'expired')
    - onboarding_state table (temp wizard bridge to Phase 3)
    - wizard API (GET /state, POST /property/unit/tenant)
    - Next.js routing guard (setup_completed enforcement D-49)
    - 4-step onboarding wizard UI (Screen 6)
  affects:
    - packages/server/src/app.ts
    - packages/web/proxy.ts
tech_stack:
  added:
    - onboarding_state postgres table (text PK for Better Auth org IDs, RLS)
    - WIZARD_STATE_QUERY_KEY (TanStack Query key)
  patterns:
    - TanStack Query useMutation for all wizard step mutations (per CLAUDE.md)
    - TanStack Query useQuery for wizard state (replaces useEffect+fetch per CLAUDE.md)
    - Raw postgres in proxy.ts to avoid drizzle-orm version conflicts between web+db packages
key_files:
  created:
    - packages/server/src/middleware/check-plan-limit.ts
    - packages/server/src/middleware/subscription-gate.ts
    - packages/db/src/schema/onboarding-state.ts
    - packages/db/migrations/0010_onboarding_state.sql
    - packages/server/src/routes/wizard.ts
    - packages/web/app/(onboarding)/layout.tsx
    - packages/web/app/(onboarding)/onboarding/page.tsx
    - packages/web/modules/onboarding/components/wizard-shell.tsx
    - packages/web/modules/onboarding/components/step1-property.tsx
    - packages/web/modules/onboarding/components/step2-unit.tsx
    - packages/web/modules/onboarding/components/step3-tenant.tsx
    - packages/web/modules/onboarding/components/step4-pricing.tsx
    - packages/web/modules/onboarding/hooks/use-onboarding-state.ts
  modified:
    - packages/db/src/schema/index.ts (added onboarding-state export)
    - packages/db/package.json (added onboarding-state subpath export)
    - packages/server/src/app.ts (mounted subscriptionExpiredGate + wizard routes)
    - packages/server/src/__tests__/plan-limit.test.ts (replaced stubs with real tests)
    - packages/server/src/__tests__/wizard.test.ts (replaced stubs with real tests)
    - packages/web/proxy.ts (added setup_completed routing guard)
    - packages/web/app/routes.ts (added ROUTES.onboarding)
decisions:
  - onboarding_state uses text PK (not uuid) because Better Auth org IDs are nanoid-style text strings
  - subscriptionExpiredGate fetches session directly (not via authMiddleware context) so it can be registered via app.use() before route mount
  - proxy.ts uses raw postgres (not drizzle) to avoid drizzle-orm version incompatibility between web (postgres@3.4.5) and db (postgres@3.4.9) packages
  - Wizard step components use useMutation per CLAUDE.md hard constraint (no useEffect+fetch)
  - use-onboarding-state.ts uses useQuery with staleTime:0 so state always re-fetches after mutations
metrics:
  duration: 631s
  completed: 2026-05-02
  tasks_completed: 2
  tasks_total: 3
  files_created: 13
  files_modified: 7
---

# Phase 02 Plan 06: Plan Limits + Subscription Gate + Onboarding Wizard Summary

Plan limit enforcement, subscription expired gate, and 4-step setup wizard connecting sign-up to trial-start.

## What Was Built

### Task 1: Server (e45992f)

**checkPlanLimit helper** (`packages/server/src/middleware/check-plan-limit.ts`)
- Reads `plan_limits` table for the org's current tier (treats 'trial' as 'pro' per D-19)
- Throws 402 with exact D-42 shape: `{ code: 'PLAN_LIMIT', resource, limit, current, upgrade_to }`
- Returns without throwing when `limit === -1` (unlimited tiers)
- `nextTier()` function returns 'growth' for starter, 'pro' for growth/pro

**subscriptionExpiredGate middleware** (`packages/server/src/middleware/subscription-gate.ts`)
- Fetches session directly (not via AuthVariables context) so it works as `app.use()` before route mount
- 402 `{ code: 'SUBSCRIPTION_REQUIRED', message: 'Subscription expired' }` only on status = 'expired'
- trial_pending/trialing/active/past_due/payment_failed/canceled all pass through (D-19/D-33/D-39)

**onboarding_state schema** (`packages/db/src/schema/onboarding-state.ts`)
- Temporary table for wizard step 1-3 data (Phase 3 will migrate to real tables)
- Text PK (`landlord_id`) — not uuid, because Better Auth org IDs are nanoid-style text
- RLS policy: `landlord_id = current_setting('app.current_landlord_id', true)` (text, no ::uuid cast)
- Columns: propertyData, unitData, tenantData (all jsonb), createdAt, updatedAt

**Wizard routes** (`packages/server/src/routes/wizard.ts`)
- `GET /api/wizard/state` — derives currentStep from onboarding_state + org.setup_completed (D-35)
- `POST /api/wizard/property` — step 1, checks plan limit on first create, upserts row
- `POST /api/wizard/unit` — step 2, returns 400 if property not set first
- `POST /api/wizard/tenant` — step 3, returns 400 if unit not set first
- Step 4 reuses existing `/api/billing/trial-start`

**app.ts mounts**: `app.use('/api/wizard/*', subscriptionExpiredGate)` then `.route('/api/wizard', wizard)`

**Tests**: 8 passing (AUTH-03 plan limits, AUTH-04 subscription gate, AUTH-08 wizard API)

### Task 2: Web (cb049df)

**proxy.ts routing guard**
- Enhanced existing proxy.ts (not middleware.ts — renamed per project setup)
- Uses raw postgres (not drizzle) to query `setup_completed` — avoids drizzle + postgres version conflicts
- Authenticated + `setup_completed=false` → `/onboarding`
- Authenticated + `setup_completed=true` + on `/onboarding` → `/`
- trial_pending users NOT blocked (D-19/D-33/D-39 reconciliation)

**Onboarding layout** (`(onboarding)/layout.tsx`) — full-screen, no sidebar, Villuh wordmark

**Wizard components** (all use TanStack Query useMutation per CLAUDE.md):
- Step1Property: 5-field property form, POSTs to /api/wizard/property
- Step2Unit: label + base_rent, POSTs to /api/wizard/unit, has Back button
- Step3Tenant: name + email, POSTs to /api/wizard/tenant, "You'll send them an invite..." subtext
- Step4Pricing: 3 tier cards, Pro has `ring-2 ring-primary`, calls /api/billing/trial-start, navigates to /

**WizardShell**: Progress bar with "Step N of 4", renders correct step component from API state
**useOnboardingState**: useQuery with staleTime:0, WIZARD_STATE_QUERY_KEY exported constant

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] onboarding_state landlord_id type — uuid to text**
- **Found during:** Task 1 test run
- **Issue:** Better Auth organization IDs are nanoid-style text strings, not UUIDs. The schema defined `landlord_id` as `uuid()` causing `invalid input syntax for type uuid` errors.
- **Fix:** Changed to `text()` column and updated RLS policy to use text comparison (no `::uuid` cast)
- **Files modified:** `packages/db/src/schema/onboarding-state.ts`, `packages/db/migrations/0010_onboarding_state.sql`
- **Commit:** e45992f

**2. [Rule 1 - Bug] subscriptionExpiredGate missing auth context**
- **Found during:** Task 1 test run
- **Issue:** Gate was registered via `app.use()` before authMiddleware ran on route handlers, so `c.get('user')` was always null — gate always passed through with `await next()`
- **Fix:** Rewrote gate to fetch session directly via `auth.api.getSession()` rather than relying on authMiddleware variables
- **Files modified:** `packages/server/src/middleware/subscription-gate.ts`
- **Commit:** e45992f

**3. [Rule 1 - Bug] Stripe mock in wizard.test.ts — fn not constructor**
- **Found during:** Task 1 test run
- **Issue:** `vi.fn().mockImplementation(() => ({ ... }))` doesn't work as a class constructor. `new Stripe(...)` fails.
- **Fix:** Changed to `class MockStripe { ... }` pattern (consistent with billing.test.ts)
- **Files modified:** `packages/server/src/__tests__/wizard.test.ts`
- **Commit:** e45992f

**4. [Rule 2 - CLAUDE.md compliance] Replaced useEffect+fetch with TanStack Query**
- **Found during:** Task 2 implementation
- **Issue:** Plan specified `useEffect + useState + fetch` patterns. CLAUDE.md hard constraint: "No useEffect + useState + fetch patterns — that is always replaced by useQuery"
- **Fix:** `use-onboarding-state.ts` uses `useQuery`. Step components use `useMutation`. `invalidateQueries` drives refetch.
- **Files modified:** All onboarding components and hooks
- **Commit:** cb049df

**5. [Rule 1 - Bug] proxy.ts drizzle-orm version conflict**
- **Found during:** Task 2 typecheck
- **Issue:** web package uses postgres@3.4.5 while db package uses postgres@3.4.9. Importing `@villuh/db/schema/auth` in proxy.ts caused TS2322/TS2345 type incompatibilities between the two postgres client versions.
- **Fix:** Replaced Drizzle query in proxy.ts with raw postgres SQL (`postgres` package used directly)
- **Files modified:** `packages/web/proxy.ts`
- **Commit:** cb049df

## Known Stubs

**Wizard Steps 1-3 are intentional stubs** (per `critical_context` note 10):
- Step1Property, Step2Unit, Step3Tenant persist data to `onboarding_state` table
- Phase 3 will create real `properties`, `units`, `tenants` tables and migrate this data
- These are not "broken" stubs — they capture real user input and store it server-side
- The wizard goal (get users to trial-start) is fully achieved

## Self-Check

Checking all files and commits exist:

All 8 required files found. Commits e45992f (Task 1) and cb049df (Task 2) exist. `onboarding_state` table present in dev DB.

## Self-Check: PASSED
