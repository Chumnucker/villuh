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

**Stack:** Next.js 16 (App Router) + Hono 4 (Railway) + Postgres + Drizzle ORM + Better Auth

**Critical: Multi-tenancy via Postgres RLS**
- App connects as `villuh_app` role (non-owner) — never the migration/owner role
- Every authenticated Hono request must call `withTenant(landlordId, fn)` to set `SET LOCAL app.current_landlord_id`
- Never add `WHERE landlord_id =` manually — RLS enforces this at the DB layer
- Two connection strings: `DATABASE_URL` (migrations only), `DATABASE_APP_URL` (runtime)

**Critical: Stripe has two separate integrations**
- `/webhooks/stripe/subscriptions` + `STRIPE_WEBHOOK_SECRET` → landlord billing (Better Auth Stripe plugin)
- `/webhooks/stripe/connect` + `STRIPE_CONNECT_WEBHOOK_SECRET` → tenant deposit payments
- Never combine them into one endpoint

**Critical: Webhook raw body**
- Stripe and DocuSign signature verification requires raw request bytes
- Never apply a global JSON body parser — webhook routes call `c.req.text()` directly

**Critical: Onboarding flow engine**
- Invite page renders from `snapshot_json` on the instance — not the live flow definition
- Tenant invite uses a custom `onboarding_session` token — NOT Better Auth magic link (5-min expiry)
- All step advancement goes through Hono with server-side precondition validation

**Critical: S3**
- Store only `objectKey` in DB — never pre-signed URLs (they expire)
- Generate pre-signed GET URLs at read time in Hono routes

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
