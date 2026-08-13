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
  ScrollArea,
  StatusBadge,
} from "@villuh/ui"
import { invalidateQueries, trpc } from "@villuh/api"
import { ROUTES } from "@/app/routes"

/**
 * D-30/D-31/D-33: property archive is a cascade soft-archive of every active unit. The confirm
 * UX deliberately lists each affected unit and requires typing the exact property name before
 * the destructive CTA enables, to prevent an accidental multi-unit archive from one click.
 */
export function ArchivePropertyDialog({
  open,
  onOpenChange,
  propertyId,
  propertyName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  propertyId: string
  propertyName: string
}) {
  const router = useRouter()
  const utils = trpc.useUtils()
  const [confirmName, setConfirmName] = useState("")

  const { data } = trpc.properties.get.useQuery(
    { propertyId },
    { enabled: open }
  )
  const { data: statusesData } = trpc.unitStatuses.list.useQuery(undefined, {
    enabled: open,
  })
  const units = data?.units ?? []
  const statusesById = new Map(
    (statusesData?.statuses ?? []).map((status) => [status.id, status])
  )

  const archiveProperty = trpc.properties.archive.useMutation({
    onSuccess: () =>
      invalidateQueries(utils, [
        (u) => u.properties.list,
        (u) => u.units.list,
        (u) => u.me.get,
      ]).then(() => {
        toast.success("Property archived")
        onOpenChange(false)
        router.push(ROUTES.properties)
      }),
    onError: (err) => toast.error(err.message || "Could not archive property"),
  })

  const nameMatches =
    confirmName.trim().length > 0 && confirmName.trim() === propertyName

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setConfirmName("")
        onOpenChange(next)
      }}
    >
      <DialogContainer className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Archive {propertyName}?</DialogTitle>
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
              Type {propertyName} to confirm
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!nameMatches || archiveProperty.isPending}
            onClick={() => archiveProperty.mutate({ propertyId })}
          >
            Archive property
          </Button>
        </DialogFooter>
      </DialogContainer>
    </Dialog>
  )
}
