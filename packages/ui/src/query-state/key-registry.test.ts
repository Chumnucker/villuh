import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  __resetQueryStateKeyRegistry,
  claimMountedTableKeys,
  registerQueryStateKeys,
} from "./key-registry"

/** Returns the thrown Error's message, or fails the test if nothing threw. */
function messageFrom(fn: () => void): string {
  try {
    fn()
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  throw new Error("Expected the guard to throw, but it did not.")
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

  it("throws naming both owners and the colliding overlay key when a second owner claims it", () => {
    registerQueryStateKeys("unit", ["unit.form"], "overlay")

    const message = messageFrom(() =>
      registerQueryStateKeys("lease", ["unit.form"], "overlay")
    )

    expect(message).toContain("unit.form")
    expect(message).toContain("unit")
    expect(message).toContain("lease")
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

  it("accepts unprefixed table keys, the default scheme", () => {
    expect(() =>
      registerQueryStateKeys("units", ["q", "sort", "page", "size"], "table")
    ).not.toThrow()
  })

  it("lets two table definitions share unprefixed keys at module evaluation — collision is a mount-time property", () => {
    registerQueryStateKeys("units", ["q", "sort", "page", "size"], "table")
    expect(() =>
      registerQueryStateKeys("tenants", ["q", "sort", "page", "size"], "table")
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

describe("claimMountedTableKeys", () => {
  it("claims keys and returns a release function", () => {
    const release = claimMountedTableKeys("units", ["q", "sort"])
    expect(release).toBeTypeOf("function")
    release()
  })

  it("throws naming both tables and the colliding key when a second mounted table binds it", () => {
    claimMountedTableKeys("units", ["q", "sort", "page", "size"])

    const message = messageFrom(() =>
      claimMountedTableKeys("tenants", ["q", "sort", "page", "size"])
    )

    expect(message).toContain('"q"')
    expect(message).toContain("units")
    expect(message).toContain("tenants")
    expect(message).toContain("namespace")
  })

  it("allows another table to claim a key after the holder releases it (route change)", () => {
    const release = claimMountedTableKeys("units", ["q", "sort"])
    release()

    expect(() => claimMountedTableKeys("tenants", ["q", "sort"])).not.toThrow()
  })

  it("refcounts the same owner mounted twice, so one release does not free the other mount's claim", () => {
    const releaseFirst = claimMountedTableKeys("units", ["q"])
    const releaseSecond = claimMountedTableKeys("units", ["q"])

    releaseFirst()
    // Still held by the second mount.
    expect(messageFrom(() => claimMountedTableKeys("tenants", ["q"]))).toContain(
      "units"
    )

    releaseSecond()
    expect(() => claimMountedTableKeys("tenants", ["q"])).not.toThrow()
  })

  it("survives StrictMode's mount → cleanup → mount cycle", () => {
    const release = claimMountedTableKeys("units", ["q"])
    release()
    expect(() => claimMountedTableKeys("units", ["q"])).not.toThrow()
  })

  it("leaves no partial claim behind when it throws", () => {
    claimMountedTableKeys("units", ["sort"])

    // "q" precedes the colliding "sort" in the claim; the throw must not
    // leave "q" claimed by tenants.
    expect(() => claimMountedTableKeys("tenants", ["q", "sort"])).toThrow()
    expect(() => claimMountedTableKeys("leases", ["q"])).not.toThrow()
  })

  it("is a no-op in production, even on a genuine collision", () => {
    claimMountedTableKeys("units", ["q"])

    vi.stubEnv("NODE_ENV", "production")

    expect(() => claimMountedTableKeys("tenants", ["q"])).not.toThrow()
  })

  it("__resetQueryStateKeyRegistry clears mounted claims", () => {
    claimMountedTableKeys("units", ["q"])

    __resetQueryStateKeyRegistry()

    expect(() => claimMountedTableKeys("tenants", ["q"])).not.toThrow()
  })
})
