"use client"

import { ViewTransition } from "react"
import { usePathname } from "next/navigation"

/**
 * Remounts on each navigation (Next.js template behavior) and runs a page
 * cross-fade via React View Transitions.
 *
 * Persists outside this boundary: `(app)/layout.tsx` chrome (sidebar, top bar,
 * providers). Only `{children}` (the page) participates in the transition.
 */
export default function AppTemplate({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <ViewTransition
      key={pathname}
      enter="page-fade"
      exit="page-fade"
      default="none"
    >
      {children}
    </ViewTransition>
  )
}
