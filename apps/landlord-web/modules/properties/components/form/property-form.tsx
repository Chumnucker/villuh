"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { SubmitButton, LinkButton, PlatformIcon } from "@villuh/ui"
import { invalidateQueries, trpc } from "@villuh/api"
import { createPropertyInputSchema } from "@villuh/server/schemas/properties"
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
import { AddressFields } from "./address-fields"
import {
  PropertyNameField,
  PropertyNotesField,
  PropertyParkingFields,
  PropertyPhoneField,
  PropertyTypeField,
  PropertyYearBuiltField,
} from "./property-fields"
import {
  EMPTY_VALUES,
  submitStatus,
  toApiInput,
  usePropertyFormInstance,
} from "./property-form-shared"

/**
 * Create-only property form — tags and photos are staged locally and persisted
 * right after `properties.create` returns an id. Editing an existing property
 * lives on the settings pages instead (`templates/settings/**`), where each tab
 * saves independently.
 */
export function PropertyForm() {
  const router = useRouter()
  const utils = trpc.useUtils()
  const [stagedTags, setStagedTags] = useState<TagPickerTag[]>([])
  const [galleryItems, setGalleryItems] = useState<StagedGalleryItem[]>([])
  const [isPersistingGallery, setIsPersistingGallery] = useState(false)
  const [submitError, setSubmitError] = useState(false)
  // Latest items snapshot for the unmount-only blob-URL cleanup below.
  const galleryItemsRef = useRef(galleryItems)
  useEffect(() => {
    galleryItemsRef.current = galleryItems
  }, [galleryItems])

  useEffect(() => {
    return () => revokeStagedBlobUrls(galleryItemsRef.current)
  }, [])

  const addFreeformTag = trpc.tags.addFreeform.useMutation()
  const setPropertyTags = trpc.tags.setPropertyTags.useMutation()
  const createProperty = trpc.properties.create.useMutation()
  const presign = trpc.uploads.presignPropertyImage.useMutation()
  const addImage = trpc.properties.gallery.add.useMutation()
  const removeImage = trpc.properties.gallery.remove.useMutation()
  const reorderImages = trpc.properties.gallery.reorder.useMutation()

  const isPending = createProperty.isPending || isPersistingGallery
  const isSubmitError = submitError || createProperty.isError

  const form = usePropertyFormInstance(EMPTY_VALUES, async ({ value }) => {
    setSubmitError(false)
    try {
      const parsed = createPropertyInputSchema.parse(toApiInput(value))
      const data = await createProperty.mutateAsync(parsed)
      const propertyId = data.property.id

      if (galleryItems.length > 0) {
        setIsPersistingGallery(true)
        try {
          await persistStagedGallery({
            items: galleryItems,
            removedExistingIds: [],
            presign: (input) => presign.mutateAsync({ propertyId, ...input }),
            add: (input) => addImage.mutateAsync({ propertyId, ...input }),
            remove: (input) => removeImage.mutateAsync({ propertyId, ...input }),
            reorder: (input) => reorderImages.mutateAsync({ propertyId, ...input }),
          })
        } catch {
          toast.error("Property created, but some photos could not be saved")
        } finally {
          setIsPersistingGallery(false)
        }
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

      await invalidateQueries(utils, [
        (u) => u.properties.list,
        (u) => u.me.get,
      ])
      toast.success("Property created")
      router.push(ROUTES.propertyDetail(propertyId))
    } catch (err) {
      setSubmitError(true)
      if (isPlanLimitError(err)) {
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
        err instanceof Error ? err.message : "Could not create property"
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
      <PropertyNameField form={form} />
      <AddressFields form={form} />
      <PropertyPhoneField form={form} />
      <PropertyTypeField form={form} />
      <PropertyYearBuiltField form={form} />
      <PropertyParkingFields form={form} />

      <div className="col-span-full">
        <TagPicker value={stagedTags} onChange={setStagedTags} />
      </div>

      <PropertyNotesField form={form} />

      <StagedGalleryField
        items={galleryItems}
        onChange={setGalleryItems}
        onRemoveExisting={() => {
          // Create mode has no persisted images to remove.
        }}
      />

      <div className="col-span-full flex items-center justify-between gap-2">
        <LinkButton href={ROUTES.properties} variant="secondary" size="icon">
          <PlatformIcon icon="IconArrowLeft" />
        </LinkButton>

        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting] as const}
        >
          {([canSubmit, isSubmitting]) => (
            <SubmitButton
              status={submitStatus(isSubmitting, isPending, isSubmitError)}
              disabled={!canSubmit || isSubmitting || isPending}
              steps={["Create Property", "Creating…", "Created", "Error"]}
            />
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}
