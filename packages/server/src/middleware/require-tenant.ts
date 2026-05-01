import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { AuthVariables } from './auth.js'

/**
 * Resolve landlordId from Better Auth session for use with withTenant.
 * landlordId = session.activeOrganizationId per CLAUDE.md (NOT user.id — RESEARCH.md Pitfall 7).
 * Throws 401 if user is not authenticated or has no active org.
 */
export async function requireTenant(
  c: Context<{ Variables: AuthVariables }>
): Promise<{ landlordId: string; userId: string }> {
  const user = c.get('user')
  const session = c.get('session')
  if (!user) throw new HTTPException(401, { message: 'Unauthorized' })
  // session.activeOrganizationId is set by Better Auth org plugin after authClient.organization.setActive()
  const landlordId = (session as { activeOrganizationId?: string } | null)?.activeOrganizationId
  if (!landlordId) throw new HTTPException(401, { message: 'No active organization' })
  return { landlordId, userId: user.id }
}
