/**
 * Pure display helpers for floor plans (D-39). No React import — these format
 * primitives for the card spec line, the wizard Review step, and anywhere else
 * a floor plan's numbers are shown. The formatting rules live here exactly once
 * (UI-SPEC Copywriting Contract § Formatting rules).
 */

/** ` · ` — space, U+00B7, space. The separator used everywhere in this phase. */
const SPEC_SEPARATOR = " · "

/**
 * Bathrooms with trailing zeros trimmed — `1` → `1`, `1.5` → `1.5`,
 * `1.75` → `1.75`. Never the `numeric(4,2)` string form (`1.00`). Input is a
 * JS number (the ORM returns `mode: "number"`, D-07), so `String(Number(n))`
 * collapses `1.00`→`1` and `1.50`→`1.5` without touching quarter steps.
 */
export function formatBathrooms(bathrooms: number): string {
  return String(Number(bathrooms))
}

/**
 * The floor plan spec line — e.g. `2 bd · 1.75 ba · 1,100 sq ft`,
 * `Studio · 1 ba · 480 sq ft`, or `3 bd · 2 ba` when square footage is absent.
 * `bedrooms === 0` renders `Studio` (never `0 bd`); square footage is
 * thousands-separated and omitted entirely when null/undefined (D-39).
 */
export function formatFloorPlanSpecs(specs: {
  bedrooms: number
  bathrooms: number
  squareFootage?: number | null
}): string {
  const parts: string[] = [
    specs.bedrooms === 0 ? "Studio" : `${specs.bedrooms} bd`,
    `${formatBathrooms(specs.bathrooms)} ba`,
  ]
  if (specs.squareFootage != null) {
    parts.push(`${specs.squareFootage.toLocaleString("en-US")} sq ft`)
  }
  return parts.join(SPEC_SEPARATOR)
}

/**
 * Unit-count copy for the floor plan card: `No units assigned` / `1 unit` /
 * `{n} units`.
 */
export function formatUnitCount(count: number): string {
  if (count <= 0) return "No units assigned"
  if (count === 1) return "1 unit"
  return `${count} units`
}
