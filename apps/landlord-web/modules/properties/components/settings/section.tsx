import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PlatformIcon,
  cn,
  type PlatformIconName,
} from "@villuh/ui"

/**
 * One titled group of related settings. The settings tabs are built out of
 * these rather than one long field list, so each concern (basics, address,
 * photos, …) reads as its own card.
 *
 * `children` land in a two-column grid by default — pass `col-span-full` on a
 * child to have it span the row, or override the grid entirely via `className`.
 */
export function SettingsSection({
  title,
  description,
  icon,
  action,
  className,
  children,
}: {
  title: string
  description?: React.ReactNode
  icon?: PlatformIconName
  /** Rendered at the far end of the header row — a button, badge, or link. */
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 py-4">
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle>
            {icon ? <PlatformIcon icon={icon} size={16} /> : null}
            {title}
          </CardTitle>
          {description ? (
            <CardDescription>{description}</CardDescription>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </CardHeader>

      <CardContent className={cn("grid gap-5 sm:grid-cols-2", className)}>
        {children}
      </CardContent>
    </Card>
  )
}
