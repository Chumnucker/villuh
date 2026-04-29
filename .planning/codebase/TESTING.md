# Testing

## Current State

There are **zero test files** in this codebase. No test runner, assertion library, mocking layer, or test utilities have been installed. The `package.json` defines no `test` script. This is a greenfield project at an early stage with only an initial commit.

## Recommended Test Setup

Given the stack (Next.js App Router, React 19, TypeScript strict, Tailwind, CVA, Radix/Base UI), the appropriate testing setup is:

### Unit and Component Tests — Vitest + React Testing Library

**Why Vitest over Jest:**
- Native ESM support (`"type": "module"` in `package.json`) — Jest requires significant transform configuration; Vitest works out of the box.
- Faster cold start and watch mode.
- Compatible API with Jest (`describe`/`it`/`expect` globals) — trivial migration path if needed.
- First-class TypeScript support without a separate `ts-jest` adapter.

**Packages to install:**

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

**Minimal `vitest.config.ts`:**

```ts
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
})
```

**`vitest.setup.ts`:**

```ts
import "@testing-library/jest-dom"
```

**Add to `package.json` scripts:**

```json
"test": "vitest",
"test:ui": "vitest --ui",
"test:coverage": "vitest run --coverage"
```

### End-to-End Tests — Playwright

For testing routing, breadcrumb behaviour, and theme switching (all of which depend on browser APIs or Next.js navigation), Playwright is the right tool.

```bash
npm install -D @playwright/test
npx playwright install
```

Playwright tests live in `e2e/` at the repo root and run against `npm run dev` or a production build.

## What to Test First — Priority Order

### 1. `lib/utils.ts` — `cn()`

Pure function, no dependencies on browser or React. Trivial to test, high leverage since every component depends on it.

```ts
// lib/utils.test.ts
import { cn } from "@/lib/utils"

it("merges class names", () => {
  expect(cn("px-2", "px-4")).toBe("px-4") // tailwind-merge deduplication
})

it("handles conditional classes", () => {
  expect(cn("base", false && "ignored", "added")).toBe("base added")
})
```

### 2. `modules/common/ui/` — UI Primitives

- **`button.tsx`**: Render with each variant/size combination; verify `data-slot`, `data-variant`, `data-size` attributes; test `asChild` renders the slot rather than a `<button>`; test `disabled` applies `pointer-events-none`.
- **`input.tsx` — `PasswordInput`**: Test the show/hide password toggle (click the eye button, assert `type` changes from `password` to `text`).
- **`field.tsx` — `FieldError`**: Test deduplication logic — pass duplicate error messages, assert only one is rendered.

### 3. `modules/app/providers/layout-provider.tsx` — `useLayout` guard

Test that `useLayout` throws when called outside `LayoutProvider`:
```ts
expect(() => render(<Consumer />)).toThrow("Should use useLayout with LayoutProvider")
```

### 4. `modules/app/components/navigation/breadcrumbs.tsx` — Breadcrumb logic

The path-to-crumb derivation (UUID detection, label lookup, custom override merging) is non-trivial and currently untested. Unit-test the transformation logic in isolation, or integration-test via RTL with a mocked `usePathname`.

### 5. End-to-end — Theme toggle

The `ThemeHotkey` component wires a `keydown` listener for `d` to toggle light/dark. An E2E test covering this keyboard shortcut confirms the global event handler is registered correctly.

## Coverage Gaps

| Area | Gap |
|---|---|
| `cn()` utility | No tests at all |
| CVA variant correctness | No tests verifying variant/size combinations produce expected class output |
| `PasswordInput` toggle | Stateful interaction untested |
| `FieldError` deduplication | Business logic in a UI component, untested |
| `useLayout` guard | Error boundary behaviour untested |
| Breadcrumb path parsing | Complex string logic, untested |
| Theme hotkey (`d` key) | Event listener wiring untested |
| Next.js routing / pages | No route-level integration tests |

## File Placement Convention

```
lib/
  utils.ts
  utils.test.ts          # co-locate unit tests with source
modules/
  common/ui/
    button.tsx
    button.test.tsx
    input.tsx
    input.test.tsx
e2e/
  theme.spec.ts          # Playwright E2E tests
vitest.config.ts
vitest.setup.ts
```

Co-locate unit/component tests with their source files. Keep E2E tests in a top-level `e2e/` directory separate from source.

---
*Last mapped: 2026-04-29*
