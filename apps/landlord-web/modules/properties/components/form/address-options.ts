/** Display labels stored on the property (match Mapbox `country` / `address_level1` names). */

export const COUNTRIES = [
  "United States",
  "Canada",
  "United Kingdom",
  "Australia",
  "Mexico",
  "Germany",
  "France",
  "Spain",
  "Italy",
  "Netherlands",
  "Belgium",
  "Switzerland",
  "Austria",
  "Ireland",
  "Portugal",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Poland",
  "Czech Republic",
  "Japan",
  "South Korea",
  "China",
  "India",
  "Singapore",
  "New Zealand",
  "Brazil",
  "Argentina",
  "Chile",
  "Colombia",
  "South Africa",
  "United Arab Emirates",
  "Israel",
  "Philippines",
  "Thailand",
  "Vietnam",
  "Indonesia",
  "Malaysia",
  "Hong Kong",
  "Taiwan",
] as const

export const US_STATES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "District of Columbia",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
] as const

export const CA_PROVINCES = [
  "Alberta",
  "British Columbia",
  "Manitoba",
  "New Brunswick",
  "Newfoundland and Labrador",
  "Northwest Territories",
  "Nova Scotia",
  "Nunavut",
  "Ontario",
  "Prince Edward Island",
  "Quebec",
  "Saskatchewan",
  "Yukon",
] as const

export function regionsForCountry(country: string | null | undefined): readonly string[] {
  switch (country) {
    case "United States":
      return US_STATES
    case "Canada":
      return CA_PROVINCES
    default:
      return []
  }
}

/** Keep a Mapbox/manual value selectable even if it isn't in the curated list. */
export function withCurrentValue(
  options: readonly string[],
  current: string | null | undefined
): string[] {
  const value = current?.trim()
  if (!value) return [...options]
  if (options.some((option) => option.toLowerCase() === value.toLowerCase())) {
    return [...options]
  }
  return [value, ...options]
}
