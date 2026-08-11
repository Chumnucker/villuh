"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@villuh/ui"
import { invalidateQueries, trpc } from "@villuh/api"
import { ROUTES } from "@/app/routes"

/**
 * D-32: unit delete is a soft-archive. Unlike property archive (D-33), a single unit has no
 * cascading children, so the confirm is a plain destructive dialog — no type-name requirement.
 */
export function ArchiveUnitDialog({
  open,
  onOpenChange,
  unitId,
  unitLabel,
  propertyId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  unitId: string
  unitLabel: string
  /** When known, navigate back to the parent property detail instead of the units list. */
  propertyId?: string
}) {
  const router = useRouter()
  const utils = trpc.useUtils()

  const archiveUnit = trpc.units.archive.useMutation({
    onSuccess: () =>
      invalidateQueries(utils, [
        (u) => u.units.list,
        (u) => u.properties.get,
        (u) => u.properties.list,
        (u) => u.me.get,
      ]).then(() => {
        toast.success("Unit archived")
        onOpenChange(false)
        router.push(propertyId ? ROUTES.propertyDetail(propertyId) : ROUTES.units)
      }),
    onError: (err) => toast.error(err.message || "Could not archive unit"),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archive {unitLabel}?</DialogTitle>
          <DialogDescription>
            Archiving hides this unit from active lists. Data is kept for history.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep unit
          </Button>
          <Button
            variant="destructive"
            disabled={archiveUnit.isPending}
            onClick={() => archiveUnit.mutate({ unitId })}
          >
            Archive unit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
