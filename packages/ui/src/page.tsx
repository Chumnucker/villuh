import * as React from "react"

import { cn } from "./utils"

function PageShell({
  className,
  centered = false,
  ...props
}: React.ComponentProps<"div"> & {
  /** Constrain and center the page; max-width steps up at each breakpoint. */
  centered?: boolean
}) {
  return (
    <div
      data-slot="page-shell"
      data-centered={centered ? "" : undefined}
      className={cn(
        "flex min-h-full flex-1 flex-col gap-8 p-content pb-0",
        centered &&
          "mx-auto px-content py-16 w-full max-w-3xl sm:max-w-4xl lg:max-w-2xl xl:max-w-3xl 2xl:max-w-4xl",
        className,
      )}
      {...props}
    />
  )
}

function PageHeader({ className, ...props }: React.ComponentProps<"header">) {
  return (
    <header
      data-slot="page-header"
      className={cn(
        "grid auto-rows-min items-start",
        "has-data-[slot=page-actions]:grid-cols-[1fr_auto]",
        "has-data-[slot=page-description]:grid-rows-[auto_auto] has-data-[slot=page-description]:gap-2",
        className
      )}
      {...props}
    />
  )
}

function PageTitle({ className, ...props }: React.ComponentProps<"h1">) {
  return (
    <h1
      data-slot="page-title"
      className={cn(
        "font-mono text-3xl font-medium tracking-tight text-foreground",
        className
      )}
      {...props}
    />
  )
}

function PageDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="page-description"
      className={cn("text-muted-foreground", className)}
      {...props}
    />
  )
}

function PageActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="page-actions"
      className={cn(
        "col-start-2 row-span-2 row-start-1 flex items-center justify-end gap-2 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function PageContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="page-content"
      className={cn("flex min-h-0 flex-1 flex-col gap-4", className)}
      {...props}
    />
  )
}

const Page = {
  Shell: PageShell,
  Header: PageHeader,
  Title: PageTitle,
  Description: PageDescription,
  Actions: PageActions,
  Content: PageContent,
}

export {
  Page,
  PageShell,
  PageHeader,
  PageTitle,
  PageDescription,
  PageActions,
  PageContent,
}
