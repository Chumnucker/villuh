import { Page, PlatformIcon } from "@villuh/ui"

export function PropertyTenantsTemplate() {
  return (
    <Page.Content>
      <div className="flex flex-col items-center gap-1 py-16 text-center">
        <PlatformIcon
          icon="IconTeam"
          size={28}
          className="mb-1 text-muted-foreground"
        />
        <p className="text-sm font-medium text-foreground">
          Tenants coming soon
        </p>
        <p className="text-sm text-muted-foreground">
          Tenant profiles and lease assignments for this property will appear
          here once onboarding is available.
        </p>
      </div>
    </Page.Content>
  )
}
