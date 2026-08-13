import { Page, PlatformIcon } from "@villuh/ui"

export function PropertyAnalyticsTemplate() {
  return (
    <Page.Content>
      <div className="flex flex-col items-center gap-1 py-16 text-center">
        <PlatformIcon
          icon="IconListBullets"
          size={28}
          className="mb-1 text-muted-foreground"
        />
        <p className="text-sm font-medium text-foreground">
          Analytics coming soon
        </p>
        <p className="text-sm text-muted-foreground">
          Revenue, occupancy, and performance trends for this property will
          show up here.
        </p>
      </div>
    </Page.Content>
  )
}
