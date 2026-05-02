import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { health } from './routes/health.js'
import { auth } from './auth.js'
import { me } from './routes/me.js'
import { team } from './routes/team.js'
import { rolePerms } from './routes/role-permissions.js'
import { account } from './routes/account.js'
import { auditLog } from './routes/audit-log.js'
import { trialStart } from './routes/billing/trial-start.js'
import { setupIntent } from './routes/billing/setup-intent.js'
import { subscribe } from './routes/billing/subscribe.js'
import { upgrade } from './routes/billing/upgrade.js'
import { invoices } from './routes/billing/invoices.js'
import { paymentMethod } from './routes/billing/payment-method.js'
import { syncUnits } from './routes/billing/sync-units.js'

const app = new Hono()

const allowedOrigins = (
  process.env.CORS_ALLOWED_ORIGINS ??
  process.env.NEXT_PUBLIC_APP_URL ??
  'http://localhost:3000,http://localhost:3002'
).split(',').map(s => s.trim()).filter(Boolean)

// CORS for regular API routes — safe to use hono/cors here because these handlers
// return via c.json() so Hono merges context headers into the response correctly.
// Explicitly excluded: /api/auth/* (handled manually below to avoid header duplication
// when Better Auth returns a raw Response that Hono can't cleanly merge into).
app.use('/api/*', async (c, next) => {
  if (c.req.path.startsWith('/api/auth')) return next()
  return cors({ origin: allowedOrigins, credentials: true })(c, next)
})

// CRITICAL: chain on `routes`, not reassignment — RPC type inference depends on chain.
// Route ordering: specific routes BEFORE auth.handler catch-all at /api/auth/*.
const routes = app
  .route('/api', health)
  .route('/api/me', me)
  .route('/api/team', team)
  .route('/api/role-permissions', rolePerms)
  .route('/api/account', account)
  .route('/api/audit-log', auditLog)
  .route('/api/billing/trial-start', trialStart)
  .route('/api/billing/setup-intent', setupIntent)
  .route('/api/billing/subscribe', subscribe)
  .route('/api/billing/upgrade', upgrade)
  .route('/api/billing/invoices', invoices)
  .route('/api/billing/payment-method', paymentMethod)
  .route('/api/billing/sync-units', syncUnits)
  .on('POST', '/webhooks/stripe/subscriptions', (c) => auth.handler(c.req.raw))
  // OPTIONS preflight for auth — must return 2xx or browser aborts the real request.
  .on('OPTIONS', '/api/auth/*', (c) => {
    const origin = c.req.header('origin') ?? ''
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    })
  })
  // Auth requests — wrap every raw Response to set (not append) correct CORS headers.
  .on(['POST', 'GET'], '/api/auth/*', async (c) => {
    const origin = c.req.header('origin') ?? ''
    const res = await auth.handler(c.req.raw)
    const headers = new Headers(res.headers)
    for (const [k, v] of Object.entries(corsHeaders(origin))) {
      headers.set(k, v)
    }
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
  })

// DO NOT add any global JSON body parser — webhook routes need raw body for Stripe
// signature verification.

export default app
export type AppType = typeof routes

function corsHeaders(origin: string): Record<string, string> {
  if (!origin) return {}
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
    'Vary': 'Origin',
  }
}
