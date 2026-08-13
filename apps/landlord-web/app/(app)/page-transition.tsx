"use client"

import { ViewTransition } from "react"
import { usePathname } from "next/navigation"
import { PROPERTY_TAB_GROUPS } from "@/modules/properties/lib/property-tab-groups"

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
 * Keyed by pathname, except for tab groups that share a persistent nested
 * layout: those collapse to the group's base path so moving between their tabs
 * doesn't retrigger this transition and remount the shared header/nav. Each of
 * those layouts renders its own inner `<ViewTransition>` around just the tab
 * content for that finer-grained fade instead.
 *
 * The groups are derived from the tab definitions themselves (see
 * `modules/properties/lib/property-tab-groups.ts`), so adding a tab needs no
 * change here. Moving between two groups still changes the key, which is
 * intended — they're different pages with different chrome.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const transitionKey =
    PROPERTY_TAB_GROUPS.reduce<string | null>(
      (matched, group) => matched ?? group.matchBase(pathname),
      null
    ) ?? pathname

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
