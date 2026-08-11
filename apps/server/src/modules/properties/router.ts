import { router, protectedProcedure, permissionProcedure } from '../../trpc.js'
import { withOrganization } from '../../db/index.js'
import { countActiveUnits } from '../../domain/portfolio-counts.js'
import { syncOrgUnitQuantity } from '../../domain/billing-sync.js'
import {
  createPropertyInputSchema,
  updatePropertyInputSchema,
  propertyIdInputSchema,
  galleryListInputSchema,
  galleryAddInputSchema,
  galleryReorderInputSchema,
  galleryRemoveInputSchema,
} from './schemas.js'
import {
  listProperties,
  getPropertyWithUnits,
  createProperty,
  updateProperty,
  archiveProperty,
  listGalleryImages,
  addGalleryImage,
  reorderGalleryImages,
  removeGalleryImage,
} from './service.js'

const galleryRouter = router({
  list: protectedProcedure.input(galleryListInputSchema).query(async ({ ctx, input }) => {
    const { organizationId, userId } = ctx
    return withOrganization(organizationId, userId, async (tx) => ({
      images: await listGalleryImages(tx, organizationId, input.propertyId),
    }))
  }),

  add: permissionProcedure('write')
    .input(galleryAddInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      const image = await withOrganization(organizationId, userId, (tx) =>
        addGalleryImage(tx, organizationId, input),
      )
      return { image }
    }),

  reorder: permissionProcedure('write')
    .input(galleryReorderInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      return withOrganization(organizationId, userId, (tx) =>
        reorderGalleryImages(tx, organizationId, input.propertyId, input.imageIds),
      )
    }),

  remove: permissionProcedure('write')
    .input(galleryRemoveInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      return withOrganization(organizationId, userId, (tx) =>
        removeGalleryImage(tx, organizationId, input.propertyId, input.imageId),
      )
    }),
})

export const propertiesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const { organizationId, userId } = ctx
    return withOrganization(organizationId, userId, async (tx) => ({
      properties: await listProperties(tx, organizationId),
    }))
  }),

  get: protectedProcedure.input(propertyIdInputSchema).query(async ({ ctx, input }) => {
    const { organizationId, userId } = ctx
    return withOrganization(organizationId, userId, (tx) =>
      getPropertyWithUnits(tx, organizationId, input.propertyId),
    )
  }),

  create: permissionProcedure('write')
    .input(createPropertyInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      const property = await withOrganization(organizationId, userId, (tx) =>
        createProperty(tx, organizationId, input),
      )
      return { property }
    }),

  update: permissionProcedure('write')
    .input(updatePropertyInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      const property = await withOrganization(organizationId, userId, (tx) =>
        updateProperty(tx, organizationId, input),
      )
      return { property }
    }),

  archive: permissionProcedure('write')
    .input(propertyIdInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      const { property, archivedUnitIds } = await withOrganization(organizationId, userId, (tx) =>
        archiveProperty(tx, organizationId, input.propertyId),
      )

      // D-31 cascade archived units too — keep Stripe unit quantity consistent (Pattern 8).
      if (archivedUnitIds.length > 0) {
        const activeCount = await withOrganization(organizationId, userId, (tx) =>
          countActiveUnits(tx, organizationId),
        )
        await syncOrgUnitQuantity(organizationId, activeCount)
      }

      return { property, archivedUnitIds }
    }),

  gallery: galleryRouter,
})
