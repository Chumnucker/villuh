import { createAuthClient } from 'better-auth/react'
import { organizationClient } from 'better-auth/client/plugins'
import { stripeClient } from '@better-auth/stripe/client'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
  plugins: [
    organizationClient(),
    stripeClient({ subscription: true }),
  ],
})

export type Session = typeof authClient.$Infer.Session
