"use client"

import * as React from "react"

/** The minimal group surface the global mount needs. Any `OverlayGroup` satisfies it. */
export type MountableOverlayGroup = {
  namespace: string
  Mount: React.ComponentType
}

/**
 * The single global overlay mount. Registering a module here happens once;
 * after that, adding an overlay is one line in that module's `createOverlays`
 * config plus writing the component.
 *
 * Mount position is load-bearing:
 *   - INSIDE the app's user provider — overlay components may read it
 *     (e.g. ManageTagsDialog calls useUser() for its write check)
 *   - OUTSIDE any pathname-keyed transition wrapper — an open overlay inside
 *     one would fade or remount on every navigation
 */
export function AppOverlays({
  modules,
}: {
  modules: readonly MountableOverlayGroup[]
}) {
  return (
    <>
      {modules.map((group) => (
        <group.Mount key={group.namespace} />
      ))}
    </>
  )
}
