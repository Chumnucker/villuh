import {
  createParser,
  createSerializer,
  parseAsIndex,
  parseAsString,
} from "nuqs"
import { describe, expect, it } from "vitest"

/**
 * Pins the four nuqs 2.9.5 behaviours phase 03.1's design rests on. A future
 * nuqs bump that changes any of them fails here, at install time, instead of
 * in a browser six plans later.
 */
describe("nuqs 2.9.5 contract", () => {
  it("parseAsIndex is 1-based in the URL and 0-based in state (D-43)", () => {
    expect(parseAsIndex.parse("1")).toBe(0)
    expect(parseAsIndex.parse("2")).toBe(1)
    expect(parseAsIndex.serialize(0)).toBe("1")
    expect(parseAsIndex.parse("nope")).toBeNull()
  })

  it("createParser defaults eq to === and lets a supplied eq win (D-41)", () => {
    const withoutEq = createParser<number[]>({
      parse: (value) => value.split(",").map(Number),
      serialize: (value) => value.join(","),
    })
    // Identity comparison: same content, different arrays -> not equal.
    expect(withoutEq.eq([1], [1])).toBe(false)

    const withEq = createParser<number[]>({
      parse: (value) => value.split(",").map(Number),
      serialize: (value) => value.join(","),
      eq: (a, b) => a.length === b.length && a.every((v, i) => v === b[i]),
    })
    expect(withEq.eq([1], [1])).toBe(true)
  })

  it("createSerializer merges into a URLSearchParams base and drops it without one (D-10, Pitfall 5)", () => {
    const serialize = createSerializer({ form: parseAsString })

    const merged = serialize(new URLSearchParams("status=any:s1&q=main"), {
      form: "u1",
    })
    expect(merged).toContain("q=main")
    expect(merged).toContain("form=u1")
    expect(merged).toMatch(/status=any(:|%3A)s1/)

    // No base: starts from an empty URLSearchParams, so every unrelated param
    // in the current URL is silently dropped. This is Pitfall 5 verbatim.
    const unbased = serialize({ form: "u1" })
    expect(unbased).toContain("form=u1")
    expect(unbased).not.toContain("q=main")
  })

  it("leaves ':' and ',' unescaped in the query string (D-45)", () => {
    const serialize = createSerializer({ status: parseAsString })

    const output = serialize(new URLSearchParams(), { status: "any:s1,s2" })

    expect(output).toContain("any:s1,s2")
    expect(output).not.toContain("%3A")
    expect(output).not.toContain("%2C")
  })
})
