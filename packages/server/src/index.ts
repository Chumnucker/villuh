import { serve } from '@hono/node-server'
import app from './app.js'

const server = serve({
  fetch: app.fetch,
  port: Number(process.env.PORT ?? 3001),
})

process.on('SIGINT', () => { server.close(); process.exit(0) })
process.on('SIGTERM', () => { server.close(); process.exit(0) })

console.log(`Hono server running on port ${process.env.PORT ?? 3001}`)
