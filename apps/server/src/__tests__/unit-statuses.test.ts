import { describe, it, expect } from 'vitest'

describe('UNIT-02: Unit status catalog seeding (D-26, Pattern 6)', () => {
  it('ensureDefaultUnitStatuses seeds Available/Occupied/Maintenance with is_system=true on first read', () => {
    expect.fail('TODO: Plan 03-04 implements ensureDefaultUnitStatuses upsert')
  })
  it('seeding is idempotent — calling it again does not duplicate the default statuses', () => {
    expect.fail('TODO: Plan 03-04 implements idempotent seed upsert')
  })
})

describe('UNIT-02: Admin-only catalog mutations (D-27)', () => {
  it('owner/admin can create, rename, reorder, and archive a custom unit status', () => {
    expect.fail('TODO: Plan 03-04 implements unitStatuses.create/update/reorder/archive with permissionProcedure(admin)')
  })
  it('manager (write, not admin) is forbidden from mutating the status catalog', () => {
    expect.fail('TODO: Plan 03-04 enforces admin-only permission on status catalog mutations')
  })
  it('viewer is forbidden from mutating the status catalog', () => {
    expect.fail('TODO: Plan 03-04 enforces admin-only permission on status catalog mutations')
  })
})

describe('UNIT-02: Status assignment vs catalog management (D-28)', () => {
  it('any write-permission role can assign an existing status to a unit', () => {
    expect.fail('TODO: Plan 03-04 implements units.update status assignment with permissionProcedure(write)')
  })
})
