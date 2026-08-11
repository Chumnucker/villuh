import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    setupFiles: ['./src/__tests__/setup.ts'],
    pool: 'forks',                  // Better Auth + Postgres connection isolation
    singleFork: true,               // Serialize DB-touching tests (was poolOptions.forks.singleFork)
    testTimeout: 15000,
    hookTimeout: 15000,
    // Default env vars for tests — real values supplied via .env file
    // These placeholders allow module initialization to succeed even without a .env;
    // tests that actually call Better Auth endpoints will fail without real values.
    // Set real values in apps/server/.env (see .env.example).
    env: {
      // Better Auth — required for betterAuth() initialization
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? 'http://localhost:4000',
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? 'test-secret-for-vitest-32-bytes-!!',
      // Stripe — required for stripeClient initialization (no actual API calls in tests)
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder_for_vitest',
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? 'whsec_test_placeholder',
      STRIPE_STARTER_PRICE_ID: process.env.STRIPE_STARTER_PRICE_ID ?? 'price_starter_test',
      STRIPE_GROWTH_PRICE_ID: process.env.STRIPE_GROWTH_PRICE_ID ?? 'price_growth_test',
      STRIPE_PRO_PRICE_ID: process.env.STRIPE_PRO_PRICE_ID ?? 'price_pro_test',
      // Google OAuth
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? 'google_client_id_test',
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? 'google_client_secret_test',
      // Resend — mocked in auth tests; lazy init in email.ts avoids env check at load time
      RESEND_API_KEY: process.env.RESEND_API_KEY ?? 're_test_placeholder',
      RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL ?? 'noreply@test.local',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
      // Database — @villuh/db uses DATABASE_APP_URL for the runtime connection
      // In tests, we point it at the test DB (villuh_app role, RLS enforced)
      DATABASE_APP_URL: process.env.DATABASE_APP_URL ??
        process.env.DATABASE_TEST_URL ??
        'postgres://villuh_app:villuh_app_password_changeme@localhost:5432/villuh_test',
    },
  },
})
