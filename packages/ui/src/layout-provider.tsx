"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { BreadcrumbsType } from "./breadcrumbs"

interface LayoutContext {
  breadcrumbs: BreadcrumbsType
  setBreadcrumbs: React.Dispatch<React.SetStateAction<BreadcrumbsType>>
}

interface ContextProps {
  children: React.ReactNode
}

export const LayoutContext = createContext<LayoutContext | null>(null)

export const LayoutProvider = ({ children }: ContextProps) => {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbsType>({
    values: {},
  })

  return (
    <LayoutContext.Provider
      value={{
        breadcrumbs,
        setBreadcrumbs,
      }}
    >
      <div data-app-layout className="min-h-svh">
        {children}
      </div>
    </LayoutContext.Provider>
  )
}

export const useLayout = (): LayoutContext => {
  const context = useContext(LayoutContext)
  if (context === null) {
    throw new Error("Should use useLayout with LayoutProvider")
  }
  return context
}

/**
 * Publish a human label for a dynamic path segment (usually a UUID).
 * `NavigationBreadcrumbs` shows a skeleton for UUID segments until a label
 * is registered here — call from the template that loads that entity.
 */
export function useBreadcrumbLabel(
  segment: string | undefined,
  label: string | null | undefined
) {
  const { setBreadcrumbs } = useLayout()

  useEffect(() => {
    if (!segment || !label) return

    setBreadcrumbs((prev) => {
      const existing = prev.values[segment]
      if (existing === label) return prev
      if (
        typeof existing === "object" &&
        existing !== null &&
        "label" in existing &&
        existing.label === label
      ) {
        return prev
      }
      return { values: { ...prev.values, [segment]: label } }
    })
  }, [segment, label, setBreadcrumbs])
}
