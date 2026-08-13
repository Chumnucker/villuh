"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import {
  Button,
  LinkButton,
  Page,
  PlatformIcon,
  useBreadcrumbLabel,
} from "@villuh/ui"
import { formatAddress, formatPhoneNumber } from "@villuh/ui/utils"
import { ROUTES } from "@/app/routes"
import { ArchivePropertyDialog } from "@/modules/properties/components/actions/archive-property-dialog"
import { TagPicker } from "@/modules/properties/components/tags/tag-picker"
import { usePropertyDetail } from "@/modules/properties/providers/property-detail-provider"

/**
 * Property detail page header — name, address/phone, tags, edit/archive
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
  const [archiveOpen, setArchiveOpen] = useState(false)

  useBreadcrumbLabel(property.id, property.name)

  const heroImage = property.coverImageUrl
  const [heroLoaded, setHeroLoaded] = useState(false)
  // Reset if the image itself changes (e.g. navigating straight from one
  // property's detail page to another's, which doesn't remount this
  // persistent header) so the new image still fades in instead of popping.
  useEffect(() => {
    setHeroLoaded(false)
  }, [heroImage])

  const address = formatAddress(property)
  const phone = property.phone?.trim()
    ? formatPhoneNumber(property.phone)
    : null

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
              onLoad={() => setHeroLoaded(true)}
              className="object-cover object-top opacity-12 dark:opacity-10"
            />
          </motion.div>
        </div>
      ) : null}

      <Page.Header>
        <div className="flex min-w-0 flex-col gap-3.5">
          <Page.Title>{property.name}</Page.Title>

          {address || phone ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {address ? (
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <PlatformIcon
                    icon="IconMapPin"
                    size={16}
                    className="shrink-0"
                  />
                  <span className="truncate">{address}</span>
                </span>
              ) : null}
              {phone ? (
                <span className="inline-flex items-center gap-1.5">
                  <PlatformIcon
                    icon="IconPhone"
                    size={16}
                    className="shrink-0"
                  />
                  {phone}
                </span>
              ) : null}
            </div>
          ) : null}

          <TagPicker propertyId={property.id} appearance="inline" />
        </div>

        <Page.Actions>
          <Button
            variant="ghost-destructive"
            size="icon"
            onClick={() => setArchiveOpen(true)}
          >
            <PlatformIcon icon="IconArchive" size={16} />
          </Button>
          <LinkButton
            href={ROUTES.propertyEdit(property.id)}
            variant="outline-muted"
            size="icon"
          >
            <PlatformIcon icon="IconSettingsGear2" size={16} />
          </LinkButton>
        </Page.Actions>
      </Page.Header>

      <ArchivePropertyDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        propertyId={property.id}
        propertyName={property.name}
      />
    </>
  )
}
