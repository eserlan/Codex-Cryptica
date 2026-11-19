export interface VaultBatchContext {
  /** The active Vault ID captured when the batch started. */
  readonly vaultId: string | null;
  /** True when the current Vault still matches the captured Vault ID. */
  isVaultCurrent(): boolean;
  /** True when the optional AbortSignal has been aborted. */
  isAborted(): boolean;
  /** True when the Vault is still current and the batch has not been aborted. */
  isActive(): boolean;
}

export interface VaultScopedBatchOptions {
  getVaultId: () => string | null;
  signal?: AbortSignal;
  onProgress?: (completed: number, total: number) => void;
}

export interface VaultScopedBatchResult {
  /** Number of items whose handler ran to completion without interruption. */
  processed: number;
  /** Total items passed to the batch. */
  total: number;
  /** True if the active Vault changed before or during the batch. */
  interrupted: boolean;
  /** True if the AbortSignal fired before or during the batch. */
  cancelled: boolean;
}

/**
 * Runs an async per-item handler while guarding against Vault switches and
 * caller cancellation at every item boundary. Handlers with multiple awaits
 * should also check `ctx.isVaultCurrent()` after each await before committing
 * follow-up writes or reporting success.
 */
export async function runVaultScopedBatch<TItem>(
  items: readonly TItem[],
  handler: (item: TItem, ctx: VaultBatchContext) => Promise<void>,
  options: VaultScopedBatchOptions,
): Promise<VaultScopedBatchResult> {
  const capturedVaultId = options.getVaultId();
  const isVaultCurrent = () => options.getVaultId() === capturedVaultId;
  const isAborted = () => Boolean(options.signal?.aborted);
  const ctx: VaultBatchContext = {
    vaultId: capturedVaultId,
    isVaultCurrent,
    isAborted,
    isActive: () => isVaultCurrent() && !isAborted(),
  };

  let processed = 0;
  let interrupted = false;
  let cancelled = false;

  for (const item of items) {
    if (isAborted()) {
      cancelled = true;
      break;
    }
    if (!isVaultCurrent()) {
      interrupted = true;
      break;
    }
    await handler(item, ctx);
    if (!isVaultCurrent()) {
      interrupted = true;
      break;
    }
    processed += 1;
    options.onProgress?.(processed, items.length);
    if (isAborted()) {
      cancelled = true;
      break;
    }
  }

  return {
    processed,
    total: items.length,
    interrupted,
    cancelled,
  };
}
