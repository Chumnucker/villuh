/**
 * Mapbox AddressAutofill theme tokens aligned with Villuh popover/combobox styling.
 *
 * Pass to `<AddressAutofill theme={mapboxAutofillTheme} />` from `@mapbox/search-js-react`.
 * Uses design-system CSS variables so light/dark mode stays in sync.
 *
 * Suggestion rows use Mapbox scoped classes:
 * - `.SuggestionName` — primary line (street / place title)
 * - `.SuggestionDesc` — secondary line (city, region, country)
 *
 * @see https://docs.mapbox.com/mapbox-search-js/api/web/theming/
 */
export interface MapboxAutofillTheme {
  variables?: {
    unit?: string
    borderRadius?: string
    colorBackground?: string
    colorText?: string
    colorBackgroundHover?: string
    colorBackgroundActive?: string
    colorPrimary?: string
    colorSecondary?: string
    border?: string
    boxShadow?: string
    fontFamily?: string
    fontWeight?: string
    fontWeightSemibold?: string
    fontWeightBold?: string
    padding?: string
    paddingFooterLabel?: string
    spacing?: string
    duration?: string
  }
  /** Scoped CSS overrides — Mapbox class names are stable but not semver-guaranteed. */
  cssText?: string
}

export interface MapboxAutofillPopoverOptions {
  offset: number
  placement: "top-start" | "bottom-start"
  flip: boolean
}

/** Panel + list chrome (background, border, hover states). */
const mapboxAutofillThemeVariables: NonNullable<MapboxAutofillTheme["variables"]> = {
  unit: "13px",
  borderRadius: "0.70rem",
  colorBackground: "var(--popover)",
  colorText: "var(--foreground)",
  colorBackgroundHover: "var(--secondary)",
  colorBackgroundActive: "var(--secondary)",
  colorPrimary: "var(--primary)",
  colorSecondary: "var(--muted-foreground)",
  border: "1px solid color-mix(in oklch, var(--foreground) 5%, transparent)",
  boxShadow:
    "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  fontFamily: "inherit",
  fontWeight: "400",
  fontWeightSemibold: "500",
  fontWeightBold: "600",
  padding: "0.625rem 0.75rem",
  paddingFooterLabel: "0.5rem 0.75rem",
  spacing: "0.125rem",
  duration: "100ms",
}

const mapboxAutofillThemeCssText = `
  .SuggestionIcon {
    display: none;
  }

  .ResultsList {
    padding: 0.375rem;
  }

  .Suggestion {
    border-radius: calc(var(--borderRadius) - 0.125rem);
  }

  .SuggestionText {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
  }

  .SuggestionName {
    color: var(--foreground);
    font-weight: var(--fontWeightSemibold);
  }

  .SuggestionDesc {
    color: var(--muted-foreground);
    font-weight: var(--fontWeight);
  }

  .ResultsAttribution {
    display: none;
  }
`

export const mapboxAutofillTheme: MapboxAutofillTheme = {
  variables: mapboxAutofillThemeVariables,
  cssText: mapboxAutofillThemeCssText,
}

export const mapboxAutofillPopoverOptions: MapboxAutofillPopoverOptions = {
  offset: 10,
  placement: "bottom-start",
  flip: true,
}
