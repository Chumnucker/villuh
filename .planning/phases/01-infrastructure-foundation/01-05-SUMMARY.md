---
plan: 01-05
status: complete
completed: 2026-04-30
---

# 01-05 Summary: RLS + Audit Log Integration Tests

## What was built

- `packages/db/vitest.config.ts` — vitest with `environment: 'node'`
- `packages/db/src/__tests__/setup.ts` — `createOwnerClient` (connects to `villuh_test` as `chum` via `DATABASE_OWNER_TEST_URL`), `createAppClient` (connects as `villuh_app` via `DATABASE_TEST_URL`), `withTestTenant` helper replicating the `SET LOCAL` pattern from `@villuh/server`
- `packages/db/src/__tests__/rls.test.ts` — 6 integration tests, all passing

## Tests and results

| Test | Result |
|------|--------|
| Landlord A cannot see landlord B rows | ✅ |
| Landlord A sees only their own rows | ✅ |
| Landlord B sees only their own rows | ✅ |
| No context set = access denied (RLS blocks) | ✅ |
| Audit row written on INSERT with correct actor_id | ✅ |
| audit_log rows are immutable — UPDATE raises exception | ✅ |

## Decisions made

- `createOwnerClient` uses `DATABASE_OWNER_TEST_URL` (owner on villuh_test) — not `DATABASE_URL` (owner on villuh). Both test clients must hit the same database
- "No context set" test: `current_setting('app.current_landlord_id', TRUE)` returns empty string `''` (not NULL) when unset, causing a uuid cast error — this is an equivalent access denial; test catches both 0-rows and uuid-error cases
- Audit immutability assertion uses `.rejects.toSatisfy()` to unwrap the DrizzleQueryError and check the cause message for "immutable"
- Audit count test uses before/after count delta (not exact count = 1) — audit_log rows are immutable so they accumulate across test runs; deterministic delta is robust
