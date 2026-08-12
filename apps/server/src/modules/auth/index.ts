import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { organization } from 'better-auth/plugins'
import { stripe } from '@better-auth/stripe'
import { dash } from '@better-auth/infra'
import { db } from '../../db/index.js'
import { resolveFirstOrganizationId } from './active-organization.js'
import * as authSchema from '../../schema/auth.js'
import {
  sendVerificationEmail,
  sendResetPasswordEmail,
  sendInvitationEmail,
} from '../email/index.js'
import {
  syncOrgSubscriptionTier,
  setOrgSubscriptionStatus,
  handlePaymentFailed,
} from '../billing/service.js'
import { seedDefaultPermissions } from '../permissions/service.js'

import { createOrgAccessRoles } from './access-control.js'
import { stripeClient } from './stripe.js'
import { loadStripePluginPlans } from '../billing/plans.js'

const { ownerRole, adminRole, memberRole, managerRole, viewerRole } = createOrgAccessRoles()

// Plans + Stripe price IDs loaded from billing_plans (DB source of truth).
const stripePluginPlans = await loadStripePluginPlans()

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL!,
  secret: process.env.BETTER_AUTH_SECRET!,
  database: drizzleAdapter(db, { provider: 'pg', schema: authSchema }),
  trustedOrigins: (
    process.env.CORS_ALLOWED_ORIGINS ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'http://localhost:3000,http://localhost:3002'
  ).split(',').map(s => s.trim()).filter(Boolean),

  // 30-day sliding window — auto-refreshes when < 1 day remains
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
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
    session: {
      create: {
        // Better Auth will not pick an active org for us (multi-org by design).
        // Stamp it onto the row *before* insert so the session cookie has it
        // on first login the same as every later login.
        before: async (session) => {
          if ((session as { activeOrganizationId?: string }).activeOrganizationId) {
            return { data: session }
          }
          const orgId = await resolveFirstOrganizationId(session.userId)
          if (!orgId) return { data: session }
          return {
            data: {
              ...session,
              activeOrganizationId: orgId,
            },
          }
        },
      },
    },
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
    dash(),
    organization({
      // Register all roles (built-in + custom) so Better Auth access-control checks work correctly.
      // When roles is set, Better Auth replaces defaultRoles — we must include owner/admin/member.
      roles: {
        owner: ownerRole,
        admin: adminRole,
        member: memberRole,
        manager: managerRole,
        viewer: viewerRole,
      },
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
        plans: stripePluginPlans,
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
export { stripeClient } from './stripe.js'
