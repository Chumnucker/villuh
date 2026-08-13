"use client"

import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  PlatformIcon,
  cn,
} from "@villuh/ui"
import {
  TAG_COLOR_KEYS,
  TAG_ICON_KEYS,
  type TagColorKey,
  type TagIconKey,
} from "@villuh/server/schemas/tags"

/** Solid fills for the color swatch grid. */
const TAG_SWATCH_CLASSES: Record<TagColorKey, string> = {
  slate: "bg-slate-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
  amber: "bg-amber-500",
  orange: "bg-orange-500",
  red: "bg-red-500",
  violet: "bg-violet-500",
  teal: "bg-teal-500",
}

/** Icon ink matches the picked palette color. */
const TAG_ICON_COLOR_CLASSES: Record<TagColorKey, string> = {
  slate: "text-slate-500",
  blue: "text-blue-500",
  green: "text-green-500",
  amber: "text-amber-500",
  orange: "text-orange-500",
  red: "text-red-500",
  violet: "text-violet-500",
  teal: "text-teal-500",
}

/**
 * Fixed-palette picker (D-21, T-03-16): only the 14 `icon_key` / 8 `color_key` enum values from
 * the UI-SPEC are selectable — no free hex input, no arbitrary icon name entry. Shared by
 * `TagPicker` (freeform create), `ManageTagsDialog` (org catalog edit), and
 * `ManageUnitStatusesDialog` (unit status catalog edit).
 */
export function TagIconColorPicker({
  iconKey,
  colorKey,
  onChange,
  disabled,
  size = "default",
  className,
}: {
  iconKey: TagIconKey
  colorKey: TagColorKey
  onChange: (next: { iconKey: TagIconKey; colorKey: TagColorKey }) => void
  disabled?: boolean
  /** `sm` fits InputGroup / badge chips; default matches standalone catalog rows. */
  size?: "default" | "sm"
  className?: string
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size={size === "sm" ? "icon-xs" : "icon"}
          disabled={disabled}
          className={cn(
            "shrink-0",
            TAG_ICON_COLOR_CLASSES[colorKey],
            className
          )}
        >
          <PlatformIcon icon={iconKey} size={size === "sm" ? 14 : 16} />
          <span className="sr-only">Choose icon and color</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <div className="flex flex-col gap-3">
          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">Icon</p>
            <div className="grid grid-cols-7 gap-1">
              {TAG_ICON_KEYS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => onChange({ iconKey: icon, colorKey })}
                  aria-label={icon}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-xl hover:bg-accent",
                    TAG_ICON_COLOR_CLASSES[colorKey],
                    icon === iconKey && "bg-accent ring-1 ring-ring/35"
                  )}
                >
                  <PlatformIcon icon={icon} size={16} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">Color</p>
            <div className="grid grid-cols-8 gap-1">
              {TAG_COLOR_KEYS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => onChange({ iconKey, colorKey: color })}
                  aria-label={color}
                  className={cn(
                    "size-6 rounded-full ring-offset-2 ring-offset-popover",
                    TAG_SWATCH_CLASSES[color],
                    color === colorKey && "ring-2 ring-ring"
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
