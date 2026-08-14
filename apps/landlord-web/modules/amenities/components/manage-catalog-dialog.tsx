"use client"

import { useMemo, useState } from "react"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  PlatformIcon,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TagBadge,
  toTagBadgeVariant,
  type FlagOverlayHandle,
} from "@villuh/ui"
import { invalidateQueries, trpc } from "@villuh/api"
import {
  AMENITY_SCOPES,
  type AmenityScope,
} from "@villuh/server/schemas/amenities"
import type { inferRouterOutputs } from "@trpc/server"
import type { AppRouter } from "@villuh/server/router"
import { useUser } from "@/modules/app/providers/me-provider"
import {
  AMENITY_ICON_KEYS,
  TAG_COLOR_KEYS,
  type AmenityIconKey,
  type TagColorKey,
} from "../lib/amenity-icons"
import { AmenityIconColorPicker } from "./amenity-icon-color-picker"

type CatalogRow =
  inferRouterOutputs<AppRouter>["amenities"]["catalog"]["list"]["amenities"][number]

const SCOPE_LABELS: Record<AmenityScope, string> = {
  property: "Property amenities",
  unit: "Unit amenities",
  both: "Property & unit",
}

/**
 * Org amenity catalog. Create / rename / re-icon / **archive** / **restore**
 * grouped by scope. Archive is soft (D-10) — never delete — and `is_system`
 * rows are freely archivable (D-18). Every mutation invalidates `catalog.list`
 * + `property.list` + `unit.list`, because catalog rename propagation
 * denormalizes onto existing assignments server-side (D-38). Open/closed lives
 * in the URL (`?amenity.catalog=open`), mounted once app-wide by
 * `<AppOverlays>`.
 */
export function ManageAmenityCatalogDialog({
  overlay,
}: {
  overlay: FlagOverlayHandle
}) {
  const { user } = useUser()
  const canWrite = user.org.permissions.write
  const utils = trpc.useUtils()

  const { data, isLoading } = trpc.amenities.catalog.list.useQuery(undefined, {
    enabled: overlay.isOpen,
  })
  const amenities: CatalogRow[] = useMemo(
    () => data?.amenities ?? [],
    [data]
  )

  // `catalog.list` returns only active (non-archived) rows, so an archived row
  // vanishes from the list on refetch. Keep the ones archived this session so
  // Restore stays reachable right after archiving (D-10).
  const [recentlyArchived, setRecentlyArchived] = useState<CatalogRow[]>([])

  const [newName, setNewName] = useState("")
  const [newScope, setNewScope] = useState<AmenityScope>("property")
  const [newIcon, setNewIcon] = useState<AmenityIconKey>(AMENITY_ICON_KEYS[0])
  const [newColor, setNewColor] = useState<TagColorKey>(TAG_COLOR_KEYS[0])

  // Rename propagation denormalizes onto property_amenity + unit_amenity rows
  // server-side, so both assignment lists go stale on every catalog write (D-38).
  const invalidateCatalog = () =>
    invalidateQueries(utils, [
      (u) => u.amenities.catalog.list,
      (u) => u.amenities.property.list,
      (u) => u.amenities.unit.list,
    ])

  const createAmenity = trpc.amenities.catalog.create.useMutation({
    onSuccess: () =>
      invalidateCatalog().then(() => {
        setNewName("")
        setNewIcon(AMENITY_ICON_KEYS[0])
        setNewColor(TAG_COLOR_KEYS[0])
      }),
    onError: (err) => toast.error(err.message || "Could not create amenity"),
  })

  const updateAmenity = trpc.amenities.catalog.update.useMutation({
    onSuccess: () => invalidateCatalog(),
    onError: (err) => toast.error(err.message || "Could not update amenity"),
  })

  const archiveAmenity = trpc.amenities.catalog.archive.useMutation({
    onSuccess: () => invalidateCatalog().then(() => toast.success("Amenity archived")),
    onError: (err) => toast.error(err.message || "Could not archive amenity"),
  })

  const restoreAmenity = trpc.amenities.catalog.restore.useMutation({
    onSuccess: () => invalidateCatalog().then(() => toast.success("Amenity restored")),
    onError: (err) => toast.error(err.message || "Could not restore amenity"),
  })

  function submitNewAmenity() {
    const name = newName.trim()
    if (!name || createAmenity.isPending) return
    createAmenity.mutate({
      name,
      scope: newScope,
      iconKey: newIcon,
      colorKey: newColor,
    })
  }

  function handleArchive(row: CatalogRow) {
    setRecentlyArchived((prev) =>
      prev.some((r) => r.id === row.id) ? prev : [...prev, row]
    )
    archiveAmenity.mutate({ organizationAmenityId: row.id })
  }

  function handleRestore(row: CatalogRow) {
    setRecentlyArchived((prev) => prev.filter((r) => r.id !== row.id))
    restoreAmenity.mutate({ organizationAmenityId: row.id })
  }

  const grouped = useMemo(() => {
    const activeIds = new Set(amenities.map((row) => row.id))
    // A row that reappears in the active list (e.g. restored) leaves the
    // recently-archived bucket.
    return {
      byScope: AMENITY_SCOPES.map((scope) => ({
        scope,
        rows: amenities.filter((row) => row.scope === scope),
      })).filter((group) => group.rows.length > 0),
      archived: recentlyArchived.filter((row) => !activeIds.has(row.id)),
    }
  }, [amenities, recentlyArchived])

  return (
    <Dialog {...overlay.dialogProps}>
      <DialogContainer className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Amenity catalog</DialogTitle>
        </DialogHeader>

        <DialogContent>
          <DialogDescription>
            Your organization&rsquo;s reusable amenities, shared across every
            property and unit. Renaming one updates it everywhere it&rsquo;s
            used.
          </DialogDescription>

          {canWrite ? (
            <div className="flex items-center gap-2">
              <Select
                value={newScope}
                onValueChange={(value) => setNewScope(value as AmenityScope)}
              >
                <SelectTrigger className="w-40 shrink-0" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AMENITY_SCOPES.map((scope) => (
                    <SelectItem key={scope} value={scope}>
                      {SCOPE_LABELS[scope]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  placeholder="New amenity name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      submitNewAmenity()
                    }
                  }}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    type="button"
                    size="sm"
                    disabled={!newName.trim() || createAmenity.isPending}
                    onClick={submitNewAmenity}
                  >
                    Add
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </div>
          ) : null}

          <ScrollArea className="max-h-96">
            <div className="flex flex-col gap-4 rounded-3xl bg-input p-2.5">
              {isLoading ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-8 animate-pulse rounded-2xl bg-muted" />
                  ))}
                </div>
              ) : grouped.byScope.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No amenities in your catalog yet.
                </p>
              ) : (
                grouped.byScope.map((group) => (
                  <div key={group.scope} className="flex flex-col gap-2">
                    <p className="px-1 text-xs font-medium text-muted-foreground">
                      {SCOPE_LABELS[group.scope]}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {group.rows.map((row) => (
                        <CatalogEntry
                          key={row.id}
                          row={row}
                          canWrite={canWrite}
                          isPending={archiveAmenity.isPending}
                          onRename={(name) =>
                            updateAmenity.mutate({
                              organizationAmenityId: row.id,
                              name,
                            })
                          }
                          onRecolor={({ iconKey, colorKey }) =>
                            updateAmenity.mutate({
                              organizationAmenityId: row.id,
                              iconKey,
                              colorKey,
                            })
                          }
                          onArchive={() => handleArchive(row)}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}

              {grouped.archived.length > 0 ? (
                <div className="flex flex-col gap-2 border-t border-border pt-3">
                  <p className="px-1 text-xs font-medium text-muted-foreground">
                    Recently archived
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {grouped.archived.map((row) => (
                      <TagBadge
                        key={row.id}
                        variant={toTagBadgeVariant(row.colorKey)}
                        icon={row.iconKey}
                        className="h-auto gap-1 rounded-2xl py-0.5 pr-1 pl-2 opacity-70"
                      >
                        <span className="text-xs line-through">{row.name}</span>
                        {canWrite ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            className="h-6 px-1.5 text-current hover:bg-black/10 dark:hover:bg-white/10"
                            disabled={restoreAmenity.isPending}
                            onClick={() => handleRestore(row)}
                          >
                            Restore
                          </Button>
                        ) : null}
                      </TagBadge>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </ScrollArea>
        </DialogContent>

        <DialogFooter>
          <Button variant="outline" onClick={() => overlay.close()}>
            Close
          </Button>
        </DialogFooter>
      </DialogContainer>
    </Dialog>
  )
}

function CatalogEntry({
  row,
  canWrite,
  isPending,
  onRename,
  onRecolor,
  onArchive,
}: {
  row: CatalogRow
  canWrite: boolean
  isPending: boolean
  onRename: (name: string) => void
  onRecolor: (next: { iconKey: AmenityIconKey; colorKey: TagColorKey }) => void
  onArchive: () => void
}) {
  return (
    <TagBadge
      variant={toTagBadgeVariant(row.colorKey)}
      className="h-auto w-fit max-w-full gap-1 rounded-2xl py-0.5 pr-1 pl-0.5"
    >
      <AmenityIconColorPicker
        size="sm"
        iconKey={row.iconKey as AmenityIconKey}
        colorKey={row.colorKey as TagColorKey}
        disabled={!canWrite}
        onChange={onRecolor}
      />
      <input
        defaultValue={row.name}
        disabled={!canWrite}
        aria-label={`Rename ${row.name}`}
        size={Math.max(row.name.length, 6)}
        className="field-sizing-content max-w-48 min-w-[6ch] bg-transparent text-xs font-medium outline-none disabled:cursor-default"
        onBlur={(e) => {
          const name = e.target.value.trim()
          if (name && name !== row.name) {
            onRename(name)
          } else {
            e.target.value = row.name
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            ;(e.target as HTMLInputElement).blur()
          }
          if (e.key === "Escape") {
            e.preventDefault()
            ;(e.currentTarget as HTMLInputElement).value = row.name
            ;(e.target as HTMLInputElement).blur()
          }
        }}
      />
      {canWrite ? (
        <ArchiveAmenityMenu
          amenityName={row.name}
          isPending={isPending}
          onArchive={onArchive}
        />
      ) : null}
    </TagBadge>
  )
}

function ArchiveAmenityMenu({
  amenityName,
  isPending,
  onArchive,
}: {
  amenityName: string
  isPending: boolean
  onArchive: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="shrink-0 text-current opacity-70 hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/10"
        >
          <PlatformIcon icon="IconArchive" size={12} />
          <span className="sr-only">Archive {amenityName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        alignOffset={-4}
        sideOffset={10}
        className="w-64 p-3"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <p className="text-sm font-medium">Archive &ldquo;{amenityName}&rdquo;?</p>
        <p className="mt-2 text-xs text-muted-foreground">
          It stops appearing in amenity pickers. Properties and units already
          using it keep it — nothing is removed.
        </p>
        <div className="mt-3 flex justify-end gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="xs"
            disabled={isPending}
            onClick={() => {
              onArchive()
              setOpen(false)
            }}
          >
            Archive
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
