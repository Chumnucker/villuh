"use client"

import * as React from "react"

import type { OverlayDef, OverlayHandle } from "./types"

/**
 * The erased group shape this mount consumes — deliberately NOT
 * `OverlayGroup<Record<string, OverlayDef>>`.
 *
 * Erasing the key union collapses `OverlayHandles<C>` into a string index
 * signature, and `closeAll` is a `() => void` sitting in that same object, so
 * it is incompatible with an `OverlayHandle`-valued index signature. Written
 * the obvious way, NO concretely-typed group is assignable to `modules` — the
 * failure only surfaces at the first call site. Widening the index value type
 * to include `closeAll`'s own type is what makes the widening legal; the one
 * narrowing below is its cost.
 */
type AnyOverlayGroup = {
  namespace: string
  defs: Record<string, OverlayDef>
  useGroup: () => Record<string, OverlayHandle | (() => void)>
}

/**
 * The single global overlay mount (D-08). Registering a module here happens
 * once; after that, adding an overlay is one line in that module's config plus
 * writing the component.
 *
 * Mount position is load-bearing (D-34):
 *   - INSIDE <UserProvider>   — ManageTagsDialog calls useUser() for its write check
 *   - OUTSIDE <PageTransition> — that is a ViewTransition keyed on pathname; an
 *                                open overlay inside it would fade or remount on
 *                                every navigation
 *
 * Every registered overlay component runs its hooks on every authenticated page,
 * so every tRPC query inside one MUST be gated on `overlay.isOpen` (D-36).
 * Gate the QUERY, never the JSX — conditionally rendering the overlay unmounts
 * the Radix root before Presence can run the exit animation (RESEARCH 7.1).
 */
export function AppOverlays({
  modules,
}: {
  modules: readonly AnyOverlayGroup[]
}) {
  return (
    <>
      {modules.map((group) => (
        <OverlayGroupMount key={group.namespace} group={group} />
      ))}
    </>
  )
}

/**
 * One component instance per group, so `useGroup()` is a normal top-level hook
 * call rather than a hook inside a loop. This is why AppOverlays needs no
 * eslint disable: the `modules` array may vary in length across mounts without
 * ever changing the hook sequence of any single component instance.
 */
function OverlayGroupMount({ group }: { group: AnyOverlayGroup }) {
  const handles = group.useGroup()
  return (
    <>
      {Object.entries(group.defs).map(([name, def]) => {
        // D-47: `mount: "page"` entries are registered for namespacing, the
        // collision assert, closeAll(), and href() — but rendered by their page.
        if (def.mount === "page" || !def.component) return null
        const Component = def.component
        // Narrowing the AnyOverlayGroup index union back down: every key in
        // `defs` has a handle, `closeAll` is the only non-handle member and it
        // is never a key in `defs`.
        return <Component key={name} overlay={handles[name] as OverlayHandle} />
      })}
    </>
  )
}
