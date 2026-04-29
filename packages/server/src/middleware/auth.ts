import { createMiddleware } from 'hono/factory'

// Phase 1 stub — full Better Auth implementation deferred to Phase 2.
// These type definitions are the permanent shape; Phase 2 populates the values.
type Variables = {
  user: { id: string; landlordId: string } | null
  session: { id: string } | null
}

export const authMiddleware = createMiddleware<{ Variables: Variables }>(async (c, next) => {
  c.set('user', null)
  c.set('session', null)
  await next()
})
