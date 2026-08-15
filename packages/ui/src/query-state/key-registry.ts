/**
 * Dev-time guards against two query-state groups claiming the same URL key.
 *
 * Two nuqs hooks bound to the same key with different parsers cross-contaminate
 * silently, so these throw loudly during development instead. Both guards are
 * compiled out in production — a collision that survives development is not
 * worth a runtime cost.
 *
 * The hazard is two hooks on one key mounted AT THE SAME TIME, so the two
 * kinds are checked at different scopes:
 *
 *   overlay -> module evaluation. `<AppOverlays>` mounts every overlay group
 *              on every page, so overlay keys must be app-globally unique.
 *   table   -> mount time. Tables on different routes never coexist, so two
 *              unprefixed tables (`?q=…` on /units and /tenants) are fine.
 *              Only two tables mounted on ONE page collide — that is what
 *              `claimMountedTableKeys` catches from useDataTableQueryState.
 *
 * Cross-kind collisions are impossible by construction: overlay keys always
 * contain "." and table keys never do (see the scheme checks below).
 *
 * Key schemes (see README.md):
 *   overlay -> always dot-namespaced:  `unit.form`, `gallery.photo`
 *   table   -> unprefixed by default:  `q`, `sort`, `page`, `size`, `status`
 *              `:`-prefixed only when one page hosts two tables: `units:status`
 */
export type QueryStateKind = "overlay" | "table"

const registeredOverlayKeys = new Map<string, string>()

/**
 * Module-evaluation guard. Validates the key scheme for both kinds; enforces
 * global uniqueness for overlay keys only (table uniqueness is a mount-time
 * property — see `claimMountedTableKeys`).
 */
export function registerQueryStateKeys(
  owner: string,
  urlKeys: readonly string[],
  kind: QueryStateKind
): void {
  if (process.env.NODE_ENV === "production") return

  for (const key of urlKeys) {
    if (kind === "overlay" && !key.includes(".")) {
      throw new Error(
        `[query-state] Overlay key "${key}" (owner "${owner}") must be dot-namespaced, e.g. "${owner}.${key}". See query-state/README.md.`
      )
    }
    if (kind === "table" && key.includes(".")) {
      throw new Error(
        `[query-state] Table key "${key}" (owner "${owner}") must not contain "." — that separator is reserved for overlay namespaces. Use a ":" prefix instead, e.g. "${owner}:${key}". See query-state/README.md.`
      )
    }
    if (kind !== "overlay") continue

    const existing = registeredOverlayKeys.get(key)
    // Same owner re-registering is HMR re-evaluating the module — not a collision.
    if (existing !== undefined && existing !== owner) {
      throw new Error(
        `[query-state] URL key collision: overlay key "${key}" is claimed by both "${existing}" and "${owner}". Overlays are mounted globally by <AppOverlays>, so their keys must be app-unique. See query-state/README.md.`
      )
    }
    registeredOverlayKeys.set(key, owner)
  }
}

type MountClaim = { owner: string; count: number }

const mountedTableKeys = new Map<string, MountClaim>()

const NOOP = () => {}

/**
 * Mount-time guard for table keys, called from useDataTableQueryState's
 * effect. Claims every key for the lifetime of the mount and returns the
 * release; throws if a DIFFERENT table currently holds any of them, i.e. two
 * tables sharing a key are mounted on the same page. The same definition
 * mounted twice is fine — identical parsers on one key stay in sync — hence
 * the per-key refcount (which also keeps StrictMode's mount/cleanup/mount
 * cycle balanced).
 */
export function claimMountedTableKeys(
  owner: string,
  urlKeys: readonly string[]
): () => void {
  if (process.env.NODE_ENV === "production") return NOOP

  // Validate-then-commit so a throw never leaves a partial claim behind.
  for (const key of urlKeys) {
    const claim = mountedTableKeys.get(key)
    if (claim !== undefined && claim.owner !== owner) {
      throw new Error(
        `[query-state] Two tables mounted on this page both bind the URL key "${key}": "${claim.owner}" and "${owner}". ` +
          `Give at least one of them a \`namespace\` so its keys prefix apart (e.g. "${owner}:${key}"). See query-state/README.md.`
      )
    }
  }
  for (const key of urlKeys) {
    const claim = mountedTableKeys.get(key)
    if (claim !== undefined) claim.count += 1
    else mountedTableKeys.set(key, { owner, count: 1 })
  }

  return () => {
    for (const key of urlKeys) {
      const claim = mountedTableKeys.get(key)
      if (claim === undefined) continue
      claim.count -= 1
      if (claim.count <= 0) mountedTableKeys.delete(key)
    }
  }
}

/** Test-only. Never call from app code. */
export function __resetQueryStateKeyRegistry(): void {
  registeredOverlayKeys.clear()
  mountedTableKeys.clear()
}
