import { NavigationBreadcrumbs } from "@/modules/app/components/navigation/breadcrumbs"
import { Button, LinkButton } from "@/modules/common/ui/button"
import { PlatformIcon } from "@/modules/common/ui/icon"
import { SearchInput } from "@/modules/common/ui/input"

export default function Page() {
  return (
    <div className="flex min-h-svh">
      <nav className="flex w-64 flex-col border-r bg-card">
        <div className="flex h-navbar items-center justify-between border-b px-page">
          <h5 className="font-mono text-2xl font-medium">Villuh</h5>

          <Button variant={"ghost-muted"} size={"icon"}>
            <PlatformIcon
              icon="IconBell2"
              className="size-4.5"
              size={20}
              strokeWidth={2}
            />
          </Button>
        </div>

        <div className="flex flex-col gap-1 p-page">
          <LinkButton
            href={"/"}
            variant={"ghost-muted"}
            className="justify-start gap-2"
          >
            <PlatformIcon icon="IconHomeDoor" size={20} strokeWidth={2} />
            Home
          </LinkButton>
        </div>
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
