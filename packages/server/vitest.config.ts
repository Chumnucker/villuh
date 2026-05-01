import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    setupFiles: ['./src/__tests__/setup.ts'],
    pool: 'forks',                  // Better Auth + Postgres connection isolation
    singleFork: true,               // Serialize DB-touching tests (was poolOptions.forks.singleFork)
    testTimeout: 10000,
    hookTimeout: 10000,
  },
})
