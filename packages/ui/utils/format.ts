import type { CountryCode } from "libphonenumber-js/min"
import { parsePhoneNumberFromString } from "libphonenumber-js/min"

/** Structured mailing address fields used across landlord + resident UIs. */
export type AddressParts = {
  street?: string | null
  line2?: string | null
  city?: string | null
  region?: string | null
  postal?: string | null
  country?: string | null
}

/**
 * Single-line address for display. Returns `null` when every part is empty.
 * Safe for property, unit, tenant, or any shape that matches `AddressParts`.
 */
export function formatAddress(parts: AddressParts): string | null {
  const line = [
    [parts.street, parts.line2].filter(Boolean).join(", "),
    [parts.city, parts.region, parts.postal].filter(Boolean).join(", "),
    parts.country,
  ]
    .filter(Boolean)
    .join(", ")

  return line || null
}

/** @deprecated Prefer `formatAddress` — kept for call-site clarity on properties. */
export const formatPropertyAddress = formatAddress

/**
 * Format a stored phone string for display (national when possible).
 * Accepts E.164 or national digits; falls back to the raw string if unparseable.
 */
export function formatPhoneNumber(
  phone: string,
  defaultCountry: CountryCode = "US"
): string {
  const raw = phone.trim()
  if (!raw) return ""
  const parsed =
    parsePhoneNumberFromString(raw) ??
    parsePhoneNumberFromString(raw, defaultCountry)
  return parsed?.formatNational() ?? raw
}
