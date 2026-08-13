// Bklit UI chart primitives (@bklit/area-chart) — installed via the shadcn
// registry, then flattened from `components/charts` into `src/charts` to
// match this package's existing flat sub-folder convention (see `data-grid/`).
export { Area, type AreaProps } from "./area"
export { AreaChart, type AreaChartProps } from "./area-chart"
export { Grid } from "./grid"
export { XAxis } from "./x-axis"
export { ChartTooltip } from "./tooltip/chart-tooltip"
export { chartCssVars } from "./chart-context"
export type { ChartPhase, ChartStatus } from "./chart-phase"

// Animated number transitions — re-exported so consumers never need a direct
// @number-flow/react import.
export {
  default as NumberFlow,
  type Format as NumberFlowFormat,
} from "@number-flow/react"

// Re-exported so consumers never need a direct @visx/gradient or @visx/curve import.
export { LinearGradient } from "@visx/gradient"
export { curveCardinal, curveMonotoneX } from "@visx/curve"
