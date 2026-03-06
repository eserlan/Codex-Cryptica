import { describe, it, expect, vi, beforeEach } from "vitest";
import { CloudSyncService } from "../../src/CloudSyncService";
import { SyncRegistry } from "../../src/SyncRegistry";
import { GDriveBackend } from "../../src/GDriveBackend";

describe("CloudSyncService", () => {
  let service: CloudSyncService;
  let registry: SyncRegistry;
  let gdrive: GDriveBackend;
  let mockOpfs: any;

  beforeEach(() => {
    const deletedEntry = {
      filePath: "deleted.md",
      vaultId: "vault-1",
      lastLocalModified: 100,
      lastOpfsModified: 100,
      size: 10,
      status: "SYNCED" as const,
      remoteId: "remote-id-1",
    };

    registry = {
      getEntriesByVault: vi.fn().mockResolvedValue([deletedEntry]),
      getCloudMetadata: vi.fn().mockResolvedValue(null),
      putEntry: vi.fn(),
      putCloudMetadata: vi.fn(),
      getEntryByRemoteId: vi.fn().mockResolvedValue(deletedEntry),
      deleteEntry: vi.fn(),
    } as any;

    gdrive = {
      scan: vi.fn().mockResolvedValue({
        files: [],
        nextToken: "new-token",
      }),
      connect: vi.fn(),
      download: vi.fn(),
      upload: vi.fn(),
      delete: vi.fn(),
    } as any;

    mockOpfs = {
      kind: "directory",
      getFileHandle: vi.fn().mockResolvedValue({
        getFile: vi.fn().mockResolvedValue({
          lastModified: 100,
          size: 10,
          text: async () => "content",
        }),
      }),
      getDirectoryHandle: vi.fn().mockImplementation(() => mockOpfs),
      removeEntry: vi.fn().mockResolvedValue(undefined),
      entries: vi.fn().mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield [
            "deleted.md",
            {
              kind: "file",
              name: "deleted.md",
              getFile: async () => ({
                lastModified: 100,
                size: 10,
              }),
            },
          ];
        },
      }),
    };

    service = new CloudSyncService(registry, gdrive);
  });

  it("should perform a full sync when no token is present", async () => {
    const result = await service.sync("vault-1", mockOpfs);

    expect(gdrive.scan).toHaveBeenCalledWith("vault-1", undefined);
    expect(registry.putCloudMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        vaultId: "vault-1",
        lastSyncToken: "new-token",
      }),
    );
    expect(result.error).toBeUndefined();
  });

  it("should perform a delta sync when a token is present", async () => {
    vi.mocked(registry.getCloudMetadata).mockResolvedValue({
      vaultId: "vault-1",
      gdriveFolderId: "folder-1",
      lastSyncToken: "old-token",
      lastSyncTime: 123,
    });

    await service.sync("vault-1", mockOpfs);

    expect(gdrive.scan).toHaveBeenCalledWith("vault-1", "old-token");
  });

  it("should resolve paths for deleted files in delta sync", async () => {
    vi.mocked(registry.getCloudMetadata).mockResolvedValue({
      vaultId: "vault-1",
      gdriveFolderId: "folder-1",
      lastSyncToken: "old-token",
      lastSyncTime: 123,
    });

    vi.mocked(gdrive.scan).mockResolvedValue({
      files: [
        {
          path: "unknown",
          handle: "remote-id-1",
          isDeleted: true,
          lastModified: 0,
          size: 0,
        },
      ],
      nextToken: "new-token",
    });

    vi.mocked(registry.getEntryByRemoteId).mockResolvedValue({
      filePath: "deleted.md",
      vaultId: "vault-1",
      lastLocalModified: 100,
      lastOpfsModified: 100,
      size: 10,
      status: "SYNCED",
      remoteId: "remote-id-1",
    });

    const result = await service.sync("vault-1", mockOpfs);

    // Should detect the deletion via DiffAlgorithm (which uses the resolved path)
    // and call delete on the local side.
    // In our CloudSyncService, 'local' is FileSystemBackend(opfsHandle).
    // We expect the result to show a deletion if the logic flows correctly.
    expect(registry.getEntryByRemoteId).toHaveBeenCalledWith("remote-id-1");
    expect(result.deleted).toContain("deleted.md");
  });
});
