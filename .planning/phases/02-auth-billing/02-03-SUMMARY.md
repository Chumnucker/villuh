---
phase: 02-auth-billing
plan: 03
subsystem: auth-ui
tags: [better-auth, next.js, auth-pages, react, stripe, forms]

# Dependency graph
requires:
  - phase: 02-auth-billing
    plan: 02
    provides: "Better Auth server instance at /api/auth/* in Hono, authMiddleware, requireTenant helper"

provides:
  - packages/web/lib/auth-client.ts — Better Auth React client with organizationClient + stripeClient plugins
  - packages/web/lib/auth-server.ts — STANDALONE minimal betterAuth() instance for Next.js middleware (no @villuh/server import)
  - packages/web/modules/auth/hooks/use-session.ts — reactive session hook wrapping authClient.useSession()
  - packages/web/app/(auth)/layout.tsx — centered auth layout with Villuh wordmark, no LayoutProvider
  - packages/web/modules/auth/components/* — 6 client components (login-form, register-form, forgot-password-form, reset-password-form, google-button, auth-card)
  - packages/web/app/(auth)/{login,register,forgot-password,reset-password}/page.tsx — 4 server component pages
  - Better Auth client wired to Hono /api/auth/* via NEXT_PUBLIC_API_URL

affects:
  - 02-06 (Next.js middleware — imports auth from @/lib/auth-server for session reads)
  - All downstream plans that need auth state in Next.js (useSession hook)

# Tech tracking
tech-stack:
  added:
    - better-auth@1.6.9 (web package — React client + standalone server instance)
    - "@better-auth/stripe (web package — stripeClient plugin for auth client)"
    - "@stripe/stripe-js@9.4.0 (web package — browser Stripe SDK, Plan 07 use)"
    - "@stripe/react-stripe-js@6.3.0 (web package — React Stripe Elements, Plan 07 use)"
    - drizzle-orm@0.45.2 (web package — needed by standalone auth-server.ts)
    - postgres@3.4.5 (web package — DB client for standalone auth-server.ts)
    - server-only (web package — prevents auth-server.ts from being bundled client-side)
    - hono@4.12.15 (web package — needed for api.ts to resolve hono/client types)
  patterns:
    - "Two Better Auth instances: Hono full instance (packages/server) + standalone minimal (packages/web/lib/auth-server.ts)"
    - "auth-server.ts shares only BETTER_AUTH_SECRET and DATABASE_APP_URL with Hono server — no code import"
    - "Auth pages are server components; forms are client components with use client directive"
    - "Suspense boundary wraps reset-password form due to useSearchParams()"
    - "(auth) layout group provides centered shell — ThemeProvider/Toaster NOT re-mounted (already in root layout)"

key-files:
  created:
    - packages/web/lib/auth-client.ts (Better Auth React client with org + Stripe plugins)
    - packages/web/lib/auth-server.ts (standalone minimal betterAuth() instance, server-only)
    - packages/web/modules/auth/hooks/use-session.ts (useSession hook wrapping authClient.useSession())
    - packages/web/app/(auth)/layout.tsx (centered auth shell with Villuh wordmark in font-mono)
    - packages/web/modules/auth/components/auth-card.tsx (shared Card wrapper for 4 forms)
    - packages/web/modules/auth/components/google-button.tsx (authClient.signIn.social)
    - packages/web/modules/auth/components/register-form.tsx (signUp.email + email verification intercept)
    - packages/web/modules/auth/components/login-form.tsx (signIn.email + forgot password link)
    - packages/web/modules/auth/components/forgot-password-form.tsx (requestPasswordReset + reset link sent intercept)
    - packages/web/modules/auth/components/reset-password-form.tsx (resetPassword + token from useSearchParams + success/expired states)
    - packages/web/app/(auth)/login/page.tsx
    - packages/web/app/(auth)/register/page.tsx
    - packages/web/app/(auth)/forgot-password/page.tsx
    - packages/web/app/(auth)/reset-password/page.tsx
    - packages/web/.env.example (documents DATABASE_APP_URL, BETTER_AUTH_SECRET, NEXT_PUBLIC_* vars)
  modified:
    - packages/web/package.json (added better-auth, @better-auth/stripe, @stripe/*, drizzle-orm, postgres, server-only, hono)
    - packages/web/modules/common/ui/checkbox.tsx (IconCheck → IconCheckmark1)
    - packages/web/modules/common/ui/combobox.tsx (IconCheck → IconCheckmark1)
    - packages/web/modules/common/ui/dropdown-menu.tsx (IconCheck → IconCheckmark1)
    - packages/web/modules/common/ui/select.tsx (IconCheck → IconCheckmark1)
    - packages/web/modules/common/ui/input-group.tsx (strip size prop to fix VariantProps type mismatch)
    - pnpm-lock.yaml (updated for all new deps)

key-decisions:
  - "STANDALONE auth-server.ts pattern: shares only secret + DB URL with Hono — no code import from @villuh/server preserves two-deployment architecture"
  - "Plan docs used authClient.forgetPassword but actual Better Auth 1.6.9 API is authClient.requestPasswordReset — updated"
  - "Hono added as web package dep to resolve hono/client import in api.ts at build time"
  - "server-only import guard prevents auth-server.ts from being bundled in client chunks"

# Metrics
duration: 11min
completed: 2026-05-01
---

# Phase 02 Plan 03: Auth Pages + Better Auth Client + Standalone auth-server Summary

**Four functional auth pages (/login, /register, /forgot-password, /reset-password) wired to Better Auth React client; STANDALONE auth-server.ts for Next.js middleware session reads without bundling @villuh/server; build passes**

## Performance

- **Duration:** ~11 min
- **Started:** 2026-05-01T04:05:48Z
- **Completed:** 2026-05-01T04:17:00Z
- **Tasks:** 3 auto + 1 checkpoint
- **Files created:** 14
- **Files modified:** 6

## Accomplishments

- Better Auth React client (`auth-client.ts`) with `organizationClient()` and `stripeClient({ subscription: true })` plugins, baseURL pointing at Hono server via `NEXT_PUBLIC_API_URL`
- Standalone minimal `auth-server.ts` in Next.js app — uses same `DATABASE_APP_URL` + `BETTER_AUTH_SECRET` as Hono server, NO `@villuh/server` import, no Stripe/org/Resend plugins. Plan 06 middleware can import this without bundling the full Hono server into the Next.js build
- `useSession()` hook wrapping `authClient.useSession()` for downstream React components
- `(auth)` layout group — centered `min-h-svh` column, `max-w-sm`, Villuh wordmark in `font-mono` above the card, no `LayoutProvider`
- Six client components: `auth-card`, `google-button`, `login-form`, `register-form`, `forgot-password-form`, `reset-password-form` — all with `"use client"` directive, verbatim UI-SPEC copy, proper success/error states
- Four server component pages under `app/(auth)/` — thin wrappers, reset-password wraps in `<Suspense>` for `useSearchParams`
- `pnpm --filter @villuh/web build` passes: all 4 auth pages build as static routes

## Task Commits

1. **Task 1: auth-client + auth-server + useSession + layout** - `61bf968` (feat)
2. **Task 2: Six auth form components** - `a2a611d` (feat)
3. **Task 3: Four auth pages + build fixes** - `16d8b4d` (feat)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan docs used `authClient.forgetPassword`, actual API is `authClient.requestPasswordReset`**
- **Found during:** Task 2 TypeScript check
- **Issue:** `better-auth@1.6.9` client exposes `requestPasswordReset` (not `forgetPassword`). TypeScript error: `Property 'forgetPassword' does not exist … Did you mean 'resetPassword'?`
- **Fix:** Updated `forgot-password-form.tsx` to call `authClient.requestPasswordReset({ email, redirectTo })`
- **Files modified:** `packages/web/modules/auth/components/forgot-password-form.tsx`
- **Committed in:** `a2a611d`

**2. [Rule 3 - Blocking] `api.ts` couldn't resolve `hono/client` at build time**
- **Found during:** Task 3 (`pnpm --filter @villuh/web build`)
- **Issue:** `hono` was only installed in `packages/server`. `api.ts` (pre-existing) imports `hono/client` which TypeScript couldn't find during Next.js build
- **Fix:** Added `hono@4.12.15` as a direct dependency of `@villuh/web`
- **Files modified:** `packages/web/package.json`, `pnpm-lock.yaml`
- **Committed in:** `16d8b4d`

**3. [Rule 1 - Bug] `IconCheck` not in `@central-icons-react/all` type union (pre-existing)**
- **Found during:** Task 3 build TypeScript check
- **Issue:** 5 files in `modules/common/ui/` used `icon="IconCheck"` but the library exports `IconCheckmark1`, `IconCheckmark2`, etc. — not `IconCheck`
- **Fix:** Replaced `"IconCheck"` with `"IconCheckmark1"` in checkbox.tsx, combobox.tsx, dropdown-menu.tsx, select.tsx
- **Files modified:** 4 UI component files
- **Committed in:** `16d8b4d`

**4. [Rule 1 - Bug] `InputGroupInput` size prop type mismatch (pre-existing)**
- **Found during:** Task 3 build TypeScript check
- **Issue:** `React.ComponentProps<"input">` includes `size?: number` but `Input` component's `size` prop is `VariantProps` (string enum). TypeScript type incompatibility
- **Fix:** Stripped `size` from props spread in `InputGroupInput` (destructured as `_size`)
- **Files modified:** `packages/web/modules/common/ui/input-group.tsx`
- **Committed in:** `16d8b4d`

## Known Stubs

None. All four auth forms call real Better Auth client methods. The `auth-server.ts` instance is minimal but functional — it will validate sessions correctly once `DATABASE_APP_URL` and `BETTER_AUTH_SECRET` are provided.

## Checkpoint: Human Visual Verification Required

The plan includes a `checkpoint:human-verify` gate after Task 3. The server + UI must be started and visually verified before this plan is considered complete.

**How to verify:**
1. Start Hono server: `pnpm --filter @villuh/server dev` (http://localhost:3001)
2. Start Next.js app: `pnpm --filter @villuh/web dev` (http://localhost:3000)
3. Verify all 10 visual checks in the plan's checkpoint spec

## Threat Surface Scan

All STRIDE mitigations from the plan's threat model are implemented:

| Threat | Status |
|--------|--------|
| T-2-S03 Reset token guessing | Mitigated — client delegates to authClient.resetPassword; no client-side token validation |
| T-2-S04 Session forgery via different secret | Mitigated — auth-server.ts validates BETTER_AUTH_SECRET at startup; .env.example documents requirement |
| T-2-T02 XSS in email field | Mitigated — email rendered via JSX interpolation {email} — React auto-escapes |
| T-2-I02 Login error reveals email exists | Mitigated — error message is "Incorrect email or password. Please try again." (verbatim from UI-SPEC) |
| T-2-I03 Bundling Stripe/Resend secrets into client | Mitigated — auth-server.ts has `import 'server-only'`; grep for @villuh/server returns 0 |

No new threat surface introduced beyond the plan's trust boundaries.

## Self-Check

Verified created files exist:
- `packages/web/lib/auth-client.ts`: FOUND
- `packages/web/lib/auth-server.ts`: FOUND
- `packages/web/modules/auth/hooks/use-session.ts`: FOUND
- `packages/web/app/(auth)/layout.tsx`: FOUND
- `packages/web/modules/auth/components/auth-card.tsx`: FOUND
- `packages/web/modules/auth/components/google-button.tsx`: FOUND
- `packages/web/modules/auth/components/login-form.tsx`: FOUND
- `packages/web/modules/auth/components/register-form.tsx`: FOUND
- `packages/web/modules/auth/components/forgot-password-form.tsx`: FOUND
- `packages/web/modules/auth/components/reset-password-form.tsx`: FOUND
- `packages/web/app/(auth)/login/page.tsx`: FOUND
- `packages/web/app/(auth)/register/page.tsx`: FOUND
- `packages/web/app/(auth)/forgot-password/page.tsx`: FOUND
- `packages/web/app/(auth)/reset-password/page.tsx`: FOUND

Verified commits exist:
- 61bf968 (Task 1): FOUND
- a2a611d (Task 2): FOUND
- 16d8b4d (Task 3): FOUND

Verified acceptance criteria:
- `pnpm --filter @villuh/web typecheck` exits 0: VERIFIED
- `pnpm --filter @villuh/web build` exits 0: VERIFIED (4 auth pages in route output)
- auth-server.ts does NOT import @villuh/server: VERIFIED (count = 0)
- auth-server.ts exports `const auth = betterAuth`: VERIFIED
- auth-server.ts imports from @villuh/db/schema/auth: VERIFIED
- auth-server.ts reads DATABASE_APP_URL and BETTER_AUTH_SECRET: VERIFIED
- auth-server.ts has NO Stripe/Resend/org plugins: VERIFIED (only comment mention)
- use-session.ts has "use client" and exports useSession: VERIFIED
- layout.tsx has font-mono, min-h-svh, max-w-sm, "Villuh" text: VERIFIED
- layout.tsx does NOT contain LayoutProvider: VERIFIED (count = 0)
- All 6 component files have "use client": VERIFIED
- authClient.signUp.email in register-form: VERIFIED
- authClient.signIn.email in login-form: VERIFIED
- authClient.requestPasswordReset in forgot-password-form: VERIFIED
- authClient.resetPassword in reset-password-form: VERIFIED
- authClient.signIn.social in google-button: VERIFIED
- Verbatim copy matches UI-SPEC: VERIFIED

## Self-Check: PASSED

---
*Phase: 02-auth-billing*
*Completed: 2026-05-01*
