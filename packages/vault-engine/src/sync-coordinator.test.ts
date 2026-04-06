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

    it("should promote orphaned conflict files", async () => {
      const mockHandle = {} as FileSystemDirectoryHandle;
      mockIO.walkDirectory.mockResolvedValue([
        {
          path: ["orphan.conflict-123.md"],
          handle: { getFile: vi.fn().mockResolvedValue({ lastModified: 100 }) },
        },
      ]);

      await coordinator.cleanupConflictFiles(
        "v1",
        mockHandle,
        vi.fn(),
        vi.fn(),
      );

      expect(mockIO.writeOpfsFile).toHaveBeenCalledWith(
        ["orphan.md"],
        expect.any(Object),
        mockHandle,
        "v1",
      );
    });

    it("should handle promote error gracefully", async () => {
      const mockHandle = {} as FileSystemDirectoryHandle;
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockIO.walkDirectory.mockResolvedValue([
        {
          path: ["fail.conflict-123.md"],
          handle: { getFile: vi.fn().mockResolvedValue({ lastModified: 100 }) },
        },
      ]);
      mockIO.writeOpfsFile.mockRejectedValue(new Error("Disk full"));

      await coordinator.cleanupConflictFiles(
        "v1",
        mockHandle,
        vi.fn(),
        vi.fn(),
      );

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should handle multiple variants and pick winner", async () => {
      const mockHandle = {} as FileSystemDirectoryHandle;
      mockIO.walkDirectory.mockResolvedValue([
        {
          path: ["f.md"],
          handle: { getFile: vi.fn().mockResolvedValue({ lastModified: 100 }) },
        },
        {
          path: ["f.conflict-1.md"],
          handle: { getFile: vi.fn().mockResolvedValue({ lastModified: 200 }) }, // Newer winner
        },
        {
          path: ["f.conflict-2.md"],
          handle: { getFile: vi.fn().mockResolvedValue({ lastModified: 50 }) }, // Older loser
        },
      ]);

      await coordinator.cleanupConflictFiles(
        "v1",
        mockHandle,
        vi.fn(),
        vi.fn(),
      );

      // Should delete the older two
      expect(mockIO.deleteOpfsEntry).toHaveBeenCalledTimes(3); // f.md, conflict-1 (moved), conflict-2
      expect(mockIO.writeOpfsFile).toHaveBeenCalledWith(
        ["f.md"],
        expect.any(Object),
        mockHandle,
        "v1",
      );
    });

    it("should clean up local handle if granted permission", async () => {
      const mockOpfs = {} as any;
      const mockLocal = {
        queryPermission: vi.fn().mockResolvedValue("granted"),
      } as any;
      mockIO.getLocalHandle.mockResolvedValue(mockLocal);
      mockIO.walkDirectory.mockResolvedValue([]);

      await coordinator.cleanupConflictFiles("v1", mockOpfs, vi.fn(), vi.fn());

      expect(mockIO.walkDirectory).toHaveBeenCalledWith(mockLocal);
    });

    it("should handle squash failure", async () => {
      mockIO.walkDirectory.mockRejectedValue(new Error("Crash"));
      await coordinator.cleanupConflictFiles("v1", {} as any, vi.fn(), vi.fn());
      expect(mockNotifier.notify).toHaveBeenCalledWith(
        expect.stringContaining("Cleanup failed"),
        "error",
      );
    });
  });

  describe("syncWithLocalFolder", () => {
    it("should handle local handle validation failure (NotFoundError)", async () => {
      const mockLocal = {
        values: () => ({
          next: () => {
            const err = new Error("not found");
            err.name = "NotFoundError";
            throw err;
          },
        }),
      } as any;
      mockIO.getLocalHandle.mockResolvedValue(mockLocal);
      mockIO.showDirectoryPicker.mockResolvedValue({ name: "new" } as any);

      await coordinator.syncWithLocalFolder(
        "v1",
        {} as any,
        {},
        vi.fn(),
        vi.fn(),
        vi.fn(),
      );

      expect(mockIO.deleteLocalHandle).toHaveBeenCalledWith("v1");
      expect(mockIO.showDirectoryPicker).toHaveBeenCalled();
    });

    it("should request permission if not granted", async () => {
      const mockLocal = {
        values: () => ({ next: vi.fn().mockResolvedValue({}) }),
        queryPermission: vi.fn().mockResolvedValue("prompt"),
        requestPermission: vi.fn().mockResolvedValue("granted"),
      } as any;
      mockIO.getLocalHandle.mockResolvedValue(mockLocal);

      await coordinator.syncWithLocalFolder(
        "v1",
        {} as any,
        {},
        vi.fn(),
        vi.fn(),
        vi.fn(),
      );

      expect(mockLocal.requestPermission).toHaveBeenCalled();
    });

    it("should reset localHandle if permission denied", async () => {
      const mockLocal = {
        values: () => ({ next: vi.fn().mockResolvedValue({}) }),
        queryPermission: vi.fn().mockResolvedValue("prompt"),
        requestPermission: vi.fn().mockResolvedValue("denied"),
      } as any;
      mockIO.getLocalHandle.mockResolvedValue(mockLocal);
      mockIO.showDirectoryPicker.mockResolvedValue({ name: "new" } as any);

      await coordinator.syncWithLocalFolder(
        "v1",
        {} as any,
        {},
        vi.fn(),
        vi.fn(),
        vi.fn(),
      );

      expect(mockIO.showDirectoryPicker).toHaveBeenCalled();
    });

    it("should handle directory picker abort", async () => {
      mockIO.getLocalHandle.mockResolvedValue(null);
      const abortErr = new Error("Abort");
      abortErr.name = "AbortError";
      mockIO.showDirectoryPicker.mockRejectedValue(abortErr);
      const onStateChange = vi.fn();

      await coordinator.syncWithLocalFolder(
        "v1",
        {} as any,
        {},
        vi.fn(),
        onStateChange,
        vi.fn(),
      );

      expect(onStateChange).not.toHaveBeenCalled();
    });

    it("should handle save queue timeout", async () => {
      mockIO.getLocalHandle.mockResolvedValue(null);
      mockIO.showDirectoryPicker.mockResolvedValue({} as any);

      // We'll mock setTimeout to trigger the timeout quickly in code
      // but actually we just want to see it catch and warn
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // Use a very short timeout for testing
      // (This requires changing the code or being clever with vi.useFakeTimers)
      // For now we'll just test the catch path by rejecting waitForSaves
      await coordinator.syncWithLocalFolder(
        "v1",
        {} as any,
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

    it("should validator skip conflict files and non-markdown", async () => {
      mockIO.getLocalHandle.mockResolvedValue({
        values: () => ({ next: vi.fn().mockResolvedValue({}) }),
        queryPermission: vi.fn().mockResolvedValue("granted"),
      } as any);

      let validator: any;
      mockEngine.sync.mockImplementation((_v, _l, _o, v) => {
        validator = v;
        return Promise.resolve({ created: [], updated: [], deleted: [] });
      });

      await coordinator.syncWithLocalFolder(
        "v1",
        {} as any,
        {},
        vi.fn(),
        vi.fn(),
        vi.fn(),
      );

      expect(await validator("file.conflict-123.md", {})).toBe(false);
      expect(await validator("image.png", {})).toBe(true);
    });

    it("should validator parse markdown if unknown", async () => {
      mockIO.getLocalHandle.mockResolvedValue({
        values: () => ({ next: vi.fn().mockResolvedValue({}) }),
        queryPermission: vi.fn().mockResolvedValue("granted"),
      } as any);

      let validator: any;
      mockEngine.sync.mockImplementation((_v, _l, _o, v) => {
        validator = v;
        return Promise.resolve({ created: [], updated: [], deleted: [] });
      });

      await coordinator.syncWithLocalFolder(
        "v1",
        {} as any,
        {},
        vi.fn(),
        vi.fn(),
        vi.fn(),
      );

      mockIO.parseMarkdown.mockReturnValue({ metadata: { id: "123" } });

      // Mock global FileSystemFileHandle for instanceof check
      const MockHandle = class {};
      vi.stubGlobal("FileSystemFileHandle", MockHandle);

      const mockFileHandle = Object.assign(new MockHandle(), {
        getFile: vi
          .fn()
          .mockResolvedValue({ text: () => Promise.resolve("text") }),
      });

      expect(
        await validator("new.md", { handle: mockFileHandle, size: 100 }),
      ).toBe(true);

      vi.unstubAllGlobals();
    });

    it("should handle link lost error from sync result", async () => {
      mockIO.getLocalHandle.mockResolvedValue({
        values: () => ({ next: vi.fn().mockResolvedValue({}) }),
        queryPermission: vi.fn().mockResolvedValue("granted"),
      } as any);

      mockEngine.sync.mockResolvedValue({
        error: "NotFoundError: folder is gone",
        created: [],
        updated: [],
        deleted: [],
      });

      await coordinator.syncWithLocalFolder(
        "v1",
        {} as any,
        {},
        vi.fn(),
        vi.fn(),
        vi.fn(),
      );

      expect(mockIO.deleteLocalHandle).toHaveBeenCalledWith("v1");
      expect(mockNotifier.notify).toHaveBeenCalledWith(
        expect.stringContaining("lost"),
        "error",
      );
    });

    it("should handle AbortError during sync", async () => {
      mockIO.getLocalHandle.mockResolvedValue({
        values: () => ({ next: vi.fn().mockResolvedValue({}) }),
        queryPermission: vi.fn().mockResolvedValue("granted"),
      } as any);

      const abortErr = new Error("Abort");
      abortErr.name = "AbortError";
      mockEngine.sync.mockRejectedValue(abortErr);
      const onStateChange = vi.fn();

      await coordinator.syncWithLocalFolder(
        "v1",
        {} as any,
        {},
        vi.fn(),
        onStateChange,
        vi.fn(),
      );

      expect(onStateChange).toHaveBeenCalledWith({
        status: "idle",
        syncType: null,
      });
    });

    it("should abort sync if signal is aborted", async () => {
      const onStateChange = vi.fn();
      const signal = AbortSignal.abort();

      await coordinator.syncWithLocalFolder(
        "v1",
        {} as any,
        {},
        vi.fn(),
        onStateChange,
        vi.fn(),
        signal,
      );

      expect(mockEngine.sync).not.toHaveBeenCalled();
    });
  });
});
