"use client"

import * as React from "react"

import { EmptyState } from "../empty-state"

/**
 * Structural subset of a TanStack Query / tRPC result, with `data.code` so
 * `<OverlayBody>` can discriminate NOT_FOUND from FORBIDDEN. Structural on
 * purpose — it keeps `@villuh/ui` free of a data-layer dependency.
 */
export type OverlayQuery<TData> = {
  data: TData | undefined
  isLoading: boolean
  isError?: boolean
  error?: { message: string; data?: { code?: string } | null } | null
}

/**
 * Deep-link boundary for an overlay: handles loading, not-found, and
 * forbidden once so no overlay reimplements them.
 *
 * Note: the FORBIDDEN branch is currently unreachable — RLS turns every
 * cross-organization read into NOT_FOUND before any authorization check runs
 * (deliberately: no existence oracle). It exists to future-proof a role-gated
 * read.
 */
export function OverlayBody<TData>({
  query,
  pending,
  notFound,
  forbidden,
  children,
}: {
  query: OverlayQuery<TData>
  pending: React.ReactNode
  notFound?: React.ReactNode
  forbidden?: React.ReactNode
  children: (data: TData) => React.ReactNode
}): React.ReactNode {
  if (query.isError) {
    const code = query.error?.data?.code
    if (code === "NOT_FOUND") {
      return (
        notFound ?? (
          <EmptyState
            icon="IconCircleInfo"
            title="Not found"
            description="This record no longer exists, or the link is out of date."
          />
        )
      )
    }
    if (code === "FORBIDDEN") {
      return (
        forbidden ?? (
          <EmptyState
            icon="IconEyeClosed"
            title="No access"
            description="You don't have permission to view this."
          />
        )
      )
    }
    return (
      <EmptyState
        icon="IconWarningSign"
        title="Something went wrong"
        description={query.error?.message || "Please try again."}
      />
    )
  }

  // Mirrors PageBoundary: `data === undefined` also covers the disabled-query
  // window (a `useQuery` with `enabled: false` reports `isLoading: true` and
  // `data: undefined` in TanStack Query v5+), so content never renders without data.
  if (query.isLoading || query.data === undefined) return pending

  return children(query.data)
}
