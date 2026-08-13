"use client"

import * as React from "react"
import type { MetricSparklinePoint } from "./metric-card"

/**
 * Ported from discogg's `hover-bridge.tsx` (metric card source). Wraps children
 * in a relative-positioned div. On mousemove, maps the cursor's x-fraction over
 * the element width to the nearest sparkline point and fires `onHoverChange`.
 * On mouseleave, fires `onHoverChange(null)` to restore defaults.
 *
 * The chart's own `showHighlight` handles the in-SVG indicator; this component
 * is purely responsible for updating the value/label shown in the card header.
 */
export interface HoverState {
  value: number
  date: string
  index: number
}

interface HoverBridgeProps {
  data: MetricSparklinePoint[]
  onHoverChange: (state: HoverState | null) => void
  children: React.ReactNode
}

export function HoverBridge({
  data,
  onHoverChange,
  children,
}: HoverBridgeProps) {
  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (data.length === 0) return
      const rect = e.currentTarget.getBoundingClientRect()
      const fraction = Math.max(
        0,
        Math.min(1, (e.clientX - rect.left) / rect.width)
      )
      const index = Math.round(fraction * (data.length - 1))
      const point = data[index]
      if (point) onHoverChange({ value: point.value, date: point.date, index })
    },
    [data, onHoverChange]
  )

  const handleMouseLeave = React.useCallback(() => {
    onHoverChange(null)
  }, [onHoverChange])

  return (
    <div
      className="relative"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  )
}
