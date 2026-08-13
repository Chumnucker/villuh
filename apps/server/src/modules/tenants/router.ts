import { router, protectedProcedure, permissionProcedure } from '../../trpc.js'
import { withOrganization } from '../../db/index.js'
import {
  createTenantInputSchema, updateTenantInputSchema, tenantIdInputSchema, listTenantsInputSchema,
  createTenancyInputSchema, updateTenancyInputSchema, tenancyIdInputSchema, addCoTenantInputSchema, removeMemberInputSchema,
  tenantActivityInputSchema, unitTenancyHistoryInputSchema,
} from './schemas.js'
import {
  listTenants, getTenant, createTenant, updateTenant, archiveTenant,
  createTenancy, updateTenancy, endTenancy, addCoTenant, removeMember, getTenantActivity,
  getUnitTenancyHistory,
} from './service.js'

export const tenantsRouter = router({
  list: protectedProcedure.input(listTenantsInputSchema).query(({ ctx, input }) =>
    withOrganization(ctx.organizationId, ctx.userId, (tx) => listTenants(tx, ctx.organizationId, input))),

  get: protectedProcedure.input(tenantIdInputSchema).query(({ ctx, input }) =>
    withOrganization(ctx.organizationId, ctx.userId, (tx) => getTenant(tx, ctx.organizationId, input.tenantId))),

  activity: protectedProcedure.input(tenantActivityInputSchema).query(({ ctx, input }) =>
    withOrganization(ctx.organizationId, ctx.userId, (tx) => getTenantActivity(tx, ctx.organizationId, input))),

  unitTenancyHistory: protectedProcedure.input(unitTenancyHistoryInputSchema).query(({ ctx, input }) =>
    withOrganization(ctx.organizationId, ctx.userId, (tx) => getUnitTenancyHistory(tx, ctx.organizationId, input.unitId))),

  create: permissionProcedure('write').input(createTenantInputSchema).mutation(({ ctx, input }) =>
    withOrganization(ctx.organizationId, ctx.userId, (tx) => createTenant(tx, ctx.organizationId, input)).then((tenant) => ({ tenant }))),

  update: permissionProcedure('write').input(updateTenantInputSchema).mutation(({ ctx, input }) =>
    withOrganization(ctx.organizationId, ctx.userId, (tx) => updateTenant(tx, ctx.organizationId, input)).then((tenant) => ({ tenant }))),

  archive: permissionProcedure('write').input(tenantIdInputSchema).mutation(({ ctx, input }) =>
    withOrganization(ctx.organizationId, ctx.userId, (tx) => archiveTenant(tx, ctx.organizationId, input.tenantId)).then((tenant) => ({ tenant }))),

  createTenancy: permissionProcedure('write').input(createTenancyInputSchema).mutation(({ ctx, input }) =>
    withOrganization(ctx.organizationId, ctx.userId, (tx) => createTenancy(tx, ctx.organizationId, input)).then((tenancy) => ({ tenancy }))),

  updateTenancy: permissionProcedure('write').input(updateTenancyInputSchema).mutation(({ ctx, input }) =>
    withOrganization(ctx.organizationId, ctx.userId, (tx) => updateTenancy(tx, ctx.organizationId, input)).then((tenancy) => ({ tenancy }))),

  endTenancy: permissionProcedure('write').input(tenancyIdInputSchema).mutation(({ ctx, input }) =>
    withOrganization(ctx.organizationId, ctx.userId, (tx) => endTenancy(tx, ctx.organizationId, input.tenancyId)).then((tenancy) => ({ tenancy }))),

  addCoTenant: permissionProcedure('write').input(addCoTenantInputSchema).mutation(({ ctx, input }) =>
    withOrganization(ctx.organizationId, ctx.userId, (tx) => addCoTenant(tx, ctx.organizationId, input)).then((member) => ({ member }))),

  removeMember: permissionProcedure('write').input(removeMemberInputSchema).mutation(({ ctx, input }) =>
    withOrganization(ctx.organizationId, ctx.userId, (tx) => removeMember(tx, ctx.organizationId, input)).then(() => ({ ok: true as const }))),
})
