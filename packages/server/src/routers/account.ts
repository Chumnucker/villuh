import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc.js'
import { auth } from '../auth.js'

export const accountRouter = router({
  updateProfile: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(120) }))
    .mutation(async ({ ctx, input }) => {
      try {
        await auth.api.updateUser({ body: { name: input.name }, headers: ctx.headers })
      } catch (err) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: (err as Error).message })
      }
      return { ok: true }
    }),

  changePassword: protectedProcedure
    .input(z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8),
      revokeOtherSessions: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { currentPassword, newPassword, revokeOtherSessions } = input
      try {
        await auth.api.changePassword({
          body: {
            currentPassword,
            newPassword,
            revokeOtherSessions: revokeOtherSessions ?? true,
          },
          headers: ctx.headers,
        })
      } catch (err) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: (err as Error).message })
      }
      return { ok: true }
    }),
})
