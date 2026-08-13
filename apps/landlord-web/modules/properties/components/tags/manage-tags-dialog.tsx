"use client"

import { useState } from "react"
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
  TagBadge,
  toTagBadgeVariant,
  type OverlayHandle,
} from "@villuh/ui"
import { invalidateQueries, trpc } from "@villuh/api"
import { useUser } from "@/modules/app/providers/me-provider"
import { TagIconColorPicker } from "./tag-icon-color-picker"
import {
  TAG_COLOR_KEYS,
  TAG_ICON_KEYS,
  type TagColorKey,
  type TagIconKey,
} from "@villuh/server/schemas/tags"

/**
 * Screen 7 org tag catalog (D-18–D-20). List/edit/delete requires `write`; viewers see a
 * read-only list. Delete cascades every `property_tag` referencing the catalog row (server-side)
 * — the confirm copy in the delete dropdown spells that out before the destructive call fires.
 *
 * Overlay-driven (D-06, D-09): open/closed lives in the URL (`?property.tags=1`),
 * mounted once app-wide by `<AppOverlays>`.
 */
export function ManageTagsDialog({ overlay }: { overlay: OverlayHandle }) {
  // D-34: this useUser() call is the concrete reason <AppOverlays> must be
  // mounted inside <UserProvider> — moving the mount above the provider breaks
  // this dialog at runtime, not at compile time.
  const { user } = useUser()
  const canWrite = user.org.permissions.write
  const utils = trpc.useUtils()
  const { data } = trpc.tags.listOrganizationTags.useQuery(undefined, {
    enabled: overlay.isOpen,
  })
  const tags = data?.tags ?? []

  const [newName, setNewName] = useState("")
  const [newIcon, setNewIcon] = useState<TagIconKey>(TAG_ICON_KEYS[0])
  const [newColor, setNewColor] = useState<TagColorKey>(TAG_COLOR_KEYS[0])

  const updateTag = trpc.tags.updateOrganizationTag.useMutation({
    onSuccess: () =>
      invalidateQueries(utils, [
        (u) => u.tags.listOrganizationTags,
        (u) => u.tags.listPropertyTags,
      ]),
    onError: (err) => toast.error(err.message || "Could not update tag"),
  })

  const deleteTag = trpc.tags.deleteOrganizationTag.useMutation({
    onSuccess: () =>
      invalidateQueries(utils, [
        (u) => u.tags.listOrganizationTags,
        (u) => u.tags.listPropertyTags,
      ]).then(() => toast.success("Tag deleted")),
    onError: (err) => toast.error(err.message || "Could not delete tag"),
  })

  const createTag = trpc.tags.createOrganizationTag.useMutation({
    onSuccess: () =>
      invalidateQueries(utils, [(u) => u.tags.listOrganizationTags]).then(
        () => {
          setNewName("")
          setNewIcon(TAG_ICON_KEYS[0])
          setNewColor(TAG_COLOR_KEYS[0])
        }
      ),
    onError: (err) => toast.error(err.message || "Could not create tag"),
  })

  function submitNewTag() {
    const name = newName.trim()
    if (!name || createTag.isPending) return
    createTag.mutate({ name, iconKey: newIcon, colorKey: newColor })
  }

  return (
    <Dialog {...overlay.dialogProps}>
      <DialogContainer className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Tags</DialogTitle>
        </DialogHeader>

        <DialogContent>
          <DialogDescription>
            Organization-wide tags available to attach to any property:
          </DialogDescription>

          {canWrite ? (
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <TagIconColorPicker
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
                placeholder="New tag name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    submitNewTag()
                  }
                }}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  type="button"
                  size="sm"
                  disabled={!newName.trim() || createTag.isPending}
                  onClick={submitNewTag}
                >
                  Add
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          ) : null}

          <ScrollArea className="max-h-72">
            <div className="flex flex-wrap gap-2 rounded-3xl bg-input p-2.5">
              {tags.length === 0 ? (
                <p className="w-full py-6 text-center text-sm text-muted-foreground">
                  No organization tags yet.
                </p>
              ) : (
                tags.map((tag) => {
                  const colorKey = tag.colorKey as TagColorKey
                  const iconKey = tag.iconKey as TagIconKey
                  return (
                    <TagBadge
                      key={tag.id}
                      variant={toTagBadgeVariant(colorKey)}
                      className="h-auto w-fit max-w-full gap-1 rounded-2xl py-0.5 pr-1 pl-0.5"
                    >
                      <TagIconColorPicker
                        size="sm"
                        iconKey={iconKey}
                        colorKey={colorKey}
                        disabled={!canWrite}
                        onChange={({
                          iconKey: nextIcon,
                          colorKey: nextColor,
                        }) =>
                          updateTag.mutate({
                            organizationTagId: tag.id,
                            iconKey: nextIcon,
                            colorKey: nextColor,
                          })
                        }
                      />
                      <input
                        defaultValue={tag.name}
                        disabled={!canWrite}
                        aria-label={`Rename ${tag.name}`}
                        size={Math.max(tag.name.length, 6)}
                        className="field-sizing-content max-w-40 min-w-[6ch] bg-transparent text-xs font-medium outline-none disabled:cursor-default"
                        onBlur={(e) => {
                          const name = e.target.value.trim()
                          if (name && name !== tag.name) {
                            updateTag.mutate({
                              organizationTagId: tag.id,
                              name,
                            })
                          } else {
                            e.target.value = tag.name
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            ;(e.target as HTMLInputElement).blur()
                          }
                        }}
                      />
                      {canWrite ? (
                        <DeleteTagMenu
                          tagName={tag.name}
                          isPending={deleteTag.isPending}
                          onDelete={() =>
                            deleteTag.mutate({ organizationTagId: tag.id })
                          }
                        />
                      ) : null}
                    </TagBadge>
                  )
                })
              )}
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

function DeleteTagMenu({
  tagName,
  isPending,
  onDelete,
}: {
  tagName: string
  isPending: boolean
  onDelete: () => void
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
          <PlatformIcon icon="IconCrossLarge" size={12} />
          <span className="sr-only">Delete {tagName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        alignOffset={-4}
        sideOffset={10}
        className="w-64 p-3"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <p className="text-sm font-medium">Delete &ldquo;{tagName}&rdquo;?</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Removes it from your organization and detaches it from every property
          that uses it.
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
              onDelete()
              setOpen(false)
            }}
          >
            Delete
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
