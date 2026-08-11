import type { Route } from "next"

function r<T extends string>(path: T): Route<T> {
  return path as Route<T>
}

export const ROUTES = {
  home: r("/"),
  properties: r("/properties"),
  propertyNew: r("/properties/new"),
  propertyDetail: (propertyId: string) => r(`/properties/${propertyId}`),
  propertyEdit: (propertyId: string) => r(`/properties/${propertyId}/edit`),
  units: r("/units"),
  tenants: r("/tenants"),
  leases: r("/leases"),
  onboarding: r("/onboarding"),
  documents: r("/documents"),
  rent: r("/rent"),
  members: r("/members"),
  billing: r("/billing"),
  settings: r("/settings"),
  auth: {
    login: r("/auth/login"),
    register: r("/auth/register"),
    forgotPassword: r("/auth/forgot-password"),
    resetPassword: r("/auth/reset-password"),
  },
} as const
