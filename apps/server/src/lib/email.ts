import { Resend } from 'resend'
import { render } from '@react-email/components'
import { VerifyEmail } from './email-templates/verify-email.js'
import { ResetPassword } from './email-templates/reset-password.js'
import { Invitation } from './email-templates/invitation.js'

// Lazy initialization — env vars validated at call time so tests can mock this module
// without RESEND_API_KEY being set.
function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  return new Resend(process.env.RESEND_API_KEY)
}

function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
}

// Export resend for direct use by callers who need the client (e.g. Plan 07 notifications)
export const resend = new Proxy({} as Resend, {
  get(_target, prop) {
    const client = getResendClient()
    if (!client) throw new Error('RESEND_API_KEY is required to use resend directly')
    return (client as unknown as Record<string | symbol, unknown>)[prop]
  },
})

export async function sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
  const client = getResendClient()
  if (!client) { console.warn(`[email] RESEND_API_KEY not set — skipping verification email to ${to}. URL: ${verifyUrl}`); return }
  const html = await render(VerifyEmail({ verifyUrl }))
  await client.emails.send({ from: getFromEmail(), to, subject: 'Verify your Villuh email', html })
}

export async function sendResetPasswordEmail(to: string, resetUrl: string): Promise<void> {
  const client = getResendClient()
  if (!client) { console.warn(`[email] RESEND_API_KEY not set — skipping reset email to ${to}. URL: ${resetUrl}`); return }
  const html = await render(ResetPassword({ resetUrl }))
  await client.emails.send({ from: getFromEmail(), to, subject: 'Reset your Villuh password', html })
}

export async function sendInvitationEmail(
  to: string,
  inviteUrl: string,
  inviterName: string,
  orgName: string,
  role: string
): Promise<void> {
  const client = getResendClient()
  if (!client) { console.warn(`[email] RESEND_API_KEY not set — skipping invitation email to ${to}. URL: ${inviteUrl}`); return }
  const html = await render(Invitation({ inviteUrl, inviterName, orgName, role }))
  await client.emails.send({ from: getFromEmail(), to, subject: `${inviterName} invited you to join ${orgName} on Villuh`, html })
}
