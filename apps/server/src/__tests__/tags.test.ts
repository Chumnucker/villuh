import { describe, it, expect } from 'vitest'

describe('PROP-02: Freeform property tags (D-17)', () => {
  it('a freeform tag can be attached to a property with icon + color from the fixed palette (D-21)', () => {
    expect.fail('TODO: Plan 03-09 implements tags.attach for freeform tags')
  })
  it('freeform tags are org-scoped display-only rows with organization_tag_id = null', () => {
    expect.fail('TODO: Plan 03-09 implements property_tag schema (Pattern 7)')
  })
})

describe('PROP-02: Promote freeform tag to org catalog (D-18)', () => {
  it('promote requires write permission and creates an organization_tag catalog row', () => {
    expect.fail('TODO: Plan 03-09 implements tags.promote with permissionProcedure(write)')
  })
  it('viewer role cannot promote a tag (FORBIDDEN)', () => {
    expect.fail('TODO: Plan 03-09 enforces write permission on tags.promote')
  })
})

describe('PROP-02: Delete org catalog tag cascades detach (D-19, D-20)', () => {
  it('deleting an org tag in use detaches it from every property, then deletes the catalog row', () => {
    expect.fail('TODO: Plan 03-09 implements tags.delete cascade-detach transaction')
  })
  it('delete requires write permission', () => {
    expect.fail('TODO: Plan 03-09 enforces write permission on tags.delete')
  })
})
