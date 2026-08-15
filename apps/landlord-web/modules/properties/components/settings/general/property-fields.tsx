"use client"

import {
  Field,
  FieldLabel,
  Input,
  PhoneInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@villuh/ui"
import {
  createPropertyInputSchema,
  PARKING_TYPES,
  PARKING_TYPE_LABELS,
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
} from "@villuh/server/schemas/properties"
import { NotesEditor } from "./notes-editor"
import { UNSET, fieldError, type PropertyFormApi } from "./property-form-state"

/**
 * The individual property fields for the settings General tab, grouped into
 * sections. Every group expects a two-column grid parent.
 */

export function PropertyNameField({
  form,
  className,
}: {
  form: PropertyFormApi
  className?: string
}) {
  return (
    <form.Field
      name="name"
      validators={{
        onChange: createPropertyInputSchema.shape.name,
        onBlur: createPropertyInputSchema.shape.name,
      }}
    >
      {(field) => {
        const error = fieldError(field.state.meta)
        return (
          <Field
            className={className}
            data-invalid={error ? true : undefined}
          >
            <FieldLabel htmlFor={field.name}>Name</FieldLabel>
            <Input
              id={field.name}
              name={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Enter property name"
              error={error}
            />
          </Field>
        )
      }}
    </form.Field>
  )
}

export function PropertyPhoneField({ form }: { form: PropertyFormApi }) {
  return (
    <form.Field name="phone">
      {(field) => (
        <Field>
          <FieldLabel htmlFor={field.name}>Phone</FieldLabel>
          <PhoneInput
            value={field.state.value ?? ""}
            onChange={(value) => field.handleChange(value ?? "")}
            placeholder="Phone number"
            numberInputProps={{
              id: field.name,
              name: field.name,
              onBlur: field.handleBlur,
              autoComplete: "tel",
            }}
          />
        </Field>
      )}
    </form.Field>
  )
}

export function PropertyTypeField({ form }: { form: PropertyFormApi }) {
  return (
    <form.Field name="propertyType">
      {(field) => (
        <Field>
          <FieldLabel htmlFor={field.name}>Property type</FieldLabel>
          <Select value={field.state.value} onValueChange={field.handleChange}>
            <SelectTrigger id={field.name} className="w-full">
              <SelectValue placeholder="Not set" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNSET}>Not set</SelectItem>
              {PROPERTY_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {PROPERTY_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
    </form.Field>
  )
}

export function PropertyYearBuiltField({ form }: { form: PropertyFormApi }) {
  return (
    <form.Field name="yearBuilt">
      {(field) => (
        <Field>
          <FieldLabel htmlFor={field.name}>Year built</FieldLabel>
          <Input
            id={field.name}
            name={field.name}
            type="number"
            inputMode="numeric"
            min={1800}
            max={new Date().getFullYear() + 1}
            placeholder="e.g. 1998"
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(e) => field.handleChange(e.target.value)}
          />
        </Field>
      )}
    </form.Field>
  )
}

export function PropertyParkingFields({ form }: { form: PropertyFormApi }) {
  return (
    <>
      <form.Field name="parkingType">
        {(field) => (
          <Field>
            <FieldLabel htmlFor={field.name}>Parking</FieldLabel>
            <Select
              value={field.state.value}
              onValueChange={field.handleChange}
            >
              <SelectTrigger id={field.name} className="w-full">
                <SelectValue placeholder="Not set" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNSET}>Not set</SelectItem>
                {PARKING_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {PARKING_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      </form.Field>

      <form.Field name="parkingSpaces">
        {(field) => (
          <Field>
            <FieldLabel htmlFor={field.name}>Parking spaces</FieldLabel>
            <Input
              id={field.name}
              name={field.name}
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="e.g. 2"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </Field>
        )}
      </form.Field>
    </>
  )
}

export function PropertyNotesField({
  form,
  className = "col-span-full",
}: {
  form: PropertyFormApi
  className?: string
}) {
  return (
    <form.Field name="notes">
      {(field) => (
        <Field className={className}>
          <FieldLabel htmlFor={field.name}>Notes</FieldLabel>
          <NotesEditor
            value={field.state.value ?? ""}
            onChange={field.handleChange}
          />
        </Field>
      )}
    </form.Field>
  )
}
