# ADR-001: Cache strategy (UI + API)

**Status:** Accepted  
**Date:** 2026-08-11  
**Context:** Pre-CRUD — lock caching conventions before properties/units/tenants land.

## Decision

1. **UI freshness = TanStack Query** (via tRPC `useQuery` / `useMutation` in `@villuh/api`).
2. **Source of truth = Postgres** (RLS + `withOrganization`). No Redis / response-cache middleware on tRPC for org CRUD.
3. **After every mutation:** invalidate related query domains with `invalidateOnSuccess` (or equivalent `utils.*.invalidate()`), not a global cache wipe.
4. **Redis / shared API cache:** deferred until p95 latency or DB load proves need.

## Frontend rules

- Default `staleTime: 30_000` in `TRPCProvider` (override per-query when needed; e.g. longer for `me.get` is fine).
- Prefer `invalidate()` over `setQueryData` unless a screen explicitly needs optimistic UI.
- Invalidate by domain (`properties.list`, `properties.byId`, `me.get`) — never invent a parallel cache layer for list freshness.
- Optimistic updates are opt-in per screen, not a platform default.

## Backend rules

| Data | Backend cache? | Notes |
|------|----------------|-------|
| Org CRUD (properties, units, tenants, leases) | No | Low volume; correctness first |
| `me.get` / permissions | No (for now) | Layout hydrate + client staleTime |
| Billing plans / Stripe price map | Optional later: in-process TTL | Near-static reference data |
| Cross-instance hot paths | Redis — deferred | Only with measured need |

Do **not** add Express middleware that caches tRPC JSON by URL (auth/RLS/staleness hazards).

Mutations should use stable procedure names (`*.list`, `*.byId`, `*.create`) and may return the created/updated entity for optional client `setQueryData` later.

## Next.js / RSC

- Org-scoped server fetches (`requireMe` / `createServerTrpc`) must not use Next Data Cache / `unstable_cache` without org-scoped tags.
- Layout bootstrap stays uncached (`no-store` / default).

## Out of scope (v1)

- Redis / Upstash
- Global HTTP cache interceptor
- DB-trigger → websocket invalidation
- Full optimistic-update framework

## Consequences

- New CRUD features must declare `onSuccess` invalidations (see `invalidateOnSuccess` in `@villuh/api`).
- Backend stays simple until metrics say otherwise.
