import express from 'express'
import cors from 'cors'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { toNodeHandler } from 'better-auth/node'
import { appRouter } from './router.js'
import { createContext } from './context.js'
import { auth } from './modules/auth/index.js'

const app = express()

const allowedOrigins = (
  process.env.CORS_ALLOWED_ORIGINS ??
  process.env.NEXT_PUBLIC_APP_URL ??
  'http://localhost:3000,http://localhost:3002'
).split(',').map((s) => s.trim()).filter(Boolean)

app.use(cors({ origin: allowedOrigins, credentials: true }))

// Stripe webhooks — raw body must be preserved for signature verification
app.post(
  '/webhooks/stripe/subscriptions',
  express.raw({ type: '*/*' }),
  toNodeHandler(auth) as express.RequestHandler,
)

// Better Auth handles all /api/auth/* routes
app.all('/api/auth/*splat', toNodeHandler(auth) as express.RequestHandler)

// Health check
app.get('/api/health', (_req, res) => { res.json({ ok: true, ts: Date.now() }) })

// tRPC
app.use('/trpc', createExpressMiddleware({ router: appRouter, createContext }))

export default app
export type { AppRouter } from './router.js'
