"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  Badge,
  Button,
  Checkbox,
  PlatformIcon,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  isPlatformIconName,
} from "@villuh/ui"
import { invalidateQueries, trpc } from "@villuh/api"
import { useUser } from "@/modules/app/providers/me-provider"

/**
 * Bulk add/remove amenities across a multi-row unit selection — the design's
 * answer to the 200-unit problem (D-03/D-33) in place of floor-plan
 * inheritance. Rendered by the units DataTable's `selectionActions` slot only
 * while ≥1 row is selected.
 *
 * Add and Remove each fire ONE idempotent call — `amenities.unit.bulkAdd` /
 * `bulkRemove` with `{ unitIds, organizationAmenityIds }` (D-33). Re-adding an
 * amenity to a set where some units already have it is a no-op (server
 * `ON CONFLICT DO NOTHING`), so there are no duplicates and no error. On
 * success the per-page amenities map + units list are invalidated (D-38) and
 * the selection is cleared. The client catalog filter (scope unit|both) is UX
 * only; the server re-enforces scope + org on the whole batch (T-033-21).
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

  const [popoverOpen, setPopoverOpen] = useState(false)
  const [pickedIds, setPickedIds] = useState<string[]>([])

  const { data: catalogData } = trpc.amenities.catalog.list.useQuery()
  // Only unit-attachable amenities (scope unit | both) can be bulk-applied to units.
  const catalog = useMemo(
    () =>
      (catalogData?.amenities ?? []).filter(
        (row) => row.scope === "unit" || row.scope === "both"
      ),
    [catalogData]
  )

  const invalidate = () =>
    invalidateQueries(utils, [
      (u) => u.amenities.unit.list,
      (u) => u.amenities.unit.listByProperty,
      (u) => u.units.list,
    ])

  const bulkAdd = trpc.amenities.unit.bulkAdd.useMutation({
    onSuccess: () =>
      invalidate().then(() => {
        toast.success("Amenities added")
        setPickedIds([])
        setPopoverOpen(false)
        clearSelection()
      }),
    onError: (err) => toast.error(err.message || "Could not add amenities"),
  })
  const bulkRemove = trpc.amenities.unit.bulkRemove.useMutation({
    onSuccess: () =>
      invalidate().then(() => {
        toast.success("Amenities removed")
        setPickedIds([])
        setPopoverOpen(false)
        clearSelection()
      }),
    onError: (err) => toast.error(err.message || "Could not remove amenities"),
  })

  const isPending = bulkAdd.isPending || bulkRemove.isPending
  const canApply = canWrite && pickedIds.length > 0 && !isPending

  function togglePicked(id: string) {
    setPickedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function apply(kind: "add" | "remove") {
    if (!canApply) return
    const input = {
      unitIds: selectedUnitIds,
      organizationAmenityIds: pickedIds,
    }
    if (kind === "add") bulkAdd.mutate(input)
    else bulkRemove.mutate(input)
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-3 py-2">
      <span className="text-sm font-medium">
        {selectedUnitIds.length} unit{selectedUnitIds.length === 1 ? "" : "s"}{" "}
        selected
      </span>

      <Popover
        open={popoverOpen}
        onOpenChange={(open) => {
          setPopoverOpen(open)
          if (!open) setPickedIds([])
        }}
      >
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" disabled={!canWrite}>
            <PlatformIcon icon="IconStar" size={16} data-icon="inline-start" />
            Choose amenities
            {pickedIds.length > 0 ? (
              <Badge variant="outline">{pickedIds.length}</Badge>
            ) : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64">
          {catalog.length === 0 ? (
            <p className="px-1 py-2 text-center text-xs text-muted-foreground">
              No unit amenities in the catalog yet.
            </p>
          ) : (
            <ScrollArea className="max-h-64">
              <div className="flex flex-col gap-0.5">
                {catalog.map((row) => {
                  const checked = pickedIds.includes(row.id)
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => togglePicked(row.id)}
                      className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-accent"
                    >
                      <Checkbox checked={checked} className="pointer-events-none" />
                      {isPlatformIconName(row.iconKey) ? (
                        <PlatformIcon icon={row.iconKey} size={14} />
                      ) : null}
                      <span className="flex-1 truncate">{row.name}</span>
                    </button>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </PopoverContent>
      </Popover>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => apply("remove")}
          disabled={!canApply}
        >
          Remove
        </Button>
        <Button size="sm" onClick={() => apply("add")} disabled={!canApply}>
          Add
        </Button>
        <Button variant="ghost" size="sm" onClick={clearSelection}>
          Clear
        </Button>
      </div>
    </div>
  )
}
