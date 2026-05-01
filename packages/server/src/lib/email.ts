import { Resend } from 'resend'
import { render } from '@react-email/components'
import { VerifyEmail } from './email-templates/verify-email.js'
import { ResetPassword } from './email-templates/reset-password.js'
import { Invitation } from './email-templates/invitation.js'

// Lazy initialization — env vars validated at call time so tests can mock this module
// without RESEND_API_KEY being set.
function getResendClient(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is required')
  }
  return new Resend(process.env.RESEND_API_KEY)
}

function getFromEmail(): string {
  if (!process.env.RESEND_FROM_EMAIL) {
    throw new Error('RESEND_FROM_EMAIL is required (must be a verified domain or onboarding@resend.dev for dev)')
  }
  return process.env.RESEND_FROM_EMAIL
}

// Export resend for direct use by callers who need the client (e.g. Plan 07 notifications)
export const resend = new Proxy({} as Resend, {
  get(_target, prop) {
    return (getResendClient() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

export async function sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
  const html = await render(VerifyEmail({ verifyUrl }))
  await getResendClient().emails.send({
    from: getFromEmail(),
    to,
    subject: 'Verify your Villuh email',
    html,
  })
}

export async function sendResetPasswordEmail(to: string, resetUrl: string): Promise<void> {
  const html = await render(ResetPassword({ resetUrl }))
  await getResendClient().emails.send({
    from: getFromEmail(),
    to,
    subject: 'Reset your Villuh password',
    html,
  })
}

export async function sendInvitationEmail(
  to: string,
  inviteUrl: string,
  inviterName: string,
  orgName: string,
  role: string
): Promise<void> {
  const html = await render(Invitation({ inviteUrl, inviterName, orgName, role }))
  await getResendClient().emails.send({
    from: getFromEmail(),
    to,
    subject: `${inviterName} invited you to join ${orgName} on Villuh`,
    html,
  })
}
