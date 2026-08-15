"use client"

import { useParams, useRouter } from "next/navigation"
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
import { ROUTES } from "@/app/routes"

/**
 * Unit delete is a soft-archive. Unlike property archive, a single unit has
 * no cascading children, so the confirm is a plain destructive dialog — no
 * type-the-name requirement. The unit label is fetched by id, gated on open;
 * no parent passes a row in.
 */
export function ArchiveUnitDialog({
  overlay,
}: {
  overlay: EntityOverlayHandle
}) {
  const router = useRouter()
  const utils = trpc.useUtils()
  const unitId = overlay.entityId
  // Optional params: this dialog is reachable from /units, the property Units
  // tab, and a unit detail page.
  const params = useParams<{ propertyId?: string; unitId?: string }>()

  const unitQuery = trpc.units.get.useQuery(
    { unitId: unitId ?? "" },
    { enabled: unitId !== null }
  )

  const archiveUnit = trpc.units.archive.useMutation({
    onError: (err) => toast.error(err.message || "Could not archive unit"),
  })

  // Read the redirect target OUTSIDE any onSuccess closure. onSuccess runs after
  // invalidateQueries resolves, by which point units.get has refetched for a
  // now-archived unit — reading `unitQuery.data` there yields undefined and
  // silently degrades every redirect to the ROUTES.units fallback. `handleArchived`
  // is called with an id captured at click time.
  const handleArchived = (propertyIdOfUnit: string | null) =>
    invalidateQueries(utils, [
      (u) => u.units.list,
      (u) => u.properties.get,
      (u) => u.properties.list,
      (u) => u.me.get,
    ]).then(() => {
      toast.success("Unit archived")
      overlay.close()
      // Only navigate when the archived unit's own detail page is where we are —
      // that route is now dead. Everywhere else (the /units list, the property
      // Units tab) the list query is already invalidated and the row is gone, so
      // stay put. (Intentional change: archiving from the property Units tab no
      // longer bounces the user off that tab.)
      if (params.unitId && params.unitId === unitId) {
        router.push(
          propertyIdOfUnit ? ROUTES.propertyDetail(propertyIdOfUnit) : ROUTES.units
        )
      }
    })

  return (
    <Dialog {...overlay.dialogProps}>
      <DialogContainer className="sm:max-w-sm">
        <OverlayBody
          query={unitQuery}
          pending={<SkeletonLabel className="h-6 w-48" />}
        >
          {({ unit, property }) => {
            // Snapshot BEFORE mutate — see handleArchived.
            const propertyIdOfUnit = property?.id ?? null
            return (
              <>
                <DialogHeader>
                  <DialogTitle>Archive {unit.label}?</DialogTitle>
                </DialogHeader>
                <DialogContent>
                  <DialogDescription>
                    Archiving hides this unit from active lists. Data is kept for
                    history.
                  </DialogDescription>
                </DialogContent>
                <DialogFooter>
                  <Button variant="outline" onClick={() => overlay.close()}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={archiveUnit.isPending}
                    onClick={() =>
                      archiveUnit.mutate(
                        { unitId: unit.id },
                        { onSuccess: () => handleArchived(propertyIdOfUnit) }
                      )
                    }
                  >
                    Archive unit
                  </Button>
                </DialogFooter>
              </>
            )
          }}
        </OverlayBody>
      </DialogContainer>
    </Dialog>
  )
}
