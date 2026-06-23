import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockOpfs } from "../../../tests/mocks/storage";
import { cacheService } from "../../services/cache.svelte";
import { SyncStore } from "./sync-store.svelte";
import { notificationStore } from "$lib/stores/ui/notification.svelte";
import { appEventBus } from "@codex/events";
import { vaultEventBus } from "./events.svelte";

vi.hoisted(() => {
  (global as any).$state = (v: any) => v;
  (global as any).$state.raw = (v: any) => v;
});

vi.mock("../../services/cache.svelte", () => ({
  cacheService: {
    preloadVault: vi.fn(),
    getPreloadedEntities: vi.fn(),
    getEntityContent: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
  },
}));

vi.mock("./adapters.svelte", () => ({
  fileIOAdapter: {
    walkDirectory: vi.fn(),
  },
}));

describe("SyncStore", () => {
  let store: SyncStore;
  let repository: {
    entities: Record<string, any>;
    loadFiles: ReturnType<typeof vi.fn>;
    waitForAllSaves: ReturnType<typeof vi.fn>;
  };
  const opfsHandle = createMockOpfs();
  let mockVaultRecord: any;

  beforeEach(() => {
    vi.clearAllMocks();
    notificationStore.confirm = vi.fn();

    repository = {
      entities: {},
      loadFiles: vi.fn().mockResolvedValue(undefined),
      waitForAllSaves: vi.fn().mockResolvedValue(undefined),
    };

    mockVaultRecord = {
      lastInternalChange: 0,
      lastSavedToFolder: 0,
    };

    store = new SyncStore({
      activeVaultId: () => "vault-1",
      activeVaultRecord: () => mockVaultRecord,
      repository: repository as any,
      getSyncCoordinator: vi.fn().mockResolvedValue(null),
      getActiveVaultHandle: vi.fn().mockResolvedValue(opfsHandle),
      getActiveFolderHandle: vi.fn().mockResolvedValue(null),
      ensureServicesInitialized: vi.fn().mockResolvedValue(undefined),
      loadMaps: vi.fn().mockResolvedValue(undefined),
      loadCanvases: vi.fn().mockResolvedValue(undefined),
      updateEntityCount: vi.fn().mockResolvedValue(undefined),
      flushPendingSaves: vi.fn().mockResolvedValue(undefined),
    });
  });

  it("identifies dirty state when internal changes are newer than last save", () => {
    mockVaultRecord.lastInternalChange = 1000;
    mockVaultRecord.lastSavedToFolder = 500;
    expect(store.isDirty).toBe(true);

    mockVaultRecord.lastSavedToFolder = 1500;
    expect(store.isDirty).toBe(false);
  });

  it("prioritizes error status over pending-save derived saving state", () => {
    (repository as any).pendingSaveCount = 2;
    store.setStatus("error");

    expect(store.status).toBe("error");
  });

  it("triggers safety gate on pull() when dirty", async () => {
    mockVaultRecord.lastInternalChange = 1000;
    mockVaultRecord.lastSavedToFolder = 500;

    vi.mocked(notificationStore.confirm).mockResolvedValue(false);
    const pullSpy = vi.fn();

    store = new SyncStore({
      activeVaultId: () => "vault-1",
      activeVaultRecord: () => mockVaultRecord,
      repository: repository as any,
      getSyncCoordinator: vi.fn().mockResolvedValue({ pull: pullSpy }),
      getActiveVaultHandle: vi.fn().mockResolvedValue(opfsHandle),
      getActiveFolderHandle: vi.fn().mockResolvedValue({}),
      ensureServicesInitialized: vi.fn().mockResolvedValue(undefined),
      loadMaps: vi.fn().mockResolvedValue(undefined),
      loadCanvases: vi.fn().mockResolvedValue(undefined),
      updateEntityCount: vi.fn().mockResolvedValue(undefined),
    });

    await store.loadFromFolder();

    expect(notificationStore.confirm).toHaveBeenCalled();
    expect(pullSpy).not.toHaveBeenCalled();
  });

  it("loads cached entities immediately and skips filesystem sync by default", async () => {
    vi.mocked(cacheService.preloadVault).mockResolvedValue(
      new Map([
        [
          "hero-1",
          {
            lastModified: Date.now(),
            entity: {
              id: "hero-1",
              title: "Cached Hero",
              content: "Cached Content",
              lore: "Cached Lore",
              type: "character",
              tags: [],
              labels: [],
              aliases: [],
              connections: [],
              status: "active",
            },
          },
        ],
      ]),
    );

    await store.loadFiles();

    expect(repository.entities["hero-1"]).toMatchObject({
      id: "hero-1",
      title: "Cached Hero",
      content: "Cached Content",
      lore: "Cached Lore",
    });
    expect(repository.loadFiles).not.toHaveBeenCalled();
    expect((store as any).status).toBe("idle");
  });

  it("calls updateEntityCount when loading from a warm cache", async () => {
    const updateEntityCount = vi.fn().mockResolvedValue(undefined);
    store = new SyncStore({
      activeVaultId: () => "vault-1",
      activeVaultRecord: () => mockVaultRecord,
      repository: repository as any,
      getSyncCoordinator: vi.fn().mockResolvedValue(null),
      getActiveVaultHandle: vi.fn().mockResolvedValue(opfsHandle),
      getActiveFolderHandle: vi.fn().mockResolvedValue(null),
      ensureServicesInitialized: vi.fn().mockResolvedValue(undefined),
      loadMaps: vi.fn().mockResolvedValue(undefined),
      loadCanvases: vi.fn().mockResolvedValue(undefined),
      updateEntityCount,
    });

    vi.mocked(cacheService.preloadVault).mockResolvedValue(
      new Map([
        [
          "hero-1",
          {
            lastModified: Date.now(),
            entity: { id: "hero-1" } as any,
          },
        ],
      ]),
    );

    await store.loadFiles(true); // Warm cache, skip sync

    expect(updateEntityCount).toHaveBeenCalledWith("vault-1", 1);
  });

  it("calls updateEntityCount after a full filesystem sync", async () => {
    vi.mocked(cacheService.preloadVault).mockResolvedValue(new Map());
    const updateEntityCount = vi.fn().mockResolvedValue(undefined);

    store = new SyncStore({
      activeVaultId: () => "vault-1",
      activeVaultRecord: () => mockVaultRecord,
      repository: repository as any,
      getSyncCoordinator: vi.fn().mockResolvedValue(null),
      getActiveVaultHandle: vi.fn().mockResolvedValue(opfsHandle),
      getActiveFolderHandle: vi.fn().mockResolvedValue(null),
      ensureServicesInitialized: vi.fn().mockResolvedValue(undefined),
      loadMaps: vi.fn().mockResolvedValue(undefined),
      loadCanvases: vi.fn().mockResolvedValue(undefined),
      updateEntityCount,
    });

    // Simulate loadFiles populating repository.entities and triggering progress
    repository.loadFiles.mockImplementation(
      async (_vId, _handle, onProgress) => {
        repository.entities = Object.fromEntries(
          Array.from({ length: 5 }, (_, i) => [`entity-${i + 1}`, {}]),
        );
        await onProgress({}, 5, 5, { "entity-1": {} });
      },
    );

    await store.loadFiles(false); // Force full sync

    expect(updateEntityCount).toHaveBeenCalledWith("vault-1", 5);
    expect((store as any).status).toBe("idle");
  });

  it("detects conflict files in the vault", async () => {
    const { fileIOAdapter } = await import("./adapters.svelte");
    vi.mocked(fileIOAdapter.walkDirectory).mockResolvedValue([
      {
        path: ["notes", "hero.conflict-1.md"],
        handle: { kind: "file", getFile: vi.fn() },
      } as any,
    ]);

    await store.checkForConflicts();

    expect((store as any).hasConflictFiles).toBe(true);
  });

  it("cleans up conflict files through the sync coordinator", async () => {
    const cleanupConflictFiles = vi.fn().mockResolvedValue(undefined);
    store = new SyncStore({
      activeVaultId: () => "vault-1",
      activeVaultRecord: () => mockVaultRecord,
      repository: repository as any,
      getSyncCoordinator: vi.fn().mockResolvedValue({
        cleanupConflictFiles,
      } as any),
      getActiveVaultHandle: vi.fn().mockResolvedValue(opfsHandle),
      getActiveFolderHandle: vi.fn().mockResolvedValue(null),
      ensureServicesInitialized: vi.fn().mockResolvedValue(undefined),
      loadMaps: vi.fn().mockResolvedValue(undefined),
      loadCanvases: vi.fn().mockResolvedValue(undefined),
      updateEntityCount: vi.fn().mockResolvedValue(undefined),
    });

    await store.cleanupConflictFiles();

    expect(cleanupConflictFiles).toHaveBeenCalledWith(
      "vault-1",
      opfsHandle,
      expect.any(Function),
      expect.any(Function),
      undefined,
    );
  });

  describe("Silent Permission and Transient Status", () => {
    it("US1: silently sets status to needs-permission on load if folder permission prompt is required", async () => {
      vi.mocked(cacheService.preloadVault).mockResolvedValue(new Map());
      const mockFolderHandle = {
        queryPermission: vi.fn().mockResolvedValue("prompt"),
      };

      const updateEntityCount = vi.fn().mockResolvedValue(undefined);
      const storeWithMockFolder = new SyncStore({
        activeVaultId: () => "vault-1",
        activeVaultRecord: () => mockVaultRecord,
        repository: repository as any,
        getSyncCoordinator: vi.fn().mockResolvedValue(null),
        getActiveVaultHandle: vi.fn().mockResolvedValue(opfsHandle),
        getActiveFolderHandle: vi
          .fn()
          .mockResolvedValue(mockFolderHandle as any),
        ensureServicesInitialized: vi.fn().mockResolvedValue(undefined),
        loadMaps: vi.fn().mockResolvedValue(undefined),
        loadCanvases: vi.fn().mockResolvedValue(undefined),
        updateEntityCount,
      });

      await storeWithMockFolder.loadFiles(false);

      expect(mockFolderHandle.queryPermission).toHaveBeenCalledWith({
        mode: "readwrite",
      });
      expect(storeWithMockFolder.status).toBe("needs-permission");
      expect(storeWithMockFolder.hasFolderHandle).toBe(true);
      expect(updateEntityCount).toHaveBeenCalledWith("vault-1", 0);
    });

    it("US1: loads files normally if folder permission is already granted", async () => {
      vi.mocked(cacheService.preloadVault).mockResolvedValue(new Map());
      const mockFolderHandle = {
        queryPermission: vi.fn().mockResolvedValue("granted"),
      };

      const pullSpy = vi.fn();
      const storeWithMockFolder = new SyncStore({
        activeVaultId: () => "vault-1",
        activeVaultRecord: () => mockVaultRecord,
        repository: repository as any,
        getSyncCoordinator: vi.fn().mockResolvedValue({
          syncWithLocalFolder: pullSpy,
        } as any),
        getActiveVaultHandle: vi.fn().mockResolvedValue(opfsHandle),
        getActiveFolderHandle: vi
          .fn()
          .mockResolvedValue(mockFolderHandle as any),
        ensureServicesInitialized: vi.fn().mockResolvedValue(undefined),
        loadMaps: vi.fn().mockResolvedValue(undefined),
        loadCanvases: vi.fn().mockResolvedValue(undefined),
        updateEntityCount: vi.fn().mockResolvedValue(undefined),
      });

      await storeWithMockFolder.loadFiles(false);

      expect(mockFolderHandle.queryPermission).toHaveBeenCalledWith({
        mode: "readwrite",
      });
      expect(pullSpy).toHaveBeenCalled();
      expect(storeWithMockFolder.status).toBe("idle");
    });

    it("US2: saveToFolder requests permission if status is needs-permission", async () => {
      const mockFolderHandle = {
        queryPermission: vi.fn().mockResolvedValue("prompt"),
        requestPermission: vi.fn().mockResolvedValue("granted"),
      };
      const pushSpy = vi
        .fn()
        .mockImplementation(async (_a, _b, _c, _d, onStateChange) => {
          onStateChange({ status: "idle", syncType: null });
        });

      const storeWithMockFolder = new SyncStore({
        activeVaultId: () => "vault-1",
        activeVaultRecord: () => mockVaultRecord,
        repository: repository as any,
        getSyncCoordinator: vi.fn().mockResolvedValue({
          push: pushSpy,
        } as any),
        getActiveVaultHandle: vi.fn().mockResolvedValue(opfsHandle),
        getActiveFolderHandle: vi
          .fn()
          .mockResolvedValue(mockFolderHandle as any),
        ensureServicesInitialized: vi.fn().mockResolvedValue(undefined),
        loadMaps: vi.fn().mockResolvedValue(undefined),
        loadCanvases: vi.fn().mockResolvedValue(undefined),
        updateEntityCount: vi.fn().mockResolvedValue(undefined),
      });

      await storeWithMockFolder.saveToFolder();

      expect(mockFolderHandle.queryPermission).toHaveBeenCalled();
      expect(mockFolderHandle.requestPermission).toHaveBeenCalledWith({
        mode: "readwrite",
      });
      expect(pushSpy).toHaveBeenCalled();
    });

    it("US2: saveToFolder sets needs-permission on permission denial", async () => {
      const mockFolderHandle = {
        queryPermission: vi.fn().mockResolvedValue("prompt"),
        requestPermission: vi.fn().mockResolvedValue("denied"),
      };
      const pushSpy = vi.fn();

      const storeWithMockFolder = new SyncStore({
        activeVaultId: () => "vault-1",
        activeVaultRecord: () => mockVaultRecord,
        repository: repository as any,
        getSyncCoordinator: vi.fn().mockResolvedValue({
          push: pushSpy,
        } as any),
        getActiveVaultHandle: vi.fn().mockResolvedValue(opfsHandle),
        getActiveFolderHandle: vi
          .fn()
          .mockResolvedValue(mockFolderHandle as any),
        ensureServicesInitialized: vi.fn().mockResolvedValue(undefined),
        loadMaps: vi.fn().mockResolvedValue(undefined),
        loadCanvases: vi.fn().mockResolvedValue(undefined),
        updateEntityCount: vi.fn().mockResolvedValue(undefined),
      });

      await storeWithMockFolder.saveToFolder();

      expect(mockFolderHandle.queryPermission).toHaveBeenCalled();
      expect(mockFolderHandle.requestPermission).toHaveBeenCalled();
      expect(pushSpy).not.toHaveBeenCalled();
      expect(storeWithMockFolder.status).toBe("needs-permission");
      expect(storeWithMockFolder.errorMessage).toBe(
        "Permission denied for local folder.",
      );
    });

    it("US3: transitions status to saved for 3 seconds on successful folder save", async () => {
      vi.useFakeTimers();
      const mockFolderHandle = {
        queryPermission: vi.fn().mockResolvedValue("granted"),
      };
      const pushSpy = vi
        .fn()
        .mockImplementation(async (_a, _b, _c, _d, onStateChange) => {
          onStateChange({ status: "idle", syncType: null });
        });

      const storeWithMockFolder = new SyncStore({
        activeVaultId: () => "vault-1",
        activeVaultRecord: () => mockVaultRecord,
        repository: repository as any,
        getSyncCoordinator: vi.fn().mockResolvedValue({
          push: pushSpy,
        } as any),
        getActiveVaultHandle: vi.fn().mockResolvedValue(opfsHandle),
        getActiveFolderHandle: vi
          .fn()
          .mockResolvedValue(mockFolderHandle as any),
        ensureServicesInitialized: vi.fn().mockResolvedValue(undefined),
        loadMaps: vi.fn().mockResolvedValue(undefined),
        loadCanvases: vi.fn().mockResolvedValue(undefined),
        updateEntityCount: vi.fn().mockResolvedValue(undefined),
      });

      await storeWithMockFolder.saveToFolder();

      expect(storeWithMockFolder.status).toBe("saved");

      vi.advanceTimersByTime(3000);
      expect(storeWithMockFolder.status).toBe("idle");
      vi.useRealTimers();
    });
  });

  describe("waitForSaves integration", () => {
    it("should trigger flushPendingSaves when pull, push, or syncWithLocalFolder is executed", async () => {
      const flushPendingSavesSpy = vi.fn().mockResolvedValue(undefined);
      const syncWithLocalFolderSpy = vi
        .fn()
        .mockImplementation(async (_a, _b, _c, _d, waitForSaves, _e) => {
          await waitForSaves();
        });

      const mockFolderHandle = {
        queryPermission: vi.fn().mockResolvedValue("granted"),
      };

      const testStore = new SyncStore({
        activeVaultId: () => "vault-1",
        activeVaultRecord: () => mockVaultRecord,
        repository: repository as any,
        getSyncCoordinator: vi.fn().mockResolvedValue({
          syncWithLocalFolder: syncWithLocalFolderSpy,
        } as any),
        getActiveVaultHandle: vi.fn().mockResolvedValue(opfsHandle),
        getActiveFolderHandle: vi
          .fn()
          .mockResolvedValue(mockFolderHandle as any),
        ensureServicesInitialized: vi.fn().mockResolvedValue(undefined),
        loadMaps: vi.fn().mockResolvedValue(undefined),
        loadCanvases: vi.fn().mockResolvedValue(undefined),
        updateEntityCount: vi.fn().mockResolvedValue(undefined),
        flushPendingSaves: flushPendingSavesSpy,
      });

      await testStore.loadFiles(false); // Force sync, triggers syncWithLocalFolder

      expect(syncWithLocalFolderSpy).toHaveBeenCalled();
      expect(flushPendingSavesSpy).toHaveBeenCalled();
    });

    it("should trigger flushPendingSaves during saveToFolder and loadFromFolder", async () => {
      const flushPendingSavesSpy = vi.fn().mockResolvedValue(undefined);
      const pushSpy = vi
        .fn()
        .mockImplementation(async (_a, _b, _c, waitForSaves, _d) => {
          await waitForSaves();
        });
      const pullSpy = vi
        .fn()
        .mockImplementation(async (_a, _b, _c, waitForSaves, _d) => {
          await waitForSaves();
        });

      const mockFolderHandle = {
        queryPermission: vi.fn().mockResolvedValue("granted"),
      };

      const testStore = new SyncStore({
        activeVaultId: () => "vault-1",
        activeVaultRecord: () => mockVaultRecord,
        repository: repository as any,
        getSyncCoordinator: vi.fn().mockResolvedValue({
          push: pushSpy,
          pull: pullSpy,
          syncWithLocalFolder: vi.fn().mockResolvedValue({
            created: [],
            updated: [],
            deleted: [],
          }),
        } as any),
        getActiveVaultHandle: vi.fn().mockResolvedValue(opfsHandle),
        getActiveFolderHandle: vi
          .fn()
          .mockResolvedValue(mockFolderHandle as any),
        ensureServicesInitialized: vi.fn().mockResolvedValue(undefined),
        loadMaps: vi.fn().mockResolvedValue(undefined),
        loadCanvases: vi.fn().mockResolvedValue(undefined),
        updateEntityCount: vi.fn().mockResolvedValue(undefined),
        flushPendingSaves: flushPendingSavesSpy,
      });

      await testStore.saveToFolder();
      expect(pushSpy).toHaveBeenCalled();
      expect(flushPendingSavesSpy).toHaveBeenCalledTimes(1);

      await testStore.loadFromFolder();
      expect(pullSpy).toHaveBeenCalled();
      expect(flushPendingSavesSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe("Failure Modes & Race Conditions", () => {
    it("US2: loadFromFolder sets needs-permission on permission denial", async () => {
      const mockFolderHandle = {
        queryPermission: vi.fn().mockResolvedValue("prompt"),
        requestPermission: vi.fn().mockResolvedValue("denied"),
      };
      const pullSpy = vi.fn();

      const storeWithMockFolder = new SyncStore({
        activeVaultId: () => "vault-1",
        activeVaultRecord: () => mockVaultRecord,
        repository: repository as any,
        getSyncCoordinator: vi.fn().mockResolvedValue({
          pull: pullSpy,
        } as any),
        getActiveVaultHandle: vi.fn().mockResolvedValue(opfsHandle),
        getActiveFolderHandle: vi
          .fn()
          .mockResolvedValue(mockFolderHandle as any),
        ensureServicesInitialized: vi.fn().mockResolvedValue(undefined),
        loadMaps: vi.fn().mockResolvedValue(undefined),
        loadCanvases: vi.fn().mockResolvedValue(undefined),
        updateEntityCount: vi.fn().mockResolvedValue(undefined),
      });

      await storeWithMockFolder.loadFromFolder();

      expect(mockFolderHandle.queryPermission).toHaveBeenCalled();
      expect(mockFolderHandle.requestPermission).toHaveBeenCalled();
      expect(pullSpy).not.toHaveBeenCalled();
      expect(storeWithMockFolder.status).toBe("needs-permission");
      expect(storeWithMockFolder.errorMessage).toBe(
        "Permission denied for local folder.",
      );
    });

    it("aborts loadFiles early and does not emit completion events if vault is switched during loading", async () => {
      let resolveLoadFiles: () => void = () => {};
      const loadFilesPromise = new Promise<void>((resolve) => {
        resolveLoadFiles = resolve;
      });
      repository.loadFiles.mockReturnValue(loadFilesPromise);

      let activeVault = "vault-1";
      const testStore = new SyncStore({
        activeVaultId: () => activeVault,
        activeVaultRecord: () => mockVaultRecord,
        repository: repository as any,
        getSyncCoordinator: vi.fn().mockResolvedValue(null),
        getActiveVaultHandle: vi.fn().mockResolvedValue(opfsHandle),
        getActiveFolderHandle: vi.fn().mockResolvedValue(null),
        ensureServicesInitialized: vi.fn().mockResolvedValue(undefined),
        loadMaps: vi.fn().mockResolvedValue(undefined),
        loadCanvases: vi.fn().mockResolvedValue(undefined),
        updateEntityCount: vi.fn().mockResolvedValue(undefined),
      });

      const vaultOpeningSpy = vi.spyOn(vaultEventBus, "emit");

      // Start loadFiles (which waits on loadFilesPromise)
      const runLoad = testStore.loadFiles(false);

      expect(testStore.status).toBe("loading");

      // Mid-execution: Switch vault ID
      activeVault = "vault-2";

      // Resolve the loadFiles promise
      resolveLoadFiles();
      await runLoad;

      // Verify that loadMaps and updateEntityCount were NOT called for vault-1
      expect((testStore as any).deps.loadMaps).not.toHaveBeenCalled();
      expect((testStore as any).deps.updateEntityCount).not.toHaveBeenCalled();

      // Verify that SYNC_COMPLETE was NOT emitted for vault-1
      const syncCompleteEmitted = vaultOpeningSpy.mock.calls.some(
        (call) =>
          call[0].type === "SYNC_COMPLETE" && call[0].vaultId === "vault-1",
      );
      expect(syncCompleteEmitted).toBe(false);
    });

    it("aborts saveToFolder early and does not update registry or emit complete event if vault is switched during execution", async () => {
      const mockFolderHandle = {
        queryPermission: vi.fn().mockResolvedValue("granted"),
      };

      let resolvePush: (value: any) => void = () => {};
      const pushPromise = new Promise<void>((resolve) => {
        resolvePush = resolve;
      });

      const pushSpy = vi.fn().mockReturnValue(pushPromise);
      let activeVault = "vault-1";

      const testStore = new SyncStore({
        activeVaultId: () => activeVault,
        activeVaultRecord: () => mockVaultRecord,
        repository: repository as any,
        getSyncCoordinator: vi.fn().mockResolvedValue({
          push: pushSpy,
        } as any),
        getActiveVaultHandle: vi.fn().mockResolvedValue(opfsHandle),
        getActiveFolderHandle: vi
          .fn()
          .mockResolvedValue(mockFolderHandle as any),
        ensureServicesInitialized: vi.fn().mockResolvedValue(undefined),
        loadMaps: vi.fn().mockResolvedValue(undefined),
        loadCanvases: vi.fn().mockResolvedValue(undefined),
        updateEntityCount: vi.fn().mockResolvedValue(undefined),
      });

      const appEventEmitSpy = vi.spyOn(appEventBus, "emit");

      const runSave = testStore.saveToFolder();

      // Switch vault ID mid-save
      activeVault = "vault-2";

      resolvePush(undefined);
      await runSave;

      // Verify that SYNC:LOCAL_PUSH_COMPLETE was NOT emitted for vault-1
      const pushCompleteEmitted = appEventEmitSpy.mock.calls.some(
        (call) =>
          call[0].type === "SYNC:LOCAL_PUSH_COMPLETE" &&
          call[0].payload?.vaultId === "vault-1",
      );
      expect(pushCompleteEmitted).toBe(false);

      // Verify status was not set to "saved" for the new or old vault
      expect(testStore.status).not.toBe("saved");
    });

    it("aborts loadFromFolder early and does not loadFiles or emit complete event if vault is switched during execution", async () => {
      const mockFolderHandle = {
        queryPermission: vi.fn().mockResolvedValue("granted"),
      };

      let resolvePull: (value: any) => void = () => {};
      const pullPromise = new Promise<void>((resolve) => {
        resolvePull = resolve;
      });

      const pullSpy = vi.fn().mockReturnValue(pullPromise);
      let activeVault = "vault-1";

      const testStore = new SyncStore({
        activeVaultId: () => activeVault,
        activeVaultRecord: () => mockVaultRecord,
        repository: repository as any,
        getSyncCoordinator: vi.fn().mockResolvedValue({
          pull: pullSpy,
        } as any),
        getActiveVaultHandle: vi.fn().mockResolvedValue(opfsHandle),
        getActiveFolderHandle: vi
          .fn()
          .mockResolvedValue(mockFolderHandle as any),
        ensureServicesInitialized: vi.fn().mockResolvedValue(undefined),
        loadMaps: vi.fn().mockResolvedValue(undefined),
        loadCanvases: vi.fn().mockResolvedValue(undefined),
        updateEntityCount: vi.fn().mockResolvedValue(undefined),
      });

      const appEventEmitSpy = vi.spyOn(appEventBus, "emit");
      const loadFilesSpy = vi
        .spyOn(testStore, "loadFiles")
        .mockResolvedValue(undefined);

      const runLoad = testStore.loadFromFolder();

      // Switch vault ID mid-load
      activeVault = "vault-2";

      resolvePull(undefined);
      await runLoad;

      // Verify that SYNC:LOCAL_PULL_COMPLETE was NOT emitted for vault-1
      const pullCompleteEmitted = appEventEmitSpy.mock.calls.some(
        (call) =>
          call[0].type === "SYNC:LOCAL_PULL_COMPLETE" &&
          call[0].payload?.vaultId === "vault-1",
      );
      expect(pullCompleteEmitted).toBe(false);

      // Verify loadFiles was NOT called on the store
      expect(loadFilesSpy).not.toHaveBeenCalled();
    });

    it("resets status to idle after vault-switch during saveToFolder (no frozen save spinner)", async () => {
      // Regression for review finding C4: onStateChange vault-ID guard
      // suppresses the final idle transition when vault switches mid-push,
      // leaving _status stuck at "saving" indefinitely.
      const mockFolderHandle = {
        queryPermission: vi.fn().mockResolvedValue("granted"),
      };

      let resolvePush: (value: any) => void = () => {};
      let capturedOnStateChange: ((state: any) => void) | null = null;

      const pushSpy = vi
        .fn()
        .mockImplementation(
          (_vaultId, _opfs, _entities, _waitFn, onStateChange) => {
            capturedOnStateChange = onStateChange;
            return new Promise((resolve) => {
              resolvePush = resolve;
            });
          },
        );

      let activeVault = "vault-1";
      const testStore = new SyncStore({
        activeVaultId: () => activeVault,
        activeVaultRecord: () => mockVaultRecord,
        repository: repository as any,
        getSyncCoordinator: vi.fn().mockResolvedValue({ push: pushSpy } as any),
        getActiveVaultHandle: vi.fn().mockResolvedValue(opfsHandle),
        getActiveFolderHandle: vi
          .fn()
          .mockResolvedValue(mockFolderHandle as any),
        ensureServicesInitialized: vi.fn().mockResolvedValue(undefined),
        loadMaps: vi.fn().mockResolvedValue(undefined),
        loadCanvases: vi.fn().mockResolvedValue(undefined),
        updateEntityCount: vi.fn().mockResolvedValue(undefined),
      });

      const runSave = testStore.saveToFolder();

      // Flush setup awaits so pushSpy (and therefore capturedOnStateChange)
      // is populated before we try to invoke the callback.
      await new Promise((r) => setTimeout(r, 0));

      // Coordinator fires "saving" while vault still matches.
      if (capturedOnStateChange) {
        (capturedOnStateChange as any)({ status: "saving", syncType: "local" });
      }
      expect(testStore.status).toBe("saving");

      // Vault switches — coordinator's final "idle" callback will be suppressed.
      activeVault = "vault-2";

      resolvePush(undefined);
      await runSave;

      // The finally block must have cleared the frozen status.
      expect(testStore.status).toBe("idle");
    });

    it("resets status to idle after vault-switch during loadFromFolder (no frozen load spinner)", async () => {
      // Regression for review finding C4: same race on the pull side.
      const mockFolderHandle = {
        queryPermission: vi.fn().mockResolvedValue("granted"),
      };

      let resolvePull: (value: any) => void = () => {};
      let capturedOnStateChange: ((state: any) => void) | null = null;

      const pullSpy = vi
        .fn()
        .mockImplementation(
          (_vaultId, _opfs, _entities, _waitFn, onStateChange) => {
            capturedOnStateChange = onStateChange;
            return new Promise((resolve) => {
              resolvePull = resolve;
            });
          },
        );

      let activeVault = "vault-1";
      const testStore = new SyncStore({
        activeVaultId: () => activeVault,
        activeVaultRecord: () => mockVaultRecord,
        repository: repository as any,
        getSyncCoordinator: vi.fn().mockResolvedValue({ pull: pullSpy } as any),
        getActiveVaultHandle: vi.fn().mockResolvedValue(opfsHandle),
        getActiveFolderHandle: vi
          .fn()
          .mockResolvedValue(mockFolderHandle as any),
        ensureServicesInitialized: vi.fn().mockResolvedValue(undefined),
        loadMaps: vi.fn().mockResolvedValue(undefined),
        loadCanvases: vi.fn().mockResolvedValue(undefined),
        updateEntityCount: vi.fn().mockResolvedValue(undefined),
      });

      const runLoad = testStore.loadFromFolder();

      // Flush setup awaits so pullSpy is called and capturedOnStateChange set.
      await new Promise((r) => setTimeout(r, 0));

      if (capturedOnStateChange) {
        (capturedOnStateChange as any)({
          status: "loading",
          syncType: "local",
        });
      }
      expect(testStore.status).toBe("loading");

      activeVault = "vault-2";

      resolvePull(undefined);
      await runLoad;

      expect(testStore.status).toBe("idle");
    });
  });

  describe("loadPhase indicator", () => {
    it("advances to 'parsing' during a cold load and resets to null afterwards", async () => {
      vi.mocked(cacheService.preloadVault).mockResolvedValue(new Map());

      let phaseDuringParse: string | null = null;
      repository.loadFiles.mockImplementation(
        async (_vId, _handle, onProgress) => {
          // loadPhase should be "parsing" by the time the parse loop reports.
          phaseDuringParse = (store as any).loadPhase;
          repository.entities = { "entity-1": {} };
          await onProgress({}, 1, 1, { "entity-1": {} });
        },
      );

      expect(store.loadPhase).toBe(null);

      await store.loadFiles(false); // Force full sync (cold load)

      expect(phaseDuringParse).toBe("parsing");
      expect(store.loadPhase).toBe(null);
    });

    it("resets loadPhase to null even when the load throws", async () => {
      vi.mocked(cacheService.preloadVault).mockResolvedValue(new Map());
      repository.loadFiles.mockRejectedValue(new Error("boom"));

      await store.loadFiles(false);

      expect(store.loadPhase).toBe(null);
    });
  });

  describe("loadPublishRegistry dep", () => {
    it("calls loadPublishRegistry alongside loadMaps and loadCanvases after OPFS sync", async () => {
      vi.mocked(cacheService.preloadVault).mockResolvedValue(new Map());
      const loadPublishRegistry = vi.fn().mockResolvedValue(undefined);
      const loadMaps = vi.fn().mockResolvedValue(undefined);
      const loadCanvases = vi.fn().mockResolvedValue(undefined);

      const testStore = new SyncStore({
        activeVaultId: () => "vault-1",
        activeVaultRecord: () => mockVaultRecord,
        repository: repository as any,
        getSyncCoordinator: vi.fn().mockResolvedValue(null),
        getActiveVaultHandle: vi.fn().mockResolvedValue(opfsHandle),
        getActiveFolderHandle: vi.fn().mockResolvedValue(null),
        ensureServicesInitialized: vi.fn().mockResolvedValue(undefined),
        loadMaps,
        loadCanvases,
        loadPublishRegistry,
        updateEntityCount: vi.fn().mockResolvedValue(undefined),
      });

      await testStore.loadFiles(false);

      expect(loadMaps).toHaveBeenCalledWith("vault-1");
      expect(loadCanvases).toHaveBeenCalledWith("vault-1");
      expect(loadPublishRegistry).toHaveBeenCalledWith("vault-1", opfsHandle);
    });

    it("works without loadPublishRegistry dep (backward compat)", async () => {
      vi.mocked(cacheService.preloadVault).mockResolvedValue(new Map());

      const testStore = new SyncStore({
        activeVaultId: () => "vault-1",
        activeVaultRecord: () => mockVaultRecord,
        repository: repository as any,
        getSyncCoordinator: vi.fn().mockResolvedValue(null),
        getActiveVaultHandle: vi.fn().mockResolvedValue(opfsHandle),
        getActiveFolderHandle: vi.fn().mockResolvedValue(null),
        ensureServicesInitialized: vi.fn().mockResolvedValue(undefined),
        loadMaps: vi.fn().mockResolvedValue(undefined),
        loadCanvases: vi.fn().mockResolvedValue(undefined),
        updateEntityCount: vi.fn().mockResolvedValue(undefined),
      });

      await expect(testStore.loadFiles(false)).resolves.toBeUndefined();
    });
  });
});
