# Sidebar User Menu — Design

**Date:** 2026-08-11  
**App:** `apps/landlord-web`  
**Status:** Approved for implementation (pending spec review)

## Goal

Pin a user menu to the bottom of the landlord sidebar. Clicking it opens a dropdown with Settings, a theme toggle, and Log out. The trigger shows the signed-in user’s avatar, name, and email.

## Non-goals

- Profile menu item (deferred)
- User/org header inside the dropdown (deferred)
- Collapsible / icon-only sidebar state
- Extracting a shared package component for resident-web
- Building a full Settings page UI (route stub only if needed)

## Placement

- Component: `SidebarUserMenu` in `modules/app/components/sidebar/`
- Wired in `AppSidebar` as a **footer** below the nav `ScrollArea`, so it stays pinned at the bottom while nav scrolls
- Export from `sidebar/index.ts`

## Trigger

Full-width button using existing button/ghost styling consistent with sidebar nav:

| Region | Content |
|--------|---------|
| Left | `Avatar` (`image` or initials fallback from `user.name`) |
| Center | `user.name` (truncate) + `user.email` below (muted, truncate) |
| Right | `IconChevronGrabberVertical` |

Data from `useUser()` → `user.user` (`id`, `name`, `email`, `image`).

## Dropdown

Use `@villuh/ui` `DropdownMenu` (not Popover).

- `side="top"` (opens upward from the footer)
- `align="start"`
- Width roughly match trigger (`w-(--radix-dropdown-menu-trigger-width)` already on content)

### Items

1. **Settings** — navigates to `/settings` (`ROUTES.settings`); icon `IconSettingsGear2`
2. **Theme** — toggle row; flips `light` ↔ `dark` via `useTheme().setTheme` (same behavior as the existing `d` hotkey; does not cycle through `system`). Label reflects action or state (e.g. “Dark mode” / “Light mode” with `IconMoon` / `IconSun`)
3. **Separator**
4. **Log out** — destructive variant; `authClient.signOut()` then `router.replace(ROUTES.auth.login)`; icon `IconDoor` (or similar exit/door icon already in the design system)

No Profile item.

## Routes

- Add `ROUTES.profile` only if needed later — **not** in this change
- Ensure `/settings` is reachable: add a minimal stub page under `app/(app)/settings/page.tsx` if missing so the menu link does not 404

## Auth / data

- Client component (`"use client"`)
- `useUser()` for display fields (already available inside `(app)` via `UserProvider`)
- Logout via `@villuh/auth` `authClient.signOut()` — not a raw fetch

## Visual notes

- Match existing sidebar density (padding aligned with `p-page` footer wrap)
- Truncate long names/emails; do not wrap the trigger into two tall rows beyond name + email
- Prefer existing UI primitives; no new design-system components unless a gap appears

## Success criteria

- [ ] User menu visible at bottom-left of landlord sidebar
- [ ] Trigger shows avatar, full name, email, and grabber chevron
- [ ] Menu opens upward with Settings, theme toggle, Log out
- [ ] Settings navigates to `/settings`
- [ ] Theme toggle switches light ↔ dark
- [ ] Log out clears session and lands on login
- [ ] No Profile item; no package extraction

## Approach chosen

Sidebar-local dropdown (option 1 from design discussion) — landlord-only, reuse `DropdownMenu` + `Avatar` + `useUser`.
