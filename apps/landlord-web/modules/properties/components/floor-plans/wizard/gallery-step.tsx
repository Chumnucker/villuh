"use client"

import { StagedGalleryField } from "@/modules/properties/components/form/staged-gallery-field"
import type { StagedGalleryItem } from "@/modules/properties/lib/staged-gallery"

/**
 * Photos step (UI-SPEC §4.2): the property form's `StagedGalleryField`, reused
 * verbatim with floor-plan empty-state copy (Resolved #1). Images stay staged
 * in memory and persist only on Confirm/Save (D-41); the 25-cap refusal is
 * already wired inside the field via `acceptImageFiles` (D-41a).
 */
export function GalleryStep({
  items,
  onChange,
  onRemoveExisting,
  disabled,
}: {
  items: StagedGalleryItem[]
  onChange: (items: StagedGalleryItem[]) => void
  onRemoveExisting: (imageId: string) => void
  disabled?: boolean
}) {
  return (
    <StagedGalleryField
      items={items}
      onChange={onChange}
      onRemoveExisting={onRemoveExisting}
      disabled={disabled}
      emptyTitle="No photos yet"
      emptyDescription="Drop in floor plan photos — they upload when you save."
    />
  )
}
