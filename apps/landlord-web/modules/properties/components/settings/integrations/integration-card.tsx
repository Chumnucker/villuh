import {
  Badge,
  Button,
  Card,
  CardContent,
  PlatformIcon,
  type PlatformIconName,
} from "@villuh/ui"

export type Integration = {
  key: string
  name: string
  icon: PlatformIconName
  description: string
}

/**
 * A single third-party service on the Integrations tab. Nothing is wired up
 * yet, so every card is a fixed "coming soon" state with a disabled action.
 */
export function IntegrationCard({ integration }: { integration: Integration }) {
  return (
    <Card>
      <CardContent className="flex h-full flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border bg-secondary">
            <PlatformIcon icon={integration.icon} size={18} />
          </span>
          <Badge variant="outline" className="text-muted-foreground">
            Coming soon
          </Badge>
        </div>

        <div className="flex flex-col gap-1">
          <p className="font-heading text-sm font-medium text-foreground">
            {integration.name}
          </p>
          <p className="text-sm text-muted-foreground">
            {integration.description}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled
          className="mt-auto w-fit"
        >
          Connect
        </Button>
      </CardContent>
    </Card>
  )
}
