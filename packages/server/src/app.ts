import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { health } from './routes/health.js'
import { auth } from './auth.js'
import { me } from './routes/me.js'
import { team } from './routes/team.js'
import { rolePerms } from './routes/role-permissions.js'
import { trialStart } from './routes/billing/trial-start.js'
import { setupIntent } from './routes/billing/setup-intent.js'
import { subscribe } from './routes/billing/subscribe.js'
import { upgrade } from './routes/billing/upgrade.js'
import { invoices } from './routes/billing/invoices.js'
import { paymentMethod } from './routes/billing/payment-method.js'
import { syncUnits } from './routes/billing/sync-units.js'

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
const routes = app
  .route('/api', health)
  .route('/api/me', me)
  .route('/api/team', team)
  .route('/api/role-permissions', rolePerms)
  .route('/api/billing/trial-start', trialStart)
  .route('/api/billing/setup-intent', setupIntent)
  .route('/api/billing/subscribe', subscribe)
  .route('/api/billing/upgrade', upgrade)
  .route('/api/billing/invoices', invoices)
  .route('/api/billing/payment-method', paymentMethod)
  .route('/api/billing/sync-units', syncUnits)
  .on('POST', '/webhooks/stripe/subscriptions', (c) => auth.handler(c.req.raw))
  .on(['POST', 'GET'], '/api/auth/*', (c) => auth.handler(c.req.raw))

// DO NOT add any global JSON body parser — webhook routes need raw body for Stripe
// signature verification (CLAUDE.md + RESEARCH.md Pitfall 4).

export default app
export type AppType = typeof routes
