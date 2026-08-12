# Villuh Lease

Landlord operating system — monorepo (Turborepo + pnpm).

## Monorepo

```
apps/
  landlord-web/   # Landlord Next.js app (@villuh/landlord-web) → {slug}.app.villuh.com
  resident-web/   # Resident Next.js app (@villuh/resident-web) → {slug}.villuh.com
  server/         # Express + tRPC API (@villuh/server)
packages/
  ui/             # Shared design system (@villuh/ui)
  auth/           # Shared Better Auth client/server + forms (@villuh/auth)
  api/            # Shared tRPC client + provider (@villuh/api)
  typescript-config/
  eslint-config/
```

Local ports: landlord `:3000`, resident `:3001`, API `:4000`.

```bash
pnpm install
pnpm db:setup     # Docker Postgres + roles + env files + migrate villuh & villuh_test
pnpm menu         # interactive developer CLI
pnpm dev          # turbo run dev (landlord + resident + server)
pnpm dev:landlord
pnpm dev:resident
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm migrate
```

## Adding components

Add shared UI to `packages/ui` (preferred):

```bash
pnpm --filter @villuh/ui exec shadcn@latest add button
```
