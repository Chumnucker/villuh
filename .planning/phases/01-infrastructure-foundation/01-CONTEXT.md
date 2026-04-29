# Phase 1 Context: Infrastructure Foundation

**Phase:** 1 — Infrastructure Foundation
**Discussed:** 2026-04-29
**Status:** Ready to plan

---

## Purpose

This file records implementation decisions made during the discuss-phase session. The planner and researcher use these decisions as fixed inputs — they do not re-ask or second-guess choices recorded here.

---

## Decisions

### D1: Monorepo Layout

**Decision:** pnpm workspace with `packages/` directory containing three packages: `packages/web` (Next.js), `packages/server` (Hono), `packages/db` (Drizzle schema + migrations).

**Details:**
- DB package name: `@villuh/db` — imported by both web and server
- Existing Next.js app code moves into `packages/web/` (existing root-level `app/`, `components/`, `modules/`, `public/` relocate there)
- Task runner: plain `pnpm -r` / `pnpm --filter` scripts — no Turborepo or Nx in Phase 1
- Root `package.json` declares `workspaces: ["packages/*"]`
- Each package has its own `tsconfig.json`; root tsconfig extends shared base

**Rationale:** Clean separation between web, API, and DB layers from day 1. `@villuh/db` as a shared package ensures the Drizzle schema is the single source of truth for both server and any future tooling.

---

### D2: Audit Log Mechanism

**Decision:** Postgres triggers write to an `audit_log` table on every INSERT/UPDATE/DELETE to all tenant-isolated tables.

**Schema:**
```sql
CREATE TABLE audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id uuid NOT NULL,
  table_name  text NOT NULL,
  row_id      uuid NOT NULL,
  operation   text NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values  jsonb,
  new_values  jsonb,
  actor_id    text NOT NULL,  -- uuid string or sentinel 'system'
  created_at  timestamptz NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);
```

**Details:**
- **Capture:** Full row snapshot — both `old_values` and `new_values` as JSONB
- **Coverage:** All tenant-isolated tables from day 1 (retrofitting is expensive)
- **Actor:** `current_setting('app.current_user_id', true)` set via `SET LOCAL` in the same transaction. Cron/system jobs set it to the sentinel string `'system'`
- **RLS:** `audit_log` has RLS enabled with a `landlord_id` column — landlords can only read their own audit rows
- **Immutability:** A second trigger prevents UPDATE and DELETE on `audit_log` rows — immutable by DB enforcement, not application policy
- **Migration strategy:** Raw SQL in a Drizzle migration file (not Drizzle schema API) — triggers and partitioning are not expressible in Drizzle's schema DSL
- **Partitioning:** Monthly range partitions from day 1 (no auto-purge in Phase 1 — retain all rows indefinitely)
- **Integration test:** vitest + local Postgres via `DATABASE_TEST_URL`, test schema with teardown — must verify both that audit rows are written and that cross-tenant audit rows are invisible

---

### D3: Icon Library

**Decision:** `@central-icons-react/all` is the sole icon library. `lucide-react` is removed entirely in Phase 1.

**Details:**
- The existing `PlatformIcon` wrapper in `modules/common/ui/icon.tsx` stays — all icon usage goes through it
- Phase 1 cleanup task: audit all `lucide-react` imports in the codebase, replace each with the `@central-icons-react` equivalent via `PlatformIcon`, then remove `lucide-react` from `packages/web/package.json`
- If a needed icon has no `@central-icons-react` equivalent, add it to the `PlatformIcon` wrapper with a fallback, document the gap

---

### D4: Railway + CI Scope

**Decision:** No CI pipeline and no Railway deployment in Phase 1.

**Details:**
- CI (lint, type-check, vitest) is deferred to Phase 2 — it will gate real product code from the start of Auth & Billing
- Railway service + Postgres instance setup is deferred to Phase 2
- Phase 1 validation is entirely local: Hono server starts, Drizzle migrations run against local Postgres, integration tests pass
- Local dev requirement: Node 22 LTS (`.nvmrc` must be set in Phase 1 — Twilio 6.0.0 hard floor is Node >=20)

---

## Pre-Phase 1 Cleanup Checklist

These items are required before Phase 1 is complete (from CLAUDE.md and research):

- [ ] Remove `.vscode/github-accounts.json` from version control (committed secret path)
- [ ] Add `.vscode/github-accounts.json` to `.gitignore`
- [ ] Pin Node 22 LTS in `.nvmrc`
- [ ] Remove `lucide-react` (per D3 above)
- [ ] Move existing Next.js code into `packages/web/`
- [ ] Mount `<Toaster />` component (sonner) in root layout — currently missing

---

## Fixed Architecture Constraints (from prior research — not re-discussed)

These are load-bearing decisions recorded in CLAUDE.md and SUMMARY.md. The planner must respect them:

- **RLS:** `villuh_app` non-owner Postgres role + `withTenant(landlordId, fn)` wrapper with `SET LOCAL app.current_landlord_id`. Two connection strings: `DATABASE_URL` (owner, migrations only) and `DATABASE_APP_URL` (villuh_app, Hono runtime). If the app runs as the owner role, RLS is silently bypassed.
- **Hono structure:** `packages/server/` with `app.route()` per domain, exported `AppType` for type-safe `hono/client` RPC in Next.js
- **Stack versions:** Hono 4.12.15, Better Auth 1.6.9, Drizzle 0.45.2, postgres porsager 3.4.9, Zod 4.3.6 (not v3), Twilio 6.0.0 (Node >=20 required)
- **Webhook raw body:** No global JSON body parser — webhook routes call `c.req.text()` directly for HMAC verification

---

## Out of Scope for Phase 1

Items that came up but are deferred:

- Turborepo / Nx (deferred — plain pnpm scripts sufficient for now)
- GitHub Actions CI (deferred to Phase 2)
- Railway deployment (deferred to Phase 2)
- Audit log retention policy / automatic purging (deferred — no purging in Phase 1)
- DocuSign developer account setup (prerequisite for Phase 4 — schedule independently)
