import { defineConfig } from "vitest/config"

// Node environment only. This project exists to test the pure URL parsers and
// the key registry (D-46) — there is no jsdom, no @testing-library/react, and
// no browser mode anywhere in this monorepo. Component behaviour for phase 03.1
// is manually verified; see .planning/phases/03.1-url-query-state/03.1-VALIDATION.md.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/query-state/**/*.test.ts"],
  },
})
