import { isParserBijective } from "nuqs/testing"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  DATA_TABLE_DEFAULT_PAGE_SIZE,
  DATA_TABLE_PAGE_SIZES,
} from "../data-table"
import { idFilterOperators, numericFilterOperators } from "../data-table-query"
import {
  fieldFiltersEq,
  pageParser,
  parseAsFieldFilters,
  parseAsSort,
  searchParser,
  sizeParser,
} from "./table-params"
import type { FieldFilter } from "./table-params"

/** The real vocabularies from `data-table-query.ts` — not a second one (D-19). */
const ID_OPS = idFilterOperators({ nullable: false }).map((op) => op.value)
const ID_OPS_NULLABLE = idFilterOperators().map((op) => op.value)
const NUMERIC_OPS = numericFilterOperators().map((op) => op.value)

const statusParser = parseAsFieldFilters("status", ID_OPS)
const statusNullableParser = parseAsFieldFilters("status", ID_OPS_NULLABLE)
const baseRentParser = parseAsFieldFilters("baseRent", NUMERIC_OPS)

describe("parseAsFieldFilters — grammar (D-18, D-45)", () => {
  it("parses one predicate carrying two values", () => {
    expect(statusParser.parse("any:s1,s2")).toEqual([
      { operator: "is_any_of", values: ["s1", "s2"] },
    ])
  })

  it("parses two predicates carrying one value each", () => {
    expect(baseRentParser.parse("gte:1500,lte:3000")).toEqual([
      { operator: "gte", values: ["1500"] },
      { operator: "lte", values: ["3000"] },
    ])
  })

  it("parses the negated id operator", () => {
    expect(statusParser.parse("!any:s1")).toEqual([
      { operator: "is_not_any_of", values: ["s1"] },
    ])
  })

  it("parses a bare valueless operator as the only predicate on the field", () => {
    expect(statusNullableParser.parse("!empty")).toEqual([
      { operator: "not_empty", values: [] },
    ])
    expect(statusNullableParser.parse("empty")).toEqual([
      { operator: "empty", values: [] },
    ])
  })

  it("drops an unknown operator without throwing (D-19)", () => {
    const parsed = baseRentParser.parse("bogus:1,gte:2")

    expect(parsed).toHaveLength(1)
    expect(parsed?.[0]?.operator).toBe("gte")
    expect(parsed?.[0]?.values).toEqual(["2"])
  })

  it("drops an operator the field does not declare (D-19)", () => {
    // idFilterOperators({ nullable: false }) offers no empty / not_empty.
    expect(statusParser.parse("empty")).toBeNull()
    expect(statusParser.parse("gte:1500")).toBeNull()
  })

  it("returns null for a leading continuation value with no open predicate", () => {
    expect(() => statusParser.parse("s1")).not.toThrow()
    expect(statusParser.parse("s1")).toBeNull()
  })

  it("returns null for a value-bearing operator with no value", () => {
    expect(baseRentParser.parse("gte:")).toBeNull()
  })

  it("returns null for an empty query", () => {
    expect(statusParser.parse("")).toBeNull()
  })
})

describe("parseAsFieldFilters — bijectivity (D-45)", () => {
  const cases: ReadonlyArray<
    readonly [label: string, serialized: string, parsed: FieldFilter[]]
  > = [
    [
      "id values",
      "any:s1,s2",
      [{ operator: "is_any_of", values: ["s1", "s2"] }],
    ],
    [
      "numeric range",
      "gte:1500,lte:3000",
      [
        { operator: "gte", values: ["1500"] },
        { operator: "lte", values: ["3000"] },
      ],
    ],
    ["valueless", "!empty", [{ operator: "not_empty", values: [] }]],
    // Escape-bearing: the other three round-trip cleanly even under a broken
    // sequential decode, so this one is what makes the suite discriminating.
    ["escaped value", "any:a~~cb", [{ operator: "is_any_of", values: ["a~cb"] }]],
  ]

  it.each(cases)("round-trips %s", (_label, serialized, parsed) => {
    const parser = parseAsFieldFilters("field", [
      ...ID_OPS_NULLABLE,
      ...NUMERIC_OPS,
    ])

    expect(parser.serialize(parser.parse(serialized) ?? [])).toBe(serialized)
    expect(parser.parse(parser.serialize(parsed))).toEqual(parsed)
    expect(isParserBijective(parser, serialized, parsed)).toBe(true)
  })
})

describe("parseAsFieldFilters — delimiter escapes (D-45)", () => {
  let warn: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {})
  })

  afterEach(() => {
    warn.mockRestore()
  })

  // `~c`, `~s`, `~~` and `a~cb` are the discriminating vectors: a value whose
  // LITERAL text is an escape sequence is exactly what a three-pass sequential
  // decode gets wrong (`"~c"` encodes to `"~~c"`, and pass 1 then matches the
  // `~c` at index 1 and yields `"~:"`).
  it.each(["a:b", "c,d", "e~f", "~c", "~s", "~~", "a~cb"])(
    "round-trips the literal value %j",
    (value) => {
      const parser = parseAsFieldFilters("status", ID_OPS)
      const input: FieldFilter[] = [{ operator: "is_any_of", values: [value] }]

      expect(parser.parse(parser.serialize(input))).toEqual(input)
    }
  )

  it("warns in development when a value carries a grammar delimiter", () => {
    const parser = parseAsFieldFilters("status", ID_OPS)

    parser.serialize([{ operator: "is_any_of", values: ["a:b"] }])

    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]?.[0])).toContain("status")
  })
})

describe("parseAsFieldFilters — eq and default identity (D-41)", () => {
  it("compares content, not identity", () => {
    const a: FieldFilter[] = [{ operator: "is_any_of", values: ["s1", "s2"] }]
    const b: FieldFilter[] = [{ operator: "is_any_of", values: ["s1", "s2"] }]

    expect(a).not.toBe(b)
    expect(fieldFiltersEq(a, b)).toBe(true)
    expect(statusParser.eq(a, b)).toBe(true)
  })

  it.each([
    [
      "operator differs",
      [{ operator: "is_not_any_of", values: ["s1", "s2"] }],
    ],
    ["a value differs", [{ operator: "is_any_of", values: ["s1", "s3"] }]],
    ["a value count differs", [{ operator: "is_any_of", values: ["s1"] }]],
    [
      "the predicate count differs",
      [
        { operator: "is_any_of", values: ["s1", "s2"] },
        { operator: "is_not_any_of", values: ["s3"] },
      ],
    ],
  ] as ReadonlyArray<readonly [label: string, other: FieldFilter[]]>)(
    "is false when %s",
    (_label, other) => {
      const base: FieldFilter[] = [
        { operator: "is_any_of", values: ["s1", "s2"] },
      ]

      expect(fieldFiltersEq(base, other)).toBe(false)
      expect(statusParser.eq(base, other)).toBe(false)
    }
  )

  it("shares ONE frozen empty-array default across every parser instance", () => {
    const first = parseAsFieldFilters("status", ID_OPS)
    const second = parseAsFieldFilters("baseRent", NUMERIC_OPS)

    expect(first.defaultValue).toBe(second.defaultValue)
    expect(first.defaultValue).toEqual([])
    expect(Object.isFrozen(first.defaultValue)).toBe(true)
  })
})

/** Mirrors the server's `UNIT_SORT_KEYS` allow-list (units/schemas.ts). */
const SORTABLE = ["label", "propertyName", "status", "baseRent", "squareFootage"]
const sortParser = parseAsSort(SORTABLE)

describe("parseAsSort (D-20)", () => {
  it("reads a leading '-' as descending", () => {
    expect(sortParser.parse("-baseRent")).toEqual({
      id: "baseRent",
      desc: true,
    })
  })

  it("reads a bare column id as ascending", () => {
    expect(sortParser.parse("label")).toEqual({ id: "label", desc: false })
  })

  it("rejects a column id outside the sortable allow-list (T-03.1-06)", () => {
    expect(sortParser.parse("nope")).toBeNull()
    expect(sortParser.parse("-nope")).toBeNull()
  })

  it("serializes the '-' prefix only for descending", () => {
    expect(sortParser.serialize({ id: "baseRent", desc: true })).toBe(
      "-baseRent"
    )
    expect(sortParser.serialize({ id: "label", desc: false })).toBe("label")
  })

  it("declares an eq comparing id and desc (D-41)", () => {
    expect(
      sortParser.eq({ id: "label", desc: false }, { id: "label", desc: false })
    ).toBe(true)
    expect(
      sortParser.eq({ id: "label", desc: false }, { id: "label", desc: true })
    ).toBe(false)
    expect(
      sortParser.eq({ id: "label", desc: false }, { id: "status", desc: false })
    ).toBe(false)
  })

  it("round-trips both directions", () => {
    expect(
      isParserBijective(sortParser, "-baseRent", { id: "baseRent", desc: true })
    ).toBe(true)
    expect(
      isParserBijective(sortParser, "label", { id: "label", desc: false })
    ).toBe(true)
  })
})

describe("pageParser (D-20, D-43)", () => {
  it("is 1-based in the URL and 0-based in state", () => {
    expect(pageParser.parse("1")).toBe(0)
    expect(pageParser.parse("3")).toBe(2)
  })

  it("serializes back to the 1-based form", () => {
    expect(pageParser.serialize(0)).toBe("1")
    expect(pageParser.serialize(2)).toBe("3")
  })

  it("rejects non-numeric input and defaults to the first page (T-03.1-07)", () => {
    expect(pageParser.parse("nope")).toBeNull()
    expect(pageParser.defaultValue).toBe(0)
  })
})

describe("sizeParser (D-20)", () => {
  it("accepts an allow-listed page size", () => {
    for (const size of DATA_TABLE_PAGE_SIZES) {
      expect(sizeParser.parse(String(size))).toBe(size)
    }
    expect(sizeParser.parse("50")).toBe(50)
  })

  it("rejects a size outside DATA_TABLE_PAGE_SIZES (T-03.1-07)", () => {
    expect(sizeParser.parse("999")).toBeNull()
    expect(sizeParser.parse("nope")).toBeNull()
  })

  it("defaults to DATA_TABLE_DEFAULT_PAGE_SIZE", () => {
    expect(sizeParser.defaultValue).toBe(DATA_TABLE_DEFAULT_PAGE_SIZE)
    expect(sizeParser.defaultValue).toBe(25)
  })
})

describe("searchParser (D-27)", () => {
  it("defaults to the empty string so an untouched table has no ?q=", () => {
    expect(searchParser.defaultValue).toBe("")
    expect(searchParser.parse("main")).toBe("main")
  })
})
