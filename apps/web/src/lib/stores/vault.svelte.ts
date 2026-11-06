import { VaultViews } from "./vault/vault-views";
import { VaultBootstrap } from "./vault/bootstrap";
import { VaultTranscripts } from "./vault/transcripts";
import { PublishRegistryLoader } from "./vault/publish-registry-loader";
import { vaultRegistry } from "./vault-registry.svelte";
import { mapRegistry } from "./map-registry.svelte";
import { canvasRegistry } from "./canvas-registry.svelte";
import { themeStore } from "./theme.svelte";
import { debugStore } from "./debug.svelte";
import type { LocalEntity, BatchCreateInput } from "./vault/types";
import {
  linksNewExternalImage,
  localizeExternalImage,
} from "./vault/external-image-localizer";
import type { Entity, GuestChatTranscript } from "schema";
import type { BulkMutationResult } from "./vault/bulk-results";
import { getDB } from "../utils/idb";
import { VaultLifecycleManager } from "./vault/lifecycle";
import { EntityStore } from "./vault/entity-store.svelte";
import { EntityContentLoader } from "./vault/entity-content-loader.svelte";
import { EntityPersistenceService } from "./vault/entity-persistence";
import { EntityMutationService } from "./vault/entity-mutations";
import {
  addFamilyLink as addFamilyLinkMutation,
  removeFamilyLink as removeFamilyLinkMutation,
} from "./vault/family-mutations";
import {
  isFamilyType,
  resolveFamilyAlias,
  type FamilyConnectionType,
} from "@codex/family-engine";
import { SyncStore } from "./vault/sync-store.svelte";
import { AssetStore } from "./vault/asset-store.svelte";
import { FileStore } from "./vault/file-store.svelte";
import { ServiceRegistry } from "./vault/service-registry";
import { SearchStore } from "./vault/search-store.svelte";
import {
  VaultRepository,
  SyncCoordinator,
  AssetManager,
  FileManager,
} from "@codex/vault-engine";

import {
  fileIOAdapter,
  assetIOAdapter,
  imageProcessor,
  createSyncEngine,
  syncIOAdapter,
  syncNotifier,
} from "./vault/adapters.svelte";

import { VaultMessenger } from "./vault/messenger";
import { VaultStorageManager } from "./vault/storage";
import { p2pGuestService } from "../cloud-bridge/p2p/guest-service";
import { sessionModeStore } from "#lib/stores/ui/session-mode.svelte.js";
import { guestVault } from "./guest-vault.svelte";
import { onboardingFunnel } from "#lib/app/onboarding/onboarding-funnel.js";
import { statSheetTemplates } from "./stat-sheet-templates.svelte";
import { DeadExternalImagePruner } from "./vault/dead-external-image-pruner";
import { browserPerformanceRecorder } from "#lib/services/performance/browser-performance-capture.js";

export class VaultStore {
  // Reactive State
  _isInitialized = $state(false);
  get isInitialized() {
    if (sessionModeStore.isGuestMode && guestVault.publishId) {
      // Viewing a published snapshot: don't let host-vault init leak through
      // and trigger app effects before the snapshot has loaded.
      return guestVault.isInitialized;
    }
    return this._isInitialized;
  }
  set isInitialized(v: boolean) {
    this._isInitialized = v;
  }
  selectedEntityId = $state<string | null>(null);
  demoVaultName = $state<string | null>(null);
  migrationRequired = $state(false);
  /** Serialises copies of newly linked external images; see updateEntity. */
  private imageLocalization: Promise<unknown> = Promise.resolve();
  defaultVisibility = $state<"visible" | "hidden">("visible");

  // Callbacks
  onEntityUpdate?: (entity: LocalEntity) => void;
  onEntityDelete?: (entityId: string) => void;
  onBatchUpdate?: (updates: Record<string, Partial<LocalEntity>>) => void;

  // Services & Sub-stores
  public entityStore: EntityStore;
  public syncStore: SyncStore;
  public assetStore: AssetStore;
  public fileStore: FileStore;
  public serviceRegistry: ServiceRegistry;
  public searchStore: SearchStore;
  public deadImagePruner: DeadExternalImagePruner;
  private lifecycleManager: VaultLifecycleManager;
  private storageManager: VaultStorageManager;
  private messenger: VaultMessenger;

  // Delegated Getters
  get entities() {
    return this.views.entities;
  }
  get allEntities() {
    return this.views.allEntities;
  }
  get graphEntities() {
    return this.views.graphEntities;
  }
  get graphStructureVersion() {
    return this.views.graphStructureVersion;
  }
  get titleAndAliasIndex() {
    return this.views.titleAndAliasIndex;
  }
  get allTitlesString() {
    return this.entityStore.allEntities.map((e) => e.title).join(", ");
  }
  get status() {
    if (sessionModeStore.isGuestMode && guestVault.publishId) {
      // Guest snapshots don't sync; the host syncStore may be stuck in
      // "loading" from an interrupted bootstrap.
      return guestVault.isInitialized ? "idle" : "loading";
    }
    return this.syncStore.status;
  }
  set status(
    value:
      "idle" | "loading" | "saving" | "saved" | "needs-permission" | "error",
  ) {
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
  get loadPhase() {
    return this.syncStore.loadPhase;
  }
  get hasConflictFiles() {
    return this.syncStore.hasConflictFiles;
  }
  get hasFolderHandle() {
    return this.syncStore.hasFolderHandle;
  }
  get failedFiles() {
    return this.syncStore.failedFiles;
  }
  set failedFiles(v: { path: string; error: string }[]) {
    this.syncStore.failedFiles = v;
  }
  get isDirty() {
    return this.syncStore.isDirty;
  }
  get inboundConnections() {
    return this.views.inboundConnections;
  }
  get labelIndex() {
    return this.views.labelIndex;
  }
  get labelCounts() {
    return this.views.labelCounts;
  }
  get maps() {
    return this.views.maps;
  }
  get allMaps() {
    return this.views.allMaps;
  }
  get canvases() {
    return this.views.canvases;
  }
  get activeVaultId() {
    return this.views.activeVaultId;
  }
  get activeVaultRecord() {
    return this.views.activeVaultRecord;
  }
  get vaultName() {
    return this.views.vaultName;
  }
  get saveQueue() {
    return this.repository.saveQueue;
  }
  get isGuest() {
    return !!sessionModeStore.isGuestMode;
  }
  get services() {
    return this.serviceRegistry.services;
  }

  private views = new VaultViews({
    entityStore: () => this.entityStore,
    mode: sessionModeStore,
    guest: guestVault,
    maps: mapRegistry,
    canvases: canvasRegistry,
    registry: vaultRegistry,
  });
  private publishRegistry = new PublishRegistryLoader();
  private bootstrap: VaultBootstrap;
  private transcripts = new VaultTranscripts(this);

  registerPublishRegistryLoader(
    loader: (vId: string, handle: FileSystemDirectoryHandle) => Promise<void>,
  ): () => void {
    return this.publishRegistry.register(loader);
  }

  constructor(
    public repository = new VaultRepository(fileIOAdapter),
    private assetManager = new AssetManager(assetIOAdapter, imageProcessor),
    private fileManager = new FileManager({ ioAdapter: assetIOAdapter }),
    public syncCoordinator: SyncCoordinator | null = null,
  ) {
    this.serviceRegistry = new ServiceRegistry();
    this.searchStore = new SearchStore(this.serviceRegistry);
    this.storageManager = new VaultStorageManager({
      getRootHandle: () =>
        vaultRegistry.rootHandle as FileSystemDirectoryHandle | undefined,
    });

    const loader = new EntityContentLoader({
      repository: this.repository,
      activeVaultId: () => this.activeVaultId,
      isGuest: () => this.isGuest,
      getGuestFile: (path) => p2pGuestService.getFile(path),
      getActiveVaultHandle: () => this.getActiveVaultHandle(),
      getActiveFolderHandle: () => this.getActiveFolderHandle(),
    });

    this.syncStore = new SyncStore({
      activeVaultId: () => this.activeVaultId,
      activeVaultRecord: () => this.activeVaultRecord,
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
      getActiveFolderHandle: () => this.getActiveFolderHandle(),
      ensureServicesInitialized: async () => {
        await this.serviceRegistry.ensureInitialized();
      },
      loadMaps: (vId) => mapRegistry.loadFromVault(vId),
      loadCanvases: (vId) => canvasRegistry.loadFromVault(vId),
      loadPublishRegistry: (vId, handle) =>
        this.publishRegistry.load(vId, handle),
      updateEntityCount: (vId, count) =>
        vaultRegistry.updateEntityCount(vId, count),
      flushPendingSaves: (timeoutMs) =>
        this.entityStore?.flushPendingSaves(timeoutMs),
    });

    const persistence = new EntityPersistenceService({
      repository: this.repository,
      activeVaultId: () => this.activeVaultId,
      isGuest: () => this.isGuest,
      getSpecificVaultHandle: (vId) => this.getSpecificVaultHandle(vId),
      setStatus: (s) => this.syncStore.setStatus(s),
      status: () => this.syncStore.status,
      setErrorMessage: (m) => this.syncStore.setErrorMessage(m),
      onEntityUpdate: (entity) => this.onEntityUpdate?.(entity),
      isContentLoaded: (id) => loader.isContentLoaded(id),
      loadContent: (id) => loader.internalLoadContent(id),
      markContentLoaded: (id) => loader.markContentLoaded(id),
    });

    const mutations = new EntityMutationService({
      performanceRecorder: browserPerformanceRecorder,
      repository: this.repository,
      persistence,
      loader,
      activeVaultId: () => this.activeVaultId,
      isGuest: () => this.isGuest,
      getActiveVaultHandle: () => this.getActiveVaultHandle(),
      getActiveFolderHandle: () => this.getActiveFolderHandle(),
      getServices: () => this.services,
      invalidateUrlCache: (path) => this.releaseImageUrl(path),
      onEntityDelete: (id) => this.onEntityDelete?.(id),
      onBatchUpdate: (updates) => this.onBatchUpdate?.(updates),
      updateEntityCount: (vId, count) =>
        vaultRegistry.updateEntityCount(vId, count),
    });

    this.entityStore = new EntityStore(
      this.repository,
      loader,
      persistence,
      mutations,
    );

    this.deadImagePruner = new DeadExternalImagePruner({
      getEntities: () => this.entityStore.entities,
      isWritable: () =>
        !sessionModeStore.isGuestMode &&
        !sessionModeStore.isDemoMode &&
        !this.isGuest &&
        !this.demoVaultName &&
        !!this.activeVaultId,
      updateEntities: (updates) => this.entityStore.batchUpdate(updates),
    });

    this.assetManager.setOnDeadExternalImage((url) => {
      this.deadImagePruner.add(url);
    });

    this.assetStore = new AssetStore({
      assetManager: this.assetManager,
      getActiveVaultHandle: () => this.getActiveVaultHandle(),
      getActiveFolderHandle: () => this.getActiveFolderHandle(),
      isGuest: () => this.isGuest,
    });
    this.fileStore = new FileStore({
      fileManager: this.fileManager,
      getActiveVaultHandle: () => this.getActiveVaultHandle(),
      isGuest: () => this.isGuest,
    });

    this.lifecycleManager = new VaultLifecycleManager({
      syncStore: this.syncStore,
      assetStore: this.assetStore,
      repository: this.repository,
      activeVaultId: () => this.activeVaultId,
      getActiveVaultHandle: () => this.getActiveVaultHandle(),
      getActiveFolderHandle: () => this.getActiveFolderHandle(),
      loadFiles: (skipSync) => this.loadFiles(skipSync),
      flushPendingSaves: () => this.entityStore.flushPendingSaves(),
      ensureServicesInitialized: async () => {
        await this.serviceRegistry.ensureInitialized();
      },
      clearStorageCache: () => this.storageManager.clearCache(),
      getEntities: () => this.entityStore.entities,
      setDemoVaultName: (n) => (this.demoVaultName = n),
      setInitialized: (v) => (this.isInitialized = v),
      rebuildEntityIndexes: () => {
        this.entityStore.initializeInboundConnections();
        this.entityStore.rebuildIndexes();
      },
      getServices: () => this.services,
      setSelectedEntityId: (id) => (this.selectedEntityId = id),
      vaultRegistry,
      themeStore,
      mapRegistry,
      canvasRegistry,
      ensureAssetPersisted: (path, handle) =>
        this.ensureAssetPersisted(path, handle),
    });

    this.bootstrap = new VaultBootstrap(this, this.lifecycleManager);

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
    return this.bootstrap.init();
  }

  // --- External Folder Methods ---

  broadcastVaultUpdate() {
    this.messenger.broadcastVaultUpdate();
  }

  async loadFiles(skipSyncIfWarm = true) {
    return this.syncStore.loadFiles(skipSyncIfWarm);
  }

  async loadFromFolder() {
    return this.syncStore.loadFromFolder();
  }

  /** Discards the fast-start cache and re-reads the vault from OPFS (#2619). */
  async reloadFromDisk() {
    return this.syncStore.reloadFromDisk();
  }

  async saveToFolder() {
    return this.syncStore.saveToFolder();
  }

  async cleanupConflictFiles(signal?: AbortSignal) {
    return this.syncStore.cleanupConflictFiles(signal);
  }

  async checkForConflicts(signal?: AbortSignal) {
    return this.syncStore.checkForConflicts(signal);
  }

  // --- Entity Management (Delegated) ---

  loadEntityContent(id: string): Promise<void> {
    return this.entityStore.loadEntityContent(id);
  }

  /**
   * Whether an entity's full markdown body is in memory. Callers that persist
   * or transmit a vault need this: until it is true, `content` may only be the
   * cached preview.
   */
  isContentLoaded(id: string): boolean {
    if (sessionModeStore.isGuestMode) return true;
    return this.entityStore.isContentLoaded(id);
  }

  /** Whether an entity's full body has been checked against its source. */
  isContentVerified(id: string): boolean {
    return this.entityStore.isContentVerified(id);
  }

  /**
   * Reads an entity with its full body without writing it into the store.
   * For whole-vault snapshots; see `EntityContentLoader.readFullEntity`.
   */
  readFullEntity(id: string): Promise<LocalEntity | null> {
    return this.entityStore.readFullEntity(id);
  }
  createEntity(
    type: Entity["type"],
    title: string,
    initialData: Partial<Entity> = {},
  ) {
    // Auto-apply the vault's configured default stat sheet template for this
    // category, unless the caller already supplied one (e.g. duplicating an
    // entity, or an import that carries its own statSheet).
    if (!initialData.statSheet) {
      const defaultFields =
        statSheetTemplates.getDefaultFieldsForCategory(type);
      if (defaultFields) {
        initialData = {
          ...initialData,
          statSheet: { templateId: null, fields: defaultFields },
        };
      }
    }
    return this.entityStore.createEntity(type, title, initialData);
  }
  updateEntity(id: string, updates: Partial<LocalEntity>) {
    const linkedImage = sessionModeStore.isGuestMode
      ? null
      : linksNewExternalImage(this.entities[id]?.image, updates);
    const result = this.entityStore.updateEntity(id, updates);
    if (linkedImage) {
      // One at a time: a re-import can relink hundreds of images, and each
      // copy converts to WebP on the main thread.
      this.imageLocalization = this.imageLocalization
        .then(() => result)
        .then(() =>
          localizeExternalImage(
            {
              getEntity: (entityId) => this.entities[entityId],
              importExternalImage: (url, entityId) =>
                this.assetStore.importExternalImage(url, entityId),
              updateEntity: (entityId, patch) =>
                this.entityStore.updateEntity(entityId, patch),
            },
            id,
            linkedImage,
          ),
        ) // A failed save or copy must not stall the images queued after it.
        .catch((error) =>
          console.warn("[Vault] Could not copy linked image", error),
        );
    }
    return result;
  }
  batchUpdate(updates: Record<string, Partial<LocalEntity>>) {
    return this.entityStore.batchUpdate(updates);
  }
  bulkUpdate(
    updates: Record<string, Partial<LocalEntity>>,
  ): Promise<BulkMutationResult> {
    return this.entityStore.bulkUpdate(updates);
  }
  deleteEntity(id: string) {
    return this.entityStore.deleteEntity(id);
  }
  bulkDelete(ids: string[]): Promise<BulkMutationResult> {
    return this.entityStore.bulkDelete(ids);
  }
  /**
   * Freeform relationship phrases like "Mother of" are redirected to a real
   * family link (reciprocal write + cycle check) instead of a one-sided
   * generic connection, so text typed outside the Family tab (Related Entity
   * modal, AI-generated connections) still surfaces in Family/Lineage views.
   * Only applies between two characters and when `type` isn't already a
   * family type, so it can never re-trigger on the family link it writes.
   */
  async addConnection(
    sId: string,
    tId: string,
    type: string,
    label?: string,
    strength?: number,
  ) {
    if (!isFamilyType(type) && label) {
      const alias = resolveFamilyAlias(label);
      if (
        alias &&
        this.entities[sId]?.type === "character" &&
        this.entities[tId]?.type === "character"
      ) {
        const result = await this.addFamilyLink(sId, tId, alias.type);
        if (!result.ok) return false;
        // Best-effort: the family link itself is already written and
        // correct at this point, so a failure to attach the display term
        // (e.g. "Mother") must not report the whole redirect as failed.
        try {
          const labelled = await this.updateConnection(
            sId,
            tId,
            alias.type,
            alias.type,
            alias.label,
          );
          if (labelled === false) {
            console.warn(
              `addConnection: family link ${sId}->${tId} (${alias.type}) created, but attaching its display label "${alias.label}" failed.`,
            );
          }
        } catch (err) {
          console.warn(
            `addConnection: family link ${sId}->${tId} (${alias.type}) created, but attaching its display label "${alias.label}" threw.`,
            err,
          );
        }
        return true;
      }
    }
    return this.entityStore.addConnection(sId, tId, type, label, strength);
  }
  setConnectionHidden(sId: string, tId: string, type: string, hidden: boolean) {
    return this.entityStore.setConnectionHidden(sId, tId, type, hidden);
  }
  removeConnection(sId: string, tId: string, type: string) {
    return this.entityStore.removeConnection(sId, tId, type);
  }
  /** Add a family link, writing both sides and blocking circular ancestry. */
  addFamilyLink(
    sId: string,
    tId: string,
    type: FamilyConnectionType,
    targetLabel?: string,
  ) {
    return addFamilyLinkMutation(sId, tId, type, targetLabel, this);
  }
  /** Remove a family link from both entities. */
  removeFamilyLink(sId: string, tId: string, type: FamilyConnectionType) {
    return removeFamilyLinkMutation(sId, tId, type, this);
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
  /** Renames a label on every entity that has it; returns how many changed. */
  renameLabel(from: string, to: string) {
    return this.entityStore.renameLabel(from, to);
  }
  /** Removes a label from every entity that has it; returns how many changed. */
  deleteLabel(label: string) {
    return this.entityStore.deleteLabel(label);
  }
  batchCreateEntities(newEntitiesList: BatchCreateInput[]) {
    return this.entityStore.batchCreateEntities(newEntitiesList);
  }

  // --- Save Coordination ---

  scheduleSave(entity: LocalEntity | Entity) {
    return this.entityStore.scheduleSave(entity);
  }

  // --- Asset Management (Delegated) ---

  resolveImageUrl(
    path: string,
    fetcher?: (path: string) => Promise<Blob>,
  ): Promise<string> {
    if (sessionModeStore.isGuestMode) {
      return Promise.resolve(guestVault.resolveImageUrl(path) || "");
    }
    return this.assetStore.resolveImageUrl(path, fetcher);
  }
  releaseImageUrl(path: string) {
    this.assetStore.releaseImageUrl(path);
  }
  /** A small version of an image for dense views such as the graph. */
  resolveThumbnailUrl(path: string): Promise<string> {
    if (sessionModeStore.isGuestMode) {
      return Promise.resolve(guestVault.resolveImageUrl(path) || "");
    }
    return this.assetStore.resolveThumbnailUrl(path);
  }
  releaseThumbnailUrl(path: string) {
    if (sessionModeStore.isGuestMode) return;
    this.assetStore.releaseThumbnailUrl(path);
  }
  saveImageToVault(blob: Blob | File, entityId: string, name?: string) {
    return this.assetStore.saveImageToVault(blob, entityId, name);
  }
  importFileToVault(file: File) {
    return this.fileStore.importFile(file);
  }
  ensureAssetPersisted(path: string, handle: FileSystemDirectoryHandle) {
    return this.assetStore.ensureAssetPersisted(path, handle);
  }

  // --- Handle Management ---

  getActiveVaultHandle() {
    return this.storageManager.getActiveVaultHandle(this.activeVaultId);
  }
  getActiveFolderHandle() {
    return this.storageManager.getActiveFolderHandle(this.activeVaultId);
  }
  getSpecificVaultHandle(vaultId: string) {
    return this.storageManager.getSpecificVaultHandle(vaultId);
  }

  // --- Map & Canvas Delegations ---
  saveMaps() {
    return mapRegistry.saveMaps().then(() => undefined);
  }
  saveMapsWithResult() {
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
    onboardingFunnel.track("vault_created");
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

  async saveTranscript(transcript: GuestChatTranscript) {
    return this.transcripts.saveTranscript(transcript);
  }

  async loadTranscriptsForCharacter(
    characterId: string,
  ): Promise<GuestChatTranscript[]> {
    return this.transcripts.loadTranscriptsForCharacter(characterId);
  }

  async deleteTranscript(guestId: string, characterId: string) {
    return this.transcripts.deleteTranscript(guestId, characterId);
  }

  async setDefaultVisibility(v: "visible" | "hidden") {
    this.defaultVisibility = v;
    const db = await getDB();
    await db.put("settings", v, "defaultVisibility");
  }

  async flushPendingSaves(timeoutMs?: number): Promise<void> {
    await this.entityStore?.flushPendingSaves(timeoutMs);
    this.broadcastVaultUpdate();
  }

  suspendSaving() {
    this.entityStore?.suspendSaving();
  }

  resumeSaving() {
    this.entityStore?.resumeSaving();
  }
}

const VAULT_KEY = "__codex_vault_instance__";

export const vault: VaultStore =
  (globalThis as any)[VAULT_KEY] ??
  ((globalThis as any)[VAULT_KEY] = new VaultStore());

if (
  typeof window !== "undefined" &&
  (import.meta.env.DEV ||
    (globalThis as { __CODEX_PERFORMANCE_CAPTURE__?: boolean })
      .__CODEX_PERFORMANCE_CAPTURE__ === true)
) {
  (window as any).vault = vault;
  debugStore.log("[VaultStore] Module loaded, vault attached to window");
}
