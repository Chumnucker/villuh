---
phase: 02-auth-billing
plan: 02
subsystem: auth
tags: [better-auth, stripe, resend, react-email, hono, middleware, rls]

# Dependency graph
requires:
  - phase: 02-auth-billing
    plan: 01
    provides: "Better Auth Drizzle schema (8 tables), role_permissions, plan_limits, vitest infrastructure, Wave 0 test stubs"

provides:
  - Better Auth server instance (betterAuth() with org plugin, Stripe plugin, Drizzle adapter, Google OAuth, email/password)
  - Auth handler mounted at /api/auth/* and /webhooks/stripe/subscriptions in Hono
  - Resend email client + 3 React-email templates (verify, reset, invitation)
  - authMiddleware (replaces Phase 1 stub) — resolves Better Auth session via auth.api.getSession
  - requireTenant helper — extracts session.activeOrganizationId as landlordId
  - billing.ts helpers — syncOrgSubscriptionTier, setOrgSubscriptionStatus, markSetupCompleted, getOrCreateStripeCustomer, handlePaymentFailed
  - AUTH-01 (email/password signup + login) and AUTH-09 (password reset) integration tests GREEN

affects:
  - 02-03 (Better Auth client pages — needs auth handler at /api/auth/*)
  - 02-04 (RBAC — needs authMiddleware + requireTenant)
  - 02-05 (Billing routes — needs stripeClient + billing helpers)
  - 02-06 (Plan enforcement — needs authMiddleware, requireTenant, billing.ts)
  - All Phase 2 plans that need authenticated Hono routes

# Tech tracking
tech-stack:
  added:
    - react@19.2.5 (devDep in @villuh/server — required for React-email JSX compilation)
    - "@types/react@19.2.14 (devDep in @villuh/server)"
  patterns:
    - "Better Auth singleton: betterAuth() called once in auth.ts, exported as named export"
    - "drizzleAdapter(db, { provider: 'pg', schema: authSchema }) — uses DATABASE_APP_URL (villuh_app role)"
    - "databaseHooks.user.create.after: auto-creates org for new user, lazy auth reference"
    - "authMiddleware: auth.api.getSession({ headers: c.req.raw.headers }) → c.set('user'/'session')"
    - "requireTenant: session.activeOrganizationId = landlordId (NOT user.id)"
    - "billing helpers: all DB writes through withTenant(orgId, 'system', ...) for RLS + audit log"
    - "Stripe webhook alias: /webhooks/stripe/subscriptions BEFORE /api/auth/* in Hono chain"
    - "React-email: lazy Resend client (validated at call time, not module init) for test mocking"
    - "vitest env defaults: placeholder values allow betterAuth() and stripeClient to initialize in test workers"
    - "Lazy auth import in setup.ts helpers: enables vi.mock to intercept email.ts before auth.ts loads"

key-files:
  created:
    - packages/server/src/auth.ts (betterAuth() instance with org + Stripe plugins, exports auth, stripeClient, Session)
    - packages/server/src/lib/billing.ts (subscription sync helpers, all through withTenant)
    - packages/server/src/lib/email.ts (Resend client + 3 send helpers, lazy env validation)
    - packages/server/src/lib/email-templates/verify-email.tsx (React-email template)
    - packages/server/src/lib/email-templates/reset-password.tsx (React-email template)
    - packages/server/src/lib/email-templates/invitation.tsx (React-email template)
    - packages/server/src/middleware/require-tenant.ts (requireTenant helper)
    - packages/server/.env.example (16 env vars for all Phase 2 services)
  modified:
    - packages/server/src/app.ts (added auth.handler mounts for /webhooks/stripe/subscriptions and /api/auth/*)
    - packages/server/src/middleware/auth.ts (replaced Phase 1 stub with real Better Auth session resolution)
    - packages/server/src/__tests__/setup.ts (added signUpTestUser, markUserEmailVerified, signInTestUser helpers)
    - packages/server/src/__tests__/auth.test.ts (replaced Wave 0 stubs with real AUTH-01 + AUTH-09 tests)
    - packages/server/tsconfig.json (added tsx files include, explicit jsx: react-jsx)
    - packages/server/vitest.config.ts (added env defaults, increased timeouts)
    - packages/server/package.json (added react + @types/react deps)
    - packages/db/package.json (added ./schema/auth export path)
    - pnpm-lock.yaml (updated for react deps)

key-decisions:
  - "Used lazy Resend client initialization (validate at call time not module init) to support test mocking without RESEND_API_KEY"
  - "Lazy auth import in setup.ts helpers (getAuth()) so vi.mock in test files intercepts email.ts before auth.ts loads it"
  - "Stripe API version: '2026-04-22.dahlia' (installed stripe@22.1.0 uses this, not the plan's '2026-03-25.dahlia')"
  - "Auth self-reference in databaseHooks: used type cast for auth.api.createOrganization since TypeScript can't infer the full org plugin API at declaration site"
  - "Added ./schema/auth export path to @villuh/db/package.json to allow auth.ts to import * as authSchema from '@villuh/db/schema/auth'"
  - "vitest.config.ts env defaults: placeholder env vars allow test workers to initialize betterAuth() and stripeClient without real credentials"

# Metrics
duration: 19min
completed: 2026-04-30
---

# Phase 02 Plan 02: Better Auth Server Instance + Email Infrastructure Summary

**Better Auth server instance wired with org plugin, Stripe plugin, Drizzle adapter (@villuh/db runtime role), auto-org creation, Resend email templates — AUTH-01 and AUTH-09 integration tests GREEN**

## Performance

- **Duration:** ~19 min
- **Started:** 2026-04-30T23:38:00Z
- **Completed:** 2026-04-30T23:57:00Z
- **Tasks:** 3
- **Files created/modified:** 19

## Accomplishments

- Better Auth instance in `auth.ts` with all Phase 2 dependencies: organization plugin (with `setup_completed`, `subscription_tier`, `subscription_status`, `stripe_connected_account_id` additionalFields matching Plan 01 schema), Stripe plugin (3 plans: starter/growth/pro with freeTrial on pro), Drizzle adapter pointing at `@villuh/db` (DATABASE_APP_URL / villuh_app non-owner role), Google OAuth + email/password with `requireEmailVerification: true`
- Auto-org creation in `databaseHooks.user.create.after` — every new user gets an organization with them as owner
- Resend email infrastructure with 3 React-email templates (verify, reset, invitation) — lazy env validation for test environment compatibility
- Phase 1 `authMiddleware` stub fully replaced with `auth.api.getSession` resolution; `requireTenant` centralizes the `landlordId = session.activeOrganizationId` invariant
- Hono app updated: `/webhooks/stripe/subscriptions` alias before `/api/auth/*` catch-all (CLAUDE.md canonical webhook URL)
- AUTH-01 (3 tests: signup, email verify enforcement, login) and AUTH-09 (1 test: forgot-password) all GREEN

## Task Commits

1. **Task 1: Resend email infrastructure** - `4881a15` (feat)
2. **Task 2: Better Auth instance + billing helpers + authMiddleware** - `c643bc9` (feat)
3. **Task 3: Mount handler in Hono + AUTH-01/AUTH-09 tests** - `f679f15` (feat)

## Files Created/Modified

- `packages/server/src/auth.ts` — betterAuth() config (180 lines)
- `packages/server/src/lib/billing.ts` — subscription sync helpers (90 lines)
- `packages/server/src/lib/email.ts` — Resend client + 3 send helpers (60 lines)
- `packages/server/src/lib/email-templates/verify-email.tsx` — React-email verify template
- `packages/server/src/lib/email-templates/reset-password.tsx` — React-email reset template
- `packages/server/src/lib/email-templates/invitation.tsx` — React-email invitation template
- `packages/server/src/middleware/auth.ts` — Better Auth session middleware (replaced stub)
- `packages/server/src/middleware/require-tenant.ts` — requireTenant helper
- `packages/server/src/app.ts` — Hono app with auth.handler mounts
- `packages/server/src/__tests__/setup.ts` — test helpers (signUpTestUser, markUserEmailVerified, signInTestUser)
- `packages/server/src/__tests__/auth.test.ts` — AUTH-01 + AUTH-09 integration tests (GREEN)
- `packages/server/.env.example` — 16 env vars documented
- `packages/server/tsconfig.json` — tsx include + explicit jsx: react-jsx
- `packages/server/vitest.config.ts` — env defaults for test workers
- `packages/db/package.json` — added ./schema/auth export path

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Stripe API version updated from '2026-03-25.dahlia' to '2026-04-22.dahlia'**
- **Found during:** Task 2 (stripeClient initialization)
- **Issue:** The plan specifies `apiVersion: '2026-03-25.dahlia'` but the installed `stripe@22.1.0` uses `'2026-04-22.dahlia'` as its LatestApiVersion. Using the old version would cause TypeScript errors.
- **Fix:** Used the version from the installed SDK (`'2026-04-22.dahlia'`)
- **Files modified:** `packages/server/src/auth.ts`
- **Committed in:** `c643bc9`

**2. [Rule 2 - Missing Critical] Added ./schema/auth export path to @villuh/db**
- **Found during:** Task 2 (auth.ts import `* as authSchema from '@villuh/db/schema/auth'`)
- **Issue:** `@villuh/db/package.json` didn't have the `./schema/auth` export path
- **Fix:** Added `"./schema/auth": "./src/schema/auth.ts"` to package.json exports
- **Files modified:** `packages/db/package.json`
- **Committed in:** `c643bc9`

**3. [Rule 2 - Missing Critical] Added react + @types/react to server package deps**
- **Found during:** Task 1 (JSX compilation for email templates)
- **Issue:** `@react-email/components` requires React as peer dep; server package had no React dependency
- **Fix:** Added `react` and `@types/react` to `@villuh/server`; added `jsx: "react-jsx"` to tsconfig; updated include pattern for `.tsx` files
- **Files modified:** `packages/server/package.json`, `packages/server/tsconfig.json`, `pnpm-lock.yaml`
- **Committed in:** `4881a15`

**4. [Rule 2 - Missing Critical] Lazy Resend client initialization for test compatibility**
- **Found during:** Task 3 (running auth tests with vi.mock)
- **Issue:** Module-level `if (!RESEND_API_KEY) throw` prevents `auth.ts` initialization in test env; vitest's `vi.mock` hoisting requires module to load without errors
- **Fix:** Changed email.ts to validate env vars at call time (lazy), not at module import. Added a `Proxy` wrapper for the `resend` export.
- **Files modified:** `packages/server/src/lib/email.ts`
- **Committed in:** `f679f15`

**5. [Rule 2 - Missing Critical] Lazy auth import in setup.ts for vi.mock interception**
- **Found during:** Task 3 (AUTH-01 test: sendVerificationEmail mock not called)
- **Issue:** `setup.ts` (setupFiles) imports `auth.ts` at load time before `vi.mock` can intercept `email.ts`. Better Auth callbacks capture the real function references, so the mock never fires.
- **Fix:** Changed auth-related helpers in setup.ts to use `async function getAuth()` with lazy `import('../auth.js')` — deferred until test runtime after vi.mock hoisting
- **Files modified:** `packages/server/src/__tests__/setup.ts`
- **Committed in:** `f679f15`

**6. [Rule 2 - Missing Critical] vitest env defaults for test worker initialization**
- **Found during:** Task 3 (betterAuth() initialization requires BETTER_AUTH_SECRET etc.)
- **Issue:** Test workers initialize `betterAuth()` and `new Stripe()` which need env vars; no `.env` file in worktree
- **Fix:** Added `env` defaults in `vitest.config.ts` for all required env vars; also created `.env` file (gitignored) with test DB URLs
- **Files modified:** `packages/server/vitest.config.ts`
- **Committed in:** `f679f15`

## Known Stubs

- `billing.ts` line 90: `// TODO Plan 07: enqueue in-app notification` — intentional stub; in-app notifications deferred to Phase 7 per plan spec. `handlePaymentFailed` sets `subscription_status = 'payment_failed'` which is the correct behavior for Phase 2.
- `auth.ts` line 63: `(auth as typeof auth & { api: { createOrganization: ... } })` — type cast needed because TypeScript can't infer the full org plugin API at betterAuth() declaration site due to circular reference. The runtime behavior is correct; this cast is safe.

## Threat Surface Scan

All STRIDE mitigations from the plan's threat model are implemented:

| Threat | Status |
|--------|--------|
| T-2-S01 Session hijacking | Mitigated — auth.api.getSession with httpOnly + secure cookies via Better Auth |
| T-2-S02 Google OAuth CSRF | Mitigated — Better Auth's socialProviders.google handles PKCE + state validation |
| T-2-T01 Stripe webhook forgery | Mitigated — Better Auth Stripe plugin uses constructEvent; no global JSON parser (verified in acceptance criteria) |
| T-2-R01 Account creation without trace | Mitigated — Phase 1 audit_log triggers fire on organization INSERT |
| T-2-I01 Cross-tenant data via auth queries | Mitigated — drizzleAdapter uses db from @villuh/db (DATABASE_APP_URL, villuh_app role); NO migrationDb (verified) |
| T-2-E01 New user gains admin via auto-create | Mitigated — org plugin creates user as 'owner' role by default |
| T-2-E02 Email verification bypass | Mitigated — requireEmailVerification: true; auth test asserts emailVerified=false on fresh signup |

No new threat surface introduced beyond the plan's trust boundaries.

## Self-Check

Verified created files exist:
- `packages/server/src/auth.ts`: FOUND
- `packages/server/src/lib/billing.ts`: FOUND
- `packages/server/src/lib/email.ts`: FOUND
- `packages/server/src/lib/email-templates/verify-email.tsx`: FOUND
- `packages/server/src/lib/email-templates/reset-password.tsx`: FOUND
- `packages/server/src/lib/email-templates/invitation.tsx`: FOUND
- `packages/server/src/middleware/auth.ts`: FOUND (replaced)
- `packages/server/src/middleware/require-tenant.ts`: FOUND
- `packages/server/src/app.ts`: FOUND (modified)
- `packages/server/.env.example`: FOUND

Verified commits exist:
- 4881a15 (Task 1): FOUND
- c643bc9 (Task 2): FOUND
- f679f15 (Task 3): FOUND

Verified acceptance criteria:
- `pnpm --filter @villuh/server typecheck` exits 0: VERIFIED
- `pnpm --filter @villuh/server test auth.test.ts` — 4 passed | 1 todo: VERIFIED
- auth.handler mounted at /api/auth/*: VERIFIED
- /webhooks/stripe/subscriptions before /api/auth/* in chain: VERIFIED (lines 21 vs 22)
- No global JSON body parser: VERIFIED (0 matches)
- migrationDb not in auth.ts: VERIFIED (0 matches)
- freeTrial: { days: 30 } on pro only: VERIFIED (1 match)
- withTenant in billing.ts: VERIFIED (4 matches)
- activeOrganizationId in require-tenant.ts: VERIFIED

## Self-Check: PASSED

---
*Phase: 02-auth-billing*
*Completed: 2026-04-30*
