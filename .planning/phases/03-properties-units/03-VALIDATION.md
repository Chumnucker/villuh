---
phase: 3
slug: properties-units
status: draft
nyquist_compliant: true
wave_0_complete: true
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
| 03-W0-* | 01 | 0 | PROP/UNIT + cross | — | Fixtures + stubs | integration stubs | Wave 0 files exist | ✅ | ✅ green |
| PROP-01 CRUD | 03 | 2 | PROP-01 | T-3-XSS / RLS | Sanitize notes; RLS isolation | integration | `pnpm --filter @villuh/server test -- src/__tests__/properties.test.ts` | ✅ | ✅ green |
| PROP-01 Gallery | 03 | 2 | PROP-01 | T-3-S3 | objectKey only; MIME/size; delete S3+row | integration (S3 mocked) | `... gallery.test.ts` | ✅ | ✅ green |
| PROP-02 Tags | 09 | 4 | PROP-02 | — | Promote + cascade detach | integration | `... tags.test.ts` | ✅ | ✅ green |
| UNIT-01 CRUD | 04 | 3 | UNIT-01 | T-3-LIMIT | PLAN_LIMIT; syncUnits; archive | integration | `... units.test.ts` | ✅ | ✅ green |
| UNIT-02 Statuses | 04 | 3 | UNIT-02 | T-3-ADMIN | Admin-only catalog; seed defaults | integration | `... unit-statuses.test.ts` | ✅ | ✅ green |
| Quota counts | 09 | 4 | Cross | — | me.get matches active counts | integration | `... org.test.ts` / `properties.test.ts` quota assertions | ✅ | ✅ green |
| Plan limit | 03 / 04 | 2 / 3 | D-39–43 | T-3-LIMIT | Create at limit → PLAN_LIMIT | integration | dedicated `PLAN_LIMIT` cases in `properties.test.ts` / `units.test.ts` (superseded the Wave 0 `plan-limit.test.ts` stubs) | ✅ | ✅ green |
| Archive cascade + UI | 08 | 7 | D-30–D-33 | T-03-11 | Type-name confirm + full unit list before `properties.archive` | integration + manual | `ArchivePropertyDialog`/`ArchiveUnitDialog` wired; manual UI-SPEC checklist | ✅ | ✅ green |

*Deferred (no automated tests this phase, see `03-DEFERRED.md`): PROP-03, PROP-04, PROP-05, UNIT-05. UNIT-03/04 = manual stub-tab UI only, no automated coverage required.*

*Full non-deferred Phase 3 automated suite (`properties.test.ts`, `units.test.ts`, `tags.test.ts`, `unit-statuses.test.ts`, `gallery.test.ts`) verified green at 03-08 Task 2 (2026-08-11): 5 files, 39 tests passed.*

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `apps/server/src/__tests__/properties.test.ts` — PROP-01 CRUD, archive cascade, sanitize notes, RLS
- [x] `apps/server/src/__tests__/units.test.ts` — UNIT-01 CRUD, plan limit, Stripe sync, archive
- [x] `apps/server/src/__tests__/tags.test.ts` — PROP-02 promote/delete detach
- [x] `apps/server/src/__tests__/unit-statuses.test.ts` — UNIT-02 seed + admin gate
- [x] `apps/server/src/__tests__/gallery.test.ts` — S3 mock, limits, delete
- [x] Replace TODO expects in `plan-limit.test.ts` for properties/units (or dedicated cases) — dedicated PLAN_LIMIT cases landed in `properties.test.ts` (Plan 03) and `units.test.ts` (Plan 04)
- [x] Env examples: `S3_*` / `AWS_*`, `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`

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

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved — non-deferred automated rows green at 03-08 Task 2 (2026-08-11); PROP-03/04/05 and UNIT-05 intentionally deferred per `03-DEFERRED.md`.
