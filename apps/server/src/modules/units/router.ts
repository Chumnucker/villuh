import { router, protectedProcedure, permissionProcedure } from '../../trpc.js'
import { withOrganization } from '../../db/index.js'
import { countActiveUnits } from '../../domain/portfolio-counts.js'
import { syncOrgUnitQuantity } from '../../domain/billing-sync.js'
import { createUnitInputSchema, updateUnitInputSchema, unitIdInputSchema, listUnitsInputSchema } from './schemas.js'
import { listUnits, getUnit, createUnit, updateUnit, archiveUnit } from './service.js'

export const unitsRouter = router({
  list: protectedProcedure.input(listUnitsInputSchema).query(async ({ ctx, input }) => {
    const { organizationId, userId } = ctx
    return withOrganization(organizationId, userId, (tx) => listUnits(tx, organizationId, input))
  }),

  get: protectedProcedure.input(unitIdInputSchema).query(async ({ ctx, input }) => {
    const { organizationId, userId } = ctx
    // Returns { unit, property, status } — property/status are joined server-side.
    return withOrganization(organizationId, userId, (tx) => getUnit(tx, organizationId, input.unitId))
  }),

  create: permissionProcedure('write')
    .input(createUnitInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      const unit = await withOrganization(organizationId, userId, (tx) => createUnit(tx, organizationId, input))

      // D-21/Pattern 8: sync Stripe subscription-item quantity after the create commits.
      const activeCount = await withOrganization(organizationId, userId, (tx) => countActiveUnits(tx, organizationId))
      await syncOrgUnitQuantity(organizationId, activeCount)

      return { unit }
    }),

  update: permissionProcedure('write')
    .input(updateUnitInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      const unit = await withOrganization(organizationId, userId, (tx) => updateUnit(tx, organizationId, input))
      return { unit }
    }),

  archive: permissionProcedure('write')
    .input(unitIdInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      const unit = await withOrganization(organizationId, userId, (tx) =>
        archiveUnit(tx, organizationId, input.unitId),
      )

      // D-21/Pattern 8: sync Stripe subscription-item quantity after the archive commits.
      const activeCount = await withOrganization(organizationId, userId, (tx) => countActiveUnits(tx, organizationId))
      await syncOrgUnitQuantity(organizationId, activeCount)

      return { unit }
    }),
})
