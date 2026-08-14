"use client"

import { useMemo } from "react"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import type { FlagOverlayHandle } from "@villuh/ui"
import { invalidateQueries, trpc } from "@villuh/api"
import { AmenitiesSelectDialog } from "./amenities-select-dialog"

/**
 * "Add amenities" dialog for a single property (D-39). Opened from the
 * property-amenities card header, mounted app-wide by `<AppOverlays>` as
 * `?amenity.add=open`, so `propertyId` comes from the route (`useParams`) — this
 * component sits OUTSIDE `PropertyDetailProvider`.
 *
 * A thin wrapper over the shared {@link AmenitiesSelectDialog}: it seeds the
 * selection from the property's current catalog-backed assignments and, on save,
 * diffs the selection to fire `property.add` for new picks + `property.remove`
 * for deselected ones — never the destructive `property.set`, so amenities that
 * stay selected keep their per-assignment edits (reservability, description) and
 * gallery. Catalog management (rename/archive/scope) lives in org settings.
 */
export function AddPropertyAmenitiesDialog({
  overlay,
}: {
  overlay: FlagOverlayHandle
}) {
  const { propertyId } = useParams<{ propertyId?: string }>()
  const utils = trpc.useUtils()

  const assignmentsQuery = trpc.amenities.property.list.useQuery(
    { propertyId: propertyId ?? "" },
    { enabled: overlay.isOpen && !!propertyId }
  )

  // catalogId -> propertyAmenityId for the property's current catalog-backed rows.
  const assignedByCatalogId = useMemo(() => {
    const map = new Map<string, string>()
    for (const row of assignmentsQuery.data?.amenities ?? []) {
      if (row.organizationAmenityId) map.set(row.organizationAmenityId, row.id)
    }
    return map
  }, [assignmentsQuery.data])

  const initialSelectedIds = useMemo(
    () => [...assignedByCatalogId.keys()],
    [assignedByCatalogId]
  )

  const addAssignment = trpc.amenities.property.add.useMutation()
  const removeAssignment = trpc.amenities.property.remove.useMutation()

  async function handleSubmit(selectedIds: string[]) {
    if (!propertyId) return
    const selected = new Set(selectedIds)
    const toAdd = selectedIds.filter((id) => !assignedByCatalogId.has(id))
    const toRemove = [...assignedByCatalogId.entries()]
      .filter(([catalogId]) => !selected.has(catalogId))
      .map(([, propertyAmenityId]) => propertyAmenityId)

    if (toAdd.length === 0 && toRemove.length === 0) return

    await Promise.all([
      ...toAdd.map((organizationAmenityId) =>
        addAssignment.mutateAsync({ propertyId, organizationAmenityId })
      ),
      ...toRemove.map((propertyAmenityId) =>
        removeAssignment.mutateAsync({ propertyAmenityId })
      ),
    ])
    await invalidateQueries(utils, [
      (u) => u.amenities.property.list,
      (u) => u.properties.get,
    ])
    toast.success("Amenities updated")
  }

  return (
    <AmenitiesSelectDialog
      open={overlay.dialogProps.open}
      onOpenChange={overlay.dialogProps.onOpenChange}
      title="Add Property Amenities"
      scope="property"
      initialSelectedIds={initialSelectedIds}
      submitLabel="Save"
      onSubmit={handleSubmit}
    />
  )
}
