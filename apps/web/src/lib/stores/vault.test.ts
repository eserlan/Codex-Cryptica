import { beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  (global as any).$state = (v: any) => v;
  (global as any).$state.raw = (v: any) => v;
  (global as any).$derived = (v: any) => v;
  (global as any).$derived.by = (fn: any) => fn();
});

vi.mock("$app/paths", () => ({
  base: "",
}));

vi.mock("$app/environment", () => ({
  browser: true,
}));

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
    preloadVault: vi.fn().mockResolvedValue(new Map()),
    getPreloadedEntities: vi.fn().mockReturnValue([]),
    getEntityContent: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
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
import { createSyncEngine, fileIOAdapter } from "./vault/adapters.svelte";
import { uiStore } from "./ui.svelte";
import * as vaultMigration from "./vault/migration";
import { vaultRegistry } from "./vault-registry.svelte";
import { themeStore } from "./theme.svelte";
import { mapRegistry } from "./map-registry.svelte";
import { canvasRegistry } from "./canvas-registry.svelte";

describe("VaultStore", () => {
  let testVault: VaultStore;
  let mockRepository: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockPostMessage.mockClear();
    uiStore.isGuestMode = false;
    uiStore.isDemoMode = false;
    uiStore.activeDemoTheme = null;

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

      vi.spyOn(testVault, "getActiveSyncHandle").mockResolvedValue(
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
      expect(vaultMigration.migrateStructure).toHaveBeenCalledWith(
        vaultRegistry.rootHandle,
      );
      expect(vi.mocked(themeStore.loadForVault)).toHaveBeenCalledWith(
        "test-vault",
      );
      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { id: "test-vault" },
        }),
      );
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
      expect(vaultMigration.migrateStructure).toHaveBeenCalledWith(
        vaultRegistry.rootHandle,
      );
    });

    it("should create the sync coordinator lazily when local sync is needed", async () => {
      vi.mocked(createSyncEngine).mockResolvedValueOnce({
        sync: vi.fn(),
      } as any);

      const coordinator = await (
        testVault.syncStore as any
      ).deps.getSyncCoordinator();

      expect(createSyncEngine).toHaveBeenCalled();
      expect(coordinator).toBe(testVault.syncCoordinator);
      expect(coordinator).not.toBeNull();
    });

    it("should fall back to guest mode when bootstrap fails", async () => {
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ entities: {} }),
      } as Response);
      vi.spyOn(vaultRegistry, "init").mockRejectedValueOnce(
        new Error("Bootstrap failed"),
      );

      try {
        await testVault.init();

        expect(uiStore.isGuestMode).toBe(true);
        expect(testVault.isInitialized).toBe(true);
        expect(testVault.status).toBe("idle");
        expect(fetchMock).toHaveBeenCalledWith("/vault-samples/fantasy.json");
      } finally {
        fetchMock.mockRestore();
      }
    });
  });

  describe("Loading Files", () => {
    it("should load files from cache if available", async () => {
      const mockMap = new Map();
      mockMap.set("test-vault:e1.md", {
        lastModified: Date.now(),
        entity: { id: "e1", title: "Cached" },
      });
      vi.mocked(cacheService.preloadVault).mockResolvedValue(mockMap);

      await testVault.loadFiles(true);

      expect(testVault.entities["e1"]).toBeDefined();
      expect(mockRepository.loadFiles).not.toHaveBeenCalled();
    });

    it("should perform full sync if cache is empty or skipSyncIfWarm is false", async () => {
      vi.mocked(cacheService.preloadVault).mockResolvedValue(new Map());

      await testVault.loadFiles(false);

      expect(mockRepository.loadFiles).toHaveBeenCalled();
    });

    it("should abort loading if vault changes during async operations", async () => {
      // Mock a slow preload
      vi.mocked(cacheService.preloadVault).mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return new Map();
      });

      const loadPromise = testVault.loadFiles(false);

      // Simulate rapid switch before preload finishes
      vi.mocked(vaultRegistry).activeVaultId = "new-vault" as any;

      await loadPromise;

      // Should have aborted and NOT called repository.loadFiles for the old vault
      expect(mockRepository.loadFiles).not.toHaveBeenCalled();
    });
  });

  describe("CRUD Operations", () => {
    it("should mark new entities as loaded and verified", async () => {
      const id = "new-entity";
      vi.spyOn(testVault.entityStore, "createEntity").mockImplementation(
        async () => {
          testVault.entityStore.markContentLoaded(id);
          return id;
        },
      );

      await testVault.createEntity("note", "New Note");

      expect(testVault.entityStore.isContentLoaded(id)).toBe(true);
      expect(testVault.entityStore.isContentVerified(id)).toBe(true);
    });

    it("should handle entity deletion in normal mode", async () => {
      vi.mocked(vaultRegistry).activeVaultId = "v1" as any;
      vi.spyOn(testVault, "getActiveVaultHandle").mockResolvedValue({} as any);
      const deleteSpy = vi
        .spyOn(testVault.entityStore, "deleteEntity")
        .mockResolvedValue(undefined);

      await testVault.deleteEntity("d1");

      expect(deleteSpy).toHaveBeenCalledWith("d1");
    });

    it("should handle entity deletion with local sync handle", async () => {
      vi.mocked(vaultRegistry).activeVaultId = "v1" as any;
      const mockOpfsHandle = { name: "v1" } as any;
      const mockLocalHandle = {
        queryPermission: vi.fn().mockResolvedValue("granted"),
        getDirectoryHandle: vi.fn().mockRejectedValue(new Error("Not found")), // Simulates deep path not found
        removeEntry: vi.fn().mockResolvedValue(undefined),
      } as any;

      vi.spyOn(testVault, "getActiveVaultHandle").mockResolvedValue(
        mockOpfsHandle,
      );
      vi.spyOn(testVault, "getActiveSyncHandle").mockResolvedValue(
        mockLocalHandle,
      );

      const deleteSpy = vi
        .spyOn(testVault.entityStore, "deleteEntity")
        .mockImplementation(async (_id) => {
          const handle = await testVault.getActiveSyncHandle();
          if (handle) {
            await handle.queryPermission({ mode: "readwrite" });
            try {
              await handle.getDirectoryHandle("folder", { create: false });
            } catch {
              // ignore
            }
          }
          await cacheService.remove("v1:folder/d1.md");
        });

      // Setup entity with path
      testVault.entities["d1"] = {
        id: "d1",
        _path: ["folder", "d1.md"],
      } as any;

      await testVault.deleteEntity("d1");

      expect(deleteSpy).toHaveBeenCalledWith("d1");
      expect(mockLocalHandle.queryPermission).toHaveBeenCalled();
      // Should have tried to get "folder"
      expect(mockLocalHandle.getDirectoryHandle).toHaveBeenCalledWith(
        "folder",
        { create: false },
      );
      expect(cacheService.remove).toHaveBeenCalled();
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
      testVault.entityStore.markContentLoaded(entity.id);

      await testVault.scheduleSave(entity);

      expect(mockRepository.saveToDisk).toHaveBeenCalled();
      expect(cacheService.set).toHaveBeenCalled();
    });

    it("should update entity and mark as verified", async () => {
      vi.spyOn(testVault.entityStore, "updateEntity").mockImplementation(
        async (id) => {
          testVault.entityStore.markContentLoaded(id);
          return true;
        },
      );
      await testVault.updateEntity("e1", { content: "updated" });
      expect(testVault.entityStore.isContentLoaded("e1")).toBe(true);
    });

    it("should handle batch updates", async () => {
      vi.spyOn(testVault.entityStore, "batchUpdate").mockImplementation(
        async (updates) => {
          Object.keys(updates).forEach((id) =>
            testVault.entityStore.markContentLoaded(id),
          );
          return true;
        },
      );
      await testVault.batchUpdate({ e1: { title: "New" } });
      expect(testVault.entityStore.isContentLoaded("e1")).toBe(true);
    });

    it("should handle search index errors in scheduleSave", async () => {
      const { searchService } = await import("../services/search");
      vi.mocked(searchService.index).mockRejectedValueOnce(
        new Error("Search Error"),
      );

      const entity = { id: "e1", title: "T", content: "C" } as any;
      mockRepository.entities = { e1: entity };
      testVault.entityStore.markContentLoaded("e1");
      vi.spyOn(testVault.serviceRegistry, "services", "get").mockReturnValue({
        search: searchService,
      } as any);

      await testVault.scheduleSave(entity);
      expect(mockRepository.saveToDisk).toHaveBeenCalled();
    });

    it("should broadcast and mark as loaded after batch create", async () => {
      const entity = { id: "b1", title: "B", type: "note" };
      mockRepository.entities = { b1: entity };

      vi.spyOn(testVault.entityStore, "batchCreateEntities").mockImplementation(
        async (newEntities) => {
          testVault.entityStore.markContentLoaded("b1");
          const { vaultEventBus } = await import("./vault/events");
          vaultEventBus.emit({
            type: "BATCH_CREATED",
            vaultId: "v1",
            entities: newEntities as any,
          });
        },
      );
      const broadcastSpy = vi.spyOn(testVault, "broadcastVaultUpdate");

      await testVault.batchCreateEntities([entity as any]);

      expect(broadcastSpy).toHaveBeenCalled();
      expect(testVault.entityStore.isContentLoaded("b1")).toBe(true);
    });

    it("should load content internally if not loaded during save", async () => {
      const entity = { id: "s1", title: "S" } as any;
      mockRepository.entities = { s1: entity };
      // Do NOT add to _contentLoadedIds

      const readFileSpy = (await import("../utils/opfs")).readFileAsText;
      vi.mocked(readFileSpy).mockResolvedValue("---\nlore: L\n---\nC");

      await testVault.scheduleSave(entity);

      expect(testVault.entities["s1"].content).toBe("C");
      expect(testVault.entityStore.isContentLoaded("s1")).toBe(true);
    });

    it("should handle disk save errors in scheduleSave", async () => {
      const entity = { id: "e1", title: "T", content: "C" } as any;
      mockRepository.entities = { e1: entity };
      testVault.entityStore.markContentLoaded("e1");

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
        .spyOn(testVault.entityStore, "addConnection")
        .mockResolvedValue(true);
      const removeSpy = vi
        .spyOn(testVault.entityStore, "removeConnection")
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
        .spyOn(testVault.entityStore, "updateConnection")
        .mockResolvedValue(true);
      await testVault.updateConnection("s", "t", "old", "new", "label");
      expect(updateSpy).toHaveBeenCalledWith("s", "t", "old", "new", "label");
    });

    it("should add and remove labels", async () => {
      const addSpy = vi
        .spyOn(testVault.entityStore, "addLabel")
        .mockResolvedValue(true);
      const removeSpy = vi
        .spyOn(testVault.entityStore, "removeLabel")
        .mockResolvedValue(true);

      await testVault.addLabel("id", "label");
      await testVault.removeLabel("id", "label");

      expect(addSpy).toHaveBeenCalledWith("id", "label");
      expect(removeSpy).toHaveBeenCalledWith("id", "label");
    });

    it("should perform bulk label operations", async () => {
      const bulkAddSpy = vi
        .spyOn(testVault.entityStore, "bulkAddLabel")
        .mockResolvedValue(1);
      const bulkRemoveSpy = vi
        .spyOn(testVault.entityStore, "bulkRemoveLabel")
        .mockResolvedValue(1);

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

    it("should handle syncWithLocalFolder", async () => {
      testVault.syncCoordinator = {
        syncWithLocalFolder: vi
          .fn()
          .mockImplementation((_id, _h, _e, _w, onState) => {
            onState({ status: "syncing", syncType: "local" });
            return Promise.resolve();
          }),
      } as any;
      vi.mocked(vaultRegistry).activeVaultId = "v1" as any;
      vi.spyOn(testVault, "getActiveVaultHandle").mockResolvedValue({} as any);

      await testVault.syncWithLocalFolder();
      expect(testVault.syncCoordinator!.syncWithLocalFolder).toHaveBeenCalled();
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
