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

  describe("syncToLocal", () => {
    it("should prompt for folder if localHandle is missing", async () => {
      mockIO.getLocalHandle.mockResolvedValue(null);
      mockIO.showDirectoryPicker.mockResolvedValue({ name: "local" } as any);
      const onStateChange = vi.fn();

      await coordinator.syncToLocal(
        "v1",
        {} as any,
        {},
        vi.fn().mockResolvedValue(undefined),
        onStateChange,
        vi.fn(),
      );

      expect(mockNotifier.alert).toHaveBeenCalled();
      expect(mockIO.showDirectoryPicker).toHaveBeenCalled();
      expect(mockIO.setLocalHandle).toHaveBeenCalled();
      expect(mockEngine.sync).toHaveBeenCalled();
    });

    it("should handle sync failure gracefully and log it", async () => {
      mockIO.getLocalHandle.mockResolvedValue({
        values: () => ({ next: vi.fn().mockResolvedValue({}) }),
        queryPermission: vi.fn().mockResolvedValue("granted"),
      } as any);

      const logSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockEngine.sync.mockRejectedValue(new Error("Sync failed"));
      const onStateChange = vi.fn();

      await coordinator.syncToLocal(
        "v1",
        {} as any,
        {},
        vi.fn().mockResolvedValue(undefined),
        onStateChange,
        vi.fn(),
      );

      expect(onStateChange).toHaveBeenCalledWith({
        status: "error",
        syncType: null,
        errorMessage: "Sync failed",
      });
      logSpy.mockRestore();
    });

    it("should notify on successful sync", async () => {
      mockIO.getLocalHandle.mockResolvedValue({
        values: () => ({ next: vi.fn().mockResolvedValue({}) }),
        queryPermission: vi.fn().mockResolvedValue("granted"),
      } as any);

      const checkForConflicts = vi.fn();
      const onStateChange = vi.fn();

      await coordinator.syncToLocal(
        "v1",
        {} as any,
        {},
        vi.fn().mockResolvedValue(undefined),
        onStateChange,
        checkForConflicts,
      );

      expect(onStateChange).toHaveBeenCalledWith({
        status: "saving",
        syncType: "local",
      });
      expect(onStateChange).toHaveBeenCalledWith({
        status: "idle",
        syncType: null,
      });
      expect(checkForConflicts).toHaveBeenCalled();
      expect(mockNotifier.notify).toHaveBeenCalledWith(
        expect.stringContaining("Sync complete"),
        "success",
      );
    });
  });
});
