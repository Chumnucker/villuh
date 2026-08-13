"use client"

import { useRef } from "react"
import { useParams } from "next/navigation"
import { trpc } from "@villuh/api"
import {
  EmptyState,
  Lightbox,
  LinkButton,
  Page,
  SkeletonBox,
  SkeletonContainer,
} from "@villuh/ui"
import { ROUTES } from "@/app/routes"
import { propertyOverlays } from "@/modules/properties/lib/properties.overlays"

export function PropertyGalleryTemplate() {
  const { propertyId } = useParams<{ propertyId: string }>()
  const galleryQuery = trpc.properties.gallery.list.useQuery({ propertyId })
  // D-31 second form / D-47: the key is registered in propertyOverlays but
  // <AppOverlays> skips it, so this page pulls its own handle and renders the
  // Lightbox below. D-32: `originRef` is a live handle to the clicked
  // thumbnail — it cannot reach a component mounted in the app layout.
  const photo = propertyOverlays.use("photo")
  const originRef = useRef<HTMLElement | null>(null)

  return (
    <Page.Content>
      <Page.Boundary
        query={galleryQuery}
        pending={
          <SkeletonContainer className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SkeletonBox className="aspect-[4/3] rounded-2xl" />
            <SkeletonBox className="aspect-[4/3] rounded-2xl" />
            <SkeletonBox className="aspect-[4/3] rounded-2xl" />
            <SkeletonBox className="aspect-[4/3] rounded-2xl" />
          </SkeletonContainer>
        }
        isEmpty={(data) => data.images.length === 0}
        empty={
          <EmptyState
            icon="IconCloudUpload"
            title="No photos yet"
            description="Add photos from the Gallery tab in property settings."
            className="aspect-video w-full rounded-4xl bg-muted"
            action={
              <LinkButton
                href={ROUTES.propertySettingsGallery(propertyId)}
                variant="outline"
                size="sm"
              >
                Add photos
              </LinkButton>
            }
          />
        }
      >
        {({ images }) => {
          // D-11: the param carries the IMAGE ID, never the array index — an
          // index silently points a shared link at the wrong photo the moment
          // the gallery is reordered or a photo is deleted.
          const active = images.find((image) => image.id === photo.value) ?? null

          return (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {images.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    aria-label={`Open photo ${index + 1}`}
                    onClick={(e) => {
                      originRef.current = e.currentTarget
                      photo.open(image.id)
                    }}
                    className="aspect-[4/3] overflow-hidden rounded-2xl border border-border transition-opacity hover:opacity-90"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- presigned S3 URLs are short-lived and per-org; not worth Next/Image remote-pattern config. */}
                    <img
                      src={image.url}
                      alt={`Property photo ${index + 1}`}
                      className="size-full object-cover"
                    />
                  </button>
                ))}
              </div>

              <Lightbox
                // Gate on `active`, not on `photo.isOpen`: a link to a deleted or
                // reordered-away photo id resolves to nothing, and opening an
                // empty lightbox would be worse than not opening one.
                open={active !== null}
                // D-11: Lightbox is not Radix. `onClose` -> `close()` is the
                // whole adapter; the primitive is not rewritten.
                onClose={photo.close}
                originRef={originRef}
                src={active?.url ?? ""}
                alt="Property photo"
                maxScale={5}
              />
            </>
          )
        }}
      </Page.Boundary>
    </Page.Content>
  )
}
