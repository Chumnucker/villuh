import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { authMiddleware, type AuthVariables } from '../middleware/auth.js'
import { requireTenant } from '../middleware/require-tenant.js'
import { auth } from '../auth.js'
import { HTTPException } from 'hono/http-exception'

const updateProfileSchema = z.object({
  name: z.string().min(1).max(120),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
  revokeOtherSessions: z.boolean().optional(),
})

/**
 * Account settings endpoints (SETT-01).
 *
 * PUT /api/account        — update current user's display name via Better Auth updateUser
 * POST /api/account/password — rotate password via Better Auth changePassword
 *
 * Both use the session cookie as the identity source — Better Auth identifies the caller
 * from headers and operates only on the session's own user (T-2-S07: cannot target another user).
 */
export const account = new Hono<{ Variables: AuthVariables }>()
  .put('/', authMiddleware, zValidator('json', updateProfileSchema), async (c) => {
    await requireTenant(c) // 401 if not authenticated / no active org
    const { name } = c.req.valid('json')
    try {
      await auth.api.updateUser({ body: { name }, headers: c.req.raw.headers })
    } catch (err) {
      throw new HTTPException(400, { message: (err as Error).message })
    }
    return c.json({ ok: true })
  })
  .post(
    '/password',
    authMiddleware,
    zValidator('json', changePasswordSchema),
    async (c) => {
      await requireTenant(c) // 401 if not authenticated / no active org
      const { currentPassword, newPassword, revokeOtherSessions } = c.req.valid('json')
      try {
        await auth.api.changePassword({
          body: {
            currentPassword,
            newPassword,
            revokeOtherSessions: revokeOtherSessions ?? true,
          },
          headers: c.req.raw.headers,
        })
      } catch (err) {
        throw new HTTPException(400, { message: (err as Error).message })
      }
      return c.json({ ok: true })
    }
  )
