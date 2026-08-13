"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  defaultDropAnimationSideEffects,
  type DragEndEvent,
  type DragStartEvent,
  type DropAnimation,
} from "@dnd-kit/core"
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS as DndCss } from "@dnd-kit/utilities"
import {
  Badge,
  Button,
  Field,
  FieldDescription,
  FieldLabel,
  PlatformIcon,
  cn,
} from "@villuh/ui"
import {
  ALLOWED_IMAGE_CONTENT_TYPES,
  MAX_GALLERY_IMAGES,
  acceptImageFiles,
} from "@villuh/ui/utils"
import {
  type StagedGalleryItem,
  stagedItemPreviewUrl,
} from "@/modules/properties/lib/staged-gallery"

const dropAnimation: DropAnimation = {
  duration: 200,
  easing: "cubic-bezier(0.25, 1, 0.5, 1)",
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0.4" } },
  }),
}

function TileFace({
  url,
  isCover,
  className,
}: {
  url: string
  isCover: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "relative aspect-square w-full overflow-hidden rounded-2xl ring-1 ring-border",
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- blob or short-lived presigned URL */}
      <img
        src={url}
        alt=""
        className="size-full object-cover"
        draggable={false}
      />
      {isCover ? (
        <Badge className="absolute top-1.5 left-1.5 border-transparent bg-primary text-primary-foreground">
          Cover
        </Badge>
      ) : null}
    </div>
  )
}

function SortableTile({
  item,
  isCover,
  onRemove,
}: {
  item: StagedGalleryItem
  isCover: boolean
  onRemove: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.localId })

  return (
    <div
      ref={setNodeRef}
      data-gallery-tile-id={item.localId}
      style={{
        transform: DndCss.Translate.toString(transform),
        transition: isDragging ? undefined : transition,
      }}
      className={cn("group relative w-full", isDragging && "z-10 opacity-40")}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none active:cursor-grabbing"
      >
        <TileFace url={stagedItemPreviewUrl(item)} isCover={isCover} />
      </div>
      <Button
        type="button"
        size="icon-xs"
        variant="default"
        onClick={onRemove}
        aria-label="Remove photo"
        className="absolute -top-2 -right-2 z-20 rounded-full border-2 border-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      >
        <PlatformIcon icon="IconCrossLarge" size={14} strokeWidth={3} />
      </Button>
    </div>
  )
}

export type StagedGalleryFieldProps = {
  items: StagedGalleryItem[]
  onChange: (items: StagedGalleryItem[]) => void
  onRemoveExisting: (imageId: string) => void
  disabled?: boolean
}

/**
 * Local-only gallery editor for the property form. Files stay in memory until
 * save; existing removals are tracked by the parent for hard-delete on persist.
 */
export function StagedGalleryField({
  items,
  onChange,
  onRemoveExisting,
  disabled,
}: StagedGalleryFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeSize, setActiveSize] = useState<{
    width: number
    height: number
  } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const activeItem = activeId
    ? (items.find((item) => item.localId === activeId) ?? null)
    : null

  function addFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0 || disabled) return

    const { accepted, errors } = acceptImageFiles(Array.from(fileList), {
      remainingSlots: MAX_GALLERY_IMAGES - items.length,
    })
    for (const message of errors) toast.error(message)
    if (accepted.length === 0) return

    onChange([
      ...items,
      ...accepted.map(({ file, contentType }) => ({
        kind: "new" as const,
        localId: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        contentType,
      })),
    ])
  }

  function removeItem(localId: string) {
    const target = items.find((item) => item.localId === localId)
    if (!target) return
    if (target.kind === "existing") onRemoveExisting(target.id)
    else URL.revokeObjectURL(target.previewUrl)
    onChange(items.filter((item) => item.localId !== localId))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    setActiveSize(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((item) => item.localId === active.id)
    const newIndex = items.findIndex((item) => item.localId === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    onChange(arrayMove(items, oldIndex, newIndex))
  }

  const atCap = items.length >= MAX_GALLERY_IMAGES

  return (
    <Field className="col-span-full">
      <div className="flex items-center justify-between gap-3">
        <div>
          <FieldLabel>Photos</FieldLabel>
          <FieldDescription>
            First photo is the cover. Changes upload when you save.
          </FieldDescription>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || atCap}
          onClick={() => fileInputRef.current?.click()}
        >
          <PlatformIcon
            icon="IconCloudUpload"
            size={16}
            data-icon="inline-start"
          />
          Add photos
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_IMAGE_CONTENT_TYPES.join(",")}
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            addFiles(e.target.files)
            e.target.value = ""
          }}
        />
      </div>

      {items.length === 0 ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-border py-12 text-center transition-colors hover:bg-muted/40 disabled:pointer-events-none disabled:opacity-50"
        >
          <p className="text-sm font-medium text-foreground">No photos yet</p>
          <p className="text-sm text-muted-foreground">
            Drop in property photos — they upload when you save.
          </p>
        </button>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(event: DragStartEvent) => {
            const id = String(event.active.id)
            setActiveId(id)

            const fromRect = event.active.rect.current.initial
            if (fromRect?.width && fromRect?.height) {
              setActiveSize({ width: fromRect.width, height: fromRect.height })
              return
            }

            const el = document.querySelector(
              `[data-gallery-tile-id="${CSS.escape(id)}"]`
            )
            if (el instanceof HTMLElement) {
              const { width, height } = el.getBoundingClientRect()
              setActiveSize({ width, height })
            }
          }}
          onDragCancel={() => {
            setActiveId(null)
            setActiveSize(null)
          }}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((item) => item.localId)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-2 gap-3 p-2 sm:grid-cols-3 md:grid-cols-5">
              {items.map((item, index) => (
                <SortableTile
                  key={item.localId}
                  item={item}
                  isCover={index === 0}
                  onRemove={() => removeItem(item.localId)}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay dropAnimation={dropAnimation} style={{ zIndex: 60 }}>
            {activeItem ? (
              <div
                className="cursor-grabbing overflow-hidden rounded-2xl shadow-xl"
                style={
                  activeSize
                    ? {
                        width: activeSize.width,
                        height: activeSize.height,
                      }
                    : { width: 96, height: 96 }
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- blob or short-lived presigned URL */}
                <img
                  src={stagedItemPreviewUrl(activeItem)}
                  alt=""
                  className="size-full object-cover"
                  draggable={false}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </Field>
  )
}
