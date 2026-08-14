"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button, PlatformIcon } from "@villuh/ui"
import { invalidateQueries, trpc } from "@villuh/api"
import { useUser } from "@/modules/app/providers/me-provider"
import { AmenitiesSelectDialog } from "./amenities-select-dialog"

const NO_BASELINE: readonly string[] = []

/**
 * Bulk add/remove amenities across a multi-row unit selection — the design's
 * answer to the 200-unit problem (D-03/D-33) in place of floor-plan
 * inheritance. Rendered by the units DataTable's `selectionActions` slot (a
 * floating toolbar over the table) only while ≥1 row is selected.
 *
 * "Add amenities" and "Remove amenities" each open the shared
 * {@link AmenitiesSelectDialog}; on submit the chosen catalog ids fire ONE
 * idempotent `amenities.unit.bulkAdd` / `bulkRemove` with `{ unitIds,
 * organizationAmenityIds }` (D-33). Re-adding an amenity to a set where some
 * units already have it is a no-op (server `ON CONFLICT DO NOTHING`), so there
 * are no duplicates and no error. On success the per-page amenities map + units
 * list are invalidated (D-38) and the selection is cleared. The catalog scope
 * filter (unit|both) is UX only; the server re-enforces scope + org on the whole
 * batch (T-033-21).
 */
export function UnitAmenitiesBulkActions({
  selectedUnitIds,
  clearSelection,
}: {
  selectedUnitIds: string[]
  clearSelection: () => void
}) {
  const { user } = useUser()
  const canWrite = user.org.permissions.write
  const utils = trpc.useUtils()

  const [mode, setMode] = useState<"add" | "remove" | null>(null)

  const invalidate = () =>
    invalidateQueries(utils, [
      (u) => u.amenities.unit.list,
      (u) => u.amenities.unit.listByProperty,
      (u) => u.units.list,
    ])

  const bulkAdd = trpc.amenities.unit.bulkAdd.useMutation()
  const bulkRemove = trpc.amenities.unit.bulkRemove.useMutation()

  async function handleSubmit(organizationAmenityIds: string[]) {
    if (organizationAmenityIds.length === 0 || mode === null) return
    const input = { unitIds: selectedUnitIds, organizationAmenityIds }
    if (mode === "add") {
      await bulkAdd.mutateAsync(input)
      await invalidate()
      toast.success("Amenities added")
    } else {
      await bulkRemove.mutateAsync(input)
      await invalidate()
      toast.success("Amenities removed")
    }
    clearSelection()
  }

  const count = selectedUnitIds.length

  return (
    <>
      <div className="flex items-center gap-2 rounded-full border bg-card/95 py-1.5 pr-1.5 pl-4 shadow-lg backdrop-blur-sm">
        <span className="text-sm font-medium whitespace-nowrap">
          {count} unit{count === 1 ? "" : "s"} selected
        </span>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <Button
          variant="ghost"
          size="sm"
          disabled={!canWrite}
          onClick={() => setMode("add")}
        >
          <PlatformIcon icon="IconPlusSmall" size={16} data-icon="inline-start" />
          Add amenities
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={!canWrite}
          onClick={() => setMode("remove")}
        >
          <PlatformIcon
            icon="IconTrashCan"
            size={16}
            data-icon="inline-start"
          />
          Remove amenities
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={clearSelection}
          aria-label="Clear selection"
        >
          <PlatformIcon icon="IconCrossLarge" size={16} />
        </Button>
      </div>

      <AmenitiesSelectDialog
        open={mode !== null}
        onOpenChange={(open) => {
          if (!open) setMode(null)
        }}
        title={
          mode === "remove"
            ? `Remove amenities from ${count} unit${count === 1 ? "" : "s"}`
            : `Add amenities to ${count} unit${count === 1 ? "" : "s"}`
        }
        scope="unit"
        initialSelectedIds={NO_BASELINE}
        submitLabel={mode === "remove" ? "Remove" : "Add"}
        submitVariant={mode === "remove" ? "destructive" : "default"}
        allowCreate={mode === "add"}
        emptyLabel="No unit amenities in the catalog yet."
        onSubmit={handleSubmit}
      />
    </>
  )
}
