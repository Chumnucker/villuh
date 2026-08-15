"use client"

import { useForm } from "@tanstack/react-form"
import type { CreatePropertyInput } from "@villuh/server/schemas/properties"
import { type PropertyDetail } from "@/modules/properties/providers/property-detail-provider"

// Select components need a controlled string — this sentinel represents "not set"
// and is stripped back to `undefined` in toApiInput() before validation.
export const UNSET = "__unset__"

/** Form state widens the enum/number fields from `CreatePropertyInput` to plain
 * strings (Select value + numeric text input), same pattern as unit-form-sheet. */
export type PropertyFormValues = Omit<
  CreatePropertyInput,
  "propertyType" | "yearBuilt" | "parkingType" | "parkingSpaces"
> & {
  propertyType: string
  yearBuilt: string
  parkingType: string
  parkingSpaces: string
}

export const EMPTY_VALUES: PropertyFormValues = {
  name: "",
  phone: "",
  notes: "",
  street: "",
  line2: "",
  city: "",
  region: "",
  postal: "",
  country: "",
  propertyType: UNSET,
  yearBuilt: "",
  parkingType: UNSET,
  parkingSpaces: "",
}

export function toFormValues(
  property: PropertyDetail | undefined
): PropertyFormValues {
  if (!property) return EMPTY_VALUES
  return {
    name: property.name,
    phone: property.phone ?? "",
    notes: property.notes ?? "",
    street: property.street ?? "",
    line2: property.line2 ?? "",
    city: property.city ?? "",
    region: property.region ?? "",
    postal: property.postal ?? "",
    country: property.country ?? "",
    latitude: property.latitude ? Number(property.latitude) : undefined,
    longitude: property.longitude ? Number(property.longitude) : undefined,
    propertyType: property.propertyType ?? UNSET,
    yearBuilt: property.yearBuilt != null ? String(property.yearBuilt) : "",
    parkingType: property.parkingType ?? UNSET,
    parkingSpaces:
      property.parkingSpaces != null ? String(property.parkingSpaces) : "",
  }
}

/** Converts widened form state back to the API shape, ready for schema `.parse()`. */
export function toApiInput(value: PropertyFormValues): CreatePropertyInput {
  return {
    ...value,
    propertyType:
      value.propertyType === UNSET
        ? undefined
        : (value.propertyType as CreatePropertyInput["propertyType"]),
    yearBuilt: value.yearBuilt.trim() === "" ? undefined : Number(value.yearBuilt),
    parkingType:
      value.parkingType === UNSET
        ? undefined
        : (value.parkingType as CreatePropertyInput["parkingType"]),
    parkingSpaces:
      value.parkingSpaces.trim() === "" ? undefined : Number(value.parkingSpaces),
  }
}

/** First validation message when the field has been touched and is invalid. */
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

/**
 * Local hook whose sole job is pinning down the concrete `useForm` return type
 * for props.
 *
 * `formApi` is typed structurally rather than as `PropertyFormApi` so the
 * parameter doesn't reference this function's own return type — that would be
 * circular. It also lets the handler re-baseline the form after a save without
 * closing over the `form` binding it's being passed to.
 */
export function usePropertyFormInstance(
  defaultValues: PropertyFormValues,
  onSubmit: (args: {
    value: PropertyFormValues
    formApi: { reset: (values?: PropertyFormValues) => void }
  }) => Promise<void>
) {
  return useForm({
    defaultValues,
    onSubmit: async ({ value, formApi }) => onSubmit({ value, formApi }),
  })
}

export type PropertyFormApi = ReturnType<typeof usePropertyFormInstance>
