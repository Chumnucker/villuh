import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { health } from './routes/health.js'
import { auth } from './auth.js'
import { account } from './routes/account.js'
import { auditLog } from './routes/audit-log.js'
import { rolePerms } from './routes/role-permissions.js'

const app = new Hono()

app.use('/api/*', cors({
  origin: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  credentials: true,
}))

// CRITICAL: chain on `routes`, not reassignment — RPC type inference depends on chain.
// CLAUDE.md canonical webhook path: /webhooks/stripe/subscriptions must match the
// operator-configured Stripe webhook URL. This alias MUST be registered BEFORE the
// /api/auth/* catch-all so it wins the route match.
// Better Auth's internal /api/auth/stripe/webhook also works; the alias here ensures
// the Stripe Dashboard webhook config matches CLAUDE.md exactly.
//
// Route ordering: specific routes BEFORE auth.handler catch-all at /api/auth/*.
const routes = app
  .route('/api', health)
  .route('/api/account', account)
  .route('/api/audit-log', auditLog)
  .route('/api/role-permissions', rolePerms)
  .on('POST', '/webhooks/stripe/subscriptions', (c) => auth.handler(c.req.raw))
  .on(['POST', 'GET'], '/api/auth/*', (c) => auth.handler(c.req.raw))

// DO NOT add any global JSON body parser — webhook routes handled by auth.handler
// need raw body for Stripe signature verification (CLAUDE.md + RESEARCH.md Pitfall 4).

export default app
export type AppType = typeof routes
