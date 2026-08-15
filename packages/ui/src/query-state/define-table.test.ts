import { beforeEach, describe, expect, it } from "vitest"

import { idFilterOperators, numericFilterOperators } from "../data-table-query"
import { defineTable, ids, numeric } from "./define-table"
import { __resetQueryStateKeyRegistry } from "./key-registry"

function statusField() {
  return ids({
    label: "Status",
    icon: "IconCircleCheck",
    operators: idFilterOperators(),
    server: { kind: "ids", param: "statusIds", excludeParam: "excludeStatusIds" },
  })
}

function propertyField() {
  return ids({
    label: "Property",
    operators: idFilterOperators({ nullable: false }),
    server: {
      kind: "ids",
      param: "propertyIds",
      excludeParam: "excludePropertyIds",
    },
  })
}

function baseRentField() {
  return numeric({
    label: "Base rent",
    operators: numericFilterOperators(),
    server: { kind: "numeric", param: "baseRentCents" },
  })
}

beforeEach(() => {
  __resetQueryStateKeyRegistry()
})

describe("defineTable — urlKeys namespacing", () => {
  it("emits unprefixed keys when namespace is null", () => {
    const table = defineTable("units", {
      fields: { status: statusField(), baseRent: baseRentField() },
      sortable: ["baseRent"],
    })

    expect(table.urlKeys).toEqual({
      q: "q",
      sort: "sort",
      page: "page",
      size: "size",
      status: "status",
      baseRent: "baseRent",
    })
  })

  it("`:`-prefixes every key when a namespace is given", () => {
    const table = defineTable("units", {
      namespace: "units",
      fields: { status: statusField() },
      sortable: [],
    })

    expect(table.urlKeys).toEqual({
      q: "units:q",
      sort: "units:sort",
      page: "units:page",
      size: "units:size",
      status: "units:status",
    })
    for (const key of Object.values(table.urlKeys)) {
      expect(key.startsWith("units:")).toBe(true)
    }
  })
})

describe("defineTable — frozen module-scope map", () => {
  it("freezes both parsers and urlKeys", () => {
    const table = defineTable("units", {
      fields: { status: statusField() },
      sortable: [],
    })

    expect(Object.isFrozen(table.parsers)).toBe(true)
    expect(Object.isFrozen(table.urlKeys)).toBe(true)
  })

  it("keeps parser-map identity stable across accesses (never rebuilt)", () => {
    const table = defineTable("units", {
      fields: { status: statusField() },
      sortable: [],
    })

    expect(table.parsers).toBe(table.parsers)
  })
})

describe("defineTable — key scheme guard", () => {
  it("does not throw when the same name re-registers (HMR re-evaluation)", () => {
    const build = () =>
      defineTable("units", {
        fields: { status: statusField() },
        sortable: [],
      })

    build()
    expect(build).not.toThrow()
  })

  it("lets two UNPREFIXED tables coexist at module scope — collision is checked at mount time", () => {
    expect(() => {
      defineTable("units", {
        fields: { status: statusField() },
        sortable: [],
      })
      defineTable("leases", {
        fields: { status: statusField() },
        sortable: [],
      })
    }).not.toThrow()
  })

  it("does not throw for two namespaced tables with different names", () => {
    expect(() => {
      defineTable("a", {
        namespace: "a",
        fields: { status: statusField() },
        sortable: [],
      })
      defineTable("b", {
        namespace: "b",
        fields: { status: statusField() },
        sortable: [],
      })
    }).not.toThrow()
  })

  it("rejects a filter field named after a reserved core param", () => {
    expect(() =>
      defineTable("units", {
        fields: { sort: statusField() },
        sortable: [],
      })
    ).toThrow(/reserved/)
  })
})

describe("defineTable — toFieldParams (inverse of the parse side)", () => {
  it("returns null for every field when there are no filters", () => {
    const table = defineTable("units", {
      fields: { status: statusField(), baseRent: baseRentField() },
      sortable: ["baseRent"],
    })

    expect(table.toFieldParams([])).toEqual({ status: null, baseRent: null })
  })

  it("maps a field's predicates and leaves other fields null", () => {
    const table = defineTable("units", {
      fields: { status: statusField(), baseRent: baseRentField() },
      sortable: ["baseRent"],
    })

    expect(
      table.toFieldParams([
        {
          id: "x",
          field: "status",
          operator: "is_any_of",
          values: ["s1", "s2"],
        },
      ])
    ).toEqual({
      status: [{ operator: "is_any_of", values: ["s1", "s2"] }],
      baseRent: null,
    })
  })
})

describe("defineTable — operator allow-list threads into the parser", () => {
  it("drops `empty` for a field declared with nullable:false", () => {
    const table = defineTable("units", {
      fields: { property: propertyField() },
      sortable: [],
    })

    // `empty` is not in idFilterOperators({ nullable: false }) — parser drops it.
    expect(table.parsers.property.parse("empty")).toBeNull()
    // A permitted operator still parses.
    expect(table.parsers.property.parse("any:p1")).toEqual([
      { operator: "is_any_of", values: ["p1"] },
    ])
  })

  it("keeps `empty` for a nullable id field", () => {
    const table = defineTable("units", {
      fields: { status: statusField() },
      sortable: [],
    })

    expect(table.parsers.status.parse("empty")).toEqual([
      { operator: "empty", values: [] },
    ])
  })
})
