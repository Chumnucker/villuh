import { createMiddleware } from 'hono/factory'
import { auth } from '../auth.js'

type Session = typeof auth.$Infer.Session

export type AuthVariables = {
  user: Session['user'] | null
  session: Session['session'] | null
}

export const authMiddleware = createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  c.set('user', session?.user ?? null)
  c.set('session', session?.session ?? null)
  await next()
})
