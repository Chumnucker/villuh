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
  unitDetail: (unitId: string) => r(`/units/${unitId}`),
  tenants: r("/tenants"),
  leases: r("/leases"),
  onboarding: r("/onboarding"),
  documents: r("/documents"),
  rent: r("/rent"),
  inbox: r("/inbox"),
  members: r("/members"),
  billing: r("/billing"),
  settings: r("/settings"),
  settingsUnitStatuses: r("/settings/unit-statuses"),
  auth: {
    login: r("/auth/login"),
    register: r("/auth/register"),
    forgotPassword: r("/auth/forgot-password"),
    resetPassword: r("/auth/reset-password"),
  },
} as const
