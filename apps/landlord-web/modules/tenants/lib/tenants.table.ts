"use client"

import { useMemo } from "react"
import { trpc } from "@villuh/api"
import { defineTable, ids, idFilterOperators } from "@villuh/ui"

type OptionRow = { id: string; label: string }
type Option = { value: string; label: string }

const NO_OPTIONS: Option[] = []

function toOptions(rows: OptionRow[] | undefined): Option[] {
  return rows?.map((row) => ({ value: row.id, label: row.label })) ?? NO_OPTIONS
}

/**
 * The tenants DataTable, top to bottom. Adding a filter is one entry here: URL
 * parsing, operator validation, the picker UI, and the tRPC input mapping all
 * derive from the declaration. The single mount — /tenants — hosts exactly one
 * table, so keys stay unprefixed and a shared link reads
 * `?q=main&unit=any:u1,u2&sort=-name&page=2`.
 *
 * The field SET is fixed at module evaluation — only the option labels arrive
 * asynchronously — so every chip is present from first paint and URL parsing is
 * consistent on a cold deep link. Do not guard fields on their options having
 * loaded.
 *
 * v1 ships unit-only filtering: `tenancyStatus` is a fixed enum rather than an
 * id-list, so it is left to the search box until an enum-backed filter primitive
 * lands. `sortable` still exposes `status` for column sorting.
 */
export const tenantsTable = defineTable("tenants", {
  sortable: ["name", "email", "currentUnit", "status"],
  fields: {
    unit: ids({
      label: "Unit",
      icon: "IconDoor",
      searchable: true,
      className: "w-[220px]",
      // A tenant may have no current unit — empty/not-empty operators apply.
      operators: idFilterOperators({ nullable: true }),
      server: {
        kind: "ids",
        param: "unitIds",
        excludeParam: "excludeUnitIds",
        emptyParam: "unitEmpty",
      },
      // Called on EVERY render including when hidden (fixed hook sequence);
      // `hidden` gates the network call, not the call site.
      useOptions: (hidden) => {
        const { data } = trpc.units.list.useQuery(hidden ? undefined : {}, {
          enabled: !hidden,
        })
        return useMemo(() => toOptions(data?.units), [data?.units])
      },
    }),
  },
})
