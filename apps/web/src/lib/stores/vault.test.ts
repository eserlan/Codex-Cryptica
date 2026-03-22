import { beforeEach, describe, expect, it, vi } from "vitest";

// Fix Worker is not defined
class MockWorker {
  constructor() {}
  postMessage() {}
  terminate() {}
  addEventListener() {}
  removeEventListener() {}
}
vi.stubGlobal("Worker", MockWorker);

vi.mock("../workers/search.worker?worker", () => ({
  default: MockWorker,
}));

vi.mock("./vault-registry.svelte", () => {
  const mockDirHandle: any = {
    kind: "directory",
    getFileHandle: vi.fn().mockResolvedValue({
      getFile: vi.fn().mockResolvedValue({ text: () => "{}" }),
    }),
    getDirectoryHandle: vi.fn().mockResolvedValue({
      getDirectoryHandle: vi.fn().mockResolvedValue({}),
      getFileHandle: vi.fn().mockResolvedValue({}),
    }),
    entries: vi.fn().mockReturnValue({
      [Symbol.asyncIterator]() {
        return {
          next() {
            return Promise.resolve({ done: true });
          },
        };
      },
    }),
  };
  mockDirHandle.getDirectoryHandle = vi.fn().mockResolvedValue(mockDirHandle);

  return {
    vaultRegistry: {
      init: vi.fn().mockResolvedValue(undefined),
      rootHandle: mockDirHandle,
      activeVaultId: "test-vault",
      setActiveVault: vi.fn().mockResolvedValue(undefined),
      listVaults: vi.fn().mockResolvedValue([]),
      availableVaults: [],
      vaults: [],
    },
  };
});

vi.mock("./theme.svelte", () => ({
  themeStore: {
    loadForVault: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("./vault/migration", () => ({
  checkForMigration: vi.fn().mockResolvedValue({ required: false }),
  runMigration: vi.fn().mockResolvedValue(undefined),
  migrateStructure: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../services/search", () => ({
  searchService: {
    index: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../services/ai", () => ({
  contextRetrievalService: {
    clearStyleCache: vi.fn(),
    retrieveContext: vi.fn(),
  },
  textGenerationService: {
    generateResponse: vi.fn(),
    expandQuery: vi.fn(),
  },
  imageGenerationService: {
    generateImage: vi.fn(),
  },
}));

vi.mock("../utils/idb", () => ({
  getDB: vi.fn().mockResolvedValue({
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn().mockResolvedValue([]),
    transaction: vi.fn().mockReturnValue({
      store: {
        index: vi.fn().mockReturnValue({
          openCursor: vi.fn().mockResolvedValue(null),
        }),
      },
      done: Promise.resolve(),
    }),
  }),
  getPersistedHandle: vi.fn().mockResolvedValue(null),
  clearPersistedHandle: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../services/cache.svelte", () => ({
  cacheService: {
    preloadVault: vi.fn().mockResolvedValue(undefined),
    getPreloadedEntities: vi.fn().mockReturnValue([]),
    getEntityContent: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn(),
  },
}));
const mockLocalHandle = {
  queryPermission: vi.fn().mockResolvedValue("granted"),
};

vi.mock("./vault/adapters.svelte", () => ({
  fileIOAdapter: {
    walkDirectory: vi.fn().mockResolvedValue([]),
  },
  syncIOAdapter: {
    getLocalHandle: vi.fn().mockResolvedValue(null),
  },
  syncNotifier: {},
  assetIOAdapter: {},
  imageProcessor: {},
  createSyncEngine: vi.fn(),
}));

vi.mock("../utils/opfs", () => ({
  readFileAsText: vi.fn(),
  writeOpfsFile: vi.fn(),
  walkOpfsDirectory: vi.fn(),
  getDirHandle: vi.fn(),
  getVaultDir: vi.fn().mockResolvedValue({}),
  isNotFoundError: vi.fn(),
  deleteOpfsEntry: vi.fn(),
}));

vi.mock("./map-registry.svelte", () => ({
  mapRegistry: {
    init: vi.fn(),
    saveMaps: vi.fn(),
    deleteMap: vi.fn(),
    loadFromVault: vi.fn().mockResolvedValue(undefined),
    maps: [],
  },
}));

vi.mock("./canvas-registry.svelte", () => ({
  canvasRegistry: {
    init: vi.fn(),
    saveCanvas: vi.fn(),
    loadFromVault: vi.fn().mockResolvedValue(undefined),
    canvases: [],
  },
}));

// Mock BroadcastChannel
const mockPostMessage = vi.fn();
class MockBroadcastChannel {
  name: string;
  onmessage: ((event: any) => void) | null = null;
  constructor(name: string) {
    this.name = name;
  }
  postMessage(message: any) {
    mockPostMessage(message);
  }
  close() {}
}
vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);

import { VaultStore } from "./vault.svelte";
import { cacheService } from "../services/cache.svelte";
import { readFileAsText } from "../utils/opfs";
import { syncIOAdapter, fileIOAdapter } from "./vault/adapters.svelte";
import { uiStore } from "./ui.svelte";
import * as vaultMigration from "./vault/migration";
import { vaultRegistry } from "./vault-registry.svelte";
import { mapRegistry } from "./map-registry.svelte";
import { canvasRegistry } from "./canvas-registry.svelte";

describe("VaultStore", () => {
  let testVault: VaultStore;
  let mockRepository: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockPostMessage.mockClear();

    // Ensure window is defined with dispatchEvent
    vi.stubGlobal("window", {
      dispatchEvent: vi.fn(),
    });
    vi.stubGlobal(
      "CustomEvent",
      class {
        detail: any;
        constructor(name: string, init: any) {
          this.detail = init.detail;
        }
      },
    );

    mockRepository = {
      entities: {},
      loadFiles: vi.fn().mockResolvedValue(undefined),
      saveToDisk: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn(),
      saveQueue: {
        totalPendingCount: 0,
        enqueue: vi.fn(async (id, cb) => await cb()),
        waitForAllSaves: vi.fn().mockResolvedValue(undefined),
      },
      waitForAllSaves: vi.fn().mockResolvedValue(undefined),
    };

    testVault = new VaultStore(mockRepository);
  });

  describe("Tiered Loading and Reactivity", () => {
    it("should prioritize Cache for Chronicle, then OPFS for Lore/Chronicle", async () => {
      const entityId = "test-hero";
      const cachedChronicle = "Cached Chronicle Content";
      const opfsMarkdown =
        "---\nlore: Deep Mythos\n---\nFresh Chronicle Content";

      // 1. Initial metadata only
      mockRepository.entities = {
        [entityId]: { id: entityId, title: "Hero", content: "" } as any,
      };

      // 2. Setup Tier 1 (Cache)
      vi.mocked(cacheService.getEntityContent).mockResolvedValue({
        content: cachedChronicle,
        lore: "Old Lore",
      });

      // 3. Setup Tier 2 (OPFS)
      vi.mocked(readFileAsText).mockResolvedValue(opfsMarkdown);

      // Start loading
      const loadPromise = testVault.loadEntityContent(entityId);
      await loadPromise;

      const updated = testVault.entities[entityId];
      expect(updated?.content).toBe("Fresh Chronicle Content");
      expect(updated?.lore).toBe("Deep Mythos");
      expect(cacheService.set).toHaveBeenCalled();
    });

    it("should fallback to Local FS (Tier 3) if OPFS fails", async () => {
      const entityId = "local-hero";
      const localMarkdown = "---\nlore: Local Lore\n---\nLocal Content";

      mockRepository.entities = {
        [entityId]: { id: entityId, title: "Local", content: "" } as any,
      };

      vi.mocked(cacheService.getEntityContent).mockResolvedValue(null);
      vi.mocked(readFileAsText).mockImplementation(async (handle) => {
        if ((handle as any).kind === "directory") throw new Error("Not found");
        return "";
      });

      vi.mocked(syncIOAdapter.getLocalHandle).mockResolvedValue(
        mockLocalHandle as any,
      );
      vi.mocked(readFileAsText).mockImplementation(async (handle) => {
        if (handle === (mockLocalHandle as any)) return localMarkdown;
        return "";
      });

      await testVault.loadEntityContent(entityId);

      const updated = testVault.entities[entityId];
      expect(updated?.content).toBe("Local Content");
      expect(updated?.lore).toBe("Local Lore");
    });
  });

  describe("Initialization", () => {
    it("should initialize correctly in normal mode", async () => {
      await testVault.init();
      if (testVault.status === "error") {
        console.error("Init failed with:", testVault.errorMessage);
      }
      expect(testVault.isInitialized).toBe(true);
      expect(testVault.status).toBe("idle");
      expect(vaultRegistry.init).toHaveBeenCalled();
    });

    it("should handle demo mode in init", async () => {
      uiStore.isDemoMode = true;
      await testVault.init();
      expect(testVault.isInitialized).toBe(true);
      expect(testVault.status).toBe("idle");
      uiStore.isDemoMode = false;
    });

    it("should trigger migration if required", async () => {
      vi.mocked(vaultMigration.checkForMigration).mockResolvedValueOnce({
        required: true,
        handle: {} as any,
      });

      await testVault.init();
      expect(testVault.migrationRequired).toBe(true);
      expect(vaultMigration.runMigration).toHaveBeenCalled();
    });
  });

  describe("Loading Files", () => {
    it("should load files from cache if available", async () => {
      const cachedEntities = [{ id: "e1", title: "Cached" }];
      vi.mocked(cacheService.getPreloadedEntities).mockReturnValue(
        cachedEntities as any,
      );

      await testVault.loadFiles(true);

      expect(testVault.entities["e1"]).toBeDefined();
      expect(mockRepository.loadFiles).not.toHaveBeenCalled();
    });

    it("should perform full sync if cache is empty or skipSyncIfWarm is false", async () => {
      vi.mocked(cacheService.getPreloadedEntities).mockReturnValue([]);

      await testVault.loadFiles(false);

      expect(mockRepository.loadFiles).toHaveBeenCalled();
    });
  });

  describe("CRUD Operations", () => {
    it("should mark new entities as loaded and verified", async () => {
      const id = "new-entity";
      vi.spyOn(
        (testVault as any).crudManager,
        "createEntity",
      ).mockResolvedValue(id);

      await testVault.createEntity("note", "New Note");

      expect((testVault as any)._contentLoadedIds.has(id)).toBe(true);
      expect((testVault as any)._contentVerifiedIds.has(id)).toBe(true);
    });

    it("should handle entity deletion in normal mode", async () => {
      vi.mocked(vaultRegistry).activeVaultId = "v1" as any;
      vi.spyOn(testVault, "getActiveVaultHandle").mockResolvedValue({} as any);
      const deleteSpy = vi
        .spyOn((testVault as any).crudManager, "deleteEntity")
        .mockResolvedValue(undefined);

      await testVault.deleteEntity("d1");

      expect(deleteSpy).toHaveBeenCalledWith("d1", expect.any(Object), "v1");
    });

    it("should handle entity deletion in demo mode and with callback", async () => {
      const deleteSpy = vi.fn();
      testVault.onEntityDelete = deleteSpy;

      uiStore.isDemoMode = true;
      mockRepository.entities = { d1: { id: "d1" } };

      await testVault.deleteEntity("d1");

      expect(deleteSpy).toHaveBeenCalledWith("d1");
      expect(testVault.entities["d1"]).toBeUndefined();
      uiStore.isDemoMode = false;
    });

    it("should immediately update cache when saving", async () => {
      const entity = {
        id: "new-node",
        title: "New",
        content: "Freshly Saved",
        type: "note",
      } as any;
      mockRepository.entities = { [entity.id]: entity };
      (testVault as any)._contentLoadedIds.add(entity.id);

      await testVault.scheduleSave(entity);

      expect(mockRepository.saveToDisk).toHaveBeenCalled();
      expect(cacheService.set).toHaveBeenCalled();
    });

    it("should update entity and mark as verified", async () => {
      vi.spyOn(
        (testVault as any).crudManager,
        "updateEntity",
      ).mockResolvedValue(true);
      await testVault.updateEntity("e1", { content: "updated" });
      expect((testVault as any)._contentLoadedIds.has("e1")).toBe(true);
    });

    it("should handle batch updates", async () => {
      vi.spyOn((testVault as any).crudManager, "batchUpdate").mockResolvedValue(
        true,
      );
      await testVault.batchUpdate({ e1: { title: "New" } });
      expect((testVault as any)._contentLoadedIds.has("e1")).toBe(true);
    });

    it("should handle search index errors in scheduleSave", async () => {
      const { searchService } = await import("../services/search");
      vi.mocked(searchService.index).mockRejectedValueOnce(
        new Error("Search Error"),
      );

      const entity = { id: "e1", title: "T", content: "C" } as any;
      mockRepository.entities = { e1: entity };
      (testVault as any)._contentLoadedIds.add("e1");
      testVault.services = { search: searchService } as any;

      await testVault.scheduleSave(entity);
      expect(mockRepository.saveToDisk).toHaveBeenCalled();
    });

    it("should broadcast and mark as loaded after batch create", async () => {
      const entity = { id: "b1", title: "B", type: "note" };
      mockRepository.entities = { b1: entity };

      vi.spyOn(
        (testVault as any).crudManager,
        "batchCreateEntities",
      ).mockResolvedValue(undefined);
      const broadcastSpy = vi.spyOn(testVault, "broadcastVaultUpdate");

      await testVault.batchCreateEntities([entity as any]);

      expect(broadcastSpy).toHaveBeenCalled();
      expect((testVault as any)._contentLoadedIds.has("b1")).toBe(true);
    });

    it("should load content internally if not loaded during save", async () => {
      const entity = { id: "s1", title: "S" } as any;
      mockRepository.entities = { s1: entity };
      // Do NOT add to _contentLoadedIds

      const readFileSpy = (await import("../utils/opfs")).readFileAsText;
      vi.mocked(readFileSpy).mockResolvedValue("---\nlore: L\n---\nC");

      await testVault.scheduleSave(entity);

      expect(testVault.entities["s1"].content).toBe("C");
      expect((testVault as any)._contentLoadedIds.has("s1")).toBe(true);
    });

    it("should handle disk save errors in scheduleSave", async () => {
      const entity = { id: "e1", title: "T", content: "C" } as any;
      mockRepository.entities = { e1: entity };
      (testVault as any)._contentLoadedIds.add("e1");

      vi.mocked(mockRepository.saveToDisk).mockRejectedValueOnce(
        new Error("Disk Error"),
      );

      await testVault.scheduleSave(entity);
      expect(testVault.status).toBe("error");
      expect(testVault.errorMessage).toContain("access storage");
    });
  });

  describe("Connection and Label Management", () => {
    it("should add and remove connections", async () => {
      const addSpy = vi
        .spyOn((testVault as any).crudManager, "addConnection")
        .mockResolvedValue(true);
      const removeSpy = vi
        .spyOn((testVault as any).crudManager, "removeConnection")
        .mockResolvedValue(true);

      await testVault.addConnection("s", "t", "friend");
      await testVault.removeConnection("s", "t", "friend");

      expect(addSpy).toHaveBeenCalledWith(
        "s",
        "t",
        "friend",
        undefined,
        undefined,
      );
      expect(removeSpy).toHaveBeenCalledWith("s", "t", "friend");
    });

    it("should update connections", async () => {
      const updateSpy = vi
        .spyOn((testVault as any).crudManager, "updateConnection")
        .mockResolvedValue(true);
      await testVault.updateConnection("s", "t", "old", "new", "label");
      expect(updateSpy).toHaveBeenCalledWith("s", "t", "old", "new", "label");
    });

    it("should add and remove labels", async () => {
      const addSpy = vi
        .spyOn((testVault as any).crudManager, "addLabel")
        .mockResolvedValue(true);
      const removeSpy = vi
        .spyOn((testVault as any).crudManager, "removeLabel")
        .mockResolvedValue(true);

      await testVault.addLabel("id", "label");
      await testVault.removeLabel("id", "label");

      expect(addSpy).toHaveBeenCalledWith("id", "label");
      expect(removeSpy).toHaveBeenCalledWith("id", "label");
    });

    it("should perform bulk label operations", async () => {
      const bulkAddSpy = vi
        .spyOn((testVault as any).crudManager, "bulkAddLabel")
        .mockResolvedValue(true);
      const bulkRemoveSpy = vi
        .spyOn((testVault as any).crudManager, "bulkRemoveLabel")
        .mockResolvedValue(true);

      await testVault.bulkAddLabel(["1", "2"], "tag");
      await testVault.bulkRemoveLabel(["1", "2"], "tag");

      expect(bulkAddSpy).toHaveBeenCalledWith(["1", "2"], "tag");
      expect(bulkRemoveSpy).toHaveBeenCalledWith(["1", "2"], "tag");
    });
  });

  describe("Handle Management", () => {
    it("should get active vault handle from registry", async () => {
      vi.mocked(vaultRegistry).activeVaultId = "v1" as any;
      const mockRoot = vaultRegistry.rootHandle;
      const mockVaultsDir = {
        getDirectoryHandle: vi.fn().mockResolvedValue({ name: "v1" }),
      };
      mockRoot!.getDirectoryHandle = vi.fn().mockResolvedValue(mockVaultsDir);

      const handle = await testVault.getActiveVaultHandle();
      expect(handle).toBeDefined();
      expect(mockRoot!.getDirectoryHandle).toHaveBeenCalledWith("vaults", {
        create: true,
      });
    });

    it("should handle error in getActiveVaultHandle", async () => {
      vi.mocked(vaultRegistry).activeVaultId = "v1" as any;
      const mockRoot = vaultRegistry.rootHandle;
      mockRoot!.getDirectoryHandle = vi
        .fn()
        .mockRejectedValue(new Error("IO Error"));

      const handle = await testVault.getActiveVaultHandle();
      expect(handle).toBeUndefined();
    });

    it("should get active sync handle from IDB", async () => {
      vi.mocked(vaultRegistry).activeVaultId = "v1" as any;
      const { getDB } = await import("../utils/idb");
      const mockDB = await getDB();
      vi.mocked(mockDB.get).mockResolvedValueOnce({ kind: "directory" });

      const handle = await testVault.getActiveSyncHandle();
      expect(handle).toBeDefined();
      expect(mockDB.get).toHaveBeenCalledWith("settings", "syncHandle_v1");
    });

    it("should handle error in getActiveSyncHandle", async () => {
      vi.mocked(vaultRegistry).activeVaultId = "v1" as any;
      const { getDB } = await import("../utils/idb");
      const mockDB = await getDB();
      vi.mocked(mockDB.get).mockRejectedValueOnce(new Error("IDB Error"));

      const handle = await testVault.getActiveSyncHandle();
      expect(handle).toBeUndefined();
    });
  });

  describe("Asset Management", () => {
    it("should resolve image URLs", async () => {
      const _resolveSpy = vi
        .spyOn((testVault as any).assetManager, "resolveImageUrl")
        .mockResolvedValue("blob:url");
      const url = await testVault.resolveImageUrl("test.png");
      expect(url).toBe("blob:url");
    });

    it("should save image to vault", async () => {
      const _saveSpy = vi
        .spyOn((testVault as any).assetManager, "saveImageToVault")
        .mockResolvedValue("images/test.png");
      const result = await testVault.saveImageToVault(new Blob(), "entity-1");
      expect(result).toBe("images/test.png");
    });

    it("should release image URL", () => {
      const releaseSpy = vi.spyOn(
        (testVault as any).assetManager,
        "releaseImageUrl",
      );
      testVault.releaseImageUrl("test.png");
      expect(releaseSpy).toHaveBeenCalledWith("test.png");
    });

    it("should ensure asset persisted with demo theme fetcher", async () => {
      uiStore.activeDemoTheme = "fantasy";
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob()),
      });
      vi.stubGlobal("fetch", mockFetch);

      const _ensureSpy = vi
        .spyOn((testVault as any).assetManager, "ensureAssetPersisted")
        .mockImplementation((async (
          path: string,
          _handle: any,
          fetcher?: (p: string) => Promise<Blob>,
        ) => {
          if (fetcher) await fetcher(path);
          return true;
        }) as any);

      const result = await testVault.ensureAssetPersisted(
        "test.png",
        {} as any,
      );
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalled();
      uiStore.activeDemoTheme = null;
    });
  });

  describe("Delegations", () => {
    it("should delegate map and canvas operations", async () => {
      vi.mocked(mapRegistry.saveMaps).mockResolvedValue(undefined);
      vi.mocked(mapRegistry.deleteMap).mockResolvedValue(undefined);
      vi.mocked(canvasRegistry.saveCanvas).mockResolvedValue(undefined);

      await testVault.saveMaps();
      await testVault.deleteMap("m1");
      await testVault.saveCanvas("c1", { explicitVaultId: "v1" });

      expect(mapRegistry.saveMaps).toHaveBeenCalled();
      expect(mapRegistry.deleteMap).toHaveBeenCalledWith("m1");
      expect(canvasRegistry.saveCanvas).toHaveBeenCalledWith("c1", {
        explicitVaultId: "v1",
      });
    });

    it("should delegate lifecycle operations", async () => {
      const lm = (testVault as any).lifecycleManager;
      vi.spyOn(lm, "importFromFolder").mockResolvedValue(undefined);
      vi.spyOn(lm, "switchVault").mockResolvedValue(undefined);
      vi.spyOn(lm, "createVault").mockResolvedValue("v1");
      vi.spyOn(lm, "deleteVault").mockResolvedValue(undefined);
      vi.spyOn(lm, "loadDemoData").mockResolvedValue(undefined);
      vi.spyOn(lm, "persistToIndexedDB").mockResolvedValue(undefined);

      await testVault.importFromFolder({} as any);
      await testVault.switchVault("v1");
      await testVault.createVault("name");
      await testVault.deleteVault("v1");
      await testVault.loadDemoData("name", {});
      await testVault.persistToIndexedDB("v1");

      expect(lm.importFromFolder).toHaveBeenCalled();
      expect(lm.switchVault).toHaveBeenCalledWith("v1");

      expect(lm.createVault).toHaveBeenCalledWith("name");
      expect(lm.deleteVault).toHaveBeenCalledWith("v1");
      expect(lm.loadDemoData).toHaveBeenCalled();
      expect(lm.persistToIndexedDB).toHaveBeenCalledWith("v1");
    });
  });

  describe("Sync and Utilities", () => {
    it("should cleanup conflict files", async () => {
      testVault.syncCoordinator = {
        cleanupConflictFiles: vi.fn().mockResolvedValue(undefined),
      } as any;

      vi.mocked(vaultRegistry).activeVaultId = "v1" as any;
      vi.spyOn(testVault, "getActiveVaultHandle").mockResolvedValue({} as any);

      await testVault.cleanupConflictFiles();
      expect(
        testVault.syncCoordinator!.cleanupConflictFiles,
      ).toHaveBeenCalled();
    });

    it("should handle syncToLocal", async () => {
      testVault.syncCoordinator = {
        syncToLocal: vi.fn().mockImplementation((_id, _h, _e, _w, onState) => {
          onState({ status: "syncing", syncType: "local" });
          return Promise.resolve();
        }),
      } as any;
      vi.mocked(vaultRegistry).activeVaultId = "v1" as any;
      vi.spyOn(testVault, "getActiveVaultHandle").mockResolvedValue({} as any);

      await testVault.syncToLocal();
      expect(testVault.syncCoordinator!.syncToLocal).toHaveBeenCalled();
      expect(testVault.status).toBe("syncing");
    });

    it("should handle error in checkForConflicts", async () => {
      vi.mocked(fileIOAdapter.walkDirectory).mockRejectedValueOnce(
        new Error("IO Error"),
      );

      await testVault.checkForConflicts();
      expect(testVault.hasConflictFiles).toBe(false);
    });

    it("should set default visibility", async () => {
      await testVault.setDefaultVisibility("hidden");
      expect(testVault.defaultVisibility).toBe("hidden");
    });

    it("should broadcast vault updates", () => {
      vi.mocked(vaultRegistry).activeVaultId = "v1" as any;
      testVault.broadcastVaultUpdate();
      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "RELOAD_VAULT",
          vaultId: "v1",
        }),
      );
    });
  });
});
