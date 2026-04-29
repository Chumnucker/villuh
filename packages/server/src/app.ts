import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { health } from './routes/health.js'

const app = new Hono()

app.use('/api/*', cors({
  origin: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  credentials: true,
}))

// CRITICAL: Use method chaining on 'routes', not reassignment.
// Type inference for AppType depends on the chain being preserved.
const routes = app
  .route('/api', health)

export default app
export type AppType = typeof routes
