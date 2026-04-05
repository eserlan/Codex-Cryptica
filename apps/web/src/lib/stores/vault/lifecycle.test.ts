import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { VaultLifecycleManager } from "./lifecycle";
import { getDB } from "../../utils/idb";

// Mock dependencies
const { mockThemeStore } = vi.hoisted(() => {
  return {
    mockThemeStore: {
      loadForVault: vi.fn().mockResolvedValue(undefined),
      init: vi.fn().mockResolvedValue(undefined),
    },
  };
});

vi.mock("../../utils/idb", () => ({
  getDB: vi.fn(),
}));

vi.mock("../map-registry.svelte", () => ({
  mapRegistry: {
    maps: {},
  },
}));

vi.mock("../canvas-registry.svelte", () => ({
  canvasRegistry: {
    canvases: {},
    clear: vi.fn(),
  },
}));

vi.mock("../vault-registry.svelte", () => ({
  vaultRegistry: {
    createVault: vi.fn(),
    deleteVault: vi.fn(),
    setActiveVault: vi.fn(),
    availableVaults: [],
  },
}));

vi.mock("../theme.svelte", () => ({
  themeStore: mockThemeStore,
}));

vi.mock("../../services/cache.svelte", () => ({
  cacheService: {
    clearVault: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("VaultLifecycleManager", () => {
  let manager: VaultLifecycleManager;
  let deps: any;
  let mockDB: any;

  beforeEach(() => {
    vi.resetAllMocks();

    mockDB = {
      get: vi.fn(),
      put: vi.fn(),
    };
    vi.mocked(getDB).mockResolvedValue(mockDB as any);

    deps = {
      syncStore: {
        setStatus: vi.fn(),
        setErrorMessage: vi.fn(),
        setHasConflictFiles: vi.fn(),
      },
      assetStore: {
        clear: vi.fn(),
      },
      repository: {
        clear: vi.fn(),
        entities: {},
        saveToDisk: vi.fn().mockResolvedValue(undefined),
        waitForAllSaves: vi.fn().mockResolvedValue(undefined),
      },
      activeVaultId: vi.fn().mockReturnValue("v1"),
      getActiveVaultHandle: vi.fn().mockResolvedValue({}),
      loadFiles: vi.fn().mockResolvedValue(undefined),
      ensureServicesInitialized: vi.fn().mockResolvedValue(undefined),
      clearStorageCache: vi.fn(),
      getEntities: vi.fn().mockReturnValue({}),
      setDemoVaultName: vi.fn(),
      setInitialized: vi.fn(),
      getServices: vi.fn().mockReturnValue({}),
      setSelectedEntityId: vi.fn(),
      vaultRegistry: {
        createVault: vi.fn(),
        deleteVault: vi.fn(),
        setActiveVault: vi.fn(),
        availableVaults: [],
      },
      themeStore: mockThemeStore,
      mapRegistry: { maps: {} },
      canvasRegistry: { clear: vi.fn() },
      ensureAssetPersisted: vi.fn().mockResolvedValue(undefined),
    };

    manager = new VaultLifecycleManager(deps);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("switchVault", () => {
    it("should switch to a new vault and reset state", async () => {
      await manager.switchVault("v2");

      expect(deps.repository.waitForAllSaves).toHaveBeenCalled();
      expect(deps.repository.clear).toHaveBeenCalled();
      expect(deps.syncStore.setStatus).toHaveBeenCalledWith("loading");
      expect(deps.vaultRegistry.setActiveVault).toHaveBeenCalledWith("v2");
      expect(deps.loadFiles).toHaveBeenCalledWith(true);
      expect(deps.themeStore.loadForVault).toHaveBeenCalledWith("v2");
      expect(deps.syncStore.setStatus).toHaveBeenCalledWith("idle");
    });

    it("should return early if already on the target vault", async () => {
      await manager.switchVault("v1");
      expect(deps.vaultRegistry.setActiveVault).not.toHaveBeenCalled();
    });

    it("should serialize multiple switchVault calls using a lock", async () => {
      const callOrder: string[] = [];
      deps.activeVaultId.mockReturnValue("initial");

      vi.mocked(deps.vaultRegistry.setActiveVault).mockImplementation(
        async (id: string) => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          callOrder.push(`start-${id}`);
          await new Promise((resolve) => setTimeout(resolve, 50));
          callOrder.push(`end-${id}`);
        },
      );

      const p1 = manager.switchVault("vault-1");
      const p2 = manager.switchVault("vault-2");

      await Promise.all([p1, p2]);

      expect(callOrder).toEqual([
        "start-vault-1",
        "end-vault-1",
        "start-vault-2",
        "end-vault-2",
      ]);
    });
  });

  describe("deleteVault", () => {
    it("should delete, clear cache and switch to next available vault", async () => {
      deps.vaultRegistry.availableVaults = [{ id: "v2" }];
      await manager.deleteVault("v1");

      expect(deps.vaultRegistry.deleteVault).toHaveBeenCalledWith("v1");
      expect(deps.vaultRegistry.setActiveVault).toHaveBeenCalledWith("v2");
    });
  });

  describe("persistToIndexedDB", () => {
    it("should save all entities to disk", async () => {
      const entities = { e1: { id: "e1" } };
      deps.getEntities.mockReturnValue(entities);

      await manager.persistToIndexedDB("v1");

      expect(deps.repository.saveToDisk).toHaveBeenCalled();
      expect(deps.syncStore.setStatus).toHaveBeenCalledWith("saving");
      expect(deps.syncStore.setStatus).toHaveBeenCalledWith("idle");
    });

    it("should handle persistence failure", async () => {
      const entities = { e1: { id: "e1" } };
      deps.getEntities.mockReturnValue(entities);
      deps.repository.saveToDisk.mockRejectedValue(new Error("Disk full"));

      await expect(manager.persistToIndexedDB("v1")).rejects.toThrow(
        "Disk full",
      );
      expect(deps.syncStore.setStatus).toHaveBeenCalledWith("error");
    });
  });

  describe("importFromFolder", () => {
    it("should create vault and persist sync handle", async () => {
      deps.vaultRegistry.createVault.mockResolvedValue("v-folder");

      const result = await manager.importFromFolder({ name: "my-dir" } as any);

      expect(deps.vaultRegistry.createVault).toHaveBeenCalledWith("my-dir");
      expect(mockDB.put).toHaveBeenCalledWith(
        "settings",
        expect.any(Object),
        "syncHandle_v-folder",
      );
      expect(deps.clearStorageCache).toHaveBeenCalled();
      expect(result).toBe("v-folder");
    });
  });

  describe("loadDemoData", () => {
    it("should load demo data and index it", async () => {
      const entities = { e1: { id: "e1", title: "Demo" } };
      deps.getServices.mockReturnValue({
        search: { index: vi.fn().mockResolvedValue(undefined) },
      });

      await manager.loadDemoData("Demo", entities as any);

      expect(deps.ensureServicesInitialized).toHaveBeenCalled();
      expect(deps.repository.entities).toEqual(entities);
      expect(deps.syncStore.setStatus).toHaveBeenCalledWith("idle");
    });
  });
});
