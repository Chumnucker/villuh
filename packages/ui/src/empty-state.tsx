import * as React from "react"

import { cn } from "../utils"
import { PlatformIcon, type PlatformIconName } from "./icon"

/**
 * Centered "nothing here" (or error) placeholder — icon, title, supporting
 * copy, and an optional action row. Pair with `Page.Boundary`'s `empty` /
 * `error` slots, or drop into any card/section that can be empty.
 */
function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  icon?: PlatformIconName
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div
      data-slot="empty-state"
      role="status"
      className={cn(
        "flex flex-col items-center justify-center gap-1 py-8 text-center",
        className
      )}
      {...props}
    >
      {icon ? (
        <PlatformIcon
          icon={icon}
          size={32}
          className="text-muted-foreground mb-3"
        />
      ) : null}
      <p className="text-lg font-medium text-foreground">{title}</p>
      {description ? (
        <p className="text-base text-muted-foreground">{description}</p>
      ) : null}
      {action ? (
        <div className="mt-3 flex items-center justify-center gap-2">
          {action}
        </div>
      ) : null}
    </div>
  )
}

export { EmptyState }
