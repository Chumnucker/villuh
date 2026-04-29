# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-29)

**Core value:** A landlord can onboard a tenant from zero to signed lease in one structured flow — without touching email, a spreadsheet, or a separate e-sign tool.
**Current focus:** Phase 1 — Infrastructure Foundation

## Current Position

Phase: 1 of 8 (Infrastructure Foundation)
Plan: 0 of TBD in current phase
Status: Ready to plan — discuss-phase complete
Last activity: 2026-04-29 — Phase 1 discuss-phase complete; CONTEXT.md written

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Pre-Phase 1]: `villuh_app` non-owner Postgres role must be created before the first migration or RLS is silently bypassed
- [Pre-Phase 1]: Two Stripe webhook endpoints required — `/webhooks/stripe/subscriptions` and `/webhooks/stripe/connect` with separate secrets
- [Phase 1]: Monorepo: pnpm workspace, packages/web + packages/server + packages/db (@villuh/db), existing Next.js moves to packages/web/, plain pnpm scripts
- [Phase 1]: Audit log: Postgres triggers, full JSONB snapshots (old+new), all tenant tables, SET LOCAL actor, RLS on audit_log, 'system' sentinel, monthly partitioned, immutable via trigger
- [Phase 1]: Icon library: @central-icons-react/all is sole library; lucide-react removed; all icons through PlatformIcon wrapper
- [Phase 1]: No CI, no Railway deploy in Phase 1 — local validation only; CI and Railway deferred to Phase 2
- [Pre-Phase 4]: DocuSign developer account setup is a prerequisite — must be scheduled early (approval process takes time)
- [Pre-Phase 5]: Flow engine must use a custom `onboarding_session` token (not Better Auth magic link) due to 5-minute expiry incompatibility; snapshot_json must be copied to instance at activation

### Pending Todos

None yet.

### Blockers/Concerns

- DocuSign developer account not yet set up — required before Phase 4 begins; schedule account creation early
- Railway PgBouncer mode: confirm transaction-mode pooling (not session mode) for `set_config` compatibility before Phase 1 ships
- Inbound message routing (Twilio/Resend) architecture is TBD — needs dedicated research at Phase 7 start

## Session Continuity

Last session: 2026-04-29
Stopped at: Phase 1 discuss-phase complete — ready to run /gsd-plan-phase 1
Resume file: .planning/phases/01-infrastructure-foundation/01-CONTEXT.md
