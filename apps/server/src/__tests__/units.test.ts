import { describe, it, expect } from 'vitest'

describe('UNIT-01: Unit CRUD', () => {
  it('owner/manager can create a unit under a property with label/sqft/base_rent/status (D-10)', () => {
    expect.fail('TODO: Plan 03-04 implements units.create')
  })
  it('update mutates unit fields and returns the updated unit', () => {
    expect.fail('TODO: Plan 03-04 implements units.update')
  })
  it('creating a unit for another organization\'s property is rejected (RLS + ownership check)', () => {
    expect.fail('TODO: Plan 03-04 validates property_id belongs to caller org')
  })
})

describe('UNIT-01: Plan limit enforcement (D-39-D-43)', () => {
  it('creating a unit at/over plan limit returns FORBIDDEN with appCode PLAN_LIMIT', () => {
    expect.fail('TODO: Plan 03-04 wires checkPlanLimit for resource=units')
  })
  it('pro tier with -1 unit limit allows unlimited unit creation', () => {
    expect.fail('TODO: Plan 03-04 handles -1 limit as unlimited')
  })
})

describe('UNIT-01: Stripe metered billing sync (D-21, Pattern 8)', () => {
  it('unit create triggers syncUnits with the active unit count for the org subscription', () => {
    expect.fail('TODO: Plan 03-04 calls billing syncUnits helper after create')
  })
  it('unit archive triggers syncUnits with the decremented active unit count', () => {
    expect.fail('TODO: Plan 03-04 calls billing syncUnits helper after archive')
  })
})

describe('UNIT-01: Soft-archive (D-32)', () => {
  it('archiving a unit sets archived_at and excludes it from units.list', () => {
    expect.fail('TODO: Plan 03-04 implements units.archive')
  })
})
