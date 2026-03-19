import { describe, it, expect, vi, beforeEach } from "vitest";
import { SyncService } from "./SyncService";

describe("SyncService", () => {
  let service: SyncService;
  let mockRegistry: any;
  let mockFsBackend: any;
  let mockOpfsBackend: any;

  beforeEach(() => {
    mockRegistry = {
      getEntriesByVault: vi.fn().mockResolvedValue([]),
      getEntryByRemoteId: vi.fn().mockResolvedValue(undefined),
      putEntry: vi.fn().mockResolvedValue(undefined),
      deleteEntry: vi.fn().mockResolvedValue(undefined),
      putOpfsState: vi.fn().mockResolvedValue(undefined),
      deleteOpfsState: vi.fn().mockResolvedValue(undefined),
    };

    mockFsBackend = {
      scan: vi.fn().mockResolvedValue({ files: [] }),
      download: vi.fn(),
      upload: vi.fn(),
      delete: vi.fn(),
    };

    mockOpfsBackend = {
      scan: vi.fn().mockResolvedValue({ files: [] }),
      download: vi.fn(),
      upload: vi.fn(),
      delete: vi.fn(),
    };

    service = new SyncService(mockRegistry);
  });

  describe("sync", () => {
    it("should handle MATCH_INITIAL when contents are identical", async () => {
      const fsMetadata = {
        path: "initial.md",
        lastModified: 1000,
        size: 10,
        handle: {},
      };
      const opfsMetadata = {
        path: "initial.md",
        lastModified: 1000,
        size: 10,
        handle: "r1",
        hash: "h1",
      };

      mockFsBackend.scan.mockResolvedValue({ files: [fsMetadata] });
      mockOpfsBackend.scan.mockResolvedValue({ files: [opfsMetadata] });
      mockFsBackend.download.mockResolvedValue(new Blob(["same"]));
      mockOpfsBackend.download.mockResolvedValue(new Blob(["same"]));

      await service.sync("v1", mockFsBackend, mockOpfsBackend);

      expect(mockRegistry.putEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "SYNCED",
        }),
      );
    });

    it("should handle IMPORT_TO_OPFS when local changed (Update)", async () => {
      const registryEntry = {
        filePath: "changed.md",
        vaultId: "v1",
        lastSyncedFsModified: 500,
        lastSyncedFsSize: 10,
        lastSyncedOpfsHash: "h1",
      };

      const fsMetadata = {
        path: "changed.md",
        lastModified: 3000,
        size: 10,
        handle: {},
      };
      const opfsMetadata = {
        path: "changed.md",
        lastModified: 500,
        size: 10,
        handle: "r1",
        hash: "h1",
      };

      mockFsBackend.scan.mockResolvedValue({ files: [fsMetadata] });
      mockOpfsBackend.scan.mockResolvedValue({ files: [opfsMetadata] });
      mockRegistry.getEntriesByVault.mockResolvedValue([registryEntry]);

      mockFsBackend.download.mockResolvedValue(new Blob(["local content"]));
      mockOpfsBackend.upload.mockResolvedValue({
        path: "changed.md",
        lastModified: 500,
        size: 10,
        handle: "r1",
        hash: "new-hash",
      });

      const result = await service.sync("v1", mockFsBackend, mockOpfsBackend);

      expect(mockOpfsBackend.upload).toHaveBeenCalled();
      expect(result.updated).toContain("changed.md");
    });

    it("should handle HANDLE_CONFLICT (Remote newer wins)", async () => {
      const registryEntry = {
        filePath: "conflict.md",
        vaultId: "v1",
        lastSyncedFsModified: 500,
        lastSyncedFsSize: 10,
        lastSyncedOpfsHash: "old-hash",
      };
      const fsMetadata = {
        path: "conflict.md",
        lastModified: 1000,
        size: 10,
        handle: {},
      };
      const opfsMetadata = {
        path: "conflict.md",
        lastModified: 2000,
        size: 10,
        handle: "r1",
        hash: "new-remote-hash",
      };

      mockFsBackend.scan.mockResolvedValue({ files: [fsMetadata] });
      mockOpfsBackend.scan.mockResolvedValue({ files: [opfsMetadata] });
      mockRegistry.getEntriesByVault.mockResolvedValue([registryEntry]);

      mockFsBackend.download.mockResolvedValue(new Blob(["local"]));
      mockOpfsBackend.download.mockResolvedValue(new Blob(["remote"]));

      // Remote is newer, so it should EXPORT_TO_FS (mocking updatedFs)
      mockFsBackend.upload.mockResolvedValue({
        path: "conflict.md",
        lastModified: 2000,
        size: 10,
        handle: {},
      });

      const result = await service.sync("v1", mockFsBackend, mockOpfsBackend);

      expect(result.updated).toContain("conflict.md");
      expect(mockFsBackend.upload).toHaveBeenCalled();
    });

    it("should handle delta sync unchanged files", async () => {
      const registryEntry = {
        filePath: "stable.md",
        vaultId: "v1",
        remoteId: "r1",
        lastSyncedFsModified: 100,
        lastSyncedFsSize: 10,
        lastSyncedOpfsHash: "h1",
      };
      mockRegistry.getEntriesByVault.mockResolvedValue([registryEntry]);
      mockFsBackend.scan.mockResolvedValue({
        files: [{ path: "stable.md", lastModified: 100, size: 10 }],
      });
      mockOpfsBackend.scan.mockResolvedValue({ files: [], nextToken: "t2" });

      const result = await service.sync(
        "v1",
        mockFsBackend,
        mockOpfsBackend,
        "t1",
      );

      expect(result.updated).toHaveLength(0);
    });

    it("should handle sync error gracefully", async () => {
      mockFsBackend.scan.mockRejectedValue(new Error("Crash"));
      const result = await service.sync("v1", mockFsBackend, mockOpfsBackend);
      expect(result.error).toBe("Crash");
    });
  });
});
