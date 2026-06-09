import { describe, it, expect, vi, beforeEach } from "vitest";
import { SyncCoordinator } from "./sync-coordinator";
import type {
  ISyncIOAdapter,
  ISyncNotifier,
  ISyncEngine,
} from "./sync-coordinator";

describe("SyncCoordinator", () => {
  let coordinator: SyncCoordinator;
  let mockIO: ReturnType<typeof vi.mocked<ISyncIOAdapter>>;
  let mockEngine: ReturnType<typeof vi.mocked<ISyncEngine>>;
  let mockNotifier: ReturnType<typeof vi.mocked<ISyncNotifier>>;

  beforeEach(() => {
    mockIO = {
      walkDirectory: vi.fn(),
      deleteOpfsEntry: vi.fn(),
      writeOpfsFile: vi.fn(),
      getLocalHandle: vi.fn(),
      setLocalHandle: vi.fn(),
      deleteLocalHandle: vi.fn(),
      parseMarkdown: vi.fn(),
      showDirectoryPicker: vi.fn(),
      readOpfsBlob: vi.fn(),
      getDirectoryHandle: vi.fn(),
    } as any;

    mockEngine = {
      sync: vi
        .fn()
        .mockResolvedValue({ created: [], updated: [], deleted: [] }),
    };

    mockNotifier = {
      notify: vi.fn(),
      alert: vi.fn(),
    };

    coordinator = new SyncCoordinator(mockIO, mockEngine, mockNotifier);
  });

  describe("cleanupConflictFiles", () => {
    it("should do nothing if no opfsHandle", async () => {
      const onStatusChange = vi.fn();
      await coordinator.cleanupConflictFiles(
        "v1",
        undefined as any,
        onStatusChange,
        vi.fn(),
      );
      expect(onStatusChange).not.toHaveBeenCalled();
    });

    it("should squash history correctly", async () => {
      const mockHandle = {} as FileSystemDirectoryHandle;
      const onStatusChange = vi.fn();
      const reloadFiles = vi.fn();

      mockIO.walkDirectory.mockResolvedValue([
        {
          path: ["file.md"],
          handle: { getFile: vi.fn().mockResolvedValue({ lastModified: 100 }) },
        },
        {
          path: ["file.conflict-123.md"],
          handle: { getFile: vi.fn().mockResolvedValue({ lastModified: 200 }) },
        },
      ]);

      await coordinator.cleanupConflictFiles(
        "v1",
        mockHandle,
        onStatusChange,
        reloadFiles,
      );

      expect(onStatusChange).toHaveBeenCalledWith("saving");
      expect(onStatusChange).toHaveBeenCalledWith("idle");
      expect(mockIO.writeOpfsFile).toHaveBeenCalled();
      expect(mockIO.deleteOpfsEntry).toHaveBeenCalled();
      expect(reloadFiles).toHaveBeenCalled();
      expect(mockNotifier.notify).toHaveBeenCalledWith(
        expect.stringContaining("History squashed"),
        "success",
      );
    });
  });

  describe("syncWithLocalFolder", () => {
    it("should handle local handle validation failure (NotFoundError)", async () => {
      const err = new Error("not found");
      err.name = "NotFoundError";
      const mockLocal = {
        [Symbol.asyncIterator]: () => ({
          next: async () => {
            throw err;
          },
        }),
        queryPermission: vi.fn().mockResolvedValue("granted"),
        requestPermission: vi.fn().mockResolvedValue("granted"),
      } as any;
      mockIO.getLocalHandle.mockResolvedValue(mockLocal);
      mockIO.showDirectoryPicker.mockResolvedValue({ name: "new" } as any);

      await coordinator.syncWithLocalFolder(
        "v1",
        {} as any,
        "pull",
        {},
        vi.fn(),
        vi.fn(),
        vi.fn(),
      );

      // The loop for await (const _ of localHandle) will trigger the error
      expect(mockIO.deleteLocalHandle).toHaveBeenCalledWith("v1");
      expect(mockIO.showDirectoryPicker).toHaveBeenCalled();
    });

    it("should not request permission automatically and fallback to directory picker if permission not granted", async () => {
      const mockLocal = {
        values: () => ({ next: vi.fn().mockResolvedValue({}) }),
        queryPermission: vi.fn().mockResolvedValue("prompt"),
        requestPermission: vi.fn().mockResolvedValue("granted"),
      } as any;
      mockIO.getLocalHandle.mockResolvedValue(mockLocal);

      await coordinator.syncWithLocalFolder(
        "v1",
        {} as any,
        "pull",
        {},
        vi.fn(),
        vi.fn(),
        vi.fn(),
      );

      expect(mockLocal.requestPermission).not.toHaveBeenCalled();
      expect(mockIO.showDirectoryPicker).toHaveBeenCalled();
    });

    it("should handle save queue timeout", async () => {
      mockIO.getLocalHandle.mockResolvedValue({
        values: () => ({ next: vi.fn().mockResolvedValue({}) }),
        queryPermission: vi.fn().mockResolvedValue("granted"),
      } as any);

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await coordinator.syncWithLocalFolder(
        "v1",
        {} as any,
        "push",
        {},
        () => Promise.reject("timeout"),
        vi.fn(),
        vi.fn(),
      );

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("save queue issues"),
      );
      warnSpy.mockRestore();
    });

    it("should wait for pending saves before pull", async () => {
      mockIO.getLocalHandle.mockResolvedValue({
        values: () => ({ next: vi.fn().mockResolvedValue({}) }),
        queryPermission: vi.fn().mockResolvedValue("granted"),
      } as any);

      const waitForSaves = vi.fn().mockResolvedValue(undefined);

      await coordinator.syncWithLocalFolder(
        "v1",
        {} as any,
        "pull",
        {},
        waitForSaves,
        vi.fn(),
        vi.fn(),
      );

      expect(waitForSaves).toHaveBeenCalled();
    });

    it("should pass failed files in onStateChange", async () => {
      mockIO.getLocalHandle.mockResolvedValue({
        values: () => ({ next: vi.fn().mockResolvedValue({}) }),
        queryPermission: vi.fn().mockResolvedValue("granted"),
      } as any);

      const failed = [{ path: "err.md", error: "fail" }];
      mockEngine.sync.mockResolvedValue({
        created: [],
        updated: [],
        deleted: [],
        failed,
      });

      const onStateChange = vi.fn();
      await coordinator.syncWithLocalFolder(
        "v1",
        {} as any,
        "push",
        {},
        vi.fn(),
        onStateChange,
        vi.fn(),
      );

      expect(onStateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          failedFiles: failed,
        }),
      );
    });

    it("should notify with a warning when sync partially fails", async () => {
      mockIO.getLocalHandle.mockResolvedValue({
        values: () => ({ next: vi.fn().mockResolvedValue({}) }),
        queryPermission: vi.fn().mockResolvedValue("granted"),
      } as any);

      mockEngine.sync.mockResolvedValue({
        created: [{}],
        updated: [],
        deleted: [],
        failed: [{ path: "err.md", error: "fail" }],
      });

      await coordinator.syncWithLocalFolder(
        "v1",
        {} as any,
        "push",
        {},
        vi.fn().mockResolvedValue(undefined),
        vi.fn(),
        vi.fn(),
      );

      expect(mockNotifier.notify).toHaveBeenCalledWith(
        expect.stringContaining("1 file failed"),
        "warning",
      );
    });

    it("should abort sync if signal is aborted", async () => {
      const onStateChange = vi.fn();
      const signal = AbortSignal.abort();

      await coordinator.syncWithLocalFolder(
        "v1",
        {} as any,
        "pull",
        {},
        vi.fn(),
        onStateChange,
        vi.fn(),
        signal,
      );

      expect(mockEngine.sync).not.toHaveBeenCalled();
    });

    it("should handle AbortError thrown during sync and revert status to idle", async () => {
      mockIO.getLocalHandle.mockResolvedValue({
        values: () => ({ next: vi.fn().mockResolvedValue({}) }),
        queryPermission: vi.fn().mockResolvedValue("granted"),
      } as any);

      const abortError = new Error("aborted");
      abortError.name = "AbortError";
      mockEngine.sync.mockRejectedValue(abortError);

      const onStateChange = vi.fn();

      await coordinator.syncWithLocalFolder(
        "v1",
        {} as any,
        "pull",
        {},
        vi.fn().mockResolvedValue(undefined),
        onStateChange,
        vi.fn(),
      );

      expect(onStateChange).toHaveBeenCalledWith(
        expect.objectContaining({ status: "loading", syncType: "local" }),
      );
      expect(onStateChange).toHaveBeenCalledWith(
        expect.objectContaining({ status: "idle", syncType: null }),
      );
      expect(onStateChange).not.toHaveBeenCalledWith(
        expect.objectContaining({ status: "error" }),
      );
    });
  });
});
