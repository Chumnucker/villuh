// @villuh/auth — minimal Better Auth for Next.js server layouts (session reads only)
// Standalone minimal Better Auth instance for Node.js runtime session validation.
// Reads sessions from the same Postgres DB and signs them with the same BETTER_AUTH_SECRET
// as the Express server in apps/server. NO Stripe/Resend/org plugins — session reads only.
import 'server-only'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as authSchema from '@villuh/server/schema/auth'

if (!process.env.DATABASE_APP_URL) {
  throw new Error('DATABASE_APP_URL is required for Next.js Better Auth session reads')
}
if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error('BETTER_AUTH_SECRET is required (must match the Express server value)')
}

const client = postgres(process.env.DATABASE_APP_URL, { max: 2 })
const db = drizzle({ client, schema: authSchema })

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:4000',
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'pg', schema: authSchema }),
  // Must mirror apps/server/src/auth.ts session config exactly
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
})

export type Session = typeof auth.$Infer.Session
