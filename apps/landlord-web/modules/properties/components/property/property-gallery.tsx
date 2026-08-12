"use client"

import { useRef, useState } from "react"
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
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContainer,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  PlatformIcon,
  cn,
} from "@villuh/ui"
import { invalidateQueries, trpc } from "@villuh/api"

const MAX_GALLERY_IMAGES = 25
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const
type AllowedContentType = (typeof ALLOWED_CONTENT_TYPES)[number]

function isAllowedContentType(type: string): type is AllowedContentType {
  return (ALLOWED_CONTENT_TYPES as readonly string[]).includes(type)
}

type GalleryImage = {
  id: string
  objectKey: string
  url: string
  sortOrder: number
}

/** XHR (not fetch) so we get real upload progress events for the per-file progress bar. */
function uploadFileWithProgress(
  uploadUrl: string,
  file: File,
  contentType: string,
  onProgress: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("PUT", uploadUrl)
    xhr.setRequestHeader("Content-Type", contentType)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`Upload failed (${xhr.status})`))
    }
    xhr.onerror = () => reject(new Error("Upload failed"))
    xhr.send(file)
  })
}

function GalleryTile({
  image,
  isCover,
  onRemove,
}: {
  image: GalleryImage
  isCover: boolean
  onRemove: (imageId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group relative size-24 shrink-0 overflow-hidden rounded-2xl ring-1 ring-border",
        isDragging && "opacity-80"
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- short-lived presigned S3 URL, not a Next-optimizable static asset */}
      <img src={image.url} alt="" className="size-full object-cover" />

      {isCover ? (
        <Badge className="absolute top-1 left-1 border-transparent bg-primary text-primary-foreground">
          Cover
        </Badge>
      ) : null}

      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Reorder photo"
        className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
      >
        <PlatformIcon icon="IconReorder" size={14} />
      </button>

      <button
        type="button"
        onClick={() => onRemove(image.id)}
        aria-label="Remove photo"
        className="absolute bottom-1 right-1 flex size-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
      >
        <PlatformIcon icon="IconCrossLarge" size={14} />
      </button>
    </div>
  )
}

/**
 * S3-backed property gallery (D-02, D-34–D-38): multi-file upload with per-file progress via
 * `uploads.presignPropertyImage` → PUT (identical Content-Type, Pitfall 1) → `gallery.add`;
 * @dnd-kit drag-reorder persisted via `gallery.reorder` (index 0 = cover, D-35); remove requires
 * confirm → `gallery.remove` (immediate S3 + DB delete, D-37). Never treats React state as the
 * source of truth for durable URLs — the list always refetches from `gallery.list` (D-38).
 */
export function PropertyGallery({ propertyId }: { propertyId: string }) {
  const utils = trpc.useUtils()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingCount, setUploadingCount] = useState(0)
  const [removeTarget, setRemoveTarget] = useState<GalleryImage | null>(null)

  const { data, isLoading } = trpc.properties.gallery.list.useQuery({ propertyId })
  const images = data?.images ?? []

  const presign = trpc.uploads.presignPropertyImage.useMutation()
  const addImage = trpc.properties.gallery.add.useMutation()
  const reorderImages = trpc.properties.gallery.reorder.useMutation()
  const removeImage = trpc.properties.gallery.remove.useMutation({
    onSuccess: () =>
      invalidateQueries(utils, [(u) => u.properties.gallery.list]).then(() => {
        toast.success("Photo removed")
      }),
    onError: (err) => toast.error(err.message || "Could not remove photo"),
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    const files = Array.from(fileList)

    const remainingSlots = MAX_GALLERY_IMAGES - images.length
    if (remainingSlots <= 0) {
      toast.error("This property already has 25 photos. Remove one to add another.")
      return
    }

    const accepted: { file: File; contentType: AllowedContentType }[] = []
    for (const file of files) {
      if (accepted.length >= remainingSlots) {
        toast.error("This property already has 25 photos. Remove one to add another.")
        break
      }
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error("Each photo must be 10 MB or smaller.")
        continue
      }
      if (!isAllowedContentType(file.type)) {
        toast.error(`${file.name || "File"} is not a supported image type.`)
        continue
      }
      accepted.push({ file, contentType: file.type })
    }

    if (accepted.length === 0) return

    setUploadingCount((n) => n + accepted.length)
    try {
      for (const { file, contentType } of accepted) {
        try {
          const { uploadUrl, objectKey } = await presign.mutateAsync({
            propertyId,
            contentType,
            byteLength: file.size,
            filename: file.name,
          })
          await uploadFileWithProgress(uploadUrl, file, contentType, () => undefined)
          await addImage.mutateAsync({
            propertyId,
            objectKey,
            contentType,
            byteLength: file.size,
          })
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Could not upload photo")
        } finally {
          setUploadingCount((n) => Math.max(0, n - 1))
        }
      }
    } finally {
      await invalidateQueries(utils, [(u) => u.properties.gallery.list])
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = images.findIndex((img) => img.id === active.id)
    const newIndex = images.findIndex((img) => img.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(images, oldIndex, newIndex)
    // Optimistic reorder in the query cache — refetched from the server afterward anyway.
    utils.properties.gallery.list.setData({ propertyId }, (prev) =>
      prev ? { images: reordered } : prev
    )

    try {
      await reorderImages.mutateAsync({ propertyId, imageIds: reordered.map((img) => img.id) })
    } finally {
      await invalidateQueries(utils, [(u) => u.properties.gallery.list])
    }
  }

  const atCap = images.length >= MAX_GALLERY_IMAGES

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Gallery</CardTitle>
        <Button
          size="sm"
          variant="outline"
          disabled={atCap || presign.isPending}
          onClick={() => {
            if (atCap) {
              toast.error("This property already has 25 photos. Remove one to add another.")
              return
            }
            fileInputRef.current?.click()
          }}
        >
          <PlatformIcon icon="IconCloudUpload" size={16} data-icon="inline-start" />
          Add photos
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_CONTENT_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            void handleFiles(e.target.files)
            e.target.value = ""
          }}
        />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="size-24 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : images.length === 0 && uploadingCount === 0 ? (
          <div className="flex flex-col items-center gap-1 py-12 text-center">
            <p className="text-sm font-medium text-foreground">No photos yet</p>
            <p className="text-sm text-muted-foreground">
              Upload photos to help your team recognize this property. First photo becomes the
              cover.
            </p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={images.map((img) => img.id)} strategy={rectSortingStrategy}>
              <div className="flex flex-wrap gap-2">
                {images.map((image, index) => (
                  <GalleryTile
                    key={image.id}
                    image={image}
                    isCover={index === 0}
                    onRemove={(imageId) => {
                      const target = images.find((img) => img.id === imageId)
                      if (target) setRemoveTarget(target)
                    }}
                  />
                ))}
                {Array.from({ length: uploadingCount }).map((_, i) => (
                  <div
                    key={`uploading-${i}`}
                    className="flex size-24 items-center justify-center rounded-2xl bg-muted"
                  >
                    <PlatformIcon icon="IconLoader" size={20} className="animate-spin text-muted-foreground" />
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>

      <Dialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <DialogContainer>
          <DialogHeader>
            <DialogTitle>Remove this photo?</DialogTitle>
            <DialogDescription>The file is deleted immediately and cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>
              Keep photo
            </Button>
            <Button
              variant="destructive"
              disabled={removeImage.isPending}
              onClick={() => {
                if (!removeTarget) return
                removeImage.mutate(
                  { propertyId, imageId: removeTarget.id },
                  { onSettled: () => setRemoveTarget(null) }
                )
              }}
            >
              Remove photo
            </Button>
          </DialogFooter>
        </DialogContainer>
      </Dialog>
    </Card>
  )
}
