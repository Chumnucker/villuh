"use client"

import { useMemo, useRef, useState } from "react"
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
  EmptyState,
  PlatformIcon,
  SkeletonBox,
  cn,
} from "@villuh/ui"
import {
  ALLOWED_IMAGE_CONTENT_TYPES,
  type AllowedImageContentType,
  acceptImageFiles,
} from "@villuh/ui/utils"

export type GalleryImage = { id: string; url: string }

/**
 * A validated, capped file ready to upload. `contentType` is narrowed to the
 * shared image allowlist by {@link acceptImageFiles}, so consumers can hand it
 * straight to a presign mutation without re-narrowing `file.type` (a bare
 * `string`).
 */
export type GalleryUploadFile = { file: File; contentType: AllowedImageContentType }

const dropAnimation: DropAnimation = {
  duration: 200,
  easing: "cubic-bezier(0.25, 1, 0.5, 1)",
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0.4" } },
  }),
}

function SortableTile({
  image,
  isCover,
  disabled,
  removing,
  onRemove,
}: {
  image: GalleryImage
  isCover: boolean
  disabled: boolean
  removing: boolean
  onRemove: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id, disabled })

  return (
    <div
      ref={setNodeRef}
      data-gallery-tile-id={image.id}
      style={{
        transform: DndCss.Translate.toString(transform),
        transition: isDragging ? undefined : transition,
      }}
      className={cn(
        "group relative w-full",
        isDragging && "z-10 opacity-40",
        removing && "pointer-events-none opacity-40"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className={cn(
          "relative aspect-square w-full overflow-hidden rounded-2xl ring-1 ring-border",
          disabled ? "cursor-default" : "cursor-grab active:cursor-grabbing",
          "touch-none"
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- presigned S3 URLs are short-lived and per-org; not worth Next/Image remote-pattern config. */}
        <img
          src={image.url}
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

      {disabled ? null : (
        <Button
          type="button"
          size="icon-xs"
          variant="default"
          onClick={onRemove}
          aria-label="Delete photo"
          className="absolute -top-2 -right-2 z-20 rounded-full border-2 border-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        >
          <PlatformIcon icon="IconCrossLarge" size={14} strokeWidth={3} />
        </Button>
      )}
    </div>
  )
}

/**
 * Reusable, presentational drag-to-reorder image gallery (D-31). Extracted from
 * `PropertyGalleryManager` so the property settings tab (cap 25) and the amenity
 * sheet (cap 10) share one implementation instead of a third copy.
 *
 * All IO is injected as callbacks — the component owns only the interaction
 * state (drag, optimistic order, pending-upload skeletons, per-tile removal) and
 * the shared upload UX (validation, capping, toasts). It has **no** knowledge of
 * which tRPC procedures back it, so it stays free of any property coupling.
 *
 * The `cap` is always passed explicitly and threaded into
 * {@link acceptImageFiles} as `remainingSlots` AND into the at-capacity message —
 * never the hard-coded 25 default (Pitfall 1), since amenity galleries cap at 10.
 */
export function GalleryManager({
  images: serverImages,
  isLoading,
  canWrite,
  cap,
  onUpload,
  onDelete,
  onReorder,
  addLabel = "Add photos",
  emptyTitle = "No photos yet",
  emptyDescription,
  className,
}: {
  images: GalleryImage[]
  isLoading: boolean
  canWrite: boolean
  /** Max images allowed — threaded to `acceptImageFiles` + the at-cap message. */
  cap: number
  /** Presign + PUT + persist the accepted files, then invalidate. Throws on failure. */
  onUpload: (files: GalleryUploadFile[]) => Promise<void>
  /** Delete one image server-side, then invalidate. Throws on failure. */
  onDelete: (imageId: string) => Promise<void>
  /** Persist the new cover-first order, then invalidate. Throws on failure. */
  onReorder: (orderedIds: string[]) => Promise<void>
  addLabel?: string
  emptyTitle?: string
  emptyDescription?: string
  className?: string
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [pendingUploads, setPendingUploads] = useState(0)
  const [removingIds, setRemovingIds] = useState<string[]>([])
  // Applied optimistically on drop so tiles don't snap back while the reorder
  // mutation and refetch are in flight; cleared once the server agrees.
  const [optimisticOrder, setOptimisticOrder] = useState<string[] | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const images = useMemo(() => {
    if (!optimisticOrder) return serverImages
    const byId = new Map(serverImages.map((image) => [image.id, image]))
    const ordered = optimisticOrder
      .map((id) => byId.get(id))
      .filter((image): image is GalleryImage => image !== undefined)
    const seen = new Set(ordered.map((image) => image.id))
    return [...ordered, ...serverImages.filter((image) => !seen.has(image.id))]
  }, [serverImages, optimisticOrder])

  async function uploadFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0 || !canWrite) return

    const { accepted, errors } = acceptImageFiles(Array.from(fileList), {
      remainingSlots: cap - images.length,
      // Pitfall 1: never fall back to the 25-photo default message — use `cap`.
      atCapMessage: `You've reached the limit of ${cap} photos. Remove one to add another.`,
    })
    for (const message of errors) toast.error(message)
    if (accepted.length === 0) return

    setPendingUploads(accepted.length)
    try {
      await onUpload(accepted)
      toast.success(
        accepted.length === 1 ? "Photo added" : `${accepted.length} photos added`
      )
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Some photos could not be uploaded"
      )
    } finally {
      setPendingUploads(0)
    }
  }

  async function deleteImage(imageId: string) {
    setRemovingIds((prev) => [...prev, imageId])
    try {
      await onDelete(imageId)
      setOptimisticOrder((prev) =>
        prev ? prev.filter((id) => id !== imageId) : prev
      )
      toast.success("Photo deleted")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete photo")
    } finally {
      setRemovingIds((prev) => prev.filter((id) => id !== imageId))
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = images.findIndex((image) => image.id === active.id)
    const newIndex = images.findIndex((image) => image.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const nextIds = arrayMove(images, oldIndex, newIndex).map(
      (image) => image.id
    )
    setOptimisticOrder(nextIds)

    try {
      await onReorder(nextIds)
      setOptimisticOrder(null)
    } catch (err) {
      setOptimisticOrder(null)
      toast.error(err instanceof Error ? err.message : "Could not reorder photos")
    }
  }

  const activeImage = activeId
    ? (images.find((image) => image.id === activeId) ?? null)
    : null
  const atCap = images.length + pendingUploads >= cap

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ALLOWED_IMAGE_CONTENT_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          void uploadFiles(e.target.files)
          e.target.value = ""
        }}
      />

      {canWrite && !isLoading && images.length > 0 ? (
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={atCap || pendingUploads > 0}
            onClick={() => fileInputRef.current?.click()}
          >
            <PlatformIcon
              icon="IconCloudUpload"
              size={16}
              data-icon="inline-start"
            />
            {addLabel}
          </Button>
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          <SkeletonBox className="aspect-square rounded-2xl" />
          <SkeletonBox className="aspect-square rounded-2xl" />
          <SkeletonBox className="aspect-square rounded-2xl" />
        </div>
      ) : images.length === 0 && pendingUploads === 0 ? (
        <EmptyState
          icon="IconCloudUpload"
          title={emptyTitle}
          description={
            emptyDescription ??
            (canWrite
              ? "Add photos — they upload immediately."
              : "No photos have been added yet.")
          }
          className="rounded-2xl border border-dashed border-border py-12"
          action={
            canWrite ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                {addLabel}
              </Button>
            ) : null
          }
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(event: DragStartEvent) =>
            setActiveId(String(event.active.id))
          }
          onDragCancel={() => setActiveId(null)}
          onDragEnd={(event) => void handleDragEnd(event)}
        >
          <SortableContext
            items={images.map((image) => image.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-2 gap-3 p-2 sm:grid-cols-3 md:grid-cols-5">
              {images.map((image, index) => (
                <SortableTile
                  key={image.id}
                  image={image}
                  isCover={index === 0}
                  disabled={!canWrite}
                  removing={removingIds.includes(image.id)}
                  onRemove={() => void deleteImage(image.id)}
                />
              ))}
              {Array.from({ length: pendingUploads }).map((_, index) => (
                <SkeletonBox
                  key={`pending-${index}`}
                  className="aspect-square rounded-2xl"
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay dropAnimation={dropAnimation} style={{ zIndex: 60 }}>
            {activeImage ? (
              <div className="aspect-square cursor-grabbing overflow-hidden rounded-2xl shadow-xl">
                {/* eslint-disable-next-line @next/next/no-img-element -- presigned S3 URL */}
                <img
                  src={activeImage.url}
                  alt=""
                  className="size-full object-cover"
                  draggable={false}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}
