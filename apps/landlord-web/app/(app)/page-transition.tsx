"use client"

import { ViewTransition } from "react"
import { usePathname } from "next/navigation"

// Mirrors the tab suffixes in `modules/properties/components/view/navigation.tsx`
// (`PROPERTY_TABS`) — "about" has no suffix, it's the bare `/properties/[id]` route.
const PROPERTY_DETAIL_TABS_PATTERN =
  /^(\/properties\/[^/]+)(?:\/(?:units|gallery|tenants|analytics))?$/

/**
 * App-wide page-fade transition — replaces the old `(app)/template.tsx`.
 *
 * `template.tsx` remounts *everything* below it on every navigation, even
 * between sibling routes sharing a persistent nested `layout.tsx` — which
 * broke property detail's About/Units/Gallery/Tenants/Analytics tabs (their
 * shared header + hero backdrop were torn down and rebuilt on every tab
 * switch). A template can't be scoped to exclude a nested route, so this
 * lives in `(app)/layout.tsx` as a plain component instead — a real layout
 * persists its own subtree, and we own the transition boundary/key.
 *
 * Keyed by pathname, except property detail tabs collapse to one shared key
 * (`/properties/[id]`) so switching between them doesn't retrigger this
 * transition. `(detail)/layout.tsx` renders its own inner `<ViewTransition>`
 * around just the tab content for that finer-grained fade instead.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const transitionKey =
    pathname.match(PROPERTY_DETAIL_TABS_PATTERN)?.[1] ?? pathname

  return (
    <ViewTransition
      key={transitionKey}
      enter="page-fade"
      exit="page-fade"
      default="none"
    >
      {children}
    </ViewTransition>
  )
}
