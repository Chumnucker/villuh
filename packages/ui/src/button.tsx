import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import { TextMorph } from "torph/react"

import { cn } from "./utils"
import Link, { LinkProps } from "next/link"
import { PlatformIcon, PlatformIconName } from "./icon"
import { Check, CircleAlert, Loader2 } from "lucide-react"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-xl border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:ring-offset-background focus-visible:ring-ring/35 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/85",
        muted: "bg-muted text-muted-foreground hover:bg-muted/80",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        success:
          "bg-success text-success-foreground hover:bg-success/80",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",

        "text-foreground":
          "gap-1 text-foreground hover:text-foreground/90 focus-visible:text-foreground/90",
        "text-muted":
          "gap-1 border border-transparent text-muted-foreground hover:text-foreground focus-visible:text-foreground",

        ghost:
          "border border-transparent text-muted-foreground hover:text-foreground focus-visible:text-foreground",
        "ghost-dashed":
          "border border-dashed text-muted-foreground hover:text-foreground focus-visible:text-foreground",
        "ghost-muted":
          "border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground",
        "ghost-success":
          "text-muted-foreground hover:bg-green-500/20 hover:text-green-500 focus-visible:ring-green-500/20 dark:focus-visible:ring-green-500/40",
        "ghost-destructive":
          "text-muted-foreground hover:bg-destructive/20 hover:text-destructive focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:bg-transparent dark:hover:bg-input/30",
        "outline-muted":
          "border border-muted-foreground hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground",
        "outline-success":
          "border border-success hover:bg-success/20 hover:text-success focus-visible:ring-success/20 dark:focus-visible:ring-success/40",
        "outline-destructive":
          "border border-destructive hover:bg-destructive/20 hover:text-destructive focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        "outline-secondary":
          "border border-secondary hover:bg-secondary/20 hover:text-secondary focus-visible:ring-secondary/20 dark:focus-visible:ring-secondary/40",
      },
      size: {
        default:
          "h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xs: "h-6 gap-1 px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        lg: "h-10 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-9",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export type ButtonVariants = VariantProps<typeof buttonVariants>
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, ButtonVariants {
  asChild?: boolean
}

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

function LinkButton<T extends string>({
  variant,
  size,
  className,
  ...props
}: LinkProps<T> & ButtonVariants & Omit<React.ComponentProps<"a">, "href">) {
  return (
    <Link
      rel="noopener noreferrer"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export type SubmitStatus = "idle" | "pending" | "success" | "error"

function IconStatus({
  status,
  icons,
  className,
}: {
  status: SubmitStatus
  icons?: Partial<Record<SubmitStatus, PlatformIconName | "none">>
  className?: string
}) {
  const override = icons?.[status]
  if (override === "none") return null
  if (override) {
    return <PlatformIcon icon={override} className={className} />
  }

  switch (status) {
    case "pending":
      return <Loader2 className={cn("animate-spin", className)} />
    case "success":
      return <Check className={className} />
    case "error":
      return <CircleAlert className={className} />
    default:
      return null // idle
  }
}

function SubmitButton({
  className,
  variant,
  size,
  asChild = false,
  status,
  steps = ["Save", "Saving", "Saved", "Error"],
  icons,
  iconClassName,
  children,
  disabled,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    status: SubmitStatus
    steps?: [string, string, string, string] | "none"
    icons?: Partial<Record<SubmitStatus, PlatformIconName | "none">>
    iconClassName?: string
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      type="submit"
      data-slot="button"
      data-variant={variant}
      data-size={size}
      data-status={status}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={
        disabled !== undefined
          ? disabled
          : status === "pending" || status === "success"
      }
      {...props}
    >
      {children}
      {steps !== "none" && (
        <TextMorph>
          {status === "idle"
            ? steps[0]
            : status === "pending"
              ? steps[1]
              : status === "success"
                ? steps[2]
                : steps[3]}
        </TextMorph>
      )}
      <IconStatus
        status={status}
        icons={icons}
        className={cn("size-4", iconClassName)}
      />
    </Comp>
  )
}

export { Button, LinkButton, buttonVariants, SubmitButton }
