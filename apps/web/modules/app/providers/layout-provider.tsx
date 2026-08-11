"use client"

import { createContext, useContext, useState } from "react"
import { BreadcrumbsType } from "../components/navigation/breadcrumbs"

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
