"use client"

import { createContext, useContext } from "react"
import { trpc } from "@villuh/api"
import { Page } from "@villuh/ui"
import type { inferRouterOutputs } from "@trpc/server"
import type { AppRouter } from "@villuh/server/router"

type RouterOutput = inferRouterOutputs<AppRouter>
export type PropertyDetail = RouterOutput["properties"]["get"]["property"]
export type PropertyUnit = RouterOutput["properties"]["get"]["units"][number]

type PropertyDetailContext = {
  property: PropertyDetail
  units: PropertyUnit[]
}

const PropertyDetailContext = createContext<PropertyDetailContext | null>(null)

/**
 * Owns the `properties.get` fetch for the whole `(detail)` route group and
 * gates `children` on it (via `Page.Boundary`) — mount this around the
 * header/tabs-nav/chrome as well as the tab content, not just the content,
 * so everything reads from `usePropertyDetail()` instead of some of it
 * getting the data via a render-prop and the rest via context.
 */
export function PropertyDetailProvider({
  propertyId,
  pending,
  children,
}: {
  propertyId: string
  pending: React.ReactNode
  children: React.ReactNode
}) {
  const query = trpc.properties.get.useQuery({ propertyId })

  return (
    <Page.Boundary query={query} pending={pending}>
      {(data) => (
        <PropertyDetailContext.Provider
          value={{ property: data.property, units: data.units }}
        >
          {children}
        </PropertyDetailContext.Provider>
      )}
    </Page.Boundary>
  )
}

/** Throws outside `PropertyDetailProvider` — a component can't consume the
 * context it renders the `.Provider` for, so callers must sit as a child of
 * `PropertyDetailProvider`, never the component that mounts it. */
export function usePropertyDetail(): PropertyDetailContext {
  const ctx = useContext(PropertyDetailContext)
  if (!ctx) {
    throw new Error(
      "usePropertyDetail must be used inside PropertyDetailProvider"
    )
  }
  return ctx
}
