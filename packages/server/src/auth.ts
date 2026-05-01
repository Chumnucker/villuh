import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { organization } from 'better-auth/plugins'
import { stripe } from '@better-auth/stripe'
import { db } from '@villuh/db'
import * as authSchema from '@villuh/db/schema/auth'
import Stripe from 'stripe'
import {
  sendVerificationEmail,
  sendResetPasswordEmail,
  sendInvitationEmail,
} from './lib/email.js'
import {
  syncOrgSubscriptionTier,
  setOrgSubscriptionStatus,
  handlePaymentFailed,
} from './lib/billing.js'
import { seedDefaultPermissions } from './lib/permissions.js'

export const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
})

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL!,
  secret: process.env.BETTER_AUTH_SECRET!,
  database: drizzleAdapter(db, { provider: 'pg', schema: authSchema }),
  trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      void sendResetPasswordEmail(user.email, url)
    },
  },
  emailVerification: {
    sendOnSignIn: true,
    sendVerificationEmail: async ({ user, url }) => {
      void sendVerificationEmail(user.email, url)
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Auto-create org for the new user (D-01).
          // Session is not available here — hook runs server-side during user creation.
          // The organization plugin allows creating an org by userId directly (no session required).
          const slug = (user.name || user.email.split('@')[0])
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 32) + '-' + user.id.slice(0, 8)

          try {
            // auth.api is populated at runtime — this call is valid because hooks run after auth is initialized
            await (auth as typeof auth & { api: { createOrganization: (opts: { body: { name: string; slug: string; userId: string } }) => Promise<unknown> } }).api.createOrganization({
              body: {
                name: user.name || user.email.split('@')[0],
                slug,
                userId: user.id,
              },
            })
          } catch (err) {
            // Log but don't throw — failed org creation must not block user creation
            console.error('[auth] Failed to auto-create org for user', user.id, err)
          }
        },
      },
    },
  },
  plugins: [
    organization({
      schema: {
        organization: {
          additionalFields: {
            // MUST match Plan 02-01 schema generation defaults exactly
            setup_completed: { type: 'boolean', defaultValue: false, input: false },
            subscription_tier: { type: 'string', defaultValue: 'trial', input: false },
            // trial_pending until Plan 05 trial-start fires (D-19 vs D-33/D-39 reconciliation)
            subscription_status: { type: 'string', defaultValue: 'trial_pending', input: false },
            stripe_connected_account_id: { type: 'string', required: false, input: false },
          },
        },
      },
      sendInvitationEmail: async (data) => {
        const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invitation/${data.id}`
        void sendInvitationEmail(
          data.email,
          inviteLink,
          data.inviter.user.name,
          data.organization.name,
          data.role
        )
      },
      organizationHooks: {
        afterCreateOrganization: async ({ organization }) => {
          await seedDefaultPermissions(organization.id)
        },
      },
    }),
    stripe({
      stripeClient,
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
      createCustomerOnSignUp: false, // we create on org creation in Plan 05
      organization: { enabled: true },
      subscription: {
        enabled: true,
        plans: [
          {
            name: 'starter',
            priceId: process.env.STRIPE_STARTER_PRICE_ID!,
            limits: { units: 5, properties: 1, members: 2 },
          },
          {
            name: 'growth',
            priceId: process.env.STRIPE_GROWTH_PRICE_ID!,
            limits: { units: 20, properties: 5, members: 4 },
          },
          {
            name: 'pro',
            priceId: process.env.STRIPE_PRO_PRICE_ID!,
            limits: { units: 50, properties: -1, members: -1 },
            freeTrial: { days: 30 },
          },
        ],
        onSubscriptionCreated: async ({ subscription, plan }) => {
          await syncOrgSubscriptionTier(
            subscription.referenceId,
            plan?.name ?? 'trial',
            subscription.status
          )
        },
        onSubscriptionUpdate: async ({ subscription }) => {
          await syncOrgSubscriptionTier(
            subscription.referenceId,
            subscription.plan,
            subscription.status
          )
        },
        onSubscriptionDeleted: async ({ subscription }) => {
          await setOrgSubscriptionStatus(subscription.referenceId, 'expired')
        },
      },
      onEvent: async (event) => {
        if (event.type === 'invoice.payment_failed') {
          await handlePaymentFailed(event)
        }
      },
    }),
  ],
})

export type Session = typeof auth.$Infer.Session
