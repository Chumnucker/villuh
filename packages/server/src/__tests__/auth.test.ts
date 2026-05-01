import { describe, it, expect } from 'vitest'

describe('AUTH-01: Email/password signup', () => {
  it('signup creates user + organization + session (Plan 02 will implement)', () => {
    expect.fail('TODO: Plan 02 implements Better Auth signup with auto-org creation')
  })
  it('signup requires email verification before app access (D-04)', () => {
    expect.fail('TODO: Plan 02 implements requireEmailVerification flow')
  })
  it('login with valid credentials returns session (D-02)', () => {
    expect.fail('TODO: Plan 02 implements signin')
  })
})

describe('AUTH-01: Google OAuth', () => {
  it('Google OAuth state param is validated', () => {
    expect.fail('TODO: Plan 02 wires socialProviders.google with state validation')
  })
})

describe('AUTH-09: Password reset', () => {
  it('forgot-password sends Resend email with reset token (D-06)', () => {
    expect.fail('TODO: Plan 02 wires sendResetPassword with Resend')
  })
  it('reset token is single-use and time-limited', () => {
    expect.fail('TODO: Plan 02 implements password reset confirmation')
  })
})
