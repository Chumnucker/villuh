"use client"

import type { EntityOverlayHandle } from "@villuh/ui"
import { CreateFloorPlanWizard } from "./create-floor-plan-wizard"
import { EditFloorPlanWizard } from "./edit-floor-plan-wizard"

/**
 * Fans the `property.floorPlan` overlay out to the two wizards: `?…=new`
 * opens the create flow, `?…={floorPlanId}` opens the edit flow. The active
 * wizard step is deliberately NOT in the URL. Both wizards take plain
 * `open`/`onClose`, so they can also be mounted anywhere the overlay system
 * isn't involved.
 */
export function FloorPlanOverlay({
  overlay,
}: {
  overlay: EntityOverlayHandle
}) {
  return (
    <>
      <CreateFloorPlanWizard open={overlay.isCreate} onClose={overlay.close} />
      <EditFloorPlanWizard
        open={overlay.entityId !== null}
        // `heldEntityId` (not `entityId`) keeps the plan id — and therefore the
        // body's key + cached data — stable through the close animation, so the
        // wizard doesn't remount/flash while it fades out.
        floorPlanId={overlay.heldEntityId}
        onClose={overlay.close}
      />
    </>
  )
}
