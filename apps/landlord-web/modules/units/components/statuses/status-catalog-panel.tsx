"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  PlatformIcon,
  StatusBadge,
  cn,
} from "@villuh/ui"
import { invalidateQueries, trpc } from "@villuh/api"
import {
  TAG_COLOR_KEYS,
  TAG_ICON_KEYS,
  type TagColorKey,
  type TagIconKey,
} from "@villuh/server/schemas/tags"
import { useUser } from "@/modules/app/providers/me-provider"
import { TagIconColorPicker } from "@/modules/properties/components/tags/tag-icon-color-picker"

type UnitStatusRow = {
  id: string
  name: string
  iconKey: string
  colorKey: string
  sortOrder: number
  isSystem: boolean
}

function StatusRow({
  status,
  onRename,
  onRecolor,
  onArchive,
}: {
  status: UnitStatusRow
  onRename: (name: string) => void
  onRecolor: (next: { iconKey: TagIconKey; colorKey: TagColorKey }) => void
  onArchive: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: status.id,
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 rounded-2xl border border-border p-2",
        isDragging && "opacity-80"
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Reorder status"
        className="flex size-8 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
      >
        <PlatformIcon icon="IconReorder" size={16} />
      </button>
      <TagIconColorPicker
        iconKey={status.iconKey as TagIconKey}
        colorKey={status.colorKey as TagColorKey}
        onChange={onRecolor}
      />
      <Input
        defaultValue={status.name}
        className="h-9 flex-1"
        onBlur={(e) => {
          const name = e.target.value.trim()
          if (name && name !== status.name) onRename(name)
        }}
      />
      <StatusBadge status={status} />
      <Button
        type="button"
        variant="ghost-destructive"
        size="icon-sm"
        disabled={status.isSystem}
        title={status.isSystem ? "Default statuses cannot be archived" : "Archive status"}
        onClick={onArchive}
      >
        <PlatformIcon icon="IconArchive" size={16} />
        <span className="sr-only">Archive status</span>
      </Button>
    </div>
  )
}

/**
 * Screen 8 unit status catalog (UNIT-02, D-26/D-27): owner/admin only — create, rename, reorder,
 * and archive statuses via `unitStatuses.*` (server `permissionProcedure('admin')` is the real
 * backstop; this panel just hides mutate controls for non-admins, T-03-12). Seeded `is_system`
 * rows (Available/Occupied/Maintenance) can be renamed and recolored but never archived.
 */
export function StatusCatalogPanel() {
  const { user } = useUser()
  const isAdmin = user.org.permissions.admin
  const utils = trpc.useUtils()

  const { data, isLoading } = trpc.unitStatuses.list.useQuery()
  const statuses: UnitStatusRow[] = data?.statuses ?? []

  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState("")
  const [newIcon, setNewIcon] = useState<TagIconKey>(TAG_ICON_KEYS[0])
  const [newColor, setNewColor] = useState<TagColorKey>(TAG_COLOR_KEYS[0])

  const invalidateStatuses = () => invalidateQueries(utils, [(u) => u.unitStatuses.list])

  const createStatus = trpc.unitStatuses.create.useMutation({
    onSuccess: () =>
      invalidateStatuses().then(() => {
        setAdding(false)
        setNewName("")
        setNewIcon(TAG_ICON_KEYS[0])
        setNewColor(TAG_COLOR_KEYS[0])
      }),
    onError: (err) => toast.error(err.message || "Could not create status"),
  })
  const updateStatus = trpc.unitStatuses.update.useMutation({
    onSuccess: () => invalidateStatuses(),
    onError: (err) => toast.error(err.message || "Could not update status"),
  })
  const archiveStatus = trpc.unitStatuses.archive.useMutation({
    onSuccess: () => invalidateStatuses().then(() => toast.success("Status archived")),
    onError: (err) => toast.error(err.message || "Cannot archive a status that is still assigned to units"),
  })
  const reorderStatuses = trpc.unitStatuses.reorder.useMutation({
    onError: (err) => toast.error(err.message || "Could not reorder statuses"),
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = statuses.findIndex((s) => s.id === active.id)
    const newIndex = statuses.findIndex((s) => s.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(statuses, oldIndex, newIndex)
    try {
      await reorderStatuses.mutateAsync({ statusIds: reordered.map((s) => s.id) })
    } finally {
      await invalidateStatuses()
    }
  }

  if (!isAdmin) return null

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Unit statuses</CardTitle>
        <Button type="button" size="sm" variant="outline" onClick={() => setAdding((v) => !v)}>
          <PlatformIcon icon="IconPlusSmall" size={16} data-icon="inline-start" />
          Add status
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {adding ? (
          <div className="flex items-center gap-2 rounded-2xl border border-dashed border-border p-2">
            <TagIconColorPicker
              iconKey={newIcon}
              colorKey={newColor}
              onChange={({ iconKey, colorKey }) => {
                setNewIcon(iconKey)
                setNewColor(colorKey)
              }}
            />
            <Input
              autoFocus
              placeholder="Status name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="h-9 flex-1"
            />
            <Button
              type="button"
              size="sm"
              disabled={!newName.trim() || createStatus.isPending}
              onClick={() => createStatus.mutate({ name: newName.trim(), iconKey: newIcon, colorKey: newColor })}
            >
              Create
            </Button>
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={statuses.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2">
                {statuses.map((status) => (
                  <StatusRow
                    key={status.id}
                    status={status}
                    onRename={(name) => updateStatus.mutate({ statusId: status.id, name })}
                    onRecolor={({ iconKey, colorKey }) =>
                      updateStatus.mutate({ statusId: status.id, iconKey, colorKey })
                    }
                    onArchive={() => archiveStatus.mutate({ statusId: status.id })}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  )
}
