import { z } from 'zod'
import { zPlanSlug } from '../../domain/billing.js'

export const subscribeInputSchema = z.object({
  tier: zPlanSlug,
  paymentMethodId: z.string().min(1),
  unitCount: z.number().int().min(0).default(0),
})

export type SubscribeInput = z.infer<typeof subscribeInputSchema>

export const upgradeInputSchema = z.object({
  tier: zPlanSlug,
})

export type UpgradeInput = z.infer<typeof upgradeInputSchema>

export const updatePaymentMethodInputSchema = z.object({
  paymentMethodId: z.string().min(1),
})

export type UpdatePaymentMethodInput = z.infer<
  typeof updatePaymentMethodInputSchema
>

export const syncUnitsInputSchema = z.object({
  unitCount: z.number().int().min(0),
})

export type SyncUnitsInput = z.infer<typeof syncUnitsInputSchema>
