import { base } from "$app/paths";
import { vaultRegistry } from "./vault-registry.svelte";
import { mapRegistry } from "./map-registry.svelte";
import { canvasRegistry } from "./canvas-registry.svelte";
import { themeStore } from "./theme.svelte";
import { debugStore } from "./debug.svelte";
import type { LocalEntity, BatchCreateInput } from "./vault/types";
import type { Entity, GuestChatTranscript } from "schema";
import {
  saveTranscriptToDisk,
  loadTranscriptsForCharacterFromDisk,
} from "./vault/io";
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
import { p2pGuestService } from "../cloud-bridge/p2p/guest-service";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
import { guestVault } from "./guest-vault.svelte";
import { onboardingFunnel } from "$lib/app/onboarding/onboarding-funnel";

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
    if (sessionModeStore.isGuestMode) {
      return guestVault.entitiesMap;
    }
    return this.entityStore.entities;
  }
  get allEntities() {
    if (sessionModeStore.isGuestMode) {
      return guestVault.entities;
    }
    return this.entityStore.allEntities;
  }
  get graphEntities() {
    if (sessionModeStore.isGuestMode) {
      return guestVault.entities;
    }
    return this.entityStore.graphEntities;
  }
  get graphStructureVersion() {
    if (sessionModeStore.isGuestMode) {
      return guestVault.entities.length;
    }
    return this.entityStore.graphStructureVersion;
  }
  get titleAndAliasIndex() {
    if (sessionModeStore.isGuestMode) {
      const result: Array<{
        lowercaseText: string;
        entityId: string;
        actualTitle: string;
        isAlias: boolean;
        visibility?: string;
        labels?: string[];
        status: string;
      }> = [];
      for (const entity of guestVault.entities) {
        result.push({
          lowercaseText: entity.title.toLowerCase(),
          entityId: entity.id,
          actualTitle: entity.title,
          isAlias: false,
          visibility: entity.visibility,
          labels: entity.labels,
          status: entity.status || "active",
        });
        for (const alias of entity.aliases || []) {
          if (!alias) continue;
          result.push({
            lowercaseText: alias.toLowerCase(),
            entityId: entity.id,
            actualTitle: entity.title,
            isAlias: true,
            visibility: entity.visibility,
            labels: entity.labels,
            status: entity.status || "active",
          });
        }
      }
      return result.sort(
        (a, b) => b.lowercaseText.length - a.lowercaseText.length,
      );
    }
    return this.entityStore.titleAndAliasIndex;
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
    if (sessionModeStore.isGuestMode) {
      const newInboundMap: Record<
        string,
        { sourceId: string; connection: any }[]
      > = Object.create(null);
      for (const rel of guestVault.relationships) {
        if (!newInboundMap[rel.targetId]) {
          newInboundMap[rel.targetId] = [];
        }
        newInboundMap[rel.targetId].push({
          sourceId: rel.sourceId,
          connection: {
            target: rel.targetId,
            type: rel.label || "neutral",
            label: rel.label,
          },
        });
      }
      return newInboundMap;
    }
    return this.entityStore.inboundConnections;
  }
  get labelIndex() {
    if (sessionModeStore.isGuestMode) {
      const labels = new Set<string>();
      for (const e of guestVault.entities) {
        if (e.labels) {
          for (const l of e.labels) {
            labels.add(l);
          }
        }
      }
      return Array.from(labels).sort();
    }
    return this.entityStore.labelIndex;
  }
  get labelCounts() {
    if (sessionModeStore.isGuestMode) {
      const counts: Record<string, number> = {};
      for (const e of guestVault.entities) {
        if (e.labels) {
          const uniqueLabels = new Set(e.labels);
          for (const l of uniqueLabels) {
            counts[l] = (counts[l] || 0) + 1;
          }
        }
      }
      return counts;
    }
    return this.entityStore.labelCounts;
  }
  get maps() {
    if (sessionModeStore.isGuestMode) {
      const record: Record<string, any> = Object.create(null);
      for (const m of guestVault.maps) {
        record[m.id] = m;
      }
      return record;
    }
    return mapRegistry.maps;
  }
  get allMaps() {
    if (sessionModeStore.isGuestMode) {
      return guestVault.maps;
    }
    return mapRegistry.allMaps;
  }
  get canvases() {
    if (sessionModeStore.isGuestMode) {
      const record: Record<string, any> = Object.create(null);
      for (const c of guestVault.canvases) {
        record[c.id] = c;
      }
      return record;
    }
    return canvasRegistry.canvases;
  }
  get activeVaultId() {
    if (sessionModeStore.isGuestMode) {
      return guestVault.publishId;
    }
    return vaultRegistry.activeVaultId;
  }
  get activeVaultRecord() {
    return vaultRegistry.activeVaultRecord;
  }
  get vaultName() {
    if (sessionModeStore.isGuestMode) {
      return guestVault.vaultTitle;
    }
    return vaultRegistry.vaultName;
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
      loadPublishRegistry: async (vId, handle) => {
        const { publishingService } =
          await import("../services/publishing/PublishingService.svelte");
        await publishingService.loadFromVault(vId, handle);
      },
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

    this.assetStore = new AssetStore({
      assetManager: this.assetManager,
      getActiveVaultHandle: () => this.getActiveVaultHandle(),
      getActiveFolderHandle: () => this.getActiveFolderHandle(),
      isGuest: () => this.isGuest,
    });

    this.lifecycleManager = new VaultLifecycleManager({
      syncStore: this.syncStore,
      assetStore: this.assetStore,
      repository: this.repository,
      activeVaultId: () => this.activeVaultId,
      getActiveVaultHandle: () => this.getActiveVaultHandle(),
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
    // Guest popout tabs pre-populate the vault via applyGuestPayload before
    // this runs — skip full init so loadFiles() doesn't overwrite that data.
    if (sessionModeStore.isGuestMode) {
      this.isInitialized = true;
      return;
    }

    try {
      await vaultRegistry.init();

      const db = await getDB();
      const pref = await db.get("settings", "defaultVisibility");
      if (pref) this.defaultVisibility = pref as any;

      if (sessionModeStore.isDemoMode) {
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

      sessionModeStore.isGuestMode = true;
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
  getActiveFolderHandle() {
    return this.storageManager.getActiveFolderHandle(this.activeVaultId);
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
    if (this.isGuest) return;
    if (!this.activeVaultId) return;
    const vaultHandle = await this.getActiveVaultHandle();
    if (!vaultHandle) return;
    await saveTranscriptToDisk(vaultHandle, this.activeVaultId, transcript);
  }

  async loadTranscriptsForCharacter(
    characterId: string,
  ): Promise<GuestChatTranscript[]> {
    const vaultHandle = await this.getActiveVaultHandle();
    if (!vaultHandle) return [];
    return await loadTranscriptsForCharacterFromDisk(vaultHandle, characterId);
  }

  async deleteTranscript(guestId: string, characterId: string) {
    if (this.isGuest) return;
    const vaultHandle = await this.getActiveVaultHandle();
    if (!vaultHandle) return;
    try {
      const codexDir = await vaultHandle.getDirectoryHandle(".codex", {
        create: true,
      });
      const transcriptsDir = await codexDir.getDirectoryHandle("transcripts", {
        create: true,
      });
      await transcriptsDir.removeEntry(`${guestId}_${characterId}.json`);
    } catch (err) {
      console.warn("[VaultStore] Failed to delete transcript file:", err);
    }
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

if (typeof window !== "undefined" && import.meta.env.DEV) {
  (window as any).vault = vault;
  debugStore.log("[VaultStore] Module loaded, vault attached to window");
}
