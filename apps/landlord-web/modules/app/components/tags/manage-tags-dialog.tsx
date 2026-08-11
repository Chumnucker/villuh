"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  PlatformIcon,
  ScrollArea,
} from "@villuh/ui"
import { invalidateQueries, trpc } from "@villuh/api"
import { useUser } from "@/modules/app/providers/me-provider"
import { TagIconColorPicker } from "./tag-icon-color-picker"
import { DEFAULT_TAG_COLOR_KEY, DEFAULT_TAG_ICON_KEY, type TagColorKey, type TagIconKey } from "./tag-palette"

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
  const { data } = trpc.tags.listOrganizationTags.useQuery(undefined, { enabled: open })
  const tags = data?.tags ?? []

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [newName, setNewName] = useState("")
  const [newIcon, setNewIcon] = useState<TagIconKey>(DEFAULT_TAG_ICON_KEY)
  const [newColor, setNewColor] = useState<TagColorKey>(DEFAULT_TAG_COLOR_KEY)

  const updateTag = trpc.tags.updateOrganizationTag.useMutation({
    onSuccess: () =>
      invalidateQueries(utils, [(u) => u.tags.listOrganizationTags, (u) => u.tags.listPropertyTags]),
    onError: (err) => toast.error(err.message || "Could not update tag"),
  })

  const deleteTag = trpc.tags.deleteOrganizationTag.useMutation({
    onSuccess: () =>
      invalidateQueries(utils, [(u) => u.tags.listOrganizationTags, (u) => u.tags.listPropertyTags]).then(
        () => toast.success("Tag deleted")
      ),
    onError: (err) => toast.error(err.message || "Could not delete tag"),
  })

  const createTag = trpc.tags.createOrganizationTag.useMutation({
    onSuccess: () =>
      invalidateQueries(utils, [(u) => u.tags.listOrganizationTags]).then(() => {
        setNewName("")
        setNewIcon(DEFAULT_TAG_ICON_KEY)
        setNewColor(DEFAULT_TAG_COLOR_KEY)
      }),
    onError: (err) => toast.error(err.message || "Could not create tag"),
  })

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage tags</DialogTitle>
            <DialogDescription>
              Organization-wide tags available to attach to any property.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-72">
            <div className="flex flex-col gap-2 pr-3">
              {tags.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No organization tags yet.
                </p>
              ) : (
                tags.map((tag) => (
                  <div key={tag.id} className="flex items-center gap-2 rounded-2xl border border-border p-2">
                    <TagIconColorPicker
                      iconKey={tag.iconKey as TagIconKey}
                      colorKey={tag.colorKey as TagColorKey}
                      disabled={!canWrite}
                      onChange={({ iconKey, colorKey }) =>
                        updateTag.mutate({ organizationTagId: tag.id, iconKey, colorKey })
                      }
                    />
                    <Input
                      defaultValue={tag.name}
                      disabled={!canWrite}
                      className="h-9"
                      onBlur={(e) => {
                        const name = e.target.value.trim()
                        if (name && name !== tag.name) {
                          updateTag.mutate({ organizationTagId: tag.id, name })
                        }
                      }}
                    />
                    {canWrite ? (
                      <Button
                        type="button"
                        variant="ghost-destructive"
                        size="icon-sm"
                        onClick={() => setDeleteTarget({ id: tag.id, name: tag.name })}
                      >
                        <PlatformIcon icon="IconTrashCan" size={16} />
                        <span className="sr-only">Delete tag</span>
                      </Button>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {canWrite ? (
            <div className="flex items-center gap-2 border-t border-border pt-4">
              <TagIconColorPicker
                iconKey={newIcon}
                colorKey={newColor}
                onChange={({ iconKey, colorKey }) => {
                  setNewIcon(iconKey)
                  setNewColor(colorKey)
                }}
              />
              <Input
                placeholder="New tag name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-9"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newName.trim()) {
                    e.preventDefault()
                    createTag.mutate({ name: newName.trim(), iconKey: newIcon, colorKey: newColor })
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                disabled={!newName.trim() || createTag.isPending}
                onClick={() => createTag.mutate({ name: newName.trim(), iconKey: newIcon, colorKey: newColor })}
              >
                Add
              </Button>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete tag &ldquo;{deleteTarget?.name}&rdquo;?</DialogTitle>
            <DialogDescription>
              This removes the tag from your organization and detaches it from every property that
              uses it.
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
        </DialogContent>
      </Dialog>
    </>
  )
}
