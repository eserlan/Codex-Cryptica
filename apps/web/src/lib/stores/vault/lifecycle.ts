import { getDB } from "../../utils/idb";
import type { LocalEntity } from "./types";
import { cacheService } from "../../services/cache.svelte";
import type { SyncStore } from "./sync-store.svelte";
import type { AssetStore } from "./asset-store.svelte";
import { vaultEventBus } from "./events";

export interface VaultLifecycleDependencies {
  syncStore: SyncStore;
  assetStore: AssetStore;
  repository: any;
  activeVaultId: () => string | null;
  getActiveVaultHandle: () => Promise<FileSystemDirectoryHandle | undefined>;
  loadFiles: (skipSyncIfWarm?: boolean) => Promise<void>;
  flushPendingSaves: () => Promise<void>;
  ensureServicesInitialized: () => Promise<void>;
  clearStorageCache: () => void;
  getEntities: () => Record<string, LocalEntity>;
  setDemoVaultName: (name: string | null) => void;
  setInitialized: (val: boolean) => void;
  getServices: () => any;
  setSelectedEntityId: (id: string | null) => void;
  vaultRegistry: any;
  themeStore: any;
  mapRegistry: any;
  canvasRegistry: any;
  ensureAssetPersisted: (
    path: string,
    handle: FileSystemDirectoryHandle,
  ) => Promise<void>;
}

export class VaultLifecycleManager {
  private switchLock: Promise<void> = Promise.resolve();

  constructor(private deps: VaultLifecycleDependencies) {}

  async importFromFolder(handle: FileSystemDirectoryHandle) {
    this.deps.syncStore.setStatus("loading");
    try {
      // Ensure vaultRegistry is initialized before creating a vault
      if (!this.deps.vaultRegistry.isInitialized) {
        await this.deps.vaultRegistry.init();
      }

      const db = await getDB();
      const vaultId = await this.deps.vaultRegistry.createVault(handle.name);
      await db.put("settings", handle, `syncHandle_${vaultId}`);
      await this.deps.vaultRegistry.setActiveVault(vaultId);
      this.deps.clearStorageCache();

      // Force a reload of files which will now find the sync handle we just put
      await this.deps.loadFiles(false);

      this.deps.syncStore.setStatus("idle");
      return vaultId;
    } catch (err: any) {
      console.error("[VaultStore] Import failed:", err);
      this.deps.syncStore.setStatus("error");
      this.deps.syncStore.setErrorMessage(
        err.message || "Failed to import vault.",
      );
      throw err;
    }
  }

  async persistToIndexedDB(vaultId: string) {
    this.deps.syncStore.setStatus("saving");
    try {
      const handle = await this.deps.getActiveVaultHandle();
      if (!handle) throw new Error("No vault handle available");

      const entities = this.deps.getEntities();
      for (const entity of Object.values(entities)) {
        await this.deps.repository.saveToDisk(handle, vaultId, entity, false);
        await this.deps.ensureAssetPersisted(entity.id, handle);
      }

      const db = await getDB();
      await db.put("settings", handle, `syncHandle_${vaultId}`);
      this.deps.syncStore.setStatus("idle");
    } catch (err: any) {
      console.error("[VaultStore] Persistence failed:", err);
      this.deps.syncStore.setStatus("error");
      this.deps.syncStore.setErrorMessage(
        err.message || "Failed to persist vault.",
      );
      throw err;
    }
  }

  async createVault(name: string) {
    const newId = await this.deps.vaultRegistry.createVault(name);
    await this.switchVault(newId);
    return newId;
  }

  async deleteVault(id: string) {
    // VaultRegistryStore.deleteVault throws if attempting to delete the active vault,
    // so we must switch away from it first if it's the one being deleted.
    if (this.deps.activeVaultId() === id) {
      this.deps.repository.clear();
      this.deps.assetStore.clear();
      this.deps.mapRegistry.maps = {};
      this.deps.canvasRegistry.clear();
      this.deps.setSelectedEntityId(null);

      const nextVault = this.deps.vaultRegistry.availableVaults[0];
      if (nextVault) {
        await this.switchVault(nextVault.id);
      } else {
        // No other vaults remain; clear active state.
        this.deps.setInitialized(false);
        this.deps.syncStore.setStatus("idle");
      }
    }

    await this.deps.vaultRegistry.deleteVault(id);
    await cacheService.clearVault(id);
  }

  async setupSync(handle: FileSystemDirectoryHandle) {
    const activeId = this.deps.activeVaultId();
    if (!activeId) return;
    try {
      const db = await getDB();
      await db.put("settings", handle, `syncHandle_${activeId}`);
    } catch {
      console.warn("[VaultStore] Could not persist sync handle");
    }
    return this.importFromFolder(handle);
  }

  async runMigration() {
    const activeId = this.deps.activeVaultId();
    if (!activeId) return;

    const { checkForMigration, runMigration } = await import("./migration");
    const migration = await checkForMigration();

    if (migration.required) {
      await runMigration(
        this.deps.vaultRegistry.rootHandle as FileSystemDirectoryHandle,
        migration.handle as FileSystemDirectoryHandle,
        true,
        async () => {
          if (this.deps.activeVaultId()) {
            await this.deps.loadFiles(false);
          }
        },
        (status, error) => {
          this.deps.syncStore.setStatus(status);
          if (error) this.deps.syncStore.setErrorMessage(error);
        },
      );
      return true;
    }
    return false;
  }

  async switchVault(id: string) {
    this.switchLock = this.switchLock.then(async () => {
      if (this.deps.activeVaultId() === id) return;

      // Flush debounced saves and drain the queue before clearing state
      await this.deps.flushPendingSaves();

      this.deps.repository.clear();
      this.deps.assetStore.clear();
      this.deps.mapRegistry.maps = {};
      this.deps.canvasRegistry.clear();
      this.deps.setSelectedEntityId(null);
      this.deps.syncStore.setHasConflictFiles(false);

      await this.deps.vaultRegistry.setActiveVault(id);
      this.deps.clearStorageCache();
      await this.deps.themeStore.loadForVault(id);
      await this.deps.loadFiles(true);
      this.deps.setInitialized(true);
      this.deps.syncStore.setStatus("idle");

      vaultEventBus.emit({ type: "VAULT_SWITCHED", vaultId: id });
      // TODO: migrate remaining window listeners to vaultEventBus and remove this
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("vault-switched", { detail: { id } }),
        );
      }
    });

    return this.switchLock;
  }

  async loadDemoData(name: string, entities: Record<string, LocalEntity>) {
    this.deps.syncStore.setStatus("loading");
    try {
      await this.deps.ensureServicesInitialized();
      this.deps.setDemoVaultName(name);
      this.deps.repository.entities = entities;
      this.deps.setInitialized(true);

      const services = this.deps.getServices();
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

      this.deps.syncStore.setStatus("idle");
    } catch (err: any) {
      console.error("[VaultStore] Persistence failed:", err);
      this.deps.syncStore.setStatus("error");
      this.deps.syncStore.setErrorMessage("Failed to persist demo data.");
      throw err;
    }
  }
}
