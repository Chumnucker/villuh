import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import type { AuthVariables } from './auth.js'
import { auth } from '../auth.js'
import { isAllowed, type ActionCategory, type Role } from '../lib/permissions.js'

/**
 * Factory: returns Hono middleware that 403s if the active member's role lacks the given action permission.
 * Owner role always passes (D-09).
 *
 * Usage:
 *   app.post('/api/properties', authMiddleware, requirePermission('write'), handler)
 */
export function requirePermission(action: ActionCategory) {
  return createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    const user = c.get('user')
    const session = c.get('session')
    if (!user || !session) throw new HTTPException(401, { message: 'Unauthorized' })

    const orgId = (session as { activeOrganizationId?: string }).activeOrganizationId
    if (!orgId) throw new HTTPException(401, { message: 'No active organization' })

    // Look up the active member's role via Better Auth org API
    const memberResponse = await auth.api
      .getActiveMember({ headers: c.req.raw.headers })
      .catch(() => null)
    const role = (memberResponse as { role?: Role } | null)?.role
    if (!role) throw new HTTPException(403, { message: 'Not a member of this organization' })

    const allowed = await isAllowed(orgId, role, action)
    if (!allowed)
      throw new HTTPException(403, { message: `Forbidden: ${action} permission required` })

    await next()
  })
}
