"use client"

import { useForm } from "@tanstack/react-form"
import { z } from "zod"
import { createFloorPlanInputSchema } from "@villuh/server/schemas/floor-plans"
import { formatBathrooms } from "@/modules/properties/lib/floor-plan-display"

/**
 * The wizard's form state IS the mutation payload (minus `propertyId`/`floorPlanId`,
 * which the caller supplies): same field names, same types. The only concession to
 * the DOM is that "not yet chosen" is `undefined` — Selects can't hold "no value" —
 * so the required numbers are `number | undefined` and validation rejects the
 * `undefined`. On submit the values go straight into `schema.parse({ ...ids, ...value })`;
 * there is no widened string mirror and no field-by-field remapper.
 */
export type FloorPlanFormValues = {
  name: string
  bedrooms: number | undefined
  bathrooms: number | undefined
  defaultSquareFootage: number | undefined
}

export const EMPTY_FLOOR_PLAN_VALUES: FloorPlanFormValues = {
  name: "",
  bedrooms: undefined,
  bathrooms: undefined,
  defaultSquareFootage: undefined,
}

/** Bedrooms select options: 0–10 (D-40). `0` labelled `Studio` at the call site. */
export const BEDROOM_OPTIONS: number[] = Array.from({ length: 11 }, (_, i) => i)

/**
 * Bathrooms select options: 0–10 in 0.25 steps (41 items, D-40 / Resolved #4).
 * The numeric value round-trips against `formatBathrooms` with no float drift.
 */
export const BATHROOM_OPTIONS: { value: number; label: string }[] = Array.from(
  { length: 41 },
  (_, i) => {
    const n = i * 0.25
    return { value: n, label: formatBathrooms(n) }
  }
)

/**
 * Per-field validators for the Details step. Name reuses the server schema so the
 * two agree exactly; the required numbers reject the `undefined` unselected state
 * (a range check is redundant — the Selects only offer valid options).
 */
export const floorPlanFieldValidators = {
  name: createFloorPlanInputSchema.shape.name,
  requiredNumber: z.number({ error: "Required" }),
}

/**
 * First validation message once a field has been touched and is invalid. Field
 * errors arrive as either raw strings or Zod issue objects, so normalize to a
 * plain message the `Field`/`Input` can render.
 */
export function fieldError(meta: {
  isTouched: boolean
  isValid: boolean
  errors: unknown[]
}): string | undefined {
  if (!(meta.isTouched && !meta.isValid)) return undefined
  const err = meta.errors[0]
  if (err == null) return undefined
  if (typeof err === "string") return err
  if (
    typeof err === "object" &&
    "message" in err &&
    typeof err.message === "string"
  ) {
    return err.message
  }
  return undefined
}

/** True once the three required Details fields hold a value. */
export function isDetailsComplete(values: FloorPlanFormValues): boolean {
  return (
    createFloorPlanInputSchema.shape.name.safeParse(values.name).success &&
    values.bedrooms !== undefined &&
    values.bathrooms !== undefined
  )
}

/* ── Server-side name collision (D-09) ─────────────────────────────────────── */

const DUPLICATE_NAME_MESSAGE =
  "A floor plan with this name already exists in this property."

/** Any `BAD_REQUEST` from create/update is the per-property unique-name violation (D-09). */
export function isDuplicateNameError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "data" in err &&
    typeof (err as { data?: unknown }).data === "object" &&
    (err as { data?: { code?: string } }).data?.code === "BAD_REQUEST"
  )
}

/**
 * Surface the duplicate-name violation on the Name field itself — the error lives
 * in the form's own meta (not component state), so the field renders it and clears
 * it on the next keystroke via its `onChange` listener.
 */
export function setNameCollisionError(form: FloorPlanFormApi): void {
  form.setFieldMeta("name", (prev) => ({
    ...prev,
    isTouched: true,
    errorMap: { ...prev.errorMap, onSubmit: DUPLICATE_NAME_MESSAGE },
  }))
}

export function useFloorPlanForm(
  defaultValues: FloorPlanFormValues,
  // `form` is the same instance the hook returns; the callback receives it so
  // consumers never reach for the outer `const form` (react-hooks/immutability).
  onSubmit: (args: {
    value: FloorPlanFormValues
    form: FloorPlanFormApi
  }) => Promise<void>
) {
  return useForm({
    defaultValues,
    onSubmit: async ({ value, formApi }) =>
      onSubmit({ value, form: formApi as unknown as FloorPlanFormApi }),
  })
}

export type FloorPlanFormApi = ReturnType<typeof useFloorPlanForm>
