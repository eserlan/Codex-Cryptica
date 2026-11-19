/** Shared cross-tab exclusion for public artwork cache mutations. */
export function createArtworkCacheLock(
  locks: Pick<LockManager, "request"> | undefined,
) {
  return async function withLock<T>(action: () => Promise<T>): Promise<T> {
    if (!locks) throw new Error("artwork-cache-lock-unavailable");
    return locks.request(
      "codex-adventure-artwork-cache-v1",
      { mode: "exclusive" },
      action,
    );
  };
}
