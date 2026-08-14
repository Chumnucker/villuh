"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
  Field,
  FieldLabel,
  Input,
  OverlayBody,
  ScrollArea,
  SkeletonBox,
  SkeletonLabel,
  StatusBadge,
  type EntityOverlayHandle,
} from "@villuh/ui"
import { invalidateQueries, trpc } from "@villuh/api"
import type { inferRouterOutputs } from "@trpc/server"
import type { AppRouter } from "@villuh/server/router"
import { ROUTES } from "@/app/routes"

type PropertyGet = inferRouterOutputs<AppRouter>["properties"]["get"]
type UnitStatusList = inferRouterOutputs<AppRouter>["unitStatuses"]["list"]

/**
 * Property archive is a cascade soft-archive of every active unit. The
 * confirm UX deliberately lists each affected unit and requires typing the
 * exact property name before the destructive CTA enables, to prevent an
 * accidental multi-unit archive from one click. The property name and unit
 * cascade are fetched by id, gated on open.
 */
export function ArchivePropertyDialog({
  overlay,
}: {
  overlay: EntityOverlayHandle
}) {
  // `heldEntityId` keeps the property (and the body's `key`) stable through the
  // close animation, so the confirm doesn't remount/flash mid-close. Query
  // stays gated on `isOpen` (live) so it never fires while closed.
  const propertyId = overlay.heldEntityId

  // `properties.get` already carries `property.name` and the unit list, so no
  // parent passes data in at any extra network cost.
  const propertyQuery = trpc.properties.get.useQuery(
    { propertyId: propertyId ?? "" },
    { enabled: overlay.isOpen && propertyId !== null }
  )
  const { data: statusesData } = trpc.unitStatuses.list.useQuery(undefined, {
    enabled: overlay.isOpen,
  })

  return (
    <Dialog {...overlay.dialogProps}>
      <DialogContainer className="sm:max-w-lg">
        <OverlayBody query={propertyQuery} pending={<ArchivePropertySkeleton />}>
          {({ property, units }) => (
            <ArchivePropertyConfirm
              key={propertyId ?? "none"}
              property={property}
              units={units}
              statuses={statusesData}
              overlay={overlay}
            />
          )}
        </OverlayBody>
      </DialogContainer>
    </Dialog>
  )
}

function ArchivePropertySkeleton() {
  return (
    <>
      <DialogHeader>
        <SkeletonLabel className="h-6 w-56" />
      </DialogHeader>
      <DialogContent>
        <SkeletonBox className="h-16 w-full rounded-2xl" />
        <SkeletonBox className="h-24 w-full rounded-2xl" />
      </DialogContent>
    </>
  )
}

function ArchivePropertyConfirm({
  property,
  units,
  statuses,
  overlay,
}: {
  property: PropertyGet["property"]
  units: PropertyGet["units"]
  statuses: UnitStatusList | undefined
  overlay: EntityOverlayHandle
}) {
  const router = useRouter()
  const utils = trpc.useUtils()
  // The type-the-name confirm is deliberately NOT linkable state — a URL that
  // pre-fills a destructive confirmation would defeat the guard. Local
  // useState, reset by the `key` on this component (keyed on propertyId in
  // the shell).
  const [confirmName, setConfirmName] = useState("")

  const statusesById = new Map(
    (statuses?.statuses ?? []).map((status) => [status.id, status])
  )

  const archiveProperty = trpc.properties.archive.useMutation({
    onSuccess: () =>
      invalidateQueries(utils, [
        (u) => u.properties.list,
        (u) => u.units.list,
        (u) => u.me.get,
      ]).then(() => {
        toast.success("Property archived")
        overlay.close()
        router.push(ROUTES.properties)
      }),
    onError: (err) => toast.error(err.message || "Could not archive property"),
  })

  const nameMatches =
    confirmName.trim().length > 0 && confirmName.trim() === property.name

  return (
    <>
      <DialogHeader>
        <DialogTitle>Archive {property.name}?</DialogTitle>
      </DialogHeader>

      <DialogContent>
        <DialogDescription>
          Archiving hides this property and all of its units from your active
          portfolio. This is not a permanent delete — data is kept.
        </DialogDescription>

        <div className="flex flex-col gap-2">
          {units.length > 0 ? (
            <>
              <p className="text-sm font-medium text-foreground">
                These units will also be archived:
              </p>
              <ScrollArea className="max-h-48">
                <div className="flex flex-col rounded-2xl border bg-secondary">
                  {units.map((unit) => (
                    <div
                      key={unit.id}
                      className="flex flex-row items-center justify-between gap-2 border-b px-3 py-2 last:border-b-0"
                    >
                      <span className="text-sm text-foreground">
                        {unit.label}
                      </span>
                      <StatusBadge
                        status={
                          unit.statusId
                            ? (statusesById.get(unit.statusId) ?? null)
                            : null
                        }
                      />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          ) : null}
        </div>

        <Field>
          <FieldLabel htmlFor="archive-property-confirm-name">
            Type {property.name} to confirm
          </FieldLabel>
          <Input
            id="archive-property-confirm-name"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            autoComplete="off"
          />
        </Field>
      </DialogContent>

      <DialogFooter>
        <Button variant="outline" onClick={() => overlay.close()}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          disabled={!nameMatches || archiveProperty.isPending}
          onClick={() => archiveProperty.mutate({ propertyId: property.id })}
        >
          Archive property
        </Button>
      </DialogFooter>
    </>
  )
}
