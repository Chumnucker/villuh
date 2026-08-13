---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed 03.1-03-PLAN.md
last_updated: "2026-08-13T18:06:00.614Z"
last_activity: 2026-08-13 -- Phase 03.2 planning complete
progress:
  total_phases: 11
  completed_phases: 1
  total_plans: 43
  completed_plans: 25
  percent: 9
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-29)

**Core value:** A landlord can onboard a tenant from zero to signed lease in one structured flow — without touching email, a spreadsheet, or a separate e-sign tool.
**Current focus:** Phase 03.1 — URL query state (nuqs)

## Current Position

Phase: 03.1 (url-query-state) — IN PROGRESS, Waves 0–2 complete
Plans: 8, across waves 0–6. Approved by gsd-plan-checker on pass 3 of the revision loop.
Status: Ready to execute
(overlay primitives) and 03.1-03 (`defineTable` + `useDataTableQueryState`)
complete. The `table-params` + `define-table` + `use-data-table-query-state`
barrel lines have landed; every query-state module resolves at runtime (green
landlord-web build). Next: 03.1-05 (units list migration to `defineTable`).
Last activity: 2026-08-13 -- Phase 03.2 planning complete

Phase 03 (properties-units) remains at plan 8 of 9 (03-09 completed out of order as Wave 4; 05-08 remain).

Progress: [████████░░] 78%

### Phase 03.1 planning notes

Three verification passes were needed, and all three found defects in the same
layer: the acceptance criteria's shell commands, never the plans' substance
(dependency graph, decision coverage, wiring and scope were approved on pass 1
and unchanged since).

The root cause is worth carrying forward. This machine's shell is Windows
PowerShell 5.1 with no `grep`, no working `bash`, and no `&&` operator, so the
POSIX criteria the planner produced could not run. Fixing that by textual
translation instead of by execution introduced a second generation of defects
that were worse than the first, because they *looked* correct and returned
plausible exit codes:

- `rg -qE` — `-E` is ripgrep's `--encoding`, so the command exits 2, which
  satisfies any "returns non-zero" criterion. One gate could not fail.

- `rg` takes a regex, so literal patterns containing `(`, `)`, `[`, `]`, `$`
  matched the wrong text rather than erroring.

- grep's BRE `\|` is a literal pipe in rg, so alternation criteria matched
  nothing and read as passes.

- The `&&` → `;` rule leaked into patterns quoting TypeScript source.
- PowerShell strips inner double quotes before a native exe sees them.
- Four criteria were gated by tokens their own task mandates in comments,
  making them unsatisfiable — and the cheapest escape reintroduced a real bug.

D-49 now encodes all of this, and every plan carries a `<shell_contract>`
block. The operative rule: **run every command before recording its result,
especially the ones expected to return non-zero** — a malformed command, an
unknown flag, and a genuine pass are indistinguishable by exit code alone.

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
| Phase 03 P01 | 25min | 2 tasks | 12 files |
| Phase 03 P02 | 45min | 2 tasks | 9 files |
| Phase 03 P03-03 | 65min | 2 tasks | 15 files |
| Phase 03 P04 | 40min | 2 tasks | 13 files |
| Phase 03 P09 | 35min | 2 tasks | 6 files |
| Phase 03 P05 | 55min | 2 tasks | 13 files |
| Phase 03 P06 | 65min | 2 tasks | 9 files |
| Phase 03 P07 | 70min | 2 tasks | 10 files |
| Phase 03.1 P01 | 22min | 3 tasks | 11 files |
| Phase 03.1 P02 | 20min | 3 tasks | 4 files |
| Phase 03.1 P04 | 20min | 3 tasks | 5 files |
| Phase 03.1 P03 | 25min | 3 tasks | 5 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Pre-Phase 1]: `villuh_app` non-owner Postgres role must be created before the first migration or RLS is silently bypassed
- [Pre-Phase 1]: Two Stripe webhook endpoints required — `/webhooks/stripe/subscriptions` and `/webhooks/stripe/connect` with separate secrets
- [Phase 1]: Monorepo: pnpm workspace, packages/web + packages/server + packages/db (@villuh/db), existing Next.js moves to packages/web/, plain pnpm scripts
- [2026-08-11]: Split frontends into `apps/landlord-web` + `apps/resident-web`; hosts `{slug}.app.villuh.com` / `{slug}.villuh.com`; shared Express+tRPC API; resident portal in-scope
- [2026-08-11]: Extracted `@villuh/ui`, `@villuh/auth`, `@villuh/api`; app-specific `UserProvider`/`me` stays per app
- [2026-08-11]: **API locked: Express + tRPC** (not Hono / not `hono/client`). Docs updated; older phase plans mentioning Hono are historical
- [2026-08-11]: UI cache = TanStack Query + `invalidateOnSuccess`/`invalidateQueries`; Postgres = SoT; Redis deferred (ADR-001)
- [Phase 1]: Audit log: Postgres triggers, full JSONB snapshots (old+new), all tenant tables, SET LOCAL actor, RLS on audit_log, 'system' sentinel, monthly partitioned, immutable via trigger
- [Phase 1]: Icon library: @solar-icons/react (Linear) is sole library via PlatformIcon; lucide-react and @central-icons-react removed
- [Phase 1]: No CI, no Railway deploy in Phase 1 — local validation only; CI and Railway deferred to Phase 2
- [Pre-Phase 4]: DocuSign developer account setup is a prerequisite — must be scheduled early (approval process takes time)
- [Pre-Phase 5]: Flow engine must use a custom `onboarding_session` token (not Better Auth magic link) due to 5-minute expiry incompatibility; snapshot_json must be copied to instance at activation
- [Phase 03]: Phase 3 Wave 0: Tabs primitive hand-built on radix-ui's bundled Tabs export (matching dialog.tsx/select.tsx conventions) instead of the shadcn CLI
- [Phase 03]: Repaired missing drizzle-kit migration snapshot (0003-0012 never had committed meta/*.json); rebuilt baseline via introspect against live DB, trimmed to only the 6 new Phase 3 tables
- [Phase 03]: audit_log test cleanup: TRUNCATE (not DELETE) — bypasses immutability trigger blocking the organization cascade delete
- [Phase 03]: Vitest 4: replaced invalid top-level singleFork with maxWorkers: 1 (kept default isolate so per-file S3 SDK mocks don't leak across test files)
- [Phase 03]: Gallery images store S3 objectKey only; presigned GET URLs attached to gallery.list responses at read time, never persisted
- [Phase 03]: syncOrgUnitQuantity extracted to domain/billing-sync.ts (Pattern 8) — units.create/archive and properties.archive cascade call it directly, post-commit, outside any DB transaction
- [Phase 03]: Tags icon/color enforced via Zod z.enum fixed palette (14 icons / 8 colors) instead of free text — rejects out-of-palette values at the API boundary (D-21, T-03-16)
- [Phase 03]: Added unitCount to properties.service.listProperties (grouped count query) since the UI-SPEC card footer requires it and no endpoint exposed it
- [Phase 03]: Added @tiptap/extension-placeholder@3.30.0 for the NotesEditor 'Add notes...' placeholder (D-16) — no existing dependency covered it
- [Phase 03]: PropertyUnitsSection owns its own locked UnitFormSheet instance (propertyId prop) rather than an onAddUnit callback — single reusable Sheet shared by /units and the property nested Units section
- [Phase 03]: units.list/get stay unjoined; landlord UI builds propertyId->property and statusId->status lookup Maps client-side from properties.list/unitStatuses.list rather than adding a backend join
- [Phase 03]: TagPicker is dual-mode: staged local array during property create, live tRPC mutations once propertyId exists (03-07)
- [2026-08-11]: Icon library migrated to @solar-icons/react Linear; PlatformIcon keeps Central-style keys (tag/status DB values) mapped to Solar equivalents; IconWrench → SledgehammerIcon
- [Phase 03.1]: URL state = nuqs, **not** Next.js intercepting/parallel routes (D-01, D-02). Intercepting routes' only unique capability is an SSR'd full-page twin no Villuh surface needs, and they cannot express two overlays at once or compose with table state in one shareable link
- [Phase 03.1]: Overlays are declared per module via `createOverlays(namespace, …)` and auto-mounted globally by `<AppOverlays>`; overlays with a non-serializable dependency (the gallery lightbox's `originRef`) use `pageEntity()` and stay locally placed (D-08, D-31, D-32, D-47)
- [Phase 03.1]: Table filter/sort/page state = one readable query param per field via `defineTable(name, namespace, …)`; `name` is the definition-unique key-registry owner, `namespace` is the URL prefix — the two cannot be the same value or the collision guard never fires for two unprefixed tables on one page (D-21, D-29)
- [Phase 03.1]: Filter value escaping is `~~`/`~c`/`~s` with a **single left-to-right decode scan**. Three sequential `.replace` passes are not bijective — `"~c"` encodes to `"~~c"` and decodes to `"~:"` (D-45)
- [Phase 03.1]: All plan verification commands must be Windows PowerShell 5.1 and must be **executed** before being recorded, especially the ones expected to return non-zero (D-49). No `grep`, no POSIX `find`/`diff`, no `&&`, no `rg -E` (that is `--encoding`), no glob in a path argument
- [Phase 03.1-01]: `packages/ui` vitest keeps `passWithNoTests` at its default `false` — a zero-match run must stay red, or a mis-scoped `include` glob reports green forever
- [Phase 03.1-02]: A bare valueless alias (`empty` / `!empty`) is recognised only as the WHOLE param value, checked before the token loop — under D-45's grammar a token without `:` is a continuation value, so that is the only unambiguous place to accept it, and it is exactly D-45's empty-is-exclusive-per-field rule
- [Phase 03.1-02]: `packages/ui/src/data-table.tsx` imports cleanly into the jsdom-less node vitest project (React + `@tanstack/react-table` + the whole `data-grid/` tree), so `table-params.ts` can take `DATA_TABLE_PAGE_SIZES` straight from it with no shim — relevant to 03.1-03, which imports the same module
- [Phase 03.1-02]: `table-params.ts` is deliberately NOT yet re-exported from `packages/ui/src/index.ts`; per D-04 the barrel line must land with `defineTable` in 03.1-03, before any app-side config can reach the parsers
- [Phase 03.1-04]: The erased group type `<AppOverlays modules>` accepts is hand-written with a widened index union, **not** `OverlayGroup<Record<string, OverlayDef>>` — erasing the key union collapses `OverlayHandles<C>` into an `OverlayHandle`-valued string index signature, and `closeAll: () => void` in that same object is then incompatible with it, so no concretely-typed group is assignable. The file compiles clean on its own because its first call site is two plans away
- [Phase 03.1-04]: A plan that builds a consumer whose first real call site is in a later plan owes a **compile-time** assignability test in the plan that builds it — that is the only thing that caught the `AnyOverlayGroup` defect before 03.1-06
- [Phase 03.1-04]: `IconQuestionCircle` and `IconLock` are not `PlatformIconName` keys (the map has no lock or question glyph); `OverlayBody` uses `IconCircleInfo` for not-found and `IconEyeClosed` for forbidden rather than adding icons
- [Phase 03.1-04]: `next/navigation` imports cleanly into the jsdom-less node vitest project — `overlays.tsx` is the first runtime `next/*` import in `packages/ui` and needs no shim
- [Phase 03.1-03]: `defineTable(name, namespace, config)` registers URL keys under the definition-unique `name`, never `namespace ?? "table"` — the D-29 collision guard only fires for its stated trigger (a second UNPREFIXED table) when the owner is the name; a namespace-derived owner reads two unprefixed tables as HMR and returns silently
- [Phase 03.1-03]: Every nuqs-touching module under `query-state/` must carry `"use client"`. nuqs's own `dist/index.js` is a client module, so once the barrel re-exported `table-params.ts` (which lacked the directive) it evaluated in the RSC server graph where `parseAsIndex` is a client-reference proxy and `.withDefault` is not a function — the landlord-web build (D-39 gate) is what caught it
- [Phase 03.1-01]: Of the three pre-existing failures blocking the phase gate, two were fixed (missing eslint setup in `@villuh/api`/`@villuh/auth`; `set-state-in-effect` in the property header) so `lint typecheck` run unscoped. Only `test` is scoped, to `--filter=@villuh/ui`, skipping `@villuh/server`'s environment-blocked suite. See `.planning/phases/03.1-url-query-state/deferred-items.md`
- [Phase 03.2]: **A unit's property is immutable after creation (D-27a).** `updateUnitInputSchema` currently accepts `propertyId` and `updateUnit` writes it; that capability is removed rather than accommodated, because reassignment is the only route to a unit inheriting from another property's floor plan — a state D-27 rejects on create and update, and one the `ON DELETE SET NULL` FK cannot catch (a property change is a `units` write the `floor_plans` constraint never sees). The client-side lock lives in `unit-form-sheet.tsx` keyed off `mode === "edit"`, not in `units/components/list/index.tsx`, which 03.1-05/06 rewrite. Miskeyed units are corrected by archive + recreate
- [Phase 03.2]: Sq ft joins Beds/Baths/Floor plan as a **non-sortable** units column — all four render inheritance-resolved values the server never computes (D-20), so a server sort orders by the raw nullable column and disagrees with the screen. Requires removing `squareFootage` from `UNIT_SORT_KEYS` **and** updating 03.1-05's acceptance criterion, which asserts the old list
- [Phase 03.2]: `WizardDialog` composes `DialogContainer` via `className` — `cn()` is `twMerge`, so `sm:max-w-md`→`sm:max-w-4xl` merges while the unprefixed `max-w-[calc(100%-2rem)]` survives. Use **`sm:flex-row`**, not the unprefixed `flex-row` RESEARCH §6 suggests; unprefixed forces a row layout at every width and silently breaks D-32's mobile stack. This is what makes D-29's zero-byte `dialog.tsx` diff and D-31's geometry satisfiable together
- [Phase 03.2]: The server test suite is **red at baseline** — 27 pre-existing failures (billing/plan-limit/permissions/audit/org/wizard, all Phase 2 territory). `properties`, `units`, `gallery` pass. Every server-test acceptance criterion must target one file (`pnpm --filter @villuh/server exec vitest run src/__tests__/floor-plans.test.ts`), never `turbo run test --filter=@villuh/server`, which can never exit 0

### Roadmap Evolution

- Phase 03.3 (Amenities) inserted after Phase 3, queued **after** 03.2 — not urgent, does not preempt 03.1. Design spec approved and committed at `docs/superpowers/specs/2026-08-13-amenities-design.md` (2026-08-13). Hard gate: 03.1 must complete first, because the units amenities column touches `units-columns.tsx`, which 03.1 forbids modifying (D-05, D-28). Amenity reservations are designed in the spec but deferred to a phase after Phase 4 — they need tenants and a resident request surface.

### Pending Todos

None yet.

### Quick Tasks Completed

| Date | Slug | Summary |
|------|------|---------|
| 2026-08-12 | property-detail-tabs | Property detail page split into 5 route-backed tabs (About/Units/Gallery/Tenants/Analytics); ported metric-card + bklit charts + lightbox into `@villuh/ui`; new Base UI tabs primitive. See `.planning/quick/20260812-property-detail-tabs/` |

### Blockers/Concerns

- `pnpm turbo run lint` and `typecheck` now pass monorepo-wide (6/6, 0 errors). Two pre-existing blockers were fixed during 03.1 rather than deferred, since seven remaining plans declare the same gate: `@villuh/auth` and `@villuh/api` gained `eslint` + an `eslint.config.mjs` mirroring `packages/ui`, and `properties/components/view/header.tsx` no longer resets a boolean synchronously inside an effect (it tracks which src loaded instead). Only `apps/server`'s 26 test failures remain deferred — they need real `STRIPE_*` credentials and possibly unimplemented routes, and 03.1 touches no server files. See `.planning/phases/03.1-url-query-state/deferred-items.md`
- DocuSign developer account not yet set up — required before Phase 4 begins; schedule account creation early
- Railway PgBouncer mode: confirm transaction-mode pooling (not session mode) for `set_config` compatibility before Phase 1 ships
- Inbound message routing (Twilio/Resend) architecture is TBD — needs dedicated research at Phase 7 start

## Session Continuity

Last session: 2026-08-13T17:45:00.000Z
Stopped at: Completed 03.1-03-PLAN.md
Resume file: None

Waves 0–2 are complete. 03.1-03 landed `defineTable`, `ids()`/`numeric()`, and `useDataTableQueryState`, plus the remaining `query-state/` barrel lines (`table-params`, `define-table`, `use-data-table-query-state`). `table-params.ts` gained a `"use client"` directive so the barrel re-export resolves in the RSC graph. Next: 03.1-05 (units list migration to `defineTable` + `useDataTableQueryState`), which also validates `query.filters` reference identity against `DataTable`'s page-snap comparison.
