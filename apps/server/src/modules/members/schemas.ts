import { z } from 'zod'
import { zRole } from '../../domain/roles.js'

export const createInvitationInputSchema = z.object({
  email: z.string().email(),
  role: zRole,
})

export type CreateInvitationInput = z.infer<typeof createInvitationInputSchema>

export const removeMemberInputSchema = z.object({
  userId: z.string().min(1),
})

export type RemoveMemberInput = z.infer<typeof removeMemberInputSchema>

export const updateMemberRoleInputSchema = z.object({
  userId: z.string().min(1),
  role: zRole,
})

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleInputSchema>
