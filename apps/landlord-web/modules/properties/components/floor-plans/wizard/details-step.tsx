"use client"

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@villuh/ui"
import { createFloorPlanInputSchema } from "@villuh/server/schemas/floor-plans"
import { fieldError } from "@/modules/properties/components/form/property-form-shared"
import {
  BATHROOM_OPTIONS,
  BEDROOM_OPTIONS,
  type FloorPlanFormApi,
} from "./floor-plan-form"

/**
 * Details step (UI-SPEC §4.1): Name + Bedrooms/Bathrooms selects + optional
 * default square footage. The selects offer 0–10 while the schema accepts 0–20
 * — deliberate and locked (D-40). Select values are strings; the wizard
 * converts them at the form boundary (D-07).
 */
export function DetailsStep({ form }: { form: FloorPlanFormApi }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <form.Field
        name="name"
        validators={{
          onChange: createFloorPlanInputSchema.shape.name,
          onBlur: createFloorPlanInputSchema.shape.name,
        }}
      >
        {(field) => {
          const error = fieldError(field.state.meta)
          return (
            <Field className="sm:col-span-2" data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor={field.name}>Name</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="2 bed / 2 bath"
                aria-invalid={error ? true : undefined}
              />
              {error ? <FieldError errors={[{ message: error }]} /> : null}
            </Field>
          )
        }}
      </form.Field>

      <form.Field name="bedrooms">
        {(field) => (
          <Field>
            <FieldLabel htmlFor={field.name}>Bedrooms</FieldLabel>
            <Select value={field.state.value} onValueChange={field.handleChange}>
              <SelectTrigger id={field.name} className="w-full">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {BEDROOM_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n === 0 ? "Studio" : String(n)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      </form.Field>

      <form.Field name="bathrooms">
        {(field) => (
          <Field>
            <FieldLabel htmlFor={field.name}>Bathrooms</FieldLabel>
            <Select value={field.state.value} onValueChange={field.handleChange}>
              <SelectTrigger id={field.name} className="w-full">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {BATHROOM_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      </form.Field>

      <form.Field name="defaultSquareFootage">
        {(field) => (
          <Field>
            <FieldLabel htmlFor={field.name}>Default square footage</FieldLabel>
            <Input
              id={field.name}
              name={field.name}
              type="number"
              min={0}
              inputMode="numeric"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldDescription>Optional. Units can override this.</FieldDescription>
          </Field>
        )}
      </form.Field>
    </div>
  )
}
