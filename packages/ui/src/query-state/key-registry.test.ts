import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  __resetQueryStateKeyRegistry,
  registerQueryStateKeys,
} from "./key-registry"

/** Returns the thrown Error's message, or fails the test if nothing threw. */
function messageFrom(fn: () => void): string {
  try {
    fn()
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  throw new Error("Expected registerQueryStateKeys to throw, but it did not.")
}

beforeEach(() => {
  __resetQueryStateKeyRegistry()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("registerQueryStateKeys", () => {
  it("registers a dot-namespaced overlay key set and returns void", () => {
    expect(
      registerQueryStateKeys("unit", ["unit.form", "unit.archive"], "overlay")
    ).toBeUndefined()
  })

  it("tolerates the same owner re-registering (HMR module re-evaluation)", () => {
    registerQueryStateKeys("unit", ["unit.form", "unit.archive"], "overlay")
    expect(() =>
      registerQueryStateKeys("unit", ["unit.form", "unit.archive"], "overlay")
    ).not.toThrow()
  })

  it("throws naming both owners and the colliding key when a second owner claims it", () => {
    registerQueryStateKeys("unit", ["unit.form"], "overlay")

    const message = messageFrom(() =>
      registerQueryStateKeys("lease", ["unit.form"], "overlay")
    )

    expect(message).toContain("unit.form")
    expect(message).toContain("unit")
    expect(message).toContain("lease")
    expect(message).toContain("D-29")
  })

  it("throws when an overlay key is not dot-namespaced", () => {
    const message = messageFrom(() =>
      registerQueryStateKeys("unit", ["form"], "overlay")
    )

    expect(message).toContain("form")
    expect(message).toContain("dot-namespaced")
  })

  it("throws when a table key contains a dot", () => {
    const message = messageFrom(() =>
      registerQueryStateKeys("units", ["units.status"], "table")
    )

    expect(message).toContain("units.status")
    expect(message).toContain(":")
  })

  it("accepts a colon-prefixed table key", () => {
    expect(() =>
      registerQueryStateKeys("units", ["units:status"], "table")
    ).not.toThrow()
  })

  it("accepts unprefixed table keys, the D-29 default", () => {
    expect(() =>
      registerQueryStateKeys("units", ["q", "sort", "page", "size"], "table")
    ).not.toThrow()
  })

  it("is a no-op in production, even on a genuine collision", () => {
    registerQueryStateKeys("unit", ["unit.form"], "overlay")

    vi.stubEnv("NODE_ENV", "production")

    expect(() =>
      registerQueryStateKeys("lease", ["unit.form"], "overlay")
    ).not.toThrow()
    expect(() =>
      registerQueryStateKeys("lease", ["notnamespaced"], "overlay")
    ).not.toThrow()
    expect(() =>
      registerQueryStateKeys("units", ["units.status"], "table")
    ).not.toThrow()
  })

  it("__resetQueryStateKeyRegistry clears state so tests are order-independent", () => {
    registerQueryStateKeys("unit", ["unit.form"], "overlay")

    __resetQueryStateKeyRegistry()

    expect(() =>
      registerQueryStateKeys("lease", ["unit.form"], "overlay")
    ).not.toThrow()
  })
})
