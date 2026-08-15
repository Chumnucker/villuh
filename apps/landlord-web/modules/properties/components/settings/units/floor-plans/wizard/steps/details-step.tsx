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
import {
  BATHROOM_OPTIONS,
  BEDROOM_OPTIONS,
  fieldError,
  floorPlanFieldValidators,
  type FloorPlanFormApi,
} from "../floor-plan-form"

/**
 * Details step (UI-SPEC §4.1): Name + Bedrooms/Bathrooms selects + optional
 * default square footage. The selects offer 0–10 while the schema accepts 0–20
 * — deliberate and locked (D-40). The form stores real numbers; the string↔number
 * conversion is confined to each Select/number-input edge (the DOM is string-keyed).
 *
 * Every error — client validation and the server duplicate-name collision (D-09)
 * — comes from the form's own field meta. The collision error is written to the
 * Name field's `onSubmit` meta by the wizard and cleared here on the next edit.
 */
export function DetailsStep({ form }: { form: FloorPlanFormApi }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <form.Field
        name="name"
        validators={{
          onChange: floorPlanFieldValidators.name,
          onBlur: floorPlanFieldValidators.name,
        }}
        listeners={{
          // Clear the server collision error as soon as the name changes.
          onChange: ({ fieldApi }) =>
            fieldApi.setMeta((prev) => ({
              ...prev,
              errorMap: { ...prev.errorMap, onSubmit: undefined },
            })),
        }}
      >
        {(field) => {
          const error = fieldError(field.state.meta)
          return (
            <Field
              className="sm:col-span-2"
              data-invalid={error ? true : undefined}
            >
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

      <form.Field
        name="bedrooms"
        validators={{ onChange: floorPlanFieldValidators.requiredNumber }}
      >
        {(field) => (
          <Field data-invalid={fieldError(field.state.meta) ? true : undefined}>
            <FieldLabel htmlFor={field.name}>Bedrooms</FieldLabel>
            <Select
              value={
                field.state.value === undefined ? "" : String(field.state.value)
              }
              onValueChange={(v) => field.handleChange(Number(v))}
            >
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

      <form.Field
        name="bathrooms"
        validators={{ onChange: floorPlanFieldValidators.requiredNumber }}
      >
        {(field) => (
          <Field data-invalid={fieldError(field.state.meta) ? true : undefined}>
            <FieldLabel htmlFor={field.name}>Bathrooms</FieldLabel>
            <Select
              value={
                field.state.value === undefined ? "" : String(field.state.value)
              }
              onValueChange={(v) => field.handleChange(Number(v))}
            >
              <SelectTrigger id={field.name} className="w-full">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {BATHROOM_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
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
              value={
                field.state.value === undefined ? "" : String(field.state.value)
              }
              onBlur={field.handleBlur}
              onChange={(e) =>
                field.handleChange(
                  e.target.value === "" ? undefined : Number(e.target.value)
                )
              }
            />
            <FieldDescription>
              Optional. Units can override this.
            </FieldDescription>
          </Field>
        )}
      </form.Field>
    </div>
  )
}
