import { describe, it, expect, vi, beforeEach } from "vitest";
import { mapRegistry } from "./map-registry.svelte";
import { vaultRegistry } from "./vault-registry.svelte";
import { uiStore } from "./ui.svelte";
import { loadMapsFromDisk, saveMapsToDisk } from "./vault/io";
import { getVaultDir, deleteOpfsEntry } from "../utils/opfs";

// Mock dependencies
vi.mock("./vault-registry.svelte", () => ({
  vaultRegistry: {
    rootHandle: {},
    activeVaultId: "v1",
    updateEntityCount: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("./ui.svelte", () => ({
  uiStore: {
    isDemoMode: false,
    notify: vi.fn(),
  },
}));

vi.mock("./vault/io", () => ({
  loadMapsFromDisk: vi.fn(),
  saveMapsToDisk: vi.fn(),
}));

vi.mock("../utils/opfs", () => ({
  getVaultDir: vi.fn(),
  deleteOpfsEntry: vi.fn().mockResolvedValue(undefined),
}));

describe("MapRegistryStore", () => {
  let mockQueue: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockQueue = {
      enqueue: vi.fn().mockImplementation((_key, task) => task()),
    };
    mapRegistry.init(mockQueue);
    mapRegistry.maps = {};
    (mapRegistry as any).status = "idle";
    (vaultRegistry as any).rootHandle = {};
    (vaultRegistry as any).activeVaultId = "v1";
    (uiStore as any).isDemoMode = false;
  });

  describe("loadFromVault", () => {
    it("should load maps from disk", async () => {
      const mockMaps = { m1: { id: "m1", name: "Map 1" } };
      vi.mocked(loadMapsFromDisk).mockResolvedValue(mockMaps as any);
      vi.mocked(getVaultDir).mockResolvedValue({} as any);

      await mapRegistry.loadFromVault("v1");

      expect(mapRegistry.maps).toEqual(mockMaps);
      expect(mapRegistry.status).toBe("idle");
    });

    it("should handle load error", async () => {
      vi.mocked(getVaultDir).mockRejectedValue(new Error("Failed"));
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await mapRegistry.loadFromVault("v1");

      expect(mapRegistry.status).toBe("error");
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should return early if no rootHandle", async () => {
      (vaultRegistry as any).rootHandle = null;
      await mapRegistry.loadFromVault("v1");
      expect(vi.mocked(getVaultDir)).not.toHaveBeenCalled();
    });
  });

  describe("saveMaps", () => {
    it("should save maps to disk", async () => {
      vi.mocked(getVaultDir).mockResolvedValue({} as any);
      vi.mocked(saveMapsToDisk).mockResolvedValue(undefined);

      await mapRegistry.saveMaps();

      expect(mockQueue.enqueue).toHaveBeenCalledWith(
        "maps-metadata",
        expect.any(Function),
      );
      expect(saveMapsToDisk).toHaveBeenCalled();
      expect(mapRegistry.status).toBe("idle");
    });

    it("should handle save error", async () => {
      vi.mocked(saveMapsToDisk).mockRejectedValue(new Error("Disk Full"));
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await mapRegistry.saveMaps();

      expect(mapRegistry.status).toBe("error");
      expect(uiStore.notify).toHaveBeenCalledWith(
        expect.stringContaining("storage quota"),
        "error",
      );
      consoleSpy.mockRestore();
    });
  });

  describe("deleteMap", () => {
    it("should delete map and associated files", async () => {
      const mockMap = {
        id: "m1",
        assetPath: "assets/m1.png",
        fogOfWar: { maskPath: "masks/m1.png" },
      };
      mapRegistry.maps = { m1: mockMap as any };
      vi.mocked(getVaultDir).mockResolvedValue({} as any);

      await mapRegistry.deleteMap("m1");

      expect(mapRegistry.maps["m1"]).toBeUndefined();
      expect(deleteOpfsEntry).toHaveBeenCalledTimes(2);
      expect(saveMapsToDisk).toHaveBeenCalled();
    });

    it("should handle deletion in Demo Mode", async () => {
      (uiStore as any).isDemoMode = true;
      mapRegistry.maps = { m1: { id: "m1" } as any };

      await mapRegistry.deleteMap("m1");

      expect(uiStore.notify).toHaveBeenCalledWith(
        expect.stringContaining("disabled in Demo Mode"),
        "info",
      );
      expect(mapRegistry.maps["m1"]).toBeDefined();
    });

    it("should ignore NotFoundError during file deletion", async () => {
      const mockMap = { id: "m1", assetPath: "assets/m1.png" };
      mapRegistry.maps = { m1: mockMap as any };
      vi.mocked(getVaultDir).mockResolvedValue({} as any);
      const error = new Error("Not found");
      error.name = "NotFoundError";
      vi.mocked(deleteOpfsEntry).mockRejectedValue(error);

      await expect(mapRegistry.deleteMap("m1")).resolves.toBeUndefined();
      expect(saveMapsToDisk).toHaveBeenCalled();
    });

    it("should throw non-NotFoundError during file deletion", async () => {
      const mockMap = { id: "m1", assetPath: "assets/m1.png" };
      mapRegistry.maps = { m1: mockMap as any };
      vi.mocked(deleteOpfsEntry).mockRejectedValue(
        new Error("Permission denied"),
      );

      await mapRegistry.deleteMap("m1");
      expect(uiStore.notify).toHaveBeenCalledWith(
        expect.stringContaining("Failed to fully delete"),
        "error",
      );
    });

    it("should return early if dependencies missing in saveMaps", async () => {
      (vaultRegistry as any).activeVaultId = null;
      await mapRegistry.saveMaps();
      expect(vi.mocked(saveMapsToDisk)).not.toHaveBeenCalled();
    });

    it("should return early if dependencies missing in deleteMap", async () => {
      (vaultRegistry as any).activeVaultId = null;
      await mapRegistry.deleteMap("m1");
      expect(vi.mocked(deleteOpfsEntry)).not.toHaveBeenCalled();
    });

    it("should return early if map not found in deleteMap", async () => {
      mapRegistry.maps = {};
      await mapRegistry.deleteMap("m1");
      expect(vi.mocked(getVaultDir)).toHaveBeenCalled();
      expect(mockQueue.enqueue).not.toHaveBeenCalled();
    });

    it("should handle saveMapsToDisk error in deleteMap", async () => {
      mapRegistry.maps = { m1: { id: "m1" } as any };
      vi.mocked(saveMapsToDisk).mockRejectedValue(new Error("Disk full"));

      await mapRegistry.deleteMap("m1");
      expect(uiStore.notify).toHaveBeenCalledWith(
        expect.stringContaining("Failed to fully delete map"),
        "error",
      );
    });

    it("should handle error during maskPath deletion", async () => {
      const mockMap = {
        id: "m1",
        assetPath: "assets/m1.png",
        fogOfWar: { maskPath: "masks/m1.png" },
      };
      mapRegistry.maps = { m1: mockMap as any };
      vi.mocked(getVaultDir).mockResolvedValue({} as any);

      // Asset deletion succeeds, but mask deletion fails
      vi.mocked(deleteOpfsEntry)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("Mask delete failed"));

      await mapRegistry.deleteMap("m1");
      expect(uiStore.notify).toHaveBeenCalledWith(
        expect.stringContaining("Mask delete failed"),
        "error",
      );
    });

    it("should ignore NotFoundError during maskPath deletion", async () => {
      const mockMap = {
        id: "m1",
        assetPath: "assets/m1.png",
        fogOfWar: { maskPath: "masks/m1.png" },
      };
      mapRegistry.maps = { m1: mockMap as any };
      vi.mocked(getVaultDir).mockResolvedValue({} as any);

      const error = new Error("Not found");
      error.name = "NotFoundError";

      vi.mocked(deleteOpfsEntry)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(error);

      await mapRegistry.deleteMap("m1");
      expect(saveMapsToDisk).toHaveBeenCalled();
    });
  });
});
