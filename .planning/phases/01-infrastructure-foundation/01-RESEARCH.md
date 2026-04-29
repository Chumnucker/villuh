# Phase 1: Infrastructure Foundation — Research

**Researched:** 2026-04-29
**Domain:** pnpm monorepo wiring, Hono + Node.js API scaffold, Drizzle + postgres RLS, Postgres CDC audit log, codebase cleanup
**Confidence:** HIGH (all stack versions verified against npm registry; all API patterns verified against official docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D1: Monorepo Layout**
pnpm workspace with `packages/` directory containing three packages: `packages/web` (Next.js), `packages/server` (Hono), `packages/db` (Drizzle schema + migrations).
- DB package name: `@villuh/db` — imported by both web and server
- Existing Next.js app code moves into `packages/web/` (existing root-level `app/`, `components/`, `modules/`, `public/` relocate there)
- Task runner: plain `pnpm -r` / `pnpm --filter` scripts — no Turborepo or Nx in Phase 1
- Root `package.json` declares `workspaces: ["packages/*"]`
- Each package has its own `tsconfig.json`; root tsconfig extends shared base

**D2: Audit Log Mechanism**
Postgres triggers write to an `audit_log` table on every INSERT/UPDATE/DELETE to all tenant-isolated tables.
- Full row snapshot: both `old_values` and `new_values` as JSONB
- Coverage: all tenant-isolated tables from day 1
- Actor: `current_setting('app.current_user_id', true)` set via `SET LOCAL`. Cron/system jobs use sentinel `'system'`
- RLS on `audit_log`: landlords can only read their own audit rows
- Immutability: second trigger prevents UPDATE and DELETE on `audit_log` rows
- Migration strategy: raw SQL in a Drizzle migration file (not Drizzle schema API)
- Partitioning: monthly range partitions from day 1; no auto-purge in Phase 1
- Integration test: vitest + local Postgres via `DATABASE_TEST_URL`

**D3: Icon Library**
`@central-icons-react/all` is the sole icon library. `lucide-react` is removed entirely in Phase 1.
- `PlatformIcon` wrapper in `modules/common/ui/icon.tsx` stays
- Audit all `lucide-react` imports, replace with `@central-icons-react` equivalents via `PlatformIcon`, then remove `lucide-react`
- If a needed icon has no equivalent, add fallback to `PlatformIcon` and document the gap

**D4: Railway + CI Scope**
No CI pipeline and no Railway deployment in Phase 1.
- CI deferred to Phase 2
- Railway service + Postgres deferred to Phase 2
- Phase 1 validation is entirely local
- Node 22 LTS required; `.nvmrc` must be created in Phase 1

### Claude's Discretion

None specified — all Phase 1 decisions are locked.

### Deferred Ideas (OUT OF SCOPE)

- Turborepo / Nx (plain pnpm scripts sufficient)
- GitHub Actions CI (deferred to Phase 2)
- Railway deployment (deferred to Phase 2)
- Audit log retention policy / automatic purging (no purging in Phase 1)
- DocuSign developer account setup (Phase 4 prerequisite — schedule independently)
</user_constraints>

---

## Summary

Phase 1 creates the structural foundation that every subsequent phase builds on. There are four work streams: (1) convert the repo from a single Next.js app into a pnpm workspace monorepo, (2) scaffold the Hono API server in `packages/server` with a working health-check route and type-safe RPC client wiring to Next.js, (3) set up the Drizzle + postgres driver with the `villuh_app` non-owner role, RLS policies, and the `withTenant()` transaction wrapper — verified by a cross-tenant isolation integration test, and (4) run the cleanup checklist (Toaster, icon consolidation, `.nvmrc`, `.gitignore` hardening).

The RLS infrastructure is the single highest-risk item in Phase 1. If the app runs as the database owner role (which is the default), every RLS policy is silently bypassed. The correct setup requires creating a `villuh_app` Postgres role that is NOT the table owner, two separate connection strings (`DATABASE_URL` for migrations as owner, `DATABASE_APP_URL` for the Hono runtime as `villuh_app`), and a `withTenant(landlordId, fn)` wrapper that runs `SET LOCAL app.current_landlord_id` inside every transaction. An integration test must confirm this is working — the phase is not complete without it.

The audit log is the second highest-priority item. Retrofitting CDC triggers across all tables after data has been written is expensive and risky; the pattern must be established in Phase 1 even though there is only one table to demonstrate it against (a placeholder `landlords` table or similar). Triggers and partitioning cannot be expressed in Drizzle's TypeScript schema DSL and must live in raw SQL migration files.

**Primary recommendation:** Execute monorepo migration first (it unblocks everything else), then Hono scaffold, then DB + RLS (requires local Postgres), then audit log, then cleanup. The cleanup tasks (icon audit, Toaster) are low-risk and can slot in wherever they fit.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Monorepo structure | Build tooling (pnpm) | — | Root-level concern; affects all tiers equally |
| Hono API scaffold + health check | Backend (Hono/Railway) | — | All mutations and business logic live in Hono |
| Type-safe RPC wiring | Frontend (Next.js) + Backend | — | `hono/client` bridges both tiers; types live in `packages/server` |
| Postgres role creation (`villuh_app`) | Database | — | DB-layer enforcement; must precede all table creation |
| Drizzle schema + migrations | Database | Build tooling | Schema in `packages/db`; consumed by both server and future tooling |
| RLS policies (`withTenant` wrapper) | Database + Backend (Hono) | — | DB enforces; Hono middleware triggers via `SET LOCAL` |
| Audit log triggers | Database | — | Must fire at DB layer, not app layer — triggers catch direct SQL too |
| RLS cross-tenant integration test | Database + Build tooling | — | Validates DB enforcement, not Hono middleware |
| Toaster mount | Frontend (Next.js) | — | Root layout; frontend concern only |
| Icon library consolidation | Frontend (Next.js) | — | UI components in `packages/web/modules/` |
| `.nvmrc` + `.gitignore` hardening | Build tooling | — | Repo-level, not tier-specific |

---

## Standard Stack

### Core (Phase 1 Only)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pnpm workspaces | 10.14.0 (pnpm already installed) | Monorepo package management | Zero-config workspace resolution; already installed on this machine [VERIFIED: `pnpm --version`] |
| hono | 4.12.15 | HTTP server, routing, middleware | Locked decision; Web Standards-based, native TypeScript RPC [VERIFIED: npm registry] |
| @hono/node-server | 2.0.0 | Node.js HTTP adapter | Required to run Hono on Node.js; peer dep `hono ^4` [VERIFIED: npm registry] |
| drizzle-orm | 0.45.2 | ORM, schema definition, query builder | Locked decision; exposes raw SQL for RLS `SET LOCAL` [VERIFIED: npm registry] |
| drizzle-kit | 0.31.10 | Migration CLI | Generates and applies SQL migration files [VERIFIED: npm registry] |
| postgres (porsager) | 3.4.9 | Postgres driver | Locked decision; fully Promise-based, preferred in Drizzle docs [VERIFIED: npm registry] |
| zod | 4.3.6 | Schema validation | Locked decision; `@hono/zod-validator` 0.7.6 supports `^4.0.0` [VERIFIED: npm registry] |
| @hono/zod-validator | 0.7.6 | Request validation middleware | Integrates Zod into Hono route definitions [VERIFIED: npm registry] |
| tsx | 4.21.0 | TypeScript runtime (dev + Railway) | Runs `.ts` files directly via esbuild; no compile step [VERIFIED: npm registry] |
| vitest | 4.1.5 | Test framework (integration tests) | Required for D2 cross-tenant isolation test [VERIFIED: npm registry] |
| pino | 10.3.1 | Structured JSON logging | Fastest Node.js logger; works with Railway log aggregation [VERIFIED: npm registry] |
| pino-http | latest | HTTP request logging middleware | Pairs with pino for automatic request/response logs [ASSUMED] |
| @central-icons-react/all | 1.1.215 | Icon library | Locked decision (D3); already installed [VERIFIED: existing package.json] |

### Phase 1 Installation

```bash
# packages/server
pnpm add hono @hono/node-server @hono/zod-validator zod pino pino-http
pnpm add -D tsx drizzle-kit

# packages/db
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit tsx

# packages/web — remove lucide-react, keep existing deps
pnpm remove lucide-react
```

**Version verification (confirmed against npm registry 2026-04-29):**
```
hono:              4.12.15
@hono/node-server: 2.0.0
@hono/zod-validator: 0.7.6
drizzle-orm:       0.45.2
drizzle-kit:       0.31.10
postgres:          3.4.9
zod:               4.3.6
tsx:               4.21.0
vitest:            4.1.5
pino:              10.3.1
```

---

## Architecture Patterns

### System Architecture Diagram

```
Monorepo Root (villuh/)
│
├── packages/web/          [Next.js — Vercel]
│   app/layout.tsx
│   └── hc<AppType>(HONO_URL)  ──────────────────────────────►  packages/server/
│       └── cookies forwarded                                          │
│                                                              Hono middleware stack
│                                                              ┌───────────────────┐
│                                                              │ CORS              │
│                                                              │ auth.api.getSession│
│                                                              │ withTenant()      │
│                                                              │   SET LOCAL       │
│                                                              │   app.current_    │
│                                                              │   landlord_id     │
│                                                              └────────┬──────────┘
│                                                                       │
│                                                              Route handlers
│                                                              (GET /health, ...)
│                                                                       │
│                                                                       ▼
│                                                              packages/db/
│                                                              Drizzle query
│                                                                       │
│                                                                       ▼
│                                                              Postgres (local dev)
│                                                              villuh_app role
│                                                              RLS policy enforced
│                                                              ──────────────────
│                                                              current_setting(
│                                                               'app.current_landlord_id'
│                                                              )::uuid
```

### Recommended Project Structure

```
villuh/                          ← monorepo root
├── .nvmrc                       ← "22" (Node 22 LTS)
├── pnpm-workspace.yaml          ← workspaces: ["packages/*"]
├── package.json                 ← root: workspaces, shared scripts
├── tsconfig.base.json           ← shared compiler options
├── packages/
│   ├── web/                     ← Next.js (moved from root app/, modules/, etc.)
│   │   ├── package.json         ← name: "@villuh/web"
│   │   ├── tsconfig.json        ← extends ../../tsconfig.base.json
│   │   ├── next.config.mjs
│   │   ├── app/                 ← moved from root app/
│   │   ├── modules/             ← moved from root modules/
│   │   ├── lib/                 ← moved from root lib/
│   │   ├── hooks/               ← moved from root hooks/
│   │   └── public/              ← moved from root public/
│   │
│   ├── server/                  ← Hono backend
│   │   ├── package.json         ← name: "@villuh/server"
│   │   ├── tsconfig.json        ← extends ../../tsconfig.base.json
│   │   └── src/
│   │       ├── index.ts         ← serve(app, { port: 3001 })
│   │       ├── app.ts           ← root Hono app, AppType export
│   │       ├── middleware/
│   │       │   ├── auth.ts      ← Better Auth session → c.set('user', ...)
│   │       │   └── tenant.ts   ← withTenant() SET LOCAL wrapper
│   │       └── routes/
│   │           ├── health.ts    ← GET /health → { ok: true }
│   │           └── webhooks/    ← placeholder stubs only in Phase 1
│   │
│   └── db/                      ← Drizzle schema + migrations
│       ├── package.json         ← name: "@villuh/db"
│       ├── tsconfig.json        ← extends ../../tsconfig.base.json
│       ├── drizzle.config.ts    ← uses DATABASE_URL (owner)
│       ├── src/
│       │   ├── index.ts         ← exports db instance (DATABASE_APP_URL)
│       │   ├── schema/
│       │   │   ├── index.ts     ← re-exports all tables
│       │   │   └── landlords.ts ← demo table for RLS + audit log
│       │   └── migrate.ts       ← programmatic migrate() runner
│       └── migrations/          ← generated SQL + raw SQL for triggers
│           ├── 0000_initial.sql
│           └── 0001_audit_log.sql
```

### Pattern 1: Hono Server Entry Point

**What:** Minimal Hono app on Node.js with health-check route and exported `AppType`
**When to use:** Phase 1 scaffold — this is the permanent structural pattern

```typescript
// packages/server/src/index.ts
// Source: https://hono.dev/docs/getting-started/nodejs
import { serve } from '@hono/node-server'
import app from './app'

const server = serve({
  fetch: app.fetch,
  port: Number(process.env.PORT ?? 3001),
})

process.on('SIGINT', () => { server.close(); process.exit(0) })
process.on('SIGTERM', () => { server.close(); process.exit(0) })

console.log(`Hono server running on port ${process.env.PORT ?? 3001}`)
```

```typescript
// packages/server/src/app.ts
// Source: https://hono.dev/docs/guides/rpc (AppType export pattern)
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { health } from './routes/health'

const app = new Hono()

app.use('/api/*', cors({ origin: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000' }))

const routes = app
  .route('/api', health)

export default app
export type AppType = typeof routes
```

```typescript
// packages/server/src/routes/health.ts
import { Hono } from 'hono'

export const health = new Hono()
  .get('/health', (c) => c.json({ ok: true, ts: Date.now() }))
```

### Pattern 2: Hono RPC Client in Next.js

**What:** Type-safe API client using the exported `AppType`
**When to use:** Anywhere Next.js calls the Hono backend

```typescript
// packages/web/lib/api.ts
// Source: https://hono.dev/docs/guides/rpc
import { hc } from 'hono/client'
import type { AppType } from '@villuh/server/app'

export const api = hc<AppType>(process.env.NEXT_PUBLIC_API_URL!)
// Usage: const res = await api.api.health.$get()
```

**Critical requirement:** Both `packages/web/tsconfig.json` and `packages/server/tsconfig.json` must have `"strict": true` for type inference to work correctly. [VERIFIED: Hono RPC docs]

### Pattern 3: Drizzle + postgres (porsager) Setup

**What:** Two separate clients — owner (migrations) and restricted (runtime)
**When to use:** This is the permanent DB connection pattern

```typescript
// packages/db/src/index.ts — runtime client (villuh_app role)
// Source: https://orm.drizzle.team/docs/get-started-postgresql
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const queryClient = postgres(process.env.DATABASE_APP_URL!)
export const db = drizzle({ client: queryClient, schema })
```

```typescript
// packages/db/src/migrate.ts — migration client (owner role, max:1)
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

const migrationClient = postgres(process.env.DATABASE_URL!, { max: 1 })
const migrationDb = drizzle({ client: migrationClient })

await migrate(migrationDb, { migrationsFolder: './migrations' })
await migrationClient.end()
```

```typescript
// packages/db/drizzle.config.ts — uses DATABASE_URL (owner)
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema',
  out: './migrations',
  dbCredentials: { url: process.env.DATABASE_URL! },
  entities: { roles: true },  // allows pgRole() in schema
})
```

### Pattern 4: Drizzle RLS Table Definition

**What:** Table with RLS enabled and a permissive isolation policy
**When to use:** Every tenant-isolated table

```typescript
// packages/db/src/schema/landlords.ts
// Source: https://orm.drizzle.team/docs/rls [VERIFIED]
import { sql } from 'drizzle-orm'
import { pgTable, pgPolicy, pgRole, uuid, text, timestamptz } from 'drizzle-orm/pg-core'

// Define the app role (existing in DB — mark as .existing())
export const villuhApp = pgRole('villuh_app').existing()

// Example tenant table with RLS
// Note: 'landlords' itself does NOT get RLS (bootstrap paradox)
// Phase 1 uses a placeholder tenant table for the integration test demo
export const testTenantData = pgTable('test_tenant_data', {
  id: uuid('id').primaryKey().defaultRandom(),
  landlordId: uuid('landlord_id').notNull(),
  data: text('data'),
  createdAt: timestamptz('created_at').defaultNow().notNull(),
}, (t) => [
  pgPolicy('tenant_isolation', {
    as: 'permissive',
    for: 'all',
    to: villuhApp,
    using: sql`landlord_id = current_setting('app.current_landlord_id', true)::uuid`,
    withCheck: sql`landlord_id = current_setting('app.current_landlord_id', true)::uuid`,
  }),
])
```

**Note on `pgTable.withRLS()` vs `enableRLS()`:** The official Drizzle RLS docs (verified 2026-04-29) use `pgTable.withRLS()` as the current API. The older `.enableRLS()` method is deprecated. Policies colocate in the table definition as `pgPolicy(...)` entries in the table's constraint array. [VERIFIED: https://orm.drizzle.team/docs/rls]

### Pattern 5: withTenant() Transaction Wrapper

**What:** Sets `app.current_landlord_id` for RLS + optionally `app.current_user_id` for audit log actor
**When to use:** Every authenticated Hono route handler that touches tenant data

```typescript
// packages/server/src/lib/db.ts
// Source: Verified pattern combining Drizzle tx API + Postgres set_config
import { db } from '@villuh/db'
import { sql } from 'drizzle-orm'

export async function withTenant<T>(
  landlordId: string,
  actorId: string,
  fn: (tx: typeof db) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('app.current_landlord_id', ${landlordId}, TRUE)`
    )
    await tx.execute(
      sql`SELECT set_config('app.current_user_id', ${actorId}, TRUE)`
    )
    try {
      return await fn(tx as unknown as typeof db)
    } finally {
      // set_config with TRUE = transaction-local; resets automatically on tx end
      // The finally block is defensive cleanup — not strictly necessary with TRUE
    }
  })
}
```

**Critical:** `set_config(..., TRUE)` makes the setting transaction-local. This is compatible with PgBouncer transaction-mode pooling. Do NOT use `FALSE` (session-scoped) — that leaks tenant context across pooled connections. [VERIFIED: Postgres set_config docs, ARCHITECTURE.md]

### Pattern 6: Audit Log — Raw SQL Migration

**What:** Postgres trigger function + per-table triggers via raw SQL migration file
**When to use:** Cannot be expressed in Drizzle's TypeScript schema DSL — must be raw SQL

```sql
-- packages/db/migrations/0001_audit_log.sql

-- 1. Create audit_log table with monthly partitioning
CREATE TABLE audit_log (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  landlord_id uuid NOT NULL,
  table_name  text NOT NULL,
  row_id      uuid NOT NULL,
  operation   text NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values  jsonb,
  new_values  jsonb,
  actor_id    text NOT NULL DEFAULT 'system',
  created_at  timestamptz NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);

-- 2. Create initial partition (current month + next month)
CREATE TABLE audit_log_y2026m04 PARTITION OF audit_log
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE audit_log_y2026m05 PARTITION OF audit_log
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

-- 3. Enable RLS on the partitioned table
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_log_tenant_isolation ON audit_log
  AS PERMISSIVE FOR SELECT
  TO villuh_app
  USING (landlord_id = current_setting('app.current_landlord_id', TRUE)::uuid);

-- 4. Trigger function: write audit row
CREATE OR REPLACE FUNCTION audit_log_trigger_fn()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (landlord_id, table_name, row_id, operation, old_values, new_values, actor_id)
  VALUES (
    COALESCE(
      (CASE TG_OP WHEN 'DELETE' THEN OLD.landlord_id ELSE NEW.landlord_id END),
      '00000000-0000-0000-0000-000000000000'::uuid
    ),
    TG_TABLE_NAME,
    COALESCE(
      (CASE TG_OP WHEN 'DELETE' THEN OLD.id ELSE NEW.id END)
    ),
    TG_OP,
    CASE TG_OP WHEN 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE TG_OP WHEN 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    current_setting('app.current_user_id', TRUE)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Immutability trigger: prevent UPDATE/DELETE on audit_log
CREATE OR REPLACE FUNCTION audit_log_immutable_fn()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log rows are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_immutable
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable_fn();

-- 6. Attach audit trigger to the demo/test table
CREATE TRIGGER test_tenant_data_audit
  AFTER INSERT OR UPDATE OR DELETE ON test_tenant_data
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger_fn();
```

**CRITICAL:** When Drizzle Kit generates migration 0001, it won't know about the raw SQL. Either (a) write this as a standalone file and call `db.execute(sql.raw(fs.readFileSync(...)))` from a seed/setup script, or (b) rely on `drizzle-kit migrate` recognizing `.sql` files that weren't auto-generated. The safest pattern is: generate a blank Drizzle migration with `drizzle-kit generate`, then manually add the raw SQL to that migration file. Drizzle Kit preserves manually-edited migration SQL. [ASSUMED — verify behavior with drizzle-kit 0.31.10]

### Pattern 7: Better Auth in Hono (Phase 1 stub — full auth deferred to Phase 2)

**What:** Mount Better Auth handler so the route exists; session middleware wired but not functional until Phase 2
**When to use:** Hono app.ts needs the auth route to exist for RPC type safety

```typescript
// packages/server/src/middleware/auth.ts
// Source: https://www.better-auth.com/docs/integrations/hono [VERIFIED]
import { createMiddleware } from 'hono/factory'
// NOTE: auth is initialized in Phase 2 with full Better Auth config
// Phase 1: stub middleware that sets user to null
export const authMiddleware = createMiddleware(async (c, next) => {
  c.set('user', null)
  c.set('session', null)
  await next()
})
```

**Phase 2 note:** Full Better Auth initialization with `drizzleAdapter(db, { provider: 'pg' })` happens in Phase 2. Phase 1 only needs the stub to compile the monorepo. The import path for the Drizzle adapter is `better-auth/adapters/drizzle`. [VERIFIED: Better Auth installation docs]

### Pattern 8: pnpm Workspace Configuration

**What:** Root-level workspace config files
**When to use:** Monorepo initialization

```yaml
# pnpm-workspace.yaml (root)
packages:
  - "packages/*"
```

```json
// package.json (root) — key fields
{
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "dev": "pnpm --filter @villuh/web dev & pnpm --filter @villuh/server dev",
    "dev:web": "pnpm --filter @villuh/web dev",
    "dev:server": "pnpm --filter @villuh/server dev",
    "typecheck": "pnpm -r typecheck",
    "migrate": "pnpm --filter @villuh/db migrate"
  }
}
```

```json
// packages/web/package.json — key fields
{
  "name": "@villuh/web",
  "dependencies": {
    "@villuh/db": "workspace:*"
  }
}
```

```json
// packages/server/package.json — key fields
{
  "name": "@villuh/server",
  "main": "src/app.ts",
  "exports": { ".": "./src/app.ts", "./app": "./src/app.ts" },
  "dependencies": {
    "@villuh/db": "workspace:*"
  }
}
```

**Path alias update required:** After moving Next.js into `packages/web/`, the `@/*` alias in `tsconfig.json` must point to `packages/web/` (currently it points to the root `.`). The `paths` entry should be `"@/*": ["./*"]` relative to `packages/web/`, which means no change to the alias itself — just that the `tsconfig.json` lives in `packages/web/`.

### Anti-Patterns to Avoid

- **Running migrations as `villuh_app`:** `villuh_app` lacks `CREATE TABLE` / `ALTER TABLE` permissions. Migration must use the owner connection (`DATABASE_URL`). The Hono server must use `DATABASE_APP_URL`.
- **Single `DATABASE_URL` for both:** Any route that uses the owner role at runtime means RLS is silently bypassed for that request. Two env vars, two Drizzle clients, no exceptions.
- **`set_config(..., FALSE)` (session-scoped):** With PgBouncer transaction-mode pooling (Railway), session-scoped variables persist across connection reuse and leak tenant context. Always use `TRUE`.
- **Global JSON body parser on Hono:** `app.use('*', jsonMiddleware())` would break future Stripe/DocuSign webhook signature verification. Do not add it — even in Phase 1 when there are no webhooks yet.
- **Drizzle schema for triggers/partitioning:** `pgTable` DSL cannot express trigger functions, `AFTER INSERT OR UPDATE OR DELETE` triggers, or `PARTITION BY RANGE`. These must be raw SQL in migration files.
- **Storing pre-signed S3 URLs:** Not relevant in Phase 1 (no S3), but the schema pattern is established here — never add a URL column type. [ASSUMED for Phase 1 guidance purposes]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Request validation | Custom type guards | `@hono/zod-validator` + Zod 4 | Handles request shape, coercion, error responses |
| Structured logging | `console.log` wrappers | pino + pino-http | Structured JSON, Railway-compatible, async-safe |
| TypeScript `.ts` execution | Custom build step | `tsx` | esbuild-based, fast, no tsc compile step needed |
| DB migrations | Custom SQL runner | `drizzle-kit migrate` | Tracks applied migrations, handles ordering |
| Cross-tenant isolation | `WHERE landlord_id = $1` in every query | Postgres RLS + `withTenant()` | One missed clause = data leak; DB layer can't be bypassed |
| Audit trail writes | Manual `INSERT INTO audit_log` in every service | Postgres triggers | Triggers fire even for direct SQL; can't be skipped by app code |

**Key insight:** In multi-tenant SaaS, application-layer data isolation is a security anti-pattern. Every custom guard is a potential bypass. Postgres RLS at the DB layer is the correct primitive.

---

## Runtime State Inventory

> Phase 1 is a greenfield scaffold phase. No existing backend, no stored runtime state. Confirmed by codebase inspection.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | None — no backend DB exists yet | None |
| Live service config | None — no Railway/Postgres deployed yet | None |
| OS-registered state | None | None |
| Secrets/env vars | No `.env` files found in repo | Create `.env.local` in Phase 1 for local Postgres credentials |
| Build artifacts | `packages/` directory does not exist yet | Monorepo scaffold creates it |

**Note on `.vscode/github-accounts.json`:** This file IS NOT currently tracked by git (`git ls-files` confirms `.vscode/` shows as untracked `??`). The `.vscode/.gitignore` already excludes it (`github-accounts.json`). The CONTEXT.md cleanup task of "remove from version control" is already done — the file was never committed. The remaining task is to add `.vscode/github-accounts.json` to the ROOT `.gitignore` to prevent accidental future staging. [VERIFIED: `git ls-files` + `.vscode/.gitignore` content]

---

## Common Pitfalls

### Pitfall 1: villuh_app Role Not Created Before First Migration

**What goes wrong:** `drizzle-kit migrate` runs against a fresh Postgres instance as the owner. If `villuh_app` role doesn't exist when Drizzle migrations run, the `pgPolicy(..., { to: villuhApp })` and `pgRole('villuh_app').existing()` references in the schema will cause migration failures — or worse, succeed without creating the policies correctly.

**Why it happens:** The Postgres role must be created as a prerequisite, outside of Drizzle migrations, because Drizzle does not execute `CREATE ROLE` DDL by default (even with `entities: { roles: true }` in drizzle.config.ts — that config controls whether Drizzle DETECTS roles, not whether it creates non-schema roles).

**How to avoid:** Create a `packages/db/scripts/bootstrap-db.sql` that runs as the postgres superuser before any migrations:
```sql
CREATE ROLE villuh_app NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT LOGIN PASSWORD 'changeme';
GRANT CONNECT ON DATABASE villuh TO villuh_app;
-- After tables exist:
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO villuh_app;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO villuh_app;
```

**Warning signs:** Any Drizzle error mentioning "role does not exist" during migration. Policies applying but queries returning all rows regardless of `SET LOCAL`.

---

### Pitfall 2: pnpm Workspace Path Aliases Break After Move

**What goes wrong:** Existing Next.js code uses `@/*` as an alias mapping to the root directory (where `tsconfig.json` `baseUrl: "."` and `paths: { "@/*": ["./*"] }` live). After moving `app/`, `modules/`, `lib/`, etc. into `packages/web/`, the same import `@/lib/utils` still resolves to the ROOT of the repo, not `packages/web/lib/utils`. TypeScript errors cascade.

**Why it happens:** `tsconfig.json` in the root currently has `"baseUrl": "."`. When `packages/web/tsconfig.json` extends the root config without overriding `baseUrl`, the alias still points at the monorepo root.

**How to avoid:** `packages/web/tsconfig.json` must explicitly set `"baseUrl": "."` (relative to its own location, not the root) and `"paths": { "@/*": ["./*"] }`. Also update `next.config.mjs` to move to `packages/web/next.config.mjs` with no path changes needed since Next.js resolves relative to its config file.

**Warning signs:** TypeScript cannot find `@/lib/utils` after the move. `next dev` shows module resolution errors.

---

### Pitfall 3: Drizzle Migration Ordering — Raw SQL Must Be Numbered Correctly

**What goes wrong:** The audit log requires raw SQL for triggers and partitioning. Drizzle Kit auto-generates migration filenames with timestamps. If the hand-written audit log SQL is added to the wrong migration file or as a separate un-numbered file, Drizzle's migration tracker may skip it or apply it in the wrong order.

**Why it happens:** Drizzle Kit names migrations by sequence number + timestamp (e.g., `0000_initial.sql`). Manual SQL added to a migration file is preserved and applied — but only if it's in a file that Drizzle's migration table tracks.

**How to avoid:** Use `drizzle-kit generate` to create an empty migration file after generating the schema, then add the raw SQL to that generated file. Never create migration SQL files outside of `drizzle-kit generate`.

**Warning signs:** Triggers don't exist in the DB after `drizzle-kit migrate` runs. Audit rows not written on INSERT/UPDATE.

---

### Pitfall 4: RLS Integration Test Must Use villuh_app Connection

**What goes wrong:** The integration test that verifies cross-tenant isolation connects to Postgres using `DATABASE_URL` (owner role) for convenience. The test passes because the owner role bypasses RLS — it "confirms" isolation when there is none.

**Why it happens:** Test setup code copies the migration connection string into the test environment without switching to `DATABASE_TEST_URL` (restricted role).

**How to avoid:** The integration test must connect using a `DATABASE_TEST_URL` that authenticates as `villuh_app` (or a test-equivalent non-owner role). The test creates two landlord records and data, then queries cross-tenant using `villuh_app` credentials. If cross-tenant data is visible, the test must fail. [ASSUMED for exact vitest setup; pattern follows from RLS behavior]

---

### Pitfall 5: Monthly Audit Log Partitions Must Be Pre-Created

**What goes wrong:** The `audit_log` table is partitioned `BY RANGE (created_at)`. Postgres does not auto-create partitions — if no partition exists for the current month when the first audit write occurs, the INSERT fails with `ERROR: no partition of relation "audit_log" found for row`.

**Why it happens:** Range-partitioned tables in Postgres require partitions to be created in advance. This is not automatic.

**How to avoid:** The Phase 1 migration SQL must create at least the current month and next month as partitions. A future phase will add a cron job to pre-create partitions monthly. Document this gap explicitly in the migration file.

**Warning signs:** `INSERT INTO audit_log` fails during integration test. Error message references missing partition.

---

### Pitfall 6: Icon Consolidation — lucide-react Usage in Sonner Wrapper

**What goes wrong:** `modules/common/ui/sonner.tsx` uses lucide-react icons for toast icon overrides (CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon). If `lucide-react` is removed without updating this file, the Toaster crashes at runtime.

**Why it happens:** `sonner.tsx` uses lucide icons for the `icons` prop override on `<Sonner />`. This file is a shadcn-generated component that the icon decision changes affect.

**How to avoid:** Before removing `lucide-react`, audit all 8 files that import it (identified below) and map each icon to a `@central-icons-react` equivalent or use `PlatformIcon`. The Toaster file must be updated BEFORE `lucide-react` is removed from `package.json`.

**Affected files with lucide-react imports:**
| File | Icons Used |
|------|-----------|
| `modules/common/ui/checkbox.tsx` | CheckIcon |
| `modules/common/ui/combobox.tsx` | ChevronDownIcon, XIcon, CheckIcon |
| `modules/common/ui/dialog.tsx` | XIcon |
| `modules/common/ui/dropdown-menu.tsx` | CheckIcon, ChevronRightIcon |
| `modules/common/ui/pagination.tsx` | ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon |
| `modules/common/ui/select.tsx` | ChevronDownIcon, CheckIcon, ChevronUpIcon |
| `modules/common/ui/sheet.tsx` | XIcon |
| `modules/common/ui/sonner.tsx` | CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon |

**@central-icons-react equivalents found (needs final verification in browser):**
| Lucide Icon | @central-icons-react Equivalent | Confidence |
|-------------|--------------------------------|------------|
| CheckIcon | `IconCircleCheck` or `IconBubbleCheck` | MEDIUM |
| ChevronDownIcon | `IconChevronBottom` | HIGH |
| ChevronUpIcon | `IconChevronTop` | HIGH |
| ChevronLeftIcon | `IconChevronLeft` | HIGH |
| ChevronRightIcon | `IconChevronRight` | HIGH |
| XIcon | `IconCrossLarge` or `IconCrossSmall` | MEDIUM |
| MoreHorizontalIcon | `IconDotGrid1x3Horizontal` | MEDIUM |
| CircleCheckIcon | `IconCircleCheck` | MEDIUM |
| InfoIcon | `IconCircleInfo` or `IconInfoSimple` | MEDIUM |
| TriangleAlertIcon | `IconWarningSign` | LOW — may need fallback |
| OctagonXIcon | No direct equivalent found | LOW — needs fallback in PlatformIcon |
| Loader2Icon | `IconLoader` | MEDIUM |

**These components use lucide icons directly (not via PlatformIcon)** — they must be updated to use `<PlatformIcon>` or inline `<CentralIcon>` from `@central-icons-react/all`.

---

## Code Examples

### Complete withTenant() with actor context

```typescript
// packages/server/src/lib/tenant.ts
import { db } from '@villuh/db'
import { sql } from 'drizzle-orm'

export async function withTenant<T>(
  landlordId: string,
  actorId: string = 'system',
  fn: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_landlord_id', ${landlordId}, TRUE)`)
    await tx.execute(sql`SELECT set_config('app.current_user_id', ${actorId}, TRUE)`)
    return fn(tx)
  })
}
```

### Hono auth middleware (Phase 1 stub)

```typescript
// packages/server/src/middleware/auth.ts
import { createMiddleware } from 'hono/factory'

type Variables = {
  user: { id: string; landlordId: string } | null
  session: { id: string } | null
}

export const authMiddleware = createMiddleware<{ Variables: Variables }>(async (c, next) => {
  // Phase 1 stub — real implementation in Phase 2 with Better Auth
  c.set('user', null)
  c.set('session', null)
  await next()
})
```

### Vitest integration test structure

```typescript
// packages/db/src/__tests__/rls.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { withTenant } from '../../server/src/lib/tenant'
import { testTenantData } from '../schema'

// Uses DATABASE_TEST_URL connecting as villuh_app role
const testClient = postgres(process.env.DATABASE_TEST_URL!)
const testDb = drizzle({ client: testClient })

describe('RLS: cross-tenant isolation', () => {
  it('landlord A cannot see landlord B data', async () => {
    const landlordA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const landlordB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

    // Insert data for both landlords using owner connection (DATABASE_URL)
    // Then query as villuh_app for each landlord context

    const resultA = await withTenant(landlordA, 'system', async (tx) => {
      return tx.select().from(testTenantData)
    })
    
    // resultA must not contain any rows with landlordId === landlordB
    expect(resultA.every(row => row.landlordId === landlordA)).toBe(true)
  })
})
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `pgTable().enableRLS()` | `pgTable.withRLS()` | Drizzle v0.36+ | Must use current API — old method deprecated |
| Manual WHERE clauses | Postgres RLS + SET LOCAL | — | DB-layer enforcement vs. app-layer enforcement |
| Single DATABASE_URL | Two connection strings (owner + app) | — | Required for RLS to not be silently bypassed |
| tRPC for monorepo RPC | `hono/client` AppType export | — | Fewer dependencies, native Hono support |
| ts-node for runtime | tsx (esbuild-based) | — | Much faster startup, Railway-compatible |
| Zod v3 | Zod v4 | 2024-2025 | Breaking API changes; use v4 for new projects |

**Deprecated/outdated:**
- `pgTable().enableRLS()`: Deprecated, use `pgTable.withRLS()` [VERIFIED: Drizzle docs]
- `@hono/node-server` v1.x: Current is v2.0.0 [VERIFIED: npm registry]
- `lucide-react` in this project: Removed by D3 decision

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `drizzle-kit` with `entities: { roles: true }` in config enables role detection but does NOT automatically run `CREATE ROLE` DDL — roles must be pre-created manually | Pitfall 1, Pattern 4 | If drizzle-kit auto-creates roles, the bootstrap SQL script is unnecessary (but harmless) |
| A2 | Manually editing raw SQL into a Drizzle-Kit-generated migration file preserves that SQL when `drizzle-kit migrate` runs | Pitfall 3, Pattern 6 | If drizzle-kit strips hand-written SQL on re-generation, audit triggers would be lost on next schema change |
| A3 | `DATABASE_TEST_URL` connecting as `villuh_app` is sufficient for the integration test — no separate test-role setup needed | Code Examples (integration test) | If `villuh_app` cannot be created in a local test DB easily, the test requires additional setup steps |
| A4 | `pino-http` current version is compatible with pino 10.3.1 | Standard Stack | Version incompatibility would cause server startup failure |
| A5 | Sonner's `icons` prop accepts React nodes (not lucide-specific) — swapping icon components is sufficient | Pitfall 6 | If Sonner expects specific icon component shapes, the replacement pattern must match |
| A6 | `packages/server/package.json` exporting `"main": "src/app.ts"` allows TypeScript to resolve `import type { AppType } from '@villuh/server/app'` in the web package | Pattern 2 (RPC client) | If ts module resolution doesn't work this way in the monorepo, a tsconfig `paths` entry pointing to the server package is needed instead |

---

## Open Questions

1. **Local Postgres availability**
   - What we know: No PostgreSQL binary found on this machine (`psql not found`, port 5432 empty, Docker not available)
   - What's unclear: How does the developer intend to run a local Postgres for Phase 1 testing? Options: (a) install Postgres natively on Windows, (b) use Docker Desktop (not currently installed), (c) use a cloud Postgres for local dev (Railway dev DB, Neon free tier)
   - Recommendation: The plan must include a task that explicitly addresses this. Recommend: install PostgreSQL 17 via the Windows installer from postgresql.org, or install Docker Desktop and run `docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:17`. The phase cannot complete success criterion 2 (RLS integration test) without a real Postgres instance.

2. **`vitest` in monorepo — where does it live?**
   - What we know: Integration tests connect to Postgres and use `drizzle-orm`. They logically belong to `packages/db` (testing DB behavior) but need the `withTenant()` function from `packages/server`.
   - What's unclear: Should integration tests live in `packages/db`, `packages/server`, or a root-level `tests/` directory?
   - Recommendation: Place in `packages/db/src/__tests__/` since they're testing DB-layer behavior. Import `withTenant` from `@villuh/server` (workspace dependency). Configure vitest in `packages/db/vitest.config.ts`.

3. **Audit log partition creation going forward**
   - What we know: Phase 1 migration pre-creates April 2026 and May 2026 partitions. No auto-creation cron is in scope for Phase 1.
   - What's unclear: Who is responsible for creating June 2026 and beyond? May 2026 is the last pre-created partition.
   - Recommendation: Document in the migration file as a known operational gap. A future phase (likely Phase 6's Railway Cron work) adds a monthly partition-creation cron. Flag this in PLAN.md so it's not forgotten.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 22 | All packages | ✓ | 22.18.0 | — |
| pnpm | Monorepo management | ✓ | 10.14.0 | — |
| PostgreSQL server | DB + RLS + audit log tests | ✗ | — | Must install: Windows installer or Docker |
| Docker | PostgreSQL via container | ✗ | — | Install PostgreSQL natively instead |
| psql client | DB debugging | ✗ | — | pgAdmin or DBeaver as GUI alternative |

**Missing dependencies with no fallback:**
- **PostgreSQL server:** Success criterion 2 (Drizzle migrations + RLS integration test) is completely blocked without a running Postgres instance. The plan must include a task to provision one. Recommend `postgres:17` (Railway default version) either natively or via Docker Desktop.

**Missing dependencies with fallback:**
- **Docker:** Not strictly required if Postgres is installed natively. If the developer prefers containers, Docker Desktop for Windows is the path.
- **psql client:** Any Postgres GUI (pgAdmin, DBeaver, TablePlus) serves the same debugging purpose.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.5 |
| Config file | `packages/db/vitest.config.ts` — Wave 0 gap |
| Quick run command | `pnpm --filter @villuh/db test` |
| Full suite command | `pnpm -r test` |

### Phase Requirements → Test Map

Phase 1 has no functional requirements (it is foundational scaffolding). Tests validate the success criteria directly:

| SC # | Behavior | Test Type | Automated Command | File Exists? |
|------|----------|-----------|-------------------|-------------|
| SC-1 | Hono health check returns `{ ok: true }` | smoke | `curl http://localhost:3001/api/health` | ❌ Wave 0 |
| SC-2a | Drizzle migrations run without error | integration | `pnpm --filter @villuh/db migrate` | ❌ Wave 0 |
| SC-2b | Cross-tenant data invisible to different landlord session | integration | `pnpm --filter @villuh/db test` | ❌ Wave 0 |
| SC-3 | Audit row written on INSERT to tenant table | integration | `pnpm --filter @villuh/db test` | ❌ Wave 0 |
| SC-4a | `<Toaster />` mounted in layout (visual) | manual | — | — |
| SC-4b | One icon library in use (no lucide-react imports) | static | `grep -r "lucide-react" packages/web/` | — |
| SC-4c | `.vscode/github-accounts.json` not in git | static | `git ls-files .vscode/` | — |

### Sampling Rate
- **Per task commit:** Run `pnpm --filter @villuh/db test` after any DB schema change
- **Per wave merge:** `pnpm -r test` + manual Hono health-check smoke test
- **Phase gate:** All integration tests green + SC-4 manual checklist before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `packages/db/vitest.config.ts` — vitest configuration for DB integration tests
- [ ] `packages/db/src/__tests__/rls.test.ts` — cross-tenant isolation + audit log tests
- [ ] `packages/db/src/__tests__/setup.ts` — test DB setup/teardown (create partitions, seed test roles)
- [ ] Framework install in `packages/db`: `pnpm add -D vitest`

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No (Phase 2) | Better Auth (deferred) |
| V3 Session Management | No (Phase 2) | Better Auth (deferred) |
| V4 Access Control | YES — multi-tenancy | Postgres RLS + `villuh_app` non-owner role |
| V5 Input Validation | Partial — health route only | zod + @hono/zod-validator (wired but no user input in Phase 1) |
| V6 Cryptography | No | N/A in Phase 1 |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-tenant data leak via missing WHERE clause | Information Disclosure | Postgres RLS enforced at DB layer; app cannot bypass |
| Owner-role bypass of RLS | Elevation of Privilege | Two separate connection strings; test confirms `villuh_app` sees only own tenant data |
| Audit log tampering (UPDATE/DELETE) | Tampering | Immutability trigger raises exception on any UPDATE/DELETE to `audit_log` |
| SET LOCAL session poisoning (FALSE scope) | Information Disclosure | Use `TRUE` (transaction-local) — resets on transaction end; compatible with PgBouncer |
| Committed secrets in `.vscode/` | Information Disclosure | `.vscode/github-accounts.json` excluded by `.vscode/.gitignore`; root `.gitignore` should also exclude `.vscode/` |

---

## Sources

### Primary (HIGH confidence)
- npm registry (live queries, 2026-04-29): all version numbers [VERIFIED]
- https://orm.drizzle.team/docs/rls — Drizzle RLS API: `pgTable.withRLS()`, `pgPolicy()`, `pgRole()`, migration config with `entities: { roles: true }` [VERIFIED via WebFetch]
- https://hono.dev/docs/getting-started/nodejs — Hono Node.js `serve()` function, port config, graceful shutdown [VERIFIED via WebFetch]
- https://hono.dev/docs/guides/rpc — Hono `hc<AppType>()` client, `AppType` export pattern, monorepo `strict: true` requirement [VERIFIED via WebFetch]
- https://www.better-auth.com/docs/integrations/hono — `auth.handler()` mounting, `auth.api.getSession()` middleware pattern, CORS ordering [VERIFIED via WebFetch]
- https://www.better-auth.com/docs/installation — `drizzleAdapter(db, { provider: 'pg' })`, import path `better-auth/adapters/drizzle` [VERIFIED via WebFetch]
- https://orm.drizzle.team/docs/get-started-postgresql — postgres-js (porsager) connection: `drizzle-orm/postgres-js`, `drizzle({ client: queryClient })` [VERIFIED via WebFetch]
- Existing codebase analysis: git tracked files, package.json deps, lucide-react imports, .vscode/ status [VERIFIED via bash tools]

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md` — `withTenant()` pattern, RLS middleware flow, Hono structure (verified during prior research session)
- `.planning/research/PITFALLS.md` — Pitfalls 1, 2, 13, 14, 15, 16 — all directly applicable to Phase 1

### Tertiary (LOW confidence)
- Icon mapping table (lucide → @central-icons-react): identified via `icons-index.json` parsing; exact visual equivalence needs browser verification

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions confirmed from npm registry
- Hono patterns: HIGH — verified against official docs via WebFetch
- Drizzle RLS API: HIGH — verified against official docs via WebFetch
- Better Auth integration: HIGH — verified against official docs via WebFetch
- Audit log SQL: HIGH — standard Postgres trigger pattern, well-established
- Monorepo migration path: MEDIUM — standard pnpm workspace pattern; path alias resolution post-move needs careful verification
- Icon mapping: MEDIUM/LOW — icon names found in package JSON; visual equivalence not verified

**Research date:** 2026-04-29
**Valid until:** 2026-05-29 (stable libraries; Drizzle and Hono APIs unlikely to change within 30 days)
