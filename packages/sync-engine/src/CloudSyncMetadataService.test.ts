import { describe, it, expect, vi, beforeEach } from "vitest";
import { CloudSyncMetadataService } from "./CloudSyncMetadataService";

describe("CloudSyncMetadataService", () => {
  let service: CloudSyncMetadataService;
  let mockRegistry: any;

  beforeEach(() => {
    mockRegistry = {
      getCloudMetadata: vi.fn(),
      putCloudMetadata: vi.fn(),
      deleteCloudMetadata: vi.fn(),
    };
    service = new CloudSyncMetadataService(mockRegistry, () => 150000);
  });

  it("should get metadata", async () => {
    const meta = { vaultId: "v1", remoteFolderId: "f1" };
    mockRegistry.getCloudMetadata.mockResolvedValue(meta);
    const result = await service.getMetadata("v1");
    expect(result).toBe(meta);
  });

  it("should save metadata", async () => {
    const meta = { vaultId: "v1", remoteFolderId: "f1" } as any;
    await service.saveMetadata(meta);
    expect(mockRegistry.putCloudMetadata).toHaveBeenCalledWith(meta);
  });

  it("should clear metadata", async () => {
    await service.clearMetadata("v1");
    expect(mockRegistry.deleteCloudMetadata).toHaveBeenCalledWith("v1");
  });

  it("should update last sync time", async () => {
    const meta = { vaultId: "v1", remoteFolderId: "f1", lastSyncTime: 100 };
    mockRegistry.getCloudMetadata.mockResolvedValue(meta);

    await service.updateLastSync("v1", "new-token");

    expect(mockRegistry.putCloudMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        lastSyncTime: 150000,
        lastSyncToken: "new-token",
      }),
    );
  });
});
