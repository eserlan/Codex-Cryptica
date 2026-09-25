import { getDB } from "../../utils/idb";
import { debugStore } from "../debug.svelte";

export interface StorageDependencies {
  getRootHandle: () => FileSystemDirectoryHandle | undefined;
}

export class VaultStorageManager {
  private _vaultHandle: FileSystemDirectoryHandle | undefined = undefined;
  /**
   * The folder-handle read in flight. Resolving a vault's images asks for the
   * handle once per image, concurrently — hundreds of identical IndexedDB reads
   * on load — so concurrent callers share one. Nothing is kept once it settles,
   * so a folder the user has just picked is read fresh.
   */
  private folderHandleRead: {
    vaultId: string;
    handle: Promise<FileSystemDirectoryHandle | undefined>;
  } | null = null;

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

  getActiveFolderHandle(
    activeVaultId: string | null,
  ): Promise<FileSystemDirectoryHandle | undefined> {
    if (!activeVaultId) return Promise.resolve(undefined);
    if (this.folderHandleRead?.vaultId === activeVaultId) {
      return this.folderHandleRead.handle;
    }
    const read = {
      vaultId: activeVaultId,
      handle: this.readFolderHandle(activeVaultId).finally(() => {
        if (this.folderHandleRead === read) this.folderHandleRead = null;
      }),
    };
    this.folderHandleRead = read;
    return read.handle;
  }

  private async readFolderHandle(
    activeVaultId: string,
  ): Promise<FileSystemDirectoryHandle | undefined> {
    try {
      const db = await getDB();
      let handle = await db.get("settings", `folderHandle_${activeVaultId}`);
      if (!handle) {
        // Migrate from old key name
        handle = await db.get("settings", `syncHandle_${activeVaultId}`);
        if (handle) {
          try {
            await db.put("settings", handle, `folderHandle_${activeVaultId}`);
            await db.delete("settings", `syncHandle_${activeVaultId}`);
          } catch (err) {
            debugStore.warn(
              "[VaultStorage] Failed to migrate folder handle from legacy key",
              err,
            );
          }
        }
      }
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
