---
phase: 1
slug: infrastructure-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-29
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.5 |
| **Config file** | `packages/db/vitest.config.ts` — Wave 0 gap (must be created) |
| **Quick run command** | `pnpm --filter @villuh/db test` |
| **Full suite command** | `pnpm -r test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @villuh/db test` after any DB schema change
- **After every plan wave:** Run `pnpm -r test` + manual Hono health-check smoke test (`curl http://localhost:3001/api/health`)
- **Before `/gsd-verify-work`:** All integration tests green + SC-4 manual checklist must pass
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

Phase 1 has no functional requirements — tests validate success criteria directly:

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| SC-1 | 02 | 1 | — | T-1-01 | Hono returns 200 OK from restricted role | smoke | `curl http://localhost:3001/api/health` | ❌ W0 | ⬜ pending |
| SC-2a | 03 | 2 | — | T-1-02 | Migrations run as owner, runtime uses villuh_app | integration | `pnpm --filter @villuh/db migrate` | ❌ W0 | ⬜ pending |
| SC-2b | 03 | 2 | — | T-1-03 | Cross-tenant data invisible via RLS | integration | `pnpm --filter @villuh/db test` | ❌ W0 | ⬜ pending |
| SC-3 | 03 | 2 | — | T-1-04 | Audit write on INSERT; UPDATE/DELETE raises exception | integration | `pnpm --filter @villuh/db test` | ❌ W0 | ⬜ pending |
| SC-4a | 01 | 1 | — | — | N/A | manual | — | — | ⬜ pending |
| SC-4b | 01 | 1 | — | — | No lucide-react imports | static | `grep -r "lucide-react" packages/web/ \|\| echo "clean"` | — | ⬜ pending |
| SC-4c | 01 | 1 | — | — | .vscode/github-accounts.json not tracked | static | `git ls-files .vscode/` | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/db/vitest.config.ts` — vitest configuration for DB integration tests
- [ ] `packages/db/src/__tests__/rls.test.ts` — cross-tenant isolation + audit log tests
- [ ] `packages/db/src/__tests__/setup.ts` — test DB setup/teardown (create partitions, seed test roles)
- [ ] `packages/db` package.json: `pnpm add -D vitest`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `<Toaster />` mounted in layout | SC-4a | Visual React component render | Run `pnpm dev:web`, open localhost:3000, trigger a toast action and confirm it renders |
| Icon library (no visual regressions) | D3 | Cannot fully automate icon visual equivalence | Spot-check 3 components using PlatformIcon icons after lucide-react removal |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
