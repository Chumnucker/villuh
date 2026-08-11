/**
 * Owner-role hydrate: fill empty billing_plans.stripe_price_id from env once.
 * Env key convention: STRIPE_{SLUG}_PRICE_ID (slug uppercased).
 * Called from migrate.ts — app role is SELECT-only on this table.
 */
import { sql } from 'drizzle-orm'

type SqlExecutor = {
  execute: (query: ReturnType<typeof sql>) => Promise<unknown>
}

function priceEnvKey(slug: string): string {
  return `STRIPE_${slug.toUpperCase()}_PRICE_ID`
}

export async function hydrateBillingPlanPricesFromEnv(migrationDb: SqlExecutor): Promise<void> {
  const rows = (await migrationDb.execute(sql`
    SELECT slug FROM billing_plans
    WHERE stripe_price_id IS NULL OR stripe_price_id = ''
  `)) as unknown as { slug: string }[]

  for (const { slug } of rows) {
    const priceId = process.env[priceEnvKey(slug)]?.trim()
    if (!priceId) continue

    await migrationDb.execute(sql`
      UPDATE billing_plans
      SET stripe_price_id = ${priceId}
      WHERE slug = ${slug}
        AND (stripe_price_id IS NULL OR stripe_price_id = '')
    `)
  }
}
