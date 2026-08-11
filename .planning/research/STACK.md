# Technology Stack

**Project:** Villuh Lease
**Researched:** 2026-04-29
**Research method:** npm registry (authoritative, current), existing codebase analysis
**Overall confidence:** HIGH — all versions pulled live from npm registry

---

## Recommended Stack

### Core Framework (Frontend)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | 16.1.7 (current: 16.2.4) | Full-stack React framework, App Router, RSC | Already in use; constrained. Upgrade to 16.2.4 early — contains patch fixes. App Router is the correct pattern for this app's page-level auth guards and server components. |
| React | ^19.2.4 (current: 19.2.5) | UI rendering | Already in use. React 19 concurrent features and RSC are required by Next.js 16. |
| TypeScript | ^5.9.3 (current: 6.0.3) | Type safety | Already in use. Stay on ^5.9.x; TS 6 is a major release with breaking changes — do not upgrade blindly. |

### Backend API

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Express | ^5.2.1 | HTTP server, routing, middleware | **Canonical.** Live `apps/server` host. Mounts Better Auth, webhooks (`express.raw`), health, and tRPC. Industry-standard pairing with tRPC. |
| tRPC | ^11.17.0 | Typed RPC procedures + client hooks | **Canonical.** End-to-end type safety via `AppRouter`. Frontends use `@villuh/api` (`createTRPCReact` + TanStack Query). Prefer over hand-rolled REST + `hono/client`. |
| @trpc/server adapters/express | ^11.17.0 | Mount tRPC on Express at `/trpc` | Official Express adapter used in `apps/server/src/app.ts`. |
| Zod | (via procedures) | Input validation on tRPC procedures | Validate procedure inputs with Zod; keep schemas next to routers. |
| tsx | ^4.21.0 | TypeScript runtime for Railway (dev + prod) | Runs `.ts` files directly via esbuild — no separate compile step. Use `tsx watch` in dev. |

**Superseded (do not adopt):** Hono, `@hono/node-server`, `hono/client`, NestJS, GraphQL. Early research preferred Hono; implementation and product decision (2026-08-11) locked **Express + tRPC**.

### Validation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Zod | ^4.x | Schema validation on tRPC inputs | Zod 4 preferred. Use with tRPC `.input(z.…)` — not `@hono/zod-validator`. |

### Database

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| PostgreSQL | 17.x (Railway managed) | Primary datastore | Constrained. Railway provides managed Postgres. The RLS requirement in PROJECT.md mandates Postgres — no other DB supports row-level security at the same maturity level. |
| postgres (porsager) | ^3.4.9 | Postgres driver | Preferred over `pg` for Drizzle on Node.js. Faster, fully promise-based, no callback API, first-class tagged-template literal queries. Drizzle documentation defaults to this driver for non-serverless Node.js. Better TypeScript types than `pg`. |
| Drizzle ORM | ^0.45.2 | ORM, schema definition, query builder | Constrained. TypeScript-first, lightweight, no runtime overhead. Drizzle is the correct ORM for this stack because it exposes raw SQL when needed (critical for RLS `SET LOCAL` commands and CDC triggers) while still providing type-safe query building. |
| drizzle-kit | ^0.31.10 | Migration generation and DB push | CLI companion to Drizzle ORM. Generates SQL migration files. Use `drizzle-kit generate` + `drizzle-kit migrate` pattern (not `push`) in production. |

**On Postgres RLS:** Use `SET LOCAL app.current_landlord_id = $1` at the start of every tenant transaction via `withTenant()`, enforced from authenticated tRPC context / middleware. App runs as `villuh_app` (non-owner).

### Authentication

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| better-auth | ^1.6.9 | Auth framework: sessions, email/password, OAuth | Constrained. Framework-agnostic TypeScript auth — integrates with both Next.js App Router (server actions/route handlers) and Hono (middleware). Peer dep confirms Next.js 14/15/16 support. Provides database adapters for Drizzle + Postgres out of the box. |
| @better-auth/stripe | ^1.6.9 | Stripe subscription management via Better Auth | Separate scoped package, versioned in lockstep with `better-auth`. Peer deps: `better-auth ^1.6.9`, `stripe ^18-22`. Manages subscription state, plan limits, and billing portal integration within the auth session context. |

**Better Auth plugins to use (all bundled in `better-auth` package):**
- `better-auth/plugins/organization` — Multi-tenancy: landlord org → manager/viewer role structure. Provides `createOrganization`, `addMember`, `updateMemberRole` APIs.
- `better-auth/plugins/organization/access` — Fine-grained access control within org context. Use for landlord/manager/viewer permission gates.
- `better-auth/plugins/admin` — Operator admin panel. Impersonation, user management, account override.
- `better-auth/plugins/magic-link` — Tenant invite page one-time login. Generates time-limited magic link URLs. This covers the "magic link only, no additional verification" constraint from PROJECT.md.
- `better-auth/plugins/one-time-token` — Alternative to magic-link for single-use invite tokens if magic-link TTL constraints are insufficient.

**Do NOT use:** `@auth/nextjs` (NextAuth v5), `clerk`, `supabase/auth`. The constraint is Better Auth only. NextAuth lacks the organization plugin maturity and has a different session model incompatible with Hono.

### Payments

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| stripe | ^22.1.0 | Stripe Subscriptions + Stripe Connect | Node >=18 required. Version 22 is the current stable. Two integration surfaces: (1) Stripe Subscriptions for landlord billing via `@better-auth/stripe` plugin, (2) Stripe Connect for tenant deposit payments via Stripe Checkout on the invite page. Both use the same SDK. |
| @stripe/stripe-js | ^9.3.1 | Stripe.js frontend loader | Required for Stripe Checkout redirect from the tenant invite page (browser-side). Keep this as a devDependency-equivalent — import only in client components. |

**Stripe Connect architecture:** Create a Connected Account per landlord on first setup. Tenant deposit payments flow through Checkout Sessions with `payment_intent_data.application_fee_amount` to collect any platform fee (even if $0 initially). Webhook events: `checkout.session.completed`, `account.updated` (for onboarding status).

### E-Signatures

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| docusign-esign | ^8.7.0 | DocuSign eSignature API client | Constrained — non-negotiable. Official Node.js SDK. Handles envelope creation from templates, embedding/redirect URLs, status webhooks (Connect). The SDK uses OAuth JWT Grant (service account flow) — set up a DocuSign developer account with RSA key pair. Not yet set up per PROJECT.md; setup is part of the work. |

**DocuSign integration pattern:** Use JWT Grant auth (not Authorization Code) for server-to-server calls. Store the RSA private key as an environment secret. Call `eSignApi.createEnvelope()` for both template-based and ad-hoc PDF uploads. Use DocuSign Connect (webhooks) for status updates (`envelope-completed`, `envelope-declined`). Store signed PDFs in S3 after receiving the completed webhook.

### Email

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| resend | ^6.12.2 | Transactional email sending | Clean TypeScript SDK, React Email template support. Use for: tenant invites, document signing notifications, rent reminders, lease expiry alerts, landlord notification emails. Resend handles DKIM/SPF automatically. Inbound routing architecture is TBD per PROJECT.md — defer inbound webhook design to the comms phase. |

### SMS

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| twilio | ^6.0.0 | SMS send + receive | Node >=20 required (hard requirement). Official SDK. Use for: tenant SMS notifications, landlord SMS alerts, bulk SMS sends. Twilio `Messages.create()` for outbound. TCPA compliance: honor opt-outs by checking Twilio's opt-out registry before sending. Inbound routing TBD — same as email. |

### File Storage

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @aws-sdk/client-s3 | ^3.1038.0 | S3 bucket operations (upload, delete, list) | AWS SDK v3 modular client — import only S3, no full SDK bundle. Use for: signed PDF storage, property image gallery uploads. |
| @aws-sdk/s3-request-presigner | ^3.1038.0 | Generate pre-signed URLs | Required for: (1) browser-direct file upload (property images), (2) time-limited download URLs for signed PDFs. Never proxy file bytes through the Hono server — use pre-signed URLs for all transfers. |
| @aws-sdk/lib-storage | ^3.1038.0 | Multipart upload helper | Required for large PDF uploads. Handles chunked upload automatically. Use with `Upload` class from this package. |

**S3 bucket strategy:** Single bucket with prefix-based organization: `{landlord_id}/properties/{property_id}/images/`, `{landlord_id}/documents/{envelope_id}/signed.pdf`. Use bucket policy + server-side encryption (SSE-S3). Pre-signed URLs expire at 15 minutes for downloads, 30 minutes for uploads. Compatible with AWS S3, Cloudflare R2 (identical API), or any S3-compatible provider — Railway deploys suggest using Railway Volumes for dev and S3-compatible object storage for prod.

### Background Jobs / Cron

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| node-cron | ^4.2.1 | In-process cron scheduler | The PROJECT.md specifies "Railway Cron" for the daily rent ledger job. Railway Cron is a platform-level scheduled service that makes an HTTP request to a URL — it is not an npm package. `node-cron` is needed for in-process scheduling within the Hono backend (e.g., lease expiry checks, notification sends). For the rent overdue job, expose a `POST /internal/cron/mark-overdue` endpoint and configure Railway to call it on a cron schedule with a secret header. This is simpler and more observable than in-process cron at this scale. |

**Railway Cron pattern:** In Railway, create a new Service (or use a Cron service type), set schedule to `0 9 * * *` (9 AM UTC), and configure the HTTP target as your Hono backend URL with `X-Cron-Secret: $CRON_SECRET` header. Validate the secret in a Hono middleware. No npm package needed for this mechanism — `node-cron` is optional for any secondary in-process jobs that are too frequent for Railway's minimum 1-minute cron interval.

### AI (Message Drafting)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @anthropic-ai/sdk | ^0.91.1 | Claude API for AI message drafting | Official Anthropic TypeScript SDK. Use for the "AI message drafting via Claude" feature in comms. Pass full tenant profile + lease + payment history as system context. Server-side only — never expose the API key to the browser. |

### Logging

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| pino | ^10.3.1 | Structured JSON logging for Hono backend | Fastest Node.js logger. JSON output works natively with Railway's log aggregation. Use `pino-http` middleware for automatic request/response logging in Hono. Do not use `console.log` in production — Railway log shipping needs structured JSON. |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Backend framework | Express | Hono | Live code + decision 2026-08-11: Express is tRPC’s standard host; Hono migration churn with no type-safety win |
| Typed API | tRPC | Hono `hono/client` | tRPC already implemented; first-class TanStack Query hooks via `@villuh/api` |
| Typed API | tRPC | Nest + GraphQL | Too many layers; poor fit for raw-body webhooks and fixed-workflow SaaS |
| ORM | Drizzle | Prisma | Prisma's generated client abstracts away raw SQL, making RLS session variable injection awkward; Drizzle exposes `sql` tagged template for full control |
| ORM | Drizzle | Kysely | Drizzle has better migration tooling and schema-first workflow; both are valid but Drizzle has more active development |
| Postgres driver | postgres (porsager) | pg | `pg` is callback-based internally, older API, `postgres` is fully modern Promise-based, faster, and preferred in Drizzle docs |
| Auth | Better Auth | NextAuth v5 | Project constraint; also NextAuth lacks organization plugin and is tightly coupled to Next.js (can't reuse in Hono) |
| Auth | Better Auth | Clerk | Project constraint; also Clerk is a hosted service that makes RLS-based multi-tenancy harder to control |
| Validation | Zod 4 | Zod 3 | Zod 4 is stable (latest tag), faster, smaller bundle; no reason to pin v3 on a new project |
| Email | Resend | SendGrid | Resend has a cleaner TypeScript SDK and React Email integration; SendGrid is legacy |
| SMS | Twilio | Vonage/Plivo | Twilio is the industry standard for TCPA compliance tooling and opt-out management |
| File storage | AWS S3 SDK v3 | UploadThing | UploadThing is Next.js-specific and abstracts away S3 in a way that makes per-landlord isolation harder; raw SDK gives full bucket control |
| Logging | pino | winston | winston is significantly slower than pino; pino is the standard for high-throughput Node.js services |
| TypeScript runner | tsx | ts-node | tsx uses esbuild (much faster), ts-node uses tsc (slow startup); Railway build times matter |

---

## Installation

```bash
# Backend (add to existing monorepo)
pnpm add hono @hono/node-server @hono/zod-validator
pnpm add zod
pnpm add better-auth @better-auth/stripe
pnpm add drizzle-orm postgres
pnpm add stripe @stripe/stripe-js
pnpm add docusign-esign
pnpm add resend
pnpm add twilio
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @aws-sdk/lib-storage
pnpm add @anthropic-ai/sdk
pnpm add pino pino-http
pnpm add node-cron

# Dev
pnpm add -D drizzle-kit tsx
pnpm add -D @types/node @types/pg vitest
```

---

## Version Lock Table (npm registry, 2026-04-29)

| Package | Pinned Version | Latest at Research |
|---------|---------------|-------------------|
| next | 16.1.7 | 16.2.4 |
| react | ^19.2.4 | 19.2.5 |
| typescript | ^5.9.3 | 6.0.3 |
| hono | — | 4.12.15 |
| @hono/node-server | — | 2.0.0 |
| @hono/zod-validator | — | 0.7.6 |
| tsx | — | 4.21.0 |
| zod | — | 4.3.6 |
| better-auth | — | 1.6.9 |
| @better-auth/stripe | — | 1.6.9 |
| drizzle-orm | — | 0.45.2 |
| drizzle-kit | — | 0.31.10 |
| postgres | — | 3.4.9 |
| stripe | — | 22.1.0 |
| @stripe/stripe-js | — | 9.3.1 |
| docusign-esign | — | 8.7.0 |
| resend | — | 6.12.2 |
| twilio | — | 6.0.0 |
| @aws-sdk/client-s3 | — | 3.1038.0 |
| @aws-sdk/s3-request-presigner | — | 3.1038.0 |
| @aws-sdk/lib-storage | — | 3.1038.0 |
| @anthropic-ai/sdk | — | 0.91.1 |
| pino | — | 10.3.1 |
| node-cron | — | 4.2.1 |
| vitest | — | 4.1.5 |

---

## Node.js Version Requirements

Hard constraints from dependencies:
- `twilio@6.0.0` requires Node.js >=20
- `tsx@4.21.0` requires Node.js >=18
- `stripe@22.1.0` requires Node.js >=18

**Use Node.js 22 LTS** (current LTS as of 2026). Pin via `.nvmrc` and Railway service configuration. The codebase currently has no `.nvmrc` — add one immediately.

---

## Monorepo Structure Recommendation

The codebase is a single Next.js project. Add the Hono backend as a co-located app within the same repo, not a separate pnpm workspace, because:
1. They share type definitions (Drizzle schema types, Zod schemas)
2. `hono/client` type-safe RPC requires importing the Hono app type
3. Keeping all code in one repo simplifies CI and Railway deployment configuration

Suggested structure:
```
/
├── app/          (Next.js App Router — existing)
├── modules/      (UI modules — existing)
├── server/       (Hono backend — new)
│   ├── index.ts
│   ├── routes/
│   └── middleware/
├── db/           (Drizzle schema, migrations — new)
│   ├── schema/
│   └── migrations/
└── lib/          (shared types, utils)
```

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| All versions | HIGH | Pulled live from npm registry |
| Hono Node.js deployment | HIGH | `@hono/node-server@2.0.0` peer dep explicitly requires `hono ^4` |
| Better Auth plugins | HIGH | All plugins confirmed present in `better-auth@1.6.9` exports |
| Better Auth organization/RLS interaction | MEDIUM | Plugin exports confirmed; actual RLS middleware wiring pattern needs integration testing |
| Drizzle RLS implementation | MEDIUM | Drizzle RLS feature confirmed present; full `enableRLS()` API nuances need validation during DB phase |
| Railway Cron as HTTP trigger | HIGH | Railway platform-level feature, not npm; HTTP endpoint pattern is well-established |
| Zod 4 compatibility | HIGH | `@hono/zod-validator@0.7.6` peer deps explicitly list `^4.0.0` |
| DocuSign JWT Grant flow | MEDIUM | Standard DocuSign pattern; exact Node.js SDK setup requires following official developer docs during DocuSign phase |
| Twilio TCPA compliance | MEDIUM | Twilio handles opt-out at API level; implementation details need validation in comms phase |

---

## Sources

- npm registry (live queries, 2026-04-29): all version numbers are authoritative
- `better-auth@1.6.9` package exports: plugin list confirmed
- `@better-auth/stripe@1.6.9` peer dependencies: Stripe version range and better-auth compatibility confirmed
- `@hono/zod-validator@0.7.6` peer dependencies: Zod v4 compatibility confirmed
- `twilio@6.0.0` engines field: Node >=20 requirement confirmed
- Existing codebase `package.json`: current dependencies and constraints confirmed
