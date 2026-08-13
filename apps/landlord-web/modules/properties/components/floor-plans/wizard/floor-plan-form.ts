"use client"

import { useForm } from "@tanstack/react-form"
import type {
  CreateFloorPlanInput,
  UpdateFloorPlanInput,
} from "@villuh/server/schemas/floor-plans"
import { formatBathrooms } from "@/modules/properties/lib/floor-plan-display"

/**
 * Widened form state for the floor-plan wizard: the required bedrooms/bathrooms
 * selects are plain strings (Select values are strings) and square footage is a
 * numeric text input. Converted back to numbers at the form boundary on submit
 * so no `"1.75"` string leaks into the schema or the formatter (D-07).
 */
export type FloorPlanFormValues = {
  name: string
  bedrooms: string
  bathrooms: string
  defaultSquareFootage: string
}

export const EMPTY_FLOOR_PLAN_VALUES: FloorPlanFormValues = {
  name: "",
  bedrooms: "",
  bathrooms: "",
  defaultSquareFootage: "",
}

/** Seed the edit form from a fetched plan, stringifying the numeric fields. */
export function toFloorPlanFormValues(plan: {
  name: string
  bedrooms: number
  bathrooms: number
  defaultSquareFootage: number | null
}): FloorPlanFormValues {
  return {
    name: plan.name,
    bedrooms: String(plan.bedrooms),
    bathrooms: String(plan.bathrooms),
    defaultSquareFootage:
      plan.defaultSquareFootage != null ? String(plan.defaultSquareFootage) : "",
  }
}

/** Square footage is optional — blank means "unset", not zero. */
function toDefaultSquareFootage(value: string): number | undefined {
  return value.trim() === "" ? undefined : Number(value)
}

/** Widened form state → `floorPlans.create` input shape (pre-`.parse()`). */
export function toCreateInput(
  values: FloorPlanFormValues,
  propertyId: string
): CreateFloorPlanInput {
  return {
    propertyId,
    name: values.name,
    bedrooms: Number(values.bedrooms),
    bathrooms: Number(values.bathrooms),
    defaultSquareFootage: toDefaultSquareFootage(values.defaultSquareFootage),
  }
}

/** Widened form state → `floorPlans.update` input shape (pre-`.parse()`). */
export function toUpdateInput(
  values: FloorPlanFormValues,
  floorPlanId: string
): UpdateFloorPlanInput {
  return {
    floorPlanId,
    name: values.name,
    bedrooms: Number(values.bedrooms),
    bathrooms: Number(values.bathrooms),
    defaultSquareFootage: toDefaultSquareFootage(values.defaultSquareFootage),
  }
}

/** Bedrooms select options: 0–10 (D-40). `0` labelled `Studio` at the call site. */
export const BEDROOM_OPTIONS: number[] = Array.from({ length: 11 }, (_, i) => i)

/**
 * Bathrooms select options: 0–10 in 0.25 steps (41 items, D-40 / Resolved #4).
 * Values are exact-string forms of quarter-bath numbers so they round-trip
 * against `formatBathrooms` and the stored value with no float drift.
 */
export const BATHROOM_OPTIONS: { value: string; label: string }[] = Array.from(
  { length: 41 },
  (_, i) => {
    const n = i * 0.25
    return { value: String(n), label: formatBathrooms(n) }
  }
)

export function useFloorPlanFormInstance(
  defaultValues: FloorPlanFormValues,
  onSubmit: (args: {
    value: FloorPlanFormValues
    formApi: { reset: (values?: FloorPlanFormValues) => void }
  }) => Promise<void>
) {
  return useForm({
    defaultValues,
    onSubmit: async ({ value, formApi }) => onSubmit({ value, formApi }),
  })
}

export type FloorPlanFormApi = ReturnType<typeof useFloorPlanFormInstance>
