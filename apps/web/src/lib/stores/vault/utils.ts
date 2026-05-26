/**
 * Creates a stale-operation guard for vault-scoped async flows.
 *
 * Captures the active vault ID at call time and returns a predicate that
 * returns `true` when the operation should be abandoned — either because
 * the active vault has changed since the operation started, or because an
 * AbortSignal has been triggered.
 *
 * @example
 * ```ts
 * const isStale = createStaleGuard(() => this.deps.activeVaultId());
 * await someAsyncWork();
 * if (isStale(signal)) return;
 * ```
 */
export function createStaleGuard(getActiveId: () => string | null) {
  const startId = getActiveId();
  return (signal?: AbortSignal): boolean =>
    getActiveId() !== startId || (signal?.aborted ?? false);
}
