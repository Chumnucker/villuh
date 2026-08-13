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
 * The units DataTable, top to bottom (D-21). Adding a filter is one entry here:
 * URL parsing, operator validation, the picker UI, and the tRPC input mapping
 * all derive from the declaration.
 *
 * `name` is `"units"` — the definition-unique registry owner (D-29). It is NOT
 * the URL prefix and must not be confused with `namespace`; it is what makes the
 * collision assert fire if a second unprefixed table is ever added to a page
 * that already renders this one.
 *
 * `namespace` is null (D-29): both mounts — /units and the property Units tab —
 * host exactly one table, so keys stay unprefixed and a shared link reads
 * `?q=main&status=any:s1,s2&baseRent=gte:1500&sort=-baseRent&page=2`. Give this
 * a namespace only if a page ever hosts two tables at once.
 *
 * D-23: unlike `createUnitsFilterFields`, the field SET is fixed at module
 * evaluation — only the option labels arrive asynchronously. The Property and
 * Status chips are therefore present from first paint (with an empty option
 * list for a beat) rather than popping in once tRPC resolves. That is the point:
 * it is what makes URL parsing consistent on a cold deep link. Do not restore
 * the `if (properties?.length)` guards.
 */
export const unitsTable = defineTable("units", null, {
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
      // D-22: called on EVERY render including when hidden, so the hook
      // sequence is fixed; `hidden` gates the network call, not the call site.
      // This reproduces today's `enabled: !lockedPropertyId` exactly.
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
