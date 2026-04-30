---
phase: 2
slug: auth-billing
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-30
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (packages/web) + supertest/hono (packages/api) |
| **Config file** | packages/web/vitest.config.ts / packages/api/vitest.config.ts |
| **Quick run command** | `pnpm --filter web test --run` |
| **Full suite command** | `pnpm test --run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter web test --run`
- **After every plan wave:** Run `pnpm test --run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 1 | AUTH-01 | T-2-01 | Email/password signup requires verified email | unit | `pnpm --filter api test --run auth` | ❌ W0 | ⬜ pending |
| 2-01-02 | 01 | 1 | AUTH-02 | T-2-02 | Google OAuth state param validated | unit | `pnpm --filter api test --run oauth` | ❌ W0 | ⬜ pending |
| 2-01-03 | 01 | 1 | AUTH-03 | T-2-03 | Password reset token single-use | unit | `pnpm --filter api test --run reset` | ❌ W0 | ⬜ pending |
| 2-02-01 | 02 | 1 | AUTH-04 | T-2-04 | Org auto-created on user signup | unit | `pnpm --filter api test --run org` | ❌ W0 | ⬜ pending |
| 2-02-02 | 02 | 1 | AUTH-05 | T-2-05 | Invitation token single-use/expirable | unit | `pnpm --filter api test --run invite` | ❌ W0 | ⬜ pending |
| 2-02-03 | 02 | 1 | AUTH-06 | T-2-06 | Role permissions enforced on Hono routes | unit | `pnpm --filter api test --run rbac` | ❌ W0 | ⬜ pending |
| 2-03-01 | 03 | 2 | AUTH-07 | — | Wizard gated behind auth middleware | e2e | `pnpm --filter web test --run wizard` | ❌ W0 | ⬜ pending |
| 2-04-01 | 04 | 2 | AUTH-08 | T-2-08 | Plan limit hard-blocks property creation | unit | `pnpm --filter api test --run billing` | ❌ W0 | ⬜ pending |
| 2-04-02 | 04 | 2 | AUTH-09 | T-2-09 | Stripe webhook signature verified | unit | `pnpm --filter api test --run webhook` | ❌ W0 | ⬜ pending |
| 2-05-01 | 05 | 3 | SETT-01 | — | Settings page renders invoices from Stripe API | manual | — | N/A | ⬜ pending |
| 2-05-02 | 05 | 3 | SETT-02 | — | Audit log entries written on account actions | unit | `pnpm --filter api test --run audit` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/api/src/__tests__/auth.test.ts` — stubs for AUTH-01, AUTH-02, AUTH-03
- [ ] `packages/api/src/__tests__/org.test.ts` — stubs for AUTH-04, AUTH-05, AUTH-06
- [ ] `packages/api/src/__tests__/billing.test.ts` — stubs for AUTH-08, AUTH-09
- [ ] `packages/api/src/__tests__/audit.test.ts` — stubs for SETT-02
- [ ] `packages/web/src/__tests__/wizard.test.ts` — stubs for AUTH-07
- [ ] vitest installed in both packages if not present

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Invoices visible in Settings | SETT-01 | Requires live Stripe test mode | Log in, navigate to Settings → Billing, verify invoice list renders |
| Google OAuth full flow | AUTH-02 | Requires OAuth app credentials | Click "Sign in with Google", complete flow, verify session created |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
