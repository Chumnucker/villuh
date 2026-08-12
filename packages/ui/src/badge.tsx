import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "./utils"
import {
  PlatformIcon,
  isPlatformIconName,
  type PlatformIconName,
} from "./icon"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-lg border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

/** Soft `/15` fills for the fixed tag/status color palette. */
const tagBadgeVariants = cva("border-transparent", {
  variants: {
    variant: {
      slate: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
      blue: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
      green: "bg-green-500/15 text-green-700 dark:text-green-300",
      amber: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
      orange: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
      red: "bg-red-500/15 text-red-700 dark:text-red-300",
      violet: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
      teal: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
    },
  },
  defaultVariants: {
    variant: "slate",
  },
})

export type TagBadgeVariant = NonNullable<
  VariantProps<typeof tagBadgeVariants>["variant"]
>

export type TagBadgeProps = Omit<React.ComponentProps<typeof Badge>, "variant"> &
  VariantProps<typeof tagBadgeVariants> & {
    /** When set, renders a leading 12px platform icon. */
    icon?: PlatformIconName | string | null
  }

function TagBadge({
  className,
  variant = "slate",
  icon,
  children,
  ...props
}: TagBadgeProps) {
  return (
    <Badge
      data-slot="tag-badge"
      data-variant={variant}
      className={cn(tagBadgeVariants({ variant }), className)}
      {...props}
    >
      {icon && isPlatformIconName(icon) ? (
        <PlatformIcon icon={icon} size={12} data-icon="inline-start" />
      ) : null}
      {children}
    </Badge>
  )
}

/** Resolve a free-string color key from the API into a known TagBadge variant. */
function toTagBadgeVariant(
  colorKey: string | null | undefined
): TagBadgeVariant {
  switch (colorKey) {
    case "slate":
    case "blue":
    case "green":
    case "amber":
    case "orange":
    case "red":
    case "violet":
    case "teal":
      return colorKey
    default:
      return "slate"
  }
}

export type StatusBadgeStatus = {
  name: string
  iconKey: string
  colorKey: string
}

/** Badge + leading icon + label; `null`/`undefined` renders an unassigned fallback. */
function StatusBadge({
  status,
}: {
  status: StatusBadgeStatus | null | undefined
}) {
  if (!status) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Unassigned
      </Badge>
    )
  }

  return (
    <TagBadge
      data-slot="status-badge"
      variant={toTagBadgeVariant(status.colorKey)}
      icon={status.iconKey}
    >
      {status.name}
    </TagBadge>
  )
}

export {
  Badge,
  badgeVariants,
  TagBadge,
  tagBadgeVariants,
  toTagBadgeVariant,
  StatusBadge,
}
