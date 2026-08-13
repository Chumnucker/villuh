"use client"

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CopyButton,
  PlatformIcon,
} from "@villuh/ui"
import { formatAddress, formatPhoneNumber } from "@villuh/ui/utils"
import {
  formatParking,
  propertyTypeLabel,
} from "@/modules/properties/lib/property-display"
import { usePropertyDetail } from "@/modules/properties/providers/property-detail-provider"

/** Full-width labeled row for the details card — icon, fixed-width label, value.
 * Address is the one exception that's allowed to wrap instead of truncate. */
function DetailRow({
  icon,
  label,
  wrap,
  children,
}: {
  icon: React.ComponentProps<typeof PlatformIcon>["icon"]
  label: string
  wrap?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="group/row flex items-center gap-2 border-b duration-200 ease-in-out last:border-b-0 hover:bg-secondary">
      <span className="mr-2 flex items-center gap-2 border-r px-4 py-3">
        <PlatformIcon icon={icon} size={16} />

        <span className="w-28 shrink-0 text-sm text-muted-foreground transition-colors duration-200 group-hover/row:text-foreground sm:w-30">
          {label}
        </span>
      </span>

      <span
        className={
          wrap
            ? "flex min-w-0 flex-1 items-center gap-2 text-sm font-medium text-foreground"
            : "flex min-w-0 flex-1 items-center gap-2 truncate text-sm font-medium text-foreground"
        }
      >
        {children}
      </span>
    </div>
  )
}

/** Self-sufficient — reads property + units from `PropertyDetailProvider`
 * (mounted in the `(detail)` layout) instead of taking them as props. */
export function PropertyDetailsCard() {
  const { property, units } = usePropertyDetail()

  const address = formatAddress(property)
  const phone = property.phone?.trim()
    ? formatPhoneNumber(property.phone)
    : null
  const createdAt = property.createdAt
    ? new Date(property.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null
  const totalSquareFootage = units.reduce(
    (sum, unit) => sum + (unit.squareFootage ?? 0),
    0
  )
  const parking = formatParking(property.parkingType, property.parkingSpaces)

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <PlatformIcon icon="IconNotebook" size={16} />
          Property Details
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <DetailRow icon="IconMapPin" label="Address" wrap>
          {address || "—"}
          <CopyButton
            value={address || ""}
            label="Address"
            className="opacity-0 group-hover/row:opacity-100"
          />
        </DetailRow>
        <DetailRow icon="IconPhone" label="Phone">
          {phone || "—"}
          <CopyButton
            value={phone || ""}
            label="Phone"
            className="opacity-0 group-hover/row:opacity-100"
          />
        </DetailRow>
        {propertyTypeLabel(property.propertyType) ? (
          <DetailRow icon="IconBuildings" label="Type">
            {propertyTypeLabel(property.propertyType)}
          </DetailRow>
        ) : null}
        {property.yearBuilt ? (
          <DetailRow icon="IconCalendar" label="Year built">
            {property.yearBuilt}
          </DetailRow>
        ) : null}
        {parking ? (
          <DetailRow icon="IconGarage" label="Parking">
            {parking}
          </DetailRow>
        ) : null}
        <DetailRow icon="IconDoor" label="Units">
          {units.length} {units.length === 1 ? "unit" : "units"}
        </DetailRow>
        {totalSquareFootage > 0 ? (
          <DetailRow icon="IconRuler" label="Total sq ft">
            {totalSquareFootage.toLocaleString()} sq ft
            <CopyButton
              value={totalSquareFootage.toLocaleString() || ""}
              label="Total sq ft"
              className="opacity-0 group-hover/row:opacity-100"
            />
          </DetailRow>
        ) : null}
        <DetailRow icon="IconCalendar" label="Added">
          {createdAt || "—"}
        </DetailRow>
      </CardContent>
    </Card>
  )
}
