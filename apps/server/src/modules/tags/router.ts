import { and, asc, eq, isNotNull } from 'drizzle-orm'
import { router, protectedProcedure, permissionProcedure } from '../../trpc.js'
import { withOrganization, type OrganizationTx } from '../../db/index.js'
import { organizationTag, propertyTag } from '../../schema/tags.js'
import { properties } from '../../schema/properties.js'
import { badRequest, notFound } from '../../domain/index.js'
import {
  createOrganizationTagInputSchema,
  updateOrganizationTagInputSchema,
  organizationTagIdInputSchema,
  propertyIdInputSchema,
  addFreeformTagInputSchema,
  attachOrganizationTagInputSchema,
  setPropertyTagsInputSchema,
  propertyTagIdInputSchema,
  promoteFreeformTagInputSchema,
} from './schemas.js'

type OrganizationTagRow = typeof organizationTag.$inferSelect
type PropertyTagRow = typeof propertyTag.$inferSelect

async function requireProperty(tx: OrganizationTx, organizationId: string, propertyId: string): Promise<void> {
  const rows = await tx
    .select({ id: properties.id })
    .from(properties)
    .where(and(eq(properties.id, propertyId), eq(properties.organizationId, organizationId)))
    .limit(1)
  if (!rows[0]) notFound('Property not found')
}

async function requireOrganizationTag(
  tx: OrganizationTx,
  organizationId: string,
  organizationTagId: string,
): Promise<OrganizationTagRow> {
  const rows = await tx
    .select()
    .from(organizationTag)
    .where(and(eq(organizationTag.id, organizationTagId), eq(organizationTag.organizationId, organizationId)))
    .limit(1)
  const tag = rows[0]
  if (!tag) notFound('Organization tag not found')
  return tag
}

export const tagsRouter = router({
  listOrganizationTags: protectedProcedure.query(async ({ ctx }) => {
    const { organizationId, userId } = ctx
    return withOrganization(organizationId, userId, async (tx) => ({
      tags: await tx
        .select()
        .from(organizationTag)
        .where(eq(organizationTag.organizationId, organizationId))
        .orderBy(asc(organizationTag.name)),
    }))
  }),

  createOrganizationTag: permissionProcedure('write')
    .input(createOrganizationTagInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      const tag = await withOrganization(organizationId, userId, async (tx) => {
        const [row] = await tx
          .insert(organizationTag)
          .values({ organizationId, name: input.name, iconKey: input.iconKey, colorKey: input.colorKey })
          .returning()
        return row
      })
      return { tag }
    }),

  // D-19: edit org catalog tags requires the same write permission as promote.
  updateOrganizationTag: permissionProcedure('write')
    .input(updateOrganizationTagInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      const { organizationTagId, ...rest } = input
      const tag = await withOrganization(organizationId, userId, async (tx) => {
        await requireOrganizationTag(tx, organizationId, organizationTagId)

        const patch: Partial<typeof organizationTag.$inferInsert> = {}
        if (rest.name !== undefined) patch.name = rest.name
        if (rest.iconKey !== undefined) patch.iconKey = rest.iconKey
        if (rest.colorKey !== undefined) patch.colorKey = rest.colorKey

        const [row] = await tx
          .update(organizationTag)
          .set(patch)
          .where(and(eq(organizationTag.id, organizationTagId), eq(organizationTag.organizationId, organizationId)))
          .returning()
        return row
      })
      return { tag }
    }),

  // D-20: cascade-detach every property_tag referencing this catalog tag, then delete the row —
  // single withOrganization transaction (Pattern: soft-archive cascade, adapted for hard delete).
  deleteOrganizationTag: permissionProcedure('write')
    .input(organizationTagIdInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      await withOrganization(organizationId, userId, async (tx) => {
        await requireOrganizationTag(tx, organizationId, input.organizationTagId)
        await tx
          .delete(propertyTag)
          .where(
            and(
              eq(propertyTag.organizationTagId, input.organizationTagId),
              eq(propertyTag.organizationId, organizationId),
            ),
          )
        await tx
          .delete(organizationTag)
          .where(and(eq(organizationTag.id, input.organizationTagId), eq(organizationTag.organizationId, organizationId)))
      })
      return { ok: true }
    }),

  listPropertyTags: protectedProcedure.input(propertyIdInputSchema).query(async ({ ctx, input }) => {
    const { organizationId, userId } = ctx
    return withOrganization(organizationId, userId, async (tx) => {
      await requireProperty(tx, organizationId, input.propertyId)
      const tags = await tx
        .select()
        .from(propertyTag)
        .where(and(eq(propertyTag.propertyId, input.propertyId), eq(propertyTag.organizationId, organizationId)))
        .orderBy(asc(propertyTag.createdAt))
      return { tags }
    })
  }),

  // Freeform tag (D-17): display-only property_tag row, organizationTagId stays null until
  // promoted — renders identically to a catalog-backed tag (Pattern 7 denormalization).
  addFreeform: permissionProcedure('write')
    .input(addFreeformTagInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      const tag = await withOrganization(organizationId, userId, async (tx) => {
        await requireProperty(tx, organizationId, input.propertyId)
        const [row] = await tx
          .insert(propertyTag)
          .values({
            organizationId,
            propertyId: input.propertyId,
            organizationTagId: null,
            label: input.label,
            iconKey: input.iconKey,
            colorKey: input.colorKey,
          })
          .returning()
        return row
      })
      return { tag }
    }),

  // Attach an existing org catalog tag to a property — label/icon/color denormalized at attach
  // time (Pattern 7) so display never depends on a join.
  attachOrganizationTag: permissionProcedure('write')
    .input(attachOrganizationTagInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      const tag = await withOrganization(organizationId, userId, async (tx) => {
        await requireProperty(tx, organizationId, input.propertyId)
        const catalogTag = await requireOrganizationTag(tx, organizationId, input.organizationTagId)
        const [row] = await tx
          .insert(propertyTag)
          .values({
            organizationId,
            propertyId: input.propertyId,
            organizationTagId: catalogTag.id,
            label: catalogTag.name,
            iconKey: catalogTag.iconKey,
            colorKey: catalogTag.colorKey,
          })
          .returning()
        return row
      })
      return { tag }
    }),

  // Bulk-replace a property's catalog-backed tag assignments (TagPicker multi-select) —
  // freeform rows (organizationTagId null) are left untouched.
  setPropertyTags: permissionProcedure('write')
    .input(setPropertyTagsInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      const tags = await withOrganization(organizationId, userId, async (tx) => {
        await requireProperty(tx, organizationId, input.propertyId)

        await tx
          .delete(propertyTag)
          .where(
            and(
              eq(propertyTag.propertyId, input.propertyId),
              eq(propertyTag.organizationId, organizationId),
              isNotNull(propertyTag.organizationTagId),
            ),
          )

        const rows: PropertyTagRow[] = []
        for (const organizationTagId of input.organizationTagIds) {
          const catalogTag = await requireOrganizationTag(tx, organizationId, organizationTagId)
          const [row] = await tx
            .insert(propertyTag)
            .values({
              organizationId,
              propertyId: input.propertyId,
              organizationTagId: catalogTag.id,
              label: catalogTag.name,
              iconKey: catalogTag.iconKey,
              colorKey: catalogTag.colorKey,
            })
            .returning()
          if (row) rows.push(row)
        }
        return rows
      })
      return { tags }
    }),

  removePropertyTag: permissionProcedure('write')
    .input(propertyTagIdInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      await withOrganization(organizationId, userId, async (tx) => {
        await tx
          .delete(propertyTag)
          .where(and(eq(propertyTag.id, input.propertyTagId), eq(propertyTag.organizationId, organizationId)))
      })
      return { ok: true }
    }),

  // D-18: promote a freeform property_tag to the org catalog — requires write permission.
  // Reuses an existing catalog tag with the same name if one already exists (dedup by name,
  // matching the org_name unique constraint on organization_tag).
  promoteFreeform: permissionProcedure('write')
    .input(promoteFreeformTagInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId } = ctx
      return withOrganization(organizationId, userId, async (tx) => {
        const rows = await tx
          .select()
          .from(propertyTag)
          .where(and(eq(propertyTag.id, input.propertyTagId), eq(propertyTag.organizationId, organizationId)))
          .limit(1)
        const freeform = rows[0]
        if (!freeform) notFound('Property tag not found')
        if (freeform.organizationTagId) badRequest('Tag is already promoted to the organization catalog')

        const existingRows = await tx
          .select()
          .from(organizationTag)
          .where(and(eq(organizationTag.organizationId, organizationId), eq(organizationTag.name, freeform.label)))
          .limit(1)

        const catalogTag =
          existingRows[0] ??
          (
            await tx
              .insert(organizationTag)
              .values({
                organizationId,
                name: freeform.label,
                iconKey: freeform.iconKey,
                colorKey: freeform.colorKey,
              })
              .returning()
          )[0]!

        const [updatedPropertyTag] = await tx
          .update(propertyTag)
          .set({ organizationTagId: catalogTag.id, iconKey: catalogTag.iconKey, colorKey: catalogTag.colorKey })
          .where(and(eq(propertyTag.id, input.propertyTagId), eq(propertyTag.organizationId, organizationId)))
          .returning()

        return { tag: catalogTag, propertyTag: updatedPropertyTag }
      })
    }),
})
