import { z } from 'zod'

/** JPEG/PNG/WebP/GIF only (D-36) — HEIC skipped for v1 (Assumption A4). */
export const ALLOWED_IMAGE_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 10MB (D-36)
export const MAX_GALLERY_IMAGES = 25 // D-34

export const presignPropertyImageInputSchema = z.object({
  propertyId: z.string().uuid(),
  contentType: z.enum(ALLOWED_IMAGE_CONTENT_TYPES),
  byteLength: z.number().int().positive().max(MAX_IMAGE_BYTES, 'File exceeds 10MB limit'),
  filename: z.string().trim().min(1).max(255).optional(),
})

export type PresignPropertyImageInput = z.infer<typeof presignPropertyImageInputSchema>
