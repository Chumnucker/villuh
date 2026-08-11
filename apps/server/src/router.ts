import { router } from './trpc.js'
import { meRouter } from './routers/me.js'
import { teamRouter } from './routers/team.js'
import { rolePermissionsRouter } from './routers/role-permissions.js'
import { accountRouter } from './routers/account.js'
import { auditLogRouter } from './routers/audit-log.js'
import { billingRouter } from './routers/billing.js'

export const appRouter = router({
  me: meRouter,
  team: teamRouter,
  rolePermissions: rolePermissionsRouter,
  account: accountRouter,
  auditLog: auditLogRouter,
  billing: billingRouter,
})

export type AppRouter = typeof appRouter
