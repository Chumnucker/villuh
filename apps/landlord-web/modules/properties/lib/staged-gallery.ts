import {
  ALLOWED_IMAGE_CONTENT_TYPES,
  type AllowedImageContentType,
  uploadPresignedPut,
} from "@villuh/ui/utils"

export type StagedExistingImage = {
  kind: "existing"
  localId: string
  id: string
  objectKey: string
  url: string
}

export type StagedNewImage = {
  kind: "new"
  localId: string
  file: File
  previewUrl: string
  contentType: AllowedImageContentType
}

export type StagedGalleryItem = StagedExistingImage | StagedNewImage

export function stagedItemPreviewUrl(item: StagedGalleryItem): string {
  return item.kind === "existing" ? item.url : item.previewUrl
}

type PersistDeps = {
  propertyId: string
  items: StagedGalleryItem[]
  removedExistingIds: string[]
  presign: (input: {
    propertyId: string
    contentType: (typeof ALLOWED_IMAGE_CONTENT_TYPES)[number]
    byteLength: number
    filename?: string
  }) => Promise<{ uploadUrl: string; objectKey: string }>
  add: (input: {
    propertyId: string
    objectKey: string
    contentType: string
    byteLength: number
  }) => Promise<{ image: { id: string } }>
  remove: (input: { propertyId: string; imageId: string }) => Promise<unknown>
  reorder: (input: {
    propertyId: string
    imageIds: string[]
  }) => Promise<unknown>
}

/**
 * Apply staged gallery diffs after the property row is saved:
 * hard-delete removed existing images, upload new local files, then reorder.
 */
export async function persistStagedGallery({
  propertyId,
  items,
  removedExistingIds,
  presign,
  add,
  remove,
  reorder,
}: PersistDeps): Promise<void> {
  for (const imageId of removedExistingIds) {
    await remove({ propertyId, imageId })
  }

  const finalIds: string[] = []

  for (const item of items) {
    if (item.kind === "existing") {
      finalIds.push(item.id)
      continue
    }

    const { uploadUrl, objectKey } = await presign({
      propertyId,
      contentType: item.contentType,
      byteLength: item.file.size,
      filename: item.file.name,
    })
    await uploadPresignedPut(uploadUrl, item.file, {
      contentType: item.contentType,
    })
    const { image } = await add({
      propertyId,
      objectKey,
      contentType: item.contentType,
      byteLength: item.file.size,
    })
    finalIds.push(image.id)
  }

  if (finalIds.length > 0) {
    await reorder({ propertyId, imageIds: finalIds })
  }
}

export function revokeStagedBlobUrls(items: StagedGalleryItem[]) {
  for (const item of items) {
    if (item.kind === "new") URL.revokeObjectURL(item.previewUrl)
  }
}
