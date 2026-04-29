# Conventions

This document describes the coding conventions, patterns, and style rules used in this codebase. Follow them consistently when adding or modifying code.

## TypeScript

- **Strict mode is on.** `tsconfig.json` sets `"strict": true`. Do not disable or work around strict checks.
- **No implicit `any`.** Explicitly type everything that TypeScript cannot infer. The `as any` escape hatch appears only once in the codebase (`icon.tsx`) and only to paper over an upstream library limitation — avoid it everywhere else.
- **`interface` for object shapes, `type` for aliases and unions.** Context props and domain data use `interface`; variant/prop union types use `type`.
- **Export types alongside values.** When a component has a meaningful variant or prop type that callers may need, export it: `export type ButtonVariants`, `export type BreadcrumbsType`, `export type InputVariantProps`.
- **`React.ComponentProps<"element">` for wrapper components.** When a component wraps a native element with no behavioural changes, derive its props from `React.ComponentProps<"div">` rather than writing out a manual interface. Use `Omit<React.ComponentProps<"input">, "size">` when a prop needs to be replaced by a more specific version.
- **Path alias `@/` maps to the repo root.** Always use `@/lib/utils`, `@/modules/...`, etc. — never relative paths that traverse upward more than one level.

## Component Structure — CVA / cn Pattern

All interactive and styled UI components follow the same three-part pattern:

1. **Variant definition with `cva`.** Define a `const xVariants = cva(baseClasses, { variants, defaultVariants })` at the top of the file before any component functions. Export the variants object when callers need to compose it (e.g. `buttonVariants`, `inputVariants`).

2. **Props interface extends `VariantProps<typeof xVariants>`.** Combine native element props with `VariantProps` using `interface` or an inline `&` intersection. When the native element has a conflicting `size` prop, omit it: `Omit<React.ComponentProps<"input">, "size"> & VariantProps<typeof inputVariants>`.

3. **`cn()` applies variants and merges overrides.** Always call `cn(xVariants({ variant, size, className }))` — never concatenate class strings directly. The `cn` helper lives in `@/lib/utils` and combines `clsx` + `tailwind-merge`.

```ts
// lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### data-slot attributes

Every component element carries a `data-slot="component-name"` attribute (e.g. `data-slot="button"`, `data-slot="card-header"`, `data-slot="input"`). This enables CSS parent selectors and cross-component styling without leaking class names. Components also set `data-variant` and `data-size` attributes to mirror the active props.

### Slot / asChild pattern

Use `Slot.Root` from `radix-ui` for the `asChild` prop pattern. Toggle `const Comp = asChild ? Slot.Root : "button"` and spread props onto `<Comp>`.

## Naming Conventions

- **Files:** `kebab-case.tsx` for all components and modules (e.g. `button.tsx`, `layout-provider.tsx`, `breadcrumbs.tsx`).
- **Components:** `PascalCase` function names (e.g. `Button`, `LinkButton`, `NavigationBreadcrumbs`).
- **Hooks:** `use` prefix, `camelCase` (e.g. `useLayout`).
- **Context objects:** `PascalCase` ending in `Context` (e.g. `LayoutContext`).
- **Provider components:** `PascalCase` ending in `Provider` (e.g. `LayoutProvider`, `ThemeProvider`).
- **Variant objects:** `camelCase` ending in `Variants` (e.g. `buttonVariants`, `inputVariants`, `fieldVariants`).
- **Type aliases for variant props:** `PascalCase` ending in `Variants` or `Props` (e.g. `ButtonVariants`, `InputVariantProps`).
- **Constants:** `SCREAMING_SNAKE_CASE` for truly static lookup tables (e.g. `STATIC_LABELS`).
- **Multi-word variant keys:** use `kebab-case` string literals (e.g. `"ghost-muted"`, `"icon-sm"`).

## Import Style

- No semicolons (`.prettierrc`: `"semi": false`).
- Double quotes for strings.
- Trailing commas where ES5 allows (`"trailingComma": "es5"`).
- 2-space indentation, LF line endings, 80-character print width.
- Import order: external packages first, then internal `@/` aliases, then relative siblings.
- `import * as React from "react"` (namespace import) in library-style UI files; named imports in application-layer files.
- Prettier sorts Tailwind classes automatically via `prettier-plugin-tailwindcss` configured with `tailwindFunctions: ["cn", "cva"]`. Never manually reorder class lists.

## File Organisation

- `modules/common/ui/` is the design system layer — generic primitives only. No business logic.
- `modules/app/` contains app-shell concerns: global layout, navigation, theming.
- `app/` holds only route files and the root layout. Import from `@/modules/...` and `@/lib/...`.
- No barrel `index.ts` files — import directly from the source file path.
- There is no `components/` directory at the root; components live under `modules/`.

## Error Handling Patterns

- **Context guard pattern.** Every custom hook that reads a React context validates the value and throws a descriptive error if used outside the required provider:

```ts
export const useLayout = (): LayoutContext => {
  const context = useContext(LayoutContext)
  if (context === null) {
    throw new Error("Should use useLayout with LayoutProvider")
  }
  return context
}
```

- Do not swallow errors silently. If a condition should be impossible, throw rather than returning `null` or a fallback.

## React Server vs Client Components

- **Default to Server Components.** Do not add `"use client"` unless the component requires browser APIs, React state/effects, or client-only libraries.
- **Mark `"use client"` as the very first line**, before any imports.
- **Provider files are Client Components.** `layout-provider.tsx` and `theme-provider.tsx` are both `"use client"`.
- **Navigation / routing hooks require `"use client"`.** Any component calling `usePathname`, `useRouter`, etc. must be a Client Component.

## Styling Conventions

- **Tailwind CSS v4** via `@tailwindcss/postcss`. Design tokens defined in `app/globals.css` via `@theme` and `:root` blocks.
- **OKLCH color space** for all design tokens (e.g. `oklch(1 0 0)`).
- **Semantic color tokens only** in component classes: `bg-primary`, `text-muted-foreground`, `border-ring`. Never hardcode raw color values.
- **Custom spacing tokens:** `--spacing-navbar` (`h-navbar`) and `--spacing-page` (`px-page`) for consistent layout spacing.
- **Dark mode** is class-based (`dark:` variant). System preference is the default theme.
- **`data-*` attribute selectors** preferred over extra wrapper elements for conditional styling.
- **`group/name` and `peer/name` named groups** for complex parent-child styling (e.g. `group/card`, `group/button`).

---
*Last mapped: 2026-04-29*
