/** Cross-tab exclusion for canonical artwork writers; never downgrade silently. */
export function createArtworkEntityLock(
  locks: Pick<LockManager, "request"> | undefined,
) {
  return async function lock<T>(
    key: string,
    action: () => Promise<T>,
  ): Promise<T> {
    if (!locks) throw new Error("artwork-entity-lock-unavailable");
    return locks.request(key, { mode: "exclusive" }, action);
  };
}
