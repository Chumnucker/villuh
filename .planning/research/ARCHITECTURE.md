# Architecture Patterns

**Project:** Villuh Lease
**Researched:** 2026-04-29
**Updated:** 2026-08-11 — canonical API is Express + tRPC (Hono/`hono/client` superseded)
**Confidence:** HIGH (live codebase + Better Auth / tRPC / Drizzle patterns)

> **Canonical API:** `apps/server` is **Express 5 + tRPC** (`/trpc`, `AppRouter`). Frontends use `@villuh/api`. Older sections below that still show Hono code samples are historical — prefer Express/tRPC patterns matching `apps/server/src/app.ts`.

---

## Recommended Architecture

### Deployment Topology

```
┌──────────────────────────────────────────────────────────────────────┐
│  Monorepo Root (villuh/)                                             │
│                                                                      │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────┐ │
│  │ landlord-web        │  │ resident-web        │  │ Express API  │ │
│  │ (Vercel)            │  │ (Vercel)            │  │ (Railway)    │ │
│  │ {slug}.app.villuh.com│  │ {slug}.villuh.com   │  │ tRPC /trpc   │ │
│  │ sidebar + top nav   │  │ center-aligned      │  │ webhooks     │ │
│  └──────────┬──────────┘  └──────────┬──────────┘  │ Better Auth  │ │
│             │                        │             └──────┬───────┘ │
│             └────────────┬───────────┘                    │         │
│                          │      @villuh/api (tRPC)        │         │
│                          └────────────────────────────────┘         │
│                                          │                          │
│                               ┌──────────▼──────────┐               │
│                               │  Postgres (Railway) │               │
│                               │  RLS multi-tenant   │               │
│                               └─────────────────────┘               │
│                                                                      │
│  packages/: ui, auth, api, eslint/tsconfig                          │
└──────────────────────────────────────────────────────────────────────┘
```

**White-label:** Resolve landlord from Host subdomain (`livanosunlake` → org). Apply logo/colors to both portals. Custom domains deferred.

**API contract:** Express + tRPC (`AppRouter` → `@villuh/api`). One backend serves both apps. Not Hono. Not GraphQL/Nest.

### Shared TypeScript types

Both Next.js apps and the Express server live in the same monorepo. Shared UI/auth live in `packages/ui` and `packages/auth`. Typed API access is `packages/api` exporting `trpc` bound to `AppRouter` from `@villuh/server/router`.

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **landlord-web** | Landlord UI (sidebar shell), RSC, auth session | tRPC via `@villuh/api`, Better Auth |
| **resident-web** | Resident UI (center shell), invite/onboarding UX | tRPC via `@villuh/api`, Better Auth / onboarding session |
| **packages/ui** | Shared design system, theme, layout chrome | Consumed by both Next apps |
| **packages/auth** | Better Auth client/server helpers + auth forms | Both Next apps; sessions share Postgres with server |
| **packages/api** | `trpc` client + `TRPCProvider` | Both Next apps → Express `/trpc` |
| **Express API Server** | tRPC procedures, Better Auth, webhooks, cron, S3 presign | Postgres (Drizzle), S3, Stripe, DocuSign, Twilio, Resend |
| **Webhook Receivers** | Ingest Stripe/DocuSign/Twilio/Resend events | Postgres (Drizzle), internal handlers |
| **Postgres + RLS** | Authoritative data store, enforces tenant isolation | Drizzle (server), Better Auth adapter |
| **Better Auth** | Session management, OAuth, password reset, org plugin | Postgres; mounted on Express (`/api/auth/*`) + Next proxies |
| **S3** | Document and image storage, signed URL generation | Server (presign), browser (direct PUT), Next apps (presigned GET) |

---

## Data Flow

### Authenticated API Call (normal read/write)

```
Browser
  → Next.js Client Component
  → trpc.*.useQuery / useMutation (@villuh/api) → /trpc
  → Express tRPC middleware: createContext → auth.api.getSession → landlordId
  → withTenant(landlordId): SET LOCAL app.current_landlord_id
  → Drizzle query — RLS filters by current_setting('app.current_landlord_id')
  → Response (fully typed via AppRouter)
```

### Webhook Event (Stripe / DocuSign / Twilio / Resend)

```
Provider
  → POST /webhooks/{provider}  (Express, public route, raw body via express.raw())
  → Signature verification middleware (provider SDK)
  → Idempotency check: SELECT FROM webhook_events WHERE provider_event_id = $1
  → If already processed: return 200 immediately
  → Insert webhook_events row (status = 'processing')
  → Handle event synchronously (update DB state)
  → Mark webhook_events row status = 'processed'
  → Return 200
```

### File Upload (S3 presign pattern)

```
Browser
  → POST /api/uploads/presign  (Hono, authenticated)
  → Hono validates: file type, size limit, landlord plan limits
  → Generates S3 presigned PUT URL (15-minute expiry) + object key
  → Browser PUTs file directly to S3 (no Hono in the upload path)
  → Browser POSTs object key to /api/{resource} to record in DB
  → Hono stores S3 key in Drizzle, never the full URL
```

### Onboarding Flow Step Execution

```
Tenant clicks invite link (magic token)
  → Next.js page: token validated against invite_tokens table
  → Load onboarding_instance + ordered steps (step_type, status, conditions_json evaluated)
  → For each step (sequential):
      signature_required → DocuSign envelope created via Hono → browser redirects to DocuSign
      acknowledgment     → Browser POSTs ack → Hono advances step
      document_view_only → Browser signals view → Hono advances step
      form_fill          → Browser submits form → Hono validates + stores answers → advances
      payment            → Hono creates Stripe Checkout session (Connect) → browser redirects
  → On step completion: Hono updates step.status, checks if all steps done
  → On final step: Hono updates onboarding_instance.status = 'completed', activates lease if mode = auto
```

---

## Architecture Decisions

### 1. Postgres RLS for Multi-Tenancy

**Pattern:** Session-variable injection inside a transaction wrapper, NOT connection-pool roles.

The standard Supabase/Neon approach (switching Postgres roles per request) does not work with connection-pooled deployments like Railway. Instead, use a `set_config` session variable that RLS policies read via `current_setting()`.

```typescript
// server/lib/db.ts — RLS-aware transaction wrapper
export async function withTenant<T>(
  landlordId: string,
  fn: (tx: PgTransaction) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('app.current_landlord_id', ${landlordId}, true)`
    );
    try {
      return await fn(tx);
    } finally {
      await tx.execute(
        sql`select set_config('app.current_landlord_id', '', true)`
      );
    }
  });
}
```

```typescript
// server/db/schema/properties.ts — RLS policy on every tenant table
export const properties = pgTable('properties', {
  id: uuid().primaryKey().defaultRandom(),
  landlordId: uuid('landlord_id').notNull().references(() => landlords.id),
  name: text().notNull(),
  // ...
}, (t) => [
  pgPolicy('tenant_isolation', {
    as: 'permissive',
    for: 'all',
    using: sql`landlord_id = current_setting('app.current_landlord_id', true)::uuid`,
    withCheck: sql`landlord_id = current_setting('app.current_landlord_id', true)::uuid`,
  }),
]);
```

**Tables that require RLS policies:** `properties`, `units`, `tenants`, `leases`, `documents`, `onboarding_flows`, `onboarding_instances`, `onboarding_steps`, `rent_ledger_entries`, `messages`, `notifications`, `audit_log`.

**Tables that do NOT use RLS:** `landlords`, `webhook_events`, `invite_tokens` (these use application-level guards only; RLS on `landlords` itself would create a bootstrap paradox).

**Drizzle migration note:** `pgTable.withRLS()` enables RLS on the table at the DDL level (HIGH confidence, verified in Drizzle docs). Policies are colocated in the schema definition as `pgPolicy(...)` entries.

---

### 2. Hono API Structure in the Monorepo

**Directory layout:**

```
villuh/
  app/                        ← Next.js App Router
  server/                     ← Hono backend
    src/
      index.ts                ← Entry point: serve(app, { port: 3001 })
      app.ts                  ← Root Hono app, mounts all routes
      middleware/
        auth.ts               ← Better Auth session → c.set('user', ...)
        tenant.ts             ← withTenant() wrapper, sets RLS context
        rate-limit.ts
      routes/
        properties.ts         ← new Hono().get('/').post('/') etc.
        units.ts
        tenants.ts
        leases.ts
        documents.ts
        onboarding/
          flows.ts
          instances.ts
        rent/
          ledger.ts
        messages.ts
        uploads.ts            ← S3 presign endpoint
        billing.ts            ← Stripe subscription management
        webhooks/
          stripe.ts           ← /webhooks/stripe (raw body required)
          docusign.ts         ← /webhooks/docusign
          twilio.ts           ← /webhooks/twilio
          resend.ts           ← /webhooks/resend
      lib/
        db.ts                 ← Drizzle instance + withTenant()
        s3.ts                 ← S3 client + presign helpers
        stripe.ts             ← Stripe client
        docusign.ts           ← DocuSign API client
    package.json
    tsconfig.json
```

**Root app.ts — route mounting:**

```typescript
// server/src/app.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authMiddleware } from './middleware/auth'
import properties from './routes/properties'
import webhookStripe from './routes/webhooks/stripe'
// ...

const app = new Hono()

app.use('/api/*', cors({ origin: process.env.NEXT_PUBLIC_APP_URL }))
app.use('/api/*', authMiddleware)

app.route('/api/properties', properties)
app.route('/api/units', units)
// ... all authenticated routes

// Webhook routes: NO auth middleware, own signature verification
app.route('/webhooks/stripe', webhookStripe)
app.route('/webhooks/docusign', webhookStripe)

export default app
export type AppType = typeof app
```

**Hono RPC client in Next.js:**

```typescript
// lib/api.ts (Next.js side)
import { hc } from 'hono/client'
import type { AppType } from '../../server/src/app'

export const api = hc<AppType>(process.env.NEXT_PUBLIC_API_URL!)
```

This gives fully type-safe API calls from React Server Components and Client Components with no manual typing of fetch calls.

**Better Auth session middleware in Hono (verified pattern):**

```typescript
// server/src/middleware/auth.ts
import { auth } from '../lib/auth'

export const authMiddleware = createMiddleware<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null
    session: typeof auth.$Infer.Session.session | null
  }
}>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  c.set('user', session?.user ?? null)
  c.set('session', session?.session ?? null)
  await next()
})
```

Better Auth also handles its own routes: `app.on(['POST', 'GET'], '/api/auth/*', (c) => auth.handler(c.req.raw))`.

---

### 3. Onboarding Flow Engine

**Data model:**

```
onboarding_flows          — reusable template; locked when active
  └─ onboarding_flow_steps  — ordered steps, conditions_json, step_type, config_json

onboarding_instances      — one per tenant activation
  └─ onboarding_instance_steps  — runtime copy of steps; has status, completed_at, answer_json
```

**Why copy steps to instance:** The flow template must be lockable (immutable once active) while allowing the instance to carry runtime state per step. Copying on instance creation decouples template edits from in-flight onboarding.

**State machine per instance step:**

```
pending → active → completed
                 → failed (DocuSign declined, Stripe payment failed)
                 → skipped (condition evaluated false)
```

**Conditional branching:** `conditions_json` on each step is evaluated server-side before presenting the step to the tenant. Example structure:

```typescript
type StepCondition = {
  field: 'flow.variable' | 'tenant.field' | 'previous_step.answer'
  operator: 'eq' | 'neq' | 'exists' | 'not_exists'
  value: unknown
}
// Step is skipped if condition evaluates false
```

**Sequencing rule:** The Hono route that advances a step always:
1. Verifies the current step is `active` (no skipping ahead)
2. Validates step-type-specific data (DocuSign envelope ID, Stripe session ID, form answers)
3. Marks current step `completed`
4. Evaluates conditions on next step; marks it `active` (or `skipped` and recurse)
5. If no more steps: marks instance `completed`

**Flow lock:** When an instance is created from a flow, `onboarding_flows.locked_at` is set. All mutations to the flow are rejected while locked. Reset + re-trigger creates a new instance and clears the lock.

---

### 4. Webhook Handling Architecture

**Core principle:** Idempotency table + synchronous processing. No queue in v1 (per PROJECT.md decision).

**Schema:**

```typescript
export const webhookEvents = pgTable('webhook_events', {
  id: uuid().primaryKey().defaultRandom(),
  provider: text().notNull(),         // 'stripe' | 'docusign' | 'twilio' | 'resend'
  providerEventId: text().notNull(),  // stripe event.id, docusign eventId, etc.
  eventType: text().notNull(),
  payload: jsonb().notNull(),
  status: text().notNull().default('processing'), // 'processing' | 'processed' | 'failed'
  processedAt: timestamp(),
  error: text(),
  createdAt: timestamp().defaultNow().notNull(),
}, (t) => [
  unique().on(t.provider, t.providerEventId),
])
// No RLS on this table — app-level guard only
```

**Handler pattern (verified against Hono middleware docs):**

```typescript
// server/src/routes/webhooks/stripe.ts
const stripe = new Hono()

stripe.post('/', async (c) => {
  // 1. Consume raw body BEFORE any parsing (Stripe sig requires raw bytes)
  const rawBody = await c.req.text()
  const sig = c.req.header('stripe-signature')!

  // 2. Verify signature
  let event: Stripe.Event
  try {
    event = stripeClient.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)
  } catch {
    return c.json({ error: 'Invalid signature' }, 400)
  }

  // 3. Idempotency check
  const existing = await db.query.webhookEvents.findFirst({
    where: and(eq(webhookEvents.provider, 'stripe'), eq(webhookEvents.providerEventId, event.id))
  })
  if (existing?.status === 'processed') return c.json({ ok: true })

  // 4. Upsert processing record
  await db.insert(webhookEvents).values({
    provider: 'stripe',
    providerEventId: event.id,
    eventType: event.type,
    payload: event as unknown as Record<string, unknown>,
    status: 'processing',
  }).onConflictDoNothing()

  // 5. Handle event
  try {
    await handleStripeEvent(event)
    await db.update(webhookEvents)
      .set({ status: 'processed', processedAt: new Date() })
      .where(and(eq(webhookEvents.provider, 'stripe'), eq(webhookEvents.providerEventId, event.id)))
  } catch (err) {
    await db.update(webhookEvents)
      .set({ status: 'failed', error: String(err) })
      .where(and(eq(webhookEvents.provider, 'stripe'), eq(webhookEvents.providerEventId, event.id)))
    return c.json({ error: 'Processing failed' }, 500) // causes provider retry
  }

  return c.json({ ok: true })
})
```

**Provider-specific notes:**

| Provider | Signature Header | Verification Method | Key Event Types |
|----------|-----------------|---------------------|-----------------|
| Stripe (subscriptions) | `stripe-signature` | `stripe.webhooks.constructEvent()` | `customer.subscription.updated`, `invoice.payment_failed`, `checkout.session.completed` |
| Stripe Connect (deposits) | `stripe-signature` | Same, different webhook secret | `checkout.session.completed`, `payment_intent.succeeded` |
| DocuSign | HMAC header (Connect HMAC) | Node crypto HMAC verify | `envelope-completed`, `envelope-declined`, `envelope-voided` |
| Twilio | `X-Twilio-Signature` | `twilio.validateRequest()` | Inbound SMS, delivery status |
| Resend | `svix-id`, `svix-signature` | Svix webhook verify | `email.bounced`, `email.complained`, inbound events |

**Critical:** Stripe webhook routes must receive the **raw request body** before any JSON parsing. In Hono with Node.js, do NOT apply a JSON body parser middleware globally — apply it only to authenticated routes. Webhook routes call `c.req.text()` directly.

---

### 5. File Upload / Storage Pattern

**Pattern:** Server-presigned PUT URLs. The Hono server never handles binary data.

**S3 key naming convention:**

```
{landlordId}/{resourceType}/{resourceId}/{filename}-{nanoid}.{ext}
```

Examples:
- `landlord_abc/properties/prop_xyz/exterior-nj4k2.jpg`
- `landlord_abc/documents/doc_xyz/lease-2024-nj4k2.pdf`
- `landlord_abc/tenants/tenant_xyz/id-nj4k2.png`

**Presign endpoint:**

```typescript
// POST /api/uploads/presign
// Body: { resourceType, resourceId, filename, contentType, contentLength }
// Returns: { uploadUrl, objectKey, expiresAt }

const presign = new Hono()
presign.post('/', authMiddleware, async (c) => {
  const user = c.get('user')!
  const { resourceType, resourceId, filename, contentType, contentLength } = await c.req.json()

  // Validate: content type allowlist, size limit (e.g. 50MB for docs, 10MB for images)
  // Validate: landlord owns resourceId (RLS-safe check)

  const objectKey = `${user.landlordId}/${resourceType}/${resourceId}/${slug(filename)}-${nanoid(8)}.${ext(filename)}`
  
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: objectKey,
    ContentType: contentType,
    ContentLength: contentLength,
  })
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 })

  return c.json({ uploadUrl, objectKey, expiresAt: Date.now() + 900_000 })
})
```

**Download/preview:** Store only the `objectKey` in the database. Generate presigned GET URLs on-demand (15-minute expiry) — never store permanent S3 URLs in the database. This allows bucket migration and enforces access control at generation time.

**DocuSign signed PDFs:** DocuSign delivers the signed envelope PDF via their Connect webhook or API download. The Hono webhook handler downloads the PDF from DocuSign and uploads it to S3, storing the `objectKey` on the document record. Tenants access it via a presigned GET URL through the Hono API.

---

## Build Order (Phase Dependencies)

This is the critical sequencing — each phase builds on the layer below.

```
Phase 1: Infrastructure Foundation
  ├─ Hono server scaffold (server/ directory, Railway config)
  ├─ Postgres + Drizzle setup (schema, migrations)
  ├─ RLS infrastructure (app role, set_config wrapper, withTenant())
  ├─ Better Auth integration (Hono middleware + Next.js proxy)
  └─ Shared types / Hono RPC client in Next.js
  WHY FIRST: Everything else depends on auth + DB connection + RLS working

Phase 2: Landlord Core (Auth + Billing)
  ├─ Landlord signup/login (Better Auth organization plugin)
  ├─ Role/permission model (Better Auth AC plugin)
  ├─ Stripe Subscriptions (plan tiers, usage metering)
  ├─ Onboarding wizard (property → unit → tenant shell)
  └─ Audit log table + CDC triggers
  WHY SECOND: Plan limits gate every other feature; audit is cross-cutting

Phase 3: Properties + Units
  ├─ CRUD for properties, units
  ├─ S3 presign setup (property images)
  ├─ Rent history + tenant history tables
  └─ Custom tags, availability statuses
  WHY THIRD: Tenant + lease entities reference unit_id; must exist first

Phase 4: Tenants + Lease + Documents
  ├─ Tenant profiles, co-tenants
  ├─ Lease entity + activation modes
  ├─ DocuSign integration (OAuth setup, envelope create/send/void)
  ├─ Document lifecycle state machine
  ├─ S3 signed PDF storage
  └─ Activity timeline
  WHY FOURTH: Onboarding flow requires documents and lease concepts

Phase 5: Onboarding Flow Engine
  ├─ Flow builder (step types, conditions_json, template CRUD)
  ├─ Flow instance creation (copy steps, set active)
  ├─ Tenant invite system (magic links, expiry)
  ├─ Invite page (Next.js public route, step renderer)
  ├─ DocuSign webhook → step advance
  ├─ Stripe Connect onboarding + payment step
  └─ Flow preview mode
  WHY FIFTH: Depends on DocuSign (Phase 4), Stripe Connect, tenant + lease

Phase 6: Rent Ledger
  ├─ Auto-generate monthly entries (Railway Cron endpoint)
  ├─ Manual payment recording
  ├─ Partial payments, late fees
  ├─ Ledger adjustments
  └─ Grace period + overdue cron
  WHY SIXTH: Requires active leases (Phase 4); no upstream flow deps

Phase 7: Communications
  ├─ Resend email + Twilio SMS send
  ├─ Webhook receivers (inbound routing TBD)
  ├─ Message templates
  ├─ Claude AI drafting
  ├─ In-app notifications
  └─ Bulk send, opt-out handling
  WHY SEVENTH: Independent of ledger; can be parallel but comms routing is TBD

Phase 8: Reporting + Search + Polish
  ├─ Financial reports page
  ├─ Global search (Postgres full-text or pg_trgm)
  ├─ Operator admin panel
  └─ CSV import wizard + full export
  WHY LAST: Reads from completed data model; no other features depend on it
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Tenant ID in WHERE clauses instead of RLS

**What:** Passing `WHERE landlord_id = $1` manually in every Drizzle query instead of using `set_config` + RLS policies.

**Why bad:** One missed WHERE clause = cross-tenant data leak. RLS enforced at DB layer cannot be bypassed by application bugs.

**Instead:** Use the `withTenant()` wrapper. All queries inside the wrapper automatically enforce isolation via `current_setting('app.current_landlord_id')`. Application code never writes `WHERE landlord_id =`.

---

### Anti-Pattern 2: Global JSON body parser on Webhook Routes

**What:** Applying `app.use('*', bodyParser())` globally in Hono.

**Why bad:** Stripe (and DocuSign) webhook signature verification requires the raw request body bytes. If a JSON parser has already consumed and re-serialized the body, the HMAC will not match.

**Instead:** Do not apply a global body parser. Webhook routes call `c.req.text()` directly. Authenticated API routes use `c.req.json()` inline or a scoped middleware.

---

### Anti-Pattern 3: Storing S3 Pre-Signed URLs in the Database

**What:** Generating a presigned GET URL and saving it to the `documents.url` column.

**Why bad:** Presigned URLs expire. Stored URLs break after 15 minutes. The URL embeds AWS credentials that rotate.

**Instead:** Store only the `objectKey` (e.g., `landlord_abc/documents/doc_xyz/lease.pdf`). Generate presigned GET URLs at request time in the Hono route that serves document metadata.

---

### Anti-Pattern 4: Separate Auth Session Stores for Hono and Next.js

**What:** Running two separate Better Auth instances with different database connections.

**Why bad:** Session state diverges. Cookies may not be valid across both services.

**Instead:** Better Auth is initialized once in `server/src/lib/auth.ts`. Next.js calls `auth.api.getSession({ headers: await headers() })` for server-side session reads. Hono mounts `auth.handler` at `/api/auth/*`. Both share the same Postgres session table.

---

### Anti-Pattern 5: Running Onboarding Step Transitions Client-Side

**What:** Advancing `step.status` directly from browser fetch calls without server-side state validation.

**Why bad:** A tenant could skip steps, mark payment steps as complete without actually paying, or advance a DocuSign step before the envelope is signed.

**Instead:** All step advancement goes through Hono. The Hono handler validates the step precondition (DocuSign envelope status from their API, Stripe checkout session `payment_status`, etc.) before marking the step complete.

---

## Scalability Considerations

| Concern | At 1K landlords | At 10K landlords | Notes |
|---------|----------------|-----------------|-------|
| RLS overhead | Negligible | Negligible | `current_setting()` is fast; `landlord_id` index on every tenant table is mandatory |
| Webhook volume | Synchronous fine | May need queue | Stripe/DocuSign events are low frequency; revisit if >1K events/min |
| S3 presign latency | Sub-100ms | Sub-100ms | Presign is pure crypto; no S3 network call needed |
| Connection pooling | PgBouncer on Railway | PgBouncer essential | `set_config` with `TRUE` (transaction-scoped) is compatible with PgBouncer transaction mode |
| Hono process | Single Railway service | Horizontal scale fine | Hono is stateless; session in DB; no sticky sessions needed |

**Note on `set_config` and PgBouncer:** The third argument `true` in `set_config('app.current_landlord_id', value, true)` makes the setting transaction-local (resets on transaction end). This is compatible with PgBouncer in transaction-pooling mode. Do NOT use `false` (session-scoped) — that would leak tenant context across connections.

---

## Sources

- Drizzle ORM RLS docs: https://orm.drizzle.team/docs/rls — HIGH confidence (official docs, verified via Context7)
- Hono routing + sub-apps: https://hono.dev/docs — HIGH confidence (official docs, verified via Context7)
- Better Auth Hono integration: https://www.better-auth.com/docs/integrations/hono — HIGH confidence (official docs, verified via Context7)
- Better Auth organization plugin: https://www.better-auth.com/docs/plugins/organization — HIGH confidence
- `set_config` + PgBouncer compatibility: documented in Postgres `set_config()` reference — MEDIUM confidence (standard Postgres behavior, not verified against Railway-specific PgBouncer config)
- DocuSign Connect HMAC verification: LOW confidence on exact header name — verify in DocuSign Connect docs during Phase 4
