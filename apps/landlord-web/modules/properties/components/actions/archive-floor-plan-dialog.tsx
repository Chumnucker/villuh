"use client"

import { toast } from "sonner"
import {
  Button,
  Dialog,
  DialogContainer,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  OverlayBody,
  SkeletonLabel,
  type EntityOverlayHandle,
} from "@villuh/ui"
import { invalidateQueries, trpc } from "@villuh/api"

/**
 * Screen 6 (D-44). The standard, unmodified `Dialog` — structurally identical
 * to `archive-unit-dialog.tsx`, no type-the-name gate. Archiving a floor plan
 * is soft and non-cascading (D-11): assigned units keep pointing at it and keep
 * inheriting, so the body reassures with the affected unit count.
 *
 * Driven by the `property.floorPlanArchive` overlay: the plan (name + unit
 * count) is fetched by id, gated on open — no parent passes a row in.
 */
export function ArchiveFloorPlanDialog({
  overlay,
}: {
  overlay: EntityOverlayHandle
}) {
  const utils = trpc.useUtils()
  const floorPlanId = overlay.entityId

  const planQuery = trpc.floorPlans.get.useQuery(
    { floorPlanId: floorPlanId ?? "" },
    { enabled: floorPlanId !== null }
  )

  const archiveFloorPlan = trpc.floorPlans.archive.useMutation({
    onError: (err) =>
      toast.error(err.message || "Could not archive floor plan"),
  })

  function handleArchived() {
    // D-47 checklist: the plan list + detail go stale, and the property's
    // settings tab reads the plan set. Floor plans are uncapped, so the
    // current-user quota query is NOT invalidated (D-28) — they carry no org quota.
    void invalidateQueries(utils, [
      (u) => u.floorPlans.list,
      (u) => u.floorPlans.get,
      (u) => u.properties.get,
    ]).then(() => {
      toast.success("Floor plan archived")
      overlay.close()
    })
  }

  return (
    <Dialog {...overlay.dialogProps}>
      <DialogContainer className="sm:max-w-sm">
        <OverlayBody
          query={planQuery}
          pending={<SkeletonLabel className="h-6 w-48" />}
        >
          {(plan) => (
            <>
              <DialogHeader>
                <DialogTitle>Archive {plan.name}?</DialogTitle>
              </DialogHeader>
              <DialogContent>
                <DialogDescription>
                  {plan.unitCount > 0
                    ? `Archiving hides this floor plan from assignment pickers. The ${plan.unitCount} units using it keep this plan and keep inheriting its values — nothing is cleared.`
                    : "Archiving hides this floor plan from assignment pickers. Data is kept and you can still see it on any unit that used it."}
                </DialogDescription>
              </DialogContent>
              <DialogFooter>
                <Button variant="outline" onClick={() => overlay.close()}>
                  Keep floor plan
                </Button>
                <Button
                  variant="destructive"
                  disabled={archiveFloorPlan.isPending}
                  onClick={() =>
                    archiveFloorPlan.mutate(
                      { floorPlanId: plan.id },
                      { onSuccess: handleArchived }
                    )
                  }
                >
                  Archive floor plan
                </Button>
              </DialogFooter>
            </>
          )}
        </OverlayBody>
      </DialogContainer>
    </Dialog>
  )
}
