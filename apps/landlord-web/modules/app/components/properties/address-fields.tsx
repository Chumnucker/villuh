"use client"

import { AddressAutofill } from "@mapbox/search-js-react"
import { Field, FieldDescription, FieldLabel, Input } from "@villuh/ui"
import type { PropertyFormApi } from "./property-form"

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

/**
 * Structured property address. Mapbox `AddressAutofill` assists the street field and
 * fills the rest on retrieve (D-22/D-23); every field stays a manual, editable Input so
 * D-25's fallback (no token, or Mapbox errors) is just "the assist didn't fire" — never a
 * blocked form. No country allowlist is passed to Mapbox (D-24).
 */
export function AddressFields({ form }: { form: PropertyFormApi }) {
  return (
    <div className="flex flex-col gap-4">
      <form.Field name="street">
        {(field) => {
          const streetInput = (
            <Input
              id={field.name}
              name={field.name}
              autoComplete="address-line1"
              placeholder={MAPBOX_TOKEN ? "Start typing an address…" : undefined}
              value={field.state.value ?? ""}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          )

          return (
            <Field>
              <FieldLabel htmlFor={field.name}>Address</FieldLabel>
              {MAPBOX_TOKEN ? (
                <AddressAutofill
                  accessToken={MAPBOX_TOKEN}
                  onRetrieve={(res) => {
                    const feature = res.features[0]
                    if (!feature) return
                    const props = feature.properties

                    form.setFieldValue("street", props.address_line1 ?? "")
                    form.setFieldValue("city", props.address_level2 ?? "")
                    form.setFieldValue("region", props.address_level1 ?? "")
                    form.setFieldValue("postal", props.postcode ?? "")
                    form.setFieldValue("country", props.country ?? "")

                    // D-23: only Mapbox-sourced addresses get lat/lng — manual entries leave these unset.
                    const [longitude, latitude] = feature.geometry.coordinates
                    if (typeof latitude === "number" && typeof longitude === "number") {
                      form.setFieldValue("latitude", latitude)
                      form.setFieldValue("longitude", longitude)
                    }
                  }}
                >
                  {streetInput}
                </AddressAutofill>
              ) : (
                streetInput
              )}
              {!MAPBOX_TOKEN ? (
                <FieldDescription>Map lookup unavailable. Enter the address manually.</FieldDescription>
              ) : null}
            </Field>
          )
        }}
      </form.Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <form.Field name="line2">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Apt, suite, etc.</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                autoComplete="address-line2"
                value={field.state.value ?? ""}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </Field>
          )}
        </form.Field>

        <form.Field name="city">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>City</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                autoComplete="address-level2"
                value={field.state.value ?? ""}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </Field>
          )}
        </form.Field>

        <form.Field name="region">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>State / Region</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                autoComplete="address-level1"
                value={field.state.value ?? ""}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </Field>
          )}
        </form.Field>

        <form.Field name="postal">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Postal code</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                autoComplete="postal-code"
                value={field.state.value ?? ""}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </Field>
          )}
        </form.Field>

        <form.Field name="country">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Country</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                autoComplete="country-name"
                value={field.state.value ?? ""}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </Field>
          )}
        </form.Field>
      </div>
    </div>
  )
}
