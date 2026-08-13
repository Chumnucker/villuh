"use client"

import { EmptyState, Page } from "@villuh/ui"
import { SettingsSection } from "@/modules/properties/components/settings/section"

/**
 * Amenities for this property. Placeholder for now — there's no amenity table
 * yet, so neither the org-wide catalog nor the per-property selection exists.
 */
export function PropertySettingsAmenitiesTemplate() {
  return (
    <Page.Content className="gap-6">
      <SettingsSection
        title="Property amenities"
        icon="IconStar"
        description="What this property offers — shown to residents on the listing and the resident portal."
        className="grid-cols-1 sm:grid-cols-1"
      >
        <EmptyState
          icon="IconStar"
          title="Amenities coming soon"
          description="Pick the amenities this property has, like parking, laundry, or a gym, and they'll appear on the property's public details."
          className="rounded-2xl border border-dashed border-border py-12"
        />
      </SettingsSection>

      <SettingsSection
        title="Amenity catalog"
        icon="IconClipboard2"
        description="Your organization's reusable amenity list, shared across every property."
        className="grid-cols-1 sm:grid-cols-1"
      >
        <EmptyState
          icon="IconPlusSmall"
          title="Custom amenities coming soon"
          description="Create your own amenities once and reuse them anywhere, the same way tags and unit statuses work today."
          className="rounded-2xl border border-dashed border-border py-12"
        />
      </SettingsSection>
    </Page.Content>
  )
}
