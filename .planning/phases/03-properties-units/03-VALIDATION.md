---
phase: 3
slug: properties-units
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-11
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.5 (`apps/server`) |
| **Config file** | `apps/server/vitest.config.ts` |
| **Quick run command** | `pnpm --filter @villuh/server test -- src/__tests__/properties.test.ts` |
| **Full suite command** | `pnpm --filter @villuh/server test` |
| **Estimated runtime** | ~30–90 seconds (DB required) |

Frontend: no landlord-web test script today — server integration tests are primary automation; UI verified manually against UI-SPEC screens 1–8.

---

## Sampling Rate

- **After every task commit:** Run targeted Vitest file(s) for the touched module
- **After every plan wave:** Run `pnpm --filter @villuh/server test`
- **Before `/gsd-verify-work`:** Full suite must be green + manual UI pass
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-W0-* | 00 | 0 | PROP/UNIT + cross | — | Fixtures + stubs | integration stubs | Wave 0 files exist | ❌ W0 | ⬜ pending |
| PROP-01 CRUD | TBD | TBD | PROP-01 | T-3-XSS / RLS | Sanitize notes; RLS isolation | integration | `pnpm --filter @villuh/server test -- src/__tests__/properties.test.ts` | ❌ W0 | ⬜ pending |
| PROP-01 Gallery | TBD | TBD | PROP-01 | T-3-S3 | objectKey only; MIME/size; delete S3+row | integration (S3 mocked) | `... gallery.test.ts` | ❌ W0 | ⬜ pending |
| PROP-02 Tags | TBD | TBD | PROP-02 | — | Promote + cascade detach | integration | `... tags.test.ts` | ❌ W0 | ⬜ pending |
| UNIT-01 CRUD | TBD | TBD | UNIT-01 | T-3-LIMIT | PLAN_LIMIT; syncUnits; archive | integration | `... units.test.ts` | ❌ W0 | ⬜ pending |
| UNIT-02 Statuses | TBD | TBD | UNIT-02 | T-3-ADMIN | Admin-only catalog; seed defaults | integration | `... unit-statuses.test.ts` | ❌ W0 | ⬜ pending |
| Quota counts | TBD | TBD | Cross | — | me.get matches active counts | integration | extend org/properties tests | ❌ extend | ⬜ pending |
| Plan limit | TBD | TBD | D-39–43 | T-3-LIMIT | Create at limit → PLAN_LIMIT | integration | extend `plan-limit.test.ts` | ⚠️ TODO | ⬜ pending |

*Deferred (no automated tests this phase): PROP-03, PROP-04, PROP-05, UNIT-05. UNIT-03/04 = manual stub-tab UI only.*

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/server/src/__tests__/properties.test.ts` — PROP-01 CRUD, archive cascade, sanitize notes, RLS
- [ ] `apps/server/src/__tests__/units.test.ts` — UNIT-01 CRUD, plan limit, Stripe sync, archive
- [ ] `apps/server/src/__tests__/tags.test.ts` — PROP-02 promote/delete detach
- [ ] `apps/server/src/__tests__/unit-statuses.test.ts` — UNIT-02 seed + admin gate
- [ ] `apps/server/src/__tests__/gallery.test.ts` — S3 mock, limits, delete
- [ ] Replace TODO expects in `plan-limit.test.ts` for properties/units (or dedicated cases)
- [ ] Env examples: `S3_*` / `AWS_*`, `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`

*Existing Vitest infra covers framework install — Wave 0 adds phase test files + env stubs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Properties cards list + create → detail nav | PROP-01, D-08/09 | No FE test runner | Walk UI-SPEC screens 1–2 |
| Mapbox autofill + manual fallback | D-22–25 | External Mapbox token / network | Disable token → structured fields still work |
| TipTap notes toolbar subset | D-13–16 | Visual | Bold/italic/lists/links/headings only |
| Soft-archive confirm (type property name + unit list) | D-30–33 | Dialog UX | Archive property; confirm cascade list |
| PlanLimitGate dialog | D-39–43 | UI gate | Hit property/unit quota; dialog shows counts + upgrade CTA |
| Unit history stub tabs empty | UNIT-03/04 | Stub only | Tabs exist; no fake data |
| Drag-reorder gallery / cover = first | D-34–35 | DnD UX | Reorder; first image is cover |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
