import { Resend } from 'resend'
import { render } from '@react-email/components'
import { VerifyEmail } from './email-templates/verify-email.js'
import { ResetPassword } from './email-templates/reset-password.js'
import { Invitation } from './email-templates/invitation.js'

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is required')
}
if (!process.env.RESEND_FROM_EMAIL) {
  throw new Error('RESEND_FROM_EMAIL is required (must be a verified domain or onboarding@resend.dev for dev)')
}

export const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL

export async function sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
  const html = await render(VerifyEmail({ verifyUrl }))
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Verify your Villuh email',
    html,
  })
}

export async function sendResetPasswordEmail(to: string, resetUrl: string): Promise<void> {
  const html = await render(ResetPassword({ resetUrl }))
  await resend.emails.send({
    from: FROM,
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
  await resend.emails.send({
    from: FROM,
    to,
    subject: `${inviterName} invited you to join ${orgName} on Villuh`,
    html,
  })
}
