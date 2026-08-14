"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Field,
  FieldDescription,
  FieldLabel,
  Input,
  PlatformIcon,
  Popover,
  PopoverContent,
  PopoverTrigger,
  TagBadge,
  cn,
  inputVariants,
  isPlatformIconName,
} from "@villuh/ui"
import type { VariantProps } from "class-variance-authority"
import { invalidateQueries, trpc } from "@villuh/api"
import { useUser } from "@/modules/app/providers/me-provider"
import {
  AMENITY_ICON_KEYS,
  TAG_COLOR_KEYS,
  type AmenityIconKey,
  type TagColorKey,
} from "../lib/amenity-icons"
import { AmenityIconColorPicker } from "./amenity-icon-color-picker"

/** Which target an amenity attaches to — drives both scope filtering and the mutations. */
type AmenityContext = "property" | "unit"

/**
 * One denormalized amenity row the picker renders and mutates. Catalog-backed
 * (`organizationAmenityId` set) and freeform (`null`) rows carry the same
 * denormalized `label`/`iconKey`/`colorKey`, so the picker never branches on the
 * catalog FK for display (D-23).
 */
export type AmenityPickerItem = {
  id: string
  organizationAmenityId: string | null
  label: string
  iconKey: AmenityIconKey
  colorKey: TagColorKey
}

type CatalogRow = {
  id: string
  name: string
  scope: AmenityContext | "both"
  iconKey: AmenityIconKey
  colorKey: TagColorKey
}

function mapAssignmentRow(row: {
  id: string
  organizationAmenityId: string | null
  label: string
  iconKey: string
  colorKey: string
}): AmenityPickerItem {
  return {
    id: row.id,
    organizationAmenityId: row.organizationAmenityId,
    label: row.label,
    iconKey: row.iconKey as AmenityIconKey,
    colorKey: row.colorKey as TagColorKey,
  }
}

type SharedProps = {
  variant?: VariantProps<typeof inputVariants>["variant"]
  size?: VariantProps<typeof inputVariants>["size"]
  className?: string
  /** `inline` — chips beside a title (no field label / bordered box). */
  appearance?: "field" | "inline"
}

/**
 * Dual-mode, scope-filtered search-or-create amenity control (D-41) — the amenity
 * near-twin of `TagPicker`. Catalog suggestions are filtered by the target's scope
 * (D-02/D-34): a `property` context shows `property` + `both` amenities, a `unit`
 * context shows `unit` + `both`. The client filter is UX only — the server also
 * enforces scope (T-033-17), so it can never be bypassed.
 *
 * Three modes, one component:
 * - **Live property** (`propertyId`): reads/writes real `amenities.property.*` rows.
 * - **Live unit** (`unitId`): reads/writes real `amenities.unit.*` rows.
 * - **Staged** (`context` + `value`/`onChange`): the create-before-id case — the
 *   local array is the source of truth; the parent persists it once a real id
 *   exists (mirrors how `PropertyForm` flushes staged tags after create).
 *
 * Every live mutation invalidates per D-38: unit → `amenities.unit.list` +
 * `amenities.unit.listByProperty`; property → `amenities.property.list` +
 * `properties.get`. `me.get` is never touched (D-13).
 */
export function AmenityPicker(
  props:
    | (SharedProps & {
        propertyId: string
        unitId?: undefined
        context?: undefined
        value?: undefined
        onChange?: undefined
      })
    | (SharedProps & {
        unitId: string
        propertyId?: undefined
        context?: undefined
        value?: undefined
        onChange?: undefined
      })
    | (SharedProps & {
        context: AmenityContext
        propertyId?: undefined
        unitId?: undefined
        value: AmenityPickerItem[]
        onChange: (items: AmenityPickerItem[]) => void
      })
) {
  const {
    propertyId,
    unitId,
    variant = "default",
    size = "default",
    className,
    appearance = "field",
  } = props
  const isInline = appearance === "inline"
  const isLive = !!propertyId || !!unitId
  // The attach target drives both the scope filter and which mutations fire.
  const target: AmenityContext = propertyId
    ? "property"
    : unitId
      ? "unit"
      : (props.context ?? "property")
  const { user } = useUser()
  const canWrite = user.org.permissions.write
  const utils = trpc.useUtils()

  const [popoverOpen, setPopoverOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [creating, setCreating] = useState(false)
  const [newIcon, setNewIcon] = useState<AmenityIconKey>(AMENITY_ICON_KEYS[0])
  const [newColor, setNewColor] = useState<TagColorKey>(TAG_COLOR_KEYS[0])

  const { data: catalogData } = trpc.amenities.catalog.list.useQuery()
  const catalog: CatalogRow[] = useMemo(
    () =>
      (catalogData?.amenities ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        scope: row.scope,
        iconKey: row.iconKey as AmenityIconKey,
        colorKey: row.colorKey as TagColorKey,
      })),
    [catalogData]
  )

  const { data: propertyAmenitiesData } =
    trpc.amenities.property.list.useQuery(
      { propertyId: propertyId ?? "" },
      { enabled: isLive && target === "property" }
    )
  const { data: unitAmenitiesData } = trpc.amenities.unit.list.useQuery(
    { unitId: unitId ?? "" },
    { enabled: isLive && target === "unit" }
  )

  const items: AmenityPickerItem[] = useMemo(() => {
    if (!isLive) return props.value ?? []
    const rows =
      target === "property"
        ? (propertyAmenitiesData?.amenities ?? [])
        : (unitAmenitiesData?.amenities ?? [])
    return rows.map(mapAssignmentRow)
  }, [isLive, target, propertyAmenitiesData, unitAmenitiesData, props.value])

  const invalidatePropertyAmenities = () =>
    invalidateQueries(utils, [
      (u) => u.amenities.property.list,
      (u) => u.properties.get,
      (u) => u.amenities.catalog.list,
    ])
  const invalidateUnitAmenities = () =>
    invalidateQueries(utils, [
      (u) => u.amenities.unit.list,
      (u) => u.amenities.unit.listByProperty,
      (u) => u.amenities.catalog.list,
    ])

  // Property-context mutations.
  const attachProperty = trpc.amenities.property.add.useMutation({
    onSuccess: () => invalidatePropertyAmenities(),
    onError: (err) => toast.error(err.message || "Could not add amenity"),
  })
  const addFreeformProperty = trpc.amenities.property.addFreeform.useMutation({
    onSuccess: () => invalidatePropertyAmenities(),
    onError: (err) => toast.error(err.message || "Could not add amenity"),
  })
  const removeProperty = trpc.amenities.property.remove.useMutation({
    onSuccess: () => invalidatePropertyAmenities(),
    onError: (err) => toast.error(err.message || "Could not remove amenity"),
  })
  const promoteProperty = trpc.amenities.catalog.promoteFromProperty.useMutation(
    {
      onSuccess: () =>
        invalidatePropertyAmenities().then(() =>
          toast.success("Saved to amenity catalog")
        ),
      onError: (err) => toast.error(err.message || "Could not save amenity"),
    }
  )

  // Unit-context mutations. Attaching a single catalog amenity uses the idempotent
  // `bulkAdd` (unit has no single `add`) so existing assignments survive (D-32).
  const attachUnit = trpc.amenities.unit.bulkAdd.useMutation({
    onSuccess: () => invalidateUnitAmenities(),
    onError: (err) => toast.error(err.message || "Could not add amenity"),
  })
  const addFreeformUnit = trpc.amenities.unit.addFreeform.useMutation({
    onSuccess: () => invalidateUnitAmenities(),
    onError: (err) => toast.error(err.message || "Could not add amenity"),
  })
  const removeUnit = trpc.amenities.unit.remove.useMutation({
    onSuccess: () => invalidateUnitAmenities(),
    onError: (err) => toast.error(err.message || "Could not remove amenity"),
  })
  const promoteUnit = trpc.amenities.catalog.promoteFromUnit.useMutation({
    onSuccess: () =>
      invalidateUnitAmenities().then(() =>
        toast.success("Saved to amenity catalog")
      ),
    onError: (err) => toast.error(err.message || "Could not save amenity"),
  })

  const attachedCatalogIds = useMemo(
    () =>
      new Set(
        items.map((i) => i.organizationAmenityId).filter(Boolean) as string[]
      ),
    [items]
  )

  // Scope filter (D-34, Pitfall 7): only amenities scoped to this target OR `both`
  // are attachable. The server re-enforces this, so the client filter is UX only.
  const scopedCatalog = catalog.filter(
    (row) => row.scope === target || row.scope === "both"
  )
  const matchingCatalog = scopedCatalog.filter(
    (row) =>
      !attachedCatalogIds.has(row.id) &&
      row.name.toLowerCase().includes(search.trim().toLowerCase())
  )
  const exactMatch = scopedCatalog.some(
    (row) => row.name.toLowerCase() === search.trim().toLowerCase()
  )

  function resetComposer() {
    setSearch("")
    setCreating(false)
    setNewIcon(AMENITY_ICON_KEYS[0])
    setNewColor(TAG_COLOR_KEYS[0])
  }

  function handleAttachCatalog(row: CatalogRow) {
    if (isLive) {
      if (target === "property" && propertyId) {
        attachProperty.mutate({ propertyId, organizationAmenityId: row.id })
      } else if (target === "unit" && unitId) {
        attachUnit.mutate({ unitIds: [unitId], organizationAmenityIds: [row.id] })
      }
    } else {
      props.onChange?.([
        ...items,
        {
          id: crypto.randomUUID(),
          organizationAmenityId: row.id,
          label: row.name,
          iconKey: row.iconKey,
          colorKey: row.colorKey,
        },
      ])
    }
    resetComposer()
  }

  function handleCreateFreeform() {
    const label = search.trim()
    if (!label) return
    if (isLive) {
      if (target === "property" && propertyId) {
        addFreeformProperty.mutate({
          propertyId,
          label,
          iconKey: newIcon,
          colorKey: newColor,
        })
      } else if (target === "unit" && unitId) {
        addFreeformUnit.mutate({
          unitId,
          label,
          iconKey: newIcon,
          colorKey: newColor,
        })
      }
    } else {
      props.onChange?.([
        ...items,
        {
          id: crypto.randomUUID(),
          organizationAmenityId: null,
          label,
          iconKey: newIcon,
          colorKey: newColor,
        },
      ])
    }
    resetComposer()
    setPopoverOpen(false)
  }

  function handleRemove(item: AmenityPickerItem) {
    if (isLive) {
      if (target === "property") {
        removeProperty.mutate({ propertyAmenityId: item.id })
      } else {
        removeUnit.mutate({ unitAmenityId: item.id })
      }
    } else {
      props.onChange?.(items.filter((i) => i.id !== item.id))
    }
  }

  function handlePromote(item: AmenityPickerItem) {
    if (target === "property") {
      promoteProperty.mutate({ propertyAmenityId: item.id })
    } else {
      promoteUnit.mutate({ unitAmenityId: item.id })
    }
  }

  const chips = (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5",
        !isInline &&
          cn(
            inputVariants({ variant, size }),
            // Chip field grows with rows; keep Input size as the minimum height.
            "h-auto min-h-9 px-2 py-1.5"
          ),
        className
      )}
    >
      {items.map((item) => (
        <DropdownMenu key={item.id}>
          <DropdownMenuTrigger asChild>
            <TagBadge
              variant={item.colorKey}
              icon={item.iconKey}
              className="cursor-pointer"
            >
              {item.label}
              {canWrite ? (
                <PlatformIcon
                  icon="IconChevronBottom"
                  size={12}
                  className="opacity-70"
                />
              ) : null}
            </TagBadge>
          </DropdownMenuTrigger>
          {canWrite ? (
            <DropdownMenuContent align="start">
              {/* Promote is only meaningful for a live, persisted freeform assignment. */}
              {isLive && !item.organizationAmenityId ? (
                <DropdownMenuItem onSelect={() => handlePromote(item)}>
                  <PlatformIcon icon="IconStar" size={16} />
                  Save to amenity catalog
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => handleRemove(item)}
              >
                <PlatformIcon icon="IconCrossLarge" size={16} />
                Remove amenity
              </DropdownMenuItem>
            </DropdownMenuContent>
          ) : null}
        </DropdownMenu>
      ))}

      {canWrite ? (
        <Popover
          open={popoverOpen}
          onOpenChange={(open) => {
            setPopoverOpen(open)
            if (!open) resetComposer()
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex h-6 items-center gap-1 rounded-full px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <PlatformIcon icon="IconPlusSmall" size={14} />
              Add amenity
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-64"
            sideOffset={14}
            alignOffset={-8}
          >
            <div className="flex flex-col gap-3">
              <Input
                autoFocus
                placeholder="Search or create an amenity…"
                value={search}
                size="sm"
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && search.trim() && !exactMatch) {
                    e.preventDefault()
                    setCreating(true)
                  }
                }}
              />

              {creating ? (
                <div className="flex items-center gap-2">
                  <AmenityIconColorPicker
                    iconKey={newIcon}
                    colorKey={newColor}
                    size="sm"
                    onChange={({ iconKey, colorKey }) => {
                      setNewIcon(iconKey)
                      setNewColor(colorKey)
                    }}
                  />
                  <span className="flex-1 truncate text-sm">{search.trim()}</span>
                  <Button type="button" size="sm" onClick={handleCreateFreeform}>
                    Create
                  </Button>
                </div>
              ) : (
                <div className="flex max-h-48 flex-col gap-0.5 overflow-y-auto">
                  {matchingCatalog.length === 0 ? (
                    <p className="px-1 py-2 text-center text-xs text-muted-foreground">
                      No matching amenities.
                    </p>
                  ) : (
                    matchingCatalog.map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => handleAttachCatalog(row)}
                        className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-accent"
                      >
                        {isPlatformIconName(row.iconKey) ? (
                          <PlatformIcon icon={row.iconKey} size={14} />
                        ) : null}
                        {row.name}
                      </button>
                    ))
                  )}
                  {search.trim() && !exactMatch ? (
                    <button
                      type="button"
                      onClick={() => setCreating(true)}
                      className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    >
                      <PlatformIcon icon="IconPlusSmall" size={14} />
                      Create &ldquo;{search.trim()}&rdquo;
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  )

  if (isInline) {
    return chips
  }

  return (
    <Field>
      <FieldLabel>Amenities</FieldLabel>

      {chips}

      {!canWrite ? (
        <FieldDescription>
          You need write access to manage amenities.
        </FieldDescription>
      ) : null}
    </Field>
  )
}
