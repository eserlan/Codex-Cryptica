import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { VaultLifecycleManager } from "./lifecycle";
import { getDB } from "../../utils/idb";
import { vaultEventBus } from "./events.svelte";

// Mock dependencies
const { mockThemeStore, mockOracle } = vi.hoisted(() => {
  return {
    mockThemeStore: {
      loadForVault: vi.fn().mockResolvedValue(undefined),
      init: vi.fn().mockResolvedValue(undefined),
    },
    mockOracle: {
      loadForVault: vi.fn().mockResolvedValue(undefined),
    },
  };
});

vi.mock("../../utils/idb", () => ({
  getDB: vi.fn(),
}));

vi.mock("../map-registry.svelte", () => ({
  mapRegistry: {
    maps: {},
    init: vi.fn(),
  },
}));

vi.mock("../canvas-registry.svelte", () => ({
  canvasRegistry: {
    canvases: {},
    clear: vi.fn(),
    init: vi.fn(),
  },
}));

vi.mock("../vault-registry.svelte", () => ({
  vaultRegistry: {
    init: vi.fn().mockResolvedValue(undefined),
    createVault: vi.fn(),
    deleteVault: vi.fn(),
    setActiveVault: vi.fn(),
    clearActiveVault: vi.fn(),
    updateEntityCount: vi.fn().mockResolvedValue(undefined),
    availableVaults: [],
    isInitialized: false,
  },
}));

vi.mock("../theme.svelte", () => ({
  themeStore: mockThemeStore,
}));

vi.mock("../oracle.svelte", () => ({
  oracle: mockOracle,
}));

vi.mock("$app/environment", () => ({
  browser: true,
  dev: true,
}));

vi.mock("$app/paths", () => ({
  base: "",
}));

vi.mock("$app/navigation", () => ({
  goto: vi.fn(),
  invalidateAll: vi.fn(),
}));

vi.mock("$lib/workers/oracle.worker?worker", () => ({
  default: vi.fn(),
}));

vi.mock("../workers/search.worker?worker", () => ({
  default: vi.fn(),
}));

vi.mock("../../services/cache.svelte", () => ({
  cacheService: {
    clearVault: vi.fn().mockResolvedValue(undefined),
    invalidatePreload: vi.fn(),
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
        _status: "idle",
        get status() {
          return this._status;
        },
        setStatus: vi.fn().mockImplementation(function (this: any, s) {
          this._status = s;
        }),
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
      flushPendingSaves: vi.fn().mockResolvedValue(undefined),
      ensureServicesInitialized: vi.fn().mockResolvedValue(undefined),
      clearStorageCache: vi.fn(),
      getEntities: vi.fn().mockReturnValue({}),
      setDemoVaultName: vi.fn(),
      setInitialized: vi.fn(),
      rebuildEntityIndexes: vi.fn(),
      getServices: vi.fn().mockReturnValue({}),
      setSelectedEntityId: vi.fn(),
      vaultRegistry: {
        init: vi.fn().mockResolvedValue(undefined),
        createVault: vi.fn().mockResolvedValue("test-id"),
        deleteVault: vi.fn(),
        setActiveVault: vi.fn(),
        clearActiveVault: vi.fn().mockResolvedValue(undefined),
        updateEntityCount: vi.fn().mockResolvedValue(undefined),
        availableVaults: [],
        isInitialized: false,
      },
      themeStore: mockThemeStore,
      mapRegistry: { maps: {} },
      canvasRegistry: { clear: vi.fn() },
      ensureAssetPersisted: vi.fn().mockResolvedValue(undefined),
    };

    manager = new VaultLifecycleManager(deps);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("switchVault", () => {
    it("should switch to a new vault and reset state", async () => {
      await manager.switchVault("v2");

      expect(deps.syncStore.setStatus).toHaveBeenCalledWith("loading");
      expect(deps.flushPendingSaves).toHaveBeenCalled();
      expect(deps.repository.clear).toHaveBeenCalled();
      expect(deps.vaultRegistry.setActiveVault).toHaveBeenCalledWith("v2");
      expect(mockOracle.loadForVault).toHaveBeenCalledWith("v2");
      expect(deps.loadFiles).toHaveBeenCalled();
      expect(deps.themeStore.loadForVault).toHaveBeenCalledWith("v2");
      expect(deps.syncStore.setStatus).toHaveBeenCalledWith("idle");
    });

    it("should return early if already on the target vault", async () => {
      await manager.switchVault("v1");
      expect(deps.vaultRegistry.setActiveVault).not.toHaveBeenCalled();
    });

    it("should serialize multiple switchVault calls using a lock", async () => {
      vi.useFakeTimers();
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

      await vi.runAllTimersAsync();
      await Promise.all([p1, p2]);

      expect(callOrder).toEqual([
        "start-vault-1",
        "end-vault-1",
        "start-vault-2",
        "end-vault-2",
      ]);
    });

    it("should recover the switchLock chain if a switch fails", async () => {
      vi.mocked(deps.vaultRegistry.setActiveVault).mockRejectedValueOnce(
        new Error("Switch failed"),
      );

      await expect(manager.switchVault("failing-vault")).rejects.toThrow(
        "Switch failed",
      );

      // Subsequent switch should succeed and not be blocked or ignored
      await manager.switchVault("working-vault");
      expect(deps.vaultRegistry.setActiveVault).toHaveBeenCalledWith(
        "working-vault",
      );
    });

    it("US4: should switch vaults even if flushPendingSaves is hung and exceeds the 5-second timeout", async () => {
      vi.useFakeTimers();
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      // Simulate flushPendingSaves never resolving
      deps.flushPendingSaves.mockReturnValue(new Promise(() => {}));

      const switchPromise = manager.switchVault("v2");

      // Advance timers by 5000ms
      await vi.advanceTimersByTimeAsync(5000);

      await switchPromise;

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Save drain timed out or failed during switch"),
      );
      expect(deps.vaultRegistry.setActiveVault).toHaveBeenCalledWith("v2");

      consoleWarnSpy.mockRestore();
      vi.useRealTimers();
    });
  });

  describe("deleteVault", () => {
    it("should delete, clear cache and switch to next available vault", async () => {
      deps.vaultRegistry.availableVaults = [{ id: "v2" }];
      await manager.deleteVault("v1");

      expect(deps.vaultRegistry.deleteVault).toHaveBeenCalledWith("v1");
      expect(deps.vaultRegistry.setActiveVault).toHaveBeenCalledWith("v2");
    });

    it("should switch away from the active vault before deleting it", async () => {
      deps.activeVaultId.mockReturnValue("active-vault");
      deps.vaultRegistry.availableVaults = [{ id: "other-vault" }];

      await manager.deleteVault("active-vault");

      // Should clear state before switching
      expect(deps.repository.clear).toHaveBeenCalled();
      expect(deps.assetStore.clear).toHaveBeenCalled();
      expect(deps.setSelectedEntityId).toHaveBeenCalledWith(null);
      // Should switch to the next available vault
      expect(deps.vaultRegistry.setActiveVault).toHaveBeenCalledWith(
        "other-vault",
      );
      // Then delete the original vault
      expect(deps.vaultRegistry.deleteVault).toHaveBeenCalledWith(
        "active-vault",
      );
    });

    it("should clear initialized state when deleting the last vault", async () => {
      deps.activeVaultId.mockReturnValue("only-vault");
      deps.vaultRegistry.availableVaults = [];

      await manager.deleteVault("only-vault");

      expect(deps.vaultRegistry.clearActiveVault).toHaveBeenCalled();
      expect(deps.setInitialized).toHaveBeenCalledWith(false);
      expect(deps.syncStore.setStatus).toHaveBeenCalledWith("idle");
      expect(deps.vaultRegistry.deleteVault).toHaveBeenCalledWith("only-vault");
    });
  });

  describe("persistToIndexedDB", () => {
    it("should save all entities to disk and update entity count", async () => {
      const entities = { e1: { id: "e1" }, e2: { id: "e2" } };
      deps.getEntities.mockReturnValue(entities);

      await manager.persistToIndexedDB("v1");

      expect(deps.repository.saveToDisk).toHaveBeenCalledTimes(2);
      expect(deps.vaultRegistry.updateEntityCount).toHaveBeenCalledWith(
        "v1",
        2,
      );
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
    it("should create vault and persist folder handle", async () => {
      deps.vaultRegistry.createVault.mockResolvedValue("v-folder");

      const result = await manager.importFromFolder({ name: "my-dir" } as any);

      expect(deps.vaultRegistry.createVault).toHaveBeenCalledWith("my-dir");
      expect(mockDB.put).toHaveBeenCalledWith(
        "settings",
        expect.any(Object),
        "folderHandle_v-folder",
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

    it("should construct keywords correctly (mirrors SearchService)", async () => {
      const searchIndexSpy = vi.fn().mockResolvedValue(undefined);
      deps.getServices.mockReturnValue({
        search: { index: searchIndexSpy },
      });

      const entities = {
        e1: {
          id: "e1",
          title: "Demo",
          tags: ["tag1", "tag2"],
          lore: "test lore",
          metadata: {
            field1: "val1",
            field2: ["sub1", "sub2"],
            field3: false,
          },
        },
      };

      await manager.loadDemoData("Demo", entities as any);

      const call = searchIndexSpy.mock.calls[0][0];
      expect(call.keywords).toContain("tag1");
      expect(call.keywords).toContain("tag2");
      expect(call.keywords).toContain("test lore");
      expect(call.keywords).toContain("val1");
      expect(call.keywords).toContain("sub1");
      expect(call.keywords).toContain("sub2");
      expect(call.keywords).toContain("false");
    });

    it("rebuilds reactive entity indexes so the graph populates", async () => {
      const entities = { e1: { id: "e1", title: "Demo" } };

      await manager.loadDemoData("Demo", entities as any);

      expect(deps.rebuildEntityIndexes).toHaveBeenCalled();
    });

    it("does NOT emit CACHE_LOADED (avoids search double-index / stale restore)", async () => {
      const entities = { e1: { id: "e1", title: "Demo" } };
      const emitSpy = vi.spyOn(vaultEventBus, "emit");

      await manager.loadDemoData("Demo", entities as any);

      expect(emitSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: "CACHE_LOADED" }),
      );
      emitSpy.mockRestore();
    });
  });

  describe("setupSync", () => {
    it("should persist folder handle and import from folder", async () => {
      deps.vaultRegistry.createVault.mockResolvedValue("v1");
      const handle = { name: "my-sync-folder" } as any;

      await manager.setupSync(handle);

      expect(mockDB.put).toHaveBeenCalledWith(
        "settings",
        handle,
        "folderHandle_v1",
      );
      expect(deps.loadFiles).toHaveBeenCalled();
    });

    it("should return early when no active vault", async () => {
      deps.activeVaultId.mockReturnValue(null);
      const handle = { name: "my-sync-folder" } as any;

      const result = await manager.setupSync(handle);

      expect(result).toBeUndefined();
      expect(mockDB.put).not.toHaveBeenCalled();
    });

    it("should warn but continue when persisting folder handle fails", async () => {
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});
      deps.vaultRegistry.createVault.mockResolvedValue("v1");
      // First put (setupSync's sync handle) rejects, second put (importFromFolder) succeeds
      mockDB.put
        .mockRejectedValueOnce(new Error("IDB blocked"))
        .mockResolvedValue(undefined);

      const handle = { name: "my-sync-folder" } as any;
      await manager.setupSync(handle);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[VaultStore] Could not persist folder handle",
      );
      // Should still proceed to import
      expect(deps.loadFiles).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });
  });

  describe("runMigration", () => {
    it("should return undefined when no active vault", async () => {
      deps.activeVaultId.mockReturnValue(null);
      const result = await manager.runMigration();
      expect(result).toBeUndefined();
    });
  });

  describe("importFromFolder", () => {
    it("should handle import failure gracefully", async () => {
      const error = new Error("Import failed");
      deps.vaultRegistry.createVault.mockRejectedValue(error);

      await expect(
        manager.importFromFolder({ name: "bad-folder" } as any),
      ).rejects.toThrow("Import failed");

      expect(deps.syncStore.setStatus).toHaveBeenCalledWith("error");
      expect(deps.syncStore.setErrorMessage).toHaveBeenCalledWith(
        "Import failed",
      );
    });
  });

  describe("createVault", () => {
    it("should create a vault and switch to it", async () => {
      deps.vaultRegistry.createVault.mockResolvedValue("new-vault-id");

      const result = await manager.createVault("New Vault");

      expect(result).toBe("new-vault-id");
      expect(deps.vaultRegistry.createVault).toHaveBeenCalledWith("New Vault");
      expect(deps.vaultRegistry.setActiveVault).toHaveBeenCalledWith(
        "new-vault-id",
      );
    });
  });
});
