import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// 1. Mock dependencies at the VERY TOP
vi.mock("../map-registry.svelte", () => ({
  mapRegistry: {
    maps: {},
  },
}));

vi.mock("../canvas-registry.svelte", () => ({
  canvasRegistry: {
    clear: vi.fn(),
  },
}));

vi.mock("../../utils/idb", () => ({
  getDB: vi.fn(),
}));

vi.mock("../vault-registry.svelte", () => ({
  vaultRegistry: {
    setActiveVault: vi.fn().mockResolvedValue(undefined),
    createVault: vi.fn().mockResolvedValue("new-id"),
    deleteVault: vi.fn().mockResolvedValue(undefined),
    listVaults: vi.fn().mockResolvedValue(undefined),
    availableVaults: [],
  },
}));

vi.mock("../theme.svelte", () => ({
  themeStore: {
    loadForVault: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock the whole vault.svelte to avoid circular constructor issues
vi.mock("../vault.svelte", () => ({
  vault: {
    clear: vi.fn(),
    loadFiles: vi.fn(),
    entities: {},
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

  beforeEach(() => {
    vi.clearAllMocks();
    mockStatus = vi.fn();
    mockError = vi.fn();

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
    vi.mocked(getDB).mockResolvedValue(mockDB);

    manager = new VaultLifecycleManager(
      mockStatus,
      mockError,
      () => "v1",
      async () => ({}) as any,
      mockRepository,
      { clear: vi.fn() },
      vi.fn().mockResolvedValue(undefined),
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
    vi.unstubAllGlobals();
  });

  describe("switchVault", () => {
    it("should switch to a new vault and reset state", async () => {
      const dispatchSpy = vi.spyOn(window, "dispatchEvent");
      await manager.switchVault("v2");

      expect(mockRepository.clear).toHaveBeenCalled();
      expect(canvasRegistry.clear).toHaveBeenCalled();
      expect(vaultRegistry.setActiveVault).toHaveBeenCalledWith("v2");
      expect(themeStore.loadForVault).toHaveBeenCalledWith("v2");
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: "vault-switched" }),
      );
    });

    it("should return early if already on the target vault", async () => {
      await manager.switchVault("v1");
      expect(vaultRegistry.setActiveVault).not.toHaveBeenCalled();
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

  describe("loadDemoData", () => {
    it("should fix image URLs and index entities", async () => {
      const entities = {
        e1: {
          id: "e1",
          title: "Hero",
          image: "./hero.png",
          tags: ["tag1"],
        },
      };
      const mockSearch = { clear: vi.fn(), index: vi.fn() };
      const getServices = vi.fn().mockReturnValue({ search: mockSearch });

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

      expect(mockSearch.index).toHaveBeenCalledWith(
        expect.objectContaining({ id: "e1" }),
      );
      expect(mockSearch.index).toHaveBeenCalled();
    });
  });

  describe("importFromFolder", () => {
    it("should handle successful folder import", async () => {
      // Mock the dynamic import behavior
      vi.doMock("./io", () => ({
        importFromFolder: vi.fn().mockResolvedValue({ success: true }),
      }));

      await manager.importFromFolder({} as any);

      expect(mockStatus).toHaveBeenCalledWith("loading");
      expect(mockStatus).toHaveBeenCalledWith("idle");
    });

    it("should handle user cancellation", async () => {
      vi.doMock("./io", () => ({
        importFromFolder: vi
          .fn()
          .mockResolvedValue({ success: false, error: "User cancelled" }),
      }));

      await manager.importFromFolder({} as any);
      expect(mockStatus).toHaveBeenCalledWith("idle");
      expect(mockError).not.toHaveBeenCalled();
    });

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
  });

  describe("createVault", () => {
    it("should create a vault and switch to it", async () => {
      const switchSpy = vi
        .spyOn(manager, "switchVault")
        .mockResolvedValue(undefined);
      const id = await manager.createVault("New Vault");
      expect(vaultRegistry.createVault).toHaveBeenCalledWith("New Vault");
      expect(switchSpy).toHaveBeenCalledWith("new-id");
      expect(id).toBe("new-id");
    });
  });

  describe("loadFromFolder", () => {
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
      mockRepository.saveToDisk.mockRejectedValue(new Error("Disk full"));

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

      await expect(manager.persistToIndexedDB("v1")).rejects.toThrow(
        "Disk full",
      );
      expect(mockStatus).toHaveBeenCalledWith("error");
    });
  });
});
