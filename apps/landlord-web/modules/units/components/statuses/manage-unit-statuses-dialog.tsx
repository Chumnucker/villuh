"use client"

import { useState } from "react"
import { useForm } from "@tanstack/react-form"
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
  Field,
  FieldError,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  PlatformIcon,
  ScrollArea,
  TagBadge,
  cn,
  toTagBadgeVariant,
} from "@villuh/ui"
import { invalidateQueries, trpc } from "@villuh/api"
import { createUnitStatusInputSchema } from "@villuh/server/schemas/unit-statuses"
import {
  TAG_COLOR_KEYS,
  TAG_ICON_KEYS,
  type TagColorKey,
  type TagIconKey,
} from "@villuh/server/schemas/tags"
import type { inferRouterOutputs } from "@trpc/server"
import type { AppRouter } from "@villuh/server/router"
import { useUser } from "@/modules/app/providers/me-provider"
import { TagIconColorPicker } from "@/modules/properties/components/tags/tag-icon-color-picker"

type UnitStatusRow =
  inferRouterOutputs<AppRouter>["unitStatuses"]["list"]["statuses"][number]

/**
 * Shared by the create form's `name` field validator and the inline rename so both
 * reject the same values: the server's own length rules plus the `(organization_id,
 * name)` uniqueness the API enforces with a constraint violation.
 */
function makeNameValidator(statuses: UnitStatusRow[], excludeId?: string) {
  return (value: string): string | undefined => {
    const parsed = createUnitStatusInputSchema.shape.name.safeParse(value)
    if (!parsed.success) return parsed.error.issues[0]?.message
    const taken = statuses.some(
      (status) =>
        status.id !== excludeId &&
        status.name.toLowerCase() === parsed.data.toLowerCase()
    )
    return taken ? "A status with that name already exists" : undefined
  }
}

/**
 * Screen 8 unit status catalog (UNIT-02, D-26/D-27) as an overlay rather than a settings
 * page — create, rename, recolor, reorder, and archive via `unitStatuses.*`. Server
 * `permissionProcedure('admin')` is the real backstop (T-03-12); non-admins get a
 * read-only list. Seeded `is_system` rows can be renamed and recolored but never archived.
 */
export function ManageUnitStatusesDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { user } = useUser()
  const canManage = user.org.permissions.admin
  const utils = trpc.useUtils()

  const { data, isLoading } = trpc.unitStatuses.list.useQuery(undefined, {
    enabled: open,
  })
  const statuses: UnitStatusRow[] = data?.statuses ?? []
  const validateNewName = makeNameValidator(statuses)

  // Unit queries join status name/icon/color server-side, so catalog edits
  // make them stale too — not just the catalog list itself.
  const invalidateStatuses = () =>
    invalidateQueries(utils, [
      (u) => u.unitStatuses.list,
      (u) => u.units.list,
      (u) => u.units.get,
    ])

  const createStatus = trpc.unitStatuses.create.useMutation({
    onSuccess: () => invalidateStatuses(),
    onError: (err) => toast.error(err.message || "Could not create status"),
  })
  const updateStatus = trpc.unitStatuses.update.useMutation({
    onSuccess: () => invalidateStatuses(),
    onError: (err) => toast.error(err.message || "Could not update status"),
  })
  const archiveStatus = trpc.unitStatuses.archive.useMutation({
    onSuccess: () =>
      invalidateStatuses().then(() => toast.success("Status archived")),
    onError: (err) =>
      toast.error(
        err.message || "Cannot archive a status that is still assigned to units"
      ),
  })
  const reorderStatuses = trpc.unitStatuses.reorder.useMutation({
    onError: (err) => toast.error(err.message || "Could not reorder statuses"),
    // The dropped row is written into the cache before the call so it doesn't
    // spring back to its old index — resync from the server either way.
    onSettled: () => invalidateStatuses(),
  })

  const form = useForm({
    defaultValues: {
      name: "",
      iconKey: TAG_ICON_KEYS[0] as TagIconKey,
      colorKey: TAG_COLOR_KEYS[0] as TagColorKey,
    },
    validators: { onSubmit: createUnitStatusInputSchema },
    onSubmit: async ({ value }) => {
      await createStatus.mutateAsync(createUnitStatusInputSchema.parse(value))
      form.reset()
    },
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = statuses.findIndex((s) => s.id === active.id)
    const newIndex = statuses.findIndex((s) => s.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(statuses, oldIndex, newIndex)
    utils.unitStatuses.list.setData(undefined, (previous) =>
      previous
        ? {
            ...previous,
            statuses: reordered.map((status, index) => ({
              ...status,
              sortOrder: index,
            })),
          }
        : previous
    )
    reorderStatuses.mutate({ statusIds: reordered.map((s) => s.id) })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContainer className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Unit statuses</DialogTitle>
        </DialogHeader>

        <DialogContent>
          <DialogDescription>
            {canManage
              ? "Availability statuses any unit can be assigned. Drag to set the order they appear in pickers and filters."
              : "Availability statuses any unit can be assigned. Only owners and admins can change them."}
          </DialogDescription>

          {canManage ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                e.stopPropagation()
                void form.handleSubmit()
              }}
            >
              <form.Field
                name="name"
                validators={{
                  onChange: ({ value }) => validateNewName(value),
                  onBlur: ({ value }) => validateNewName(value),
                }}
              >
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid

                  return (
                    <Field data-invalid={isInvalid || undefined}>
                      <InputGroup>
                        <InputGroupAddon align="inline-start">
                          <form.Subscribe
                            selector={(state) =>
                              [
                                state.values.iconKey,
                                state.values.colorKey,
                              ] as const
                            }
                          >
                            {([iconKey, colorKey]) => (
                              <TagIconColorPicker
                                size="sm"
                                iconKey={iconKey}
                                colorKey={colorKey}
                                onChange={(next) => {
                                  form.setFieldValue("iconKey", next.iconKey)
                                  form.setFieldValue("colorKey", next.colorKey)
                                }}
                              />
                            )}
                          </form.Subscribe>
                        </InputGroupAddon>
                        <InputGroupInput
                          id={field.name}
                          name={field.name}
                          placeholder="New status name"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid || undefined}
                        />
                        <InputGroupAddon align="inline-end">
                          <form.Subscribe
                            selector={(state) =>
                              [
                                state.canSubmit,
                                state.isSubmitting,
                                state.values.name,
                              ] as const
                            }
                          >
                            {([canSubmit, isSubmitting, name]) => (
                              <InputGroupButton
                                type="submit"
                                size="sm"
                                disabled={
                                  !canSubmit ||
                                  isSubmitting ||
                                  createStatus.isPending ||
                                  !name.trim()
                                }
                              >
                                Add
                              </InputGroupButton>
                            )}
                          </form.Subscribe>
                        </InputGroupAddon>
                      </InputGroup>
                      {isInvalid ? (
                        <FieldError
                          errors={field.state.meta.errors.map((err) =>
                            typeof err === "string"
                              ? { message: err }
                              : { message: err?.message }
                          )}
                        />
                      ) : null}
                    </Field>
                  )
                }}
              </form.Field>
            </form>
          ) : null}

          <ScrollArea className="max-h-72">
            <div className="flex flex-col gap-2 rounded-3xl bg-input p-2.5">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-8 animate-pulse rounded-2xl bg-muted"
                  />
                ))
              ) : statuses.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No unit statuses yet.
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={statuses.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {statuses.map((status) => (
                      <StatusRow
                        key={status.id}
                        status={status}
                        canManage={canManage}
                        validateName={makeNameValidator(statuses, status.id)}
                        isArchiving={archiveStatus.isPending}
                        onRename={(name) =>
                          updateStatus.mutate({ statusId: status.id, name })
                        }
                        onRecolor={({ iconKey, colorKey }) =>
                          updateStatus.mutate({
                            statusId: status.id,
                            iconKey,
                            colorKey,
                          })
                        }
                        onArchive={() =>
                          archiveStatus.mutate({ statusId: status.id })
                        }
                      />
                    ))}
                  </SortableContext>
                </DndContext>
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
  )
}

function StatusRow({
  status,
  canManage,
  validateName,
  isArchiving,
  onRename,
  onRecolor,
  onArchive,
}: {
  status: UnitStatusRow
  canManage: boolean
  validateName: (value: string) => string | undefined
  isArchiving: boolean
  onRename: (name: string) => void
  onRecolor: (next: { iconKey: TagIconKey; colorKey: TagColorKey }) => void
  onArchive: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: status.id, disabled: !canManage })

  function commitRename(input: HTMLInputElement) {
    const next = input.value.trim()
    if (next === status.name) {
      input.value = status.name
      return
    }
    const error = validateName(next)
    if (error) {
      toast.error(error)
      input.value = status.name
      return
    }
    onRename(next)
  }

  return (
    <TagBadge
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      variant={toTagBadgeVariant(status.colorKey)}
      className={cn(
        "h-auto w-full gap-1 rounded-2xl py-1 pr-1 pl-0.5",
        isDragging && "opacity-80"
      )}
    >
      {canManage ? (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${status.name}`}
          className="flex size-6 shrink-0 cursor-grab items-center justify-center rounded-xl opacity-60 hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/10"
        >
          <PlatformIcon icon="IconReorder" size={12} />
        </button>
      ) : null}

      <TagIconColorPicker
        size="sm"
        iconKey={status.iconKey}
        colorKey={status.colorKey}
        disabled={!canManage}
        onChange={onRecolor}
      />

      <input
        defaultValue={status.name}
        disabled={!canManage}
        aria-label={`Rename ${status.name}`}
        className="min-w-0 flex-1 bg-transparent text-xs font-medium outline-none disabled:cursor-default"
        onBlur={(e) => commitRename(e.target)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            e.currentTarget.blur()
          }
          if (e.key === "Escape") {
            e.preventDefault()
            e.currentTarget.value = status.name
            e.currentTarget.blur()
          }
        }}
      />

      {canManage ? (
        status.isSystem ? (
          <span
            title="Default statuses cannot be archived"
            className="flex size-6 shrink-0 items-center justify-center opacity-40"
          >
            <PlatformIcon icon="IconArchive" size={12} />
            <span className="sr-only">
              {status.name} is a default status and cannot be archived
            </span>
          </span>
        ) : (
          <ArchiveStatusMenu
            statusName={status.name}
            isPending={isArchiving}
            onArchive={onArchive}
          />
        )
      ) : null}
    </TagBadge>
  )
}

function ArchiveStatusMenu({
  statusName,
  isPending,
  onArchive,
}: {
  statusName: string
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
          <span className="sr-only">Archive {statusName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        alignOffset={-4}
        sideOffset={10}
        className="w-64 p-3"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <p className="text-sm font-medium">Archive &ldquo;{statusName}&rdquo;?</p>
        <p className="mt-2 text-xs text-muted-foreground">
          It stops appearing in status pickers and filters. Units still assigned
          to it have to be moved to another status first.
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
