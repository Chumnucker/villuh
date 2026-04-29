# Phase 1 Discussion Log: Infrastructure Foundation

**Date:** 2026-04-29
**Phase:** 1 — Infrastructure Foundation
**Areas discussed:** 4

---

## Area 1: Monorepo Layout

**Question:** What monorepo structure?
**Answer:** pnpm workspace (packages/)

**Question:** packages layout?
**Answer:** packages/web + packages/server + packages/db (Recommended)

**Question:** Where does existing Next.js code go?
**Answer:** Move everything into packages/web/ (Recommended)

**Question:** DB package name?
**Answer:** @villuh/db

**Question:** Task runner?
**Answer:** Plain pnpm -r / --filter scripts (Recommended for now)

**Decision:** Three-package pnpm workspace. @villuh/db is the shared DB layer. Existing app code relocates to packages/web/. No Turborepo.

---

## Area 2: Audit Log Mechanism

**Question:** Audit mechanism?
**Answer:** Postgres triggers (Recommended)

**Question:** What to capture?
**Answer:** Full row snapshot (old + new values as JSONB)

**Question:** Which tables?
**Answer:** All tenant-isolated tables from day 1 (Recommended)

**Question:** How to track actor?
**Answer:** current_setting('app.current_user_id') via SET LOCAL (Recommended)

**Question:** RLS on audit_log?
**Answer:** RLS on audit_log with landlord_id column (Recommended)

**Question:** System/cron actor?
**Answer:** Yes — cron/system sets SET LOCAL with a sentinel value ('system')

**Question:** Integration test?
**Answer:** Yes — integration test with a real DB connection (Recommended)

**Question:** Test DB?
**Answer:** Local Postgres with test schema + teardown (Recommended)

**Question:** Immutability enforcement?
**Answer:** Yes — enforce immutability via a Postgres trigger (Recommended)

**Question:** Audit schema?
**Answer:** Standard CDC schema (Recommended)

**Question:** Migration strategy?
**Answer:** Raw SQL in a Drizzle migration file (Recommended)

**Question:** Partitioning?
**Answer:** Partition by month from day 1

**Question:** Retention?
**Answer:** No automatic purging in Phase 1 — retain all rows indefinitely (Recommended)

**Decision:** Postgres triggers, full JSONB snapshots, all tenant tables, SET LOCAL actor with 'system' sentinel, RLS on audit_log, immutable via trigger, standard CDC schema, raw SQL migration, monthly partitioned, no purge.

---

## Area 3: Icon Library

**Question:** Keep PlatformIcon wrapper (@central-icons-react) or consolidate to lucide-react?
**Answer:** Keep @central-icons-react as primary

**Question:** lucide-react is still installed — convention going forward?
**Answer:** Remove lucide-react entirely

**Decision:** @central-icons-react/all is sole icon library. lucide-react removed in Phase 1 cleanup. All icons go through PlatformIcon wrapper.

---

## Area 4: Railway + CI

**Question:** CI setup in Phase 1?
**Answer:** None — skip CI in Phase 1 (Recommended)

**Question:** Railway deployment in Phase 1?
**Answer:** Local only — deploy in Phase 2 (Recommended)

**Decision:** No CI, no Railway deploy in Phase 1. Phase 1 validation is local only (Hono starts, migrations run, integration tests pass).

---

## Deferred Ideas

- Turborepo / Nx — came up during monorepo discussion; deferred, plain pnpm sufficient for now
- GitHub Actions CI — deferred to Phase 2
- Railway service setup — deferred to Phase 2
- Audit log retention/purging — deferred beyond Phase 1
- DocuSign developer account — prerequisite for Phase 4, schedule independently
