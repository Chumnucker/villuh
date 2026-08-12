import { Button, Page, PlatformIcon } from "@villuh/ui"

export default function HomePage() {
  return (
    <Page.Shell>
      <Page.Header>
        <Page.Title>Home</Page.Title>
        <Page.Description>
          Welcome back. Pick a section from the sidebar to manage your
          portfolio.
        </Page.Description>
        <Page.Actions>
          <Button variant="muted" size="icon">
            <PlatformIcon
              icon="IconBell2"
              className="size-4.5"
              size={20}
              strokeWidth={2}
            />
          </Button>
        </Page.Actions>
      </Page.Header>

      <Page.Content>{/* PAGE CONTENT */}</Page.Content>
    </Page.Shell>
  )
}
