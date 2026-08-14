import { router, protectedProcedure, permissionProcedure } from '../../trpc.js'
import { withOrganization } from '../../db/index.js'
import {
  createAmenityInputSchema,
  updateAmenityInputSchema,
  amenityIdInputSchema,
  promoteFromPropertyInputSchema,
  promoteFromUnitInputSchema,
  propertyAmenityListInputSchema,
  addPropertyAmenityInputSchema,
  addFreeformPropertyAmenityInputSchema,
  updatePropertyAmenityInputSchema,
  removePropertyAmenityInputSchema,
  reorderPropertyAmenitiesInputSchema,
  setPropertyAmenitiesInputSchema,
  amenityGalleryListInputSchema,
  amenityGalleryAddInputSchema,
  amenityGalleryReorderInputSchema,
  amenityGalleryRemoveInputSchema,
} from './schemas.js'
import {
  listCatalog,
  createAmenity,
  updateAmenity,
  archiveAmenity,
  restoreAmenity,
  promoteFromProperty,
  promoteFromUnit,
  listPropertyAmenities,
  addPropertyAmenity,
  addFreeformPropertyAmenity,
  updatePropertyAmenity,
  removePropertyAmenity,
  reorderPropertyAmenities,
  setPropertyAmenities,
  listGalleryImages,
  addGalleryImage,
  reorderGalleryImages,
  removeGalleryImage,
} from './service.js'

// Org catalog sub-router (amenities.catalog.*). Reads = protectedProcedure; every mutation =
// permissionProcedure('write') (D-28), each body inside withOrganization. Property/unit sub-routers
// (with the nested gallery) are added by Plans 04/05.
const catalogRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const { organizationId, userId } = ctx
    return withOrganization(organizationId, userId, async (tx) => ({
      amenities: await listCatalog(tx, organizationId),
    }))
  }),

  create: permissionProcedure('write')
    .input(createAmenityInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      const amenity = await withOrganization(organizationId, userId, (tx) =>
        createAmenity(tx, organizationId, input),
      )
      return { amenity }
    }),

  update: permissionProcedure('write')
    .input(updateAmenityInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      const amenity = await withOrganization(organizationId, userId, (tx) =>
        updateAmenity(tx, organizationId, input),
      )
      return { amenity }
    }),

  archive: permissionProcedure('write')
    .input(amenityIdInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      const amenity = await withOrganization(organizationId, userId, (tx) =>
        archiveAmenity(tx, organizationId, input.organizationAmenityId),
      )
      return { amenity }
    }),

  restore: permissionProcedure('write')
    .input(amenityIdInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      const amenity = await withOrganization(organizationId, userId, (tx) =>
        restoreAmenity(tx, organizationId, input.organizationAmenityId),
      )
      return { amenity }
    }),

  promoteFromProperty: permissionProcedure('write')
    .input(promoteFromPropertyInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      return withOrganization(organizationId, userId, (tx) =>
        promoteFromProperty(tx, organizationId, input.propertyAmenityId),
      )
    }),

  promoteFromUnit: permissionProcedure('write')
    .input(promoteFromUnitInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      return withOrganization(organizationId, userId, (tx) =>
        promoteFromUnit(tx, organizationId, input.unitAmenityId),
      )
    }),
})

// Nested gallery sub-router (amenities.property.gallery.*). Reads = protectedProcedure; mutations =
// permissionProcedure('write') (D-28). objectKey persisted only; presigned GET at read (D-26).
const galleryRouter = router({
  list: protectedProcedure.input(amenityGalleryListInputSchema).query(async ({ ctx, input }) => {
    const { organizationId, userId } = ctx
    return withOrganization(organizationId, userId, async (tx) => ({
      images: await listGalleryImages(tx, organizationId, input.propertyAmenityId),
    }))
  }),

  add: permissionProcedure('write')
    .input(amenityGalleryAddInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      const image = await withOrganization(organizationId, userId, (tx) =>
        addGalleryImage(tx, organizationId, input),
      )
      return { image }
    }),

  reorder: permissionProcedure('write')
    .input(amenityGalleryReorderInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      return withOrganization(organizationId, userId, (tx) =>
        reorderGalleryImages(tx, organizationId, input.propertyAmenityId, input.orderedIds),
      )
    }),

  remove: permissionProcedure('write')
    .input(amenityGalleryRemoveInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      return withOrganization(organizationId, userId, (tx) =>
        removeGalleryImage(tx, organizationId, input.imageId),
      )
    }),
})

// Property assignment sub-router (amenities.property.*). Reads = protectedProcedure; every mutation
// = permissionProcedure('write') (D-28), each body inside withOrganization.
const propertyRouter = router({
  list: protectedProcedure.input(propertyAmenityListInputSchema).query(async ({ ctx, input }) => {
    const { organizationId, userId } = ctx
    return withOrganization(organizationId, userId, async (tx) => ({
      amenities: await listPropertyAmenities(tx, organizationId, input.propertyId),
    }))
  }),

  add: permissionProcedure('write')
    .input(addPropertyAmenityInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      const amenity = await withOrganization(organizationId, userId, (tx) =>
        addPropertyAmenity(tx, organizationId, input),
      )
      return { amenity }
    }),

  addFreeform: permissionProcedure('write')
    .input(addFreeformPropertyAmenityInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      const amenity = await withOrganization(organizationId, userId, (tx) =>
        addFreeformPropertyAmenity(tx, organizationId, input),
      )
      return { amenity }
    }),

  update: permissionProcedure('write')
    .input(updatePropertyAmenityInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      const amenity = await withOrganization(organizationId, userId, (tx) =>
        updatePropertyAmenity(tx, organizationId, input),
      )
      return { amenity }
    }),

  remove: permissionProcedure('write')
    .input(removePropertyAmenityInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      return withOrganization(organizationId, userId, (tx) =>
        removePropertyAmenity(tx, organizationId, input.propertyAmenityId),
      )
    }),

  reorder: permissionProcedure('write')
    .input(reorderPropertyAmenitiesInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      return withOrganization(organizationId, userId, (tx) =>
        reorderPropertyAmenities(tx, organizationId, input.propertyId, input.orderedIds),
      )
    }),

  set: permissionProcedure('write')
    .input(setPropertyAmenitiesInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      const amenities = await withOrganization(organizationId, userId, (tx) =>
        setPropertyAmenities(tx, organizationId, input),
      )
      return { amenities }
    }),

  gallery: galleryRouter,
})

export const amenitiesRouter = router({
  catalog: catalogRouter,
  property: propertyRouter,
})
