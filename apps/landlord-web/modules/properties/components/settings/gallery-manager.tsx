"use client"

import { useMemo } from "react"
import { MAX_GALLERY_IMAGES, uploadPresignedPut } from "@villuh/ui/utils"
import { invalidateQueries, trpc } from "@villuh/api"
import { useUser } from "@/modules/app/providers/me-provider"
import { usePropertyDetail } from "@/modules/properties/providers/property-detail-provider"
import {
  GalleryManager,
  type GalleryImage,
  type GalleryUploadFile,
} from "@/modules/amenities/components/gallery-manager"
import { SettingsSection } from "./section"

/**
 * Property gallery tab editor — now a thin wrapper over the reusable
 * {@link GalleryManager} (D-31). Unlike `StagedGalleryField` (used by the create
 * form, where there's no property id to attach uploads to yet), every action
 * here hits the API straight away — there is no save button on this tab.
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

  const images: GalleryImage[] = useMemo(
    () => galleryQuery.data?.images ?? [],
    [galleryQuery.data]
  )

  function refreshGallery() {
    return invalidateQueries(utils, [
      (u) => u.properties.gallery.list,
      (u) => u.properties.get,
    ])
  }

  async function handleUpload(files: GalleryUploadFile[]) {
    try {
      for (const { file, contentType } of files) {
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
      }
    } finally {
      await refreshGallery()
    }
  }

  async function handleDelete(imageId: string) {
    await removeImage.mutateAsync({ propertyId, imageId })
    await refreshGallery()
  }

  async function handleReorder(imageIds: string[]) {
    await reorderImages.mutateAsync({ propertyId, imageIds })
    await refreshGallery()
  }

  return (
    <SettingsSection
      title="Photos"
      icon="IconCloudUpload"
      description={`Drag to reorder — the first photo is the cover. Up to ${MAX_GALLERY_IMAGES} photos, saved as you go.`}
      className="grid-cols-1 sm:grid-cols-1"
    >
      <GalleryManager
        images={images}
        isLoading={galleryQuery.isLoading}
        canWrite={canWrite}
        cap={MAX_GALLERY_IMAGES}
        onUpload={handleUpload}
        onDelete={handleDelete}
        onReorder={handleReorder}
        emptyTitle="No photos yet"
        emptyDescription={
          canWrite
            ? "Add photos of this property — they upload immediately."
            : "No one has added photos to this property yet."
        }
      />
    </SettingsSection>
  )
}
