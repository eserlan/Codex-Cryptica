import { uiStore } from "./ui.svelte";
import { p2pGuestService } from "../cloud-bridge/p2p/guest-service";
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
  private syncAbortController: AbortController | null = null;

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
   * loaded. Critical for P2P and synced vaults.
   */
  private loadedContentIds = new Set<string>();

  constructor(
    public repository: VaultRepository = new VaultRepository(),
    private syncCoordinator: SyncCoordinator = new SyncCoordinator(
      repository,
      createSyncEngine(),
      syncNotifier,
    ),
    private assetManager: AssetManager = new AssetManager(
      assetIOAdapter,
      imageProcessor,
    ),
  ) {
    this.crudManager = new VaultCrudManager(repository, assetManager);
    this.lifecycleManager = new VaultLifecycleManager(
      repository,
      syncCoordinator,
      assetManager,
    );

    // Wire up events
    repository.onEntityUpdate = (e) => {
      this.onEntityUpdate?.(e);
      vaultEventBus.emit("entity-updated", { entity: e });
    };
    repository.onEntityDelete = (id) => {
      this.onEntityDelete?.(id);
      vaultEventBus.emit("entity-deleted", { entityId: id });
    };
    repository.onBatchUpdate = (updates) => {
      this.onBatchUpdate?.(updates);
      vaultEventBus.emit("batch-updated", { updates });
    };

    if (browser) {
      this.channel = new BroadcastChannel("vault-sync");
      this.channel.onmessage = (event) => {
        if (event.data.type === "VAULT_UPDATED") {
          this.syncCoordinator.triggerSync();
        }
      };
    }
  }

  // Getters for Repository State
  get entities() {
    return this.repository.entities;
  }
  get allEntities() {
    return this.repository.allEntities;
  }
  get maps() {
    return this.repository.maps;
  }
  get allMaps() {
    return this.repository.allMaps;
  }
  get canvases() {
    return this.repository.canvases;
  }
  get allCanvases() {
    return this.repository.allCanvases;
  }
  get activeVaultId() {
    return this.repository.activeVaultId;
  }
  get activeVaultName() {
    return this.repository.activeVaultName;
  }

  get isGuest() {
    return uiStore.isGuestMode;
  }

  // Lifecycle Methods
  async initialize() {
    this.status = "loading";
    try {
      await this.lifecycleManager.initialize();
      this.isInitialized = true;
      this.status = "idle";
    } catch (err: any) {
      this.status = "error";
      this.errorMessage = err.message;
    }
  }

  async openVault(vaultId: string) {
    this.status = "loading";
    try {
      await this.lifecycleManager.openVault(vaultId);
      this.isInitialized = true;
      this.status = "idle";
    } catch (err: any) {
      this.status = "error";
      this.errorMessage = err.message;
    }
  }

  async closeVault() {
    await this.lifecycleManager.closeVault();
    this.isInitialized = false;
    this.status = "idle";
  }

  // CRUD Operations
  async createEntity(type: Entity["type"], title: string) {
    return await this.crudManager.createEntity(
      await this.getActiveVaultHandle(),
      type,
      title,
    );
  }

  async batchCreateEntities(inputs: BatchCreateInput[]) {
    return await this.crudManager.batchCreateEntities(
      await this.getActiveVaultHandle(),
      inputs,
    );
  }

  async updateEntity(id: string, patch: Partial<LocalEntity>) {
    return await this.crudManager.updateEntity(
      await this.getActiveVaultHandle(),
      id,
      patch,
    );
  }

  batchUpdate(updates: Record<string, Partial<LocalEntity>>) {
    this.repository.batchUpdate(updates);
  }

  async deleteEntity(id: string) {
    return await this.crudManager.deleteEntity(
      await this.getActiveVaultHandle(),
      id,
    );
  }

  // Map Operations
  async createMap(name: string, assetPath: string, dimensions: any) {
    const id = await this.crudManager.createMap(
      await this.getActiveVaultHandle(),
      name,
      assetPath,
      dimensions,
    );
    await mapRegistry.touch(id);
    return id;
  }

  async saveMaps() {
    return await this.crudManager.saveMaps(await this.getActiveVaultHandle());
  }

  // Canvas Operations
  async createCanvas(name: string) {
    const id = await this.crudManager.createCanvas(
      await this.getActiveVaultHandle(),
      name,
    );
    await canvasRegistry.touch(id);
    return id;
  }

  async saveCanvas(id: string, options?: { explicitVaultId?: string }) {
    let handle = await this.getActiveVaultHandle();

    // If an explicit vault is provided, we must use that handle instead
    if (options?.explicitVaultId && options.explicitVaultId !== this.activeVaultId) {
      const root = await getOpfsRoot();
      handle = await getVaultDir(root, options.explicitVaultId);
    }

    return await this.crudManager.saveCanvas(handle, id);
  }

  async deleteCanvas(id: string) {
    await this.crudManager.deleteCanvas(await this.getActiveVaultHandle(), id);
    await canvasRegistry.touch(id);
  }

  // Sync Methods
  async triggerSync() {
    return await this.syncCoordinator.triggerSync();
  }

  // Helper Methods
  async getActiveVaultHandle() {
    return await this.repository.getActiveVaultHandle();
  }

  async getActiveSyncHandle() {
    return await this.repository.getActiveSyncHandle();
  }

  async loadEntityContent(id: string) {
    if (this.loadedContentIds.has(id)) return;

    try {
      const entity = this.entities[id];
      if (!entity) return;

      if (!this._helpers.readFileAsText) {
        const { readFileAsText: rf, parseMarkdown } = await import(
          "../utils/opfs"
        );
        this._helpers.readFileAsText = rf;
        this._helpers.parseMarkdown = parseMarkdown;
      }

      const handle = await this.getActiveVaultHandle();
      if (!handle && !this.isGuest) return;

      let content = "";
      if (this.isGuest) {
        // In guest mode, the content should already be in the entity object
        // because the host serializes it. If it's missing, we can't do much
        // unless we add a GET_CONTENT P2P message.
        content = (entity as any).content || "";
      } else {
        const path = entity._path;
        if (!path) return;
        content = await this._helpers.readFileAsText(handle, path);
      }

      const { data, content: body } = this._helpers.parseMarkdown(content);

      this.repository.entities[id] = {
        ...entity,
        ...data,
        content: body,
      };
      this.loadedContentIds.add(id);
    } catch (err) {
      console.warn(`[VaultStore] Failed to load content for ${id}`, err);
    }
  }

  async resolveImageUrl(
    path: string,
    fileFetcher?: (path: string) => Promise<Blob>,
  ) {
    // If we are in guest mode, we need to fetch files from the host
    const effectiveFetcher =
      fileFetcher ||
      (this.isGuest
        ? (p: string) => p2pGuestService.getFile(p)
        : undefined);

    return this.assetManager.resolveImageUrl(
      await this.getActiveVaultHandle(),
      path,
      effectiveFetcher,
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
          const res = await fetch(url);
          return await res.blob();
        }
      : undefined;

    return this.assetManager.ensureAssetPersisted(
      path,
      vaultHandle,
      fetcher,
      await this.getActiveSyncHandle(),
    );
  }
}

export const vault = new VaultStore();

if (typeof window !== "undefined") {
  (window as any).vault = vault;
}
