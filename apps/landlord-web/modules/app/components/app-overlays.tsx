"use client"

import { AppOverlays } from "@villuh/ui"
import { propertyOverlays } from "@/modules/properties/lib/properties.overlays"
import { unitOverlays } from "@/modules/units/lib/units.overlays"

/**
 * Client boundary for the global overlay mount.
 *
 * `(app)/layout.tsx` is an async Server Component, and an overlay registry is
 * a plain object full of functions and component references — passing it as a
 * prop across the RSC boundary would fail ("Functions cannot be passed
 * directly to Client Components"). Holding the module list here keeps the
 * layout's JSX prop-free.
 *
 * Registering a module is one line in MODULES (D-08).
 */
const MODULES = [unitOverlays, propertyOverlays]

export function LandlordOverlays() {
  return <AppOverlays modules={MODULES} />
}
