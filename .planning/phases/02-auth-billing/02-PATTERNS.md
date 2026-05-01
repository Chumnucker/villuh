# Phase 2: Auth & Billing - Pattern Map

**Mapped:** 2026-04-30
**Files analyzed:** 38 new/modified files
**Analogs found:** 22 / 38

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `packages/server/src/auth.ts` | config/service | request-response | `packages/server/src/app.ts` | partial |
| `packages/server/src/middleware/auth.ts` | middleware | request-response | `packages/server/src/middleware/auth.ts` | exact (replace stub) |
| `packages/server/src/middleware/subscription-gate.ts` | middleware | request-response | `packages/server/src/middleware/auth.ts` | role-match |
| `packages/server/src/middleware/plan-limit.ts` | middleware | request-response | `packages/server/src/middleware/auth.ts` | role-match |
| `packages/server/src/routes/me.ts` | route | request-response | `packages/server/src/routes/health.ts` | role-match |
| `packages/server/src/routes/billing/trial-start.ts` | route | request-response | `packages/server/src/routes/health.ts` | role-match |
| `packages/server/src/routes/billing/setup-intent.ts` | route | request-response | `packages/server/src/routes/health.ts` | role-match |
| `packages/server/src/routes/billing/subscribe.ts` | route | request-response | `packages/server/src/routes/health.ts` | role-match |
| `packages/server/src/routes/billing/upgrade.ts` | route | request-response | `packages/server/src/routes/health.ts` | role-match |
| `packages/server/src/routes/billing/invoices.ts` | route | request-response | `packages/server/src/routes/health.ts` | role-match |
| `packages/server/src/routes/billing/stripe-connect.ts` | route | request-response | `packages/server/src/routes/health.ts` | role-match |
| `packages/server/src/routes/billing/docusign-connect.ts` | route | request-response | `packages/server/src/routes/health.ts` | role-match |
| `packages/db/src/schema/auth.ts` | model | CRUD | `packages/db/src/schema/landlords.ts` | role-match |
| `packages/db/src/schema/role-permissions.ts` | model | CRUD | `packages/db/src/schema/landlords.ts` | exact |
| `packages/db/src/schema/plan-limits.ts` | model | CRUD | `packages/db/src/schema/landlords.ts` | role-match |
| `packages/db/migrations/0002_better_auth.sql` | migration | — | none | no analog |
| `packages/db/migrations/0003_role_permissions.sql` | migration | — | none | no analog |
| `packages/web/lib/auth-client.ts` | utility | request-response | `packages/web/lib/api.ts` | role-match |
| `packages/web/middleware.ts` | middleware | request-response | none | no analog |
| `packages/web/app/(auth)/login/page.tsx` | component | request-response | `packages/web/app/page.tsx` | partial |
| `packages/web/app/(auth)/register/page.tsx` | component | request-response | `packages/web/app/page.tsx` | partial |
| `packages/web/app/(auth)/forgot-password/page.tsx` | component | request-response | `packages/web/app/page.tsx` | partial |
| `packages/web/app/(auth)/reset-password/page.tsx` | component | request-response | `packages/web/app/page.tsx` | partial |
| `packages/web/app/(onboarding)/layout.tsx` | component | request-response | `packages/web/app/layout.tsx` | role-match |
| `packages/web/app/(onboarding)/onboarding/page.tsx` | component | request-response | `packages/web/app/page.tsx` | partial |
| `packages/web/app/(app)/settings/layout.tsx` | component | request-response | `packages/web/app/layout.tsx` | role-match |
| `packages/web/app/(app)/settings/account/page.tsx` | component | request-response | `packages/web/app/page.tsx` | partial |
| `packages/web/app/(app)/settings/team/page.tsx` | component | request-response | `packages/web/app/page.tsx` | partial |
| `packages/web/app/(app)/settings/billing/page.tsx` | component | request-response | `packages/web/app/page.tsx` | partial |
| `packages/web/app/(app)/settings/integrations/page.tsx` | component | request-response | `packages/web/app/page.tsx` | partial |
| `packages/web/app/(app)/settings/audit-log/page.tsx` | component | request-response | `packages/web/app/page.tsx` | partial |
| `packages/web/modules/auth/components/` | component | request-response | `packages/web/modules/common/ui/input.tsx` + `button.tsx` | partial |
| `packages/web/modules/auth/hooks/` | hook | request-response | `packages/web/modules/app/providers/layout-provider.tsx` | role-match |
| `packages/web/modules/billing/components/` | component | request-response | `packages/web/modules/common/ui/card.tsx` + `dialog.tsx` + `table.tsx` | partial |
| `packages/web/modules/billing/hooks/` | hook | request-response | `packages/web/modules/app/providers/layout-provider.tsx` | role-match |
| `packages/web/modules/onboarding/components/` | component | request-response | `packages/web/modules/common/ui/card.tsx` + `progress.tsx` | partial |
| `packages/web/modules/settings/components/` | component | request-response | `packages/web/modules/common/ui/table.tsx` + `dialog.tsx` | partial |
| `packages/server/src/__tests__/` | test | CRUD | `packages/db/src/__tests__/rls.test.ts` | role-match |

---

## Pattern Assignments

### `packages/server/src/auth.ts` (config/service, request-response)

**Analog:** `packages/server/src/app.ts` — structure: initialize a singleton, export it, import into app

**App.ts imports pattern** (lines 1–4):
```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { health } from './routes/health.js'
```

**auth.ts imports pattern** (copy this shape):
```typescript
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { organization } from 'better-auth/plugins'
import { stripe } from '@better-auth/stripe'
import { db } from '@villuh/db'
import Stripe from 'stripe'
```

**Singleton export pattern** (from `app.ts` lines 14–18):
```typescript
// app.ts exports a single initialized instance:
const app = new Hono()
// ...
export default app
export type AppType = typeof routes
```

**auth.ts must follow the same singleton pattern:**
```typescript
export const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
})

export const auth = betterAuth({ /* ... config ... */ })
export type Session = typeof auth.$Infer.Session
```

**Hono mount pattern** (`app.ts` lines 14–18 — where to add the Better Auth handler):
```typescript
const routes = app
  .route('/api', health)
  .on(['POST', 'GET'], '/api/auth/*', (c) => auth.handler(c.req.raw))
```

**Critical:** `drizzleAdapter` MUST import `db` from `@villuh/db` (uses `DATABASE_APP_URL` / `villuh_app` role). Never import `migrationDb`. See `packages/db/src/index.ts` line 7 for the `DATABASE_APP_URL` precedent.

---

### `packages/server/src/middleware/auth.ts` (middleware, request-response)

**Analog:** `packages/server/src/middleware/auth.ts` — replace Phase 1 stub

**Phase 1 stub pattern** (lines 1–14 — full file):
```typescript
import { createMiddleware } from 'hono/factory'

// Phase 1 stub — full Better Auth implementation deferred to Phase 2.
// These type definitions are the permanent shape; Phase 2 populates the values.
type Variables = {
  user: { id: string; landlordId: string } | null
  session: { id: string } | null
}

export const authMiddleware = createMiddleware<{ Variables: Variables }>(async (c, next) => {
  c.set('user', null)
  c.set('session', null)
  await next()
})
```

**Phase 2 replacement — copy this structure exactly:**
```typescript
import { createMiddleware } from 'hono/factory'
import { auth } from '../auth.js'

type Session = typeof auth.$Infer.Session

type Variables = {
  user: Session['user'] | null
  session: Session['session'] | null
}

export const authMiddleware = createMiddleware<{ Variables: Variables }>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  c.set('user', session?.user ?? null)
  c.set('session', session?.session ?? null)
  await next()
})
```

**Key change:** `Variables.user` type changes from `{ id: string; landlordId: string }` to `Session['user']` — Better Auth infers the full typed shape including org `additionalFields`.

---

### `packages/server/src/middleware/subscription-gate.ts` (middleware, request-response)

**Analog:** `packages/server/src/middleware/auth.ts` — same `createMiddleware` factory pattern

**Core middleware factory pattern** (from `auth.ts` lines 1, 10–14):
```typescript
import { createMiddleware } from 'hono/factory'

export const subscriptionExpiredGate = createMiddleware(async (c, next) => {
  // Read c.get('user') and c.get('session') — set by authMiddleware upstream
  // Check org.subscription_status from DB
  // Return 402 or call next()
  await next()
})
```

**Error response pattern for 402:**
```typescript
// 402 shape from RESEARCH.md D-43:
return c.json({ code: 'SUBSCRIPTION_REQUIRED', message: 'Subscription expired' }, 402)
```

**DB query pattern** (mirroring `withTenant` pattern from `packages/server/src/lib/tenant.ts` lines 14–18):
```typescript
// All authenticated DB queries go through withTenant:
const orgId = c.get('session')?.activeOrganizationId
return withTenant(orgId, userId, async (tx) => {
  const org = await tx.query.organization.findFirst(...)
})
```

---

### `packages/server/src/middleware/plan-limit.ts` (middleware, request-response)

**Analog:** `packages/server/src/middleware/auth.ts` — same createMiddleware factory. This is a utility function not a middleware export, but uses the same context access pattern.

**Context access pattern** (from `auth.ts` lines 10–14):
```typescript
import { createMiddleware } from 'hono/factory'
// Usage: c.get('user'), c.get('session')
```

**checkPlanLimit function signature** (from RESEARCH.md Pattern 8):
```typescript
// Called at the top of gated Hono routes — NOT as middleware but as a helper:
export async function checkPlanLimit(
  c: Context,
  resource: 'units' | 'properties' | 'members',
  currentCount: number
): Promise<void>
```

**402 response shape** (D-42):
```typescript
throw new HTTPException(402, {
  message: JSON.stringify({
    code: 'PLAN_LIMIT',
    resource,
    limit: limit.limit,
    current: currentCount,
    upgrade_to: tier === 'starter' ? 'growth' : 'pro',
  }),
})
```

---

### `packages/server/src/routes/health.ts` — existing route pattern (reference for all new routes)

**Analog is the file itself** (lines 1–5 — full file):
```typescript
import { Hono } from 'hono'

export const health = new Hono()
  .get('/health', (c) => c.json({ ok: true, ts: Date.now() }))
```

**All new route files follow this shape:**
- `new Hono()` instance
- Method-chained route handlers (`.get()`, `.post()`)
- Named export matching filename (e.g., `export const trialStart = new Hono()`)
- Mounted in `app.ts` via `.route('/api/billing', trialStart)`

---

### `packages/server/src/routes/me.ts` (route, request-response)

**Analog:** `packages/server/src/routes/health.ts`

**Route with auth guard pattern:**
```typescript
import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'
import { withTenant } from '../lib/tenant.js'

export const me = new Hono()
  .get('/', authMiddleware, async (c) => {
    const user = c.get('user')
    const session = c.get('session')
    if (!user || !session?.activeOrganizationId) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    // withTenant pattern from tenant.ts:
    return withTenant(session.activeOrganizationId, user.id, async (tx) => {
      // fetch org + counts + permissions
      return c.json({ tier, unit_count, /* D-44 shape */ })
    })
  })
```

**Response shape** (D-44):
```typescript
// /api/me returns:
{
  tier: string,
  unit_count: number,
  unit_limit: number,
  property_count: number,
  property_limit: number,
  member_count: number,
  member_limit: number,
  subscription_status: string,
  permissions: Record<string, boolean>
}
```

---

### `packages/server/src/routes/billing/trial-start.ts` (route, request-response)

**Analog:** `packages/server/src/routes/health.ts`

**Route shape** (Hono instance + POST handler):
```typescript
import { Hono } from 'hono'
import { authMiddleware } from '../../middleware/auth.js'
import { stripeClient } from '../../auth.js'

export const billingTrialStart = new Hono()
  .post('/', authMiddleware, async (c) => {
    const user = c.get('user')!
    const session = c.get('session')!
    const landlordId = session.activeOrganizationId!

    // Direct Stripe API call — NOT authClient.subscription.upgrade() (pitfall #5)
    const subscription = await stripeClient.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 0 }],
      trial_period_days: 30,
      trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
      metadata: { landlord_id: landlordId },
    })

    return c.json({ ok: true, trialEnd: subscription.trial_end })
  })
```

---

### `packages/server/src/routes/billing/stripe-connect.ts` (route, request-response)

**Analog:** `packages/server/src/routes/health.ts` — GET + POST handlers on same Hono instance

**Multi-method route pattern:**
```typescript
export const stripeConnect = new Hono()
  .get('/callback', authMiddleware, async (c) => {
    const { code, state } = c.req.query()
    // oauth flow — state = landlordId
    return c.redirect('/settings/integrations?connected=true')
  })
  .post('/disconnect', authMiddleware, async (c) => {
    // update org record
    return c.json({ ok: true })
  })
```

**Critical:** `c.req.query()` for URL params (not body parsing). No global JSON body parser anywhere in the app — webhook routes rely on `c.req.text()`.

---

### `packages/db/src/schema/role-permissions.ts` (model, CRUD)

**Analog:** `packages/db/src/schema/landlords.ts` — exact same RLS policy pattern

**RLS policy pattern** (lines 17–31 of `landlords.ts`):
```typescript
import { sql } from 'drizzle-orm'
import { pgPolicy, pgRole, pgTable, text, uuid, boolean } from 'drizzle-orm/pg-core'
import { villuhApp } from './landlords.js'

export const rolePermissions = pgTable('role_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  landlordId: uuid('landlord_id').notNull(),
  role: text('role').notNull(),
  action: text('action').notNull(),
  allowed: boolean('allowed').notNull().default(false),
}, (t) => [
  pgPolicy('tenant_isolation', {
    as: 'permissive',
    for: 'all',
    to: villuhApp,                            // import villuhApp from './landlords.js'
    using: sql`landlord_id = current_setting('app.current_landlord_id', true)::uuid`,
    withCheck: sql`landlord_id = current_setting('app.current_landlord_id', true)::uuid`,
  }),
]).enableRLS()
```

**Import `villuhApp`** from `./landlords.js` — do not redeclare it. The role is already marked `.existing()` there.

**Barrel update required:** Add `export * from './role-permissions.js'` to `packages/db/src/schema/index.ts` (currently line 1 only exports landlords).

---

### `packages/db/src/schema/plan-limits.ts` (model, CRUD)

**Analog:** `packages/db/src/schema/landlords.ts` — same table shape, but NO RLS (this is a system table, not tenant-scoped)

**Pattern without RLS:**
```typescript
import { integer, pgTable, text, uuid } from 'drizzle-orm/pg-core'

// No pgPolicy, no .enableRLS() — plan_limits is a system table
export const planLimits = pgTable('plan_limits', {
  id: uuid('id').primaryKey().defaultRandom(),
  tier: text('tier').notNull(),       // 'starter' | 'growth' | 'pro'
  resource: text('resource').notNull(), // 'units' | 'properties' | 'members'
  limit: integer('limit').notNull(),  // -1 means unlimited
})
```

---

### `packages/db/src/schema/auth.ts` (model, CRUD)

**Analog:** `packages/db/src/schema/landlords.ts` — same Drizzle schema structure

**Critical:** This file is generated by `npx auth generate`, NOT hand-written. The output SQL is injected into a Drizzle migration file (`0002_better_auth.sql`). The TypeScript schema file re-exports the generated types for use with `drizzleAdapter`.

**Pattern — accept generated output as-is, then reference in drizzleAdapter:**
```typescript
// packages/server/src/auth.ts
import * as authSchema from '@villuh/db/schema/auth'   // generated tables

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: authSchema,   // pass generated schema here
  }),
  // ...
})
```

---

### `packages/web/lib/auth-client.ts` (utility, request-response)

**Analog:** `packages/web/lib/api.ts` — same pattern: singleton client export, process.env for base URL

**api.ts full pattern** (lines 1–9):
```typescript
import { hc } from 'hono/client'
import type { AppType } from '@villuh/server/app'

export const api = hc<AppType>(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001')
```

**auth-client.ts follows the same shape:**
```typescript
import { createAuthClient } from 'better-auth/react'
import { organizationClient } from 'better-auth/client/plugins'
import { stripeClient } from '@better-auth/stripe/client'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL,   // same env var as api.ts
  plugins: [
    organizationClient(),
    stripeClient({ subscription: true }),
  ],
})

export type Session = typeof authClient.$Infer.Session
```

---

### `packages/web/middleware.ts` (middleware, request-response)

**No existing analog** — first Next.js middleware file in this codebase.

**Pattern from RESEARCH.md Pattern 6:**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth-server'   // server-side auth instance

export const config = {
  runtime: 'nodejs',
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/accept-invitation']
  if (publicPaths.some(p => pathname.startsWith(p))) return NextResponse.next()

  const session = await auth.api.getSession({ headers: request.headers })

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Check setup_completed via auth.api.getOrganization (Option A from RESEARCH.md)
  if (!pathname.startsWith('/onboarding')) {
    // fetch org — see pitfall #7 in RESEARCH.md re: performance
  }

  return NextResponse.next()
}
```

---

### `packages/web/app/layout.tsx` (component — modified)

**Analog is the file itself** (lines 1–44 — current content):
```typescript
import localFont from "next/font/local"
import { Inter } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"
import { ThemeProvider } from "@/modules/app/components/theme-provider"
import { LayoutProvider } from "@/modules/app/providers/layout-provider"
import { Toaster } from "@/modules/common/ui/sonner"
```

**Existing layout structure** (lines 20–44): `<html>` → `<body>` → `<ThemeProvider>` → `<LayoutProvider>` → `{children}` → `<Toaster />`.

**Phase 2 change:** No structural change to root layout. The `(auth)`, `(onboarding)`, and `(app)` route groups each have their own `layout.tsx` that omits or includes `<LayoutProvider>` as appropriate.

---

### `packages/web/app/(auth)/login/page.tsx` and `register/page.tsx` (component, request-response)

**Analog:** `packages/web/app/page.tsx` — page component structure; `packages/web/modules/common/ui/input.tsx` + `button.tsx` for form elements

**Page component pattern** (from `page.tsx` lines 1–5):
```typescript
import { Button } from "@/modules/common/ui/button"
import { Input, PasswordInput } from "@/modules/common/ui/input"
// No "use client" on the page file — delegate interaction to a client component

export default function Page() {
  return (
    // Centered layout — no sidebar/nav
    <div className="flex min-h-svh items-center justify-center">
      <LoginForm />     // "use client" component in modules/auth/components/
    </div>
  )
}
```

**Form component pattern** (combining `input.tsx` PasswordInput + `button.tsx`):
```typescript
"use client"

import { Input, PasswordInput } from "@/modules/common/ui/input"
import { Button } from "@/modules/common/ui/button"
import { authClient } from "@/lib/auth-client"

// Field + label pattern from modules/common/ui/field.tsx
// Error state: aria-invalid on Input triggers the destructive ring (input.tsx line 17)
```

**PasswordInput is already built** — `packages/web/modules/common/ui/input.tsx` lines 82–131 exports `PasswordInput` with show/hide toggle. Use it directly for password fields.

---

### `packages/web/app/(onboarding)/layout.tsx` (component, request-response)

**Analog:** `packages/web/app/layout.tsx` — layout structure; but OMIT `<LayoutProvider>`

**app/layout.tsx pattern** (lines 37–44):
```typescript
<body>
  <ThemeProvider>
    <LayoutProvider>{children}</LayoutProvider>
    <Toaster />
  </ThemeProvider>
</body>
```

**Onboarding layout omits `<LayoutProvider>`** (no breadcrumbs context needed, no sidebar):
```typescript
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {children}
      <Toaster />
    </ThemeProvider>
  )
}
```

**`<ThemeProvider>` import path:** `@/modules/app/components/theme-provider` (matches existing import in `app/layout.tsx` line 7).

---

### `packages/web/app/(onboarding)/onboarding/page.tsx` (component, request-response)

**Analog:** `packages/web/modules/common/ui/progress.tsx` — use `<Progress>` for step progress bar

**Progress component** (lines 1–31 of `progress.tsx`):
```typescript
import { Progress } from "@/modules/common/ui/progress"

// Usage:
<Progress value={(currentStep / 4) * 100} />
```

**Card component for each step** (from `modules/common/ui/card.tsx` lines 1–100 — `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter`).

**Step navigation pattern:**
```typescript
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Progress } from "@/modules/common/ui/progress"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/modules/common/ui/card"
import { Button } from "@/modules/common/ui/button"

// Wizard state: currentStep (1-4), stepData persisted to API on each advance
```

---

### `packages/web/app/(app)/settings/layout.tsx` (component, request-response)

**Analog:** `packages/web/app/page.tsx` lines 9–13 — sidebar nav pattern

**Existing sidebar nav pattern** (from `page.tsx` lines 9–13):
```typescript
<nav className="flex w-64 flex-col border-r bg-card">
  <div className="flex h-navbar items-center justify-between border-b px-page">
    <h5 className="font-mono text-2xl font-medium">Villuh</h5>
  </div>
  <div className="flex flex-col gap-1 p-page">
    <LinkButton href={"/"} variant={"ghost-muted"} className="justify-start gap-2">
      <PlatformIcon icon="IconHomeDoor" size={20} strokeWidth={2} />
      Home
    </LinkButton>
  </div>
</nav>
```

**Settings layout sidebar nav items** (from D-47):
```typescript
// /settings/account, /settings/team, /settings/billing, /settings/integrations, /settings/audit-log
// Each uses LinkButton variant="ghost-muted" with PlatformIcon — same pattern as page.tsx lines 25–34
```

**Layout structure:** Settings layout has a narrower sidebar (~48px narrower than app sidebar) + `<Outlet>` / `{children}` for sub-pages.

---

### `packages/web/app/(app)/settings/billing/page.tsx` (component, request-response)

**Analog:** `packages/web/modules/common/ui/table.tsx` + `card.tsx` + `dialog.tsx`

**Table for invoice history** (from `table.tsx` lines 1–116 — `Table`, `TableHeader`, `TableBody`, `TableHead`, `TableRow`, `TableCell`):
```typescript
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/modules/common/ui/table"
```

**Card for plan/usage summary** (from `card.tsx`):
```typescript
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/modules/common/ui/card"
```

**Dialog for upgrade confirmation** (from `dialog.tsx` lines 50–85 — `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`):
```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/modules/common/ui/dialog"
```

---

### `packages/web/modules/auth/hooks/` (hook, request-response)

**Analog:** `packages/web/modules/app/providers/layout-provider.tsx` — useContext + guard pattern

**Context guard pattern** (from `layout-provider.tsx` lines 36–42):
```typescript
export const useLayout = (): LayoutContext => {
  const context = useContext(LayoutContext)
  if (context === null) {
    throw new Error("Should use useLayout with LayoutProvider")
  }
  return context
}
```

**`useSession` hook follows same pattern, wrapping `authClient.useSession()`:**
```typescript
"use client"

// useSession wraps authClient.useSession — no custom context needed
// authClient is a singleton; hooks are on the client instance directly
export function useSession() {
  return authClient.useSession()
}
```

---

### `packages/server/src/__tests__/` (test, CRUD)

**Analog:** `packages/db/src/__tests__/rls.test.ts` + `packages/db/src/__tests__/setup.ts` — same vitest + integration test structure

**Test setup pattern** (from `setup.ts` lines 1–48):
```typescript
import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../schema/index.js'

export function createOwnerClient() { /* ... DATABASE_OWNER_TEST_URL ... */ }
export function createAppClient() { /* ... DATABASE_TEST_URL ... */ }
export async function withTestTenant<T>(appDb, landlordId, actorId, fn) { /* ... */ }
```

**Test file structure** (from `rls.test.ts` lines 1–130):
```typescript
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const LANDLORD_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

beforeAll(async () => { /* seed */ })
afterAll(async () => { /* teardown + close connections */ })

describe('feature name', () => {
  it('behavior description', async () => {
    // arrange → act → assert
  })
})
```

**Server test infrastructure** — `packages/server/vitest.config.ts` should mirror `packages/db/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
  },
})
```

---

## Shared Patterns

### `withTenant` on Every Authenticated Hono Route
**Source:** `packages/server/src/lib/tenant.ts` lines 9–19
**Apply to:** All routes in `packages/server/src/routes/billing/`, `packages/server/src/routes/me.ts`

```typescript
import { withTenant } from '../lib/tenant.js'

// Pattern — inside every authenticated handler:
const landlordId = c.get('session')!.activeOrganizationId!
const userId = c.get('user')!.id
return withTenant(landlordId, userId, async (tx) => {
  // All DB queries here — RLS enforced, audit_log triggers fire automatically
})
```

**Critical note from RESEARCH.md Pattern 3:** `session.activeOrganizationId` is the `landlordId` for RLS. This is NOT `user.id`. They are different UUIDs.

---

### Hono Route Naming (applies to all new route files)
**Source:** `packages/server/src/routes/health.ts` + `packages/server/src/app.ts` lines 14–16
**Apply to:** All files in `packages/server/src/routes/`

```typescript
// Route file: export named const matching purpose
export const trialStart = new Hono()

// app.ts mount — chain all routes:
const routes = app
  .route('/api', health)
  .route('/api/billing', trialStart)
  .route('/api/billing', setupIntent)
  // ...
  .on(['POST', 'GET'], '/api/auth/*', (c) => auth.handler(c.req.raw))
```

**Critical:** Method chain on `routes`, NOT reassignment. RPC type inference depends on the chain being preserved (see `app.ts` comment on line 12).

---

### Drizzle Schema Table Structure (applies to all new schema files)
**Source:** `packages/db/src/schema/landlords.ts` lines 1–31
**Apply to:** `packages/db/src/schema/role-permissions.ts`, `packages/db/src/schema/plan-limits.ts`

```typescript
import { sql } from 'drizzle-orm'
import { pgPolicy, pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core'
import { villuhApp } from './landlords.js'   // reuse existing role export

// Tenant tables: include pgPolicy + .enableRLS()
// System tables (plan_limits): omit pgPolicy, omit .enableRLS()
```

**Barrel exports:** Every new schema file must be added to `packages/db/src/schema/index.ts`. Current content is one line; Phase 2 adds three more exports.

---

### UI Component Import Style (applies to all new frontend files)
**Source:** `packages/web/modules/common/ui/button.tsx` line 3, `packages/web/lib/utils.ts`
**Apply to:** All files in `packages/web/modules/auth/`, `packages/web/modules/billing/`, `packages/web/modules/onboarding/`, `packages/web/modules/settings/`

```typescript
import { cn } from "@/lib/utils"
import { Button, LinkButton } from "@/modules/common/ui/button"
import { Input, PasswordInput } from "@/modules/common/ui/input"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/modules/common/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/modules/common/ui/dialog"
import { PlatformIcon } from "@/modules/common/ui/icon"
```

**Path alias:** `@/` resolves to `packages/web/` (set in `packages/web/tsconfig.json`). Never use relative paths that cross package boundaries.

---

### `"use client"` Directive (applies to all interactive components)
**Source:** `packages/web/modules/app/components/theme-provider.tsx` line 1, `packages/web/modules/app/providers/layout-provider.tsx` line 1
**Apply to:** All components with `useState`, `useEffect`, `authClient.useSession()`, form submit handlers, Stripe Elements

```typescript
"use client"    // Must be first line before all imports

import { useState } from "react"
// ...
```

**Default to Server Components for page files.** Auth page files (`login/page.tsx`, etc.) can be Server Components that render a Client Component form. The form component itself needs `"use client"`.

---

### `data-slot` Attribute Pattern (applies to all new UI components)
**Source:** `packages/web/modules/common/ui/button.tsx` line 74, `packages/web/modules/common/ui/card.tsx` line 12
**Apply to:** Any new UI primitive components in `packages/web/modules/common/ui/` or domain-level components that compose design system elements

```typescript
// Every root element of a component carries data-slot:
<div data-slot="card" className={cn(...)}>
<button data-slot="button" data-variant={variant} data-size={size} className={cn(...)}>
```

---

### No Global JSON Body Parser (applies to `packages/server/src/app.ts`)
**Source:** RESEARCH.md Pitfall #4, CLAUDE.md Critical constraint
**Apply to:** `packages/server/src/app.ts` — do NOT add `app.use('*', bodyParser())`

The Stripe webhook handler at `/api/auth/stripe/webhook` (Better Auth Stripe plugin) calls `c.req.text()` internally for raw body signature verification. A global JSON body parser would consume the body first and break `stripe.webhooks.constructEvent`.

```typescript
// CORRECT: No global body parser
app.use('/api/*', cors({ ... }))
// Routes use @hono/zod-validator per-route, not global parsing

// WRONG — never add this:
// app.use('*', bodyParser())
```

---

## No Analog Found

Files with no close match in the codebase (use RESEARCH.md patterns):

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `packages/web/middleware.ts` | middleware | request-response | First Next.js middleware in codebase; no existing routing guard |
| `packages/db/migrations/0002_better_auth.sql` | migration | — | Generated from `npx auth generate` — do not hand-write |
| `packages/db/migrations/0003_role_permissions.sql` | migration | — | Custom SQL; no prior custom migration to model from |
| `packages/server/src/auth.ts` | config/service | request-response | First Better Auth config in codebase |
| `packages/web/modules/billing/components/PaymentMethodForm.tsx` | component | request-response | First Stripe Elements component; use RESEARCH.md Pattern 5 |
| `packages/web/modules/billing/components/PlanSelector.tsx` | component | request-response | First plan/pricing UI in codebase |

---

## Metadata

**Analog search scope:** `packages/server/src/`, `packages/db/src/`, `packages/web/app/`, `packages/web/lib/`, `packages/web/modules/`, `.planning/phases/01-infrastructure-foundation/01-PATTERNS.md`
**Files scanned:** 31 source files
**Pattern extraction date:** 2026-04-30
