import { describe, it, expect } from 'vitest'

describe('PROP-01: Property CRUD', () => {
  it('owner/manager can create a property with name + structured address (D-11)', () => {
    expect.fail('TODO: Plan 03-03 implements properties.create')
  })
  it('update mutates name/address/phone/notes and returns the updated property', () => {
    expect.fail('TODO: Plan 03-03 implements properties.update')
  })
  it('creating at plan limit returns FORBIDDEN with appCode PLAN_LIMIT (D-39-D-43)', () => {
    expect.fail('TODO: Plan 03-03 wires checkPlanLimit for resource=properties')
  })
})

describe('PROP-01: Notes sanitization (D-15)', () => {
  it('strips <script> and event-handler attributes from TipTap HTML before persisting', () => {
    expect.fail('TODO: Plan 03-03 implements sanitizeNotesHtml allowlist')
  })
  it('allows the locked TipTap subset tags (p, strong, em, ul, ol, li, a, h2, h3)', () => {
    expect.fail('TODO: Plan 03-03 implements sanitizeNotesHtml allowlist')
  })
})

describe('PROP-01: Soft-archive cascade (D-30, D-31)', () => {
  it('archiving a property sets archived_at and excludes it from properties.list', () => {
    expect.fail('TODO: Plan 03-03 implements properties.archive')
  })
  it('archiving a property cascades archived_at to all of its units in one transaction', () => {
    expect.fail('TODO: Plan 03-03 implements cascade archive transaction')
  })
  it('archived properties/units are excluded from plan-limit and Stripe unit counts', () => {
    expect.fail('TODO: Plan 03-03/03-04 implement countActiveProperties/countActiveUnits')
  })
})

describe('Cross: RLS isolation across organizations', () => {
  it('org A cannot read or mutate org B properties via properties.get/update/archive', () => {
    expect.fail('TODO: Plan 03-02 adds properties table RLS policy; Plan 03-03 exercises it')
  })
})
