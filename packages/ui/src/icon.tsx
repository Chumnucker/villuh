import type { ComponentType, SVGProps } from "react"
import { Check, Plus, X } from "lucide-react"
import { AltArrowDownIcon } from "@solar-icons/react/linear/alt-arrow-down"
import { AltArrowLeftIcon } from "@solar-icons/react/linear/alt-arrow-left"
import { AltArrowRightIcon } from "@solar-icons/react/linear/alt-arrow-right"
import { AltArrowUpIcon } from "@solar-icons/react/linear/alt-arrow-up"
import { ArchiveIcon } from "@solar-icons/react/linear/archive"
import { BellIcon } from "@solar-icons/react/linear/bell"
import { BoltIcon } from "@solar-icons/react/linear/bolt"
import { Buildings2Icon } from "@solar-icons/react/linear/buildings-2"
import { CardIcon } from "@solar-icons/react/linear/card"
import { ClipboardListIcon } from "@solar-icons/react/linear/clipboard-list"
import { CloudUploadIcon } from "@solar-icons/react/linear/cloud-upload"
import { DangerTriangleIcon } from "@solar-icons/react/linear/danger-triangle"
import { DollarIcon } from "@solar-icons/react/linear/dollar"
import { EyeClosedIcon } from "@solar-icons/react/linear/eye-closed"
import { EyeIcon } from "@solar-icons/react/linear/eye"
import { FileTextIcon } from "@solar-icons/react/linear/file-text"
import { FlagIcon } from "@solar-icons/react/linear/flag"
import { FlameIcon } from "@solar-icons/react/linear/flame"
import { HeartIcon } from "@solar-icons/react/linear/heart"
import { Home2Icon } from "@solar-icons/react/linear/home-2"
import { HomeSmileIcon } from "@solar-icons/react/linear/home-smile"
import { InboxIcon } from "@solar-icons/react/linear/inbox"
import { InfoCircleIcon } from "@solar-icons/react/linear/info-circle"
import { KeyIcon } from "@solar-icons/react/linear/key"
import { LeafIcon } from "@solar-icons/react/linear/leaf"
import { LinkIcon } from "@solar-icons/react/linear/link"
import { ListCheckIcon } from "@solar-icons/react/linear/list-check"
import { ListIcon } from "@solar-icons/react/linear/list"
import { Logout2Icon } from "@solar-icons/react/linear/logout-2"
import { MagnifierIcon } from "@solar-icons/react/linear/magnifier"
import { MapPointIcon } from "@solar-icons/react/linear/map-point"
import { MenuDotsIcon } from "@solar-icons/react/linear/menu-dots"
import { MoonIcon } from "@solar-icons/react/linear/moon"
import { NotebookIcon } from "@solar-icons/react/linear/notebook"
import { PenIcon } from "@solar-icons/react/linear/pen"
import { PhoneIcon } from "@solar-icons/react/linear/phone"
import { RefreshIcon } from "@solar-icons/react/linear/refresh"
import { ReorderIcon } from "@solar-icons/react/linear/reorder"
import { SettingsIcon } from "@solar-icons/react/linear/settings"
import { SledgehammerIcon } from "@solar-icons/react/linear/sledgehammer"
import { SortVerticalIcon } from "@solar-icons/react/linear/sort-vertical"
import { StarIcon } from "@solar-icons/react/linear/star"
import { SunIcon } from "@solar-icons/react/linear/sun"
import { TextBoldIcon } from "@solar-icons/react/linear/text-bold"
import { TextItalicIcon } from "@solar-icons/react/linear/text-italic"
import { TextSquare2Icon } from "@solar-icons/react/linear/text-square-2"
import { TextSquareIcon } from "@solar-icons/react/linear/text-square"
import { TrashBinMinimalisticIcon } from "@solar-icons/react/linear/trash-bin-minimalistic"
import { UsersGroupRoundedIcon } from "@solar-icons/react/linear/users-group-rounded"
import { UsersGroupTwoRoundedIcon } from "@solar-icons/react/linear/users-group-two-rounded"

type SolarIcon = ComponentType<
  {
    size?: number | string
    color?: string
    strokeWidth?: number | string
    className?: string
  } & SVGProps<SVGSVGElement>
>

/**
 * Official Google G — Solar has no brand marks.
 */
function GoogleIcon({
  size = 18,
  className,
  ...props
}: {
  size?: number | string
  className?: string
} & SVGProps<SVGSVGElement>) {
  const px = typeof size === "number" ? size : size
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      {...props}
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.56c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09A6.6 6.6 0 0 1 5.5 12c0-.72.13-1.43.34-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
      />
    </svg>
  )
}

/**
 * Central Icons → Solar Linear mapping.
 * `icon` keys stay stable (tag/status rows store these strings).
 */
const PLATFORM_ICONS = {
  IconHouse: Home2Icon,
  IconHomeDoor: HomeSmileIcon,
  IconBuildings: Buildings2Icon,
  IconDoor: Home2Icon,
  IconPeople: UsersGroupTwoRoundedIcon,
  IconStar: StarIcon,
  IconFlag: FlagIcon,
  IconKey1: KeyIcon,
  IconMapPin: MapPointIcon,
  IconLeaf: LeafIcon,
  IconFlame: FlameIcon,
  IconBolt: BoltIcon,
  IconHeart: HeartIcon,
  IconCircleCheck: Check,
  IconWrench: SledgehammerIcon,
  IconPlusSmall: Plus,
  IconBell2: BellIcon,
  IconNotebook: NotebookIcon,
  IconClipboard2: ClipboardListIcon,
  IconFileText: FileTextIcon,
  IconCurrencyDollar: DollarIcon,
  IconInboxEmpty: InboxIcon,
  IconTeam: UsersGroupRoundedIcon,
  IconCreditCard1: CardIcon,
  IconSettingsGear2: SettingsIcon,
  IconChevronBottom: AltArrowDownIcon,
  IconChevronTop: AltArrowUpIcon,
  IconChevronLeft: AltArrowLeftIcon,
  IconChevronRight: AltArrowRightIcon,
  IconChevronRightSmall: AltArrowRightIcon,
  IconChevronGrabberVertical: SortVerticalIcon,
  IconCrossLarge: X,
  IconCheckmark1: Check,
  IconDotGrid1x3Horizontal: MenuDotsIcon,
  IconCircleInfo: InfoCircleIcon,
  IconWarningSign: DangerTriangleIcon,
  IconLoader: RefreshIcon,
  IconEyeOpen: EyeIcon,
  IconEyeClosed: EyeClosedIcon,
  IconMagnifyingGlass: MagnifierIcon,
  IconPencil: PenIcon,
  IconArchive: ArchiveIcon,
  IconReorder: ReorderIcon,
  IconTrashCan: TrashBinMinimalisticIcon,
  IconCloudUpload: CloudUploadIcon,
  IconPhone: PhoneIcon,
  IconSun: SunIcon,
  IconMoon: MoonIcon,
  IconBold: TextBoldIcon,
  IconItalic: TextItalicIcon,
  IconListBullets: ListIcon,
  IconNumberedList: ListCheckIcon,
  IconChainLink1: LinkIcon,
  IconH2: TextSquareIcon,
  IconH3: TextSquare2Icon,
  IconLogout: Logout2Icon,
  IconArrowLeft: AltArrowLeftIcon,
  IconArrowRight: AltArrowRightIcon,
  IconGoogle: GoogleIcon,
} as const satisfies Record<string, SolarIcon>

export type PlatformIconName = keyof typeof PLATFORM_ICONS

export type PlatformIconProps = {
  icon: PlatformIconName
  size?: number | string
  color?: string
  strokeWidth?: number | string
  /** @deprecated Prefer `strokeWidth`. Accepted for existing call sites. */
  stroke?: number | string
  className?: string
} & Omit<SVGProps<SVGSVGElement>, "strokeWidth" | "stroke" | "ref">

export function isPlatformIconName(value: string): value is PlatformIconName {
  return value in PLATFORM_ICONS
}

export const PlatformIcon = ({
  icon,
  size = 16,
  color,
  strokeWidth = 2,
  stroke,
  className,
  ...props
}: PlatformIconProps) => {
  const Icon = PLATFORM_ICONS[icon]
  if (!Icon) return null

  return (
    <Icon
      size={size}
      color={color}
      strokeWidth={strokeWidth ?? stroke ?? 1.5}
      className={className}
      {...props}
    />
  )
}
