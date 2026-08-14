"use client"

import { useMemo } from "react"
import { useParams } from "next/navigation"
import { useForm } from "@tanstack/react-form"
import { toast } from "sonner"
import { z } from "zod"
import {
  Button,
  EmptyState,
  Field,
  FieldLabel,
  Input,
  Label,
  OverlayBody,
  PlatformIcon,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SkeletonBox,
  SkeletonLabel,
  Switch,
  TagBadge,
  Textarea,
  cn,
  isPlatformIconName,
  toTagBadgeVariant,
  type EntityOverlayHandle,
} from "@villuh/ui"
import { uploadPresignedPut } from "@villuh/ui/utils"
import { invalidateQueries, trpc } from "@villuh/api"
import { updatePropertyAmenityInputSchema } from "@villuh/server/schemas/amenities"
import type { inferRouterOutputs } from "@trpc/server"
import type { AppRouter } from "@villuh/server/router"
import { useUser } from "@/modules/app/providers/me-provider"
import {
  AMENITY_ICON_COLOR_CLASSES,
  type AmenityIconKey,
  type TagColorKey,
} from "../lib/amenity-icons"
import { AmenityIconColorPicker } from "./amenity-icon-color-picker"
import {
  GalleryManager,
  type GalleryImage,
  type GalleryUploadFile,
} from "./gallery-manager"

type RouterOutput = inferRouterOutputs<AppRouter>
export type PropertyAmenity =
  RouterOutput["amenities"]["property"]["list"]["amenities"][number]

/** Amenity galleries cap at 10, never the shared 25 (Pitfall 1 / D-31). */
const AMENITY_GALLERY_CAP = 10

/**
 * URL-backed amenity detail sheet (D-40). Declared through `createOverlays`, so a
 * link like `?amenity.sheet={propertyAmenityId}` cold-loads the sheet open,
 * fetching the assignment by id.
 *
 * The parent `propertyId` comes from the route (`useParams`), not
 * `usePropertyDetail()`: this component is mounted app-wide by `<AppOverlays>`,
 * OUTSIDE `PropertyDetailProvider`, so consuming that context would throw on
 * every page. The amenity sheet is only reachable from a property route, so the
 * param is present on cold load. The list query is org-scoped server-side (RLS +
 * requirePropertyAmenity), so a foreign/stale id simply resolves to not-found.
 */
export function AmenitySheet({ overlay }: { overlay: EntityOverlayHandle }) {
  const { propertyId } = useParams<{ propertyId?: string }>()
  const propertyAmenityId = overlay.entityId

  // Gated: ungated, this fires on EVERY authenticated page load, because
  // <AppOverlays> keeps the component mounted app-wide.
  const listQuery = trpc.amenities.property.list.useQuery(
    { propertyId: propertyId ?? "" },
    { enabled: overlay.isOpen && propertyAmenityId !== null && !!propertyId }
  )

  return (
    <Sheet {...overlay.dialogProps}>
      <SheetContent className="sm:max-w-lg">
        <OverlayBody query={listQuery} pending={<AmenitySheetSkeleton />}>
          {({ amenities }) => {
            const amenity =
              amenities.find((row) => row.id === propertyAmenityId) ?? null
            if (!amenity || !propertyId) {
              return (
                <>
                  <SheetHeader>
                    <SheetTitle>Amenity</SheetTitle>
                  </SheetHeader>
                  <div className="px-6">
                    <EmptyState
                      icon="IconCircleInfo"
                      title="Not found"
                      description="This amenity no longer exists, or the link is out of date."
                    />
                  </div>
                </>
              )
            }
            return <AmenitySheetBody key={amenity.id} amenity={amenity} />
          }}
        </OverlayBody>
      </SheetContent>
    </Sheet>
  )
}

function AmenitySheetSkeleton() {
  return (
    <>
      <SheetHeader>
        <SkeletonLabel className="h-6 w-40" />
      </SheetHeader>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <SkeletonLabel className="h-4 w-24" />
            <SkeletonBox className="h-9 w-full rounded-md" />
          </div>
        ))}
      </div>
    </>
  )
}

type FormValues = {
  label: string
  description: string
  iconKey: AmenityIconKey
  colorKey: TagColorKey
  isReservable: boolean
  requiresApproval: boolean
}

function toFormValues(amenity: PropertyAmenity): FormValues {
  return {
    label: amenity.label,
    description: amenity.description ?? "",
    iconKey: amenity.iconKey as AmenityIconKey,
    colorKey: amenity.colorKey as TagColorKey,
    isReservable: amenity.isReservable,
    requiresApproval: amenity.requiresApproval,
  }
}

/**
 * Edits the property assignment (never the catalog, D-32) and manages its photo
 * gallery. Keyed by the assignment id so `defaultValues` is correct at mount.
 */
function AmenitySheetBody({ amenity }: { amenity: PropertyAmenity }) {
  const { user } = useUser()
  const canWrite = user.org.permissions.write
  const utils = trpc.useUtils()

  const updateAmenity = trpc.amenities.property.update.useMutation({
    onSuccess: () =>
      invalidateQueries(utils, [
        (u) => u.amenities.property.list,
        (u) => u.properties.get,
      ]).then(() => {
        toast.success("Amenity saved")
      }),
    onError: (err) => toast.error(err.message || "Could not save amenity"),
  })

  const form = useForm({
    defaultValues: toFormValues(amenity),
    onSubmit: async ({ value }) => {
      try {
        const parsed = updatePropertyAmenityInputSchema.parse({
          propertyAmenityId: amenity.id,
          label: value.label,
          description: value.description.trim() === "" ? undefined : value.description,
          iconKey: value.iconKey,
          colorKey: value.colorKey,
          isReservable: value.isReservable,
          requiresApproval: value.requiresApproval,
        })
        await updateAmenity.mutateAsync(parsed)
      } catch (err) {
        if (err instanceof z.ZodError) {
          toast.error(err.issues[0]?.message ?? "Please check the form for errors")
          return
        }
        throw err
      }
    },
  })

  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-2xl bg-muted",
              AMENITY_ICON_COLOR_CLASSES[amenity.colorKey as TagColorKey]
            )}
          >
            {isPlatformIconName(amenity.iconKey) ? (
              <PlatformIcon icon={amenity.iconKey} size={20} />
            ) : (
              <PlatformIcon icon="IconStar" size={20} />
            )}
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <SheetTitle className="truncate">{amenity.label}</SheetTitle>
            <SheetDescription>
              {amenity.isReservable ? "Reservable" : "Not reservable"}
              {amenity.organizationAmenityId ? " · From catalog" : " · Freeform"}
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            void form.handleSubmit()
          }}
        >
          <form.Field
            name="label"
            validators={{
              onChange: ({ value }) =>
                value.trim() ? undefined : "Label is required",
              onBlur: ({ value }) =>
                value.trim() ? undefined : "Label is required",
            }}
          >
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Label</FieldLabel>
                <div className="flex items-center gap-2">
                  <form.Subscribe
                    selector={(state) =>
                      [state.values.iconKey, state.values.colorKey] as const
                    }
                  >
                    {([iconKey, colorKey]) => (
                      <AmenityIconColorPicker
                        iconKey={iconKey}
                        colorKey={colorKey}
                        disabled={!canWrite}
                        onChange={(next) => {
                          form.setFieldValue("iconKey", next.iconKey)
                          form.setFieldValue("colorKey", next.colorKey)
                        }}
                      />
                    )}
                  </form.Subscribe>
                  <Input
                    id={field.name}
                    name={field.name}
                    className="flex-1"
                    disabled={!canWrite}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </div>
              </Field>
            )}
          </form.Field>

          <form.Field name="description">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                <Textarea
                  id={field.name}
                  name={field.name}
                  rows={3}
                  disabled={!canWrite}
                  placeholder="What residents should know about this amenity."
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </Field>
            )}
          </form.Field>

          <div className="flex flex-col gap-3 rounded-2xl border border-border p-3">
            <form.Field name="isReservable">
              {(field) => (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <Label htmlFor={field.name}>Reservable</Label>
                    <span className="text-xs text-muted-foreground">
                      Residents can request time in this amenity.
                    </span>
                  </div>
                  <Switch
                    id={field.name}
                    disabled={!canWrite}
                    checked={field.state.value}
                    onCheckedChange={(checked) => field.handleChange(checked)}
                  />
                </div>
              )}
            </form.Field>

            <form.Subscribe selector={(state) => state.values.isReservable}>
              {(isReservable) =>
                isReservable ? (
                  <form.Field name="requiresApproval">
                    {(field) => (
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col">
                          <Label htmlFor={field.name}>Requires approval</Label>
                          <span className="text-xs text-muted-foreground">
                            Reservation requests need landlord approval.
                          </span>
                        </div>
                        <Switch
                          id={field.name}
                          disabled={!canWrite}
                          checked={field.state.value}
                          onCheckedChange={(checked) => field.handleChange(checked)}
                        />
                      </div>
                    )}
                  </form.Field>
                ) : null
              }
            </form.Subscribe>
          </div>

          {canWrite ? (
            <SheetFooter className="flex-row justify-end gap-2 px-0">
              <form.Subscribe
                selector={(state) =>
                  [state.canSubmit, state.isSubmitting] as const
                }
              >
                {([canSubmit, isSubmitting]) => (
                  <Button
                    type="submit"
                    disabled={
                      !canSubmit || isSubmitting || updateAmenity.isPending
                    }
                  >
                    {isSubmitting || updateAmenity.isPending
                      ? "Saving…"
                      : "Save details"}
                  </Button>
                )}
              </form.Subscribe>
            </SheetFooter>
          ) : null}
        </form>

        <Separator />

        <div className="flex flex-col gap-2 pb-6">
          <h3 className="text-sm font-medium">Photos</h3>
          <p className="text-xs text-muted-foreground">
            Up to {AMENITY_GALLERY_CAP} photos — the first is the cover.
          </p>
          <AmenityGallery
            propertyAmenityId={amenity.id}
            canWrite={canWrite}
          />
        </div>
      </div>
    </>
  )
}

/**
 * The extracted {@link GalleryManager} at cap 10 (D-31), wired to
 * `amenities.property.gallery.*` + `uploads.presignAmenityImage`. Invalidates
 * `gallery.list` + `property.list` per D-38.
 */
function AmenityGallery({
  propertyAmenityId,
  canWrite,
}: {
  propertyAmenityId: string
  canWrite: boolean
}) {
  const utils = trpc.useUtils()
  const galleryQuery = trpc.amenities.property.gallery.list.useQuery({
    propertyAmenityId,
  })
  const presign = trpc.uploads.presignAmenityImage.useMutation()
  const addImage = trpc.amenities.property.gallery.add.useMutation()
  const removeImage = trpc.amenities.property.gallery.remove.useMutation()
  const reorderImages = trpc.amenities.property.gallery.reorder.useMutation()

  const images: GalleryImage[] = useMemo(
    () => galleryQuery.data?.images ?? [],
    [galleryQuery.data]
  )

  function refreshGallery() {
    return invalidateQueries(utils, [
      (u) => u.amenities.property.gallery.list,
      (u) => u.amenities.property.list,
    ])
  }

  async function handleUpload(files: GalleryUploadFile[]) {
    try {
      for (const { file, contentType } of files) {
        const { uploadUrl, objectKey } = await presign.mutateAsync({
          propertyAmenityId,
          contentType,
          byteLength: file.size,
          filename: file.name,
        })
        await uploadPresignedPut(uploadUrl, file, { contentType })
        await addImage.mutateAsync({
          propertyAmenityId,
          objectKey,
          contentType,
          byteLength: file.size,
        })
      }
    } finally {
      await refreshGallery()
    }
  }

  async function handleDelete(imageId: string) {
    await removeImage.mutateAsync({ imageId })
    await refreshGallery()
  }

  async function handleReorder(orderedIds: string[]) {
    await reorderImages.mutateAsync({ propertyAmenityId, orderedIds })
    await refreshGallery()
  }

  return (
    <GalleryManager
      images={images}
      isLoading={galleryQuery.isLoading}
      canWrite={canWrite}
      cap={10}
      onUpload={handleUpload}
      onDelete={handleDelete}
      onReorder={handleReorder}
      emptyTitle="No photos yet"
      emptyDescription={
        canWrite
          ? "Add photos of this amenity — they upload immediately."
          : "No photos have been added yet."
      }
    />
  )
}
