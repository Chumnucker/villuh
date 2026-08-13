/**
 * Dev-time guard against two query-state groups claiming the same URL key.
 *
 * Two nuqs hooks bound to the same key with different parsers cross-contaminate
 * silently, so this throws loudly during development instead. Compiled out in
 * production — a collision that survives development is not worth a runtime cost.
 *
 * Key schemes (D-29):
 *   overlay -> always dot-namespaced:  `unit.form`, `gallery.photo`
 *   table   -> unprefixed by default:  `q`, `sort`, `page`, `size`, `status`
 *              `:`-prefixed only when one page hosts two tables: `units:status`
 */
export type QueryStateKind = "overlay" | "table"

const registered = new Map<string, string>()

export function registerQueryStateKeys(
  owner: string,
  urlKeys: readonly string[],
  kind: QueryStateKind
): void {
  if (process.env.NODE_ENV === "production") return

  for (const key of urlKeys) {
    if (kind === "overlay" && !key.includes(".")) {
      throw new Error(
        `[query-state] Overlay key "${key}" (owner "${owner}") must be dot-namespaced, e.g. "${owner}.${key}". See D-29.`
      )
    }
    if (kind === "table" && key.includes(".")) {
      throw new Error(
        `[query-state] Table key "${key}" (owner "${owner}") must not contain "." — that separator is reserved for overlay namespaces. Use a ":" prefix instead, e.g. "${owner}:${key}". See D-29.`
      )
    }

    const existing = registered.get(key)
    // Same owner re-registering is HMR re-evaluating the module — not a collision.
    if (existing !== undefined && existing !== owner) {
      throw new Error(
        `[query-state] URL key collision: "${key}" is claimed by both "${existing}" and "${owner}". ` +
          `Overlay keys use "." and table keys use ":" precisely so the two schemes cannot converge. See D-29.`
      )
    }
    registered.set(key, owner)
  }
}

/** Test-only. Never call from app code. */
export function __resetQueryStateKeyRegistry(): void {
  registered.clear()
}
