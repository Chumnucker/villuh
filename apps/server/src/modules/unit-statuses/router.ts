import { and, asc, eq, isNull, sql } from 'drizzle-orm'
import { router, protectedProcedure, permissionProcedure } from '../../trpc.js'
import { withOrganization, type OrganizationTx } from '../../db/index.js'
import { unitStatuses, units } from '../../schema/units.js'
import { ensureDefaultUnitStatuses } from '../../domain/unit-statuses.js'
import { badRequest, notFound } from '../../domain/index.js'
import {
  createUnitStatusInputSchema,
  updateUnitStatusInputSchema,
  reorderUnitStatusesInputSchema,
  unitStatusIdInputSchema,
} from './schemas.js'

type UnitStatusRow = typeof unitStatuses.$inferSelect

async function requireUnitStatus(
  tx: OrganizationTx,
  organizationId: string,
  statusId: string,
): Promise<UnitStatusRow> {
  const rows = await tx
    .select()
    .from(unitStatuses)
    .where(and(eq(unitStatuses.id, statusId), eq(unitStatuses.organizationId, organizationId)))
    .limit(1)
  const status = rows[0]
  if (!status) notFound('Unit status not found')
  return status
}

export const unitStatusesRouter = router({
  // D-26: seed Available/Occupied/Maintenance on first read — idempotent, safe for every list call.
  list: protectedProcedure.query(async ({ ctx }) => {
    const { organizationId, userId } = ctx
    return withOrganization(organizationId, userId, async (tx) => {
      await ensureDefaultUnitStatuses(organizationId, tx)
      const statuses = await tx
        .select()
        .from(unitStatuses)
        .where(and(eq(unitStatuses.organizationId, organizationId), isNull(unitStatuses.archivedAt)))
        .orderBy(asc(unitStatuses.sortOrder))
      return { statuses }
    })
  }),

  // D-27: only owner/admin may edit the status catalog — assigning a status to a unit is
  // a separate write-permission action on units.create/update, not gated here.
  create: permissionProcedure('admin')
    .input(createUnitStatusInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      const status = await withOrganization(organizationId, userId, async (tx) => {
        const maxRows = (await tx
          .select({ max: sql<number>`coalesce(max(sort_order), -1)::int` })
          .from(unitStatuses)
          .where(eq(unitStatuses.organizationId, organizationId))) as { max: number }[]
        const nextSortOrder = (maxRows[0]?.max ?? -1) + 1

        const [row] = await tx
          .insert(unitStatuses)
          .values({
            organizationId,
            name: input.name,
            iconKey: input.iconKey,
            colorKey: input.colorKey,
            sortOrder: nextSortOrder,
            isSystem: false,
          })
          .returning()
        return row
      })
      return { status }
    }),

  update: permissionProcedure('admin')
    .input(updateUnitStatusInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      const { statusId, ...rest } = input
      const status = await withOrganization(organizationId, userId, async (tx) => {
        await requireUnitStatus(tx, organizationId, statusId)

        const patch: Partial<typeof unitStatuses.$inferInsert> = { updatedAt: new Date() }
        if (rest.name !== undefined) patch.name = rest.name
        if (rest.iconKey !== undefined) patch.iconKey = rest.iconKey
        if (rest.colorKey !== undefined) patch.colorKey = rest.colorKey

        const [row] = await tx
          .update(unitStatuses)
          .set(patch)
          .where(and(eq(unitStatuses.id, statusId), eq(unitStatuses.organizationId, organizationId)))
          .returning()
        return row
      })
      return { status }
    }),

  reorder: permissionProcedure('admin')
    .input(reorderUnitStatusesInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      await withOrganization(organizationId, userId, async (tx) => {
        for (let i = 0; i < input.statusIds.length; i++) {
          await tx
            .update(unitStatuses)
            .set({ sortOrder: i })
            .where(and(eq(unitStatuses.id, input.statusIds[i]!), eq(unitStatuses.organizationId, organizationId)))
        }
      })
      return { ok: true }
    }),

  // Seeded is_system rows cannot be archived (D-27 UI-SPEC minimum); custom statuses can
  // only be archived while unassigned from any active unit.
  archive: permissionProcedure('admin')
    .input(unitStatusIdInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      const status = await withOrganization(organizationId, userId, async (tx) => {
        const existing = await requireUnitStatus(tx, organizationId, input.statusId)
        if (existing.isSystem) badRequest('System default statuses cannot be deleted')

        const assignedRows = await tx
          .select({ id: units.id })
          .from(units)
          .where(
            and(
              eq(units.statusId, input.statusId),
              eq(units.organizationId, organizationId),
              isNull(units.archivedAt),
            ),
          )
          .limit(1)
        if (assignedRows[0]) badRequest('Cannot archive a status that is still assigned to units')

        const now = new Date()
        const [row] = await tx
          .update(unitStatuses)
          .set({ archivedAt: now, updatedAt: now })
          .where(and(eq(unitStatuses.id, input.statusId), eq(unitStatuses.organizationId, organizationId)))
          .returning()
        return row
      })
      return { status }
    }),
})
