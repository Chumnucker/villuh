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
  AMENITY_ICON_KEYS,
  AMENITY_ICON_COLOR_CLASSES,
  AMENITY_SWATCH_CLASSES,
  TAG_COLOR_KEYS,
  type AmenityIconKey,
  type TagColorKey,
} from "../lib/amenity-icons"

/**
 * Fixed-palette amenity picker (D-42): only the 38 `amenity_icon` keys and the 8 shared
 * `tag_color` values are selectable — no free hex input, no arbitrary icon name entry.
 * Mirrors `TagIconColorPicker`; the icon grid scrolls because 38 icons overflow the popover.
 * Emits `{ iconKey, colorKey }` on any change. Reused by the catalog dialog, the property
 * amenity sheet, and the freeform add flows.
 */
export function AmenityIconColorPicker({
  iconKey,
  colorKey,
  onChange,
  disabled,
  size = "default",
  className,
}: {
  iconKey: AmenityIconKey
  colorKey: TagColorKey
  onChange: (next: { iconKey: AmenityIconKey; colorKey: TagColorKey }) => void
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
            AMENITY_ICON_COLOR_CLASSES[colorKey],
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
            <div className="grid max-h-48 grid-cols-7 gap-1 overflow-y-auto">
              {AMENITY_ICON_KEYS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => onChange({ iconKey: icon, colorKey })}
                  aria-label={icon}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-xl hover:bg-accent",
                    AMENITY_ICON_COLOR_CLASSES[colorKey],
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
                    AMENITY_SWATCH_CLASSES[color],
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
