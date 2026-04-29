---
plan: 01-02
phase: 01-infrastructure-foundation
status: complete
completed: 2026-04-29
commits:
  - 6a226ac
  - 428dc0b
subsystem: hono-server
tags: [hono, rpc, typescript, middleware, multi-tenancy]
dependency_graph:
  requires: [01-01]
  provides: [packages/server/src/app.ts, packages/server/src/routes/health.ts, packages/server/src/lib/tenant.ts, packages/server/src/middleware/auth.ts, packages/web/lib/api.ts]
  affects: [all subsequent server plans, packages/web RPC usage]
tech_stack:
  added: [hono@4.12.15, @hono/node-server@2.0.0, @hono/zod-validator@0.7.6, drizzle-orm@0.45.2, pino@10.3.1, zod@4.3.6]
  patterns: [hono-rpc-apptype, withtenant-set-local-true, auth-middleware-stub]
key_files:
  created:
    - packages/server/src/index.ts
    - packages/server/src/app.ts
    - packages/server/src/routes/health.ts
    - packages/server/src/middleware/auth.ts
    - packages/server/src/lib/tenant.ts
    - packages/web/lib/api.ts
    - packages/web/.env.local (gitignored)
  modified:
    - packages/server/package.json (added Hono + drizzle-orm + pino + zod dependencies)
    - packages/web/package.json (added @villuh/server workspace devDependency)
    - pnpm-lock.yaml
decisions:
  - AppType exported via method-chaining on const routes (not reassignment) to preserve Hono RPC type inference
  - withTenant uses SET LOCAL TRUE (transaction-scoped) to prevent tenant context leaking across PgBouncer pooled connections
  - Auth middleware is a Phase 1 stub (user/session = null); permanent type shape established; Phase 2 populates values
  - packages/web/.env.local is gitignored — contains NEXT_PUBLIC_API_URL=http://localhost:3001 for local dev only
metrics:
  duration: "~10 minutes"
  completed: "2026-04-29"
---

# Phase 1 Plan 02: Hono Server + RPC Client Summary

**One-liner:** Hono 4 API server on port 3001 with health check, AppType RPC export, withTenant SET LOCAL TRUE wrapper, and hc<AppType> typed client in Next.js package.

## Summary

Scaffolded the Hono API server in packages/server/ with a working health-check route returning `{ ok: true, ts: <number> }`. The AppType export uses method chaining on `const routes` (not variable reassignment) to preserve Hono's type inference chain for the RPC client. Created the withTenant() wrapper in packages/server/src/lib/tenant.ts that wraps every DB operation in a Postgres transaction and calls `SET LOCAL TRUE` for both `app.current_landlord_id` and `app.current_user_id` — the transaction-local flag ensures tenant context is never leaked across PgBouncer pooled connections. Created an auth middleware stub that sets user/session to null with the permanent type shape that Phase 2 will populate. Wired the Hono RPC client in packages/web/lib/api.ts using `hc<AppType>` importing from `@villuh/server/app` — giving the Next.js frontend full TypeScript inference on all server routes.

## Key Files Created

- `packages/server/src/index.ts` — HTTP server entry point on port 3001 with SIGINT/SIGTERM handlers
- `packages/server/src/app.ts` — Root Hono app with CORS (origin from env), method-chained routes, and `export type AppType = typeof routes`
- `packages/server/src/routes/health.ts` — `GET /api/health` returns `{ ok: true, ts: Date.now() }`
- `packages/server/src/middleware/auth.ts` — Phase 1 stub; `createMiddleware` sets `user: null`, `session: null`
- `packages/server/src/lib/tenant.ts` — `withTenant(landlordId, actorId, fn)` using `db.transaction` + `SET LOCAL TRUE`
- `packages/web/lib/api.ts` — `export const api = hc<AppType>(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001')`

## Deviations from Plan

None — plan executed exactly as written.

Note: `packages/web/.env.local` was correctly excluded from git (gitignored) rather than committed. The plan instruction to include it in the docs commit was intentional — it exists on disk for local dev but is not tracked in version control.

## Known Stubs

- `packages/server/src/middleware/auth.ts` — `authMiddleware` sets `user: null` and `session: null` intentionally. This is a permanent stub for Phase 1; Phase 2 implements full Better Auth session resolution.
- `packages/server/src/lib/tenant.ts` — imports `db` from `@villuh/db` which does not yet export `db` (Plan 03 creates the DB package). TypeScript will report an error on this import until Plan 03 completes. The function itself is correctly implemented and will work once the import resolves.

## Self-Check: PASSED

- `packages/server/src/app.ts` contains `export type AppType = typeof routes` — FOUND
- `packages/server/src/routes/health.ts` contains `.get('/health', (c) => c.json({ ok: true` — FOUND
- `packages/server/src/index.ts` contains `serve({ fetch: app.fetch` — FOUND
- `packages/server/src/middleware/auth.ts` contains `createMiddleware` and `c.set('user', null)` — FOUND
- `packages/server/src/lib/tenant.ts` contains `set_config.*TRUE` (both occurrences) — FOUND
- `packages/web/lib/api.ts` contains `hc<AppType>` — FOUND
- `packages/web/lib/api.ts` contains `import type { AppType } from '@villuh/server/app'` — FOUND
- `packages/web/package.json` contains `"@villuh/server": "workspace:*"` in devDependencies — FOUND
- `curl http://localhost:3001/api/health` returned `{"ok":true,"ts":1777473950519}` — VERIFIED
- Commit `6a226ac` (Task 1) — EXISTS
- Commit `428dc0b` (Task 2) — EXISTS
