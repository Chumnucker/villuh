"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "@tanstack/react-form"
import { toast } from "sonner"
import { SubmitButton, type SubmitStatus, Field, FieldLabel, Input, LinkButton, PhoneInput, PlatformIcon } from "@villuh/ui"
import { invalidateQueries, trpc } from "@villuh/api"
import {
  createPropertyInputSchema,
  updatePropertyInputSchema,
  type CreatePropertyInput,
} from "@villuh/server/schemas/properties"
import type { inferRouterOutputs } from "@trpc/server"
import type { AppRouter } from "@villuh/server/router"
import { ROUTES } from "@/app/routes"
import { getPlanLimitMeta, isPlanLimitError } from "@/modules/app/components/plan-limit/plan-limit-gate"
import { TagPicker, type TagPickerTag } from "@/modules/properties/components/tags/tag-picker"
import { AddressFields } from "./address-fields"
import { NotesEditor } from "./notes-editor"

/** First validation message when the field has been touched and is invalid. */
function fieldError(
  meta: { isTouched: boolean; isValid: boolean; errors: unknown[] }
): string | undefined {
  if (!(meta.isTouched && !meta.isValid)) return undefined
  const err = meta.errors[0]
  if (err == null) return undefined
  if (typeof err === "string") return err
  if (typeof err === "object" && "message" in err && typeof err.message === "string") {
    return err.message
  }
  return undefined
}

function submitStatus(
  isSubmitting: boolean,
  isPending: boolean,
  isError: boolean
): SubmitStatus {
  if (isError) return "error"
  if (isSubmitting || isPending) return "pending"
  return "idle"
}

type RouterOutput = inferRouterOutputs<AppRouter>
export type PropertyDetail = RouterOutput["properties"]["get"]["property"]

const EMPTY_VALUES: CreatePropertyInput = {
  name: "",
  phone: "",
  notes: "",
  street: "",
  line2: "",
  city: "",
  region: "",
  postal: "",
  country: "",
}

function toFormValues(property: PropertyDetail | undefined): CreatePropertyInput {
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
  }
}

/** Local hook whose sole job is pinning down the concrete `useForm` return type for props. */
function usePropertyFormInstance(
  defaultValues: CreatePropertyInput,
  onSubmit: (value: CreatePropertyInput) => Promise<void>
) {
  return useForm({
    defaultValues,
    onSubmit: async ({ value }) => onSubmit(value),
  })
}

export type PropertyFormApi = ReturnType<typeof usePropertyFormInstance>

export function PropertyForm({
  mode,
  property,
}: {
  mode: "create" | "edit"
  /** Required for edit mode — prefills fields and targets the update mutation. */
  property?: PropertyDetail
}) {
  const router = useRouter()
  const utils = trpc.useUtils()
  const [stagedTags, setStagedTags] = useState<TagPickerTag[]>([])

  const addFreeformTag = trpc.tags.addFreeform.useMutation()
  const setPropertyTags = trpc.tags.setPropertyTags.useMutation()

  const createProperty = trpc.properties.create.useMutation({
    onSuccess: async (data) => {
      const propertyId = data.property.id
      const catalogTagIds = stagedTags
        .filter((tag) => tag.organizationTagId)
        .map((tag) => tag.organizationTagId!)
      const freeformTags = stagedTags.filter((tag) => !tag.organizationTagId)

      try {
        if (catalogTagIds.length > 0) {
          await setPropertyTags.mutateAsync({ propertyId, organizationTagIds: catalogTagIds })
        }
        for (const tag of freeformTags) {
          await addFreeformTag.mutateAsync({
            propertyId,
            label: tag.label,
            iconKey: tag.iconKey,
            colorKey: tag.colorKey,
          })
        }
      } catch {
        toast.error("Property created, but some tags could not be saved")
      }

      await invalidateQueries(utils, [(u) => u.properties.list, (u) => u.me.get])
      toast.success("Property created")
      router.push(ROUTES.propertyDetail(propertyId))
    },
    onError: (err) => {
      if (isPlanLimitError(err)) {
        const meta = getPlanLimitMeta(err)
        toast.error(
          meta
            ? `You've reached your ${meta.resource} limit. Upgrade your plan to continue.`
            : err.message
        )
        return
      }
      toast.error(err.message || "Could not create property")
    },
  })

  const updateProperty = trpc.properties.update.useMutation({
    onSuccess: (data) =>
      invalidateQueries(utils, [(u) => u.properties.list, (u) => u.properties.get]).then(() => {
        toast.success("Property saved")
        router.push(ROUTES.propertyDetail(data.property.id))
      }),
    onError: (err) => {
      toast.error(err.message || "Could not save property")
    },
  })

  const isPending = createProperty.isPending || updateProperty.isPending
  const isSubmitError = createProperty.isError || updateProperty.isError

  const form = usePropertyFormInstance(toFormValues(property), async (value) => {
    if (mode === "create") {
      const parsed = createPropertyInputSchema.parse(value)
      await createProperty.mutateAsync(parsed)
    } else if (property) {
      const parsed = updatePropertyInputSchema.parse({ propertyId: property.id, ...value })
      await updateProperty.mutateAsync(parsed)
    }
  })

  return (
    <form
      className="grid grid-cols-2 gap-7"
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        void form.handleSubmit()
      }}
    >
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
            <Field data-invalid={error ? true : undefined}>
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

      <AddressFields form={form} />

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

      <div className="col-span-full">
      {mode === "edit" && property ? (
        <TagPicker propertyId={property.id} />
      ) : (
        <TagPicker value={stagedTags} onChange={setStagedTags} />
      )}
      </div>

      <form.Field name="notes">
        {(field) => (
          <Field className="col-span-full">
            <FieldLabel htmlFor={field.name}>Notes</FieldLabel>
            <NotesEditor value={field.state.value ?? ""} onChange={field.handleChange} />
          </Field>
        )}
      </form.Field>

      <div className="flex items-center justify-between gap-2 col-span-full">
        {mode === "create" ? (
          <LinkButton href={ROUTES.properties} variant="secondary" size="icon">
            <PlatformIcon icon="IconArrowLeft" />
          </LinkButton>
        ) : property ? (
          <LinkButton href={ROUTES.propertyDetail(property.id)} variant="outline">
            Discard changes
          </LinkButton>
        ) : null}

        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
          {([canSubmit, isSubmitting]) => (
            <SubmitButton
              status={submitStatus(isSubmitting, isPending, isSubmitError)}
              disabled={!canSubmit || isSubmitting || isPending}
              steps={
                mode === "create"
                  ? ["Create Property", "Creating…", "Created", "Error"]
                  : ["Save Property", "Saving…", "Saved", "Error"]
              }
            />
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}
