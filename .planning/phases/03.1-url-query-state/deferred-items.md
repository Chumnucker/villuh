# Phase 03.1 — Deferred Items

Out-of-scope discoveries found while executing this phase. Each was verified as
**pre-existing at the phase base commit `bc121c2`** and left untouched per the
executor scope boundary (only auto-fix issues directly caused by the current
task's changes).

---

## D-1 — `pnpm turbo run lint` cannot exit 0 monorepo-wide

Found during: plan 03.1-01, Task 3 gate.
**Status: items 1 and 2 FIXED by the orchestrator; only item 3 remains deferred.**

Three independent pre-existing failures block the phase-wide lint/test gate that
every plan in this phase declares. None involve a file this phase touches.

Items 1 and 2 were fixed rather than deferred, because seven remaining plans each
declare this gate and would otherwise each independently work around it — the gate
would be scoped away for the whole phase and never actually prove anything.
`pnpm turbo run lint` now reports **6 successful, 6 total, 0 errors**.

### 1. `@villuh/auth` and `@villuh/api` have a `lint` script but no linter — FIXED

Both declare `"lint": "eslint ."` and depend on `@villuh/eslint-config`, but
neither declares `eslint` itself as a devDependency, so the binary is absent from
their `node_modules/.bin` under pnpm's strict layout:

```
@villuh/auth:lint: 'eslint' is not recognized as an internal or external command
@villuh/api:lint:  'eslint' is not recognized as an internal or external command
```

Neither package has ever had an `eslint.config.*` file — confirmed absent at
`bc121c2` via `git ls-tree -r --name-only bc121c2`.

**Fix:** added `eslint@^9.39.4` + `eslint-plugin-react-hooks@^7.1.1` as
devDependencies and an `eslint.config.mjs` to each, both mirroring
`packages/ui/eslint.config.mjs` (shared base config plus the classic hooks rules,
not the v7 React Compiler preset). Both packages lint clean on the first run — no
follow-on errors surfaced.

### 2. `@villuh/landlord-web` lint has one pre-existing error — FIXED

```
apps/landlord-web/modules/properties/components/view/header.tsx
  52:5  error  Calling setState synchronously within an effect can trigger
               cascading renders                react-hooks/set-state-in-effect
```

Phase 03 code, and a real correctness bug rather than a lint nit.

**Fix:** the effect reset a boolean (`setHeroLoaded(false)`) on every `heroImage`
change, which is the cascading render the rule names. Replaced the boolean with the
src that actually loaded (`loadedHero`), deriving `heroLoaded` as
`loadedHero === heroImage`. A new image is then un-faded automatically, so no reset
is needed and the synchronous setState is gone. Fade-in behaviour is unchanged,
including the `img.complete` path for HTTP-cached images on back-navigation.

### 3. `@villuh/server` tests fail in this environment — STILL DEFERRED

26 failures across `billing`, `plan-limit`, `permissions`, `audit`, `org` and
`wizard` test files, nearly all `expected 404 to be 200` — the routes under test
are not reachable. Postgres is up and healthy and `apps/server/.env` exists, so
this is not simply a stopped database; it needs real `STRIPE_*` credentials and
possibly routes that later phases still have to implement.

Phase 03.1 touched **zero** files under `apps/server/` — verified with
`git diff --name-only "bc121c2..HEAD" | rg 'apps/server'` returning nothing — so
the phase cannot have caused these and cannot resolve them either.

### Consequence for this phase

`lint` and `typecheck` now pass monorepo-wide and are used unscoped. Only the
`test` task needs scoping, and only to skip `@villuh/server`:

```powershell
pnpm turbo run lint typecheck
pnpm turbo run test --filter=@villuh/ui
pnpm turbo run build --filter=@villuh/landlord-web
```

`@villuh/ui` is the only workspace this phase adds tests to, so this scoping costs
no coverage of phase 03.1 work.

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
