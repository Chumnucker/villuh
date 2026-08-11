# Sidebar User Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a pinned sidebar footer user menu (avatar + name + email) that opens an upward dropdown with Settings, light↔dark theme toggle, and Log out.

**Architecture:** Landlord-only `SidebarUserMenu` client component under `modules/app/components/sidebar/`. It reads `useUser()`, uses `@villuh/ui` DropdownMenu/Avatar/Button, toggles theme via `next-themes` `useTheme`, and signs out via `authClient` from `@/lib/auth-client`. Mounted as a footer in `AppSidebar` below the nav `ScrollArea`. Minimal `/settings` stub so the Settings item does not 404.

**Tech Stack:** Next.js App Router, React 19, `@villuh/ui` (DropdownMenu, Avatar, Button, PlatformIcon), `next-themes`, Better Auth client (`@villuh/auth`), landlord `useUser()` / `ROUTES`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-11-sidebar-user-menu-design.md`
- No Profile menu item
- No user header inside the dropdown
- Theme toggle is light ↔ dark only (do not cycle `system`)
- Settings navigates to `/settings` (`ROUTES.settings`)
- Do not extract a shared package component
- Prefer existing UI primitives; match sidebar density (`p-page`, ghost button styles)
- No frontend unit-test harness in `landlord-web` — verify manually in the browser (steps below)
- Do not commit unless the user explicitly asks (include git add/commit steps as optional)

## File map

| File | Responsibility |
|------|----------------|
| `apps/landlord-web/modules/app/components/sidebar/sidebar-user-menu.tsx` | Trigger + dropdown menu |
| `apps/landlord-web/modules/app/components/sidebar/app-sidebar.tsx` | Mount footer under ScrollArea |
| `apps/landlord-web/modules/app/components/sidebar/index.ts` | Re-export |
| `apps/landlord-web/app/(app)/settings/page.tsx` | Minimal stub page |
| `apps/landlord-web/app/routes.ts` | Already has `settings` — no change unless missing |

---

### Task 1: Settings stub page

**Files:**
- Create: `apps/landlord-web/app/(app)/settings/page.tsx`
- Verify: `apps/landlord-web/app/routes.ts` already exports `ROUTES.settings` as `"/settings"`

**Interfaces:**
- Consumes: `(app)` layout + `LayoutTemplate` (automatic via route group)
- Produces: Navigable `/settings` page

- [ ] **Step 1: Confirm route constant**

Open `apps/landlord-web/app/routes.ts` and confirm:

```ts
settings: r("/settings"),
```

If missing, add it under `ROUTES`.

- [ ] **Step 2: Create stub page**

Create `apps/landlord-web/app/(app)/settings/page.tsx`:

```tsx
export default function SettingsPage() {
  return (
    <div className="space-y-2">
      <h1 className="font-heading text-2xl font-medium tracking-tight">
        Settings
      </h1>
      <p className="text-sm text-muted-foreground">
        Organization and account settings will live here.
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Manual check**

With `pnpm dev` running, open `http://localhost:3000/settings` while signed in.  
Expected: Settings heading inside the app chrome (sidebar + top bar).

- [ ] **Step 4: Commit (only if user asked)**

```bash
git add apps/landlord-web/app/\(app\)/settings/page.tsx
git commit -m "$(cat <<'EOF'
Add minimal landlord settings page stub.

EOF
)"
```

---

### Task 2: `SidebarUserMenu` component

**Files:**
- Create: `apps/landlord-web/modules/app/components/sidebar/sidebar-user-menu.tsx`
- Modify: `apps/landlord-web/modules/app/components/sidebar/index.ts`

**Interfaces:**
- Consumes:
  - `useUser()` from `@/modules/app/providers/me-provider` → `{ user: { user: { name, email, image }, org: ... } }`
  - `authClient` from `@/lib/auth-client`
  - `ROUTES` from `@/app/routes`
  - UI: `Avatar`, `AvatarImage`, `AvatarFallback`, `Button`, `DropdownMenu*`, `PlatformIcon`, `cn` from `@villuh/ui`
  - `useTheme` from `next-themes`
  - `useRouter` from `next/navigation`
- Produces: `export function SidebarUserMenu(): JSX.Element`

- [ ] **Step 1: Create `sidebar-user-menu.tsx`**

```tsx
"use client"

import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  PlatformIcon,
  cn,
} from "@villuh/ui"
import { authClient } from "@/lib/auth-client"
import { ROUTES } from "@/app/routes"
import { useUser } from "@/modules/app/providers/me-provider"

function initialsFromName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("")
}

export function SidebarUserMenu() {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const { user: me } = useUser()
  const { name, email, image } = me.user

  const isDark = resolvedTheme === "dark"

  async function handleSignOut() {
    await authClient.signOut()
    router.replace(ROUTES.auth.login)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost-muted"
          className={cn(
            "h-auto w-full justify-start gap-2.5 rounded-2xl px-2 py-2 text-left"
          )}
          aria-label="User menu"
        >
          <Avatar size="default" className="size-9">
            {image ? <AvatarImage src={image} alt="" /> : null}
            <AvatarFallback>{initialsFromName(name)}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">
              {name}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {email}
            </span>
          </span>
          <PlatformIcon
            icon="IconChevronGrabberVertical"
            size={16}
            className="size-4 shrink-0 text-muted-foreground"
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuItem onSelect={() => router.push(ROUTES.settings)}>
          <PlatformIcon icon="IconSettingsGear2" size={16} />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault()
            setTheme(isDark ? "light" : "dark")
          }}
        >
          <PlatformIcon icon={isDark ? "IconSun" : "IconMoon"} size={16} />
          {isDark ? "Light mode" : "Dark mode"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => void handleSignOut()}>
          <PlatformIcon icon="IconDoor" size={16} />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

Notes for implementer:
- `onSelect` + `event.preventDefault()` on the theme item keeps the menu open is optional; default Radix behavior closes on select — **closing is fine** (do not fight it unless UX feels wrong). Prefer **not** calling `preventDefault` so the menu closes after toggle; remove `preventDefault` if present and keep a simple `setTheme(...)`.
- Prefer this simpler theme handler:

```tsx
<DropdownMenuItem onSelect={() => setTheme(isDark ? "light" : "dark")}>
```

- [ ] **Step 2: Re-export from barrel**

Update `apps/landlord-web/modules/app/components/sidebar/index.ts`:

```ts
export { AppSidebar } from "./app-sidebar"
export { SidebarHeader } from "./sidebar-header"
export { SidebarNavGroupSection } from "./sidebar-nav-group"
export { SidebarNavItemLink } from "./sidebar-nav-item"
export { SidebarUserMenu } from "./sidebar-user-menu"
```

- [ ] **Step 3: Typecheck**

Run:

```bash
cd /home/chum/Desktop/Dev/villuh && pnpm --filter @villuh/landlord-web typecheck
```

Expected: exit 0 (or only pre-existing unrelated errors).

- [ ] **Step 4: Commit (only if user asked)**

```bash
git add apps/landlord-web/modules/app/components/sidebar/sidebar-user-menu.tsx \
  apps/landlord-web/modules/app/components/sidebar/index.ts
git commit -m "$(cat <<'EOF'
Add landlord sidebar user menu dropdown.

EOF
)"
```

---

### Task 3: Wire into `AppSidebar`

**Files:**
- Modify: `apps/landlord-web/modules/app/components/sidebar/app-sidebar.tsx`

**Interfaces:**
- Consumes: `SidebarUserMenu` from `./sidebar-user-menu`
- Produces: Sidebar with pinned footer user menu

- [ ] **Step 1: Update `AppSidebar`**

Replace contents of `apps/landlord-web/modules/app/components/sidebar/app-sidebar.tsx` with:

```tsx
"use client"

import { ScrollArea } from "@villuh/ui"
import { SIDEBAR_NAV } from "@/modules/app/config/sidebar-nav"
import { SidebarHeader } from "./sidebar-header"
import { SidebarNavGroupSection } from "./sidebar-nav-group"
import { SidebarUserMenu } from "./sidebar-user-menu"

type AppSidebarProps = {
  appName?: string
}

export function AppSidebar({ appName }: AppSidebarProps) {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r bg-card [view-transition-name:app-sidebar]">
      <SidebarHeader appName={appName} />
      <ScrollArea className="min-h-0 flex-1">
        <nav className="flex flex-col gap-4 p-page" aria-label="Main">
          {SIDEBAR_NAV.map((group) => (
            <SidebarNavGroupSection key={group.id} group={group} />
          ))}
        </nav>
      </ScrollArea>
      <div className="shrink-0 border-t p-page">
        <SidebarUserMenu />
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Manual verification checklist**

Signed in on landlord app (`http://localhost:3000`):

1. Bottom-left of sidebar shows avatar (or initials), full name, email, vertical grabber chevron
2. Click opens menu **upward**
3. **Settings** → `/settings` stub page
4. **Dark mode** / **Light mode** toggles theme (html/`body` class / appearance)
5. **Log out** → session cleared, redirected to `/auth/login`
6. Long name/email truncate; trigger stays one compact block
7. No Profile item

- [ ] **Step 3: Commit (only if user asked)**

```bash
git add apps/landlord-web/modules/app/components/sidebar/app-sidebar.tsx
git commit -m "$(cat <<'EOF'
Pin user menu to landlord sidebar footer.

EOF
)"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Pinned footer trigger | Task 3 |
| Avatar + name + email + grabber | Task 2 |
| Dropdown upward | Task 2 (`side="top"`) |
| Settings → `/settings` | Task 1 + Task 2 |
| Theme light ↔ dark toggle | Task 2 |
| Log out → login | Task 2 |
| No Profile | Task 2 (omitted) |
| No package extraction | All tasks landlord-local |

## Placeholder scan

No TBD / “implement later” steps. Theme `preventDefault` note resolved to preferred simple handler in Task 2.

## Type consistency

- `me.user` fields: `name`, `email`, `image` (from `me.get`)
- Component name: `SidebarUserMenu` throughout
- Route: `ROUTES.settings` / `ROUTES.auth.login`
