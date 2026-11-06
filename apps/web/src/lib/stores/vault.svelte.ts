import { getVaultSingleton } from "./vault/singleton";
import { VaultAssetAccess } from "./vault/asset-access";
import { composeVault } from "./vault/composition";
import { VaultEntityEditing } from "./vault/entity-editing";
import { VaultConnectionRouting } from "./vault/connection-routing";
import { VaultViews } from "./vault/vault-views";
import { VaultBootstrap } from "./vault/bootstrap";
import { VaultTranscripts } from "./vault/transcripts";
import { PublishRegistryLoader } from "./vault/publish-registry-loader";
import { vaultRegistry } from "./vault-registry.svelte";
import { mapRegistry } from "./map-registry.svelte";
import { canvasRegistry } from "./canvas-registry.svelte";
import type { LocalEntity, BatchCreateInput } from "./vault/types";
import type { Entity, GuestChatTranscript } from "schema";
import type { BulkMutationResult } from "./vault/bulk-results";
import { getDB } from "../utils/idb";
import type { VaultLifecycleManager } from "./vault/lifecycle";
import type { EntityStore } from "./vault/entity-store.svelte";
import {
  addFamilyLink as addFamilyLinkMutation,
  removeFamilyLink as removeFamilyLinkMutation,
} from "./vault/family-mutations";
import type { FamilyConnectionType } from "@codex/family-engine";
import type { SyncStore } from "./vault/sync-store.svelte";
import type { AssetStore } from "./vault/asset-store.svelte";
import type { FileStore } from "./vault/file-store.svelte";
import type { ServiceRegistry } from "./vault/service-registry";
import type { SearchStore } from "./vault/search-store.svelte";
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
} from "./vault/adapters.svelte";

import type { VaultMessenger } from "./vault/messenger";
import type { VaultStorageManager } from "./vault/storage";
import { sessionModeStore } from "#lib/stores/ui/session-mode.svelte.js";
import { guestVault } from "./guest-vault.svelte";
import { onboardingFunnel } from "#lib/app/onboarding/onboarding-funnel.js";
import type { DeadExternalImagePruner } from "./vault/dead-external-image-pruner";

export class VaultStore {
  // Reactive State
  _isInitialized = $state(false);
  get isInitialized() {
    if (this.views.isPublishedGuest) return this.views.isGuestInitialized;
    return this._isInitialized;
  }
  set isInitialized(v: boolean) {
    this._isInitialized = v;
  }
  selectedEntityId = $state<string | null>(null);
  demoVaultName = $state<string | null>(null);
  migrationRequired = $state(false);
  defaultVisibility = $state<"visible" | "hidden">("visible");

  // Callbacks
  onEntityUpdate?: (entity: LocalEntity) => void;
  onEntityDelete?: (entityId: string) => void;
  onBatchUpdate?: (updates: Record<string, Partial<LocalEntity>>) => void;

  // Public stores are initialized synchronously by composeVault.
  public entityStore!: EntityStore;
  public syncStore!: SyncStore;
  public assetStore!: AssetStore;
  public fileStore!: FileStore;
  public serviceRegistry!: ServiceRegistry;
  public searchStore!: SearchStore;
  public deadImagePruner!: DeadExternalImagePruner;
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
    if (this.views.isPublishedGuest)
      return this.views.isGuestInitialized ? "idle" : "loading";
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
  private assetAccess = new VaultAssetAccess({
    isGuest: () => this.isGuest,
    resolveGuestImage: (path) => guestVault.resolveImageUrl(path),
    assets: () => this.assetStore,
  });
  private entityEditing = new VaultEntityEditing(this);
  private connectionRouting = new VaultConnectionRouting(this);

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
    const { storage, lifecycle, messenger } = composeVault(
      this,
      this.assetManager,
      this.fileManager,
      this.publishRegistry,
    );
    this.storageManager = storage;
    this.lifecycleManager = lifecycle;
    this.messenger = messenger;
    this.bootstrap = new VaultBootstrap(this, lifecycle);
  }

  async init() {
    return this.bootstrap.init();
  }

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
    return this.entityEditing.createEntity(type, title, initialData);
  }
  updateEntity(id: string, updates: Partial<LocalEntity>) {
    return this.entityEditing.updateEntity(id, updates);
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
  /** Redirect character family phrases to reciprocal, cycle-checked links. */
  async addConnection(
    sId: string,
    tId: string,
    type: string,
    label?: string,
    strength?: number,
  ) {
    return this.connectionRouting.addConnection(
      sId,
      tId,
      type,
      label,
      strength,
    );
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

  scheduleSave(entity: LocalEntity | Entity) {
    return this.entityStore.scheduleSave(entity);
  }

  resolveImageUrl(
    path: string,
    fetcher?: (path: string) => Promise<Blob>,
  ): Promise<string> {
    return this.assetAccess.resolveImageUrl(path, fetcher);
  }
  releaseImageUrl(path: string) {
    this.assetAccess.releaseImageUrl(path);
  }
  /** A small version of an image for dense views such as the graph. */
  resolveThumbnailUrl(path: string): Promise<string> {
    return this.assetAccess.resolveThumbnailUrl(path);
  }
  releaseThumbnailUrl(path: string) {
    this.assetAccess.releaseThumbnailUrl(path);
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

  getActiveVaultHandle() {
    return this.storageManager.getActiveVaultHandle(this.activeVaultId);
  }
  getActiveFolderHandle() {
    return this.storageManager.getActiveFolderHandle(this.activeVaultId);
  }
  getSpecificVaultHandle(vaultId: string) {
    return this.storageManager.getSpecificVaultHandle(vaultId);
  }

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

export const vault: VaultStore = getVaultSingleton(() => new VaultStore());
