---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: verifying
stopped_at: Completed 03.3-07-PLAN.md
last_updated: "2026-08-14T17:51:18.994Z"
last_activity: 2026-08-14
progress:
  total_phases: 11
  completed_phases: 3
  total_plans: 52
  completed_plans: 44
  percent: 27
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-29)

**Core value:** A landlord can onboard a tenant from zero to signed lease in one structured flow — without touching email, a spreadsheet, or a separate e-sign tool.
**Current focus:** Phase 03.3 — amenities

## Current Position

Phase: 03.3 (amenities) — EXECUTING
Plan: 9 of 9
Plans: 8, across waves 0–6. Approved by gsd-plan-checker on pass 3 of the revision loop.
Status: Phase complete — ready for verification
URL state via `defineTable` + `useDataTableQueryState`, human-verify checkpoint
approved). Next: 03.1-06 (units overlay trio → URL-backed overlays), then 03.1-07
and 03.1-08 (cleanup, deletes old `useDataTableQuery`).
Last activity: 2026-08-14

Phase 03 (properties-units) remains at plan 8 of 9 (03-09 completed out of order as Wave 4; 05-08 remain).

Progress: [█████████░] 85%

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
| Phase 03.1 P05 | 30min | 3 tasks | 5 files |
| Phase 03.1 P06 | 40min | 3 tasks | 8 files |
| Phase 03.1 P07 | 45min | 2 tasks | 8 files |
| Phase 03.1 P08 | 30min | 3 tasks | 3 files |
| Phase 03.2 P01 | 15min | 2 tasks | 5 files |
| Phase 03.2 P05 | 20min | 2 tasks | 2 files |
| Phase 03.2 P02 | 10min | 3 tasks | 7 files |
| Phase 03.2 P03 | 10min | 2 tasks | 2 files |
| Phase 03.2 P04 | 10min | 2 tasks | 1 files |
| Phase 03.2 P06 | 35min | 3 tasks | 9 files |
| Phase 03.3 P01 | 15min | 3 tasks | 7 files |
| Phase 03.3 P02 | 15min | 3 tasks | 5 files |
| Phase 03.3 P03 | 20min | 3 tasks | 4 files |
| Phase 03.3 P04 | 12min | 3 tasks | 5 files |
| Phase 03.3 P05 | 12min | 3 tasks | 3 files |
| Phase 03.3 P09 | 15min | 2 tasks | 1 files |
| Phase 03.3 P06 | 30min | 2 tasks | 3 files |
| Phase 03.3 P07 | 40min | 2 tasks | 7 files |
| Phase 03.3 P08 | 40min | 3 tasks | 4 files |

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
- [Phase ?]: [Phase 03.2-01]: 0017 floor-plans migration hand-authored (not drizzle-kit generate) — generate is blocked by a pre-existing corrupt snapshot chain (0012_snapshot.json.id = all-zeros collides with 0000 as root) and a stale baseline (0013 is last; 0014-0016 hand-written with no snapshots). Migrator reads journal + .sql only; baseline repair deferred as tech debt
- [Phase ?]: [Phase 03.2-01]: schema migrations must be applied to BOTH the dev DB (DATABASE_URL) and the villuh_test DB (DATABASE_OWNER_TEST_URL) — the server test suites run against villuh_test, so a dev-only migrate leaves them red with missing-column errors
- [Phase 03.2-05]: `WizardDialog` composes `DialogContainer`/`DialogFooter`/`DialogTitle` via `cn()` re-exports (class strings byte-identical by construction) with a zero-byte `dialog.tsx` diff (D-29). The right-column `<form>` is owned by the consumer (`FloorPlanWizard`, plans 06/07) since D-30's export list has no `form` member and the consumer owns the `@tanstack/react-form` instance — the primitive exposes `next()`/`isLast` via `useWizardDialog()` so the consumer's `onSubmit` implements the Enter-must-not-submit contract
- [Phase 03.2-02]: `floorPlans` server module is a statement-for-statement replication of the `properties` module + nested gallery with the noun changed and all billing side-effects omitted (uncapped, D-28); lists alphabetically by `asc(name)` not `createdAt` (D-10); archive is single-row soft (archiveUnit shape), non-cascading (D-11); `presignFloorPlanImage` key nests under the parent property `{org}/properties/{propertyId}/floor-plans/{floorPlanId}/gallery/{uuid}.{ext}` (D-16) and the 25-image cap is double-enforced at presign + `gallery.add` (D-14)
- [Phase 03.2]: 03.2-03: unit property is immutable on update — updateUnitInputSchema omits propertyId and updateUnit never writes it (D-27a). requireFloorPlanInProperty rejects cross-property assignment with BAD_REQUEST on create and update (D-27). squareFootage removed from UNIT_SORT_KEYS/UNIT_SORT_COLUMNS (D-46). New unit columns written only when supplied, never copied from the plan (D-19).
- [Phase ?]: 03.2-04: D-48 floor-plans integration suite is the regression backstop (CRUD/D-09 uniqueness/D-07 number bathrooms/D-27 cross-property both paths/D-27a immutability/D-11 archive-intact/D-19 no-copy/D-14 25-cap/D-16 objectKey-only/D-12 delete/RLS). [Rule 2] createFloorPlan/updateFloorPlan now map the 23505 unique-name violation to BAD_REQUEST so D-09 surfaces correctly.
- [Phase 03.2-06]: `FloorPlanWizard` composes 03.2-05's `WizardDialog` as two independent roots switched on `overlay.value` (`new`|id) — create=`linear` (Details→Photos→Review), edit=`free` (Details→Photos, no Review, D-42). One `@tanstack/react-form` spans each wizard; Review reads live values via `useStore` (D-35). Images stage in memory and persist only on Confirm/Save via the now owner-agnostic `persistStagedGallery` (propertyId dropped, callbacks close over the id, D-43). Duplicate-name BAD_REQUEST maps onto the Name field + jumps to Details (D-09). No org-quota invalidation (floor plans uncapped, D-28/D-47). Pure `lib/floor-plan-display.ts` (Studio, quarter baths, thousands sq ft, ` · `) is the single formatter (D-39). Two scope additions vs `files_modified`: `property-form.tsx` retargeted to the new persist signature, and `wizard/floor-plan-form.ts` added to break the panel↔wizard type cycle (mirrors `property-form-shared.ts`). Wizard has no mount point until 03.2-07 registers the `property.floorPlan` overlay.
- [Phase ?]: [Phase 03.3-01]: Amenities data layer landed — 2 pgEnums (amenity_scope, 38-key amenity_icon) from the same as-const arrays backing the Zod contract (D-04); colorKey reuses TAG_COLOR_KEYS. Four RLS tables (organization_amenity catalog + property_amenity/unit_amenity assignments + property_amenity_image gallery); nullable catalog FKs onDelete set null; is_reservable/requires_approval inert on property_amenity only (D-05); unit_amenity thin (D-24); no reservation enum (D-20). 0019_amenities.sql hand-authored (generate blocked) with 2 partial unique indexes + 4 audit triggers, applied to dev + villuh_test (D-27a). Contract at @villuh/server/schemas/amenities (D-30).
- [Phase ?]: [Phase 03.3-03]: All 38 amenity icon keys resolve through PlatformIcon (D-19) — IconStar shares the default, IconParking/IconHeating/IconOutdoor/IconRooftop reuse existing Garage/Flame/Leaf/Sun imports, 33 new Solar Linear imports added. amenity-icons.ts reuses the 8 shared tag_color swatch/ink maps (D-04, no new palette). AmenityIconColorPicker mirrors TagIconColorPicker with a scrollable 38-icon grid emitting {iconKey,colorKey} (D-42); AmenityChipRow is a read-only denormalized chip primitive with optional +N overflow and no data hooks (D-14/D-23).
- [Phase 03.3]: 03.3-04: property amenity assignments (amenities.property.*) replicate the tags attach/set pattern — denormalize label/icon/color from catalog (D-23), set deletes isNotNull(catalog) rows then re-inserts (freeform survives, D-32); assertScopeAllows rejects unit-scoped on property (D-34); requirePropertyAmenity org filter is the IDOR guard (D-36, update/remove carry no propertyId). Gallery uses a SEPARATE MAX_AMENITY_GALLERY_IMAGES=10 (Pitfall 1) double-enforced in presignAmenityImage + gallery.add; nested S3 key {org}/properties/{propertyId}/amenities/{propertyAmenityId}/gallery/. 17/17 amenities tests green.
- [Phase 03.3]: 03.3-05: unit amenity assignments (amenities.unit.*) complete the amenities API — set/addFreeform/remove + single-query listByProperty (grouped by unitId, no N+1) + one-query idempotent bulkAdd (.onConflictDoNothing() on unit_amenity_catalog_unique, SC-4) and one-query bulkRemove (inArray). Scope via assertScopeAllows(scope,'unit') rejects property-scoped (D-34); requireUnit/requireUnitAmenity org filter is the IDOR guard (D-36). bulkAdd rejects unknown unit/catalog ids via set-size mismatch (NOT_FOUND). 22/22 amenities tests green.
- [Phase ?]: [Phase 03.3-09]: About tab renders real amenities via amenities.property.list -> AmenityChipRow (read-only, D-23); grep proved NO tags-as-amenities stopgap existed (PropertyBadgeRow is legitimate property-tag display), so D-14 collapsed to add-only and PropertyBadgeRow was left untouched.
- [Phase 03.3-06]: Reusable GalleryManager extracted (D-31): presentational, callbacks (onUpload/onDelete/onReorder) + explicit cap threaded to acceptImageFiles remainingSlots + at-cap message (never the 25 default, Pitfall 1). PropertyGalleryManager is now a thin wrapper at cap 25, no regression. AmenityPicker (D-41) is a TagPicker twin: staged (value/onChange) + live property/unit modes, scope-filters catalog to target|both (D-34, UX-only, server re-enforces). Unit single-attach uses idempotent unit.bulkAdd (no single add) to preserve existing rows (D-32); manage-overlay link omitted (no amenity catalog overlay yet).
- [Phase ?]: [Phase 03.3-07]: Amenity sheet reads propertyId from useParams (not usePropertyDetail) — AppOverlays mounts overlay components outside PropertyDetailProvider so the context hook would throw app-wide; matches UnitFormSheet. URL-backed via createOverlays, cold-loads by id (SC-5); foreign id resolves to not-found via the org-scoped list (T-033-18). Catalog Restore uses a session-local recently-archived bucket since catalog.list returns active rows only and no archived-list endpoint exists. amenities/schemas.ts self-references @villuh/server/schemas/tags (not ../tags/schemas.js) so it resolves in the landlord client bundle.
- [Phase 03.3-08]: units amenities surface — opt-in DataTable row selection + selection-action-bar slot (default-off, additive; other tables byte-behavior-unchanged, T-033-20)
- [Phase 03.3-08]: units amenities column fed by one amenities.unit.listByProperty query per distinct property via trpc.useQueries (no per-row N+1, D-33)
- [Phase 03.3-08]: unit-form AmenityPicker staged-then-persist after units.create (mirrors PropertyForm tags-after-create); bulk bar fires one idempotent bulkAdd/bulkRemove each (SC-4)

### Roadmap Evolution

- Phase 03.3 (Amenities) inserted after Phase 3, queued **after** 03.2 — not urgent, does not preempt 03.1. Design spec approved and committed at `docs/superpowers/specs/2026-08-13-amenities-design.md` (2026-08-13). Hard gate: 03.1 must complete first, because the units amenities column touches `units-columns.tsx`, which 03.1 forbids modifying (D-05, D-28). Amenity reservations are designed in the spec but deferred to a phase after Phase 4 — they need tenants and a resident request surface.
- Phase 04 (Tenants, Leases & Documents) **decomposed into independent slices** (2026-08-13): a **tenant slice** (`TENT-01–04`), a **lease slice**, and a **documents/e-sign slice** — each gets its own spec → plan → execution cycle. The tenant slice is **designed & planned** ahead of the queue (execution deferred; Phase 03.2 is still in flight): spec `docs/superpowers/specs/2026-08-13-tenant-slice-design.md`, plan `docs/superpowers/plans/2026-08-13-tenant-slice.md`, commit `c215578`. Chosen execution mode: subagent-driven (fresh subagent per task). Key architecture: tenancy-seam data model the Lease entity later extends without migration; DB-enforced single-active-tenancy-per-unit; occupancy derived not written; activity timeline derived from `audit_log`. Correction logged during design: permissions are the four coarse `ACTION_CATEGORIES` (`permissionProcedure('write')`), **not** per-resource keys — no `role_permissions` migration for tenants. Lease + documents slices are not yet designed.

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

Last session: 2026-08-14T17:49:51.123Z
Stopped at: Completed 03.3-07-PLAN.md
Resume file: None

03.2-06 built the floor-plan wizard (first 03.2 UI plan). `FloorPlanWizard` composes 03.2-05's `WizardDialog` for create (linear, Details→Photos→Review) and edit (free, Details→Photos), owning one form + a staged gallery that persists only on Confirm/Save (D-41). Also shipped: pure `lib/floor-plan-display.ts`, an owner-agnostic `persistStagedGallery` (D-43), and `StagedGalleryField` copy props. Monorepo typecheck 6/6, `dialog.tsx` zero-byte diff intact. The wizard has no mount point yet — 03.2-07 registers the `property.floorPlan` overlay and adds `FloorPlansSection`/`FloorPlanCard`.

Waves 0–2 are complete. 03.1-03 landed `defineTable`, `ids()`/`numeric()`, and `useDataTableQueryState`, plus the remaining `query-state/` barrel lines (`table-params`, `define-table`, `use-data-table-query-state`). `table-params.ts` gained a `"use client"` directive so the barrel re-export resolves in the RSC graph.

**Phase 03.1 execution complete (2026-08-13) — all 8 plans done, one blocking checkpoint remains.** 03.1-05 migrated the units list to `defineTable` + `useDataTableQueryState`; 03.1-06 moved the units overlay trio (form/archive + the `ManageUnitStatusesDialog` flag overlay) to URL-backed overlays via `unitOverlays` + `<LandlordOverlays />`; 03.1-07 did the same for properties (archive/tags entity+flag overlays, gallery lightbox as `pageEntity`); 03.1-08 deleted the dead `useDataTableQuery` (pure deletion — `DataTable` byte-identical), added the `server-input.test.ts` golden freeze of `buildDataTableServerInput`, and signed off `03.1-VALIDATION.md`. All automated gates + eight invariant sweeps are green; `pnpm why nuqs` → single `nuqs@2.9.5`. **Still open:** 03.1-08 Task 3 — the eleven manual browser scenarios (D-46: no component-test toolchain) need `pnpm dev` + a human, then flip `Approval:` in VALIDATION.md. `apps/server`'s 26 red tests are pre-existing TODO scaffolds, untouched by this phase.
