// apps/web/src/lib/stores/vault.svelte.ts
import { getDB } from "../utils/idb";
import { getVaultDir, deleteOpfsEntry } from "../utils/opfs";
import { KeyedTaskQueue } from "../utils/queue";
import type { Entity, Map } from "schema";
import type { IStorageAdapter } from "../cloud-bridge/types";
import { debugStore } from "./debug.svelte";
import { uiStore } from "./ui.svelte";
import type { LocalEntity } from "./vault/types";
export type { LocalEntity };

import * as vaultIO from "./vault/io";
import * as vaultAssets from "./vault/assets";
import * as vaultMigration from "./vault/migration";
import * as vaultRelationships from "./vault/relationships";
import * as vaultEntities from "./vault/entities";
import { vaultRegistry } from "./vault-registry.svelte";
import { themeStore } from "./theme.svelte";
import { parseMarkdown } from "../utils/markdown";
import { SyncRegistry, LocalSyncService } from "@codex/sync-engine";

import type { SearchEntry } from "schema";

// Service Interfaces for Dependency Injection
export interface IVaultServices {
  search: {
    index: (data: SearchEntry) => Promise<void>;
    remove: (id: string) => Promise<void>;
    clear: () => Promise<void>;
  };
  ai: {
    clearStyleCache: () => void;
  };
}

class VaultStore {
  entities = $state<Record<string, LocalEntity>>({});
  maps = $state<Record<string, Map>>({});
  canvases = $state<Record<string, any>>({});
  status = $state<"idle" | "loading" | "saving" | "error">("idle");
  syncType = $state<"local" | "cloud" | null>(null);
  syncStats = $state({
    updated: 0,
    created: 0,
    deleted: 0,
    failed: 0,
    total: 0,
    progress: 0,
  });
  isInitialized = $state(false);
  errorMessage = $state<string | null>(null);
  selectedEntityId = $state<string | null>(null);
  migrationRequired = $state(false);
  demoVaultName = $state<string | null>(null);

  // Fog of War Settings
  defaultVisibility = $state<"visible" | "hidden">("visible");

  // State (Mirrored/Proxied from Registry or local)
  isOpfs = $state(true);
  isGuest = $state(false);
  storageAdapter: IStorageAdapter | null = null;

  // Real-time update hooks
  onEntityUpdate: ((entity: LocalEntity) => void) | null = null;
  onEntityDelete: ((id: string) => void) | null = null;
  onBatchUpdate:
    | ((updates: Record<string, Partial<LocalEntity>>) => void)
    | null = null;

  // Services (Injected)
  private services: IVaultServices | null = null;
  private syncService: LocalSyncService | null = null;
  private gdriveBackend: any | null = null;

  // Registry Accessors
  get activeVaultId() {
    return vaultRegistry.activeVaultId;
  }
  get vaultName() {
    return this.demoVaultName || vaultRegistry.vaultName;
  }

  get isCloudConnected() {
    return !!this.gdriveBackend?.isConnected;
  }
  get availableVaults() {
    return vaultRegistry.availableVaults;
  }

  // Derived adjacency map - automatically stays in sync with entities!
  inboundConnections = $derived.by(() => {
    return vaultRelationships.rebuildInboundMap(this.entities);
  });

  labelIndex = $derived.by(() => {
    const seen = new Set<string>();
    for (const entity of Object.values(this.entities)) {
      for (const label of entity.labels || []) {
        seen.add(label.trim().toLowerCase());
      }
    }
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  });

  get allEntities() {
    return Object.values(this.entities);
  }

  public async getActiveVaultHandle(): Promise<
    FileSystemDirectoryHandle | undefined
  > {
    if (!vaultRegistry.rootHandle || !this.activeVaultId) return undefined;
    return await getVaultDir(vaultRegistry.rootHandle, this.activeVaultId);
  }

  /**
   * Internal save queue for coordinating OPFS writes.
   * NOTE: This queue is public so that MapStore (see map.svelte.ts) can enqueue
   * map-related save operations to ensure data consistency.
   * External code should avoid manipulating it directly.
   */
  public saveQueue = new KeyedTaskQueue();

  get pendingSaveCount() {
    return this.saveQueue.totalPendingCount;
  }

  constructor() {
    console.log("[VaultStore] New Instance Created", Date.now());
  }

  async createVault(name: string): Promise<string> {
    const id = await vaultRegistry.createVault(name);
    await this.switchVault(id);
    return id;
  }

  async createVaultFromDrive(name: string, folderId: string): Promise<string> {
    const id = await vaultRegistry.createVaultFromDrive(name, folderId);
    await this.switchVault(id);
    return id;
  }

  async switchVault(id: string): Promise<void> {
    if (this.activeVaultId === id && this.isInitialized) return;

    await this.saveQueue.waitForAll();
    this.entities = {};
    this.maps = {};

    // Clear chat history in DB before switching
    const db = await getDB();
    try {
      const tx = db.transaction("chat_history", "readwrite");
      await tx.store.clear();
      await tx.done;
    } catch (e) {
      console.warn("[VaultStore] Failed to clear chat history", e);
    }

    this.status = "loading";
    this.errorMessage = null;

    // Load theme for the new vault as early as possible to avoid FOUC/flicker
    await themeStore.loadForVault(id);
    await vaultRegistry.setActiveVault(id);

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("vault-switched", { detail: { id } }),
      );
    }

    await this.loadFiles();
  }

  /**
   * Loads sample data into the vault for transient demo exploration.
   * Bypasses IndexedDB and OPFS.
   */
  async loadDemoData(data: { entities: Record<string, any> }, name?: string) {
    await this.saveQueue.waitForAll();
    this.selectedEntityId = null;

    const entities = data.entities as Record<string, LocalEntity>;

    this.entities = entities;
    this.demoVaultName = name || null;
    this.isInitialized = true;
    this.status = "idle";

    // Index everything for search
    if (this.services?.search) {
      await this.services.search.clear();
      for (const entity of Object.values(this.entities)) {
        await this.services.search.index({
          id: entity.id,
          title: entity.title,
          content: entity.content,
          type: entity.type,
          path: entity._path?.join("/") || `${entity.id}.md`,
          keywords: (entity.tags || []).join(" "),
          updatedAt: Date.now(),
        });
      }
    }
  }

  /**
   * Persists the current transient state to a new IndexedDB vault.
   */
  async persistToIndexedDB(vaultId: string) {
    this.status = "saving";
    try {
      // 1. Set as active vault in registry
      await vaultRegistry.setActiveVault(vaultId);

      // 2. Save all entities to OPFS
      for (const entity of Object.values(this.entities)) {
        await this.saveToDisk(entity, vaultId);
      }

      // 3. Clear transient flags and finish
      this.demoVaultName = null;
      this.status = "idle";
    } catch (err: any) {
      console.error("[VaultStore] Persistence failed:", err);
      this.status = "error";
      this.errorMessage = "Failed to persist demo data.";
      throw err;
    }
  }

  async init(injectedServices?: IVaultServices) {
    this.isInitialized = false;
    this.status = "loading";
    debugStore.log(`Vault initializing (v${__APP_VERSION__}) [OPFS Mode]...`);

    // Handle Dependency Injection
    if (injectedServices) {
      this.services = injectedServices;
    } else if (typeof window !== "undefined") {
      // Lazy load real services if not injected (browser runtime)
      const { searchService } = await import("../services/search");
      const { aiService } = await import("../services/ai");
      this.services = {
        search: searchService,
        ai: aiService,
      };
    }

    try {
      await vaultRegistry.init();
      const opfsRoot = vaultRegistry.rootHandle;
      if (!opfsRoot) throw new Error("OPFS Root failed to initialize");

      if (uiStore.isDemoMode) {
        debugStore.log(
          "Vault init: Demo mode active, skipping further initialization.",
        );
        this.isInitialized = true;
        this.status = "idle";
        return;
      }

      const db = await getDB();
      this.syncService = new LocalSyncService(new SyncRegistry(db));

      const savedVisibility = await db.get("settings", "defaultVisibility");
      if (savedVisibility) {
        this.defaultVisibility = savedVisibility;
      }

      const migration = await vaultMigration.checkForMigration();
      if (migration.required && migration.handle) {
        this.migrationRequired = true;
        await vaultMigration.runMigration(
          opfsRoot,
          migration.handle,
          true,
          () => this.loadFiles(),
          (status, err) => {
            this.status = status;
            if (err) this.errorMessage = err;
          },
        );
      }

      await vaultMigration.migrateStructure(opfsRoot);

      // If we have an active vault from registry, load it
      if (this.activeVaultId) {
        await themeStore.loadForVault(this.activeVaultId);

        await this.loadFiles();
      }
    } catch (err) {
      console.error("[VaultStore] Init failed", err);
      debugStore.error("Vault Store initialization failed", err);
      this.status = "error";
      this.errorMessage =
        "Failed to initialize storage. Please check browser support for OPFS.";
    } finally {
      this.isInitialized = true;
      if (this.status !== "error") this.status = "idle";
    }
  }

  async syncToLocal() {
    if (!this.syncService || !this.activeVaultId) return;

    try {
      // Ensure all pending application saves are flushed before starting sync
      // We use a timeout to prevent hanging forever if a task is stuck
      await Promise.race([
        this.saveQueue.waitForAll(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Save queue timeout")), 10000),
        ),
      ]);
    } catch (err) {
      console.warn("Continuing sync despite save queue issues:", err);
    }

    const opfsHandle = await this.getActiveVaultHandle();
    if (!opfsHandle) return;

    const db = await getDB();
    let localHandle = await db.get(
      "settings",
      `syncHandle_${this.activeVaultId}`,
    );

    try {
      if (localHandle) {
        const permission = await localHandle.queryPermission({
          mode: "readwrite",
        });
        if (permission !== "granted") {
          const newPermission = await localHandle.requestPermission({
            mode: "readwrite",
          });
          if (newPermission !== "granted") localHandle = null;
        }
      }

      if (!localHandle) {
        localHandle = await window.showDirectoryPicker({ mode: "readwrite" });
        await db.put(
          "settings",
          localHandle,
          `syncHandle_${this.activeVaultId}`,
        );
      }

      this.status = "saving";
      this.syncType = "local";
      console.log(
        "[VaultStore] Starting local sync with handle:",
        localHandle.name,
      );

      // Optimization: Create a lookup map once before the sync starts
      const pathToEntity = new Map(
        Object.values(this.entities).map((e) => [e._path?.join("/"), e]),
      );

      const result = await this.syncService.sync(
        this.activeVaultId,
        localHandle,
        opfsHandle,
        async (path, meta) => {
          if (!path.endsWith(".md") && !path.endsWith(".markdown")) return true;

          // Use the optimized lookup map
          const existing = pathToEntity.get(path);
          if (existing) return true;

          // Safety: If the file is unusually large (> 1MB), skip deep validation to avoid OOM
          if (meta.size > 1024 * 1024) return true;

          try {
            if (!(meta.handle instanceof FileSystemFileHandle)) return true;
            const file = await meta.handle.getFile();
            const text = await file.text();
            const { metadata } = parseMarkdown(text);
            return !!(metadata.id || metadata.title);
          } catch {
            return false;
          }
        },
      );

      if (result.error) {
        this.status = "error";
        this.errorMessage = result.error;
      } else {
        this.status = "idle";
        this.syncType = null;
        uiStore.notify(
          `Sync complete: ${result.created.length} created, ${result.updated.length} updated, ${result.deleted.length} deleted.`,
          "success",
        );
      }
    } catch (e: any) {
      if (e.name === "AbortError") {
        this.status = "idle";
        this.syncType = null;
        return;
      }
      this.status = "error";
      this.syncType = null;
      this.errorMessage = e.message;
      console.error("Sync failed", e);
    }
  }

  async syncToCloud(user: { email: string; name: string }) {
    if (!this.activeVaultId) return;

    // Ensure all pending application saves are flushed before starting sync
    await this.saveQueue.waitForAll();

    this.status = "saving";
    this.syncType = "cloud";
    try {
      console.log(
        `[Sync] Starting cloud sync for user: ${user.email} (${user.name})`,
      );
      const opfsHandle = await this.getActiveVaultHandle();
      if (!opfsHandle) throw new Error("OPFS handle missing");

      const { CloudSyncService, GDriveBackend, SyncRegistry } =
        await import("@codex/sync-engine");
      const db = await getDB();

      // Reuse or initialize the GDrive backend
      if (!this.gdriveBackend) {
        this.gdriveBackend = new GDriveBackend(
          import.meta.env.VITE_GOOGLE_CLIENT_ID,
        );
      }
      await this.gdriveBackend.connect();

      this.syncStats = {
        updated: 0,
        created: 0,
        deleted: 0,
        failed: 0,
        total: 0,
        progress: 0,
      };

      const cloudSync = new CloudSyncService(
        new SyncRegistry(db),
        this.gdriveBackend,
      );
      const result = await cloudSync.sync(
        this.activeVaultId,
        opfsHandle,
        undefined,
        (stats) => {
          this.syncStats = {
            ...stats,
            progress:
              stats.total > 0
                ? Math.round(
                    ((stats.updated +
                      stats.created +
                      stats.deleted +
                      stats.failed) /
                      stats.total) *
                      100,
                  )
                : 0,
          };
        },
      );

      // Refresh folder name and metadata
      let folderName = "cloud";
      const currentMeta = await db.get(
        "cloud_sync_metadata",
        this.activeVaultId,
      );
      if (currentMeta) {
        try {
          const folderMeta = await this.gdriveBackend.getFolderMetadata(
            currentMeta.gdriveFolderId,
          );
          folderName = folderMeta.name;
          await db.put("cloud_sync_metadata", {
            ...currentMeta,
            gdriveFolderName: folderMeta.name,
            lastSyncTime: Date.now(),
          });
        } catch (err) {
          console.warn("Failed to update sync metadata time", err);
        }
      }

      this.status = "idle";
      this.syncType = null;
      if (result.failed.length > 0) {
        uiStore.notify(
          `Sync complete with ${result.failed.length} errors.`,
          "error",
        );
      } else {
        uiStore.notify(
          `Sync complete: ${result.updated.length + result.created.length} mirrored to ${folderName}.`,
          "success",
        );
      }
    } catch (err: any) {
      console.error("Cloud sync failed", err);
      this.status = "error";
      this.syncType = null;
      this.errorMessage = err.message;

      if (err.message === "AUTH_REQUIRED") {
        uiStore.notify(
          "Authentication expired. Please reconnect GDrive.",
          "error",
        );
      } else {
        uiStore.notify("Cloud sync failed.", "error");
      }
    }
  }

  async disconnectCloud() {
    if (this.gdriveBackend) {
      await this.gdriveBackend.disconnect();
    }
    if (this.activeVaultId) {
      const db = await getDB();
      await db.delete("cloud_sync_metadata", this.activeVaultId);
    }
    uiStore.notify("Cloud storage disconnected.", "info");
  }

  async getCloudMetadata() {
    if (!this.activeVaultId) return null;
    const db = await getDB();
    const meta = await db.get("cloud_sync_metadata", this.activeVaultId);

    // Proactive name refresh if missing but backend is active
    if (meta && !meta.gdriveFolderName && this.gdriveBackend?.isConnected) {
      try {
        const folderMeta = await this.gdriveBackend.getFolderMetadata(
          meta.gdriveFolderId,
        );
        meta.gdriveFolderName = folderMeta.name;
        await db.put("cloud_sync_metadata", meta);
      } catch (err) {
        console.warn("Failed to proactively fetch folder name", err);
      }
    }

    return meta;
  }

  async updateCloudFolder(folderId: string) {
    if (!this.activeVaultId) return;
    const db = await getDB();
    const existing = await db.get("cloud_sync_metadata", this.activeVaultId);

    let folderName = existing?.gdriveFolderName;
    if (this.gdriveBackend) {
      try {
        const meta = await this.gdriveBackend.getFolderMetadata(folderId);
        folderName = meta.name;
      } catch (err) {
        console.warn("Failed to fetch folder name, using existing", err);
      }
    }

    await db.put("cloud_sync_metadata", {
      vaultId: this.activeVaultId,
      gdriveFolderId: folderId,
      gdriveFolderName: folderName,
      lastSyncToken: existing?.lastSyncToken || null,
      lastSyncTime: existing?.lastSyncTime || Date.now(),
    });
    if (this.gdriveBackend) {
      this.gdriveBackend.setVaultFolderId(folderId);
    }
  }

  async importFromFolder(handle?: FileSystemDirectoryHandle): Promise<boolean> {
    const vaultDir = await this.getActiveVaultHandle();
    if (!this.activeVaultId || !vaultDir) {
      this.status = "error";
      this.errorMessage = "Vault not open";
      return false;
    }

    this.status = "loading";
    const result = await vaultIO.importFromFolder(
      this.activeVaultId,
      vaultDir,
      handle,
    );

    if (result.success) {
      await this.loadFiles();
      const db = await getDB();
      const entityCount = Object.keys(this.entities).length;
      const record = await db.get("vaults", this.activeVaultId);
      if (record) {
        record.entityCount = entityCount;
        await db.put("vaults", record);
        await vaultRegistry.listVaults();
      }
      this.status = "idle";
      return true;
    } else {
      if (result.error === "User cancelled") {
        this.status = "idle";
      } else {
        this.status = "error";
        this.errorMessage = result.error || "Import failed";
      }
      return false;
    }
  }

  async loadFiles() {
    const vaultDir = await this.getActiveVaultHandle();
    if (!this.activeVaultId || !vaultDir) return;

    this.status = "loading";
    try {
      if (this.services) {
        this.services.ai.clearStyleCache();
        await this.services.search.clear();
      }

      const { entities } = await vaultIO.loadVaultFiles(
        this.activeVaultId,
        vaultDir,
      );
      this.entities = entities;
      this.maps = await vaultIO.loadMapsFromDisk(vaultDir);
      this.canvases = await vaultIO.loadCanvasesFromDisk(vaultDir);

      // Repopulate search index
      if (this.services) {
        const indexPromises = Object.values(entities).map((entity) => {
          const path = entity._path?.join("/") || `${entity.id}.md`;
          const keywords = [
            ...(entity.tags || []),
            entity.lore || "",
            ...Object.values(entity.metadata || {}).flat(),
          ].join(" ");
          return this.services!.search.index({
            id: entity.id,
            title: entity.title,
            content: entity.content,
            type: entity.type,
            path,
            keywords,
            updatedAt: Date.now(),
          });
        });
        await Promise.all(indexPromises);
      }

      this.status = "idle";
    } catch (err) {
      console.error("[VaultStore] loadFiles failed", err);
      this.status = "error";
      this.errorMessage = "Failed to load vault files";
    } finally {
      this.isInitialized = true;
    }
  }

  async saveToDisk(
    entity: LocalEntity | Entity,
    targetVaultId?: string | null,
  ) {
    const vid = targetVaultId || this.activeVaultId;
    if (!vid || !vaultRegistry.rootHandle) return;
    const vaultDir = await getVaultDir(vaultRegistry.rootHandle, vid);

    try {
      await vaultIO.saveEntityToDisk(
        vaultDir,
        vid,
        entity as LocalEntity,
        this.isGuest,
      );
      if (this.services) {
        const path =
          (entity as LocalEntity)._path?.join("/") || `${entity.id}.md`;
        const keywords = [
          ...(entity.tags || []),
          entity.lore || "",
          ...Object.values(entity.metadata || {}).flat(),
        ].join(" ");
        await this.services.search.index({
          id: entity.id,
          title: entity.title,
          content: entity.content,
          type: entity.type,
          path,
          keywords,
          updatedAt: Date.now(),
        });
      }
    } catch (err: any) {
      this.status = "error";
      this.errorMessage = `Failed to save ${entity.title}: ${err.message}`;
      debugStore.error(`Save to OPFS failed for ${entity.id}`, err);
    }
  }

  async saveMaps() {
    const vaultDir = await this.getActiveVaultHandle();
    if (!vaultDir) return;

    this.status = "saving";
    return this.saveQueue.enqueue("maps-metadata", async () => {
      try {
        await vaultIO.saveMapsToDisk(vaultDir, this.maps);
        this.status = "idle";
      } catch (err) {
        console.error("[VaultStore] Failed to save maps", err);
        this.status = "error";
        uiStore.notify(
          "Failed to save map data. Please check your storage quota.",
          "error",
        );
      }
    });
  }

  async saveCanvases() {
    const vaultDir = await this.getActiveVaultHandle();
    if (!vaultDir) return;

    this.status = "saving";
    return this.saveQueue.enqueue("canvases-metadata", async () => {
      try {
        await vaultIO.saveCanvasesToDisk(vaultDir, this.canvases);
        this.status = "idle";
      } catch (err) {
        console.error("[VaultStore] Failed to save canvases", err);
        this.status = "error";
        uiStore.notify(
          "Failed to save canvas data. Please check your storage quota.",
          "error",
        );
      }
    });
  }

  async deleteMap(id: string): Promise<void> {
    if (this.isGuest) throw new Error("Cannot delete maps in Guest Mode");
    if (
      uiStore.isDemoMode &&
      !(typeof window !== "undefined" && (window as any).__E2E__)
    ) {
      uiStore.notify("Deletion is disabled in Demo Mode.", "info");
      return;
    }
    const vaultDir = await this.getActiveVaultHandle();
    if (!vaultDir) return;

    const map = this.maps[id];
    if (!map) return;

    // Remove from in-memory state (reassign to trigger reactivity)
    const newMaps = { ...this.maps };
    delete newMaps[id];
    this.maps = newMaps;

    // Async OPFS cleanup
    return this.saveQueue.enqueue(`delete-map-${id}`, async () => {
      try {
        if (map.assetPath) {
          const pathSegments = map.assetPath.split("/");
          await deleteOpfsEntry(vaultDir, pathSegments).catch((e) => {
            if (e.name !== "NotFoundError") throw e;
          });
        }

        if (map.fogOfWar?.maskPath) {
          const maskSegments = map.fogOfWar.maskPath.split("/");
          await deleteOpfsEntry(vaultDir, maskSegments).catch((e) => {
            if (e.name !== "NotFoundError") throw e;
          });
        }

        await vaultIO.saveMapsToDisk(vaultDir, this.maps);
      } catch (err: any) {
        console.error("[VaultStore] Failed to delete map files", err);
        this.status = "error";
        uiStore.notify(`Failed to fully delete map: ${err.message}`, "error");
      }
    });
  }

  scheduleSave(entity: LocalEntity | Entity): Promise<void> {
    if (this.onEntityUpdate) this.onEntityUpdate(entity as LocalEntity);

    if (uiStore.isDemoMode) {
      // In Demo Mode, we only update search index, no disk save
      if (this.services) {
        const path =
          (entity as LocalEntity)._path?.join("/") || `${entity.id}.md`;
        const keywords = [
          ...(entity.tags || []),
          entity.lore || "",
          ...Object.values(entity.metadata || {}).flat(),
        ].join(" ");
        void this.services.search
          .index({
            id: entity.id,
            title: entity.title,
            content: entity.content,
            type: entity.type,
            path,
            keywords,
            updatedAt: Date.now(),
          })
          .catch((err) => {
            debugStore.error(
              `Search index update failed in demo mode for ${entity.id}`,
              err,
            );
          });
      }
      return Promise.resolve();
    }

    this.status = "saving";
    const targetVaultId = this.activeVaultId;
    return this.saveQueue
      .enqueue(entity.id, async () => {
        await this.saveToDisk(entity, targetVaultId);
        this.status = "idle";
      })
      .catch((err) => {
        console.error("Save failed for", entity.title, err);
        this.status = "error";
      });
  }

  async createEntity(
    type: Entity["type"],
    title: string,
    initialData: Partial<Entity> = {},
  ): Promise<string> {
    const newEntity = vaultEntities.createEntity(
      title,
      type,
      initialData,
      this.entities,
    );
    this.entities[newEntity.id] = newEntity;
    await this.scheduleSave(newEntity);
    return newEntity.id;
  }

  async updateEntity(
    id: string,
    updates: Partial<LocalEntity>,
  ): Promise<boolean> {
    const { entities, updated } = vaultEntities.updateEntity(
      this.entities,
      id,
      updates,
    );
    if (!updated) return false;

    this.entities = entities;

    const styleKeywords = [
      "art style",
      "visual aesthetic",
      "world guide",
      "style",
    ];
    if (
      styleKeywords.some(
        (kw) =>
          updated.title.toLowerCase().includes(kw) ||
          (updates.title && updates.title.toLowerCase().includes(kw)),
      )
    ) {
      if (this.services) this.services.ai.clearStyleCache();
    }

    await this.scheduleSave(updated);
    return true;
  }

  batchUpdateEntities(updates: Record<string, Partial<LocalEntity>>): boolean {
    let hasChanges = false;
    const currentEntities = this.entities; // Ref for read
    const newEntities = { ...currentEntities }; // Shallow copy for potential write

    const appliedUpdates: Record<string, Partial<LocalEntity>> = {};

    for (const [id, patch] of Object.entries(updates)) {
      if (!currentEntities[id]) continue;

      const current = currentEntities[id];

      // Shallow equality check: only compare fields present in the patch
      let entityHasChanges = false;
      for (const [key, value] of Object.entries(patch)) {
        const currentValue = (current as any)[key];
        if (key === "metadata" && typeof value === "object" && value !== null) {
          // Simple nested check for metadata (like coordinates) to avoid redundant layout syncs
          if (JSON.stringify(currentValue) !== JSON.stringify(value)) {
            entityHasChanges = true;
            break;
          }
        } else if (currentValue !== value) {
          entityHasChanges = true;
          break;
        }
      }

      if (!entityHasChanges) {
        continue;
      }

      const merged = { ...current, ...patch, updatedAt: Date.now() };

      newEntities[id] = merged;
      appliedUpdates[id] = patch; // Store what actually changed
      hasChanges = true;
      this.scheduleSave(merged);
    }

    if (hasChanges) {
      this.entities = newEntities;
      if (this.onBatchUpdate) {
        this.onBatchUpdate(appliedUpdates);
      }
      return true;
    }
    return false;
  }

  async deleteEntity(id: string): Promise<void> {
    if (this.isGuest) throw new Error("Cannot delete entities in Guest Mode");
    if (uiStore.isDemoMode) {
      uiStore.notify("Deletion is disabled in Demo Mode.", "info");
      return;
    }
    const vaultDir = await this.getActiveVaultHandle();
    if (!vaultDir) return;

    const { entities, deletedEntity, modifiedIds } =
      await vaultEntities.deleteEntity(vaultDir, this.entities, id);
    if (deletedEntity) {
      this.entities = entities;
      if (this.onEntityDelete) this.onEntityDelete(id);
      modifiedIds.forEach((mId) => {
        const entity = this.entities[mId];
        if (entity) {
          this.scheduleSave(entity);
          if (this.onEntityUpdate) this.onEntityUpdate(entity);
        }
      });
      if (this.services) await this.services.search.remove(id);
    }
  }

  async addLabel(id: string, label: string): Promise<boolean> {
    const { entities, updated } = vaultEntities.addLabel(
      this.entities,
      id,
      label,
    );
    if (updated) {
      this.entities = entities;
      await this.scheduleSave(updated);
      return true;
    }
    return false;
  }

  async removeLabel(id: string, label: string): Promise<boolean> {
    const { entities, updated } = vaultEntities.removeLabel(
      this.entities,
      id,
      label,
    );
    if (updated) {
      this.entities = entities;
      await this.scheduleSave(updated);
      return true;
    }
    return false;
  }

  async addConnection(
    sourceId: string,
    targetId: string,
    type: string,
    label?: string,
  ): Promise<boolean> {
    const { entities, updatedSource } = vaultEntities.addConnection(
      this.entities,
      sourceId,
      targetId,
      type,
      label,
    );
    if (updatedSource) {
      this.entities = entities;
      await this.scheduleSave(updatedSource);
      return true;
    }
    return false;
  }

  async updateConnection(
    sourceId: string,
    targetId: string,
    oldType: string,
    newType: string,
    newLabel?: string,
  ): Promise<boolean> {
    const { entities, updatedSource } = vaultEntities.updateConnection(
      this.entities,
      sourceId,
      targetId,
      oldType,
      newType,
      newLabel,
    );
    if (updatedSource) {
      this.entities = entities;
      await this.scheduleSave(updatedSource);
      return true;
    }
    return false;
  }

  async removeConnection(
    sourceId: string,
    targetId: string,
    type: string,
  ): Promise<boolean> {
    const { entities, updatedSource } = vaultEntities.removeConnection(
      this.entities,
      sourceId,
      targetId,
      type,
    );
    if (updatedSource) {
      this.entities = entities;
      await this.scheduleSave(updatedSource);
      return true;
    }
    return false;
  }

  async saveImageToVault(
    blob: Blob,
    entityId: string,
    originalName?: string,
  ): Promise<string> {
    if (this.isGuest) throw new Error("Cannot save images in Guest Mode");
    const vaultDir = await this.getActiveVaultHandle();
    if (!vaultDir) throw new Error("Vault not open");

    const entity = this.entities[entityId];
    if (!entity) throw new Error(`Entity ${entityId} not found`);

    const { image, thumbnail } = await vaultAssets.saveImageToVault(
      vaultDir,
      blob,
      entityId,
      originalName,
    );
    await this.updateEntity(entityId, { image, thumbnail });
    return image;
  }

  async batchCreateEntities(
    batch: {
      type: Entity["type"];
      title: string;
      initialData?: Partial<Entity>;
    }[],
  ): Promise<string[]> {
    const createdIds: string[] = [];
    for (const item of batch) {
      try {
        const id = await this.createEntity(
          item.type,
          item.title,
          item.initialData,
        );
        createdIds.push(id);
      } catch (err) {
        console.warn(`Batch item failed: ${item.title}`, err);
      }
    }
    return createdIds;
  }

  async resolveImageUrl(path: string): Promise<string> {
    if (
      path.startsWith("/") ||
      path.startsWith("http://") ||
      path.startsWith("https://") ||
      path.startsWith("blob:") ||
      path.startsWith("data:")
    ) {
      return path;
    }

    const vaultDir = await this.getActiveVaultHandle();

    if (this.isGuest) {
      // Lazy import to avoid circular dependency since guest-service imports vault types or vault?
      // Actually guest-service likely imports vault, so circular is real.
      const { p2pGuestService } =
        await import("$lib/cloud-bridge/p2p/guest-service");
      return await vaultAssets.resolveImageUrl(vaultDir, path, (p) =>
        p2pGuestService.getFile(p),
      );
    }

    return await vaultAssets.resolveImageUrl(vaultDir, path);
  }

  async setDefaultVisibility(visibility: "visible" | "hidden") {
    this.defaultVisibility = visibility;
    const db = await getDB();
    await db.put("settings", visibility, "defaultVisibility");
  }
}

const VAULT_KEY = "__codex_vault_instance__";

function getVaultSingleton(): VaultStore {
  const globalObj = globalThis as unknown as Record<string, VaultStore>;
  if (!globalObj[VAULT_KEY]) {
    globalObj[VAULT_KEY] = new VaultStore();
  }
  return globalObj[VAULT_KEY];
}

export const vault: VaultStore = getVaultSingleton();
