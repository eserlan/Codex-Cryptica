import { fileIOAdapter } from "./adapters.svelte";
import type { VaultSyncContext } from "./sync-context";
import type { VaultSyncState } from "./sync-state.svelte";

/** Detects and cleans conflict copies without applying cancelled results. */
export class VaultSyncConflicts {
  constructor(
    private context: VaultSyncContext,
    private state: VaultSyncState,
    private reload: () => Promise<void>,
  ) {}

  async cleanup(signal?: AbortSignal) {
    const vaultId = this.context.deps.activeVaultId();
    if (!vaultId) return;
    const target = await this.context.resolveTarget();
    if (!target || this.context.isStale(vaultId, signal)) return;

    await target.coordinator.cleanupConflictFiles(
      vaultId,
      target.handle,
      (status) => {
        if (!signal?.aborted) this.state.currentStatus = status;
      },
      this.reload,
      signal,
    );
  }

  async scan(signal?: AbortSignal) {
    const handle = await this.context.deps.getActiveVaultHandle();
    if (!handle || signal?.aborted) return;
    const files = await fileIOAdapter.walkDirectory(handle);
    if (signal?.aborted) return;
    this.state.hasConflictFiles = files.some((file) =>
      file.path[file.path.length - 1].includes(".conflict-"),
    );
  }

  async check(signal?: AbortSignal) {
    try {
      await this.scan(signal);
    } catch {
      this.state.hasConflictFiles = false;
    }
  }
}
