import { router, protectedProcedure } from '../../trpc.js'
import { auth } from '../auth/index.js'
import { badRequest } from '../../domain/index.js'
import {
  changePasswordInputSchema,
  updateProfileInputSchema,
} from './schemas.js'

export const accountRouter = router({
  updateProfile: protectedProcedure
    .input(updateProfileInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        await auth.api.updateUser({ body: { name: input.name }, headers: ctx.headers })
      } catch (err) {
        badRequest((err as Error).message)
      }
      return { ok: true }
    }),

  changePassword: protectedProcedure
    .input(changePasswordInputSchema)
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
        badRequest((err as Error).message)
      }
      return { ok: true }
    }),
})
