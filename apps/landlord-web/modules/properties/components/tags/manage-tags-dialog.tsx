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
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  PlatformIcon,
  ScrollArea,
} from "@villuh/ui"
import { invalidateQueries, trpc } from "@villuh/api"
import { useUser } from "@/modules/app/providers/me-provider"
import { TagBadge, toTagBadgeVariant } from "@villuh/ui"
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
 * — the confirm copy below spells that out before the destructive call fires.
 */
export function ManageTagsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { user } = useUser()
  const canWrite = user.org.permissions.write
  const utils = trpc.useUtils()
  const { data } = trpc.tags.listOrganizationTags.useQuery(undefined, {
    enabled: open,
  })
  const tags = data?.tags ?? []

  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    name: string
  } | null>(null)
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContainer className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage tags</DialogTitle>
            <DialogDescription>
              Organization-wide tags available to attach to any property.
            </DialogDescription>
          </DialogHeader>

          <DialogContent>
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
              <div className="flex flex-wrap gap-2">
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
                        className="h-auto w-fit max-w-full gap-1 py-0.5 pr-1 pl-0.5"
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
                          className="field-sizing-content max-w-40 min-w-[6ch] bg-transparent px-0.5 text-xs font-medium outline-none disabled:cursor-default"
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
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            className="shrink-0 text-current opacity-70 hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/10"
                            onClick={() =>
                              setDeleteTarget({ id: tag.id, name: tag.name })
                            }
                          >
                            <PlatformIcon icon="IconCrossLarge" size={12} />
                            <span className="sr-only">Delete tag</span>
                          </Button>
                        ) : null}
                      </TagBadge>
                    )
                  })
                )}
              </div>
            </ScrollArea>
          </DialogContent>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContainer>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(next) => !next && setDeleteTarget(null)}
      >
        <DialogContainer>
          <DialogHeader>
            <DialogTitle>
              Delete tag &ldquo;{deleteTarget?.name}&rdquo;?
            </DialogTitle>
            <DialogDescription>
              This removes the tag from your organization and detaches it from
              every property that uses it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Keep tag
            </Button>
            <Button
              variant="destructive"
              disabled={deleteTag.isPending}
              onClick={() => {
                if (!deleteTarget) return
                deleteTag.mutate(
                  { organizationTagId: deleteTarget.id },
                  { onSettled: () => setDeleteTarget(null) }
                )
              }}
            >
              Delete tag
            </Button>
          </DialogFooter>
        </DialogContainer>
      </Dialog>
    </>
  )
}
