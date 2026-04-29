# Architecture

## Overview

Villuh is a Next.js 16 application using the App Router with React Server Components. The frontend is the entire application at this stage — there is no backend, database, or external API surface. The architecture is intentionally thin: a framework shell, a module-based component system, and a styling layer.

## Rendering Model

Next.js App Router with React Server Components (RSC) is the default. Client Components are opted into explicitly with `"use client"` directives and are used only where browser APIs or React state/effects are required. This means most pages and layouts render on the server; interactive shells (providers, navigation, theme) run on the client.

## Request Lifecycle

```
Browser → Next.js Edge/Node runtime
  → app/layout.tsx (RSC)        — font loading, provider wrapping
    → ThemeProvider (Client)    — next-themes class-based theming
      → LayoutProvider (Client) — breadcrumb state context
        → page.tsx (RSC)        — page content, imports Client Components as needed
```

Turbopack handles bundling in development. Production builds use the standard Next.js build pipeline.

## Module System

All non-framework code lives under `modules/`. Modules are domain-scoped groups of components, providers, and utilities. The two current modules are:

- `modules/app` — application-level concerns: providers, layout primitives, navigation
- `modules/common` — shared, domain-agnostic UI components and utilities

This separation means `modules/app` depends on framework concerns (routing, context, layout), while `modules/common` contains reusable UI that has no opinion about page structure.

The `shadcn` CLI is configured (via `components.json`) to write new components into `modules/common/ui`, keeping the common UI library the canonical destination for all scaffolded primitives.

## State Management

There is no global state library. State is managed through:

1. React built-ins (`useState`, `useContext`) for local and shared UI state
2. `LayoutContext` — a single React context that carries breadcrumb state across the layout tree, provided by `LayoutProvider` and consumed via the `useLayout` hook

No server state library (SWR, React Query, Zustand, etc.) is present.

## Theming

`next-themes` manages dark/light/system theme switching via a CSS class (`dark`) on the `<html>` element. The theme can be toggled programmatically at runtime using the `D` keyboard shortcut (implemented in `ThemeHotkey` inside `ThemeProvider`). All color tokens are defined as CSS custom properties in `app/globals.css` using OKLCH values, with separate `:root` (light) and `.dark` blocks.

## Styling Architecture

Tailwind CSS v4 is used with a CSS-first configuration — there is no `tailwind.config.*` file. All theme tokens are declared in `app/globals.css` via `@theme` and `@theme inline` blocks. Custom spacing tokens (`--spacing-navbar`, `--spacing-page`) are defined there as well.

Class composition follows this pattern everywhere:
- `cva` (class-variance-authority) for typed variant definitions on components
- `cn()` (`clsx` + `tailwind-merge`) for conditional and merged class strings at call sites

## Path Aliases

The TypeScript path alias `@/*` maps to the project root, so all cross-module imports use absolute-style paths:

```
@/modules/common/ui/button
@/modules/app/providers/layout-provider
@/lib/utils
@/hooks/<hook-name>
```

## External Integrations

None at this stage. No database, no auth, no analytics, no error tracking, no CI/CD pipeline. The only outbound network calls are:
- Google Fonts CDN (Inter, at build/render time via `next/font/google`)
- `ui.shadcn.com` registry (dev-time only, when running the shadcn CLI)

---
*Last mapped: 2026-04-29*
