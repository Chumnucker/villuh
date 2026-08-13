"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button, SubmitButton } from "@villuh/ui"
import { invalidateQueries, trpc } from "@villuh/api"
import { updatePropertyInputSchema } from "@villuh/server/schemas/properties"
import { TagPicker } from "@/modules/properties/components/tags/tag-picker"
import { AddressFields } from "@/modules/properties/components/form/address-fields"
import {
  PropertyNameField,
  PropertyNotesField,
  PropertyParkingFields,
  PropertyPhoneField,
  PropertyTypeField,
  PropertyYearBuiltField,
} from "@/modules/properties/components/form/property-fields"
import {
  submitStatus,
  toApiInput,
  toFormValues,
  usePropertyFormInstance,
} from "@/modules/properties/components/form/property-form-shared"
import { usePropertyDetail } from "@/modules/properties/providers/property-detail-provider"
import { SettingsSection } from "./section"

/**
 * General property settings — the fields that used to make up the single
 * "edit property" form, regrouped into sections and saved on their own.
 *
 * Photos are deliberately absent: the Gallery tab persists uploads, removals,
 * and reordering immediately, so there's nothing for this form to stage.
 */
export function PropertyGeneralForm() {
  const { property } = usePropertyDetail()
  const utils = trpc.useUtils()
  const [submitError, setSubmitError] = useState(false)

  const updateProperty = trpc.properties.update.useMutation()

  const form = usePropertyFormInstance(
    toFormValues(property),
    async ({ value, formApi }) => {
      setSubmitError(false)
      try {
        const parsed = updatePropertyInputSchema.parse({
          propertyId: property.id,
          ...toApiInput(value),
        })
        await updateProperty.mutateAsync(parsed)

        await invalidateQueries(utils, [
          (u) => u.properties.list,
          (u) => u.properties.get,
          // Unit queries embed the property name server-side (joined), so a
          // rename makes them stale as well.
          (u) => u.units.list,
          (u) => u.units.get,
        ])
        // Re-baseline so the form goes back to pristine instead of staying
        // dirty against the values we just persisted.
        formApi.reset(value)
        toast.success("Property saved")
      } catch (err) {
        setSubmitError(true)
        toast.error(
          err instanceof Error ? err.message : "Could not save property"
        )
      }
    }
  )

  const isSubmitError = submitError || updateProperty.isError

  return (
    <form
      className="flex flex-col gap-10"
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <SettingsSection
        title="Basics"
        icon="IconNotebook"
        description="What this property is called and how it's classified."
      >
        <PropertyNameField form={form} className="sm:col-span-2" />
        <PropertyTypeField form={form} />
        <PropertyYearBuiltField form={form} />
        <PropertyParkingFields form={form} />
      </SettingsSection>

      <SettingsSection
        title="Address & contact"
        icon="IconMapPin"
        description="Where the property is and how people reach it."
      >
        <AddressFields form={form} streetClassName="sm:col-span-2" />
        <PropertyPhoneField form={form} />
      </SettingsSection>

      <SettingsSection
        title="Tags & notes"
        icon="IconClipboard2"
        description="Labels for filtering, plus any internal context worth keeping."
        className="grid-cols-1 sm:grid-cols-1"
      >
        <TagPicker propertyId={property.id} />
        <PropertyNotesField form={form} />
      </SettingsSection>

      <form.Subscribe
        selector={(state) =>
          [state.canSubmit, state.isSubmitting, state.isDirty] as const
        }
      >
        {([canSubmit, isSubmitting, isDirty]) => (
          <div className="flex items-center justify-end gap-2">
            {isDirty ? (
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting || updateProperty.isPending}
                onClick={() => {
                  form.reset()
                  setSubmitError(false)
                }}
              >
                Discard changes
              </Button>
            ) : null}

            <SubmitButton
              status={submitStatus(
                isSubmitting,
                updateProperty.isPending,
                isSubmitError
              )}
              disabled={
                !canSubmit ||
                !isDirty ||
                isSubmitting ||
                updateProperty.isPending
              }
              steps={["Save changes", "Saving…", "Saved", "Error"]}
            />
          </div>
        )}
      </form.Subscribe>
    </form>
  )
}
