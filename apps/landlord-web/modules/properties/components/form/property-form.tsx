"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "@tanstack/react-form"
import { toast } from "sonner"
import {
  SubmitButton,
  type SubmitStatus,
  Field,
  FieldLabel,
  Input,
  LinkButton,
  PhoneInput,
  PlatformIcon,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@villuh/ui"
import { invalidateQueries, trpc } from "@villuh/api"
import {
  createPropertyInputSchema,
  updatePropertyInputSchema,
  PARKING_TYPES,
  PARKING_TYPE_LABELS,
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
  type CreatePropertyInput,
} from "@villuh/server/schemas/properties"
import { ROUTES } from "@/app/routes"
import {
  getPlanLimitMeta,
  isPlanLimitError,
} from "@/modules/app/components/plan-limit/plan-limit-gate"
import {
  TagPicker,
  type TagPickerTag,
} from "@/modules/properties/components/tags/tag-picker"
import { StagedGalleryField } from "@/modules/properties/components/form/staged-gallery-field"
import {
  type StagedGalleryItem,
  persistStagedGallery,
  revokeStagedBlobUrls,
} from "@/modules/properties/lib/staged-gallery"
import { type PropertyDetail } from "@/modules/properties/providers/property-detail-provider"
import { AddressFields } from "./address-fields"
import { NotesEditor } from "./notes-editor"

/** First validation message when the field has been touched and is invalid. */
function fieldError(meta: {
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

function submitStatus(
  isSubmitting: boolean,
  isPending: boolean,
  isError: boolean
): SubmitStatus {
  if (isError) return "error"
  if (isSubmitting || isPending) return "pending"
  return "idle"
}

// Select components need a controlled string — this sentinel represents "not set"
// and is stripped back to `undefined` in toApiInput() before validation.
const UNSET = "__unset__"

/** Form state widens the enum/number fields from `CreatePropertyInput` to plain
 * strings (Select value + numeric text input), same pattern as unit-form-sheet. */
type PropertyFormValues = Omit<
  CreatePropertyInput,
  "propertyType" | "yearBuilt" | "parkingType" | "parkingSpaces"
> & {
  propertyType: string
  yearBuilt: string
  parkingType: string
  parkingSpaces: string
}

const EMPTY_VALUES: PropertyFormValues = {
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

function toFormValues(
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
function toApiInput(value: PropertyFormValues): CreatePropertyInput {
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

/** Local hook whose sole job is pinning down the concrete `useForm` return type for props. */
function usePropertyFormInstance(
  defaultValues: PropertyFormValues,
  onSubmit: (value: PropertyFormValues) => Promise<void>
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
  const [galleryItems, setGalleryItems] = useState<StagedGalleryItem[]>([])
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([])
  const [galleryDirty, setGalleryDirty] = useState(false)
  const [galleryHydrated, setGalleryHydrated] = useState(mode === "create")
  const [isPersistingGallery, setIsPersistingGallery] = useState(false)
  const [submitError, setSubmitError] = useState(false)
  // Latest items snapshot for the unmount-only blob-URL cleanup below.
  const galleryItemsRef = useRef(galleryItems)
  useEffect(() => {
    galleryItemsRef.current = galleryItems
  }, [galleryItems])

  const { data: galleryData, isLoading: galleryLoading } =
    trpc.properties.gallery.list.useQuery(
      { propertyId: property?.id ?? "" },
      { enabled: mode === "edit" && !!property?.id }
    )

  // One-time hydration of staged items from the fetched gallery, done as a
  // render-phase state adjustment (not an effect) so the hydrated items are
  // available in the same render the data arrives.
  if (mode === "edit" && galleryData && !galleryHydrated) {
    setGalleryItems(
      galleryData.images.map((image) => ({
        kind: "existing" as const,
        localId: image.id,
        id: image.id,
        objectKey: image.objectKey,
        url: image.url,
      }))
    )
    setGalleryHydrated(true)
  }

  useEffect(() => {
    return () => revokeStagedBlobUrls(galleryItemsRef.current)
  }, [])

  const addFreeformTag = trpc.tags.addFreeform.useMutation()
  const setPropertyTags = trpc.tags.setPropertyTags.useMutation()
  const createProperty = trpc.properties.create.useMutation()
  const updateProperty = trpc.properties.update.useMutation()
  const presign = trpc.uploads.presignPropertyImage.useMutation()
  const addImage = trpc.properties.gallery.add.useMutation()
  const removeImage = trpc.properties.gallery.remove.useMutation()
  const reorderImages = trpc.properties.gallery.reorder.useMutation()

  const isPending =
    createProperty.isPending ||
    updateProperty.isPending ||
    isPersistingGallery
  const isSubmitError =
    submitError || createProperty.isError || updateProperty.isError

  async function persistGallery(propertyId: string) {
    if (!galleryDirty && removedImageIds.length === 0) return

    setIsPersistingGallery(true)
    try {
      await persistStagedGallery({
        propertyId,
        items: galleryItems,
        removedExistingIds: removedImageIds,
        presign: (input) => presign.mutateAsync(input),
        add: (input) => addImage.mutateAsync(input),
        remove: (input) => removeImage.mutateAsync(input),
        reorder: (input) => reorderImages.mutateAsync(input),
      })
      await invalidateQueries(utils, [(u) => u.properties.gallery.list])
    } finally {
      setIsPersistingGallery(false)
    }
  }

  const form = usePropertyFormInstance(toFormValues(property), async (value) => {
    setSubmitError(false)
    try {
      if (mode === "create") {
        const parsed = createPropertyInputSchema.parse(toApiInput(value))
        const data = await createProperty.mutateAsync(parsed)
        const propertyId = data.property.id

        try {
          await persistGallery(propertyId)
        } catch {
          toast.error("Property created, but some photos could not be saved")
        }

        const catalogTagIds = stagedTags
          .filter((tag) => tag.organizationTagId)
          .map((tag) => tag.organizationTagId!)
        const freeformTags = stagedTags.filter((tag) => !tag.organizationTagId)

        try {
          if (catalogTagIds.length > 0) {
            await setPropertyTags.mutateAsync({
              propertyId,
              organizationTagIds: catalogTagIds,
            })
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
        return
      }

      if (!property) return
      const parsed = updatePropertyInputSchema.parse({
        propertyId: property.id,
        ...toApiInput(value),
      })
      await updateProperty.mutateAsync(parsed)

      try {
        await persistGallery(property.id)
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Property saved, but gallery changes failed"
        )
        setSubmitError(true)
        return
      }

      await invalidateQueries(utils, [
        (u) => u.properties.list,
        (u) => u.properties.get,
        (u) => u.properties.gallery.list,
        // Unit queries embed the property name server-side (joined), so a
        // rename makes them stale as well.
        (u) => u.units.list,
        (u) => u.units.get,
      ])
      toast.success("Property saved")
      router.push(ROUTES.propertyDetail(property.id))
    } catch (err) {
      setSubmitError(true)
      if (mode === "create" && isPlanLimitError(err)) {
        const meta = getPlanLimitMeta(err)
        toast.error(
          meta
            ? `You've reached your ${meta.resource} limit. Upgrade your plan to continue.`
            : err instanceof Error
              ? err.message
              : "Could not create property"
        )
        return
      }
      toast.error(
        err instanceof Error
          ? err.message
          : mode === "create"
            ? "Could not create property"
            : "Could not save property"
      )
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

      <form.Field name="parkingType">
        {(field) => (
          <Field>
            <FieldLabel htmlFor={field.name}>Parking</FieldLabel>
            <Select value={field.state.value} onValueChange={field.handleChange}>
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
            <NotesEditor
              value={field.state.value ?? ""}
              onChange={field.handleChange}
            />
          </Field>
        )}
      </form.Field>

      <StagedGalleryField
        items={galleryItems}
        disabled={mode === "edit" && (galleryLoading || !galleryHydrated)}
        onChange={(next) => {
          setGalleryItems(next)
          setGalleryDirty(true)
        }}
        onRemoveExisting={(imageId) => {
          setRemovedImageIds((prev) =>
            prev.includes(imageId) ? prev : [...prev, imageId]
          )
          setGalleryDirty(true)
        }}
      />

      <div className="col-span-full flex items-center justify-between gap-2">
        {mode === "create" ? (
          <LinkButton href={ROUTES.properties} variant="secondary" size="icon">
            <PlatformIcon icon="IconArrowLeft" />
          </LinkButton>
        ) : property ? (
          <LinkButton
            href={ROUTES.propertyDetail(property.id)}
            variant="outline"
          >
            Discard changes
          </LinkButton>
        ) : null}

        <form.Subscribe
          selector={(state) =>
            [state.canSubmit, state.isSubmitting] as const
          }
        >
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
