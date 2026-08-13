# Deferred Items — Phase 03.2 (floor-plans)

Out-of-scope discoveries logged during execution. Not fixed here.

## 03.2-01 — pre-existing landlord-web typecheck failures (out of scope)

`pnpm turbo run typecheck` does not exit 0 because of **pre-existing, uncommitted
in-progress work from Phase 03.1** (the units overlay migration, plans 03.1-05/06),
none of which this plan touched. This plan modified only server schema files
(`apps/server/src/schema/{floor-plans,units,index}.ts`), and `@villuh/server`
typechecks clean in isolation (`pnpm --filter @villuh/server run typecheck` exits 0).

Failing files (all uncommitted working-tree changes owned by 03.1):
- `apps/landlord-web/modules/units/components/list/index.tsx` (137,9) — `UnitFormSheet`
  passed `open`/`onOpenChange`/`mode` props but is now an `OverlayComponent` expecting `{ overlay }`.
- `apps/landlord-web/modules/units/lib/units.overlays.ts` (25,19 / 26,18) — overlay
  component signatures not yet migrated to the `{ overlay: OverlayHandle }` contract.
- `apps/landlord-web/modules/units/templates/unit-template.tsx` (78,17) — same `UnitFormSheet` prop mismatch.

**Disposition:** belongs to Phase 03.1's overlay-migration work-in-progress. Do NOT fix
here (SCOPE BOUNDARY — pre-existing failures in unrelated files). The 03.2 acceptance
gate is satisfied by the clean isolated `@villuh/server` typecheck.
