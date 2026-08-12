# Project Structure

```
villuh/
├── app/                          # Next.js App Router root
│   ├── fonts/                    # Self-hosted font files
│   │   ├── Gambetta-Variable.woff2
│   │   └── Gambetta-VariableItalic.woff2
│   ├── favicon.ico
│   ├── globals.css               # Tailwind v4 entry point; all CSS custom properties and theme tokens
│   ├── layout.tsx                # Root layout — font loading, ThemeProvider, LayoutProvider
│   └── page.tsx                  # Home page (/)
│
├── modules/                      # All application source code
│   ├── app/                      # Application-level module (layout, navigation, providers)
│   │   ├── components/
│   │   │   ├── navigation/
│   │   │   │   └── breadcrumbs.tsx   # NavigationBreadcrumbs — path-driven, context-aware breadcrumb bar
│   │   │   └── theme-provider.tsx    # ThemeProvider — wraps next-themes; includes D-key hotkey
│   │   └── providers/
│   │       └── layout-provider.tsx   # LayoutProvider + LayoutContext + useLayout hook
│   │
│   └── common/                   # Shared, reusable UI module
│       ├── components/           # (reserved for composite/domain-agnostic components)
│       └── ui/                   # Primitive UI components (shadcn target directory)
│           ├── avatar.tsx
│           ├── badge.tsx
│           ├── button.tsx            # Button + LinkButton + buttonVariants (CVA)
│           ├── button-group.tsx
│           ├── card.tsx
│           ├── checkbox.tsx
│           ├── combobox.tsx          # Base UI Combobox primitive wrapper
│           ├── dialog.tsx
│           ├── dropdown-menu.tsx
│           ├── field.tsx
│           ├── icon.tsx              # PlatformIcon — wraps @solar-icons/react (Linear)
│           ├── input.tsx             # Input + SearchInput
│           ├── input-group.tsx
│           ├── item.tsx
│           ├── label.tsx
│           ├── pagination.tsx
│           ├── popover.tsx
│           ├── progress.tsx
│           ├── scroll-area.tsx
│           ├── select.tsx
│           ├── separator.tsx
│           ├── sheet.tsx
│           ├── skeleton.tsx
│           ├── sonner.tsx            # Toast provider (Sonner)
│           ├── switch.tsx
│           ├── table.tsx
│           ├── textarea.tsx
│           └── tooltip.tsx
│
├── hooks/                        # Custom React hooks (empty placeholder)
├── lib/
│   └── utils.ts                  # cn() helper — clsx + tailwind-merge
├── public/                       # Static assets (empty)
│
├── .planning/                    # Project planning documents (not shipped)
│   └── codebase/
│       ├── STACK.md
│       ├── INTEGRATIONS.md
│       ├── ARCHITECTURE.md
│       └── STRUCTURE.md
│
├── components.json               # shadcn CLI configuration
├── eslint.config.mjs             # ESLint 9 flat config
├── next.config.mjs               # Next.js config (empty defaults)
├── next-env.d.ts                 # Next.js TypeScript declarations
├── package.json
├── pnpm-lock.yaml
├── postcss.config.mjs            # @tailwindcss/postcss
├── tsconfig.json                 # Strict, bundler resolution, @/* alias
└── .prettierrc                   # Prettier config with prettier-plugin-tailwindcss
```

## Key Conventions

**Imports:** All cross-module imports use the `@/` alias (maps to project root). No relative imports across module boundaries.

**Component co-location:** Each UI primitive lives in its own file under `modules/common/ui/`. No barrel `index.ts` files — import directly from the file path.

**Client vs Server Components:** Files that use `useState`, `useContext`, `useEffect`, browser events, or Next.js client hooks (`usePathname`, `useRouter`) must have `"use client"` at the top. Everything else defaults to RSC.

**Naming:** Components are PascalCase. Files are kebab-case. Hooks are camelCase prefixed with `use`.

**Styles:** All new design tokens go in `app/globals.css` inside the appropriate `@theme` or `:root`/`.dark` block. No inline style props except where Tailwind cannot reach.

**New shadcn components:** Run `pnpm dlx shadcn add <component>`. They will be written to `modules/common/ui/` per the alias configuration in `components.json`.

---
*Last mapped: 2026-04-29*
