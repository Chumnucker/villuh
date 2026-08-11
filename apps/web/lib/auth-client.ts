import { createAuthClient } from 'better-auth/react'
import { organizationClient } from 'better-auth/client/plugins'
import { stripeClient } from '@better-auth/stripe/client'
import { dashClient } from '@better-auth/infra/client'

export const authClient = createAuthClient({
  plugins: [
    organizationClient(),
    stripeClient({ subscription: true }),
    dashClient(),
  ],
})

export type Session = typeof authClient.$Infer.Session
