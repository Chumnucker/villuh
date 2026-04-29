# Phase 1: Infrastructure Foundation - Pattern Map

**Mapped:** 2026-04-29
**Files analyzed:** 24 new/modified files
**Analogs found:** 14 / 24

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `pnpm-workspace.yaml` | config | — | none | no analog |
| `tsconfig.base.json` | config | — | `tsconfig.json` (root) | role-match |
| `packages/web/package.json` | config | — | `package.json` (root) | role-match |
| `packages/server/package.json` | config | — | `package.json` (root) | role-match |
| `packages/db/package.json` | config | — | `package.json` (root) | role-match |
| `packages/web/tsconfig.json` | config | — | `tsconfig.json` (root) | exact |
| `packages/server/tsconfig.json` | config | — | `tsconfig.json` (root) | role-match |
| `packages/db/tsconfig.json` | config | — | `tsconfig.json` (root) | role-match |
| `packages/server/src/index.ts` | service | request-response | none | no analog |
| `packages/server/src/app.ts` | service | request-response | none | no analog |
| `packages/server/src/routes/health.ts` | route | request-response | none | no analog |
| `packages/server/src/middleware/auth.ts` | middleware | request-response | none | no analog |
| `packages/server/src/lib/tenant.ts` | utility | request-response | none | no analog |
| `packages/db/src/index.ts` | service | CRUD | none | no analog |
| `packages/db/src/migrate.ts` | utility | CRUD | none | no analog |
| `packages/db/drizzle.config.ts` | config | — | none | no analog |
| `packages/db/src/schema/landlords.ts` | model | CRUD | none | no analog |
| `packages/db/migrations/0000_initial.sql` | migration | — | none | no analog |
| `packages/db/migrations/0001_audit_log.sql` | migration | — | none | no analog |
| `packages/db/src/__tests__/rls.test.ts` | test | CRUD | none | no analog |
| `packages/db/vitest.config.ts` | config | — | none | no analog |
| `packages/web/lib/api.ts` | utility | request-response | none | no analog |
| `packages/web/app/layout.tsx` | component | request-response | `app/layout.tsx` | exact |
| `packages/web/modules/common/ui/icon.tsx` | component | — | `modules/common/ui/icon.tsx` | exact |
| `packages/web/modules/common/ui/sonner.tsx` | component | — | `modules/common/ui/sonner.tsx` | exact |
| `packages/web/modules/common/ui/checkbox.tsx` | component | — | `modules/common/ui/checkbox.tsx` | exact |
| `packages/web/modules/common/ui/combobox.tsx` | component | — | `modules/common/ui/combobox.tsx` | exact |
| `packages/web/modules/common/ui/dialog.tsx` | component | — | `modules/common/ui/dialog.tsx` | exact |
| `packages/web/modules/common/ui/dropdown-menu.tsx` | component | — | `modules/common/ui/dropdown-menu.tsx` | exact |
| `packages/web/modules/common/ui/pagination.tsx` | component | — | `modules/common/ui/pagination.tsx` | exact |
| `packages/web/modules/common/ui/select.tsx` | component | — | `modules/common/ui/select.tsx` | exact |
| `packages/web/modules/common/ui/sheet.tsx` | component | — | `modules/common/ui/sheet.tsx` | exact |
| `.nvmrc` | config | — | none | no analog |
| `.gitignore` | config | — | none | no analog |

---

## Pattern Assignments

### `packages/web/tsconfig.json` (config)

**Analog:** `tsconfig.json` (repo root, lines 1–34)

**Critical change from analog:** After the move, `packages/web/tsconfig.json` MUST override `baseUrl` to `"."` relative to its own location — otherwise the `@/*` alias still resolves to the monorepo root and all imports break. The `extends` field points up two levels to `../../tsconfig.base.json`. The `next` plugin entry and `noEmit` stay.

**Existing pattern to preserve** (lines 1–34 of `tsconfig.json`):
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

**`packages/web/tsconfig.json` target shape:**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] },
    "plugins": [{ "name": "next" }],
    "noEmit": true,
    "incremental": true
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

**`tsconfig.base.json` target shape** (shared options factored out):
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx"
  }
}
```

**`packages/server/tsconfig.json` — node target, no jsx:**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "jsx": undefined,
    "outDir": "./dist",
    "baseUrl": "."
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

**`packages/db/tsconfig.json` — same node shape as server:**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "baseUrl": "."
  },
  "include": ["src/**/*.ts", "drizzle.config.ts"],
  "exclude": ["node_modules", "dist", "migrations"]
}
```

---

### `packages/web/app/layout.tsx` (component, request-response)

**Analog:** `app/layout.tsx` (lines 1–42)

This file is a straight relocation. The only required change is adding `<Toaster />` from `@/modules/common/ui/sonner` inside `<ThemeProvider>` (or directly inside `<body>`). The import path `@/modules/...` resolves correctly once `packages/web/tsconfig.json` has `baseUrl: "."`.

**Existing structure to preserve** (lines 1–42 of `app/layout.tsx`):
```tsx
import localFont from "next/font/local"
import { Inter } from "next/font/google"

import "./globals.css"
import { cn } from "@/lib/utils"
import { ThemeProvider } from "@/modules/app/components/theme-provider"
import { LayoutProvider } from "@/modules/app/providers/layout-provider"

// ... font declarations ...

export default function RootLayout({ children }: ...) {
  return (
    <html lang="en" suppressHydrationWarning className={cn(...)}>
      <body>
        <ThemeProvider>
          <LayoutProvider>{children}</LayoutProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
```

**Required addition — Toaster mount:**
```tsx
import { Toaster } from "@/modules/common/ui/sonner"

// Inside <body>, after <LayoutProvider>:
<ThemeProvider>
  <LayoutProvider>{children}</LayoutProvider>
  <Toaster />
</ThemeProvider>
```

---

### `packages/web/modules/common/ui/icon.tsx` (component, utility)

**Analog:** `modules/common/ui/icon.tsx` (lines 1–36) — this file is the destination after relocation.

No logic changes. The `PlatformIcon` wrapper is the central icon abstraction that all icon-migration work points back to. Copy verbatim during relocation.

**Existing pattern** (lines 1–36 of `modules/common/ui/icon.tsx`):
```tsx
import { CentralIcon, CentralIconBaseProps } from "@central-icons-react/all"
import {
  CentralIconFill,
  CentralIconJoin,
  CentralIconName,
  CentralIconRadius,
  CentralIconStroke,
} from "@central-icons-react/all/icons"

export type PlatformIconName = CentralIconName
export type PlatformIconProps = CentralIconBaseProps & {
  icon: PlatformIconName
  join?: CentralIconJoin
  fill?: CentralIconFill
  radius?: CentralIconRadius
  stroke?: CentralIconStroke
}
export const PlatformIcon = ({
  icon,
  stroke = "1",
  fill = "outlined",
  join = "square",
  radius = "0",
  ...props
}: PlatformIconProps) => {
  return (
    <CentralIcon
      name={icon as any}
      stroke={"1.5"}
      fill={fill}
      join={join}
      radius={radius}
      {...props}
    />
  )
}
```

---

### `packages/web/modules/common/ui/sonner.tsx` (component, event-driven)

**Analog:** `modules/common/ui/sonner.tsx` (lines 1–49)

**Required changes:** Replace all five `lucide-react` icon imports with `PlatformIcon` from `@/modules/common/ui/icon`. The `icons` prop on `<Sonner>` accepts `React.ReactNode` — swapping component types is sufficient.

**Existing pattern to update** (lines 1–6 of `modules/common/ui/sonner.tsx`):
```tsx
// BEFORE (remove these):
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

// AFTER (add this):
import { PlatformIcon } from "@/modules/common/ui/icon"
```

**Icon prop replacement pattern** (lines 13–30 of `modules/common/ui/sonner.tsx`):
```tsx
// BEFORE:
icons={{
  success: <CircleCheckIcon className="size-4" />,
  info: <InfoIcon className="size-4" />,
  warning: <TriangleAlertIcon className="size-4" />,
  error: <OctagonXIcon className="size-4" />,
  loading: <Loader2Icon className="size-4 animate-spin" />,
}}

// AFTER (using PlatformIcon with @central-icons-react equivalents):
icons={{
  success: <PlatformIcon icon="IconCircleCheck" className="size-4" size={16} />,
  info: <PlatformIcon icon="IconCircleInfo" className="size-4" size={16} />,
  warning: <PlatformIcon icon="IconWarningSign" className="size-4" size={16} />,
  error: <PlatformIcon icon="IconCrossLarge" className="size-4" size={16} />,
  loading: <PlatformIcon icon="IconLoader" className="size-4 animate-spin" size={16} />,
}}
```

**Note:** Icon names for `warning` (`IconWarningSign`) and `error` (`IconCrossLarge`) are MEDIUM/LOW confidence — verify visually in browser after migration. If no equivalent exists, add a named fallback to `PlatformIcon`:
```tsx
// Fallback pattern inside icon.tsx if an icon is missing:
// Add an optional `fallback?: React.ReactNode` prop and render it when
// @central-icons-react has no equivalent. Document the gap in a comment.
```

All other `<Sonner>` markup (lines 7–49) is preserved without change.

---

### `packages/web/modules/common/ui/checkbox.tsx` (component)

**Analog:** `modules/common/ui/checkbox.tsx` (lines 1–33)

**Required change:** Replace `CheckIcon` from `lucide-react` (line 7) with `PlatformIcon`.

```tsx
// BEFORE (line 7):
import { CheckIcon } from "lucide-react"

// Usage (line 26):
<CheckIcon />

// AFTER:
import { PlatformIcon } from "@/modules/common/ui/icon"

// Usage — size must be explicit to fit the 3.5 / 4 size context set by parent:
<PlatformIcon icon="IconCheck" size={14} />
```

**Note on class-based sizing:** The parent `CheckboxPrimitive.Indicator` applies `[&>svg]:size-3.5` (line 25). `CentralIcon` renders an `<svg>` — the class selector will apply. The `size` prop on `PlatformIcon` is the pixel size passed to the underlying library; set it to `14` (3.5 * 4 = 14px) to align with the Tailwind sizing.

All Radix structure, `cn()` call, and `data-slot` attributes are preserved without change.

---

### `packages/web/modules/common/ui/combobox.tsx` (component)

**Analog:** `modules/common/ui/combobox.tsx` (lines 1–299)

**Required changes:** Replace three `lucide-react` icons (line 14).

```tsx
// BEFORE (line 14):
import { ChevronDownIcon, XIcon, CheckIcon } from "lucide-react"

// AFTER:
import { PlatformIcon } from "@/modules/common/ui/icon"
```

**Usage replacements** (three sites):

| Location | Before | After |
|---|---|---|
| `ComboboxTrigger` (line 34) | `<ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />` | `<PlatformIcon icon="IconChevronBottom" className="pointer-events-none size-4 text-muted-foreground" size={16} />` |
| `ComboboxClear` (line 47) | `<XIcon className="pointer-events-none" />` | `<PlatformIcon icon="IconCrossLarge" className="pointer-events-none" size={16} />` |
| `ComboboxItem` (line 156) | `<CheckIcon className="pointer-events-none" />` | `<PlatformIcon icon="IconCheck" className="pointer-events-none" size={16} />` |
| `ComboboxChip` (line 257) | `<XIcon className="pointer-events-none" />` | `<PlatformIcon icon="IconCrossLarge" className="pointer-events-none" size={16} />` |

All Base UI Combobox structure is preserved without change.

---

### `packages/web/modules/common/ui/dialog.tsx` (component)

**Analog:** `modules/common/ui/dialog.tsx` (lines 1–168)

**Required change:** Replace `XIcon` from `lucide-react` (line 8).

```tsx
// BEFORE (line 8):
import { XIcon } from "lucide-react"

// AFTER:
import { PlatformIcon } from "@/modules/common/ui/icon"
```

**Usage replacement** (line 77):
```tsx
// BEFORE:
<XIcon />

// AFTER:
<PlatformIcon icon="IconCrossLarge" size={16} />
```

---

### `packages/web/modules/common/ui/dropdown-menu.tsx` (component)

**Analog:** `modules/common/ui/dropdown-menu.tsx` (lines 1–269)

**Required changes:** Replace `CheckIcon` and `ChevronRightIcon` from `lucide-react` (line 7).

```tsx
// BEFORE (line 7):
import { CheckIcon, ChevronRightIcon } from "lucide-react"

// AFTER:
import { PlatformIcon } from "@/modules/common/ui/icon"
```

**Usage replacements:**

| Location | Before | After |
|---|---|---|
| `DropdownMenuCheckboxItem` indicator (line 109) | `<CheckIcon />` | `<PlatformIcon icon="IconCheck" size={16} />` |
| `DropdownMenuRadioItem` indicator (line 152) | `<CheckIcon />` | `<PlatformIcon icon="IconCheck" size={16} />` |
| `DropdownMenuSubTrigger` (line 235) | `<ChevronRightIcon className="ml-auto" />` | `<PlatformIcon icon="IconChevronRight" className="ml-auto" size={16} />` |

---

### `packages/web/modules/common/ui/pagination.tsx` (component)

**Analog:** `modules/common/ui/pagination.tsx` (lines 1–129)

**Required changes:** Replace `ChevronLeftIcon`, `ChevronRightIcon`, `MoreHorizontalIcon` from `lucide-react` (line 5).

```tsx
// BEFORE (line 5):
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from "lucide-react"

// AFTER:
import { PlatformIcon } from "@/modules/common/ui/icon"
```

**Usage replacements:**

| Location | Before | After |
|---|---|---|
| `PaginationPrevious` (line 77) | `<ChevronLeftIcon data-icon="inline-start" />` | `<PlatformIcon icon="IconChevronLeft" data-icon="inline-start" size={16} />` |
| `PaginationNext` (line 93) | `<ChevronRightIcon data-icon="inline-end" />` | `<PlatformIcon icon="IconChevronRight" data-icon="inline-end" size={16} />` |
| `PaginationEllipsis` (line 114) | `<MoreHorizontalIcon />` | `<PlatformIcon icon="IconDotGrid1x3Horizontal" size={16} />` |

---

### `packages/web/modules/common/ui/select.tsx` (component)

**Analog:** `modules/common/ui/select.tsx` (lines 1–195)

**Required changes:** Replace `ChevronDownIcon`, `CheckIcon`, `ChevronUpIcon` from `lucide-react` (line 7).

```tsx
// BEFORE (line 7):
import { ChevronDownIcon, CheckIcon, ChevronUpIcon } from "lucide-react"

// AFTER:
import { PlatformIcon } from "@/modules/common/ui/icon"
```

**Usage replacements:**

| Location | Before | After |
|---|---|---|
| `SelectTrigger` icon (line 54) | `<ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />` | `<PlatformIcon icon="IconChevronBottom" className="pointer-events-none size-4 text-muted-foreground" size={16} />` |
| `SelectItem` indicator (line 122) | `<CheckIcon className="pointer-events-none" />` | `<PlatformIcon icon="IconCheck" className="pointer-events-none" size={16} />` |
| `SelectScrollUpButton` (line 159) | `<ChevronUpIcon />` | `<PlatformIcon icon="IconChevronTop" size={16} />` |
| `SelectScrollDownButton` (line 178) | `<ChevronDownIcon />` | `<PlatformIcon icon="IconChevronBottom" size={16} />` |

---

### `packages/web/modules/common/ui/sheet.tsx` (component)

**Analog:** `modules/common/ui/sheet.tsx` (lines 1–147)

**Required change:** Replace `XIcon` from `lucide-react` (line 8).

```tsx
// BEFORE (line 8):
import { XIcon } from "lucide-react"

// AFTER:
import { PlatformIcon } from "@/modules/common/ui/icon"
```

**Usage replacement** (line 78):
```tsx
// BEFORE:
<XIcon />

// AFTER:
<PlatformIcon icon="IconCrossLarge" size={16} />
```

---

### `packages/web/lib/api.ts` (utility, request-response)

**No existing analog.** This is a greenfield Hono RPC client. Use RESEARCH.md Pattern 2 verbatim.

**Pattern from RESEARCH.md:**
```typescript
// packages/web/lib/api.ts
import { hc } from "hono/client"
import type { AppType } from "@villuh/server/app"

export const api = hc<AppType>(process.env.NEXT_PUBLIC_API_URL!)
// Usage: const res = await api.api.health.$get()
```

**Constraint:** `NEXT_PUBLIC_API_URL` must be set in `packages/web/.env.local` for local dev.

---

### `packages/server/src/index.ts` (service, request-response)

**No existing analog.** Use RESEARCH.md Pattern 1 verbatim.

**Pattern from RESEARCH.md:**
```typescript
// packages/server/src/index.ts
import { serve } from "@hono/node-server"
import app from "./app"

const server = serve({
  fetch: app.fetch,
  port: Number(process.env.PORT ?? 3001),
})

process.on("SIGINT", () => { server.close(); process.exit(0) })
process.on("SIGTERM", () => { server.close(); process.exit(0) })

console.log(`Hono server running on port ${process.env.PORT ?? 3001}`)
```

---

### `packages/server/src/app.ts` (service, request-response)

**No existing analog.** Use RESEARCH.md Pattern 1 verbatim.

**Pattern from RESEARCH.md:**
```typescript
// packages/server/src/app.ts
import { Hono } from "hono"
import { cors } from "hono/cors"
import { health } from "./routes/health"

const app = new Hono()

app.use("/api/*", cors({ origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000" }))

const routes = app
  .route("/api", health)

export default app
export type AppType = typeof routes
```

**Critical:** `AppType` is exported for the `packages/web/lib/api.ts` RPC client. The chain `app.route("/api", health)` must use method chaining (not reassignment) to preserve the type information for RPC inference.

---

### `packages/server/src/routes/health.ts` (route, request-response)

**No existing analog.** Use RESEARCH.md Pattern 1 verbatim.

**Pattern from RESEARCH.md:**
```typescript
// packages/server/src/routes/health.ts
import { Hono } from "hono"

export const health = new Hono()
  .get("/health", (c) => c.json({ ok: true, ts: Date.now() }))
```

---

### `packages/server/src/middleware/auth.ts` (middleware, request-response)

**No existing analog.** Phase 1 stub only. Use RESEARCH.md Pattern 7 (the typed version from Code Examples section).

**Pattern from RESEARCH.md:**
```typescript
// packages/server/src/middleware/auth.ts
import { createMiddleware } from "hono/factory"

type Variables = {
  user: { id: string; landlordId: string } | null
  session: { id: string } | null
}

export const authMiddleware = createMiddleware<{ Variables: Variables }>(async (c, next) => {
  // Phase 1 stub — real implementation in Phase 2 with Better Auth
  c.set("user", null)
  c.set("session", null)
  await next()
})
```

---

### `packages/server/src/lib/tenant.ts` (utility, request-response)

**No existing analog.** Use RESEARCH.md Code Examples section (typed `withTenant` signature).

**Pattern from RESEARCH.md:**
```typescript
// packages/server/src/lib/tenant.ts
import { db } from "@villuh/db"
import { sql } from "drizzle-orm"

export async function withTenant<T>(
  landlordId: string,
  actorId: string = "system",
  fn: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_landlord_id', ${landlordId}, TRUE)`)
    await tx.execute(sql`SELECT set_config('app.current_user_id', ${actorId}, TRUE)`)
    return fn(tx)
  })
}
```

**Critical:** `TRUE` (transaction-local) not `FALSE` (session-scoped). Session-scoped leaks across PgBouncer pooled connections.

---

### `packages/db/src/index.ts` (service, CRUD)

**No existing analog.** Use RESEARCH.md Pattern 3 verbatim.

**Pattern from RESEARCH.md:**
```typescript
// packages/db/src/index.ts — runtime client (villuh_app role)
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

const queryClient = postgres(process.env.DATABASE_APP_URL!)
export const db = drizzle({ client: queryClient, schema })
```

---

### `packages/db/src/migrate.ts` (utility, CRUD)

**No existing analog.** Use RESEARCH.md Pattern 3 verbatim.

**Pattern from RESEARCH.md:**
```typescript
// packages/db/src/migrate.ts — migration client (owner role, max:1)
import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import postgres from "postgres"

const migrationClient = postgres(process.env.DATABASE_URL!, { max: 1 })
const migrationDb = drizzle({ client: migrationClient })

await migrate(migrationDb, { migrationsFolder: "./migrations" })
await migrationClient.end()
```

---

### `packages/db/drizzle.config.ts` (config)

**No existing analog.** Use RESEARCH.md Pattern 3 verbatim.

**Pattern from RESEARCH.md:**
```typescript
// packages/db/drizzle.config.ts — uses DATABASE_URL (owner)
import { defineConfig } from "drizzle-kit"

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema",
  out: "./migrations",
  dbCredentials: { url: process.env.DATABASE_URL! },
  entities: { roles: true },  // allows pgRole() in schema
})
```

---

### `packages/db/src/schema/landlords.ts` (model, CRUD)

**No existing analog.** Use RESEARCH.md Pattern 4 verbatim.

**Pattern from RESEARCH.md:**
```typescript
// packages/db/src/schema/landlords.ts
import { sql } from "drizzle-orm"
import { pgTable, pgPolicy, pgRole, uuid, text, timestamptz } from "drizzle-orm/pg-core"

// Define the app role (existing in DB — mark as .existing())
export const villuhApp = pgRole("villuh_app").existing()

export const testTenantData = pgTable("test_tenant_data", {
  id: uuid("id").primaryKey().defaultRandom(),
  landlordId: uuid("landlord_id").notNull(),
  data: text("data"),
  createdAt: timestamptz("created_at").defaultNow().notNull(),
}, (t) => [
  pgPolicy("tenant_isolation", {
    as: "permissive",
    for: "all",
    to: villuhApp,
    using: sql`landlord_id = current_setting('app.current_landlord_id', true)::uuid`,
    withCheck: sql`landlord_id = current_setting('app.current_landlord_id', true)::uuid`,
  }),
])
```

**API note:** Use `pgTable.withRLS()` (current Drizzle v0.36+ API) not the deprecated `.enableRLS()`. The policy colocates inside the table definition array as verified in RESEARCH.md.

---

### `packages/db/src/__tests__/rls.test.ts` (test, CRUD)

**No existing analog.** Use RESEARCH.md Code Examples section.

**Key pattern from RESEARCH.md:**
```typescript
// packages/db/src/__tests__/rls.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

// Uses DATABASE_TEST_URL connecting as villuh_app role (non-owner)
// NEVER use DATABASE_URL here — owner role bypasses RLS silently
const testClient = postgres(process.env.DATABASE_TEST_URL!)
const testDb = drizzle({ client: testClient })
```

**Critical:** Test must connect as `villuh_app` (restricted role) via `DATABASE_TEST_URL`, not the owner connection. If the test uses the owner role it will silently pass even when RLS is broken.

---

### `packages/db/vitest.config.ts` (config)

**No existing analog.** Standard vitest config for a Node.js package.

**Pattern:**
```typescript
// packages/db/vitest.config.ts
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
  },
})
```

---

### `packages/db/migrations/0000_initial.sql` (migration)

**No existing analog.** Generated by `drizzle-kit generate` after schema is written. Do not hand-create — run the CLI and let Drizzle produce the file. It will contain `CREATE TABLE test_tenant_data`, the `pgRole`, and `pgPolicy` DDL.

---

### `packages/db/migrations/0001_audit_log.sql` (migration)

**No existing analog.** Raw SQL appended to a Drizzle-generated empty migration. Use RESEARCH.md Pattern 6 verbatim.

**Key structural elements from RESEARCH.md:**
- `CREATE TABLE audit_log ... PARTITION BY RANGE (created_at)`
- Pre-create current-month + next-month partitions (April 2026 and May 2026)
- `ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY`
- Trigger function `audit_log_trigger_fn()` — `SECURITY DEFINER`
- Immutability trigger `audit_log_immutable` — `BEFORE UPDATE OR DELETE`
- Per-table trigger `test_tenant_data_audit` — `AFTER INSERT OR UPDATE OR DELETE`

---

### `.nvmrc` (config)

**No analog.** Single line:
```
22
```

---

## Shared Patterns

### Import Style (applies to all TypeScript files)
**Source:** `modules/common/ui/button.tsx` (line 1), `.planning/codebase/CONVENTIONS.md`
**Apply to:** All new `.ts` and `.tsx` files

- No semicolons (`"semi": false` in `.prettierrc`)
- Double quotes for strings
- Import order: external packages first, then `@/` alias paths, then relative siblings
- `import * as React from "react"` in library-style UI files; named imports in application-layer files

---

### `@/` Path Alias (applies to all web package files)
**Source:** `tsconfig.json` (lines 22–24), `modules/common/ui/button.tsx` (line 5)
**Apply to:** All files inside `packages/web/`

After the monorepo move, `@/` resolves to `packages/web/` (not the repo root). All existing uses of `@/lib/utils`, `@/modules/...` continue to work without change because `packages/web/tsconfig.json` sets `"baseUrl": "."`.

```typescript
// Correct — resolves to packages/web/lib/utils.ts
import { cn } from "@/lib/utils"

// Correct — resolves to packages/web/modules/common/ui/icon.tsx
import { PlatformIcon } from "@/modules/common/ui/icon"
```

---

### PlatformIcon Usage (applies to all icon-migration files)
**Source:** `modules/common/ui/icon.tsx` (lines 1–36)
**Apply to:** All 8 UI components replacing `lucide-react` icons

The replacement pattern is consistent across all 8 components:
1. Remove the named `lucide-react` import
2. Add `import { PlatformIcon } from "@/modules/common/ui/icon"`
3. Replace `<LucideIconName className="..." />` with `<PlatformIcon icon="IconName" size={N} className="..." />`
4. Set `size` explicitly as a pixel value matching the Tailwind size class (e.g., `size-4` = `size={16}`, `size-3.5` = `size={14}`)

---

### `data-slot` Attribute (applies to all UI components)
**Source:** `modules/common/ui/button.tsx` (line 74), `.planning/codebase/CONVENTIONS.md`
**Apply to:** All UI component files in `packages/web/modules/common/ui/`

Every root element of every component carries `data-slot="component-name"`. Preserve all existing `data-slot` values during relocation — they are load-bearing for cross-component CSS selectors.

---

### `cn()` Class Merging (applies to all UI components)
**Source:** `lib/utils.ts` (lines 1–6), `modules/common/ui/button.tsx` (line 76)
**Apply to:** All files that merge Tailwind classes

```typescript
// lib/utils.ts pattern — copy verbatim to packages/web/lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

---

### `"use client"` Directive (applies to UI components with state or hooks)
**Source:** `modules/common/ui/sonner.tsx` (line 1), `.planning/codebase/CONVENTIONS.md`
**Apply to:** Any component using `useState`, `useContext`, `useEffect`, `useTheme`, or browser events

`"use client"` must be the very first line before any imports. Default to Server Components; add the directive only when required.

---

## No Analog Found

All new backend and database files have no analog in this codebase. The following files must be built from RESEARCH.md patterns:

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `pnpm-workspace.yaml` | config | — | No monorepo config exists yet |
| `packages/server/src/index.ts` | service | request-response | No Hono server exists in this codebase |
| `packages/server/src/app.ts` | service | request-response | No Hono app exists |
| `packages/server/src/routes/health.ts` | route | request-response | No backend routes exist |
| `packages/server/src/middleware/auth.ts` | middleware | request-response | No middleware exists |
| `packages/server/src/lib/tenant.ts` | utility | request-response | No tenant context wrapper exists |
| `packages/db/src/index.ts` | service | CRUD | No Drizzle client exists |
| `packages/db/src/migrate.ts` | utility | CRUD | No migration runner exists |
| `packages/db/drizzle.config.ts` | config | — | No Drizzle config exists |
| `packages/db/src/schema/landlords.ts` | model | CRUD | No DB schema exists |
| `packages/db/migrations/0000_initial.sql` | migration | — | No migrations exist |
| `packages/db/migrations/0001_audit_log.sql` | migration | — | No raw SQL migrations exist |
| `packages/db/src/__tests__/rls.test.ts` | test | CRUD | No tests exist in this codebase |
| `packages/db/vitest.config.ts` | config | — | No vitest config exists |
| `packages/web/lib/api.ts` | utility | request-response | No Hono RPC client exists |
| `.nvmrc` | config | — | No .nvmrc exists |

---

## Metadata

**Analog search scope:** `app/`, `modules/`, `lib/`, `tsconfig.json`, `package.json`
**Files scanned:** 34 source files
**Pattern extraction date:** 2026-04-29
