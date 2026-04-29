# Technology Stack

**Analysis Date:** 2026-04-29

## Languages

**Primary:**
- TypeScript 5.9.x - All application source code (`app/`, `modules/`, `lib/`, `hooks/`)

**Secondary:**
- CSS - Global styles and Tailwind v4 theme configuration (`app/globals.css`)

## Runtime

**Environment:**
- Node.js (version not pinned via `.nvmrc` or `.node-version`)

**Package Manager:**
- pnpm (lockfileVersion `9.0`)
- Lockfile: `pnpm-lock.yaml` present and committed

## Frameworks

**Core:**
- Next.js 16.1.7 - Full-stack React framework; App Router with RSC (`rsc: true` in `components.json`); Turbopack used for dev (`next dev --turbopack`)

**UI Component Primitives:**
- `@base-ui/react` ^1.4.1 - Headless, accessible primitives (Combobox, Select, Dialog, etc.)
- `radix-ui` ^1.4.3 - Additional Radix primitives (Slot used in `button.tsx`)

**Styling:**
- Tailwind CSS ^4.2.1 - Utility-first CSS; configured via `@import "tailwindcss"` in `app/globals.css`, no `tailwind.config.*` file (v4 CSS-first config)
- `@tailwindcss/postcss` ^4.2.1 - PostCSS integration for Tailwind v4 (`postcss.config.mjs`)
- `tw-animate-css` ^1.4.0 - Animation utilities imported in `app/globals.css`
- `tailwind-merge` ^3.5.0 - Merge conflicting Tailwind classes (`lib/utils.ts`)

**Component Variants:**
- `class-variance-authority` ^0.7.1 - CVA for typed component variant definitions (`modules/common/ui/button.tsx`)

**Theme:**
- `next-themes` ^0.4.6 - Dark/light/system theme management (`modules/app/components/theme-provider.tsx`)

**Notifications/Toast:**
- `sonner` ^2.0.7 - Toast notification system (`modules/common/ui/sonner.tsx`)

**Icons:**
- `@central-icons-react/all` ^1.1.215 - Primary icon set via `PlatformIcon` wrapper (`modules/common/ui/icon.tsx`)
- `lucide-react` ^1.11.0 - Secondary icons used directly in UI components

**Shadcn:**
- `shadcn` ^4.5.0 - CLI tool for component scaffolding; configured via `components.json` (style: `radix-luma`, baseColor: `zinc`)

**Build/Dev:**
- Turbopack - Bundler in dev mode (via `next dev --turbopack`)
- Next.js build pipeline - Production builds (`next build`)

**Testing:**
- Not detected — no test framework configured

## Key Dependencies

**Critical:**
- `next` 16.1.7 - Application framework; pinned exact version
- `react` ^19.2.4 / `react-dom` ^19.2.4 - React 19 (concurrent features, RSC)
- `@base-ui/react` ^1.4.1 - Replaces most shadcn primitive usage; all complex interactive components delegate to this

**Infrastructure:**
- `clsx` ^2.1.1 - Conditional class string building (used with `twMerge` in `lib/utils.ts`)
- `tailwind-merge` ^3.5.0 - Deduplicates conflicting Tailwind classes

## Configuration

**Environment:**
- No `.env` files detected; no environment variables required at this stage
- Build: standard Next.js defaults — `next.config.mjs` is empty (`const nextConfig = {}`)

**TypeScript:**
- `tsconfig.json`: strict mode, target ES2017, `moduleResolution: bundler`, path alias `@/*` → `./*`
- Incremental compilation enabled

**Linting:**
- `eslint.config.mjs`: ESLint 9 flat config using `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`

**Formatting:**
- Prettier ^3.8.1 with `prettier-plugin-tailwindcss` ^0.7.2 (class sorting)
- Format command: `pnpm format` → `prettier --write "**/*.{ts,tsx}"`

**Shadcn:**
- `components.json`: aliases map `components`/`ui` → `@/modules/common/ui`, `utils` → `@/lib/utils`, `hooks` → `@/hooks`

**Scripts:**
```bash
pnpm dev        # Next.js dev server with Turbopack
pnpm build      # Production build
pnpm start      # Start production server
pnpm lint       # ESLint
pnpm format     # Prettier write
pnpm typecheck  # tsc --noEmit
```

## Platform Requirements

**Development:**
- Node.js (version unspecified)
- pnpm package manager

**Production:**
- Any Node.js-compatible host (Vercel is the typical Next.js target; not explicitly configured)
- No detected Docker, CI, or deployment manifests

---

*Stack analysis: 2026-04-29*
