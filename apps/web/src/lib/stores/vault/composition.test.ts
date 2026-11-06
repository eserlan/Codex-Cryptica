import { beforeEach, describe, expect, it, vi } from "vitest";
import { composeVault } from "./composition";
import { SyncStore } from "./sync-store.svelte";
import { EntityContentLoader } from "./entity-content-loader.svelte";
import { EntityPersistenceService } from "./entity-persistence";
import { EntityMutationService } from "./entity-mutations";
import { VaultLifecycleManager } from "./lifecycle";
import { DeadExternalImagePruner } from "./dead-external-image-pruner";
import { VaultMessenger } from "./messenger";
import { AssetStore } from "./asset-store.svelte";
import { FileStore } from "./file-store.svelte";
import { VaultStorageManager } from "./storage";
import { ServiceRegistry } from "./service-registry";
import { createSyncEngine } from "./adapters.svelte";
import { sessionModeStore } from "../ui/session-mode.svelte";
import { p2pGuestService } from "../../cloud-bridge/p2p/guest-service";
import { vaultRegistry } from "../vault-registry.svelte";
import { mapRegistry } from "../map-registry.svelte";
import { canvasRegistry } from "../canvas-registry.svelte";
import type { AssetManager, FileManager } from "@codex/vault-engine";
import type { PublishRegistryLoader } from "./publish-registry-loader";
import type { LocalEntity } from "./types";

vi.mock("./sync-store.svelte", () => ({
  SyncStore: vi.fn(
    class {
      status = "idle";
      setStatus = vi.fn();
      setErrorMessage = vi.fn();
    },
  ),
}));
vi.mock("./entity-content-loader.svelte", () => ({
  EntityContentLoader: vi.fn(
    class {
      isContentLoaded = vi.fn();
      internalLoadContent = vi.fn();
      markContentLoaded = vi.fn();
    },
  ),
}));
vi.mock("./entity-persistence", () => ({
  EntityPersistenceService: vi.fn(class {}),
}));
vi.mock("./entity-mutations", () => ({
  EntityMutationService: vi.fn(class {}),
}));
vi.mock("./entity-store.svelte", () => ({
  EntityStore: vi.fn(
    class {
      entities = {};
      batchUpdate = vi.fn();
      flushPendingSaves = vi.fn();
      initializeInboundConnections = vi.fn();
      rebuildIndexes = vi.fn();
    },
  ),
}));
vi.mock("./lifecycle", () => ({ VaultLifecycleManager: vi.fn(class {}) }));
vi.mock("./dead-external-image-pruner", () => ({
  DeadExternalImagePruner: vi.fn(
    class {
      add = vi.fn();
    },
  ),
}));
vi.mock("./messenger", () => ({ VaultMessenger: vi.fn(class {}) }));
vi.mock("./asset-store.svelte", () => ({ AssetStore: vi.fn(class {}) }));
vi.mock("./file-store.svelte", () => ({ FileStore: vi.fn(class {}) }));
vi.mock("./service-registry", () => ({
  ServiceRegistry: vi.fn(
    class {
      ensureInitialized = vi.fn();
      services = {};
    },
  ),
}));
vi.mock("./search-store.svelte", () => ({ SearchStore: vi.fn(class {}) }));
vi.mock("./storage", () => ({
  VaultStorageManager: vi.fn(
    class {
      clearCache = vi.fn();
    },
  ),
}));
vi.mock("./adapters.svelte", () => ({
  createSyncEngine: vi.fn(),
  syncIOAdapter: {},
  syncNotifier: {},
}));
vi.mock("@codex/vault-engine", () => ({ SyncCoordinator: class {} }));
vi.mock("../vault-registry.svelte", () => ({
  vaultRegistry: { rootHandle: {}, updateEntityCount: vi.fn() },
}));
vi.mock("../map-registry.svelte", () => ({
  mapRegistry: { init: vi.fn(), loadFromVault: vi.fn() },
}));
vi.mock("../canvas-registry.svelte", () => ({
  canvasRegistry: { init: vi.fn(), loadFromVault: vi.fn() },
}));
vi.mock("../theme.svelte", () => ({ themeStore: {} }));
vi.mock("../ui/session-mode.svelte", () => ({
  sessionModeStore: { isGuestMode: false, isDemoMode: false },
}));
vi.mock("../../cloud-bridge/p2p/guest-service", () => ({
  p2pGuestService: { getFile: vi.fn() },
}));
vi.mock("../../services/performance/browser-performance-capture", () => ({
  browserPerformanceRecorder: {},
}));

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

function setup() {
  const vault = {
    repository: { saveQueue: {} },
    activeVaultId: "first",
    activeVaultRecord: { id: "first" },
    isGuest: false,
    demoVaultName: null,
    isInitialized: false,
    selectedEntityId: null,
    syncCoordinator: null,
    getActiveVaultHandle: vi.fn(),
    getActiveFolderHandle: vi.fn(),
    getSpecificVaultHandle: vi.fn(),
    releaseImageUrl: vi.fn(),
    loadFiles: vi.fn(),
    ensureAssetPersisted: vi.fn(),
    broadcastVaultUpdate: vi.fn(),
    onEntityUpdate: vi.fn(),
    onEntityDelete: vi.fn(),
    onBatchUpdate: vi.fn(),
    services: {},
  } as unknown as Mutable<Parameters<typeof composeVault>[0]>;
  const assets = { setOnDeadExternalImage: vi.fn() };
  const publication = { load: vi.fn() };
  const services = composeVault(
    vault,
    assets as unknown as AssetManager,
    {} as FileManager,
    publication as unknown as PublishRegistryLoader,
  );
  return { vault, services, assets, publication };
}
function syncDeps() {
  return vi.mocked(SyncStore).mock.calls[0][0];
}
function lifecycleDeps() {
  return vi.mocked(VaultLifecycleManager).mock.calls[0][0];
}
beforeEach(() => {
  vi.clearAllMocks();
  sessionModeStore.isGuestMode = false;
  sessionModeStore.isDemoMode = false;
});
describe("vault composition", () => {
  it("keeps callbacks live across vault switches and initializes the sync coordinator lazily", async () => {
    const { vault, publication } = setup();
    const deps = syncDeps();
    expect(vault.syncCoordinator).toBeNull();
    const coordinator = await deps.getSyncCoordinator();
    expect(coordinator).toBe(vault.syncCoordinator);
    expect(await deps.getSyncCoordinator()).toBe(coordinator);
    expect(createSyncEngine).toHaveBeenCalledOnce();
    vault.activeVaultId = "second";
    expect(deps.activeVaultId()).toBe("second");
    expect(deps.activeVaultRecord()).toBe(vault.activeVaultRecord);
    await deps.getActiveVaultHandle();
    await deps.getActiveFolderHandle!();
    await deps.ensureServicesInitialized();
    await deps.loadMaps("second");
    await deps.loadCanvases("second");
    const handle = {} as FileSystemDirectoryHandle;
    await deps.loadPublishRegistry!("second", handle);
    await deps.updateEntityCount("second", 7);
    await deps.flushPendingSaves!(50);
    expect(publication.load).toHaveBeenCalledWith("second", handle);
    expect(mapRegistry.loadFromVault).toHaveBeenCalledWith("second");
    expect(canvasRegistry.loadFromVault).toHaveBeenCalledWith("second");
    expect(vaultRegistry.updateEntityCount).toHaveBeenCalledWith("second", 7);
    expect(vault.entityStore.flushPendingSaves).toHaveBeenCalledWith(50);
    expect(mapRegistry.init).toHaveBeenCalledWith(vault.repository.saveQueue);
    expect(canvasRegistry.init).toHaveBeenCalledWith(
      vault.repository.saveQueue,
    );
  });

  it("does not create a sync engine if service initialization fails", async () => {
    const { vault } = setup();
    vi.mocked(vault.serviceRegistry.ensureInitialized).mockRejectedValueOnce(
      new Error("services"),
    );
    await expect(syncDeps().getSyncCoordinator()).rejects.toThrow("services");
    expect(createSyncEngine).not.toHaveBeenCalled();
    expect(vault.syncCoordinator).toBeNull();
  });

  it("wires content loading and persistence callbacks to the current facade", async () => {
    const { vault } = setup();
    const loader = vi.mocked(EntityContentLoader).mock.calls[0][0];
    const persistence = vi.mocked(EntityPersistenceService).mock.calls[0][0];
    vault.activeVaultId = "second";
    vault.isGuest = true;
    expect(loader.activeVaultId()).toBe("second");
    expect(loader.isGuest()).toBe(true);
    await loader.getGuestFile!("image");
    await loader.getActiveVaultHandle();
    await loader.getActiveFolderHandle();
    expect(p2pGuestService.getFile).toHaveBeenCalledWith("image");
    expect(persistence.activeVaultId()).toBe("second");
    expect(persistence.isGuest()).toBe(true);
    await persistence.getSpecificVaultHandle("first");
    persistence.setStatus("saving");
    persistence.setErrorMessage("failure");
    expect(persistence.status!()).toBe("idle");
    expect(vault.syncStore.setStatus).toHaveBeenCalledWith("saving");
    expect(vault.syncStore.setErrorMessage).toHaveBeenCalledWith("failure");
    const contentLoader = vi.mocked(EntityContentLoader).mock.results[0]
      .value as EntityContentLoader;
    persistence.isContentLoaded("hero");
    await persistence.loadContent("hero");
    persistence.markContentLoaded("hero");
    expect(contentLoader.isContentLoaded).toHaveBeenCalledWith("hero");
    expect(contentLoader.internalLoadContent).toHaveBeenCalledWith("hero");
    expect(contentLoader.markContentLoaded).toHaveBeenCalledWith("hero");
    const entity = { id: "hero" } as LocalEntity;
    vault.onEntityUpdate = vi.fn();
    persistence.onEntityUpdate!(entity);
    expect(vault.onEntityUpdate).toHaveBeenCalledWith(entity);
    vault.onEntityUpdate = undefined;
    persistence.onEntityUpdate!(entity);
  });

  it("routes mutation callbacks to the current host callbacks and services", async () => {
    const { vault } = setup();
    vault.activeVaultId = "second";
    vault.isGuest = true;
    const mutation = vi.mocked(EntityMutationService).mock.calls[0][0];
    vault.onEntityDelete = vi.fn();
    vault.onBatchUpdate = vi.fn();
    mutation.onEntityDelete!("hero");
    mutation.onBatchUpdate!({ hero: {} });
    expect(vault.onEntityDelete).toHaveBeenCalledWith("hero");
    expect(vault.onBatchUpdate).toHaveBeenCalledWith({ hero: {} });
    expect(mutation.activeVaultId()).toBe("second");
    expect(mutation.isGuest()).toBe(true);
    expect(mutation.getServices()).toBe(vault.services);
    await mutation.getActiveVaultHandle();
    await mutation.getActiveFolderHandle();
    mutation.invalidateUrlCache!("image");
    expect(vault.releaseImageUrl).toHaveBeenCalledWith("image");
    await mutation.updateEntityCount!("second", 1);
    // Optional host callbacks may be removed after construction.
    vault.onEntityDelete = undefined;
    vault.onBatchUpdate = undefined;
    mutation.onEntityDelete!("hero");
    mutation.onBatchUpdate!({});
  });

  it("guards pruning for guest/demo vaults and forwards dead images", async () => {
    const { vault, assets } = setup();
    const prune = vi.mocked(DeadExternalImagePruner).mock.calls[0][0];
    expect(prune.isWritable()).toBe(true);
    for (const key of ["isGuestMode", "isDemoMode"] as const) {
      sessionModeStore[key] = true;
      expect(prune.isWritable()).toBe(false);
      sessionModeStore[key] = false;
    }
    vault.isGuest = true;
    expect(prune.isWritable()).toBe(false);
    vault.isGuest = false;
    vault.demoVaultName = "demo";
    expect(prune.isWritable()).toBe(false);
    vault.demoVaultName = null;
    vault.activeVaultId = null;
    expect(prune.isWritable()).toBe(false);
    vault.activeVaultId = "vault";
    expect(prune.getEntities()).toBe(vault.entityStore.entities);
    await prune.updateEntities({ hero: {} });
    expect(vault.entityStore.batchUpdate).toHaveBeenCalledWith({ hero: {} });
    assets.setOnDeadExternalImage.mock.calls[0][0]("dead");
    expect(vault.deadImagePruner.add).toHaveBeenCalledWith("dead");
  });

  it("wires lifecycle resets, messaging and file handles", async () => {
    const { vault, services } = setup();
    vault.activeVaultId = "vault";
    const deps = lifecycleDeps();
    expect(deps.activeVaultId()).toBe("vault");
    await deps.getActiveVaultHandle();
    await deps.getActiveFolderHandle!();
    await deps.loadFiles(false);
    await deps.flushPendingSaves();
    await deps.ensureServicesInitialized();
    deps.clearStorageCache();
    expect(services.storage.clearCache).toHaveBeenCalledOnce();
    expect(deps.getEntities()).toBe(vault.entityStore.entities);
    deps.setDemoVaultName("demo");
    deps.setInitialized(true);
    deps.setSelectedEntityId("hero");
    expect(vault.demoVaultName).toBe("demo");
    expect(vault.isInitialized).toBe(true);
    expect(vault.selectedEntityId).toBe("hero");
    deps.rebuildEntityIndexes();
    expect(
      vault.entityStore.initializeInboundConnections,
    ).toHaveBeenCalledOnce();
    expect(vault.entityStore.rebuildIndexes).toHaveBeenCalledOnce();
    expect(deps.getServices()).toBe(vault.services);
    const handle = {} as FileSystemDirectoryHandle;
    await deps.ensureAssetPersisted("image", handle);
    expect(vault.ensureAssetPersisted).toHaveBeenCalledWith("image", handle);
    const messaging = vi.mocked(VaultMessenger).mock.calls[0][0];
    expect(messaging.activeVaultId()).toBe("vault");
    await messaging.loadFiles();
    messaging.broadcastCallback();
    expect(vault.broadcastVaultUpdate).toHaveBeenCalledOnce();
    expect(
      vi.mocked(VaultStorageManager).mock.calls[0][0].getRootHandle(),
    ).toBe(vaultRegistry.rootHandle);
    const assetDeps = vi.mocked(AssetStore).mock.calls[0][0];
    await assetDeps.getActiveVaultHandle();
    await assetDeps.getActiveFolderHandle();
    expect(assetDeps.isGuest()).toBe(false);
    const fileDeps = vi.mocked(FileStore).mock.calls[0][0];
    await fileDeps.getActiveVaultHandle();
    expect(fileDeps.isGuest()).toBe(false);
    expect(vault.serviceRegistry).toBe(
      vi.mocked(ServiceRegistry).mock.results[0].value,
    );
  });
});
