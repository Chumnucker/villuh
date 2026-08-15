"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { trpc } from "@villuh/api"
import {
  persistStagedGallery,
  revokeStagedBlobUrls,
  type StagedGalleryItem,
} from "@/modules/properties/lib/staged-gallery"

/**
 * Owns the staged floor-plan gallery for one wizard: the in-memory items, the
 * ids of removed existing images, the four gallery mutations, and the blob-URL
 * cleanup. Nothing here touches the network until `persist(floorPlanId)` runs on
 * Confirm/Save — so an abandoned wizard leaves zero S3 objects (D-41).
 */
export function useFloorPlanGallery(initialItems: StagedGalleryItem[] = []) {
  const [items, setItems] = useState<StagedGalleryItem[]>(initialItems)
  const [removedExistingIds, setRemovedExistingIds] = useState<string[]>([])
  const [isPersisting, setIsPersisting] = useState(false)

  const presign = trpc.uploads.presignFloorPlanImage.useMutation()
  const add = trpc.floorPlans.gallery.add.useMutation()
  const remove = trpc.floorPlans.gallery.remove.useMutation()
  const reorder = trpc.floorPlans.gallery.reorder.useMutation()

  // Revoke any object URLs on unmount using the latest snapshot.
  const itemsRef = useRef(items)
  useEffect(() => {
    itemsRef.current = items
  }, [items])
  useEffect(() => () => revokeStagedBlobUrls(itemsRef.current), [])

  const markExistingRemoved = useCallback((imageId: string) => {
    setRemovedExistingIds((prev) => [...prev, imageId])
  }, [])

  const persist = useCallback(
    async (floorPlanId: string) => {
      setIsPersisting(true)
      try {
        await persistStagedGallery({
          items,
          removedExistingIds,
          presign: (input) => presign.mutateAsync({ floorPlanId, ...input }),
          add: (input) => add.mutateAsync({ floorPlanId, ...input }),
          remove: (input) => remove.mutateAsync({ floorPlanId, ...input }),
          reorder: (input) => reorder.mutateAsync({ floorPlanId, ...input }),
        })
      } finally {
        setIsPersisting(false)
      }
    },
    [items, removedExistingIds, presign, add, remove, reorder]
  )

  /** Reset to a given baseline, revoking any locally-added blob URLs first. */
  const reset = useCallback((to: StagedGalleryItem[]) => {
    revokeStagedBlobUrls(itemsRef.current)
    setItems(to)
    setRemovedExistingIds([])
  }, [])

  return {
    items,
    setItems,
    removedExistingIds,
    markExistingRemoved,
    isPersisting,
    persist,
    reset,
  }
}
