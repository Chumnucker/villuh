import { z } from 'zod'

export const listAuditLogInputSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(25),
})

export type ListAuditLogInput = z.infer<typeof listAuditLogInputSchema>
