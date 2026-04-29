# External Integrations

**Analysis Date:** 2026-04-29

## APIs & External Services

None detected. The codebase contains no API client calls, no fetch/axios usage, and no SDK imports for external services at this stage of development.

## Data Storage

**Databases:**
- Not detected — no database client, ORM, or connection configuration present

**File Storage:**
- Local filesystem only — static assets served from `public/`, custom fonts from `app/fonts/`

**Caching:**
- None — Next.js default in-memory caching only (no Redis, Memcached, or explicit cache configuration)

## Authentication & Identity

**Auth Provider:**
- Not detected — no authentication library (NextAuth, Clerk, Auth.js, Supabase Auth, etc.) is installed or configured

## Monitoring & Observability

**Error Tracking:**
- None — no Sentry, Datadog, or equivalent SDK installed

**Logs:**
- Browser console only — no structured logging library present

**Analytics:**
- None detected

## CI/CD & Deployment

**Hosting:**
- Not explicitly configured — Next.js with no adapter implies Vercel or self-hosted Node.js; no `vercel.json`, Dockerfile, or platform manifest present

**CI Pipeline:**
- None — no GitHub Actions, CircleCI, or other CI config files detected

## Environment Configuration

**Required env vars:**
- None at this time — `next.config.mjs` is empty and no `process.env` references are present in source files

**Secrets location:**
- No `.env` files present — not yet needed

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## External Font Loading

**Google Fonts:**
- `Inter` font loaded via `next/font/google` in `app/layout.tsx` — makes an outbound request at build time (or edge render) to Google Fonts CDN

**Local Fonts:**
- `Gambetta-Variable.woff2` and `Gambetta-VariableItalic.woff2` served from `app/fonts/` via `next/font/local` — no external dependency

## Third-Party UI Registries

**shadcn registry:**
- `components.json` has `"registries": {}` — no custom or third-party shadcn registries configured
- The `shadcn` CLI (`^4.5.0`) communicates with `https://ui.shadcn.com` during component scaffolding (dev-time only, not runtime)

---

*Integration audit: 2026-04-29*
