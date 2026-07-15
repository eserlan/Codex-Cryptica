import { getDB } from "../../utils/idb";
import type { LocalEntity } from "./types";
import { buildSearchKeywords } from "@codex/search-orchestrator";
import { cacheService } from "../../services/cache.svelte";
import type { SyncStore } from "./sync-store.svelte";
import type { AssetStore } from "./asset-store.svelte";
import { vaultEventBus } from "./events.svelte";

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
  /** Rebuild the reactive entity indexes (allEntities, inbound connections). */
  rebuildEntityIndexes: () => void;
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
      await db.put("settings", handle, `folderHandle_${vaultId}`);
      await this.deps.vaultRegistry.setActiveVault(vaultId);
      this.deps.clearStorageCache();

      // Force a reload of files which will now find the folder handle we just persisted
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
      let count = 0;
      // ⚡ Bolt Optimization: Replace Object.values() with an imperative loop over keys to avoid large array allocation
      for (const id in entities) {
        const entity = entities[id];
        await this.deps.repository.saveToDisk(handle, vaultId, entity, false);
        await this.deps.ensureAssetPersisted(entity.id, handle);
        count++;
      }

      await this.deps.vaultRegistry.updateEntityCount(vaultId, count);

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

      const nextVault = this.deps.vaultRegistry.availableVaults.find(
        (v: any) => v.id !== id,
      );
      if (nextVault) {
        await this.switchVault(nextVault.id);
      } else {
        // No other vaults remain; clear active state.
        await this.deps.vaultRegistry.clearActiveVault();
        this.deps.setInitialized(false);
        this.deps.syncStore.setStatus("idle");
      }
    }

    await this.deps.vaultRegistry.deleteVault(id);
    await cacheService.clearVault(id);
    vaultEventBus.emit({ type: "VAULT_DELETED", vaultId: id });
  }

  async setupSync(handle: FileSystemDirectoryHandle) {
    const activeId = this.deps.activeVaultId();
    if (!activeId) return;
    try {
      const db = await getDB();
      await db.put("settings", handle, `folderHandle_${activeId}`);
    } catch {
      console.warn("[VaultStore] Could not persist folder handle");
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
    this.switchLock = this.switchLock
      .catch(() => {}) // Recover from any previous switch failure
      .then(async () => {
        if (this.deps.activeVaultId() === id) return;

        this.deps.syncStore.setStatus("loading");

        // Flush debounced saves and drain the queue before clearing state
        try {
          await Promise.race([
            this.deps.flushPendingSaves(),
            new Promise((_, reject) =>
              setTimeout(
                () =>
                  reject(
                    new Error("Save drain timed out or failed during switch"),
                  ),
                5000,
              ),
            ),
          ]);
        } catch (err: any) {
          console.warn(`[VaultStore] ${err.message || err}`);
        }

        // HARD CLEAR: Wipe all traces of the previous vault
        this.deps.repository.clear();
        this.deps.assetStore.clear();
        this.deps.mapRegistry.maps = {};
        this.deps.canvasRegistry.clear();
        this.deps.setSelectedEntityId(null);
        this.deps.syncStore.setHasConflictFiles(false);

        // Invalidate cache preloads to ensure no leakage from previous vault
        cacheService.invalidatePreload();

        await this.deps.vaultRegistry.setActiveVault(id);
        this.deps.clearStorageCache();

        // Load Oracle chat history for the new vault
        const { oracle } = await import("../oracle.svelte");
        await oracle.loadForVault(id);

        await this.deps.themeStore.loadForVault(id);
        await this.deps.loadFiles();
        this.deps.setInitialized(true);
        if (this.deps.syncStore.status === "loading") {
          this.deps.syncStore.setStatus("idle");
        }

        vaultEventBus.emit({ type: "VAULT_SWITCHED", vaultId: id });
      });

    return this.switchLock;
  }

  async loadDemoData(name: string, entities: Record<string, LocalEntity>) {
    this.deps.syncStore.setStatus("loading");
    try {
      await this.deps.ensureServicesInitialized();
      this.deps.setDemoVaultName(name);

      // Clear internal state
      this.deps.repository.clear();
      this.deps.assetStore.clear();

      // IMPORTANT: Clear the cache for the active vault (which might be "default")
      // to ensure demo data doesn't leak into it or vice versa.
      const activeId = this.deps.activeVaultId();
      if (activeId) {
        await cacheService.clearVault(activeId);
      }

      this.deps.repository.entities = entities;
      this.deps.setInitialized(true);

      // Rebuild the reactive entity indexes (allEntities, inbound connections)
      // directly — without this the graph stays empty even though the
      // repository holds the demo entities. We deliberately do NOT emit
      // CACHE_LOADED here: that event is consumed by the search pipeline as a
      // disk-cache restore, which would double-index the entities (alongside
      // the loop below) and could restore a stale index keyed on the active
      // vault id. Search indexing for the demo is handled by the loop below.
      this.deps.rebuildEntityIndexes();

      const services = this.deps.getServices();
      if (services?.search) {
        // ⚡ Bolt Optimization: Replace Object.values() with an imperative loop over keys to avoid large array allocation
        for (const id in entities) {
          const entity = entities[id];

          // Canonical keyword construction mirroring SearchService.mapToSearchEntry
          const keywords = buildSearchKeywords(entity as any);

          await services.search.index({
            id: entity.id,
            title: entity.title,
            keywords,
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
