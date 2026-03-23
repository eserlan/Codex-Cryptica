import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockThemeStore } = vi.hoisted(() => {
  return {
    mockThemeStore: {
      loadForVault: vi.fn().mockResolvedValue(undefined),
      init: vi.fn().mockResolvedValue(undefined),
    },
  };
});

// Mock getDB utility
vi.mock("../../utils/idb", () => ({
  getDB: vi.fn(),
}));

// 1. Mock dependencies at the VERY TOP
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

// Mock the whole vault.svelte to avoid circular constructor issues
vi.mock("../vault.svelte", () => ({
  vault: {
    isInitialized: false,
    status: "idle",
    activeVaultId: "v1",
    getActiveVaultHandle: vi.fn().mockResolvedValue({}),
    entities: {},
    loadFiles: vi.fn().mockResolvedValue(undefined),
    persistToIndexedDB: vi.fn().mockResolvedValue(undefined),
    setSelectedEntityId: vi.fn(),
    setHasConflictFiles: vi.fn(),
    assetManager: { clear: vi.fn() },
    repository: {
      clear: vi.fn(),
      waitForAllSaves: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

import { VaultLifecycleManager } from "./lifecycle";
import { getDB } from "../../utils/idb";
import { vaultRegistry } from "../vault-registry.svelte";
import { themeStore } from "../theme.svelte";
import { canvasRegistry } from "../canvas-registry.svelte";
import { mapRegistry } from "../map-registry.svelte";

describe("VaultLifecycleManager", () => {
  let manager: VaultLifecycleManager;
  let mockStatus: any;
  let mockError: any;
  let mockRepository: any;
  let mockDB: any;
  let mockLoadFiles: any;

  beforeEach(() => {
    vi.resetAllMocks();
    mockStatus = vi.fn();
    mockError = vi.fn();
    mockLoadFiles = vi.fn().mockResolvedValue(undefined);
    mockRepository = {
      clear: vi.fn(),
      entities: {},
      saveToDisk: vi.fn().mockResolvedValue(undefined),
      waitForAllSaves: vi.fn().mockResolvedValue(undefined),
    };
    mockDB = {
      get: vi.fn(),
      put: vi.fn(),
    };
    vi.mocked(getDB).mockResolvedValue(mockDB as any);

    manager = new VaultLifecycleManager(
      mockStatus,
      mockError,
      () => "v1",
      async () => ({}) as any,
      mockRepository,
      { clear: vi.fn() },
      mockLoadFiles,
      () => ({}),
      vi.fn(),
      vi.fn(),
      () => ({}),
      vi.fn(),
      vi.fn(),
      vaultRegistry as any,
      themeStore as any,
      mapRegistry as any,
      canvasRegistry as any,
      vi.fn().mockResolvedValue(undefined),
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("switchVault", () => {
    it("should switch to a new vault and reset state", async () => {
      // Mock getDB to return a record so switchVault doesn't bail out or wait forever
      mockDB.get.mockImplementation((store: string, id: string) => {
        if (store === "vaults") return Promise.resolve({ id, name: id });
        return Promise.resolve(undefined);
      });

      await manager.switchVault("v2");

      expect(mockRepository.waitForAllSaves).toHaveBeenCalled();
      expect(mockRepository.clear).toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith("loading");
      expect(vaultRegistry.setActiveVault).toHaveBeenCalledWith("v2");
      expect(mockLoadFiles).toHaveBeenCalledWith(true);
      expect(themeStore.loadForVault).toHaveBeenCalledWith("v2");
      expect(mockStatus).toHaveBeenCalledWith("idle");
    });

    it("should return early if already on the target vault", async () => {
      await manager.switchVault("v1");
      expect(vaultRegistry.setActiveVault).not.toHaveBeenCalled();
    });

    it("should serialize multiple switchVault calls using a lock", async () => {
      const callOrder: string[] = [];

      // Mock setActiveVault to take some time and record order
      vi.mocked(vaultRegistry.setActiveVault).mockImplementation(async (id) => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        callOrder.push(`start-${id}`);
        await new Promise((resolve) => setTimeout(resolve, 50));
        callOrder.push(`end-${id}`);
      });

      // Trigger two rapid switches
      const p1 = manager.switchVault("vault-1");
      const p2 = manager.switchVault("vault-2");

      await Promise.all([p1, p2]);

      // If locked correctly, they must not interleave
      expect(callOrder).toEqual([
        "start-vault-1",
        "end-vault-1",
        "start-vault-2",
        "end-vault-2",
      ]);
    });
  });

  describe("deleteVault", () => {
    it("should delete and switch to next available vault", async () => {
      (vaultRegistry as any).availableVaults = [{ id: "v2" }];
      await manager.deleteVault("v1");

      expect(vaultRegistry.deleteVault).toHaveBeenCalledWith("v1");
      expect(vaultRegistry.setActiveVault).toHaveBeenCalledWith("v2");
    });
  });

  describe("persistToIndexedDB", () => {
    it("should save all entities to disk", async () => {
      const entities = { e1: { id: "e1" } };
      manager = new VaultLifecycleManager(
        mockStatus,
        mockError,
        () => "v1",
        async () => ({}) as any,
        mockRepository,
        { clear: vi.fn() },
        vi.fn(),
        () => entities as any,
        vi.fn(),
        vi.fn(),
        () => ({}),
        vi.fn(),
        vi.fn(),
        vaultRegistry as any,
        themeStore as any,
        mapRegistry as any,
        canvasRegistry as any,
        vi.fn().mockResolvedValue(undefined),
      );

      await manager.persistToIndexedDB("v1");

      expect(mockRepository.saveToDisk).toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith("saving");
      expect(mockStatus).toHaveBeenCalledWith("idle");
    });

    it("should handle persistence failure", async () => {
      const entities = { e1: { id: "e1" } };
      manager = new VaultLifecycleManager(
        mockStatus,
        mockError,
        () => "v1",
        async () => ({}) as any,
        mockRepository,
        { clear: vi.fn() },
        vi.fn(),
        () => entities as any,
        vi.fn(),
        vi.fn(),
        () => ({}),
        vi.fn(),
        vi.fn(),
        vaultRegistry as any,
        themeStore as any,
        mapRegistry as any,
        canvasRegistry as any,
        vi.fn().mockResolvedValue(undefined),
      );

      mockRepository.saveToDisk.mockRejectedValue(new Error("Disk full"));

      // It catches internally, sets status, then RE-THROWS
      await expect(manager.persistToIndexedDB("v1")).rejects.toThrow(
        "Disk full",
      );
      expect(mockStatus).toHaveBeenCalledWith("error");
    });
  });

  describe("importFromFolder", () => {
    it("should handle import failure", async () => {
      vi.doMock("./io", () => ({
        importFromFolder: vi
          .fn()
          .mockResolvedValue({ success: false, error: "Disk full" }),
      }));

      await manager.importFromFolder({} as any);
      expect(mockStatus).toHaveBeenCalledWith("loading");
      expect(mockStatus).toHaveBeenCalledWith("idle");
      expect(mockError).not.toHaveBeenCalled();
    });

    it("should create vault and persist sync handle", async () => {
      const createSpy = vi
        .spyOn(vaultRegistry, "createVault")
        .mockResolvedValue("v-folder");

      // Mock getDB to return a record so switchVault doesn't bail out or wait forever
      mockDB.get.mockImplementation((store: string, id: string) => {
        if (store === "vaults") return Promise.resolve({ id, name: id });
        return Promise.resolve(undefined);
      });

      const result = await manager.importFromFolder({ name: "my-dir" } as any);

      expect(createSpy).toHaveBeenCalledWith("my-dir");

      expect(mockDB.put).toHaveBeenCalledWith(
        "settings",
        expect.any(Object),
        "syncHandle_v-folder",
      );
      expect(result).toBe("v-folder");
    });
  });

  describe("loadDemoData", () => {
    it("should load demo data and index it", async () => {
      const entities = { e1: { id: "e1", title: "Demo" } };
      const getServices = vi.fn().mockReturnValue({
        search: { index: vi.fn().mockResolvedValue(undefined) },
      });

      manager = new VaultLifecycleManager(
        mockStatus,
        mockError,
        () => "v1",
        async () => ({}) as any,
        mockRepository,
        { clear: vi.fn() },
        vi.fn(),
        () => entities as any,
        vi.fn(),
        vi.fn(),
        getServices,
        vi.fn(),
        vi.fn(),
        vaultRegistry as any,
        themeStore as any,
        mapRegistry as any,
        canvasRegistry as any,
        vi.fn().mockResolvedValue(undefined),
      );

      await manager.loadDemoData("Demo", entities as any);

      expect(mockRepository.entities).toEqual(entities);
      expect(getServices).toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith("idle");
    });
  });
});
