import { AssetStore } from "./asset-store.svelte";
import { FileStore } from "./file-store.svelte";
import { ServiceRegistry } from "./service-registry";
import { SearchStore } from "./search-store.svelte";
import { VaultMessenger } from "./messenger";
import { VaultStorageManager } from "./storage";
import type { AssetManager, FileManager } from "@codex/vault-engine";
import type { VaultStore } from "../vault.svelte";
import type { PublishRegistryLoader } from "./publish-registry-loader";
import { VaultLifecycleManager } from "./lifecycle";
import { EntityStore } from "./entity-store.svelte";
import { EntityContentLoader } from "./entity-content-loader.svelte";
import { EntityPersistenceService } from "./entity-persistence";
import { EntityMutationService } from "./entity-mutations";
import { SyncStore } from "./sync-store.svelte";
import { SyncCoordinator } from "@codex/vault-engine";
import {
  createSyncEngine,
  syncIOAdapter,
  syncNotifier,
} from "./adapters.svelte";
import { DeadExternalImagePruner } from "./dead-external-image-pruner";
import { vaultRegistry } from "../vault-registry.svelte";
import { mapRegistry } from "../map-registry.svelte";
import { canvasRegistry } from "../canvas-registry.svelte";
import { themeStore } from "../theme.svelte";
import { sessionModeStore } from "../ui/session-mode.svelte";
import { p2pGuestService } from "../../cloud-bridge/p2p/guest-service";
import { browserPerformanceRecorder } from "../../services/performance/browser-performance-capture";

type CompositionVault = Pick<
  VaultStore,
  | "searchStore"
  | "fileStore"
  | "deadImagePruner"
  | "broadcastVaultUpdate"
  | "repository"
  | "activeVaultId"
  | "activeVaultRecord"
  | "isGuest"
  | "serviceRegistry"
  | "syncCoordinator"
  | "syncStore"
  | "entityStore"
  | "assetStore"
  | "getActiveVaultHandle"
  | "getActiveFolderHandle"
  | "getSpecificVaultHandle"
  | "services"
  | "onEntityUpdate"
  | "onEntityDelete"
  | "onBatchUpdate"
  | "releaseImageUrl"
  | "demoVaultName"
  | "isInitialized"
  | "selectedEntityId"
  | "loadFiles"
  | "ensureAssetPersisted"
>;

/** Wire live callbacks rather than capturing mutable facade state at construction. */
export function createVaultSyncStore(
  vault: CompositionVault,
  publishRegistry: PublishRegistryLoader,
): SyncStore {
  return new SyncStore({
    activeVaultId: () => vault.activeVaultId,
    activeVaultRecord: () => vault.activeVaultRecord,
    repository: vault.repository,
    getSyncCoordinator: async () => {
      await vault.serviceRegistry.ensureInitialized();
      if (!vault.syncCoordinator) {
        const engine = await createSyncEngine();
        vault.syncCoordinator = new SyncCoordinator(
          syncIOAdapter,
          engine,
          syncNotifier,
        );
      }
      return vault.syncCoordinator;
    },
    getActiveVaultHandle: () => vault.getActiveVaultHandle(),
    getActiveFolderHandle: () => vault.getActiveFolderHandle(),
    ensureServicesInitialized: async () => {
      await vault.serviceRegistry.ensureInitialized();
    },
    loadMaps: (vId) => mapRegistry.loadFromVault(vId),
    loadCanvases: (vId) => canvasRegistry.loadFromVault(vId),
    loadPublishRegistry: (vId, handle) => publishRegistry.load(vId, handle),
    updateEntityCount: (vId, count) =>
      vaultRegistry.updateEntityCount(vId, count),
    flushPendingSaves: (timeoutMs) =>
      vault.entityStore?.flushPendingSaves(timeoutMs),
  });
}

export function createVaultEntityStore(vault: CompositionVault): EntityStore {
  const loader = new EntityContentLoader({
    repository: vault.repository,
    activeVaultId: () => vault.activeVaultId,
    isGuest: () => vault.isGuest,
    getGuestFile: (path) => p2pGuestService.getFile(path),
    getActiveVaultHandle: () => vault.getActiveVaultHandle(),
    getActiveFolderHandle: () => vault.getActiveFolderHandle(),
  });

  const persistence = new EntityPersistenceService({
    repository: vault.repository,
    activeVaultId: () => vault.activeVaultId,
    isGuest: () => vault.isGuest,
    getSpecificVaultHandle: (vId) => vault.getSpecificVaultHandle(vId),
    setStatus: (s) => vault.syncStore.setStatus(s),
    status: () => vault.syncStore.status,
    setErrorMessage: (m) => vault.syncStore.setErrorMessage(m),
    onEntityUpdate: (entity) => vault.onEntityUpdate?.(entity),
    isContentLoaded: (id) => loader.isContentLoaded(id),
    loadContent: (id) => loader.internalLoadContent(id),
    markContentLoaded: (id) => loader.markContentLoaded(id),
  });

  const mutations = new EntityMutationService({
    performanceRecorder: browserPerformanceRecorder,
    repository: vault.repository,
    persistence,
    loader,
    activeVaultId: () => vault.activeVaultId,
    isGuest: () => vault.isGuest,
    getActiveVaultHandle: () => vault.getActiveVaultHandle(),
    getActiveFolderHandle: () => vault.getActiveFolderHandle(),
    getServices: () => vault.services,
    invalidateUrlCache: (path) => vault.releaseImageUrl(path),
    onEntityDelete: (id) => vault.onEntityDelete?.(id),
    onBatchUpdate: (updates) => vault.onBatchUpdate?.(updates),
    updateEntityCount: (vId, count) =>
      vaultRegistry.updateEntityCount(vId, count),
  });

  return new EntityStore(vault.repository, loader, persistence, mutations);
}

export function createVaultImagePruner(
  vault: CompositionVault,
): DeadExternalImagePruner {
  return new DeadExternalImagePruner({
    getEntities: () => vault.entityStore.entities,
    isWritable: () =>
      !sessionModeStore.isGuestMode &&
      !sessionModeStore.isDemoMode &&
      !vault.isGuest &&
      !vault.demoVaultName &&
      !!vault.activeVaultId,
    updateEntities: (updates) => vault.entityStore.batchUpdate(updates),
  });
}

export function createVaultLifecycle(
  vault: CompositionVault,
  storage: VaultStorageManager,
): VaultLifecycleManager {
  return new VaultLifecycleManager({
    syncStore: vault.syncStore,
    assetStore: vault.assetStore,
    repository: vault.repository,
    activeVaultId: () => vault.activeVaultId,
    getActiveVaultHandle: () => vault.getActiveVaultHandle(),
    getActiveFolderHandle: () => vault.getActiveFolderHandle(),
    loadFiles: (skipSync) => vault.loadFiles(skipSync),
    flushPendingSaves: () => vault.entityStore.flushPendingSaves(),
    ensureServicesInitialized: async () => {
      await vault.serviceRegistry.ensureInitialized();
    },
    clearStorageCache: () => storage.clearCache(),
    getEntities: () => vault.entityStore.entities,
    setDemoVaultName: (n) => (vault.demoVaultName = n),
    setInitialized: (v) => (vault.isInitialized = v),
    rebuildEntityIndexes: () => {
      vault.entityStore.initializeInboundConnections();
      vault.entityStore.rebuildIndexes();
    },
    getServices: () => vault.services,
    setSelectedEntityId: (id) => (vault.selectedEntityId = id),
    vaultRegistry,
    themeStore,
    mapRegistry,
    canvasRegistry,
    ensureAssetPersisted: (path, handle) =>
      vault.ensureAssetPersisted(path, handle),
  });
}

export function composeVault(
  vault: CompositionVault,
  assetManager: AssetManager,
  fileManager: FileManager,
  publishRegistry: PublishRegistryLoader,
) {
  vault.serviceRegistry = new ServiceRegistry();
  vault.searchStore = new SearchStore(vault.serviceRegistry);
  const storage = new VaultStorageManager({
    getRootHandle: () =>
      vaultRegistry.rootHandle as FileSystemDirectoryHandle | undefined,
  });

  vault.syncStore = createVaultSyncStore(vault, publishRegistry);
  vault.entityStore = createVaultEntityStore(vault);

  vault.deadImagePruner = createVaultImagePruner(vault);
  assetManager.setOnDeadExternalImage((url) => {
    vault.deadImagePruner.add(url);
  });

  vault.assetStore = new AssetStore({
    assetManager: assetManager,
    getActiveVaultHandle: () => vault.getActiveVaultHandle(),
    getActiveFolderHandle: () => vault.getActiveFolderHandle(),
    isGuest: () => vault.isGuest,
  });
  vault.fileStore = new FileStore({
    fileManager: fileManager,
    getActiveVaultHandle: () => vault.getActiveVaultHandle(),
    isGuest: () => vault.isGuest,
  });

  const lifecycle = createVaultLifecycle(vault, storage);

  const messenger = new VaultMessenger({
    activeVaultId: () => vault.activeVaultId,
    loadFiles: () => vault.loadFiles(),
    broadcastCallback: () => vault.broadcastVaultUpdate(),
  });

  mapRegistry.init(vault.repository.saveQueue);
  canvasRegistry.init(vault.repository.saveQueue);
  return { storage, lifecycle, messenger };
}
