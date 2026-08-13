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
  MAX_GALLERY_IMAGES,
  acceptImageFiles,
  uploadPresignedPut,
} from "@villuh/ui/utils"
import { invalidateQueries, trpc } from "@villuh/api"
import { useUser } from "@/modules/app/providers/me-provider"
import { usePropertyDetail } from "@/modules/properties/providers/property-detail-provider"
import { SettingsSection } from "./section"

type GalleryImage = { id: string; url: string }

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
 * Gallery tab editor. Unlike `StagedGalleryField` (used by the create form,
 * where there's no property id to attach uploads to yet), every action here
 * hits the API straight away — there is no save button on this tab.
 *
 * `properties.get` is invalidated alongside `gallery.list` because the detail
 * page's hero backdrop reads `coverImageUrl` off the property row, so adding,
 * deleting, or reordering can change it.
 */
export function PropertyGalleryManager() {
  const { property } = usePropertyDetail()
  const propertyId = property.id
  const utils = trpc.useUtils()
  const { user } = useUser()
  const canWrite = user.org.permissions.write

  const galleryQuery = trpc.properties.gallery.list.useQuery({ propertyId })
  const presign = trpc.uploads.presignPropertyImage.useMutation()
  const addImage = trpc.properties.gallery.add.useMutation()
  const removeImage = trpc.properties.gallery.remove.useMutation()
  const reorderImages = trpc.properties.gallery.reorder.useMutation()

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

  const serverImages: GalleryImage[] = useMemo(
    () => galleryQuery.data?.images ?? [],
    [galleryQuery.data]
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

  function refreshGallery() {
    return invalidateQueries(utils, [
      (u) => u.properties.gallery.list,
      (u) => u.properties.get,
    ])
  }

  async function uploadFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0 || !canWrite) return

    const { accepted, errors } = acceptImageFiles(Array.from(fileList), {
      remainingSlots: MAX_GALLERY_IMAGES - images.length,
    })
    for (const message of errors) toast.error(message)
    if (accepted.length === 0) return

    setPendingUploads(accepted.length)
    let uploaded = 0
    try {
      for (const { file, contentType } of accepted) {
        const { uploadUrl, objectKey } = await presign.mutateAsync({
          propertyId,
          contentType,
          byteLength: file.size,
          filename: file.name,
        })
        await uploadPresignedPut(uploadUrl, file, { contentType })
        await addImage.mutateAsync({
          propertyId,
          objectKey,
          contentType,
          byteLength: file.size,
        })
        uploaded += 1
        setPendingUploads(accepted.length - uploaded)
      }
      toast.success(uploaded === 1 ? "Photo added" : `${uploaded} photos added`)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Some photos could not be uploaded"
      )
    } finally {
      setPendingUploads(0)
      await refreshGallery()
    }
  }

  async function deleteImage(imageId: string) {
    setRemovingIds((prev) => [...prev, imageId])
    try {
      await removeImage.mutateAsync({ propertyId, imageId })
      setOptimisticOrder((prev) =>
        prev ? prev.filter((id) => id !== imageId) : prev
      )
      await refreshGallery()
      toast.success("Photo deleted")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not delete photo"
      )
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
      await reorderImages.mutateAsync({ propertyId, imageIds: nextIds })
      await refreshGallery()
      setOptimisticOrder(null)
    } catch (err) {
      setOptimisticOrder(null)
      toast.error(
        err instanceof Error ? err.message : "Could not reorder photos"
      )
    }
  }

  const activeImage = activeId
    ? (images.find((image) => image.id === activeId) ?? null)
    : null
  const atCap = images.length + pendingUploads >= MAX_GALLERY_IMAGES
  const isLoading = galleryQuery.isLoading

  return (
    <SettingsSection
      title="Photos"
      icon="IconCloudUpload"
      description={`Drag to reorder — the first photo is the cover. Up to ${MAX_GALLERY_IMAGES} photos, saved as you go.`}
      className="grid-cols-1 sm:grid-cols-1"
      action={
        canWrite ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={atCap || pendingUploads > 0 || isLoading}
            onClick={() => fileInputRef.current?.click()}
          >
            <PlatformIcon
              icon="IconCloudUpload"
              size={16}
              data-icon="inline-start"
            />
            Add photos
          </Button>
        ) : null
      }
    >
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

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          <SkeletonBox className="aspect-square rounded-2xl" />
          <SkeletonBox className="aspect-square rounded-2xl" />
          <SkeletonBox className="aspect-square rounded-2xl" />
        </div>
      ) : images.length === 0 && pendingUploads === 0 ? (
        <EmptyState
          icon="IconCloudUpload"
          title="No photos yet"
          description={
            canWrite
              ? "Add photos of this property — they upload immediately."
              : "No one has added photos to this property yet."
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
                Add photos
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
    </SettingsSection>
  )
}
