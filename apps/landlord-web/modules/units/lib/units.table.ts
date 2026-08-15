"use client"

import { useMemo } from "react"
import { trpc } from "@villuh/api"
import {
  defineTable,
  ids,
  idFilterOperators,
  numeric,
  numericFilterOperators,
} from "@villuh/ui"

function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100)
}

type OptionRow = { id: string; name: string }
type Option = { value: string; label: string }

const NO_OPTIONS: Option[] = []

function toOptions(rows: OptionRow[] | undefined): Option[] {
  return rows?.map((row) => ({ value: row.id, label: row.name })) ?? NO_OPTIONS
}

/**
 * The units DataTable, top to bottom. Adding a filter is one entry here: URL
 * parsing, operator validation, the picker UI, and the tRPC input mapping all
 * derive from the declaration. Both mounts — /units and the property Units
 * tab — host exactly one table, so keys stay unprefixed and a shared link
 * reads `?q=main&status=any:s1,s2&baseRent=gte:1500&sort=-baseRent&page=2`.
 *
 * The field SET is fixed at module evaluation — only the option labels arrive
 * asynchronously — so every chip is present from first paint and URL parsing
 * is consistent on a cold deep link. Do not guard fields on their options
 * having loaded.
 */
export const unitsTable = defineTable("units", {
  sortable: ["label", "propertyName", "status", "baseRent", "squareFootage"],
  fields: {
    property: ids({
      label: "Property",
      icon: "IconBuildings",
      searchable: true,
      className: "w-[220px]",
      // propertyId is NOT NULL — empty/not-empty operators make no sense.
      operators: idFilterOperators({ nullable: false }),
      server: {
        kind: "ids",
        param: "propertyIds",
        excludeParam: "excludePropertyIds",
      },
      // Called on EVERY render including when hidden (fixed hook sequence);
      // `hidden` gates the network call, not the call site.
      useOptions: (hidden) => {
        const { data } = trpc.properties.list.useQuery(undefined, {
          enabled: !hidden,
        })
        return useMemo(() => toOptions(data?.properties), [data?.properties])
      },
    }),
    status: ids({
      label: "Status",
      icon: "IconCircleCheck",
      searchable: false,
      className: "w-[200px]",
      operators: idFilterOperators(),
      server: {
        kind: "ids",
        param: "statusIds",
        excludeParam: "excludeStatusIds",
        emptyParam: "statusEmpty",
      },
      useOptions: (hidden) => {
        const { data } = trpc.unitStatuses.list.useQuery(undefined, {
          enabled: !hidden,
        })
        return useMemo(() => toOptions(data?.statuses), [data?.statuses])
      },
    }),
    baseRent: numeric({
      label: "Base rent",
      icon: "IconCurrencyDollar",
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
    }),
    squareFootage: numeric({
      label: "Sq ft",
      icon: "IconDoor",
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
    }),
  },
})
