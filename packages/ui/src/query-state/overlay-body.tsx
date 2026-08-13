"use client"

import * as React from "react"

import { EmptyState } from "../empty-state"
import type { OverlayQuery } from "./types"

/**
 * Deep-link boundary for an overlay (D-15). Handles loading, not-found, and
 * forbidden once so no overlay reimplements them.
 *
 * Structural copy of `PageBoundary` (page.tsx:98-159), widened to discriminate
 * the tRPC error code. Keeping the query type structural is deliberate — it
 * keeps @villuh/ui free of a TanStack Query dependency.
 *
 * D-44: the FORBIDDEN branch exists for correctness and to future-proof a
 * role-gated read, but it is currently UNREACHABLE. RLS turns every
 * cross-organization read into NOT_FOUND before any authorization check runs
 * (which is also the right posture — no existence oracle). Do not write an
 * acceptance test for it; you cannot produce the state.
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
