import { hc, type InferResponseType } from 'hono/client'
import type { AppType } from '@villuh/server/app'

// Typed client for inference — URL doesn't matter for types, only for runtime calls.
// Use this to derive response types without writing them manually on the frontend.
const _typed = hc<AppType>('/')

// Inferred response types — never write these by hand on the frontend.
// Update here if you add/change a route's response shape on the server.
export type Me = InferResponseType<typeof _typed.api.me.$get, 200>

// Runtime client — routes through Next.js rewrite to Hono server.
// In the browser, calls go to window.location.origin/api/... which rewrites to Hono.
export const api = hc<AppType>(
  typeof window !== 'undefined'
    ? window.location.origin
    : (process.env.API_INTERNAL_URL ?? 'http://localhost:3001')
)
