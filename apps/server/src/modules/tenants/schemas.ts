import { z } from 'zod'
import { listQueryFields, listSearchSchema, filterIdListSchema, filterEmptyFlagSchema } from '@villuh/server/schemas/filters'

/** Tenancy lifecycle (tenant slice). pending → active → ended. Source of truth
 * for the `tenancy_status` Postgres enum (see schema/enums.ts) — adding an
 * option needs a migration. Defined here (not in enums.ts) so this
 * frontend-exposed schema module doesn't pull drizzle into the client bundle. */
export const TENANCY_STATUSES = ['pending', 'active', 'ended'] as const

export const createTenantInputSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  phone: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(2000).optional(),
})
export type CreateTenantInput = z.infer<typeof createTenantInputSchema>

export const updateTenantInputSchema = createTenantInputSchema.partial().extend({
  tenantId: z.uuid(),
})
export type UpdateTenantInput = z.infer<typeof updateTenantInputSchema>

export const tenantIdInputSchema = z.object({ tenantId: z.uuid() })

/** Create a tenancy for a unit with one or more members (first listed is primary). */
export const createTenancyInputSchema = z.object({
  unitId: z.uuid(),
  status: z.enum(TENANCY_STATUSES).default('pending'),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  memberTenantIds: z.array(z.uuid()).min(1, 'At least one tenant is required'),
  primaryTenantId: z.uuid(),
})
export type CreateTenancyInput = z.infer<typeof createTenancyInputSchema>

export const updateTenancyInputSchema = z.object({
  tenancyId: z.uuid(),
  status: z.enum(TENANCY_STATUSES).optional(),
  startDate: z.string().date().nullish(),
  endDate: z.string().date().nullish(),
})
export type UpdateTenancyInput = z.infer<typeof updateTenancyInputSchema>

export const tenancyIdInputSchema = z.object({ tenancyId: z.uuid() })

/** Unit-scoped tenancy history read (active + ended) for the unit "Tenant history" tab. */
export const unitTenancyHistoryInputSchema = z.object({ unitId: z.uuid() })
export type UnitTenancyHistoryInput = z.infer<typeof unitTenancyHistoryInputSchema>

export const addCoTenantInputSchema = z.object({
  tenancyId: z.uuid(),
  tenantId: z.uuid(),
})
export type AddCoTenantInput = z.infer<typeof addCoTenantInputSchema>

export const removeMemberInputSchema = z.object({
  tenancyId: z.uuid(),
  tenantId: z.uuid(),
})
export type RemoveMemberInput = z.infer<typeof removeMemberInputSchema>

/** Sort keys — ids match the frontend column accessors. */
export const TENANT_SORT_KEYS = ['name', 'email', 'currentUnit', 'status'] as const

export const tenantActivityInputSchema = z.object({
  tenantId: z.uuid(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
})
export type TenantActivityInput = z.infer<typeof tenantActivityInputSchema>

export const listTenantsInputSchema = z
  .object({
    ...listQueryFields(TENANT_SORT_KEYS),
    search: listSearchSchema,
    unitIds: filterIdListSchema,
    excludeUnitIds: filterIdListSchema,
    /** `true` = unassigned only (no active/pending tenancy). */
    unitEmpty: filterEmptyFlagSchema,
    statusIn: z.array(z.enum(TENANCY_STATUSES)).optional(),
  })
  .optional()
export type ListTenantsInput = NonNullable<z.infer<typeof listTenantsInputSchema>>
