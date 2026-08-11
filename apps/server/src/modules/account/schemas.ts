import { z } from 'zod'

/** Shared by tRPC `account.updateProfile` and landlord settings form. */
export const updateProfileInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Display name is required')
    .max(120, 'Display name must be at most 120 characters'),
})

export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>

export const changePasswordInputSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  revokeOtherSessions: z.boolean().optional(),
})

export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>
