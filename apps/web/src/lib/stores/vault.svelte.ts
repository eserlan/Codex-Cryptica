import { uiStore } from "./ui.svelte";
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
} from "./vault/adapters";

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
      () => this.isGuest,
      () => this.services,
      (id) => this.onEntityDelete && this.onEntityDelete(id),
      (entity) => this.onEntityUpdate && this.onEntityUpdate(entity),
      (updates) => this.onBatchUpdate && this.onBatchUpdate(updates),
    );

    this.lifecycleManager = new VaultLifecycleManager(
      (s) => (this.status = s),
      (m) => (this.errorMessage = m),
      () => this.activeVaultId,
      () => this.getActiveVaultHandle(),
      this.repository,
      () => this.loadFiles(),
      () => this.entities,
      (n) => (this.demoVaultName = n),
      (v) => (this.isInitialized = v),
      () => this.services,
      (c) => (this.hasConflictFiles = c),
      (id) => (this.selectedEntityId = id),
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

  async init(injectedServices?: IVaultServices) {
    this.isInitialized = false;
    this.status = "loading";

    if (injectedServices) {
      this.services = injectedServices;
    } else if (typeof window !== "undefined") {
      const { searchService } = await import("../services/search");
      const { contextRetrievalService, textGenerationService } =
        await import("../services/ai");
      this.services = {
        search: searchService,
        ai: {
          clearStyleCache: () => contextRetrievalService.clearStyleCache(),
          expandQuery: (k, q, h) => textGenerationService.expandQuery(k, q, h),
        },
      };

      if (!this.syncCoordinator) {
        const engine = await createSyncEngine();
        this.syncCoordinator = new SyncCoordinator(
          syncIOAdapter,
          engine,
          syncNotifier,
        );
      }
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
    } catch (err) {
      console.error("[VaultStore] Init failed", err);
      this.status = "error";
      this.errorMessage =
        "Failed to initialize storage. Please check browser support for OPFS.";
    } finally {
      this.isInitialized = true;
      await this.checkForConflicts();
      if (this.status !== "error") {
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

  async loadFiles() {
    const vaultDir = await this.getActiveVaultHandle();
    if (!this.activeVaultId || !vaultDir) return;

    this.status = "loading";
    this.syncStats = {
      updated: 0,
      created: 0,
      deleted: 0,
      failed: 0,
      total: 0,
      progress: 0,
    };

    try {
      debugStore.log(
        `[VaultStore] Loading files for vault: ${this.activeVaultId}`,
      );
      if (this.services) {
        this.services.ai.clearStyleCache();
        await this.services.search.clear();
        debugStore.log("[VaultStore] Search index cleared.");
      }

      await this.repository.loadFiles(
        this.activeVaultId,
        vaultDir,
        async (chunk, current, total) => {
          this.syncStats.total = total;
          this.syncStats.progress = Math.round((current / total) * 100);
          this.syncStats.created = current;

          if (this.services) {
            debugStore.log(
              `[VaultStore] Indexing chunk of ${Object.keys(chunk).length} entities (${current}/${total})`,
            );
            const indexPromises = Object.values(chunk).map((entity) => {
              const path = entity._path?.join("/") || `${entity.id}.md`;
              const keywords = [
                ...(entity.tags || []),
                entity.lore || "",
                ...Object.values(entity.metadata || {}).flat(),
              ].join(" ");
              const promise = this.services!.search.index({
                id: entity.id,
                title: entity.title,
                content: entity.content,
                type: entity.type,
                path,
                keywords,
                updatedAt: Date.now(),
              });
              return promise && promise.catch
                ? promise.catch((err) => {
                    debugStore.error(
                      `[VaultStore] Failed to index entity: ${entity.id}`,
                      err,
                    );
                    console.warn(err);
                  })
                : Promise.resolve();
            });
            await Promise.all(indexPromises);
          }
        },
      );

      debugStore.log(
        `[VaultStore] Load complete. Indexed ${this.syncStats.created} entities.`,
      );
      await mapRegistry.loadFromVault(this.activeVaultId);
      await canvasRegistry.loadFromVault(this.activeVaultId);
    } catch (err: any) {
      debugStore.error("[VaultStore] Load failed", err);
      console.error("[VaultStore] Load failed", err);
      this.status = "error";
      this.errorMessage = err.message;
    }
  }

  scheduleSave(entity: LocalEntity | Entity): Promise<void> {
    if (this.onEntityUpdate) this.onEntityUpdate(entity as LocalEntity);

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
        content: entity.content,
        type: entity.type,
        path,
        keywords,
        updatedAt: Date.now(),
      });
      if (promise && promise.catch) {
        promise.catch(console.warn);
      }
    }

    if (uiStore.isDemoMode) return Promise.resolve();

    return vaultRegistry.rootHandle && this.activeVaultId
      ? vaultRegistry.rootHandle
          .getDirectoryHandle("vaults")
          .then((v) => v.getDirectoryHandle(this.activeVaultId!))
          .then((vaultDir) => {
            return this.repository.scheduleSave(
              vaultDir,
              this.activeVaultId!,
              entity as LocalEntity,
              this.isGuest,
              (s) => (this.status = s),
            );
          })
          .catch((error) => {
            console.error(
              "Failed to schedule save: unable to resolve vault directory handle",
              error,
            );
            this.status = "error";
            this.errorMessage = "Failed to access storage for saving.";
          })
      : Promise.resolve();
  }

  // --- CRUD Delegations ---
  createEntity(
    type: Entity["type"],
    title: string,
    initialData: Partial<Entity> = {},
  ) {
    return this.crudManager.createEntity(type, title, initialData);
  }
  updateEntity(id: string, updates: Partial<LocalEntity>) {
    return this.crudManager.updateEntity(id, updates);
  }
  batchUpdateEntities(updates: Record<string, Partial<LocalEntity>>) {
    return this.crudManager.batchUpdateEntities(updates);
  }
  deleteEntity(id: string) {
    return this.crudManager.deleteEntity(id);
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
    const result = await this.crudManager.batchCreateEntities(newEntitiesList);
    this.broadcastVaultUpdate();
    return result;
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
    );
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

  async getActiveVaultHandle(): Promise<FileSystemDirectoryHandle | undefined> {
    if (!this.activeVaultId || !vaultRegistry.rootHandle) return undefined;
    try {
      const vaultsDir = await vaultRegistry.rootHandle.getDirectoryHandle(
        "vaults",
        { create: true },
      );
      return await vaultsDir.getDirectoryHandle(this.activeVaultId, {
        create: true,
      });
    } catch (err) {
      console.warn("Failed to get active vault handle", err);
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
  saveCanvas(id: string) {
    return canvasRegistry.saveCanvas(id);
  }

  // --- Sync Delegations ---

  async syncToLocal() {
    if (!this.syncCoordinator || !this.activeVaultId) return;
    const opfsHandle = await this.getActiveVaultHandle();
    await this.syncCoordinator.syncToLocal(
      this.activeVaultId,
      opfsHandle,
      this.entities,
      () => this.repository.waitForAllSaves(),
      (state) => {
        this.status = state.status;
        this.syncType = state.syncType;
        if (state.errorMessage) this.errorMessage = state.errorMessage;
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
    return this.lifecycleManager.importFromFolder(handle);
  }
  loadFromFolder(handle: FileSystemDirectoryHandle) {
    return this.lifecycleManager.loadFromFolder(handle);
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
