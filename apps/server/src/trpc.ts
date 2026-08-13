import { initTRPC } from '@trpc/server'
import type { Context } from './context.js'
import type { ActionCategory } from './domain/index.js'
import { isRole, isAppErrorCause, unauthorized, forbidden } from './domain/index.js'
import { isAllowed } from './modules/permissions/service.js'
import { auth } from './modules/auth/index.js'

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    const cause = error.cause
    if (!isAppErrorCause(cause)) {
      return shape
    }
    return {
      ...shape,
      data: {
        ...shape.data,
        appCode: cause.appCode,
        meta: cause.meta,
      },
    }
  },
})

export const router = t.router
export const publicProcedure = t.procedure

const withAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.user || !ctx.session) unauthorized()
  const organizationId = (ctx.session as { activeOrganizationId?: string }).activeOrganizationId
  if (!organizationId) unauthorized('No active organization')
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      session: ctx.session,
      organizationId,
      userId: ctx.user.id,
    },
  })
})

export const protectedProcedure = t.procedure.use(withAuth)

export function permissionProcedure(action: ActionCategory) {
  return protectedProcedure.use(async ({ ctx, next }) => {
    const memberResponse = await auth.api
      .getActiveMember({ headers: ctx.headers })
      .catch(() => null)
    const role = (memberResponse as { role?: string } | null)?.role
    if (!role) forbidden('Not a member of this organization')
    // Reject roles outside our own set here rather than letting one reach the
    // `org_role` enum in `role_permissions` — same deny outcome, no failed query.
    if (!isRole(role)) forbidden('Unrecognized organization role')
    const allowed = await isAllowed(ctx.organizationId, role, action)
    if (!allowed) forbidden(`${action} permission required`)
    return next()
  })
}
