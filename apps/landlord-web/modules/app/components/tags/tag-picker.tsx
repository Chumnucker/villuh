"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  Badge,
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
  cn,
  type PlatformIconName,
} from "@villuh/ui"
import { invalidateQueries, trpc } from "@villuh/api"
import { useUser } from "@/modules/app/providers/me-provider"
import { ManageTagsDialog } from "./manage-tags-dialog"
import { TagIconColorPicker } from "./tag-icon-color-picker"
import {
  DEFAULT_TAG_COLOR_KEY,
  DEFAULT_TAG_ICON_KEY,
  TAG_BADGE_CLASSES,
  type TagColorKey,
  type TagIconKey,
} from "./tag-palette"

export type TagPickerTag = {
  id: string
  organizationTagId: string | null
  label: string
  iconKey: TagIconKey
  colorKey: TagColorKey
}

type OrganizationTagRow = { id: string; name: string; iconKey: string; colorKey: string }

function mapPropertyTagRow(row: {
  id: string
  organizationTagId: string | null
  label: string
  iconKey: string
  colorKey: string
}): TagPickerTag {
  return {
    id: row.id,
    organizationTagId: row.organizationTagId,
    label: row.label,
    iconKey: row.iconKey as TagIconKey,
    colorKey: row.colorKey as TagColorKey,
  }
}

/**
 * PROP-02 tag UX (D-17–D-21): fixed icon/color chips, freeform create, org catalog suggestions,
 * promote-to-catalog when `write`, and a "Manage tags…" entry into `ManageTagsDialog` (Screen 7).
 *
 * Two modes, one component (both required by the property form's create/edit split):
 * - **Live** (`propertyId` set — detail page, edit form): reads/writes real `tags.*` property-tag
 *   rows directly; every mutation invalidates and refetches — no local-only state.
 * - **Staged** (`propertyId` omitted — create form, before the property exists): `value`/`onChange`
 *   are the source of truth; `PropertyForm` persists the staged list via `tags.setPropertyTags` +
 *   `tags.addFreeform` right after `properties.create` succeeds and a real id exists.
 */
export function TagPicker(
  props:
    | { propertyId: string; value?: undefined; onChange?: undefined }
    | { propertyId?: undefined; value: TagPickerTag[]; onChange: (tags: TagPickerTag[]) => void }
) {
  const { propertyId } = props
  const isLive = !!propertyId
  const { user } = useUser()
  const canWrite = user.org.permissions.write
  const utils = trpc.useUtils()

  const [manageOpen, setManageOpen] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [creating, setCreating] = useState(false)
  const [newIcon, setNewIcon] = useState<TagIconKey>(DEFAULT_TAG_ICON_KEY)
  const [newColor, setNewColor] = useState<TagColorKey>(DEFAULT_TAG_COLOR_KEY)

  const { data: catalogData } = trpc.tags.listOrganizationTags.useQuery()
  const catalog: OrganizationTagRow[] = catalogData?.tags ?? []

  const { data: propertyTagsData } = trpc.tags.listPropertyTags.useQuery(
    { propertyId: propertyId ?? "" },
    { enabled: isLive }
  )

  const tags: TagPickerTag[] = useMemo(
    () => (isLive ? (propertyTagsData?.tags ?? []).map(mapPropertyTagRow) : (props.value ?? [])),
    [isLive, propertyTagsData, props.value]
  )

  const invalidatePropertyTags = () =>
    invalidateQueries(utils, [(u) => u.tags.listPropertyTags, (u) => u.tags.listOrganizationTags])

  const addFreeform = trpc.tags.addFreeform.useMutation({
    onSuccess: () => invalidatePropertyTags(),
    onError: (err) => toast.error(err.message || "Could not add tag"),
  })
  const attachTag = trpc.tags.attachOrganizationTag.useMutation({
    onSuccess: () => invalidatePropertyTags(),
    onError: (err) => toast.error(err.message || "Could not attach tag"),
  })
  const removeTag = trpc.tags.removePropertyTag.useMutation({
    onSuccess: () => invalidatePropertyTags(),
    onError: (err) => toast.error(err.message || "Could not remove tag"),
  })
  const promoteTag = trpc.tags.promoteFreeform.useMutation({
    onSuccess: () =>
      invalidatePropertyTags().then(() => toast.success("Saved to organization tags")),
    onError: (err) => toast.error(err.message || "Could not promote tag"),
  })

  const attachedOrgIds = useMemo(
    () => new Set(tags.map((t) => t.organizationTagId).filter(Boolean) as string[]),
    [tags]
  )

  const matchingCatalog = catalog.filter(
    (tag) =>
      !attachedOrgIds.has(tag.id) && tag.name.toLowerCase().includes(search.trim().toLowerCase())
  )
  const exactMatch = catalog.some((tag) => tag.name.toLowerCase() === search.trim().toLowerCase())

  function resetComposer() {
    setSearch("")
    setCreating(false)
    setNewIcon(DEFAULT_TAG_ICON_KEY)
    setNewColor(DEFAULT_TAG_COLOR_KEY)
  }

  function handleAttachCatalog(tag: OrganizationTagRow) {
    if (isLive && propertyId) {
      attachTag.mutate({ propertyId, organizationTagId: tag.id })
    } else {
      props.onChange?.([
        ...tags,
        {
          id: crypto.randomUUID(),
          organizationTagId: tag.id,
          label: tag.name,
          iconKey: tag.iconKey as TagIconKey,
          colorKey: tag.colorKey as TagColorKey,
        },
      ])
    }
    resetComposer()
  }

  function handleCreateFreeform() {
    const label = search.trim()
    if (!label) return
    if (isLive && propertyId) {
      addFreeform.mutate({ propertyId, label, iconKey: newIcon, colorKey: newColor })
    } else {
      props.onChange?.([
        ...tags,
        { id: crypto.randomUUID(), organizationTagId: null, label, iconKey: newIcon, colorKey: newColor },
      ])
    }
    resetComposer()
    setPopoverOpen(false)
  }

  function handleRemove(tag: TagPickerTag) {
    if (isLive) {
      removeTag.mutate({ propertyTagId: tag.id })
    } else {
      props.onChange?.(tags.filter((t) => t.id !== tag.id))
    }
  }

  function handlePromote(tag: TagPickerTag) {
    promoteTag.mutate({ propertyTagId: tag.id })
  }

  return (
    <Field>
      <div className="flex items-center justify-between">
        <FieldLabel>Tags</FieldLabel>
        <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => setManageOpen(true)}>
          Manage tags…
        </Button>
      </div>

      <div
        className={cn(
          "flex min-h-9 flex-wrap items-center gap-1.5 rounded-3xl border border-input/30 bg-input/50 bg-clip-padding px-3 py-1.5"
        )}
      >
        {tags.map((tag) => (
          <DropdownMenu key={tag.id}>
            <DropdownMenuTrigger asChild>
              <button type="button" disabled={!canWrite}>
                <Badge className={cn("cursor-pointer border-transparent", TAG_BADGE_CLASSES[tag.colorKey])}>
                  <PlatformIcon icon={tag.iconKey as PlatformIconName} size={12} data-icon="inline-start" />
                  {tag.label}
                  {canWrite ? <PlatformIcon icon="IconChevronBottom" size={12} className="ml-1 opacity-70" /> : null}
                </Badge>
              </button>
            </DropdownMenuTrigger>
            {canWrite ? (
              <DropdownMenuContent align="start">
                {/* D-18: promote is only meaningful for a live, persisted freeform property_tag. */}
                {isLive && !tag.organizationTagId ? (
                  <DropdownMenuItem onSelect={() => handlePromote(tag)}>
                    <PlatformIcon icon="IconStar" size={16} />
                    Save to organization tags
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem variant="destructive" onSelect={() => handleRemove(tag)}>
                  <PlatformIcon icon="IconCrossLarge" size={16} />
                  Remove tag
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
                Add tag
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72">
              <div className="flex flex-col gap-3">
                <Input
                  autoFocus
                  placeholder="Search or create a tag…"
                  value={search}
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
                    <TagIconColorPicker
                      iconKey={newIcon}
                      colorKey={newColor}
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
                        No matching organization tags.
                      </p>
                    ) : (
                      matchingCatalog.map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleAttachCatalog(tag)}
                          className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-accent"
                        >
                          <PlatformIcon icon={tag.iconKey as PlatformIconName} size={14} />
                          {tag.name}
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

      {!canWrite ? <FieldDescription>You need write access to manage tags.</FieldDescription> : null}

      <ManageTagsDialog open={manageOpen} onOpenChange={setManageOpen} />
    </Field>
  )
}
