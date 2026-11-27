import type { SyncStoreDependencies } from "./sync-types";

/** Shared access to the active vault, sync coordinator and save barrier. */
export class VaultSyncContext {
  constructor(readonly deps: SyncStoreDependencies) {}

  isStale(vaultId: string, signal?: AbortSignal): boolean {
    return this.deps.activeVaultId() !== vaultId || (signal?.aborted ?? false);
  }

  async waitForSaves(timeoutMs?: number): Promise<void> {
    if (this.deps.flushPendingSaves) {
      await this.deps.flushPendingSaves(timeoutMs);
    } else {
      await this.deps.repository.waitForAllSaves(timeoutMs);
    }
  }

  async resolveTarget() {
    const coordinator = await this.deps.getSyncCoordinator();
    if (!coordinator) return null;
    const handle = await this.deps.getActiveVaultHandle();
    return handle ? { coordinator, handle } : null;
  }
}
