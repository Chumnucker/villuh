# Phase 03.1 — Deferred Items

Out-of-scope discoveries found while executing this phase. Each was verified as
**pre-existing at the phase base commit `bc121c2`** and left untouched per the
executor scope boundary (only auto-fix issues directly caused by the current
task's changes).

---

## D-1 — `pnpm turbo run lint` cannot exit 0 monorepo-wide

Found during: plan 03.1-01, Task 3 gate.

Three independent pre-existing failures block the phase-wide lint/test gate that
every plan in this phase declares. None involve a file this phase touches.

### 1. `@villuh/auth` and `@villuh/api` have a `lint` script but no linter

Both declare `"lint": "eslint ."` and depend on `@villuh/eslint-config`, but
neither declares `eslint` itself as a devDependency, so the binary is absent from
their `node_modules/.bin` under pnpm's strict layout:

```
@villuh/auth:lint: 'eslint' is not recognized as an internal or external command
@villuh/api:lint:  'eslint' is not recognized as an internal or external command
```

Neither package has ever had an `eslint.config.*` file — confirmed absent at
`bc121c2` via `git ls-tree -r --name-only bc121c2`. Fixing this means adding the
devDependency, authoring two flat configs, and then resolving whatever the first
lint run surfaces across two packages unrelated to URL query state.

### 2. `@villuh/landlord-web` lint has one pre-existing error

```
apps/landlord-web/modules/properties/components/view/header.tsx
  52:5  error  Calling setState synchronously within an effect can trigger
               cascading renders                react-hooks/set-state-in-effect
```

Phase 03 code. Fixing it is a behavioural change to the property hero-image load
sequence, not a lint tidy-up.

### 3. `@villuh/server` billing tests fail without live credentials

`src/__tests__/billing.test.ts` — 7 of 10 tests fail. These are integration tests
against a live Postgres and the Stripe API; they need real `STRIPE_*` values in
`apps/server/.env`. Environmental, not a code defect.

### Consequence for this phase

The phase gate as written (`pnpm turbo run lint typecheck test` exits 0) cannot
pass until these are addressed. Until then, substitute the scoped equivalent and
record which workspaces were covered:

```powershell
pnpm turbo run typecheck
pnpm turbo run lint test --filter=@villuh/ui
pnpm turbo run build --filter=@villuh/landlord-web
```

---

## D-2 — `vitest run` exits 1 when zero test files match

Found during: plan 03.1-01, Task 1.

`03.1-01-PLAN.md` Task 1 asserts `pnpm turbo run test --filter=@villuh/ui` exits 0
with "No test files found — acceptable and expected until Task 2". That is not how
vitest 4.1.5 behaves: `passWithNoTests` defaults to `false`, so a zero-match run
exits 1.

Deliberately **not** fixed by setting `passWithNoTests: true` — that would make a
mis-scoped `include` glob silently green forever, which is exactly the class of
false pass D-49 exists to prevent. The criterion is satisfied from Task 2 onward,
once test files exist.
