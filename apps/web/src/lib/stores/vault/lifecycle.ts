import { getDB } from "../../utils/idb";
import type { LocalEntity } from "./types";

export class VaultLifecycleManager {
  private switchLock: Promise<void> = Promise.resolve();

  constructor(
    private setStatus: (
      status: "idle" | "loading" | "saving" | "error",
    ) => void,
    private setErrorMessage: (msg: string | null) => void,
    private getActiveVaultId: () => string | null,
    private getActiveVaultHandle: () => Promise<
      FileSystemDirectoryHandle | undefined
    >,
    private repository: any,
    private assetManager: any,
    private loadFiles: (skipSyncIfWarm?: boolean) => Promise<void>,
    private getEntities: () => Record<string, LocalEntity>,
    private setDemoVaultName: (name: string | null) => void,
    private setInitialized: (val: boolean) => void,
    private getServices: () => any,
    private setHasConflictFiles: (val: boolean) => void,
    private setSelectedEntityId: (id: string | null) => void,
    private vaultRegistry: typeof import("../vault-registry.svelte").vaultRegistry,
    private themeStore: typeof import("../theme.svelte").themeStore,
    private mapRegistry: typeof import("../map-registry.svelte").mapRegistry,
    private canvasRegistry: typeof import("../canvas-registry.svelte").canvasRegistry,
    private ensureAssetPersisted: (
      path: string,
      handle: FileSystemDirectoryHandle,
    ) => Promise<void>,
  ) {}

  async importFromFolder(handle: FileSystemDirectoryHandle) {
    this.setStatus("loading");
    try {
      const db = await getDB();
      const vaultId = await this.vaultRegistry.createVault(handle.name);
      await db.put("settings", handle, `syncHandle_${vaultId}`);
      await this.vaultRegistry.setActiveVault(vaultId);

      // Force a reload of files which will now find the sync handle we just put
      await this.loadFiles(false);

      this.setStatus("idle");
      return vaultId;
    } catch (err: any) {
      console.error("[VaultStore] Import failed:", err);
      this.setStatus("error");
      this.setErrorMessage(err.message || "Failed to import vault.");
      throw err;
    }
  }

  async persistToIndexedDB(vaultId: string) {
    this.setStatus("saving");
    try {
      const handle = await this.getActiveVaultHandle();
      if (!handle) throw new Error("No vault handle available");

      const entities = this.getEntities();
      for (const entity of Object.values(entities)) {
        await this.repository.saveToDisk(handle, vaultId, entity, false);
        await this.ensureAssetPersisted(entity.id, handle);
      }

      const db = await getDB();
      await db.put("settings", handle, `syncHandle_${vaultId}`);
      this.setStatus("idle");
    } catch (err: any) {
      console.error("[VaultStore] Persistence failed:", err);
      this.setStatus("error");
      this.setErrorMessage(err.message || "Failed to persist vault.");
      throw err;
    }
  }

  async createVault(name: string) {
    const newId = await this.vaultRegistry.createVault(name);
    await this.switchVault(newId);
    return newId;
  }

  async deleteVault(id: string) {
    await this.vaultRegistry.deleteVault(id);
    if (this.getActiveVaultId() === id) {
      this.repository.clear();
      this.assetManager.clear();
      this.mapRegistry.maps = {};
      this.canvasRegistry.clear();
      const nextVault = this.vaultRegistry.availableVaults[0];
      if (nextVault) {
        await this.switchVault(nextVault.id);
      }
    }
  }

  async setupSync(handle: FileSystemDirectoryHandle) {
    const activeId = this.getActiveVaultId();
    if (!activeId) return;
    try {
      const db = await getDB();
      await db.put("settings", handle, `syncHandle_${activeId}`);
    } catch {
      console.warn("[VaultStore] Could not persist sync handle");
    }
    return this.importFromFolder(handle);
  }

  async switchVault(id: string) {
    this.switchLock = this.switchLock.then(async () => {
      if (this.getActiveVaultId() === id) return;

      // Ensure all pending changes are written to the current vault before switching
      await this.repository.waitForAllSaves();

      this.repository.clear();
      this.assetManager.clear();
      this.mapRegistry.maps = {};
      this.canvasRegistry.clear();
      this.setSelectedEntityId(null);
      this.setHasConflictFiles(false);
      this.setStatus("loading");

      await this.vaultRegistry.setActiveVault(id);
      await this.themeStore.loadForVault(id);
      await this.loadFiles(true);
      this.setInitialized(true);
      this.setStatus("idle");

      window.dispatchEvent(
        new CustomEvent("vault-switched", { detail: { id } }),
      );
    });

    return this.switchLock;
  }

  async loadDemoData(name: string, entities: Record<string, LocalEntity>) {
    this.setStatus("loading");
    try {
      this.setDemoVaultName(name);
      this.repository.entities = entities;
      this.setInitialized(true);

      const services = this.getServices();
      if (services?.search) {
        for (const entity of Object.values(entities)) {
          await services.search.index({
            id: entity.id,
            title: entity.title,
            content: entity.content,
            type: entity.type,
            path: (entity as LocalEntity)._path?.join("/") || `${entity.id}.md`,
            keywords: [
              ...(entity.tags || []),
              entity.lore || "",
              ...Object.values(entity.metadata || {}).flat(),
            ].join(" "),
            updatedAt: Date.now(),
          });
        }
      }

      this.setStatus("idle");
    } catch (err: any) {
      console.error("[VaultStore] Persistence failed:", err);
      this.setStatus("error");
      this.setErrorMessage("Failed to persist demo data.");
      throw err;
    }
  }
}
