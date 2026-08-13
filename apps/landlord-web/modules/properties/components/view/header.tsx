"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import {
  Button,
  LinkButton,
  Page,
  PlatformIcon,
  useBreadcrumbLabel,
} from "@villuh/ui"
import { ROUTES } from "@/app/routes"
import { propertyOverlays } from "@/modules/properties/lib/properties.overlays"
import { PropertyBadgeRow } from "@/modules/properties/components/view/property-badge-row"
import { usePropertyDetail } from "@/modules/properties/providers/property-detail-provider"

/**
 * Property detail page header — name, type/tag chips, edit/archive
 * actions, plus the decorative "sun-setting over the horizon" hero backdrop
 * (first cover photo, low opacity, radial-gradient fade). Mounted once here
 * (rather than per-tab) so the backdrop spans every tab — About, Units,
 * Gallery, Tenants, Analytics — not just About. Needs `isolate` (stacking
 * context, no `position`) on an ancestor (`Page.Shell` in
 * `(detail)/layout.tsx`) so the `-z-10` layer stays contained there instead
 * of leaking up to the app shell root, while its `position: absolute`
 * containing block resolves further up to `ScrollArea`'s root.
 *
 * Reads from `usePropertyDetail()`, so it must render as a child of
 * `PropertyDetailProvider` (see `(detail)/layout.tsx`).
 *
 * The hero image comes off `property.coverImageUrl` — presigned server-side
 * as part of the `properties.get` query itself (see `getPropertyWithUnits`),
 * not a separate `gallery.list` fetch. That used to add a second, sequential
 * round-trip after the property loaded (and presigned every gallery image
 * just to use the first one), which is why the backdrop was slow to appear.
 */
export function PropertyDetailHeader() {
  const { property } = usePropertyDetail()
  const archive = propertyOverlays.use("archive")

  useBreadcrumbLabel(property.id, property.name)

  const heroImage = property.coverImageUrl
  const heroContainerRef = useRef<HTMLDivElement>(null)
  // Tracks *which* image loaded rather than a boolean, so switching images
  // starts un-faded on its own — a boolean would need a synchronous reset in
  // the effect below, which cascades renders.
  const [loadedHero, setLoadedHero] = useState<string | null>(null)
  const heroLoaded = Boolean(heroImage) && loadedHero === heroImage

  // Fade-in is gated on load so we don't animate an empty box. On browser
  // back (or any remount) the <img> is often already in HTTP cache —
  // `onLoad` may never fire, so also sync from `img.complete`.
  useEffect(() => {
    if (!heroImage) return

    let cancelled = false
    const frame = requestAnimationFrame(() => {
      const img = heroContainerRef.current?.querySelector("img")
      if (!cancelled && img?.complete && img.naturalHeight > 0) {
        setLoadedHero(heroImage)
      }
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
    }
  }, [heroImage])

  return (
    <>
      {heroImage ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-1/2 overflow-hidden select-none"
          style={{
            maskImage:
              "radial-gradient(ellipse 40% 55% at 50% 20%, white 0%, transparent 125%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 40% 55% at 50% 20%, white 0%, transparent 125%)",
          }}
        >
          <motion.div
            ref={heroContainerRef}
            className="relative size-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: heroLoaded ? 1 : 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <Image
              src={heroImage}
              alt=""
              fill
              priority
              sizes="100vw"
              // Presigned S3/R2 URLs are per-org and short-lived — skip the
              // `/_next/image` optimizer (which would need remote-pattern
              // config for a domain that varies per deployment) and let the
              // browser fetch it directly. Still get `fill` layout stability,
              // native lazy-decode, and no CLS.
              unoptimized
              onLoad={() => setLoadedHero(heroImage)}
              className="object-cover object-top opacity-20"
            />
          </motion.div>
        </div>
      ) : null}

      <Page.Header>
        <div className="flex min-w-0 flex-col gap-3.5">
          <Page.Title>{property.name}</Page.Title>

          <PropertyBadgeRow />
        </div>

        <Page.Actions>
          <Button
            variant="ghost-destructive"
            size="icon"
            onClick={() => archive.open(property.id)}
          >
            <PlatformIcon icon="IconArchive" size={16} />
          </Button>
          <LinkButton
            href={ROUTES.propertySettings(property.id)}
            variant="outline-muted"
            size="icon"
          >
            <PlatformIcon icon="IconSettingsGear2" size={16} />
          </LinkButton>
        </Page.Actions>
      </Page.Header>
    </>
  )
}
