import { Button, PlatformIcon } from "@villuh/ui"

export default function Page() {
  return (
    <div className="flex flex-col gap-2">
      <header className="flex items-start justify-between">
        <span className="flex flex-col gap-2">
          <h1 className="font-mono text-3xl font-medium tracking-tight">
            Home
          </h1>
          <p className="text-muted-foreground">
            Welcome back. Pick a section from the sidebar to manage your
            portfolio.
          </p>
        </span>

        <div className="flex gap-2">
          <Button variant={"muted"} size={"icon"}>
            <PlatformIcon
              icon="IconBell2"
              className="size-4.5"
              size={20}
              strokeWidth={2}
            />
          </Button>
        </div>
      </header>
    </div>
  )
}
