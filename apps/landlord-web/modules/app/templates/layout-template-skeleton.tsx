import {
  SkeletonBox,
  SkeletonContainer,
  SkeletonLabel,
} from "@villuh/ui"

/** Instant chrome while requireMe resolves — no sensitive data. */
export function LayoutTemplateSkeleton() {
  return (
    <SkeletonContainer className="min-h-svh w-full bg-background">
      <aside className="flex w-64 shrink-0 flex-col border-r bg-card">
        <div className="flex h-navbar items-center gap-2 border-b px-page">
          <SkeletonLabel className="h-6 w-24" />
        </div>
        <div className="flex flex-1 flex-col gap-3 p-page">
          <SkeletonBox className="h-8 w-full rounded-xl" />
          <SkeletonBox className="h-8 w-5/6 rounded-xl" />
          <SkeletonBox className="h-8 w-4/5 rounded-xl" />
          <SkeletonBox className="h-8 w-full rounded-xl" />
        </div>
        <div className="p-page">
          <SkeletonBox className="h-12 w-full rounded-2xl" />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-navbar shrink-0 items-center gap-4 border-b bg-card px-page">
          <SkeletonLabel className="h-4 w-40" />
          <SkeletonBox className="ml-auto h-9 w-56 rounded-xl" />
        </header>
        <main className="flex-1 overflow-auto p-content">
          <SkeletonLabel className="h-8 w-48" />
          <SkeletonBox className="mt-4 h-40 w-full rounded-4xl" />
        </main>
      </div>
    </SkeletonContainer>
  )
}
