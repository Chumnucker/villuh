"use client"

import dynamic from "next/dynamic"
import {
  Field,
  FieldDescription,
  FieldLabel,
  Input,
  SearchableSelect,
  mapboxAutofillPopoverOptions,
  mapboxAutofillTheme,
} from "@villuh/ui"
import type { PropertyFormApi } from "./property-form"
import {
  COUNTRIES,
  regionsForCountry,
  withCurrentValue,
} from "./address-options"

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

/** Mapbox touches `document` at import time — load only in the browser. */
const AddressAutofill = dynamic(
  () => import("@mapbox/search-js-react").then((mod) => mod.AddressAutofill),
  { ssr: false }
)

/**
 * Structured property address. Mapbox `AddressAutofill` assists the street field and
 * fills the rest on retrieve (D-22/D-23); every field stays editable so D-25's fallback
 * (no token, or Mapbox errors) is just "the assist didn't fire" — never a blocked form.
 * Country/region use searchable comboboxes (curated lists; orphan Mapbox values stay selectable).
 */
export function AddressFields({ form }: { form: PropertyFormApi }) {
  return (
    <>
      <form.Field name="street">
        {(field) => {
          const streetInput = (
            <Input
              id={field.name}
              name={field.name}
              autoComplete="address-line1"
              placeholder={
                MAPBOX_TOKEN ? "Start typing an address…" : "Street address"
              }
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
                  theme={mapboxAutofillTheme}
                  popoverOptions={mapboxAutofillPopoverOptions}
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
                <FieldDescription>
                  Map lookup unavailable. Enter the address manually.
                </FieldDescription>
              ) : null}
            </Field>
          )
        }}
      </form.Field>

        <form.Field name="line2">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Apt, suite, etc.</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                autoComplete="address-line2"
                placeholder="Apt, suite, unit…"
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
                placeholder="City"
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
              <SearchableSelect
                id={field.name}
                value={field.state.value ?? ""}
                onValueChange={field.handleChange}
                onBlur={field.handleBlur}
                items={withCurrentValue(COUNTRIES, field.state.value)}
                placeholder="Search countries…"
                emptyText="No countries match"
              />
            </Field>
          )}
        </form.Field>

        <form.Subscribe selector={(state) => state.values.country}>
          {(country) => {
            const regionOptions = regionsForCountry(country)
            return (
              <form.Field name="region">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>State / Region</FieldLabel>
                    {regionOptions.length > 0 ? (
                      <SearchableSelect
                        id={field.name}
                        value={field.state.value ?? ""}
                        onValueChange={field.handleChange}
                        onBlur={field.handleBlur}
                        items={withCurrentValue(regionOptions, field.state.value)}
                        placeholder="Search states…"
                        emptyText="No regions match"
                      />
                    ) : (
                      <Input
                        id={field.name}
                        name={field.name}
                        autoComplete="address-level1"
                        value={field.state.value ?? ""}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="State or region"
                      />
                    )}
                  </Field>
                )}
              </form.Field>
            )
          }}
        </form.Subscribe>

        <form.Field name="postal">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Postal code</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                autoComplete="postal-code"
                placeholder="Postal code"
                value={field.state.value ?? ""}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </Field>
          )}
        </form.Field>
    </>
  )
}
