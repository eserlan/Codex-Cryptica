import { uiStore } from "./ui.svelte";
import { base } from "$app/paths";
import { vaultRegistry } from "./vault-registry.svelte";
import { mapRegistry } from "./map-registry.svelte";
import { canvasRegistry } from "./canvas-registry.svelte";
import { themeStore } from "./theme.svelte";
import { debugStore } from "./debug.svelte";
import * as vaultMigration from "./vault/migration";
import type { LocalEntity, BatchCreateInput } from "./vault/types";
import type { Entity } from "schema";
import { getDB } from "../utils/idb";
import { VaultCrudManager } from "./vault/crud";
import { VaultLifecycleManager } from "./vault/lifecycle";
import * as vaultRelationships from "./vault/relationships";
import {
  VaultRepository,
  SyncCoordinator,
  AssetManager,
} from "@codex/vault-engine";
import {
  fileIOAdapter,
  syncIOAdapter,
  syncNotifier,
  assetIOAdapter,
  imageProcessor,
  createSyncEngine,
} from "./vault/adapters.svelte";
import { cacheService } from "../services/cache.svelte";
import { vaultEventBus } from "./vault/events";

export interface IVaultServices {
  search: {
    index(entry: any): Promise<void>;
    remove(id: string): Promise<void>;
    clear(): Promise<void>;
    search(query: string, options?: any): Promise<any[]>;
  };
  ai: {
    clearStyleCache(): void;
    expandQuery(apiKey: string, query: string, history: any[]): Promise<string>;
  };
}

export class VaultStore {
  // Reactive State
  isInitialized = $state(false);
  status = $state<"idle" | "loading" | "saving" | "error">("idle");
  errorMessage = $state<string | null>(null);
  syncType = $state<"local" | null>(null);
  syncStats = $state({
    updated: 0,
    created: 0,
    deleted: 0,
    failed: 0,
    total: 0,
    progress: 0,
  });
  hasConflictFiles = $state(false);
  selectedEntityId = $state<string | null>(null);
  demoVaultName = $state<string | null>(null);
  migrationRequired = $state(false);
  defaultVisibility = $state<"visible" | "hidden">("visible");

  inboundConnections = $derived.by(() =>
    vaultRelationships.rebuildInboundMap(this.entities),
  );

  labelIndex = $derived.by(() => {
    const labels = new Set<string>();
    for (const entity of this.allEntities) {
      if (entity.labels) {
        entity.labels.forEach((l) => labels.add(l));
      }
    }
    return Array.from(labels).sort();
  });

  // Callbacks
  onEntityUpdate?: (entity: LocalEntity) => void;
  onEntityDelete?: (entityId: string) => void;
  onBatchUpdate?: (updates: Record<string, Partial<LocalEntity>>) => void;

  // Services
  public services: IVaultServices | null = null;
  private crudManager: VaultCrudManager;
  private lifecycleManager: VaultLifecycleManager;
  private channel: BroadcastChannel | null = null;

  /**
   * Pre-loaded helper modules to avoid dynamic import overhead
   * during critical user interactions (like clicking a node).
   */
  private _helpers: {
    readFileAsText?: any;
    parseMarkdown?: any;
  } = {};

  /**
   * Tracks which entity IDs have their `content` and `lore` fields fully
   * populated in `this.entities`.  Entities loaded from the Dexie graph-entity
   * cache start with `content = ""` to keep the initial load lightweight;
   * calling `loadEntityContent(id)` fills in these fields on demand.
   */
  private _contentLoadedIds = new Set<string>();
  private _contentVerifiedIds = new Set<string>();

  // Delegated Getters
  get entities() {
    return this.repository.entities;
  }
  get allEntities() {
    return Object.values(this.repository.entities);
  }
  get maps() {
    return mapRegistry.maps;
  }
  get canvases() {
    return canvasRegistry.canvases;
  }
  get activeVaultId() {
    return vaultRegistry.activeVaultId;
  }
  get vaultName() {
    return vaultRegistry.vaultName;
  }
  get saveQueue() {
    return this.repository.saveQueue;
  }
  get isGuest() {
    return !!uiStore.isGuestMode;
  }

  constructor(
    public repository = new VaultRepository(fileIOAdapter),
    private assetManager = new AssetManager(assetIOAdapter, imageProcessor),
    public syncCoordinator: SyncCoordinator | null = null,
  ) {
    this.crudManager = new VaultCrudManager(
      () => this.entities,
      (entities) => {
        this.repository.entities = entities;
      },
      (entity) => this.scheduleSave(entity),
      () => this.getActiveVaultHandle(),
      () => this.activeVaultId,
      () => this.isGuest,
      () => this.services,
      (id) => this.onEntityDelete && this.onEntityDelete(id),
      (entity) => this.onEntityUpdate && this.onEntityUpdate(entity),
      (updates) => this.onBatchUpdate && this.onBatchUpdate(updates),
      (path) => this.assetManager.releaseImageUrl(path),
    );

    this.lifecycleManager = new VaultLifecycleManager(
      (s) => (this.status = s),
      (m) => (this.errorMessage = m),
      () => this.activeVaultId,
      () => this.getActiveVaultHandle(),
      this.repository,
      this.assetManager,
      (skipSync) => this.loadFiles(skipSync),
      () => this.entities,
      (n) => (this.demoVaultName = n),
      (v) => (this.isInitialized = v),
      () => this.services,
      (c) => (this.hasConflictFiles = c),
      (id) => (this.selectedEntityId = id),
      vaultRegistry,
      themeStore,
      mapRegistry,
      canvasRegistry,
      (path, handle) => this.ensureAssetPersisted(path, handle),
    );
    if (typeof window !== "undefined") {
      this.channel = new BroadcastChannel("codex-vault-sync");
      this.channel.onmessage = (event) => {
        if (
          event.data.type === "RELOAD_VAULT" &&
          event.data.vaultId === this.activeVaultId
        ) {
          this.loadFiles();
        }
      };

      mapRegistry.init(this.repository.saveQueue);
      canvasRegistry.init(this.repository.saveQueue);
    }
  }

  // --- External Sync Methods ---
  broadcastVaultUpdate() {
    if (this.channel && this.activeVaultId) {
      this.channel.postMessage({
        type: "RELOAD_VAULT",
        vaultId: this.activeVaultId,
      });
    }
  }

  async ensureServicesInitialized() {
    if (this.services && this.syncCoordinator) return;

    try {
      const searchModule = await import("../services/search");
      const aiModule = await import("../services/ai");

      if (searchModule && aiModule) {
        this.services = {
          search: searchModule.searchService,
          ai: {
            clearStyleCache: () =>
              aiModule.contextRetrievalService.clearStyleCache(),
            expandQuery: (k, q, h) =>
              aiModule.textGenerationService.expandQuery(k, q, h),
          },
        };
      }
    } catch (err) {
      debugStore.error("[VaultStore] Failed to lazy-load services", err);
    }

    if (!this.syncCoordinator && typeof window !== "undefined") {
      const engine = await createSyncEngine();
      this.syncCoordinator = new SyncCoordinator(
        syncIOAdapter,
        engine,
        syncNotifier,
      );
    }
  }

  async init(injectedServices?: IVaultServices) {
    this.isInitialized = false;
    this.status = "loading";
    this.assetManager.clear();
    this.repository.clear();

    if (injectedServices) {
      this.services = injectedServices;
    } else if (typeof window !== "undefined") {
      // Background: Pre-load modules needed for content loading to eliminate interaction latency
      import("../utils/opfs")
        .then((m) => (this._helpers.readFileAsText = m.readFileAsText))
        .catch(() => {});
      import("../utils/markdown")
        .then((m) => (this._helpers.parseMarkdown = m.parseMarkdown))
        .catch(() => {});

      await this.ensureServicesInitialized();
    }

    try {
      await vaultRegistry.init();
      const opfsRoot = vaultRegistry.rootHandle;
      if (!opfsRoot) throw new Error("OPFS Root failed to initialize");

      if (uiStore.isDemoMode) {
        this.isInitialized = true;
        this.status = "idle";
        return;
      }

      const db = await getDB();
      const savedVisibility = await db.get("settings", "defaultVisibility");
      if (savedVisibility) this.defaultVisibility = savedVisibility;

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

      if (this.activeVaultId) {
        await themeStore.loadForVault(this.activeVaultId);
        await this.loadFiles();
      } else {
        await vaultRegistry.listVaults();
        if (vaultRegistry.availableVaults.length > 0) {
          const firstVault = vaultRegistry.availableVaults[0];
          await vaultRegistry.setActiveVault(firstVault.id);
          await themeStore.loadForVault(firstVault.id);
          await this.loadFiles();
        }
      }
    } catch (err: any) {
      debugStore.error("[VaultStore] Init failed", err);
      console.warn("[VaultStore] Init failed, falling back to Guest Mode", err);

      uiStore.isGuestMode = true;
      this.status = "idle";
      this.errorMessage =
        err?.name === "QuotaExceededError"
          ? "Storage full. Running in Guest Mode (changes will not be saved)."
          : "Storage access denied. Running in Guest Mode.";

      // Ensure we have at least the welcome content by loading it via fetch
      if (Object.keys(this.entities).length === 0) {
        try {
          const response = await fetch("/vault-samples/welcome.json");
          const data = await response.json();
          await this.loadDemoData("Welcome", data.entities || data);
        } catch (e) {
          console.warn("Failed to load fallback demo data", e);
        }
      }
    } finally {
      this.isInitialized = true;
      await this.checkForConflicts();
      if ((this.status as string) !== "error") {
        this.status = "idle";
        if (this.activeVaultId) {
          window.dispatchEvent(
            new CustomEvent("vault-switched", {
              detail: { id: this.activeVaultId },
            }),
          );
        }
      }
    }
  }

  private _vaultHandle: FileSystemDirectoryHandle | undefined = undefined;

  async loadFiles(skipSyncIfWarm = true) {
    if (!this.activeVaultId) return;
    const vaultIdAtStart = this.activeVaultId;

    this.status = "loading";
    this._contentLoadedIds = new Set();
    this._contentVerifiedIds = new Set();
    this._vaultHandle = undefined; // Reset handle on load
    this.syncStats = {
      updated: 0,
      created: 0,
      deleted: 0,
      failed: 0,
      total: 0,
      progress: 0,
    };

    try {
      debugStore.log(`[VaultStore] Loading files for vault: ${vaultIdAtStart}`);

      // Reset event bus to clear listeners from previous vault sessions (prevent leaks)
      vaultEventBus.reset();

      // BROADCAST: Opening vault
      vaultEventBus.emit({
        type: "VAULT_OPENING",
        vaultId: vaultIdAtStart,
      });

      if (this.services) {
        this.services.ai.clearStyleCache();
      }

      // 1. Cache-First: Preload graph metadata from Dexie immediately.
      const cachedMap = await cacheService.preloadVault(vaultIdAtStart);

      // Race check after async preload
      if (this.activeVaultId !== vaultIdAtStart) return;

      if (cachedMap.size > 0) {
        // CRITICAL: We start with a FRESH map.
        // Do NOT spread this.repository.entities as it might contain stale data from previous vault.
        const entityMap: Record<string, LocalEntity> = {};
        for (const { entity: e } of cachedMap.values()) {
          const existing = entityMap[e.id];

          // Preserve content/lore if they are already loaded in memory
          const finalContent =
            existing?.content && !e.content ? existing.content : e.content;

          const finalLore = existing?.lore && !e.lore ? existing.lore : e.lore;

          entityMap[e.id] = {
            ...e,
            content: finalContent,
            lore: finalLore,
          };
        }
        // Push to repository to trigger immediate UI/Graph rendering
        this.repository.entities = entityMap;
        debugStore.log(
          `[VaultStore] Cache-First: Populated ${cachedMap.size} entities from Dexie.`,
        );

        // BROADCAST: Initial cache data ready
        vaultEventBus.emit({
          type: "CACHE_LOADED",
          vaultId: vaultIdAtStart,
          entities: entityMap,
        });

        // IMPORTANT: We set status to idle NOW. The graph is visible and interactive.
        this.status = "idle";

        if (skipSyncIfWarm) {
          debugStore.log(
            "[VaultStore] Cache is warm. Skipping OPFS background sync for instant load.",
          );

          // Start background tasks
          mapRegistry.loadFromVault(vaultIdAtStart);
          canvasRegistry.loadFromVault(vaultIdAtStart);

          // Resolve handle in background for image resolution
          this.getActiveVaultHandle();
          return;
        }
      }

      // 2. FS-Sync: Resolve OPFS handle and perform full synchronization
      const vaultDir = await this.getActiveVaultHandle();

      // Race check after async handle resolution
      if (this.activeVaultId !== vaultIdAtStart) return;

      if (!vaultDir) {
        if (this.status !== "idle") {
          this.status = cachedMap.size > 0 ? "idle" : "error";
          if (this.status === "error") {
            this.errorMessage = "Failed to resolve vault directory handle";
          }
        }
        return;
      }

      // 3. Local-Sync: If a local directory handle is persisted, sync it to OPFS first.
      const localHandle = await this.getActiveSyncHandle();
      if (localHandle) {
        debugStore.log(
          `[VaultStore] Local sync handle found for ${vaultIdAtStart}. Synchronizing...`,
        );
        await this.ensureServicesInitialized();
        if (this.syncCoordinator) {
          try {
            await this.syncCoordinator.syncWithLocalFolder(
              vaultIdAtStart,
              vaultDir,
              this.entities,
              () => this.repository.waitForAllSaves(),
              (state) => {
                // ONLY update status if we are still on the same vault
                if (this.activeVaultId === vaultIdAtStart) {
                  this.status = state.status;
                  if (state.errorMessage)
                    this.errorMessage = state.errorMessage;
                }
              },
              () => this.checkForConflicts(),
            );
            debugStore.log("[VaultStore] Local sync complete.");
          } catch (err) {
            debugStore.error("[VaultStore] Local sync failed", err);
            // We continue anyway, maybe OPFS has some data
          }
        }
      }

      // Final race check before starting repository scan
      if (this.activeVaultId !== vaultIdAtStart) return;

      // Ensure status is idle if we have cache, otherwise keep loading until we get first FS results
      if (cachedMap.size > 0) {
        this.status = "idle";
      }

      const syncPromise = this.repository.loadFiles(
        vaultIdAtStart,
        vaultDir,
        async (_chunk, current, total, newOrChanged) => {
          // Race check inside progress callback
          if (this.activeVaultId !== vaultIdAtStart) return;

          this.syncStats.total = total;
          this.syncStats.progress = Math.round((current / total) * 100);
          this.syncStats.created = current;

          const changedIds = Object.keys(newOrChanged);

          if (changedIds.length > 0) {
            // Track entities that arrived from OPFS (cache miss path) — they
            // already have content populated so no lazy load is needed later.
            for (const id of changedIds) {
              const entity = newOrChanged[id];
              if (entity.content) {
                this._contentLoadedIds.add(entity.id);
                this._contentVerifiedIds.add(entity.id);
              }
            }

            // BROADCAST: Chunk indexed
            vaultEventBus.emit({
              type: "SYNC_CHUNK_READY",
              vaultId: vaultIdAtStart,
              entities: this.entities,
              newOrChangedIds: changedIds,
            });
          }
        },
      );

      if (this.status === "loading") {
        await syncPromise;
      } else {
        // Just catch errors for background sync
        syncPromise.catch((err: any) => {
          debugStore.error("[VaultStore] Background sync failed", err);
        });
      }

      if (this.status === "loading") {
        debugStore.log(
          `[VaultStore] Load complete. Indexed ${this.syncStats.created} entities.`,
        );
        this.status = "idle";
      }

      await mapRegistry.loadFromVault(vaultIdAtStart);
      await canvasRegistry.loadFromVault(vaultIdAtStart);

      // BROADCAST: Full sync complete
      vaultEventBus.emit({
        type: "SYNC_COMPLETE",
        vaultId: vaultIdAtStart,
      });
    } catch (err: any) {
      debugStore.error("[VaultStore] Load failed", err);
      this.status = "error";
      this.errorMessage = err.message;
    }
  }

  /**
   * Loads the `content` and `lore` fields for the entity with the given ID
   * and updates `this.entities[id]` in place.  Subsequent calls for the same
   * ID are no-ops (unless the previous attempt failed with a transient error,
   * in which case the next call will retry).
   *
   * This is the primary entry-point for lazy content loading — call it
   * whenever the entity is "opened" (detail panel, read modal, edit mode, etc.)
   * to ensure the full entity data is available for rendering.
   */
  async loadEntityContent(id: string): Promise<void> {
    if (!id || !this.activeVaultId) return;
    if (this._contentVerifiedIds.has(id)) return;

    // Verify entity exists before starting async work.
    const currentEntity = this.entities[id];
    if (!currentEntity) return;

    // PRIORITY 1: Try Dexie Cache for immediate Chronicle (content) and Lore
    // No lock needed for Tier 1 IDB read.
    let cached: { content: string; lore: string } | null = null;
    let cacheErrored = false;
    try {
      cached = await cacheService.getEntityContent(this.activeVaultId, id);
      if (cached !== null) {
        const latest = this.entities[id];
        if (latest && (!latest.content || latest.lore === undefined)) {
          // Surgical update to the existing reactive proxy
          this.repository.entities[id] = {
            ...latest,
            content: cached.content,
            lore: cached.lore,
          };
          this._contentLoadedIds.add(id);
          debugStore.log(
            `[VaultStore] Priority 1 hit: Loaded chronicle/lore from cache for ${id}`,
          );
        }
      }
    } catch (cacheErr) {
      cacheErrored = true;
      debugStore.warn(
        `[VaultStore] Priority 1 cache load failed for ${id}`,
        cacheErr,
      );
    }

    // Re-check after Priority 1
    if (this._contentVerifiedIds.has(id)) return;

    try {
      const path = currentEntity._path || [`${id}.md`];

      // Ensure helpers are available (fallback to dynamic import if background load hasn't finished)
      const readFileAsText =
        this._helpers.readFileAsText ||
        (await import("../utils/opfs")).readFileAsText;
      const parseMarkdown =
        this._helpers.parseMarkdown ||
        (await import("../utils/markdown")).parseMarkdown;

      // PRIORITY 2 & 3: Load Lore (and fresh Chronicle) from Markdown file
      let text = "";

      const vaultDir = await this.getActiveVaultHandle();
      if (vaultDir) {
        try {
          text = await readFileAsText(vaultDir, path);
        } catch {
          // Fall through
        }
      }

      if (!text) {
        const localHandle = await syncIOAdapter.getLocalHandle(
          this.activeVaultId,
        );
        if (localHandle) {
          try {
            if (
              (await localHandle.queryPermission({ mode: "read" })) ===
              "granted"
            ) {
              text = await readFileAsText(localHandle, path);
            }
          } catch (err) {
            debugStore.warn(
              `[VaultStore] Priority 3 failed for ${id} from Local FS fallback`,
              err,
            );
          }
        }
      }

      if (text) {
        const { metadata, content: freshContent } = parseMarkdown(text);
        const freshLore = (metadata as any).lore || "";

        const entityToUpdate = this.entities[id];
        if (entityToUpdate) {
          // Update the entity surgically. Never overwrite with empty if Tier 1 already had content
          // and Priority 2/3 somehow returned empty content (unless both are empty).
          const finalContent = freshContent || entityToUpdate.content || "";
          const finalLore = freshLore || entityToUpdate.lore || "";

          const updatedEntity = {
            ...entityToUpdate,
            content: finalContent,
            lore: finalLore,
          };

          this.repository.entities[id] = updatedEntity;

          this._contentLoadedIds.add(id);
          this._contentVerifiedIds.add(id);

          debugStore.log(
            `[VaultStore] Verified ${id} from source: contentLen=${finalContent.length}, loreLen=${finalLore.length}`,
          );

          const isStale =
            finalContent !== (cached?.content ?? null) ||
            finalLore !== (cached?.lore ?? null);
          const hasContent = finalContent || finalLore;

          if (isStale && (cached !== null || hasContent)) {
            // CRITICAL: Pass the plain updatedEntity, not the reactive proxy
            // Background: No need to await
            cacheService.set(
              `${this.activeVaultId}:${path.join("/")}`,
              Date.now(),
              updatedEntity,
            );
          }
        }
      } else if (cached === null && !cacheErrored) {
        this._contentVerifiedIds.add(id); // Even if missing, we verified the absence
        debugStore.warn(
          `[VaultStore] Content truly missing for ${id} in all tiers`,
        );
      }
    } catch (err) {
      debugStore.error(`[VaultStore] Failed to load content for ${id}:`, err);
    }
  }

  scheduleSave(entity: LocalEntity | Entity): Promise<void> {
    if (this.onEntityUpdate) this.onEntityUpdate(entity as LocalEntity);

    const vaultIdAtStart = this.activeVaultId;
    if (!vaultIdAtStart) return Promise.resolve();

    if (this.services) {
      const path =
        (entity as LocalEntity)._path?.join("/") || `${entity.id}.md`;
      const keywords = [
        ...(entity.tags || []),
        entity.lore || "",
        ...Object.values(entity.metadata || {}).flat(),
      ].join(" ");
      const promise = this.services.search.index({
        id: entity.id,
        title: entity.title,
        content: (entity as LocalEntity).content,
        lore: (entity as LocalEntity).lore,
        type: entity.type,
        path,
        keywords,
        updatedAt: Date.now(),
      });
      if (promise && promise.catch) {
        promise.catch((err) =>
          debugStore.warn(`[VaultStore] Search index error: ${err}`),
        );
      }
    }

    if (uiStore.isDemoMode) return Promise.resolve();

    // Use a per-entity lock for saving to serialize writes to the same file
    // while allowing concurrent saves to DIFFERENT files.
    const lockKey = entity.id;

    return this.saveQueue.enqueue(lockKey, async () => {
      // 1. Always get the absolute latest state from the store
      let latestEntity = this.entities[entity.id];
      if (!latestEntity) return;

      // 2. CRITICAL SAFETY: If content hasn't been marked as loaded,
      // we MUST try to load it before saving to avoid overwriting with empty.
      if (!this._contentLoadedIds.has(entity.id)) {
        // Note: loadEntityContent is already queued, but we need it NOW.
        // We use a separate internal Load helper that avoids the queue to prevent deadlocks.
        await this.internalLoadContent(entity.id);
        // Re-fetch after load
        latestEntity = this.entities[entity.id] || latestEntity;
      }
      this.status = "saving";
      try {
        // Resolution must happen per-save to ensure we use the correct handle for the vaultIdAtStart
        const vaultHandle = await this.getSpecificVaultHandle(vaultIdAtStart);
        if (!vaultHandle) return;

        await this.repository.saveToDisk(
          vaultHandle,
          vaultIdAtStart,
          latestEntity,
          this.isGuest,
        );

        // Update Dexie cache immediately so it's fresh for Tier 1 lookups
        const path = latestEntity._path || [`${latestEntity.id}.md`];
        await cacheService.set(
          `${vaultIdAtStart}:${path.join("/")}`,
          Date.now(),
          latestEntity,
        );

        // Mark as verified since we just wrote it
        this._contentVerifiedIds.add(latestEntity.id);

        this.status = "idle";
      } catch (error) {
        debugStore.error("[VaultStore] Failed to save entity to disk", error);
        this.status = "error";
        this.errorMessage = "Failed to access storage for saving.";
      }
    });
  }

  async getSpecificVaultHandle(
    vaultId: string,
  ): Promise<FileSystemDirectoryHandle | undefined> {
    if (!vaultId || !vaultRegistry.rootHandle) return undefined;

    try {
      const vaultsDir = await vaultRegistry.rootHandle.getDirectoryHandle(
        "vaults",
        { create: true },
      );
      return await vaultsDir.getDirectoryHandle(vaultId, {
        create: true,
      });
    } catch (err) {
      debugStore.warn(
        `[VaultStore] Failed to get handle for vault: ${vaultId}`,
        err,
      );
      return undefined;
    }
  }

  /**
   * Internal helper to load content WITHOUT using the task queue.
   * ONLY call this from within a queued task or when you know no write is active.
   */
  private async internalLoadContent(id: string): Promise<void> {
    const currentEntity = this.entities[id];
    if (!currentEntity) return;

    try {
      const path = currentEntity._path || [`${id}.md`];
      const opfsModule = await import("../utils/opfs");
      const markdownModule = await import("../utils/markdown");

      if (!opfsModule || !markdownModule) {
        throw new Error("Failed to load helper modules (opfs/markdown)");
      }

      const readFileAsText = opfsModule.readFileAsText;
      const parseMarkdown = markdownModule.parseMarkdown;

      if (!readFileAsText || !parseMarkdown) {
        throw new Error("Missing helper functions in loaded modules");
      }

      const vaultDir = await this.getActiveVaultHandle();
      if (!vaultDir) return;

      const text = await readFileAsText(vaultDir, path);
      if (text) {
        const { metadata, content } = parseMarkdown(text);
        const lore = (metadata as any).lore || "";

        this.repository.entities[id] = {
          ...currentEntity,
          content,
          lore,
        };
        this._contentLoadedIds.add(id);
        this._contentVerifiedIds.add(id);
      }
    } catch (err) {
      debugStore.error(
        `[VaultStore] internalLoadContent failed for ${id}:`,
        err,
      );
    }
  }

  // --- CRUD Delegations ---
  async createEntity(
    type: Entity["type"],
    title: string,
    initialData: Partial<Entity> = {},
  ) {
    const id = await this.crudManager.createEntity(type, title, initialData);
    if (id) {
      this._contentLoadedIds.add(id); // Mark as loaded since it's new
      this._contentVerifiedIds.add(id); // Mark as verified
    }
    return id;
  }
  async updateEntity(id: string, updates: Partial<LocalEntity>) {
    const success = await this.crudManager.updateEntity(id, updates);
    if (
      success &&
      (updates.content !== undefined ||
        updates.lore !== undefined ||
        updates.title !== undefined ||
        updates.tags !== undefined)
    ) {
      this._contentLoadedIds.add(id);
      this._contentVerifiedIds.add(id);
    }
    return success;
  }
  async batchUpdate(updates: Record<string, Partial<LocalEntity>>) {
    const success = await this.crudManager.batchUpdate(updates);
    if (success) {
      for (const [id, patch] of Object.entries(updates)) {
        if (
          patch.content !== undefined ||
          patch.lore !== undefined ||
          patch.title !== undefined ||
          patch.tags !== undefined
        ) {
          this._contentLoadedIds.add(id);
          this._contentVerifiedIds.add(id);
        }
      }
    }
    return success;
  }
  async deleteEntity(id: string) {
    if (this.onEntityDelete) this.onEntityDelete(id);
    if (this.services) {
      await this.services.search.remove(id);
    }

    if (uiStore.isDemoMode) {
      const updated = { ...this.entities };
      delete updated[id];
      this.repository.entities = updated;
      return;
    }

    // Use the same per-entity lock for deletion to avoid conflicts with saves to that file.
    const lockKey = id;

    return this.saveQueue.enqueue(lockKey, async () => {
      const vaultHandle = await this.getActiveVaultHandle();
      if (vaultHandle) {
        await this.crudManager.deleteEntity(
          id,
          vaultHandle,
          this.activeVaultId!,
        );
      }
    });
  }
  addConnection(
    sourceId: string,
    targetId: string,
    type: string,
    label?: string,
    strength?: number,
  ) {
    return this.crudManager.addConnection(
      sourceId,
      targetId,
      type,
      label,
      strength,
    );
  }
  removeConnection(sourceId: string, targetId: string, type: string) {
    return this.crudManager.removeConnection(sourceId, targetId, type);
  }
  addLabel(id: string, label: string) {
    return this.crudManager.addLabel(id, label);
  }
  removeLabel(id: string, label: string) {
    return this.crudManager.removeLabel(id, label);
  }

  bulkAddLabel(ids: string[], label: string) {
    return this.crudManager.bulkAddLabel(ids, label);
  }
  bulkRemoveLabel(ids: string[], label: string) {
    return this.crudManager.bulkRemoveLabel(ids, label);
  }
  async batchCreateEntities(newEntitiesList: BatchCreateInput[]) {
    await this.crudManager.batchCreateEntities(newEntitiesList);
    // Mark all as loaded and verified since they are fresh.
    // This prevents lazy load clobbering.
    const createdEntities: LocalEntity[] = [];
    for (const item of newEntitiesList) {
      if ((item as any).id) {
        const id = (item as any).id;
        this._contentLoadedIds.add(id);
        this._contentVerifiedIds.add(id);
        const ent = this.entities[id];
        if (ent) createdEntities.push(ent as LocalEntity);
      }
    }

    if (createdEntities.length > 0) {
      vaultEventBus.emit({
        type: "BATCH_CREATED",
        vaultId: this.activeVaultId ?? "unknown",
        entities: createdEntities,
      });
    }

    this.broadcastVaultUpdate();
  }

  updateConnection(
    sourceId: string,
    targetId: string,
    oldType: string,
    newType: string,
    newLabel?: string,
  ) {
    return this.crudManager.updateConnection(
      sourceId,
      targetId,
      oldType,
      newType,
      newLabel,
    );
  }

  async resolveImageUrl(
    path: string,
    fileFetcher?: (path: string) => Promise<Blob>,
  ) {
    return this.assetManager.resolveImageUrl(
      await this.getActiveVaultHandle(),
      path,
      fileFetcher,
      await this.getActiveSyncHandle(),
    );
  }

  releaseImageUrl(path: string) {
    this.assetManager.releaseImageUrl(path);
  }

  async saveImageToVault(
    blob: Blob | File,
    entityId: string,
    originalName?: string,
  ) {
    return this.assetManager.saveImageToVault(
      await this.getActiveVaultHandle(),
      blob,
      entityId,
      originalName,
    );
  }

  async ensureAssetPersisted(
    path: string,
    vaultHandle: FileSystemDirectoryHandle,
  ) {
    // If we are in demo mode, we need a fetcher that knows how to find the sample images
    const fetcher = uiStore.activeDemoTheme
      ? async (p: string) => {
          const url = p.startsWith("vault-samples/")
            ? `${base}/${p}`
            : `${base}/vault-samples/${p}`;
          const r = await fetch(url);
          if (!r.ok) throw new Error(`Failed to fetch sample asset: ${url}`);
          return r.blob();
        }
      : undefined;

    return this.assetManager.ensureAssetPersisted(
      path,
      vaultHandle,
      fetcher,
      await this.getActiveSyncHandle(),
    );
  }

  async getActiveVaultHandle(): Promise<FileSystemDirectoryHandle | undefined> {
    if (!this.activeVaultId || !vaultRegistry.rootHandle) return undefined;
    if (this._vaultHandle) return this._vaultHandle;

    try {
      const vaultsDir = await vaultRegistry.rootHandle.getDirectoryHandle(
        "vaults",
        { create: true },
      );
      this._vaultHandle = await vaultsDir.getDirectoryHandle(
        this.activeVaultId,
        {
          create: true,
        },
      );
      return this._vaultHandle;
    } catch (err) {
      debugStore.warn("[VaultStore] Failed to get active vault handle", err);
      return undefined;
    }
  }

  async getActiveSyncHandle(): Promise<FileSystemDirectoryHandle | undefined> {
    if (!this.activeVaultId) return undefined;
    try {
      const db = await getDB();
      const handle = await db.get(
        "settings",
        `syncHandle_${this.activeVaultId}`,
      );
      return handle as FileSystemDirectoryHandle | undefined;
    } catch {
      return undefined;
    }
  }

  // --- Map & Canvas Delegations ---
  saveMaps() {
    return mapRegistry.saveMaps();
  }
  deleteMap(id: string) {
    return mapRegistry.deleteMap(id);
  }
  saveCanvas(id: string, options?: { explicitVaultId?: string }) {
    return canvasRegistry.saveCanvas(id, options);
  }

  // --- Sync Delegations ---

  async syncWithLocalFolder() {
    if (!this.syncCoordinator || !this.activeVaultId) return;
    const vaultIdAtStart = this.activeVaultId;
    const opfsHandle = await this.getActiveVaultHandle();
    await this.syncCoordinator.syncWithLocalFolder(
      vaultIdAtStart,
      opfsHandle,
      this.entities,
      () => this.repository.waitForAllSaves(),
      (state) => {
        // ONLY update status if we are still on the same vault
        if (this.activeVaultId === vaultIdAtStart) {
          this.status = state.status;
          this.syncType = state.syncType;
          if (state.errorMessage) this.errorMessage = state.errorMessage;
        }
      },
      () => this.checkForConflicts(),
    );
  }

  async cleanupConflictFiles() {
    if (!this.syncCoordinator || !this.activeVaultId) return;
    const opfsHandle = await this.getActiveVaultHandle();
    if (!opfsHandle) return;

    await this.syncCoordinator.cleanupConflictFiles(
      this.activeVaultId,
      opfsHandle,
      (status) => (this.status = status),
      () => this.loadFiles(),
    );
  }

  async checkForConflicts() {
    const opfsHandle = await this.getActiveVaultHandle();
    if (!opfsHandle) return;
    try {
      const files = await fileIOAdapter.walkDirectory(opfsHandle);
      this.hasConflictFiles = files.some((f: any) =>
        f.path[f.path.length - 1].includes(".conflict-"),
      );
    } catch {
      this.hasConflictFiles = false;
    }
  }

  // --- Lifecycle Delegations ---
  importFromFolder(handle?: FileSystemDirectoryHandle) {
    if (!handle) return Promise.resolve();
    return this.lifecycleManager.importFromFolder(handle);
  }
  switchVault(id: string) {
    return this.lifecycleManager.switchVault(id);
  }
  createVault(name: string) {
    return this.lifecycleManager.createVault(name);
  }
  deleteVault(id: string) {
    return this.lifecycleManager.deleteVault(id);
  }
  loadDemoData(name: string, entities: Record<string, LocalEntity>) {
    return this.lifecycleManager.loadDemoData(name, entities);
  }
  persistToIndexedDB(vaultId: string) {
    return this.lifecycleManager.persistToIndexedDB(vaultId);
  }

  async setDefaultVisibility(v: "visible" | "hidden") {
    this.defaultVisibility = v;
    const db = await getDB();
    await db.put("settings", v, "defaultVisibility");
  }
}

const VAULT_KEY = "__codex_vault_instance__";
export const vault: VaultStore =
  (globalThis as any)[VAULT_KEY] ??
  ((globalThis as any)[VAULT_KEY] = new VaultStore());
if (
  typeof window !== "undefined" &&
  (import.meta.env.DEV || (window as any).__E2E__)
) {
  (window as any).vault = vault;
  console.log("[VaultStore] Module loaded, vault attached to window");
}
