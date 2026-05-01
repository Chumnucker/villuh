import { describe, it, expect } from 'vitest'

describe('AUTH-02: Configurable role_permissions (D-07 to D-15)', () => {
  it('owner role bypasses role_permissions check (D-09)', () => {
    expect.fail('TODO: Plan 04 implements requirePermission with owner short-circuit')
  })
  it('viewer role denied write action returns 403 (D-09)', () => {
    expect.fail('TODO: Plan 04 implements role_permissions enforcement')
  })
  it('manager allowed admin action returns 200 when role_permissions row allowed=true (D-10)', () => {
    expect.fail('TODO: Plan 04 implements per-action permission lookup')
  })
  it('owner can update role_permissions for an org via /settings/team (D-15)', () => {
    expect.fail('TODO: Plan 07 wires role permissions edit UI to backend')
  })
})

describe('SETT-01: Settings access control', () => {
  it('non-owner cannot access settings/billing without admin permission', () => {
    expect.fail('TODO: Plan 07 enforces requirePermission("admin") on billing routes')
  })
})
