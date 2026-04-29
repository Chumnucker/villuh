import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema',
  out: './migrations',
  dbCredentials: { url: process.env.DATABASE_URL! },
  // entities.roles: true allows pgRole() references in schema without errors
  entities: { roles: true },
})
