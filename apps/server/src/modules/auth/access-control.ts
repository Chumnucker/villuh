import { createAccessControl } from 'better-auth/plugins'

/**
 * Better Auth org access-control roles.
 * When `roles` is configured, Better Auth replaces defaultRoles — include built-ins.
 */
export function createOrgAccessRoles() {
  const orgAccessControl = createAccessControl({
    organization: ['update', 'delete'],
    member: ['create', 'update', 'delete'],
    invitation: ['create', 'cancel'],
    team: ['create', 'update', 'delete'],
    ac: ['create', 'read', 'update', 'delete'],
  })

  const ownerRole = orgAccessControl.newRole({
    organization: ['update', 'delete'],
    member: ['create', 'update', 'delete'],
    invitation: ['create', 'cancel'],
    team: ['create', 'update', 'delete'],
    ac: ['create', 'read', 'update', 'delete'],
  })
  const adminRole = orgAccessControl.newRole({
    organization: ['update'],
    invitation: ['create', 'cancel'],
    member: ['create', 'update', 'delete'],
    team: ['create', 'update', 'delete'],
    ac: ['create', 'read', 'update', 'delete'],
  })
  const memberRole = orgAccessControl.newRole({
    organization: [],
    member: [],
    invitation: [],
    team: [],
    ac: ['read'],
  })
  const managerRole = orgAccessControl.newRole({
    organization: [],
    member: ['create', 'update', 'delete'],
    invitation: ['create', 'cancel'],
    team: ['create', 'update', 'delete'],
    ac: ['read'],
  })
  const viewerRole = orgAccessControl.newRole({
    organization: [],
    member: [],
    invitation: [],
    team: [],
    ac: ['read'],
  })

  return { ownerRole, adminRole, memberRole, managerRole, viewerRole }
}
