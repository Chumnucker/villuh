# Villuh Lease — Project Guide

## Project

Villuh Lease is a SaaS landlord operating system for independent landlords managing 1–50 units. It centralizes tenant lifecycle management, lease onboarding workflows, rent tracking, and document orchestration.

**Core Value:** A landlord can onboard a tenant from zero to signed lease in one structured flow — without touching email, a spreadsheet, or a separate e-sign tool.

Planning docs: `.planning/`

## GSD Workflow

This project uses the Get Shit Done (GSD) workflow. Always follow it.

### Before starting any work
- Read `.planning/STATE.md` — current position and accumulated context
- Read `.planning/ROADMAP.md` — phase structure and success criteria
- Read the current phase's PLAN.md in `.planning/phases/phase-N/`

### Development commands
- `/gsd-plan-phase N` — plan a phase
- `/gsd-execute-phase N` — execute a phase
- `/gsd-discuss-phase N` — discuss approach before planning
- `/gsd-progress` — check current status

### Phase execution rules (YOLO mode)
- Execute plans atomically — commit after each task
- Do not skip steps or reorder without checking dependencies
- If a blocker is hit, stop and surface it — don't work around it silently
- Verify success criteria are met before marking a phase complete

## Architecture (must-know before writing any code)

**Stack:** Next.js 16 (App Router) + Express 5 + tRPC (Railway) + Postgres + Drizzle ORM + Better Auth

**Monorepo (Turborepo + pnpm):**
- `apps/landlord-web` — Landlord Next.js app (`@villuh/landlord-web`) — `{slug}.app.villuh.com`
- `apps/resident-web` — Resident Next.js app (`@villuh/resident-web`) — `{slug}.villuh.com`
- `apps/server` — Express API + tRPC (`@villuh/server`) — shared by both frontends
- `packages/ui` — shared design system (`@villuh/ui`) — components, theme, layout chrome
- `packages/auth` — shared Better Auth client/server + auth forms (`@villuh/auth`)
- `packages/api` — shared tRPC client + `TRPCProvider` (`@villuh/api`)
- `packages/typescript-config` — shared TSConfigs
- `packages/eslint-config` — shared ESLint configs
- Root scripts delegate to `turbo run` — never bypass Turbo for build/dev/lint/test

**Critical: API = Express + tRPC (not Hono)**
- HTTP shell: Express on Railway (`apps/server`)
- Typed RPC: tRPC mounted at `/trpc` via `@trpc/server/adapters/express`
- Frontends call through `@villuh/api` (`trpc.*` hooks) — end-to-end type safety from `AppRouter`
- Do **not** introduce Hono or `hono/client` — older planning docs that mention Hono are superseded
- NestJS / GraphQL are out of scope

**Critical: Portal hosts (white-label)**
- Resident: `{slug}.villuh.com` (visual branding + per-landlord subdomain)
- Landlord: `{slug}.app.villuh.com` (same slug, sibling product host — not `/admin` or `admin.` nest)
- One shared Postgres + RLS per organization; not per-org deployments
- App-specific providers (e.g. landlord `UserProvider` / `me.get`) stay in each app — do not force-share portal-specific data hooks

**Critical: Organization isolation via Postgres RLS**
- Isolation unit = Better Auth `organization` (the landlord’s account)
- App connects as `villuh_app` role (non-owner) — never the migration/owner role
- Every authenticated API/tRPC procedure that touches org-scoped data must call `withOrganization(organizationId, fn)` to set `SET LOCAL app.current_organization_id`
- Org-scoped tables use `organization_id` FK → `organization.id` — never filter manually; RLS enforces isolation
- Two connection strings: `DATABASE_URL` (migrations only), `DATABASE_APP_URL` (runtime)

**Critical: Stripe has two separate integrations**
- `/webhooks/stripe/subscriptions` + `STRIPE_WEBHOOK_SECRET` → organization billing (Better Auth Stripe plugin)
- `/webhooks/stripe/connect` + `STRIPE_CONNECT_WEBHOOK_SECRET` → resident deposit payments
- Never combine them into one endpoint

**Critical: Webhook raw body**
- Stripe and DocuSign signature verification requires raw request bytes
- Never apply a global JSON body parser — webhook routes use `express.raw()` (or equivalent) before other parsers

**Critical: Onboarding flow engine**
- Invite page renders from `snapshot_json` on the instance — not the live flow definition
- Tenant invite uses a custom `onboarding_session` token — NOT Better Auth magic link (5-min expiry)
- All step advancement goes through the API (tRPC/Express) with server-side precondition validation

**Critical: S3**
- Store only `objectKey` in DB — never pre-signed URLs (they expire)
- Generate pre-signed GET URLs at read time in API routes/procedures

## Frontend data fetching

**Always use tRPC + TanStack Query (via `@villuh/api`) for frontend data fetching or mutations.**

- Prefer `trpc.*.useQuery` / `trpc.*.useMutation` from `@villuh/api` — never raw `fetch` in components or `useEffect`
- Forms: `@tanstack/react-form` + Zod schemas (Standard Schema validators) — not ad hoc `useState` form fields
- Prefer shared Zod schemas colocated with tRPC inputs (e.g. `@villuh/server/schemas/account`) over duplicating or `z.custom<RouterInputs[…]>()` (types alone have no runtime rules)
- Module schemas: `@villuh/server/schemas/{account,members,permissions,billing,audit-log}` (barrel: `@villuh/server/schemas`)
- Query keys for non-tRPC cases live next to the fetch function — export as `const FOO_QUERY_KEY = ['foo'] as const`
- Invalidate related queries in `onSuccess` of mutations via `invalidateOnSuccess` from `@villuh/api` (or `trpc.useUtils()`), not ad hoc in components
- `me.get` (via tRPC) is the source of truth for the current organization user — invalidate after mutations that change user/org state
- No `useEffect` + `useState` + `fetch` patterns

### Mutation → invalidate checklist

1. List every query the mutation makes stale (list, detail, `me.get` quotas/counts, related domains).
2. Call `invalidateOnSuccess(utils, [(u) => u.domain.list, ...])` as `onSuccess`, or `invalidateQueries(utils, [...])` when you also toast/redirect.
3. Invalidate by domain — never `utils.invalidate()` unless intentionally wiping everything.
4. Prefer `invalidate()` over `setQueryData` unless this screen explicitly needs optimistic UI.
5. See `.planning/decisions/ADR-001-cache-strategy.md` — Postgres is SoT; no Redis/response-cache middleware for org CRUD.
## Key constraints
- Auth: Better Auth only — no custom JWT
- E-signature: DocuSign non-negotiable
- Dates: `date` type for lease dates (not `timestamptz`), `timestamptz` for event timestamps
- Node: 22 LTS minimum (Twilio 6 hard requirement)
- Audit log: cross-cutting, implemented alongside data models in Phase 1

## Pre-Phase 1 required
- Remove `.vscode/github-accounts.json` from git tracking
- Mount `<Toaster />` in `app/layout.tsx`
- Pick one icon library (lucide-react recommended)
- Create `.nvmrc` pinned to Node 22
