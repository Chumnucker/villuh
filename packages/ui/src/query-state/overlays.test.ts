import { createSerializer, parseAsString } from "nuqs"
import { beforeEach, describe, expect, it } from "vitest"

import { __resetQueryStateKeyRegistry } from "./key-registry"
import {
  buildOverlayHref,
  createOverlays,
  entity,
  flag,
  pageEntity,
} from "./overlays"
import type { OverlayComponent } from "./types"

// No JSX, so this file stays `.ts` and inside the node-only vitest project (D-46).
const Noop = (() => null) as unknown as OverlayComponent

beforeEach(() => {
  __resetQueryStateKeyRegistry()
})

describe("createOverlays", () => {
  it("namespaces every url key as `{namespace}.{name}` (D-13)", () => {
    const group = createOverlays("unit", {
      form: entity(Noop),
      archive: entity(Noop),
    })

    expect(group.urlKeys).toEqual({
      form: "unit.form",
      archive: "unit.archive",
    })
  })

  it("freezes the url key map so nuqs's setter identity cannot churn (D-41)", () => {
    const group = createOverlays("unit", { form: entity(Noop) })

    expect(Object.isFrozen(group.urlKeys)).toBe(true)
  })

  it("exposes the namespace and the raw defs it was declared with (D-07)", () => {
    const defs = { form: entity(Noop) }
    const group = createOverlays("unit", defs)

    expect(group.namespace).toBe("unit")
    expect(group.defs).toBe(defs)
  })

  it("throws when a second group resolves to an already-claimed url key (D-29)", () => {
    createOverlays("unit", { "form.edit": entity(Noop) })

    expect(() => createOverlays("unit.form", { edit: entity(Noop) })).toThrow(
      /URL key collision/
    )
  })

  it("tolerates the same namespace re-registering — that is HMR, not a collision", () => {
    createOverlays("unit", { form: entity(Noop) })

    expect(() => createOverlays("unit", { form: entity(Noop) })).not.toThrow()
  })
})

describe("registry helpers", () => {
  it("entity() registers an auto-mounted overlay carrying its component (D-31)", () => {
    const def = entity(Noop)

    expect(def).toEqual({
      component: Noop,
      mount: "global",
      defaultValue: undefined,
    })
  })

  it("entity() forwards an explicit defaultValue", () => {
    expect(entity(Noop, { defaultValue: "new" }).defaultValue).toBe("new")
  })

  it("flag() is a payload-free auto-mounted overlay", () => {
    expect(flag(Noop)).toEqual({
      component: Noop,
      mount: "global",
      defaultValue: "1",
    })
  })

  it("pageEntity() registers the key only — no component, mount 'page' (D-47)", () => {
    const def = pageEntity()

    expect(def.component).toBeUndefined()
    expect(def.mount).toBe("page")
  })

  it("pageEntity() forwards an explicit defaultValue", () => {
    expect(pageEntity({ defaultValue: "img_1" }).defaultValue).toBe("img_1")
  })

  it("global-mount and page-mount names partition the declared defs (D-08, D-47)", () => {
    const group = createOverlays("gallery", {
      form: entity(Noop),
      manage: flag(Noop),
      photo: pageEntity(),
    })

    const defs = group.defs
    const names = Object.keys(defs) as (keyof typeof defs)[]
    const global = names.filter((n) => defs[n].mount === "global")
    const page = names.filter((n) => defs[n].mount === "page")

    expect(global).toEqual(["form", "manage"])
    expect(page).toEqual(["photo"])
    expect([...global, ...page].sort()).toEqual([...names].sort())
  })
})

describe("buildOverlayHref", () => {
  const serialize = createSerializer(
    { form: parseAsString },
    { urlKeys: { form: "unit.form" } }
  ) as unknown as Parameters<typeof buildOverlayHref>[0]

  it("merges into the current search params instead of replacing them (D-10, Pitfall 5)", () => {
    const base = new URLSearchParams("q=main&status=any:s1")

    const href = buildOverlayHref(serialize, base, "form", "u1")

    expect(href).toContain("q=main")
    expect(href).toContain("status=any:s1")

    // Control: the same serializer WITHOUT a base drops every other param.
    // If this ever stops holding, the assertions above prove nothing.
    const baseless = (
      serialize as unknown as (v: Record<string, string | null>) => string
    )({ form: "u1" })
    expect(baseless).not.toContain("q=main")
  })

  it("writes the overlay's resolved url key with the given value", () => {
    const base = new URLSearchParams("q=main&status=any:s1")

    expect(buildOverlayHref(serialize, base, "form", "u1")).toContain(
      "unit.form=u1"
    )
  })

  it("clears the key when the value is null, leaving other params intact", () => {
    const base = new URLSearchParams("q=main&status=any:s1&unit.form=old")

    const href = buildOverlayHref(serialize, base, "form", null)

    expect(href).not.toContain("unit.form")
    expect(href).toContain("q=main")
  })
})
