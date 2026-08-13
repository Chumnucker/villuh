import * as React from "react"

import { cn } from "../utils"
import { EmptyState } from "./empty-state"

function PageShell({
  className,
  centered = false,
  scrollable = false,
  ...props
}: React.ComponentProps<"div"> & {
  /** Constrain and center the page; max-width steps up at each breakpoint. */
  centered?: boolean
  scrollable?: boolean
}) {
  return (
    <div
      data-slot="page-shell"
      data-centered={centered ? "" : undefined}
      className={cn(
        "flex min-h-full flex-1 flex-col gap-8 p-content",
        centered &&
          "mx-auto px-content py-16 w-full max-w-3xl sm:max-w-4xl lg:max-w-2xl xl:max-w-3xl",
        scrollable && "pb-0",
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

/**
 * Structural subset of a TanStack Query / tRPC query result. Accepting the
 * shape (rather than importing query types) keeps `@villuh/ui` free of a
 * data-layer dependency — pass the result of `useQuery` directly.
 */
type PageBoundaryQuery<TData> = {
  data: TData | undefined
  isLoading: boolean
  isError?: boolean
  error?: { message: string } | null
}

/**
 * Declarative pending / empty / error handling for query-backed views.
 * Replaces the hand-rolled `if (isLoading || !data) return <Skeleton />`
 * branches in templates. Resolution order: error → pending → empty → content.
 *
 * Pass `children` as a render function to get the loaded, non-undefined
 * `data` — no more `!data` guards in the happy path.
 *
 * The boundary renders states in place and adds no wrapper element, so it
 * composes with any layout (`Page.Shell`, `Page.Content`, cards, …).
 */
function PageBoundary<TData>({
  query,
  pending,
  isEmpty,
  empty,
  error,
  children,
}: {
  query: PageBoundaryQuery<TData>
  /** Skeleton / placeholder shown while the query is in flight. */
  pending: React.ReactNode
  /** When provided with `empty`, decides whether loaded data counts as empty. */
  isEmpty?: (data: TData) => boolean
  /** Shown when the query resolved but `isEmpty(data)` is true. */
  empty?: React.ReactNode
  /**
   * Shown when the query errored. Defaults to a generic `EmptyState` with
   * the error message; pass a node or `(error) => node` to customize.
   */
  error?: React.ReactNode | ((error: { message: string }) => React.ReactNode)
  children: React.ReactNode | ((data: TData) => React.ReactNode)
}): React.ReactNode {
  if (query.isError) {
    if (typeof error === "function") {
      return error(query.error ?? { message: "" })
    }
    if (error !== undefined) return error
    return (
      <EmptyState
        icon="IconWarningSign"
        title="Something went wrong"
        description={query.error?.message || "Please try again."}
      />
    )
  }

  // `data === undefined` also covers pre-fetch states `isLoading` misses
  // (e.g. disabled queries), so content never renders without data.
  if (query.isLoading || query.data === undefined) return pending

  if (isEmpty && empty !== undefined && isEmpty(query.data)) return empty

  return typeof children === "function" ? children(query.data) : children
}

const Page = {
  Shell: PageShell,
  Header: PageHeader,
  Title: PageTitle,
  Description: PageDescription,
  Actions: PageActions,
  Content: PageContent,
  Boundary: PageBoundary,
}

export {
  Page,
  PageShell,
  PageHeader,
  PageTitle,
  PageDescription,
  PageActions,
  PageContent,
  PageBoundary,
}
