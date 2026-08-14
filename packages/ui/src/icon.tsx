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
import { CalendarIcon } from "@solar-icons/react/linear/calendar"
import { CopyIcon } from "@solar-icons/react/linear/copy"
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
import { GarageIcon } from "@solar-icons/react/linear/garage"
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
import { RulerIcon } from "@solar-icons/react/linear/ruler"
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
// Amenity palette (spec §5.1) — 38 keys, each a verified Solar Linear glyph.
import { AccessibilityIcon } from "@solar-icons/react/linear/accessibility"
import { ArmchairIcon } from "@solar-icons/react/linear/armchair"
import { BasketballIcon } from "@solar-icons/react/linear/basketball"
import { BathIcon } from "@solar-icons/react/linear/bath"
import { BedIcon } from "@solar-icons/react/linear/bed"
import { BookIcon } from "@solar-icons/react/linear/book"
import { BoxIcon } from "@solar-icons/react/linear/box"
import { CameraIcon } from "@solar-icons/react/linear/camera"
import { ChefHatIcon } from "@solar-icons/react/linear/chef-hat"
import { ClapperboardIcon } from "@solar-icons/react/linear/clapperboard"
import { CupHotIcon } from "@solar-icons/react/linear/cup-hot"
import { DumbbellIcon } from "@solar-icons/react/linear/dumbbell"
import { ElectricRefuelingIcon } from "@solar-icons/react/linear/electric-refueling"
import { FloorLampIcon } from "@solar-icons/react/linear/floor-lamp"
import { FridgeIcon } from "@solar-icons/react/linear/fridge"
import { GamepadIcon } from "@solar-icons/react/linear/gamepad"
import { GolfIcon } from "@solar-icons/react/linear/golf"
import { LaptopIcon } from "@solar-icons/react/linear/laptop"
import { MailboxIcon } from "@solar-icons/react/linear/mailbox"
import { PawIcon } from "@solar-icons/react/linear/paw"
import { RunningIcon } from "@solar-icons/react/linear/running"
import { ShieldIcon } from "@solar-icons/react/linear/shield"
import { SnowflakeIcon } from "@solar-icons/react/linear/snowflake"
import { SocketIcon } from "@solar-icons/react/linear/socket"
import { SofaIcon } from "@solar-icons/react/linear/sofa"
import { SwimmingIcon } from "@solar-icons/react/linear/swimming"
import { TennisIcon } from "@solar-icons/react/linear/tennis"
import { TvIcon } from "@solar-icons/react/linear/tv"
import { UmbrellaIcon } from "@solar-icons/react/linear/umbrella"
import { VolleyballIcon } from "@solar-icons/react/linear/volleyball"
import { WashingMachineIcon } from "@solar-icons/react/linear/washing-machine"
import { WaterdropIcon } from "@solar-icons/react/linear/waterdrop"
import { WiFiRouterIcon } from "@solar-icons/react/linear/wi-fi-router"
// Expanded general-purpose palette — verified Solar Linear glyphs.
import { BuildingsIcon } from "@solar-icons/react/linear/buildings"
import { CityIcon } from "@solar-icons/react/linear/city"
import { SmartHomeIcon } from "@solar-icons/react/linear/smart-home"
import { ChairIcon } from "@solar-icons/react/linear/chair"
import { ClosetIcon } from "@solar-icons/react/linear/closet"
import { LampIcon } from "@solar-icons/react/linear/lamp"
import { MirrorIcon } from "@solar-icons/react/linear/mirror"
import { HangerIcon } from "@solar-icons/react/linear/hanger"
import { ConditionerIcon } from "@solar-icons/react/linear/conditioner"
import { ThermometerIcon } from "@solar-icons/react/linear/thermometer"
import { TemperatureIcon } from "@solar-icons/react/linear/temperature"
import { LightbulbIcon } from "@solar-icons/react/linear/lightbulb"
import { WalletIcon } from "@solar-icons/react/linear/wallet"
import { CartIcon } from "@solar-icons/react/linear/cart"
import { ShopIcon } from "@solar-icons/react/linear/shop"
import { TagIcon } from "@solar-icons/react/linear/tag"
import { GiftIcon } from "@solar-icons/react/linear/gift"
import { Safe2Icon } from "@solar-icons/react/linear/safe-2"
import { BanknoteIcon } from "@solar-icons/react/linear/banknote"
import { TicketIcon } from "@solar-icons/react/linear/ticket"
import { ChatRoundIcon } from "@solar-icons/react/linear/chat-round"
import { LetterIcon } from "@solar-icons/react/linear/letter"
import { GlobalIcon } from "@solar-icons/react/linear/global"
import { GlobeIcon } from "@solar-icons/react/linear/globe"
import { EarthIcon } from "@solar-icons/react/linear/earth"
import { CloudIcon } from "@solar-icons/react/linear/cloud"
import { ServerIcon } from "@solar-icons/react/linear/server"
import { MonitorIcon } from "@solar-icons/react/linear/monitor"
import { SmartphoneIcon } from "@solar-icons/react/linear/smartphone"
import { HeadphonesRoundIcon } from "@solar-icons/react/linear/headphones-round"
import { MicrophoneIcon } from "@solar-icons/react/linear/microphone"
import { PrinterIcon } from "@solar-icons/react/linear/printer"
import { KeyboardIcon } from "@solar-icons/react/linear/keyboard"
import { MusicNoteIcon } from "@solar-icons/react/linear/music-note"
import { VideocameraIcon } from "@solar-icons/react/linear/videocamera"
import { GalleryIcon } from "@solar-icons/react/linear/gallery"
import { PaletteIcon } from "@solar-icons/react/linear/palette"
import { ConfettiIcon } from "@solar-icons/react/linear/confetti"
import { StarsIcon } from "@solar-icons/react/linear/stars"
import { CrownIcon } from "@solar-icons/react/linear/crown"
import { MedalStarIcon } from "@solar-icons/react/linear/medal-star"
import { TargetIcon } from "@solar-icons/react/linear/target"
import { RocketIcon } from "@solar-icons/react/linear/rocket"
import { MagnetIcon } from "@solar-icons/react/linear/magnet"
import { CompassIcon } from "@solar-icons/react/linear/compass"
import { MapIcon } from "@solar-icons/react/linear/map"
import { RouteIcon } from "@solar-icons/react/linear/route"
import { TelescopeIcon } from "@solar-icons/react/linear/telescope"
import { WindIcon } from "@solar-icons/react/linear/wind"
import { CloudRainIcon } from "@solar-icons/react/linear/cloud-rain"
import { FireIcon } from "@solar-icons/react/linear/fire"
import { BusIcon } from "@solar-icons/react/linear/bus"
import { TramIcon } from "@solar-icons/react/linear/tram"
import { ScooterIcon } from "@solar-icons/react/linear/scooter"
import { BicyclingIcon } from "@solar-icons/react/linear/bicycling"
import { PlaneIcon } from "@solar-icons/react/linear/plane"
import { WineglassIcon } from "@solar-icons/react/linear/wineglass"
import { MugIcon } from "@solar-icons/react/linear/mug"
import { TeaCupIcon } from "@solar-icons/react/linear/tea-cup"
import { PlateIcon } from "@solar-icons/react/linear/plate"
import { DonutIcon } from "@solar-icons/react/linear/donut"
import { ClockCircleIcon } from "@solar-icons/react/linear/clock-circle"
import { Book2Icon } from "@solar-icons/react/linear/book-2"
import { SquareAcademicCapIcon } from "@solar-icons/react/linear/square-academic-cap"
import { MedicalKitIcon } from "@solar-icons/react/linear/medical-kit"
import { HealthIcon } from "@solar-icons/react/linear/health"
import { StethoscopeIcon } from "@solar-icons/react/linear/stethoscope"
import { PillIcon } from "@solar-icons/react/linear/pill"
import { MeditationIcon } from "@solar-icons/react/linear/meditation"
import { WalkingIcon } from "@solar-icons/react/linear/walking"
import { HikingIcon } from "@solar-icons/react/linear/hiking"
import { SkateboardIcon } from "@solar-icons/react/linear/skateboard"
import { TreadmillIcon } from "@solar-icons/react/linear/treadmill"
import { FootballIcon } from "@solar-icons/react/linear/football"
import { BowlingIcon } from "@solar-icons/react/linear/bowling"

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
  IconCalendar: CalendarIcon,
  IconGarage: GarageIcon,
  IconRuler: RulerIcon,
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
  IconCopy: CopyIcon,
  // Amenity palette (spec §5.1) — keys stored on amenity rows (amenity_icon enum).
  // IconStar is shared with the default above. IconParking/IconHeating/IconOutdoor/
  // IconRooftop reuse existing Solar imports (Garage/Flame/Leaf/Sun).
  IconPool: SwimmingIcon,
  IconGym: DumbbellIcon,
  IconLaundry: WashingMachineIcon,
  IconWifi: WiFiRouterIcon,
  IconPets: PawIcon,
  IconParking: GarageIcon,
  IconEvCharging: ElectricRefuelingIcon,
  IconAirConditioning: SnowflakeIcon,
  IconHeating: FlameIcon,
  IconFridge: FridgeIcon,
  IconKitchen: ChefHatIcon,
  IconBath: BathIcon,
  IconBed: BedIcon,
  IconFurnished: SofaIcon,
  IconTv: TvIcon,
  IconTheater: ClapperboardIcon,
  IconSecurity: ShieldIcon,
  IconCamera: CameraIcon,
  IconOutlet: SocketIcon,
  IconLighting: FloorLampIcon,
  IconLounge: ArmchairIcon,
  IconGameRoom: GamepadIcon,
  IconBasketball: BasketballIcon,
  IconTennis: TennisIcon,
  IconGolf: GolfIcon,
  IconVolleyball: VolleyballIcon,
  IconWater: WaterdropIcon,
  IconPackageLocker: BoxIcon,
  IconMail: MailboxIcon,
  IconCoworking: LaptopIcon,
  IconCoffee: CupHotIcon,
  IconOutdoor: LeafIcon,
  IconPatio: UmbrellaIcon,
  IconRooftop: SunIcon,
  IconAccessible: AccessibilityIcon,
  IconTrack: RunningIcon,
  IconLibrary: BookIcon,
  // Expanded general-purpose palette (amenity_icon enum, migration 0020).
  IconBuilding: BuildingsIcon,
  IconCity: CityIcon,
  IconSmartHome: SmartHomeIcon,
  IconChair: ChairIcon,
  IconCloset: ClosetIcon,
  IconLamp: LampIcon,
  IconMirror: MirrorIcon,
  IconHanger: HangerIcon,
  IconConditioner: ConditionerIcon,
  IconThermometer: ThermometerIcon,
  IconTemperature: TemperatureIcon,
  IconLightbulb: LightbulbIcon,
  IconWallet: WalletIcon,
  IconCart: CartIcon,
  IconShop: ShopIcon,
  IconTag: TagIcon,
  IconGift: GiftIcon,
  IconSafe: Safe2Icon,
  IconBanknote: BanknoteIcon,
  IconTicket: TicketIcon,
  IconChat: ChatRoundIcon,
  IconLetter: LetterIcon,
  IconGlobal: GlobalIcon,
  IconGlobe: GlobeIcon,
  IconEarth: EarthIcon,
  IconCloud: CloudIcon,
  IconServer: ServerIcon,
  IconMonitor: MonitorIcon,
  IconSmartphone: SmartphoneIcon,
  IconHeadphones: HeadphonesRoundIcon,
  IconMicrophone: MicrophoneIcon,
  IconPrinter: PrinterIcon,
  IconKeyboard: KeyboardIcon,
  IconMusic: MusicNoteIcon,
  IconVideoCamera: VideocameraIcon,
  IconGallery: GalleryIcon,
  IconPalette: PaletteIcon,
  IconConfetti: ConfettiIcon,
  IconStars: StarsIcon,
  IconCrown: CrownIcon,
  IconMedal: MedalStarIcon,
  IconTarget: TargetIcon,
  IconRocket: RocketIcon,
  IconMagnet: MagnetIcon,
  IconCompass: CompassIcon,
  IconMap: MapIcon,
  IconRoute: RouteIcon,
  IconTelescope: TelescopeIcon,
  IconWind: WindIcon,
  IconCloudRain: CloudRainIcon,
  IconFire: FireIcon,
  IconBus: BusIcon,
  IconTram: TramIcon,
  IconScooter: ScooterIcon,
  IconBicycle: BicyclingIcon,
  IconPlane: PlaneIcon,
  IconWine: WineglassIcon,
  IconMug: MugIcon,
  IconTeaCup: TeaCupIcon,
  IconPlate: PlateIcon,
  IconDonut: DonutIcon,
  IconClock: ClockCircleIcon,
  IconBook: Book2Icon,
  IconGraduation: SquareAcademicCapIcon,
  IconMedicalKit: MedicalKitIcon,
  IconHealth: HealthIcon,
  IconStethoscope: StethoscopeIcon,
  IconPill: PillIcon,
  IconMeditation: MeditationIcon,
  IconWalking: WalkingIcon,
  IconHiking: HikingIcon,
  IconSkateboard: SkateboardIcon,
  IconTreadmill: TreadmillIcon,
  IconFootball: FootballIcon,
  IconBowling: BowlingIcon,
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
