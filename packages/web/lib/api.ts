import { hc } from 'hono/client'
import type { AppType } from '@villuh/server/app'

/**
 * Type-safe Hono RPC client.
 * Usage: const res = await api.api.health.$get()
 * NEXT_PUBLIC_API_URL must be set in packages/web/.env.local for local dev.
 */
export const api = hc<AppType>(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001')
