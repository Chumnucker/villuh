"use client"

import * as React from "react"
import { TrendingDown, TrendingUp } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { Card } from "../card"
import {
  Area,
  AreaChart,
  curveCardinal,
  LinearGradient,
  NumberFlow,
  type NumberFlowFormat,
} from "../charts"
import { PlatformIcon, type PlatformIconName } from "../icon"
import { cn } from "../../utils"
import { HoverBridge, type HoverState } from "./hover-bridge"

/**
 * Ported 1:1 from discogg's `metric-kpi-card.tsx` (metric card source) — icon +
 * label header, color-coded trend badge, animated value/label swap on hover,
 * and a sparkline area chart with a hover crosshair bridge.
 */

export type MetricSparklinePoint = { date: string; value: number }

export interface MetricKpiCardProps {
  icon: PlatformIconName
  label: string
  defaultLabel: string
  value: number
  formatOptions?: NumberFlowFormat
  pctChange: number
  sparkline: MetricSparklinePoint[]
  /** Replaces the trend badge with a muted "Coming soon" pill and skips the sparkline chart. */
  comingSoon?: boolean
}

// ---------------------------------------------------------------------------
// Color scheme — pctChange thresholds drive both the badge and chart color.
// > 0   → green   (growing)
// === 0 → gray    (flat / no activity)
// < 0 to -25 → amber/orange (mild decline)
// < -25 → red     (sharp decline)
// ---------------------------------------------------------------------------

interface ColorScheme {
  badgeClass: string
  chartColor: string // CSS color string for SVG stroke / LinearGradient from/to
}

function getColorScheme(pct: number): ColorScheme {
  if (pct > 0) return { badgeClass: "text-green-400", chartColor: "#4ade80" }
  if (pct >= -25)
    return { badgeClass: "text-neutral-400", chartColor: "#9ca3af" }
  if (pct >= -50) return { badgeClass: "text-amber-400", chartColor: "#fbbf24" }
  return { badgeClass: "text-red-400", chartColor: "#f87171" }
}

// ---------------------------------------------------------------------------
// TrendBadge — color-coded by pctChange
// ---------------------------------------------------------------------------

function TrendBadge({ pctChange }: { pctChange: number }) {
  const { badgeClass } = getColorScheme(pctChange)
  // null when zero — AnimatePresence will fade the icon out as pctChange hits 0
  const iconKey = pctChange > 0 ? "up" : pctChange < 0 ? "down" : null
  // Keep +/- outside NumberFlow. NumberFlow's .number uses
  // `margin: 0 calc(-1 * var(--number-flow-mask-width))` so the digit block
  // bleeds ~0.5em outside the host — straight under a sibling sign unless the
  // mask width is zeroed.
  const sign = pctChange > 0 ? "+" : pctChange < 0 ? "\u2212" : null

  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-1 text-xs tabular-nums transition-colors duration-150 sm:text-sm",
        badgeClass
      )}
    >
      <span className="relative flex size-3.5 shrink-0 items-center justify-center">
        <AnimatePresence initial={false}>
          {iconKey !== null && (
            <motion.span
              key={iconKey}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              {pctChange > 0 ? (
                <TrendingUp size={14} />
              ) : (
                <TrendingDown size={14} />
              )}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <span className="inline-flex items-center gap-0.5">
        {sign !== null && <span className="leading-none">{sign}</span>}
        <NumberFlow
          value={Math.abs(pctChange)}
          isolate
          suffix="%"
          // Kill the intentional edge-bleed so digits can't paint under +/- or %.
          className="[--number-flow-mask-width:0em]"
        />
      </span>
    </span>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDay(dateStr: string): string {
  const parts = dateStr.split("-")
  const month = Number(parts[1] ?? "1")
  const day = Number(parts[2] ?? "1")
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ]
  return `${months[month - 1] ?? "?"} ${day}`
}

// Day-over-day pct change for the hover badge.
// "No activity on this day" is always neutral (0%) — showing -100% for a
// zero-value day is misleading ("all activity stopped") vs simply "quiet day".
function dayPctChange(current: number, prior: number): number {
  if (current === 0) return 0 // quiet day → neutral regardless of prior
  if (prior === 0) return 100 // new activity, no prior baseline
  return Math.round(((current - prior) / prior) * 100)
}

// ---------------------------------------------------------------------------
// MetricKpiCard
// ---------------------------------------------------------------------------

export function MetricKpiCard({
  icon,
  label,
  defaultLabel,
  value,
  formatOptions,
  pctChange,
  sparkline = [], // guard against stale-cache undefined
  comingSoon = false,
}: MetricKpiCardProps) {
  const [hover, setHover] = React.useState<HoverState | null>(null)

  // ── Animation flash prevention ──────────────────────────────────────────
  // Initial chartPhase is "ready" → animating=false → clip full width → chart
  // is FULLY VISIBLE on first render. The reveal effect fires in useEffect
  // (after paint), which then sets phase="revealing" and Motion applies
  // initial clip width=0 via useLayoutEffect BEFORE the next paint.
  //
  // Fix:
  //  1. chartMounted=false prevents SSR/first-client rendering of the chart.
  //  2. chartReady=false keeps the chart invisible (visibility:hidden) until
  //     onPhaseChange fires with "revealing" — at that point the clip is already
  //     at width=0, so making visible immediately shows the animation mid-start
  //     with no pre-flash.
  const [chartMounted, setChartMounted] = React.useState(false)
  const [chartReady, setChartReady] = React.useState(false)
  React.useEffect(() => {
    setChartMounted(true)
  }, [])
  const handlePhaseChange = React.useCallback((phase: string) => {
    if (phase === "revealing" || phase === "ready") setChartReady(true)
  }, [])

  // Day-specific pct change: hovered day vs the prior day in the sparkline.
  // No DB call needed — computed from the data already in memory.
  const displayPctChange = React.useMemo(() => {
    if (!hover) return pctChange
    const prior = hover.index > 0 ? (sparkline[hover.index - 1]?.value ?? 0) : 0
    return dayPctChange(hover.value, prior)
  }, [hover, pctChange, sparkline])

  const displayValue = hover?.value ?? value
  const displayLabel = hover ? formatDay(hover.date) : defaultLabel
  const { chartColor } = getColorScheme(displayPctChange)

  // Convert ISO dates to noon-UTC Date objects (avoids day-boundary tz issues).
  // Apply ε=0.001 to EVERY zero-value point — not just when all are zero.
  // A single day at exactly 0 creates a local d3 scale segment with domain [0,0]
  // which collapses the clip-path at that tick, making the line vanish at the
  // bottom edge of the card. ε is invisible in the chart but prevents the collapse.
  // Displayed values always use the original sparkline (hover.value), so labels
  // correctly show 0.
  const chartData = React.useMemo(() => {
    if (comingSoon || sparkline.length === 0) return []
    const now = new Date()
    const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
    return sparkline
      .filter((p) => p.date <= localToday)
      .map((p) => ({
        date: new Date(`${p.date}T12:00:00Z`),
        value: p.value === 0 ? 0.001 : p.value,
      }))
  }, [comingSoon, sparkline])

  const gradientId = `sparkline-${label.toLowerCase().replace(/\s+/g, "-")}`

  return (
    <Card className="flex flex-col gap-0 overflow-hidden rounded-2xl py-0 shadow-none">
      {/* Header: icon + label (left), color-coded trend badge (right) */}
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-1">
        <span className="flex min-w-0 items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase sm:text-sm">
          <PlatformIcon icon={icon} size={18} className="shrink-0" />
          <span className="truncate">{label}</span>
        </span>
        {comingSoon ? (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            Coming soon
          </span>
        ) : (
          <TrendBadge pctChange={displayPctChange} />
        )}
      </div>

      {/* Value + label — number left-aligned, label right-aligned (justify-between).
          items-center (not baseline): NumberFlow's custom-element metrics fight
          baseline alignment and look vertically smashed on mid-width cards.
          mode="popLayout" removes the exiting element from layout immediately so the
          new label pops in without waiting — no full exit-then-enter delay. */}
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="min-w-0 font-mono text-xl leading-none font-semibold text-foreground tabular-nums">
          {comingSoon ? (
            "\u2014"
          ) : (
            <NumberFlow
              value={displayValue}
              isolate
              className="[--number-flow-mask-width:0em]"
              format={
                formatOptions ?? {
                  notation: "standard",
                  maximumFractionDigits: 0,
                }
              }
            />
          )}
        </span>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={displayLabel}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="shrink-0 text-xs text-muted-foreground sm:text-sm"
          >
            {comingSoon ? defaultLabel : displayLabel}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Sparkline — invisible until onPhaseChange("revealing") fires (see comment
          above). chartColor + gradient update reactively as hover changes pctChange.
          Outer div uses the padding-bottom aspect-ratio hack (height:0 + paddingBottom
          33.33%) instead of CSS aspect-ratio — this makes the box height literally
          impossible for children to change. Inner absolute div fills the space and
          hosts the AreaChart with height:100%. */}
      <HoverBridge data={sparkline} onHoverChange={setHover}>
        <div
          className={cn(
            "relative w-full overflow-hidden",
            !chartReady && "invisible"
          )}
          style={{ height: 0, paddingBottom: "27%" }}
        >
          <div className="absolute inset-0">
            {chartMounted && chartData.length > 0 && (
              <AreaChart
                data={chartData}
                margin={{ top: 2, right: 0, bottom: 3, left: 0 }}
                aspectRatio="3/1"
                onPhaseChange={handlePhaseChange}
                style={{ height: "100%" }}
              >
                <LinearGradient
                  from={chartColor}
                  fromOpacity={0.35}
                  id={gradientId}
                  to={chartColor}
                  toOpacity={0}
                />
                <Area
                  curve={curveCardinal.tension(0.65)}
                  dataKey="value"
                  fill={`url(#${gradientId})`}
                  fillOpacity={1}
                  stroke={chartColor}
                  strokeWidth={2}
                  showHighlight
                />
              </AreaChart>
            )}
          </div>
        </div>
      </HoverBridge>
    </Card>
  )
}
