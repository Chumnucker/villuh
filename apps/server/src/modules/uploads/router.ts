import { randomUUID } from 'node:crypto'
import { and, eq, sql } from 'drizzle-orm'
import { router, permissionProcedure } from '../../trpc.js'
import { withOrganization } from '../../db/index.js'
import { properties, propertyImages } from '../../schema/properties.js'
import { badRequest, notFound } from '../../domain/index.js'
import { presignPut } from './s3.js'
import { presignPropertyImageInputSchema, MAX_GALLERY_IMAGES } from './schemas.js'

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export const uploadsRouter = router({
  presignPropertyImage: permissionProcedure('write')
    .input(presignPropertyImageInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx

      return withOrganization(organizationId, userId, async (tx) => {
        const propertyRows = await tx
          .select({ id: properties.id })
          .from(properties)
          .where(and(eq(properties.id, input.propertyId), eq(properties.organizationId, organizationId)))
          .limit(1)
        if (!propertyRows[0]) notFound('Property not found')

        const countRows = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(propertyImages)
          .where(
            and(
              eq(propertyImages.propertyId, input.propertyId),
              eq(propertyImages.organizationId, organizationId),
            ),
          )
        const current = countRows[0]?.count ?? 0
        if (current >= MAX_GALLERY_IMAGES) {
          badRequest(`Gallery limit reached (max ${MAX_GALLERY_IMAGES} images)`)
        }

        const ext = EXTENSION_BY_CONTENT_TYPE[input.contentType] ?? 'bin'
        const objectKey = `${organizationId}/properties/${input.propertyId}/gallery/${randomUUID()}.${ext}`
        const uploadUrl = await presignPut({ objectKey, contentType: input.contentType })
        return { uploadUrl, objectKey }
      })
    }),
})
