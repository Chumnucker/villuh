import { NavigationBreadcrumbs } from "@/modules/app/components/navigation/breadcrumbs"
import { Button, LinkButton } from "@/modules/common/ui/button"
import { PlatformIcon } from "@/modules/common/ui/icon"
import { SearchInput } from "@/modules/common/ui/input"

export default function Page() {
  return (
    <div className="mx-auto flex min-h-svh max-w-6xl flex-col">
      <nav className="flex items-center justify-between">
        <div className="flex h-navbar items-center justify-between gap-4">
          <h5 className="font-mono text-2xl font-medium">Villuh</h5>

          <div className="flex gap-1">
            <LinkButton
              href={"/"}
              variant={"ghost-muted"}
              className="justify-start gap-2"
            >
              <PlatformIcon icon="IconHomeDoor" size={20} strokeWidth={2} />
              Home
            </LinkButton>
          </div>
        </div>

        <Button variant={"ghost-muted"} size={"icon"}>
          <PlatformIcon
            icon="IconBell2"
            className="size-4.5"
            size={20}
            strokeWidth={2}
          />
        </Button>
      </nav>
      <section className="flex flex-1">
        <nav className="flex h-navbar w-full items-center border-b bg-card px-page">
          <NavigationBreadcrumbs />
          <SearchInput
            placeholder="Search features or items"
            className="w-56"
          />
        </nav>
      </section>
    </div>
  )
}
