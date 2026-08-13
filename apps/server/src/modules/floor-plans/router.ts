import { router, protectedProcedure, permissionProcedure } from '../../trpc.js'
import { withOrganization } from '../../db/index.js'
import {
  createFloorPlanInputSchema,
  updateFloorPlanInputSchema,
  floorPlanIdInputSchema,
  listFloorPlansInputSchema,
  galleryListInputSchema,
  galleryAddInputSchema,
  galleryReorderInputSchema,
  galleryRemoveInputSchema,
} from './schemas.js'
import {
  listFloorPlans,
  getFloorPlan,
  createFloorPlan,
  updateFloorPlan,
  archiveFloorPlan,
  listGalleryImages,
  addGalleryImage,
  reorderGalleryImages,
  removeGalleryImage,
} from './service.js'

const galleryRouter = router({
  list: protectedProcedure.input(galleryListInputSchema).query(async ({ ctx, input }) => {
    const { organizationId, userId } = ctx
    return withOrganization(organizationId, userId, async (tx) => ({
      images: await listGalleryImages(tx, organizationId, input.floorPlanId),
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
        reorderGalleryImages(tx, organizationId, input.floorPlanId, input.imageIds),
      )
    }),

  remove: permissionProcedure('write')
    .input(galleryRemoveInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      return withOrganization(organizationId, userId, (tx) =>
        removeGalleryImage(tx, organizationId, input.floorPlanId, input.imageId),
      )
    }),
})

export const floorPlansRouter = router({
  list: protectedProcedure.input(listFloorPlansInputSchema).query(async ({ ctx, input }) => {
    const { organizationId, userId } = ctx
    return withOrganization(organizationId, userId, async (tx) => ({
      floorPlans: await listFloorPlans(tx, organizationId, input),
    }))
  }),

  get: protectedProcedure.input(floorPlanIdInputSchema).query(async ({ ctx, input }) => {
    const { organizationId, userId } = ctx
    return withOrganization(organizationId, userId, (tx) =>
      getFloorPlan(tx, organizationId, input.floorPlanId),
    )
  }),

  create: permissionProcedure('write')
    .input(createFloorPlanInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      const floorPlan = await withOrganization(organizationId, userId, (tx) =>
        createFloorPlan(tx, organizationId, input),
      )
      return { floorPlan }
    }),

  update: permissionProcedure('write')
    .input(updateFloorPlanInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      const floorPlan = await withOrganization(organizationId, userId, (tx) =>
        updateFloorPlan(tx, organizationId, input),
      )
      return { floorPlan }
    }),

  archive: permissionProcedure('write')
    .input(floorPlanIdInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      const floorPlan = await withOrganization(organizationId, userId, (tx) =>
        archiveFloorPlan(tx, organizationId, input.floorPlanId),
      )
      return { floorPlan }
    }),

  gallery: galleryRouter,
})
