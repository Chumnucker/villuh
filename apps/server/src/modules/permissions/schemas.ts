import { z } from 'zod'
import { zRole } from '../../domain/roles.js'
import { zActionCategory } from '../../domain/actions.js'

export const updateRolePermissionInputSchema = z.object({
  role: zRole,
  action: zActionCategory,
  allowed: z.boolean(),
})

export type UpdateRolePermissionInput = z.infer<
  typeof updateRolePermissionInputSchema
>
