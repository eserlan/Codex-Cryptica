import { getDB } from "../../utils/idb";
import { debugStore } from "../debug.svelte";

export interface StorageDependencies {
  getRootHandle: () => FileSystemDirectoryHandle | undefined;
}

export class VaultStorageManager {
  private _vaultHandle: FileSystemDirectoryHandle | undefined = undefined;

  constructor(private deps: StorageDependencies) {}

  async getActiveVaultHandle(
    activeVaultId: string | null,
  ): Promise<FileSystemDirectoryHandle | undefined> {
    const rootHandle = this.deps.getRootHandle();
    if (!activeVaultId || !rootHandle) return undefined;
    if (this._vaultHandle) return this._vaultHandle;

    try {
      const vaultsDir = await rootHandle.getDirectoryHandle("vaults", {
        create: true,
      });
      this._vaultHandle = await vaultsDir.getDirectoryHandle(activeVaultId, {
        create: true,
      });
      return this._vaultHandle;
    } catch (err) {
      debugStore.warn("[VaultStorage] Failed to get active vault handle", err);
      return undefined;
    }
  }

  async getActiveSyncHandle(
    activeVaultId: string | null,
  ): Promise<FileSystemDirectoryHandle | undefined> {
    if (!activeVaultId) return undefined;
    try {
      const db = await getDB();
      const handle = await db.get("settings", `syncHandle_${activeVaultId}`);
      return handle as FileSystemDirectoryHandle | undefined;
    } catch {
      return undefined;
    }
  }

  async getSpecificVaultHandle(
    vaultId: string,
  ): Promise<FileSystemDirectoryHandle | undefined> {
    const rootHandle = this.deps.getRootHandle();
    if (!vaultId || !rootHandle) return undefined;

    try {
      const vaultsDir = await rootHandle.getDirectoryHandle("vaults", {
        create: true,
      });
      return await vaultsDir.getDirectoryHandle(vaultId, {
        create: true,
      });
    } catch (err) {
      debugStore.warn(
        `[VaultStorage] Failed to get handle for vault: ${vaultId}`,
        err,
      );
      return undefined;
    }
  }

  clearCache() {
    this._vaultHandle = undefined;
  }
}
