// packages/web/lib/auth-server.ts
// Standalone minimal Better Auth instance for Next.js middleware (Node.js runtime).
// Reads sessions from the same Postgres DB and signs them with the same BETTER_AUTH_SECRET
// as the Hono server in packages/server. NO Stripe/Resend/org plugins — session reads only.
import 'server-only'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as authSchema from '@villuh/db/schema/auth'

if (!process.env.DATABASE_APP_URL) {
  throw new Error('DATABASE_APP_URL is required for Next.js middleware Better Auth instance')
}
if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error('BETTER_AUTH_SECRET is required (must match the Hono server value)')
}

const client = postgres(process.env.DATABASE_APP_URL, { max: 2 })
const db = drizzle({ client, schema: authSchema })

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3001',
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'pg', schema: authSchema }),
  // No emailAndPassword/socialProviders/plugins blocks — middleware only reads sessions.
  // Better Auth's getSession works without these because session validation only needs
  // the secret + database adapter. Mutations (signup, signin, etc.) hit the Hono server's
  // full instance via /api/auth/* (proxied through NEXT_PUBLIC_API_URL).
})

export type Session = typeof auth.$Infer.Session
