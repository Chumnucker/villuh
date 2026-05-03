import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// CRITICAL: Use DATABASE_URL (owner role) for migrations — never DATABASE_APP_URL.
const migrationClient = postgres(process.env.DATABASE_URL!, { max: 1 })
const migrationDb = drizzle({ client: migrationClient })

await migrate(migrationDb, { migrationsFolder: join(__dirname, '../migrations') })
await migrationClient.end()

console.log('Migrations applied successfully')
