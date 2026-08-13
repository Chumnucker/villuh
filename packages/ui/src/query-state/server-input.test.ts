import { describe, expect, it } from "vitest"

import {
  buildDataTableServerInput,
  EMPTY_DATA_TABLE_QUERY,
  idFilterOperators,
  numericFilterOperators,
  type DataTableQuery,
} from "../data-table-query"
import type { FilterFieldConfig } from "../filters"

/**
 * Golden test guarding D-30: the URL query-state layer (03.1) is a pure state
 * SOURCE and changed nothing about what reaches tRPC. `buildDataTableServerInput`
 * and the whole `applyServerMapping` layer are kept exactly as they were; the
 * nuqs layer sits above them. If a future change alters the emitted input shape,
 * this fails loudly here instead of silently mutating every list request.
 *
 * The field set mirrors `units.table.ts` (plan 03.1-05): property/status ids and
 * baseRent/squareFootage numerics, including the dollars→cents transform.
 */
const dollarsToCents = (dollars: number) => Math.round(dollars * 100)

const fields: FilterFieldConfig[] = [
  {
    key: "property",
    type: "multiselect",
    operators: idFilterOperators({ nullable: false }),
    server: {
      kind: "ids",
      param: "propertyIds",
      excludeParam: "excludePropertyIds",
    },
  },
  {
    key: "status",
    type: "multiselect",
    operators: idFilterOperators(),
    server: {
      kind: "ids",
      param: "statusIds",
      excludeParam: "excludeStatusIds",
      emptyParam: "statusEmpty",
    },
  },
  {
    key: "baseRent",
    type: "text",
    operators: numericFilterOperators({ nullable: false }),
    server: { kind: "numeric", param: "baseRentCents", transform: dollarsToCents },
  },
  {
    key: "squareFootage",
    type: "text",
    operators: numericFilterOperators(),
    server: {
      kind: "numeric",
      param: "squareFootage",
      emptyParam: "squareFootageEmpty",
    },
  },
  // A field with no server mapping — exercises the `!field.server` guard.
  { key: "noserver", type: "text" },
]

describe("buildDataTableServerInput (D-30 golden)", () => {
  it("maps a full query into the exact tRPC input shape", () => {
    const query: DataTableQuery = {
      search: "main",
      filters: [
        {
          id: "status:is_any_of:0",
          field: "status",
          operator: "is_any_of",
          values: ["s1", "s2"],
        },
        {
          id: "baseRent:gte:0",
          field: "baseRent",
          operator: "gte",
          values: ["1500"],
        },
        {
          id: "baseRent:lte:1",
          field: "baseRent",
          operator: "lte",
          values: ["3000"],
        },
        {
          id: "squareFootage:empty:0",
          field: "squareFootage",
          operator: "empty",
          values: [],
        },
      ],
      sorting: { id: "baseRent", desc: true },
      pageIndex: 1,
      pageSize: 50,
    }

    expect(buildDataTableServerInput(query, fields)).toEqual({
      search: "main",
      statusIds: ["s1", "s2"],
      baseRentCents: [
        { op: "gte", value: 150000 },
        { op: "lte", value: 300000 },
      ],
      squareFootageEmpty: true,
      sortBy: "baseRent",
      sortDir: "desc",
      pageIndex: 1,
      pageSize: 50,
    })
  })

  it("emits an empty object for the empty query (D-20 clean URL + clean request)", () => {
    expect(buildDataTableServerInput(EMPTY_DATA_TABLE_QUERY, fields)).toEqual({})
  })

  it("skips a filter whose field has no matching config entry", () => {
    const query: DataTableQuery = {
      search: "",
      filters: [
        {
          id: "ghost:is_any_of:0",
          field: "ghost",
          operator: "is_any_of",
          values: ["x"],
        },
        // A field that exists but declares no server mapping is skipped too.
        {
          id: "noserver:is_any_of:0",
          field: "noserver",
          operator: "is_any_of",
          values: ["y"],
        },
      ],
    }

    expect(buildDataTableServerInput(query, fields)).toEqual({})
  })

  it("routes is_not_any_of to the exclude param, not the include param", () => {
    const query: DataTableQuery = {
      search: "",
      filters: [
        {
          id: "property:is_not_any_of:0",
          field: "property",
          operator: "is_not_any_of",
          values: ["p1", "p2"],
        },
      ],
    }

    expect(buildDataTableServerInput(query, fields)).toEqual({
      excludePropertyIds: ["p1", "p2"],
    })
  })
})
