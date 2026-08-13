import type { Route } from "next"

function r<T extends string>(path: T): Route<T> {
  return path as Route<T>
}

export const ROUTES = {
  home: r("/"),
  properties: r("/properties"),
  propertyNew: r("/properties/new"),
  propertyDetail: (propertyId: string) => r(`/properties/${propertyId}`),
  propertyUnits: (propertyId: string) => r(`/properties/${propertyId}/units`),
  propertyGallery: (propertyId: string) => r(`/properties/${propertyId}/gallery`),
  propertyTenants: (propertyId: string) => r(`/properties/${propertyId}/tenants`),
  propertyAnalytics: (propertyId: string) =>
    r(`/properties/${propertyId}/analytics`),
  propertySettings: (propertyId: string) =>
    r(`/properties/${propertyId}/settings`),
  propertySettingsUnits: (propertyId: string) =>
    r(`/properties/${propertyId}/settings/units`),
  propertySettingsAmenities: (propertyId: string) =>
    r(`/properties/${propertyId}/settings/amenities`),
  propertySettingsIntegrations: (propertyId: string) =>
    r(`/properties/${propertyId}/settings/integrations`),
  propertySettingsGallery: (propertyId: string) =>
    r(`/properties/${propertyId}/settings/gallery`),
  propertySettingsTeam: (propertyId: string) =>
    r(`/properties/${propertyId}/settings/team`),
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
  auth: {
    login: r("/auth/login"),
    register: r("/auth/register"),
    forgotPassword: r("/auth/forgot-password"),
    resetPassword: r("/auth/reset-password"),
  },
} as const
