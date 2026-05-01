import { describe, it, expect } from 'vitest'

describe('AUTH-03: Plan limit enforcement', () => {
  it('starter tier blocks 6th unit creation with 402 PLAN_LIMIT (D-18, D-41, D-42)', () => {
    expect.fail('TODO: Plan 06 implements checkPlanLimit middleware')
  })
  it('402 response shape matches D-42 exactly { code, resource, limit, current, upgrade_to }', () => {
    expect.fail('TODO: Plan 06 returns exact D-42 shape')
  })
  it('pro tier with -1 limit allows unlimited creation', () => {
    expect.fail('TODO: Plan 06 handles -1 limit as unlimited')
  })
})

describe('AUTH-04: Trial + subscription gate', () => {
  it('trialing status allows write actions (D-19)', () => {
    expect.fail('TODO: Plan 06 implements subscription gate')
  })
  it('expired status blocks all writes with 402 SUBSCRIPTION_REQUIRED (D-25, D-43)', () => {
    expect.fail('TODO: Plan 06 implements subscriptionExpiredGate')
  })
})
