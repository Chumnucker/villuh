import { meRouter } from './modules/me/router.js'
import { membersRouter } from './modules/members/router.js'
import { rolePermissionsRouter } from './modules/permissions/router.js'
import { accountRouter } from './modules/account/router.js'
import { auditLogRouter } from './modules/audit-log/router.js'
import { billingRouter } from './modules/billing/router.js'
import { propertiesRouter } from './modules/properties/router.js'
import { floorPlansRouter } from './modules/floor-plans/router.js'
import { uploadsRouter } from './modules/uploads/router.js'
import { unitsRouter } from './modules/units/router.js'
import { unitStatusesRouter } from './modules/unit-statuses/router.js'
import { tagsRouter } from './modules/tags/router.js'
import { tenantsRouter } from './modules/tenants/router.js'
import { router } from './trpc.js'

export const appRouter = router({
  me: meRouter,
  members: membersRouter,
  rolePermissions: rolePermissionsRouter,
  account: accountRouter,
  auditLog: auditLogRouter,
  billing: billingRouter,
  properties: propertiesRouter,
  floorPlans: floorPlansRouter,
  uploads: uploadsRouter,
  units: unitsRouter,
  unitStatuses: unitStatusesRouter,
  tags: tagsRouter,
  tenants: tenantsRouter,
})

export type AppRouter = typeof appRouter
