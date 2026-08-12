import { Badge, PlatformIcon, cn, type PlatformIconName } from "@villuh/ui"

export type StatusBadgeStatus = {
  name: string
  iconKey: string
  colorKey: string
}

/** Fixed 8-color palette (UI-SPEC "Tag & status palette") — soft `/15`-`/20` opacity fills. */
const COLOR_CLASSES: Record<string, string> = {
  slate: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  blue: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  green: "bg-green-500/15 text-green-700 dark:text-green-300",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  orange: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  red: "bg-red-500/15 text-red-700 dark:text-red-300",
  violet: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  teal: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
}

/** D-29: Badge + 12px leading PlatformIcon + label; `null` renders an unassigned fallback. */
export function StatusBadge({ status }: { status: StatusBadgeStatus | null | undefined }) {
  if (!status) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Unassigned
      </Badge>
    )
  }

  return (
    <Badge className={cn("border-transparent", COLOR_CLASSES[status.colorKey] ?? "bg-muted text-muted-foreground")}>
      <PlatformIcon icon={status.iconKey as PlatformIconName} size={12} data-icon="inline-start" />
      {status.name}
    </Badge>
  )
}
