/**
 * Browser PUT to a server-minted presigned URL (S3/R2).
 * Uses XHR so callers can receive real upload progress (fetch cannot).
 */
export function uploadPresignedPut(
  uploadUrl: string,
  file: Blob,
  options: {
    contentType: string
    onProgress?: (percent: number) => void
    signal?: AbortSignal
  }
): Promise<void> {
  const { contentType, onProgress, signal } = options

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    const onAbort = () => {
      xhr.abort()
      reject(new DOMException("Upload aborted", "AbortError"))
    }
    signal?.addEventListener("abort", onAbort, { once: true })

    xhr.open("PUT", uploadUrl)
    xhr.setRequestHeader("Content-Type", contentType)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress?.(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      signal?.removeEventListener("abort", onAbort)
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`Upload failed (${xhr.status})`))
    }

    xhr.onerror = () => {
      signal?.removeEventListener("abort", onAbort)
      reject(new Error("Upload failed"))
    }

    xhr.onabort = () => {
      signal?.removeEventListener("abort", onAbort)
      reject(new DOMException("Upload aborted", "AbortError"))
    }

    xhr.send(file)
  })
}

/**
 * Client-side image upload defaults — keep in sync with
 * `@villuh/server/schemas/uploads` (D-34 / D-36). Server remains authoritative.
 */
export const ALLOWED_IMAGE_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const MAX_GALLERY_IMAGES = 25

export type AllowedImageContentType =
  (typeof ALLOWED_IMAGE_CONTENT_TYPES)[number]

export function isAllowedImageContentType(
  type: string
): type is AllowedImageContentType {
  return (ALLOWED_IMAGE_CONTENT_TYPES as readonly string[]).includes(type)
}

export type ImageFileAcceptResult = {
  accepted: { file: File; contentType: AllowedImageContentType }[]
  errors: string[]
}

/**
 * Validate and cap a file list against shared image upload rules.
 */
export function acceptImageFiles(
  files: File[],
  options: {
    remainingSlots: number
    maxBytes?: number
    allowedTypes?: readonly string[]
    atCapMessage?: string
    tooLargeMessage?: string
  }
): ImageFileAcceptResult {
  const maxBytes = options.maxBytes ?? MAX_IMAGE_BYTES
  const allowedTypes = options.allowedTypes ?? ALLOWED_IMAGE_CONTENT_TYPES
  const atCapMessage =
    options.atCapMessage ??
    `You've reached the limit of ${MAX_GALLERY_IMAGES} photos. Remove one to add another.`
  const tooLargeMessage =
    options.tooLargeMessage ?? "Each photo must be 10 MB or smaller."

  const accepted: ImageFileAcceptResult["accepted"] = []
  const errors: string[] = []

  if (options.remainingSlots <= 0) {
    return { accepted, errors: [atCapMessage] }
  }

  for (const file of files) {
    if (accepted.length >= options.remainingSlots) {
      errors.push(atCapMessage)
      break
    }
    if (file.size > maxBytes) {
      errors.push(tooLargeMessage)
      continue
    }
    if (!allowedTypes.includes(file.type)) {
      errors.push(`${file.name || "File"} is not a supported image type.`)
      continue
    }
    // Narrow to the Villuh default union when using stock allowlist; custom
    // allowlists still pass through after the includes() check above.
    accepted.push({
      file,
      contentType: file.type as AllowedImageContentType,
    })
  }

  return { accepted, errors }
}
