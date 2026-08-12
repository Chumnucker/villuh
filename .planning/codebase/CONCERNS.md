# Concerns

## Tech Debt

- **Deleted `components/` directory vs stale README** — `README.md` still references the old `components/` path. The directory was replaced by the `modules/` structure.
- **Commented-out breadcrumb logic** — `modules/app/components/navigation/breadcrumbs.tsx` contains commented-out code that has not been cleaned up.
- **Empty `next.config.mjs`** — No custom Next.js configuration is in place (no headers, redirects, image domains, etc.). Will need attention when the app grows.
- **Placeholder empty directories** — `hooks/` and `modules/common/components/` are empty and serve only as placeholders.
- **Dual icon libraries** — Resolved: `@solar-icons/react` (Linear) is the sole library via `PlatformIcon`.
- **`shadcn` CLI in production dependencies** — The `shadcn` package appears to be in `dependencies` rather than `devDependencies`.
- **`--font-mono` CSS variable used for a serif/display font** — `Gambetta-Variable` is a display/serif font, but it's being loaded under the `--font-mono` CSS variable name, which is semantically misleading.

## Security

- **`.vscode/github-accounts.json` committed to the repo** — This file may contain sensitive credential or account information and should be in `.gitignore`.
- **No CSP headers configured** — `next.config.mjs` has no Content-Security-Policy header configuration.
- **`rel="noopener noreferrer"` on internal links** — Some internal navigation links may have `noopener noreferrer` set unnecessarily, which is only needed for external links.

## Performance

- **`@central-icons-react/all` imports full icon registry** — Resolved: icons are imported per-file from `@solar-icons/react/linear/*`.
- **Missing `metadata` export in `app/layout.tsx`** — No SEO metadata (title, description) is configured in the root layout.

## Fragile Areas

- **Breadcrumb label resolution is static-map-only** — `NavigationBreadcrumbs` resolves labels from a hardcoded map. Dynamic routes or new pages won't appear correctly without manually updating the map.
- **`LayoutContext` throws at runtime if used outside provider** — `useLayout` throws an error if consumed outside `LayoutProvider`, which can cause hard crashes if the provider tree changes.
- **`PlatformIcon` silently ignores `stroke` prop** — Resolved: `stroke` is forwarded as Solar `strokeWidth` (prefer `strokeWidth` on new call sites).
- **`PasswordInput` spreads props onto a wrapper `div`** — Input props (e.g., `onChange`, `value`) are spread onto a `div` wrapper instead of the `input` element, which is a functional bug.

## Missing Critical Features

- **No test infrastructure** — Zero test files, no testing framework configured. No Jest, Vitest, Playwright, or similar.
- **`Toaster` (Sonner) never mounted** — `modules/common/ui/sonner.tsx` exists but the `<Toaster>` component is not rendered anywhere in `app/layout.tsx`, so toasts will silently fail.
- **No routes beyond `/`** — The breadcrumb map references several routes that don't exist yet, indicating planned but unbuilt pages.

## Test Coverage

- Zero test coverage across all UI components, providers, hooks, and utilities.

---
*Last mapped: 2026-04-29*
