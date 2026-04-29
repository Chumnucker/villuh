---
plan: 01-01
phase: 01-infrastructure-foundation
status: complete
completed: 2026-04-29
commits:
  - 2c1e43b
  - 9f5f6f7
subsystem: monorepo-scaffold
tags: [monorepo, pnpm, typescript, scaffold]
dependency_graph:
  requires: []
  provides: [packages/web, packages/server, packages/db, pnpm-workspace, tsconfig.base.json]
  affects: [all subsequent plans]
tech_stack:
  added: [pnpm workspaces]
  patterns: [typescript-project-references, monorepo-shared-tsconfig]
key_files:
  created:
    - pnpm-workspace.yaml
    - tsconfig.base.json
    - .nvmrc
    - packages/web/package.json
    - packages/web/tsconfig.json
    - packages/server/package.json
    - packages/server/tsconfig.json
    - packages/db/package.json
    - packages/db/tsconfig.json
    - packages/server/src/.gitkeep
    - packages/db/src/.gitkeep
  modified:
    - package.json (root — stripped web deps, added workspace scripts)
    - tsconfig.json (root — replaced with project references)
    - .gitignore (added .vscode/github-accounts.json, packages/*/dist/)
decisions:
  - Root package.json is a bare workspace root with no runtime deps — all web deps in packages/web
  - tsconfig.base.json centralizes compiler options; packages extend it with target-specific overrides
  - server and db use NodeNext module resolution; web uses bundler resolution (Next.js requirement)
metrics:
  duration: "~15 minutes"
  completed: "2026-04-29"
---

# Phase 1 Plan 01: Monorepo Scaffold Summary

**One-liner:** pnpm workspace monorepo with three typed packages (@villuh/web, @villuh/server, @villuh/db) and relocated Next.js files.

## Summary

Converted the single-package Next.js repo into a pnpm workspace monorepo with three packages. All existing Next.js source files (app/, modules/, lib/, hooks/, public/, and config files) were relocated from the repo root into packages/web/. A shared tsconfig.base.json was extracted with strict compiler options; packages/web/tsconfig.json, packages/server/tsconfig.json, and packages/db/tsconfig.json each extend it with package-specific target and module settings. Node version was pinned to 22 via .nvmrc and .vscode/github-accounts.json was excluded from tracking via .gitignore. pnpm install succeeds across all 4 workspace projects (root + 3 packages).

## Key Files Created

- `pnpm-workspace.yaml` — workspace declaration (`packages: ["packages/*"]`)
- `tsconfig.base.json` — shared TypeScript compiler options (strict, bundler resolution, ES2017)
- `packages/web/package.json` — @villuh/web manifest with all Next.js deps + `@villuh/db: workspace:*`
- `packages/web/tsconfig.json` — extends base; sets `baseUrl: "."` and `@/*` path alias for Next.js
- `packages/server/package.json` — @villuh/server shell manifest with tsx devDep
- `packages/server/tsconfig.json` — extends base; NodeNext module resolution, ES2022 target
- `packages/db/package.json` — @villuh/db shell manifest with drizzle-kit devDep
- `packages/db/tsconfig.json` — extends base; NodeNext module resolution, ES2022 target
- `.nvmrc` — Node version pinned to 22

## Files Relocated (root → packages/web/)

- `app/` (layout.tsx, page.tsx, globals.css, favicon.ico, fonts/)
- `modules/` (all UI components and providers)
- `lib/utils.ts`
- `hooks/.gitkeep`
- `public/.gitkeep`
- `next.config.mjs`, `postcss.config.mjs`, `components.json`, `eslint.config.mjs`

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `packages/web/app/layout.tsx` — FOUND
- `packages/web/app/page.tsx` — FOUND
- `packages/web/modules/common/ui/` — FOUND (24 components)
- `packages/web/lib/utils.ts` — FOUND
- `packages/server/src/.gitkeep` — FOUND
- `packages/db/src/.gitkeep` — FOUND
- Root `app/` — NOT FOUND (correctly removed)
- Root `modules/` — NOT FOUND (correctly removed)
- Root `lib/` — NOT FOUND (correctly removed)
- Root `public/` — NOT FOUND (correctly removed)
- `pnpm-workspace.yaml` contains `packages/*` — VERIFIED
- `tsconfig.base.json` contains `"strict": true` — VERIFIED
- `.nvmrc` contains `22` — VERIFIED
- `.gitignore` contains `.vscode/github-accounts.json` — VERIFIED
- `packages/web/tsconfig.json` contains `"extends": "../../tsconfig.base.json"` and `"baseUrl": "."` — VERIFIED
- `pnpm install` completed successfully (4 workspace projects, 832 packages resolved) — VERIFIED
- Commit `2c1e43b` exists — VERIFIED
- Commit `9f5f6f7` exists — VERIFIED
