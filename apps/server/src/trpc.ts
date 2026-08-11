import { initTRPC, TRPCError } from '@trpc/server'
import type { Context } from './context.js'
import type { ActionCategory, Role } from './lib/permissions.js'
import { isAllowed } from './lib/permissions.js'
import { auth } from './auth.js'

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure

const withAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.user || !ctx.session) throw new TRPCError({ code: 'UNAUTHORIZED' })
  const landlordId = (ctx.session as { activeOrganizationId?: string }).activeOrganizationId
  if (!landlordId) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'No active organization' })
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      session: ctx.session,
      landlordId,
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
    const role = (memberResponse as { role?: Role } | null)?.role
    if (!role) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a member of this organization' })
    const allowed = await isAllowed(ctx.landlordId, role, action)
    if (!allowed) throw new TRPCError({ code: 'FORBIDDEN', message: `${action} permission required` })
    return next()
  })
}
