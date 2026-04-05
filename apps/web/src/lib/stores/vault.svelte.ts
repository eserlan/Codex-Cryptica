import { uiStore } from "./ui.svelte";
import { base } from "$app/paths";
import { vaultRegistry } from "./vault-registry.svelte";
import { mapRegistry } from "./map-registry.svelte";
import { canvasRegistry } from "./canvas-registry.svelte";
import { themeStore } from "./theme.svelte";
import { debugStore } from "./debug.svelte";
import type { LocalEntity, BatchCreateInput } from "./vault/types";
import type { Entity } from "schema";
import { getDB } from "../utils/idb";
import { VaultLifecycleManager } from "./vault/lifecycle";
import { EntityStore } from "./vault/entity-store.svelte";
import { SyncStore } from "./vault/sync-store.svelte";
import { AssetStore } from "./vault/asset-store.svelte";
import { ServiceRegistry } from "./vault/service-registry";
import { SearchStore } from "./vault/search-store.svelte";
import {
  VaultRepository,
  SyncCoordinator,
  AssetManager,
} from "@codex/vault-engine";
import {
  fileIOAdapter,
  assetIOAdapter,
  imageProcessor,
  createSyncEngine,
  syncIOAdapter,
  syncNotifier,
} from "./vault/adapters.svelte";
import { migrateStructure } from "./vault/migration";

import { VaultMessenger } from "./vault/messenger";
import { VaultStorageManager } from "./vault/storage";

export class VaultStore {
  // Reactive State
  isInitialized = $state(false);
  selectedEntityId = $state<string | null>(null);
  demoVaultName = $state<string | null>(null);
  migrationRequired = $state(false);
  defaultVisibility = $state<"visible" | "hidden">("visible");

  // Callbacks
  onEntityUpdate?: (entity: LocalEntity) => void;
  onEntityDelete?: (entityId: string) => void;
  onBatchUpdate?: (updates: Record<string, Partial<LocalEntity>>) => void;

  // Services & Sub-stores
  public entityStore: EntityStore;
  public syncStore: SyncStore;
  public assetStore: AssetStore;
  public serviceRegistry: ServiceRegistry;
  public searchStore: SearchStore;
  private lifecycleManager: VaultLifecycleManager;
  private storageManager: VaultStorageManager;
  private messenger: VaultMessenger;

  // Delegated Getters
  get entities() {
    return this.entityStore.entities;
  }
  get allEntities() {
    return this.entityStore.allEntities;
  }
  get status() {
    return this.syncStore.status;
  }
  set status(value: "idle" | "loading" | "saving" | "error") {
    this.syncStore.setStatus(value);
  }
  get errorMessage() {
    return this.syncStore.errorMessage;
  }
  set errorMessage(value: string | null) {
    this.syncStore.setErrorMessage(value);
  }
  get syncType() {
    return this.syncStore.syncType;
  }
  get syncStats() {
    return this.syncStore.syncStats;
  }
  get hasConflictFiles() {
    return this.syncStore.hasConflictFiles;
  }
  get inboundConnections() {
    return this.entityStore.inboundConnections;
  }
  get labelIndex() {
    return this.entityStore.labelIndex;
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
  get services() {
    return this.serviceRegistry.services;
  }

  constructor(
    public repository = new VaultRepository(fileIOAdapter),
    private assetManager = new AssetManager(assetIOAdapter, imageProcessor),
    public syncCoordinator: SyncCoordinator | null = null,
  ) {
    this.serviceRegistry = new ServiceRegistry();
    this.searchStore = new SearchStore(this.serviceRegistry);
    this.storageManager = new VaultStorageManager({
      getRootHandle: () =>
        vaultRegistry.rootHandle as FileSystemDirectoryHandle | undefined,
    });

    this.entityStore = new EntityStore({
      repository: this.repository,
      activeVaultId: () => this.activeVaultId,
      isGuest: () => this.isGuest,
      getActiveVaultHandle: () => this.getActiveVaultHandle(),
      getSpecificVaultHandle: (vId) => this.getSpecificVaultHandle(vId),
      getActiveSyncHandle: () => this.getActiveSyncHandle(),
      getServices: () => this.services,
      invalidateUrlCache: (path) => this.releaseImageUrl(path),
      setStatus: (s) => this.syncStore.setStatus(s),
      setErrorMessage: (m) => this.syncStore.setErrorMessage(m),
      onEntityDelete: (id) => this.onEntityDelete?.(id),
      onEntityUpdate: (entity) => this.onEntityUpdate?.(entity),
      onBatchUpdate: (updates) => this.onBatchUpdate?.(updates),
    });

    this.syncStore = new SyncStore({
      activeVaultId: () => this.activeVaultId,
      repository: this.repository,
      getSyncCoordinator: async () => {
        await this.serviceRegistry.ensureInitialized();
        if (!this.syncCoordinator) {
          const engine = await createSyncEngine();
          this.syncCoordinator = new SyncCoordinator(
            syncIOAdapter,
            engine,
            syncNotifier,
          );
        }
        return this.syncCoordinator;
      },
      getActiveVaultHandle: () => this.getActiveVaultHandle(),
      getActiveSyncHandle: () => this.getActiveSyncHandle(),
      ensureServicesInitialized: () =>
        this.serviceRegistry.ensureInitialized() as any,
      loadMaps: (vId) => mapRegistry.loadFromVault(vId),
      loadCanvases: (vId) => canvasRegistry.loadFromVault(vId),
    });

    this.assetStore = new AssetStore({
      assetManager: this.assetManager,
      getActiveVaultHandle: () => this.getActiveVaultHandle(),
      getActiveSyncHandle: () => this.getActiveSyncHandle(),
      isGuest: () => this.isGuest,
    });

    this.lifecycleManager = new VaultLifecycleManager({
      syncStore: this.syncStore,
      assetStore: this.assetStore,
      repository: this.repository,
      activeVaultId: () => this.activeVaultId,
      getActiveVaultHandle: () => this.getActiveVaultHandle(),
      loadFiles: (skipSync) => this.loadFiles(skipSync),
      ensureServicesInitialized: () => this.serviceRegistry.ensureInitialized(),
      clearStorageCache: () => this.storageManager.clearCache(),
      getEntities: () => this.entities,
      setDemoVaultName: (n) => (this.demoVaultName = n),
      setInitialized: (v) => (this.isInitialized = v),
      getServices: () => this.services,
      setSelectedEntityId: (id) => (this.selectedEntityId = id),
      vaultRegistry,
      themeStore,
      mapRegistry,
      canvasRegistry,
      ensureAssetPersisted: (path, handle) =>
        this.ensureAssetPersisted(path, handle),
    });

    this.messenger = new VaultMessenger({
      activeVaultId: () => this.activeVaultId,
      loadFiles: () => this.loadFiles(),
      broadcastCallback: () => this.broadcastVaultUpdate(),
    });

    mapRegistry.init(this.repository.saveQueue);
    canvasRegistry.init(this.repository.saveQueue);
  }

  // --- Core Lifecycle ---

  async init() {
    try {
      await vaultRegistry.init();

      const db = await getDB();
      const pref = await db.get("settings", "defaultVisibility");
      if (pref) this.defaultVisibility = pref as any;

      if (uiStore.isDemoMode) {
        this.isInitialized = true;
        return;
      }

      this.migrationRequired =
        (await this.lifecycleManager.runMigration()) ?? false;

      const opfsRoot = vaultRegistry.rootHandle;
      if (opfsRoot) {
        await migrateStructure(opfsRoot);
      }

      if (this.activeVaultId) {
        await themeStore.loadForVault(this.activeVaultId);
      }

      if (this.activeVaultId) {
        await this.loadFiles();
      }
      if (typeof window !== "undefined" && this.activeVaultId) {
        window.dispatchEvent(
          new CustomEvent("vault-switched", {
            detail: { id: this.activeVaultId },
          }),
        );
      }
      this.isInitialized = true;
    } catch (err: any) {
      debugStore.error("[VaultStore] Init failed", err);
      console.warn("[VaultStore] Init failed, falling back to Guest Mode", err);

      uiStore.isGuestMode = true;
      this.status = "idle";
      this.errorMessage =
        err?.name === "QuotaExceededError"
          ? "Storage full. Running in Guest Mode (changes will not be saved)."
          : "Storage access denied. Running in Guest Mode.";

      try {
        const response = await fetch(`${base}/vault-samples/fantasy.json`);
        if (!response.ok) {
          console.warn("Failed to load fallback demo data");
          return;
        }
        const data = await response.json();
        await this.loadDemoData("Welcome", (data as any).entities || data);
      } catch (fallbackErr) {
        console.warn("Failed to load fallback demo data", fallbackErr);
      } finally {
        this.isInitialized = true;
        this.status = "idle";
      }
    }
  }

  // --- External Sync Methods ---

  broadcastVaultUpdate() {
    this.messenger.broadcastVaultUpdate();
  }

  async loadFiles(skipSyncIfWarm = true) {
    return this.syncStore.loadFiles(skipSyncIfWarm);
  }

  async syncWithLocalFolder() {
    return this.syncStore.syncWithLocalFolder();
  }

  async cleanupConflictFiles(signal?: AbortSignal) {
    return this.syncStore.cleanupConflictFiles(signal);
  }

  async checkForConflicts(signal?: AbortSignal) {
    return this.syncStore.checkForConflicts(signal);
  }

  // --- Entity Management (Delegated) ---

  loadEntityContent(id: string) {
    return this.entityStore.loadEntityContent(id);
  }
  createEntity(
    type: Entity["type"],
    title: string,
    initialData: Partial<Entity> = {},
  ) {
    return this.entityStore.createEntity(type, title, initialData);
  }
  updateEntity(id: string, updates: Partial<LocalEntity>) {
    return this.entityStore.updateEntity(id, updates);
  }
  batchUpdate(updates: Record<string, Partial<LocalEntity>>) {
    return this.entityStore.batchUpdate(updates);
  }
  deleteEntity(id: string) {
    return this.entityStore.deleteEntity(id);
  }
  addConnection(
    sId: string,
    tId: string,
    type: string,
    label?: string,
    strength?: number,
  ) {
    return this.entityStore.addConnection(sId, tId, type, label, strength);
  }
  removeConnection(sId: string, tId: string, type: string) {
    return this.entityStore.removeConnection(sId, tId, type);
  }
  updateConnection(
    sId: string,
    tId: string,
    oldT: string,
    newT: string,
    newL?: string,
  ) {
    return this.entityStore.updateConnection(sId, tId, oldT, newT, newL);
  }
  addLabel(id: string, label: string) {
    return this.entityStore.addLabel(id, label);
  }
  removeLabel(id: string, label: string) {
    return this.entityStore.removeLabel(id, label);
  }
  bulkAddLabel(ids: string[], label: string) {
    return this.entityStore.bulkAddLabel(ids, label);
  }
  bulkRemoveLabel(ids: string[], label: string) {
    return this.entityStore.bulkRemoveLabel(ids, label);
  }
  batchCreateEntities(newEntitiesList: BatchCreateInput[]) {
    return this.entityStore.batchCreateEntities(newEntitiesList);
  }

  // --- Save Coordination ---

  scheduleSave(entity: LocalEntity | Entity) {
    return this.entityStore.scheduleSave(entity);
  }

  // --- Asset Management (Delegated) ---

  resolveImageUrl(path: string, fetcher?: (path: string) => Promise<Blob>) {
    return this.assetStore.resolveImageUrl(path, fetcher);
  }
  releaseImageUrl(path: string) {
    this.assetStore.releaseImageUrl(path);
  }
  saveImageToVault(blob: Blob | File, entityId: string, name?: string) {
    return this.assetStore.saveImageToVault(blob, entityId, name);
  }
  ensureAssetPersisted(path: string, handle: FileSystemDirectoryHandle) {
    return this.assetStore.ensureAssetPersisted(path, handle);
  }

  // --- Handle Management ---

  getActiveVaultHandle() {
    return this.storageManager.getActiveVaultHandle(this.activeVaultId);
  }
  getActiveSyncHandle() {
    return this.storageManager.getActiveSyncHandle(this.activeVaultId);
  }
  getSpecificVaultHandle(vaultId: string) {
    return this.storageManager.getSpecificVaultHandle(vaultId);
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

  // --- Lifecycle Delegations ---
  importFromFolder(handle?: FileSystemDirectoryHandle) {
    return handle
      ? this.lifecycleManager.importFromFolder(handle)
      : Promise.resolve();
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
