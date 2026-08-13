"use client"

import { useRef, useState } from "react"
import { useParams } from "next/navigation"
import { trpc } from "@villuh/api"
import {
  EmptyState,
  Lightbox,
  Page,
  SkeletonBox,
  SkeletonContainer,
} from "@villuh/ui"

type GalleryImage = { id: string; url: string }

export function PropertyGalleryTemplate() {
  const { propertyId } = useParams<{ propertyId: string }>()
  const galleryQuery = trpc.properties.gallery.list.useQuery({ propertyId })
  const [active, setActive] = useState<GalleryImage | null>(null)
  const [open, setOpen] = useState(false)
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
            description="Add photos from the edit page."
            className="aspect-video w-full rounded-4xl bg-muted"
          />
        }
      >
        {({ images }) => (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  aria-label={`Open photo ${index + 1}`}
                  onClick={(e) => {
                    originRef.current = e.currentTarget
                    setActive(image)
                    setOpen(true)
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
              open={open}
              onClose={() => setOpen(false)}
              originRef={originRef}
              src={active?.url ?? ""}
              alt="Property photo"
              maxScale={5}
            />
          </>
        )}
      </Page.Boundary>
    </Page.Content>
  )
}
