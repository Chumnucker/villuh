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
} from "@villuh/ui"
import { invalidateQueries, trpc } from "@villuh/api"

export type ArchiveFloorPlanTarget = {
  id: string
  name: string
  unitCount: number
}

/**
 * Screen 6 (D-44). The standard, unmodified `Dialog` — structurally identical
 * to `archive-unit-dialog.tsx`, no type-the-name gate. Archiving a floor plan
 * is soft and non-cascading (D-11): assigned units keep pointing at it and keep
 * inheriting, so the body reassures with the affected unit count.
 *
 * Controlled by the section (the list row already carries name + unitCount, so
 * there is no by-id fetch): `plan` is the target, `open`/`onOpenChange` drive
 * the Radix dialog.
 */
export function ArchiveFloorPlanDialog({
  plan,
  open,
  onOpenChange,
}: {
  plan: ArchiveFloorPlanTarget | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const utils = trpc.useUtils()

  const archiveFloorPlan = trpc.floorPlans.archive.useMutation({
    onError: (err) =>
      toast.error(err.message || "Could not archive floor plan"),
  })

  function handleArchived() {
    // D-47 checklist: the plan list + detail go stale, and the property's
    // settings tab reads the plan set. Floor plans are uncapped, so me.get is
    // NOT invalidated (D-28) — they carry no org quota.
    void invalidateQueries(utils, [
      (u) => u.floorPlans.list,
      (u) => u.floorPlans.get,
      (u) => u.properties.get,
    ]).then(() => {
      toast.success("Floor plan archived")
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContainer className="sm:max-w-sm">
        {plan ? (
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
              <Button variant="outline" onClick={() => onOpenChange(false)}>
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
        ) : null}
      </DialogContainer>
    </Dialog>
  )
}
