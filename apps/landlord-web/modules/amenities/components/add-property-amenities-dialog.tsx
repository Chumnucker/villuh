"use client"

import { useMemo, useState } from "react"
import { useParams } from "next/navigation"
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
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  PlatformIcon,
  ScrollArea,
  cn,
  isPlatformIconName,
  type FlagOverlayHandle,
} from "@villuh/ui"
import { invalidateQueries, trpc } from "@villuh/api"
import type { inferRouterOutputs } from "@trpc/server"
import type { AppRouter } from "@villuh/server/router"
import { useUser } from "@/modules/app/providers/me-provider"
import {
  AMENITY_ICON_COLOR_CLASSES,
  AMENITY_ICON_KEYS,
  TAG_COLOR_KEYS,
  type AmenityIconKey,
  type TagColorKey,
} from "../lib/amenity-icons"
import { AmenityIconColorPicker } from "./amenity-icon-color-picker"

type RouterOutput = inferRouterOutputs<AppRouter>
type CatalogRow =
  RouterOutput["amenities"]["catalog"]["list"]["amenities"][number]
type PropertyAmenity =
  RouterOutput["amenities"]["property"]["list"]["amenities"][number]

/**
 * "Add amenities" form dialog for a single property (D-39 rework). Opened from the
 * property-amenities card header, mounted app-wide by `<AppOverlays>` as
 * `?amenity.add=open`, so `propertyId` comes from the route (`useParams`) exactly
 * like {@link AmenitySheet} — this component sits OUTSIDE `PropertyDetailProvider`.
 *
 * The form is rendered as a child of `DialogContainer` (Radix `Content`), which is
 * itself presence-gated: it only mounts while the dialog is open AND stays mounted
 * through the close animation, then unmounts. So the form's state (and its queries)
 * are naturally fresh per open WITHOUT gating the JSX on `overlay.isOpen` — and never
 * blanks to a bare header mid-close. Gate the QUERY, never the JSX (see overlays.tsx).
 */
export function AddPropertyAmenitiesDialog({
  overlay,
}: {
  overlay: FlagOverlayHandle
}) {
  const { propertyId } = useParams<{ propertyId?: string }>()

  return (
    <Dialog {...overlay.dialogProps}>
      <DialogContainer className="sm:max-w-lg">
        {propertyId ? (
          <AddPropertyAmenitiesForm overlay={overlay} propertyId={propertyId} />
        ) : (
          <DialogHeader>
            <DialogTitle>Add amenities</DialogTitle>
          </DialogHeader>
        )}
      </DialogContainer>
    </Dialog>
  )
}

/**
 * Staged multi-select. Toggling a catalog amenity only changes local selection;
 * nothing persists until **Save**, which diffs the selection against the current
 * catalog-backed assignments and fires `property.add` for new picks + `property.remove`
 * for deselected ones — never the destructive `property.set`, so an amenity that stays
 * selected keeps its per-assignment edits (reservability, description) and its gallery.
 *
 * New amenities are created straight into the catalog scoped to `property` (no scope
 * selector — the context is always this property) and auto-selected. Catalog management
 * (rename/archive/scope) lives in organization settings, not here.
 */
function AddPropertyAmenitiesForm({
  overlay,
  propertyId,
}: {
  overlay: FlagOverlayHandle
  propertyId: string
}) {
  const { user } = useUser()
  const canWrite = user.org.permissions.write
  const utils = trpc.useUtils()

  const catalogQuery = trpc.amenities.catalog.list.useQuery()
  const assignmentsQuery = trpc.amenities.property.list.useQuery({ propertyId })

  // Only amenities that can attach to a property (scope `property` or `both`).
  const catalog: CatalogRow[] = useMemo(
    () =>
      (catalogQuery.data?.amenities ?? []).filter(
        (row) => row.scope === "property" || row.scope === "both"
      ),
    [catalogQuery.data]
  )

  const assignments: PropertyAmenity[] = useMemo(
    () => assignmentsQuery.data?.amenities ?? [],
    [assignmentsQuery.data]
  )

  // catalogId -> propertyAmenityId for the property's current catalog-backed rows.
  const assignedByCatalogId = useMemo(() => {
    const map = new Map<string, string>()
    for (const row of assignments) {
      if (row.organizationAmenityId) map.set(row.organizationAmenityId, row.id)
    }
    return map
  }, [assignments])

  // `null` = untouched, so the selection derives from the current assignments; the
  // first toggle/create snapshots that baseline into a mutable set. This sidesteps a
  // seeding effect while still cold-loading correctly.
  const [override, setOverride] = useState<Set<string> | null>(null)
  const selected = override ?? new Set(assignedByCatalogId.keys())

  const [newName, setNewName] = useState("")
  const [newIcon, setNewIcon] = useState<AmenityIconKey>(AMENITY_ICON_KEYS[0])
  const [newColor, setNewColor] = useState<TagColorKey>(TAG_COLOR_KEYS[0])

  const createAmenity = trpc.amenities.catalog.create.useMutation({
    onError: (err) => toast.error(err.message || "Could not create amenity"),
  })
  const addAssignment = trpc.amenities.property.add.useMutation()
  const removeAssignment = trpc.amenities.property.remove.useMutation()

  const isSaving = addAssignment.isPending || removeAssignment.isPending

  function toggle(catalogId: string) {
    setOverride((prev) => {
      const next = new Set(prev ?? assignedByCatalogId.keys())
      if (next.has(catalogId)) next.delete(catalogId)
      else next.add(catalogId)
      return next
    })
  }

  async function submitNewAmenity() {
    const name = newName.trim()
    if (!name || createAmenity.isPending) return
    try {
      const { amenity } = await createAmenity.mutateAsync({
        name,
        scope: "property",
        iconKey: newIcon,
        colorKey: newColor,
      })
      await invalidateQueries(utils, [(u) => u.amenities.catalog.list])
      setOverride((prev) => {
        const next = new Set(prev ?? assignedByCatalogId.keys())
        next.add(amenity.id)
        return next
      })
      setNewName("")
      setNewIcon(AMENITY_ICON_KEYS[0])
      setNewColor(TAG_COLOR_KEYS[0])
    } catch {
      // toast handled in onError
    }
  }

  async function handleSave() {
    if (isSaving) return

    const toAdd = [...selected].filter((id) => !assignedByCatalogId.has(id))
    const toRemove = [...assignedByCatalogId.entries()]
      .filter(([catalogId]) => !selected.has(catalogId))
      .map(([, propertyAmenityId]) => propertyAmenityId)

    if (toAdd.length === 0 && toRemove.length === 0) {
      overlay.close()
      return
    }

    try {
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
      overlay.close()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not update amenities"
      )
    }
  }

  const isLoading = catalogQuery.isLoading || assignmentsQuery.isLoading

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Property Amenities</DialogTitle>
      </DialogHeader>

      <DialogContent>
        {canWrite ? (
          <InputGroup>
            <InputGroupAddon align="inline-start">
              <AmenityIconColorPicker
                size="sm"
                iconKey={newIcon}
                colorKey={newColor}
                onChange={({ iconKey, colorKey }) => {
                  setNewIcon(iconKey)
                  setNewColor(colorKey)
                }}
              />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Create a new amenity"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  void submitNewAmenity()
                }
              }}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                type="button"
                size="sm"
                disabled={!newName.trim() || createAmenity.isPending}
                onClick={() => void submitNewAmenity()}
              >
                Create
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        ) : null}

        <ScrollArea className="max-h-96 rounded-3xl bg-input">
          <div className="flex flex-col gap-1 p-2.5">
            {isLoading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-10 animate-pulse rounded-2xl bg-muted"
                  />
                ))}
              </div>
            ) : catalog.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No amenities yet. Create one above to get started.
              </p>
            ) : (
              catalog.map((row) => {
                const isSelected = selected.has(row.id)
                return (
                  <button
                    key={row.id}
                    type="button"
                    disabled={!canWrite}
                    onClick={() => toggle(row.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition-colors",
                      "hover:bg-muted disabled:cursor-default disabled:hover:bg-transparent",
                      isSelected && "bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-xl bg-card",
                        AMENITY_ICON_COLOR_CLASSES[row.colorKey as TagColorKey]
                      )}
                    >
                      <PlatformIcon
                        icon={
                          isPlatformIconName(row.iconKey)
                            ? row.iconKey
                            : "IconStar"
                        }
                        size={16}
                      />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {row.name}
                    </span>
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground"
                      )}
                    >
                      <PlatformIcon
                        icon={isSelected ? "IconCheckmark1" : "IconPlusSmall"}
                        size={14}
                      />
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>

      <DialogFooter>
        <Button variant="outline" onClick={() => overlay.close()}>
          Cancel
        </Button>
        {canWrite ? (
          <Button onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save"}
          </Button>
        ) : null}
      </DialogFooter>
    </>
  )
}
