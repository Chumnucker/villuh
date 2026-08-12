import * as React from "react"

import { cn } from "./utils"

function PageShell({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="page-shell"
      className={cn("flex flex-col gap-4 p-content", className)}
      {...props}
    />
  )
}

function PageHeader({ className, ...props }: React.ComponentProps<"header">) {
  return (
    <header
      data-slot="page-header"
      className={cn(
        "grid auto-rows-min items-start gap-2",
        "has-data-[slot=page-actions]:grid-cols-[1fr_auto]",
        "has-data-[slot=page-description]:grid-rows-[auto_auto]",
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
