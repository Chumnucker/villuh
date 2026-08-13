import {
  idFilterOperators,
  numericFilterOperators,
  PlatformIcon,
  type FilterFieldConfig,
} from "@villuh/ui"

function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100)
}

type OptionRow = { id: string; name: string }

/** Filter field defs for the units DataTable — including `server` query maps. */
export function createUnitsFilterFields(
  properties: OptionRow[] | undefined,
  statuses: OptionRow[] | undefined
): FilterFieldConfig[] {
  const fields: FilterFieldConfig[] = []

  if (properties?.length) {
    fields.push({
      key: "property",
      label: "Property",
      icon: <PlatformIcon icon="IconBuildings" size={16} />,
      type: "multiselect",
      searchable: true,
      className: "w-[220px]",
      options: properties.map((property) => ({
        value: property.id,
        label: property.name,
      })),
      // propertyId is NOT NULL — empty/not-empty operators make no sense.
      operators: idFilterOperators({ nullable: false }),
      server: {
        kind: "ids",
        param: "propertyIds",
        excludeParam: "excludePropertyIds",
      },
    })
  }

  if (statuses?.length) {
    fields.push({
      key: "status",
      label: "Status",
      icon: <PlatformIcon icon="IconCircleCheck" size={16} />,
      type: "multiselect",
      searchable: false,
      className: "w-[200px]",
      options: statuses.map((status) => ({
        value: status.id,
        label: status.name,
      })),
      operators: idFilterOperators(),
      server: {
        kind: "ids",
        param: "statusIds",
        excludeParam: "excludeStatusIds",
        emptyParam: "statusEmpty",
      },
    })
  }

  fields.push(
    {
      key: "baseRent",
      label: "Base rent",
      icon: <PlatformIcon icon="IconCurrencyDollar" size={16} />,
      type: "text",
      inputType: "number",
      min: 0,
      step: 1,
      placeholder: "0",
      prefix: "$",
      defaultOperator: "gte",
      operators: numericFilterOperators({ nullable: false }),
      className: "w-[140px]",
      server: {
        kind: "numeric",
        param: "baseRentCents",
        transform: dollarsToCents,
      },
    },
    {
      key: "squareFootage",
      label: "Sq ft",
      icon: <PlatformIcon icon="IconDoor" size={16} />,
      type: "text",
      inputType: "number",
      min: 0,
      step: 1,
      placeholder: "0",
      defaultOperator: "gte",
      operators: numericFilterOperators(),
      className: "w-[140px]",
      server: {
        kind: "numeric",
        param: "squareFootage",
        emptyParam: "squareFootageEmpty",
      },
    }
  )

  return fields
}
