import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema/index.js'

// CRITICAL: DATABASE_APP_URL must connect as the 'villuh_app' non-owner role.
// Using DATABASE_URL (owner) here would silently bypass ALL RLS policies.
const queryClient = postgres(process.env.DATABASE_APP_URL!)
export const db = drizzle({ client: queryClient, schema })
