"use client"

import {
  createParser,
  parseAsIndex,
  parseAsNumberLiteral,
  parseAsString,
} from "nuqs"

import {
  DATA_TABLE_DEFAULT_PAGE_SIZE,
  DATA_TABLE_PAGE_SIZES,
} from "../data-table"
import type { DataTableSort } from "../data-table-query"

/**
 * One parsed predicate for one filter field. Deliberately has NO `id` — the
 * deterministic chip id is minted by `useDataTableQueryState` from
 * field + operator + index, so the parser's `eq` never has to compare an id
 * it does not own.
 */
export type FieldFilter = { operator: string; values: string[] }

/**
 * URL operator alias <-> internal operator. Only these are accepted;
 * anything else in a hand-edited URL is dropped, never thrown.
 *
 * The internal names must match the vocabulary `data-table-query.ts` already
 * consumes (`INCLUDE_OPERATORS`, `EXCLUDE_OPERATORS`, `getEmptyFilterFlag`,
 * `NUMERIC_OP_ALIASES`) — this is a URL-facing shorthand for that vocabulary,
 * not a second one.
 */
export const URL_OP_TO_INTERNAL = {
  any: "is_any_of",
  "!any": "is_not_any_of",
  empty: "empty",
  "!empty": "not_empty",
  eq: "eq",
  neq: "neq",
  gt: "gt",
  gte: "gte",
  lt: "lt",
  lte: "lte",
} as const

const INTERNAL_TO_URL_OP: Record<string, string> = Object.fromEntries(
  Object.entries(URL_OP_TO_INTERNAL).map(([url, internal]) => [internal, url])
)

/**
 * Operators that carry no values. Grammar note: a valueless operator cannot
 * be distinguished from a value when it trails a value-bearing predicate, so
 * empty / not-empty is EXCLUSIVE per field in the URL — it must be the only
 * predicate on that field. This is already true semantically:
 * `getEmptyFilterFlag` collapses conflicting empty chips to newest-wins.
 */
const VALUELESS = new Set<string>(["empty", "not_empty"])

/** Frozen module-scope singleton — a fresh `[]` per render breaks nuqs setter stability. */
const EMPTY_PREDICATES = Object.freeze([]) as unknown as FieldFilter[]

// `~` is not in nuqs's escape set, so these survive the encoder verbatim.
// Do NOT use encodeURIComponent — nuqs escapes `%` first, turning `%3A` into
// `%253A` and destroying the hand-editable URLs.
const encodeValue = (v: string) =>
  v.replace(/~/g, "~~").replace(/:/g, "~c").replace(/,/g, "~s")

// ONE left-to-right scan. Do NOT decode with three sequential `.replace` passes
// (`.replace(/~c/g,":").replace(/~s/g,",").replace(/~~/g,"~")`) — that is not
// bijective for any value containing the literal substring `~c` or `~s`:
// `"~c"` encodes to `"~~c"`, and pass 1 then matches the `~c` at index 1 and
// yields `"~:"`. A single scan consumes each escape pair atomically, so `~~`
// is decoded before its second `~` can pair with the following character.
const decodeValue = (v: string) =>
  v.replace(/~(.)/g, (_, c: string) =>
    c === "c" ? ":" : c === "s" ? "," : c === "~" ? "~" : "~" + c
  )

export function fieldFiltersEq(a: FieldFilter[], b: FieldFilter[]): boolean {
  if (a === b) return true
  if (a.length !== b.length) return false
  return a.every((pa, i) => {
    const pb = b[i]!
    return (
      pa.operator === pb.operator &&
      pa.values.length === pb.values.length &&
      pa.values.every((v, j) => v === pb.values[j])
    )
  })
}

/**
 * One filter field's predicates, e.g. `gte:1500,lte:3000` or `any:s1,s2`.
 *
 * @param fieldKey          only used for the dev-time serializer warning
 * @param allowedOperators  the field's declared internal operator list;
 *                          anything outside it is dropped rather than thrown
 */
export function parseAsFieldFilters(
  fieldKey: string,
  allowedOperators: readonly string[]
) {
  const allowed = new Set(allowedOperators)

  return createParser<FieldFilter[]>({
    parse(query) {
      // A valueless predicate's canonical form is the bare alias, which the
      // grammar would otherwise read as a continuation value. It is only ever
      // legal as the whole param (empty / not-empty is exclusive).
      const bare =
        URL_OP_TO_INTERNAL[query as keyof typeof URL_OP_TO_INTERNAL]
      if (bare && VALUELESS.has(bare)) {
        return allowed.has(bare) ? [{ operator: bare, values: [] }] : null
      }

      const out: FieldFilter[] = []
      for (const token of query.split(",")) {
        const colon = token.indexOf(":")
        if (colon === -1) {
          // Continuation value for the open predicate; a stray leading one is ignored.
          out[out.length - 1]?.values.push(decodeValue(token))
          continue
        }
        const internal =
          URL_OP_TO_INTERNAL[
            token.slice(0, colon) as keyof typeof URL_OP_TO_INTERNAL
          ]
        if (!internal || !allowed.has(internal)) continue // drop, never throw
        const raw = token.slice(colon + 1)
        out.push({
          operator: internal,
          values: raw === "" ? [] : [decodeValue(raw)],
        })
      }
      // A value-bearing operator that ended up with no values is meaningless.
      const cleaned = out.filter(
        (p) => VALUELESS.has(p.operator) || p.values.length > 0
      )
      return cleaned.length > 0 ? cleaned : null
    },

    serialize(predicates) {
      if (process.env.NODE_ENV !== "production") {
        for (const p of predicates) {
          for (const v of p.values) {
            if (v.includes(":") || v.includes(",") || v.includes("~")) {
              console.warn(
                `[query-state] Filter value for "${fieldKey}" contains a grammar delimiter and will be escaped: ${JSON.stringify(v)}. ` +
                  `All current filter values are UUIDs or numbers; if this is a new option source, confirm the escaped URL still reads well.`
              )
            }
          }
        }
      }
      return predicates
        .map((p) =>
          VALUELESS.has(p.operator)
            ? INTERNAL_TO_URL_OP[p.operator]!
            : `${INTERNAL_TO_URL_OP[p.operator]}:${p.values.map(encodeValue).join(",")}`
        )
        .join(",")
    },

    // NOT optional. nuqs uses `eq` both for `clearOnDefault` comparisons and
    // for its keyMap-stability heuristic; omitting it on a non-primitive
    // parser costs both a clean URL and a stable setter.
    eq: fieldFiltersEq,
  }).withDefault(EMPTY_PREDICATES)
}

/**
 * `sort=-baseRent` <-> `{ id: "baseRent", desc: true }`.
 * Validated against the table's declared sortable column ids — an unknown id
 * yields null, which nuqs resolves to the default (no sort).
 */
export function parseAsSort(sortableIds: readonly string[]) {
  const allowed = new Set(sortableIds)
  return createParser<DataTableSort>({
    parse(query) {
      const desc = query.startsWith("-")
      const id = desc ? query.slice(1) : query
      return allowed.has(id) ? { id, desc } : null
    },
    serialize: (s) => (s.desc ? `-${s.id}` : s.id),
    // Non-primitive value -> `eq` is required for clearOnDefault and keyMap
    // stability, even though this parser has no default today.
    eq: (a, b) => a.id === b.id && a.desc === b.desc,
  })
}

/**
 * 1-based in the URL, 0-based in state — exactly `parseAsIndex`. Do not
 * hand-roll the ±1; nuqs's version already handles null and non-numeric input.
 */
export const pageParser = parseAsIndex.withDefault(0)

/** Allow-listed page size; a hand-edited `?size=999` falls back to the default. */
export const sizeParser = parseAsNumberLiteral(DATA_TABLE_PAGE_SIZES).withDefault(
  DATA_TABLE_DEFAULT_PAGE_SIZE
)

/** Committed search text only — the 300 ms debounce stays in DataTableToolbar. */
export const searchParser = parseAsString.withDefault("")
