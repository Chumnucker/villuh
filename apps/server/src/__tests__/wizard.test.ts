import { describe, it, expect } from 'vitest'

describe('AUTH-08: Setup wizard', () => {
  it('newly authed user has setup_completed=false on org row (D-36)', () => {
    expect.fail('TODO: Plan 02 sets default setup_completed=false')
  })
  it('wizard step 1 creates property and persists (D-34)', () => {
    expect.fail('TODO: Plan 06 implements wizard step API')
  })
  it('wizard step 4 trial-start sets setup_completed=true (D-39)', () => {
    expect.fail('TODO: Plan 06 wires step 4 trial start to setup_completed flip')
  })
  it('Next.js middleware redirects authed user without setup_completed to /onboarding (D-49)', () => {
    expect.fail('TODO: Plan 06 implements Next.js middleware')
  })
  it('wizard resume detects first incomplete step on reload (D-35)', () => {
    expect.fail('TODO: Plan 06 implements server-derived step state')
  })
})
