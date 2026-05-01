---
phase: 2
slug: auth-billing
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-30
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest in `@villuh/server` (server tests) and `@villuh/web` (build/typecheck) |
| **Server config** | `packages/server/vitest.config.ts` (created in Plan 02-01 Task 4) |
| **DB tests** | RLS integration tests via `packages/db/src/__tests__/setup.ts` (Phase 1) |
| **Quick run command** | `pnpm --filter @villuh/server test` |
| **Targeted run command** | `pnpm --filter @villuh/server test <test-file>` (e.g. `auth.test.ts`) |
| **Full suite command** | `pnpm --filter @villuh/server test && pnpm --filter @villuh/db test` |
| **Web build/typecheck** | `pnpm --filter @villuh/web typecheck && pnpm --filter @villuh/web build` |
| **Estimated runtime** | ~30–45 seconds (server) + ~30s (web build) |

---

## Sampling Rate

- **After every task commit:** Run the targeted test for the requirement(s) that task addresses (see per-task map below)
- **After every plan completion:** Run `pnpm --filter @villuh/server test` (full server suite)
- **After every wave completion:** Run server suite + `pnpm --filter @villuh/web typecheck`
- **Before `/gsd-verify-work`:** Full suite must be green; web build must succeed
- **Max feedback latency:** 30 seconds for targeted runs

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement(s) | Threat Ref | Secure Behavior | Test Type | Automated Command | File Owner | Status |
|---------|------|------|----------------|------------|-----------------|-----------|-------------------|------------|--------|
| 2-01-01 | 02-01 | 1 | AUTH-01 through SETT-02 | T-2-T01, T-2-E01 | Schema files compile and Better Auth schema is generated, not hand-written | typecheck | `pnpm --filter @villuh/db typecheck` | Plan 02-01 (creates) | ⬜ pending |
| 2-01-02 | 02-01 | 1 | AUTH-03, AUTH-04 | T-2-T02 | plan_limits seeded with exactly 9 rows; RLS NOT enabled on plan_limits | psql | `psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM plan_limits"` returns `9` AND `psql "$DATABASE_URL" -tAc "SELECT relrowsecurity FROM pg_class WHERE relname='plan_limits'"` returns `f` | Plan 02-01 (creates) | ⬜ pending |
| 2-01-03 | 02-01 | 1 | AUTH-02 | T-2-T01 | role_permissions has tenant_isolation RLS policy enabled | psql | `psql "$DATABASE_URL" -tAc "SELECT relrowsecurity FROM pg_class WHERE relname='role_permissions'"` returns `t` | Plan 02-01 (creates) | ⬜ pending |
| 2-01-04 | 02-01 | 1 | All Phase 2 reqs | — | vitest infra works in @villuh/server, 7 stub test files exist | discovery | `pnpm --filter @villuh/server test 2>&1 \| grep -q "Test Files"` | Plan 02-01 (creates) | ⬜ pending |
| 2-02-01 | 02-02 | 2 | AUTH-01 (signup) | T-2-S01, T-2-E02 | Signup creates user + auto-creates org; emailVerified=false; sendVerificationEmail dispatched | unit | `pnpm --filter @villuh/server test auth.test.ts` (AUTH-01 signup test passes) | Plan 02-02 (replaces stub) | ⬜ pending |
| 2-02-02 | 02-02 | 2 | AUTH-01 (login) | T-2-S01 | Login returns Better Auth session cookie | unit | `pnpm --filter @villuh/server test auth.test.ts` (AUTH-01 login test passes) | Plan 02-02 (replaces stub) | ⬜ pending |
| 2-02-03 | 02-02 | 2 | AUTH-09 | T-2-S01 | forgot-password dispatches Resend email with reset URL | unit | `pnpm --filter @villuh/server test auth.test.ts` (AUTH-09 test passes) | Plan 02-02 (replaces stub) | ⬜ pending |
| 2-02-04 | 02-02 | 2 | AUTH-01 (architecture) | T-2-I01 | auth.ts uses runtime db (DATABASE_APP_URL), not migrationDb | grep | `grep -c "migrationDb" packages/server/src/auth.ts` returns `0` | Plan 02-02 (creates) | ⬜ pending |
| 2-03-01 | 02-03 | 3 | AUTH-01, AUTH-09 (UI) | T-2-I02 | Web build succeeds with all 4 auth pages mounted | typecheck+build | `pnpm --filter @villuh/web typecheck && pnpm --filter @villuh/web build` | Plan 02-03 (creates) | ⬜ pending |
| 2-03-02 | 02-03 | 3 | AUTH-01 | T-2-S01 | auth-server.ts is a STANDALONE betterAuth() instance in packages/web (no @villuh/server import) | grep | `grep -c "@villuh/server" packages/web/lib/auth-server.ts` returns `0` AND `grep -q "betterAuth" packages/web/lib/auth-server.ts` | Plan 02-03 (creates) | ⬜ pending |
| 2-03-03 | 02-03 | 3 | AUTH-01, AUTH-09 (UI) | — | Manual visual verification (10 checks) | manual | Checkpoint in 02-03 Task 4 | Plan 02-03 (checkpoint) | ⬜ pending |
| 2-04-01 | 02-04 | 3 | AUTH-02 (org auto-create) | T-2-E01 | Signup auto-creates org with user as owner; member row inserted | unit | `pnpm --filter @villuh/server test org.test.ts` (org auto-creation passes) | Plan 02-04 (replaces stub) | ⬜ pending |
| 2-04-02 | 02-04 | 3 | AUTH-02 (invite + RBAC) | T-2-E04 | Owner can invite member; sendInvitationEmail dispatched; viewer denied admin route returns 403 | unit | `pnpm --filter @villuh/server test org.test.ts permissions.test.ts` (invite + RBAC pass) | Plan 02-04 (replaces stubs) | ⬜ pending |
| 2-04-03 | 02-04 | 3 | AUTH-03 (members) | T-2-E05 | Starter tier (member_limit=2) blocks 3rd invitation with 402 PLAN_LIMIT | unit | `pnpm --filter @villuh/server test org.test.ts` (plan limit test passes) | Plan 02-04 (replaces stub) | ⬜ pending |
| 2-04-04 | 02-04 | 3 | SETT-01 (D-44 shape) | — | GET /api/me returns full D-44 shape including permissions object; unit_count/property_count derived from onboarding_state | unit | `pnpm --filter @villuh/server test permissions.test.ts` (SETT-01 D-44 shape test passes) | Plan 02-04 (replaces stub) | ⬜ pending |
| 2-04-05 | 02-04 | 3 | AUTH-02 (default seed) | T-2-T01 | seedDefaultPermissions inserts 12 rows (3 roles × 4 actions) on org create | unit | `pnpm --filter @villuh/server test permissions.test.ts` (default permissions seeded test passes) | Plan 02-04 (replaces stub) | ⬜ pending |
| 2-05-01 | 02-05 | 3 | AUTH-04 (trial start) | T-2-T04 | POST /api/billing/trial-start creates Stripe sub with trial_period_days=30, missing_payment_method=cancel, quantity=0 | unit | `pnpm --filter @villuh/server test billing.test.ts` (AUTH-04 trial-start test passes) | Plan 02-05 (replaces stub) | ⬜ pending |
| 2-05-02 | 02-05 | 3 | AUTH-04 (trial sync) | — | trial-start sets org.subscription_tier=pro, subscription_status=trialing, setup_completed=true | unit | `pnpm --filter @villuh/server test billing.test.ts` (trial sync test passes) | Plan 02-05 (replaces stub) | ⬜ pending |
| 2-05-03 | 02-05 | 3 | AUTH-04 (idempotency) | T-2-D03 | Second trial-start call returns alreadyActive; subscriptions.create only called once | unit | `pnpm --filter @villuh/server test billing.test.ts` (idempotency test passes) | Plan 02-05 (replaces stub) | ⬜ pending |
| 2-05-04 | 02-05 | 3 | AUTH-05 (sync-units) | T-2-T05 | sync-units updates Stripe subscription quantity; skipped: true when no subscription | unit | `pnpm --filter @villuh/server test billing.test.ts` (AUTH-05 sync-units tests pass) | Plan 02-05 (replaces stub) | ⬜ pending |
| 2-05-05 | 02-05 | 3 | AUTH-07 (invoices) | T-2-I04 | GET /api/billing/invoices returns mapped Stripe invoice list filtered by customer | unit | `pnpm --filter @villuh/server test billing.test.ts` (AUTH-07 invoice list tests pass) | Plan 02-05 (replaces stub) | ⬜ pending |
| 2-05-06 | 02-05 | 3 | AUTH-04 (webhook) | T-2-T04 | setOrgSubscriptionStatus(orgId, 'expired') updates org row | unit | `pnpm --filter @villuh/server test billing.test.ts` (webhook sync test passes) | Plan 02-05 (replaces stub) | ⬜ pending |
| 2-06-01 | 02-06 | 4 | AUTH-03 (plan limit) | T-2-E09 | checkPlanLimit returns D-42 shape (PLAN_LIMIT, resource, limit, current, upgrade_to) at limit | unit | `pnpm --filter @villuh/server test plan-limit.test.ts` (starter tier blocks property test passes) | Plan 02-06 (replaces stub) | ⬜ pending |
| 2-06-02 | 02-06 | 4 | AUTH-03 (unlimited) | — | pro tier limit=-1 allows unlimited (no 402) | unit | `pnpm --filter @villuh/server test plan-limit.test.ts` (pro unlimited test passes) | Plan 02-06 (replaces stub) | ⬜ pending |
| 2-06-03 | 02-06 | 4 | AUTH-04 (sub gate) | — | subscriptionExpiredGate returns 402 SUBSCRIPTION_REQUIRED on expired status | unit | `pnpm --filter @villuh/server test plan-limit.test.ts` (expired gate test passes) | Plan 02-06 (replaces stub) | ⬜ pending |
| 2-06-04 | 02-06 | 4 | AUTH-08 (state) | — | GET /api/wizard/state derives currentStep from DB rows | unit | `pnpm --filter @villuh/server test wizard.test.ts` (state test passes) | Plan 02-06 (replaces stub) | ⬜ pending |
| 2-06-05 | 02-06 | 4 | AUTH-08 (steps) | T-2-T06 | Step progression: 1→2→3→4 only when prior step's data persisted | unit | `pnpm --filter @villuh/server test wizard.test.ts` (step progression test passes) | Plan 02-06 (replaces stub) | ⬜ pending |
| 2-06-06 | 02-06 | 4 | AUTH-08 (step 4) | — | Step 4 trial-start sets setup_completed=true | unit | `pnpm --filter @villuh/server test wizard.test.ts` (step 4 test passes) | Plan 02-06 (replaces stub) | ⬜ pending |
| 2-06-07 | 02-06 | 4 | AUTH-08 (precondition) | T-2-T06 | POST /api/wizard/unit returns 400 if property not yet created | unit | `pnpm --filter @villuh/server test wizard.test.ts` (precondition test passes) | Plan 02-06 (replaces stub) | ⬜ pending |
| 2-06-08 | 02-06 | 4 | AUTH-08 (UI) | — | Manual end-to-end: signup → wizard → trial → dashboard works | manual | Checkpoint in 02-06 Task 3 (15 verification steps) | Plan 02-06 (checkpoint) | ⬜ pending |
| 2-07-01 | 02-07 | 3 | SETT-02 (filter) | T-2-I06 | GET /api/audit-log filters entries by actor_id = current user | unit | `pnpm --filter @villuh/server test audit.test.ts` (filter test passes) | Plan 02-07 (replaces stub) | ⬜ pending |
| 2-07-02 | 02-07 | 3 | SETT-02 (isolation) | T-2-I06 | User B cannot see User A's audit entries | unit | `pnpm --filter @villuh/server test audit.test.ts` (isolation test passes) | Plan 02-07 (replaces stub) | ⬜ pending |
| 2-07-03 | 02-07 | 3 | SETT-02 (pagination) | T-2-D05 | Audit log paginates correctly (page=2, limit=1) | unit | `pnpm --filter @villuh/server test audit.test.ts` (pagination test passes) | Plan 02-07 (replaces stub) | ⬜ pending |
| 2-09-01 | 02-09 | 5 | SETT-01, SETT-02 (UI) | — | Settings/Account + Settings/Audit-Log render per UI-SPEC; profile + password updates persist | manual | Checkpoint in 02-09 Task 4 (9 verification steps) | Plan 02-09 (checkpoint) | ⬜ pending |
| 2-10-01 | 02-10 | 5 | SETT-01, AUTH-02 (UI) | — | Settings/Team renders per UI-SPEC; invite + role change + remove + role-permissions editor functional | manual | Checkpoint in 02-10 Task 4 (12 verification steps) | Plan 02-10 (checkpoint) | ⬜ pending |
| 2-08-01 | 02-08 | 3 | AUTH-06 (callback) | T-2-S08 | Stripe Connect callback persists stripe_user_id when state matches landlord_id | unit | `pnpm --filter @villuh/server test billing.test.ts` (Stripe Connect callback test passes) | Plan 02-08 (replaces it.todo) | ⬜ pending |
| 2-08-02 | 02-08 | 3 | AUTH-06 (CSRF) | T-2-S08 | OAuth callback rejects mismatched state with 400 | unit | `pnpm --filter @villuh/server test billing.test.ts` (CSRF test passes) | Plan 02-08 (replaces it.todo) | ⬜ pending |
| 2-08-03 | 02-08 | 3 | AUTH-06 (disconnect) | T-2-E11 | POST /api/billing/stripe-connect/disconnect clears stripe_connected_account_id | unit | `pnpm --filter @villuh/server test billing.test.ts` (disconnect test passes) | Plan 02-08 (replaces it.todo) | ⬜ pending |
| 2-11-01 | 02-11 | 5 | AUTH-03, AUTH-07 (UI) | T-2-T09, T-2-I08 | Billing page renders with Stripe Elements; plan selector + payment method form + invoice list functional (no Checkout redirect, D-27) | manual | Checkpoint in 02-11 Task 4 (7 verification steps) | Plan 02-11 (checkpoint) | ⬜ pending |
| 2-12-01 | 02-12 | 5 | AUTH-02, AUTH-06 (UI), SETT-01 | T-2-S08, T-2-T08, T-2-S09 | Persistent banner + upgrade modal + accept-invitation page + integrations page (Stripe OAuth round-trip + DocuSign stub) functional | manual | Checkpoint in 02-12 Task 4 (16 verification steps) | Plan 02-12 (checkpoint) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Sampling Continuity Check:** No 3 consecutive task IDs (in execution wave order) lack an `<automated>` verify command. All `manual` rows are clearly marked and only used for final visual checkpoints (02-03-03, 02-06-08, 02-09-01, 02-10-01, 02-11-01, 02-12-01). Wave 1–4 task IDs are 100% covered by automated commands.

---

## Wave 0 Test Stub Requirements

The Wave 0 task in **Plan 02-01 Task 4** creates 7 stub test files in `packages/server/src/__tests__/`. Each stub uses `expect.fail()` so tests run RED until later plans replace them.

- [ ] `packages/server/src/__tests__/auth.test.ts` — stubs for AUTH-01 (signup, login, OAuth), AUTH-09 (password reset)
- [ ] `packages/server/src/__tests__/org.test.ts` — stubs for AUTH-02 (org auto-create, invitations) + AUTH-03 (member plan limit)
- [ ] `packages/server/src/__tests__/permissions.test.ts` — stubs for AUTH-02 (RBAC), SETT-01 (D-44 shape)
- [ ] `packages/server/src/__tests__/plan-limit.test.ts` — stubs for AUTH-03 (limits), AUTH-04 (subscription gate)
- [ ] `packages/server/src/__tests__/billing.test.ts` — stubs for AUTH-04 (trial), AUTH-05 (sync-units), AUTH-06 (Stripe Connect, kept as `it.todo` until Plan 02-08), AUTH-07 (invoices/upgrade)
- [ ] `packages/server/src/__tests__/wizard.test.ts` — stubs for AUTH-08 (wizard state + steps + middleware redirect)
- [ ] `packages/server/src/__tests__/audit.test.ts` — stubs for SETT-02 (audit log filter)
- [ ] `packages/server/src/__tests__/setup.ts` — test infrastructure (createOwnerClient, createAppClient, withTestTenant, clearTestUsers); extended in Plan 02-02 with `signUpTestUser`, `markUserEmailVerified`, `signInTestUser`, and in Plan 02-04 with `fetchApi`, `getCurrentUserId`, `getOrgIdForUser`
- [ ] `packages/server/vitest.config.ts` — vitest config (Node env, forks pool, singleFork)
- [ ] vitest installed in `@villuh/server` (and remains installed in `@villuh/db` from Phase 1)

`wave_0_complete` flips from `false` → `true` after Plan 02-01 Task 4 ships and the executor verifies all 7 stub files exist + `pnpm --filter @villuh/server test` discovers them.

---

## Manual-Only Verifications

Each manual checkpoint is bound to a specific plan task — no orphan manual gates.

| Behavior | Requirement | Plan Checkpoint | Why Manual | Test Instructions |
|----------|-------------|-----------------|------------|-------------------|
| Auth pages visual + interactive contract | AUTH-01, AUTH-09 (UI) | 02-03 Task 4 | UI verification (centered shell, copy verbatim, Google OAuth redirect) | 10 checks listed in Plan 02-03 checkpoint |
| Onboarding wizard end-to-end | AUTH-08 | 02-06 Task 3 | Cross-package interactive flow + Next.js middleware behaviour | 15 checks listed in Plan 02-06 checkpoint |
| Settings/Account + /Audit Log | SETT-01, SETT-02 | 02-09 Task 4 | Visual contract + profile/password forms | 9 checks listed in Plan 02-09 checkpoint |
| Settings/Team | SETT-01, AUTH-02 | 02-10 Task 4 | Interactive role mgmt + remove dialog + role permissions editor | 12 checks listed in Plan 02-10 checkpoint |
| Settings/Billing | AUTH-03, AUTH-07 | 02-11 Task 4 | Stripe Elements (live PCI-scoped iframe), plan selector, invoice list | 7 checks listed in Plan 02-11 checkpoint |
| Settings/Integrations + Usage Banner + Upgrade Modal + Accept Invitation | AUTH-02, AUTH-06, SETT-01 | 02-12 Task 4 | Stripe Connect OAuth round-trip, plan_limits perturbation, accept-invitation in incognito | 16 checks listed in Plan 02-12 checkpoint |
| Google OAuth full flow | AUTH-01 (Google path) | 02-03 Task 4 step 8 | Real Google credentials required; cannot mock end-to-end | Click "Continue with Google" on /login; complete real OAuth; verify session created |

---

## Validation Sign-Off

This checklist is signed off ONLY when execution completes Wave 5 and all checkpoint approvals are recorded. It is `pending` during planning.

- [ ] All tasks have `<automated>` verify or are clearly tagged manual + bound to a plan checkpoint
- [ ] Sampling continuity: no 3 consecutive Wave 1–4 task rows without an automated verify command
- [ ] Wave 0 stub files exist and `pnpm --filter @villuh/server test` discovers all 7 (set `wave_0_complete: true` after Plan 02-01 Task 4)
- [ ] No watch-mode flags in any verify command (use `vitest run` only — `pnpm test` is configured to run-once)
- [ ] Feedback latency < 30s for the targeted commands listed above
- [ ] All 6 manual checkpoints (02-03-03, 02-06-08, 02-09-01, 02-10-01, 02-11-01, 02-12-01) approved by user
- [ ] `nyquist_compliant: true` is set in frontmatter (set during planning revision)

**Approval:** pending (will be signed off in 02-12 Task 4 final checkpoint — the last plan of Phase 2)
