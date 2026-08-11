# Next.js template

This is a Next.js template with shadcn/ui.

## Monorepo

```
apps/
  web/       # Next.js frontend (@villuh/web)
  server/    # Hono API (@villuh/server)
packages/
  typescript-config/
  eslint-config/
```

```bash
pnpm install
pnpm dev          # turbo run dev (web + server)
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm migrate
```

## Adding components

To add components to your app, run from `apps/web`:

```bash
pnpm --filter @villuh/web exec shadcn@latest add button
```
