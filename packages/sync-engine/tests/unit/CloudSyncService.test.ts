import { describe, it, expect, vi, beforeEach } from "vitest";
import { CloudSyncService } from "../../src/CloudSyncService";
import { SyncRegistry } from "../../src/SyncRegistry";
import { GDriveBackend } from "../../src/GDriveBackend";

describe("CloudSyncService", () => {
  let service: CloudSyncService;
  let registry: SyncRegistry;
  let gdrive: GDriveBackend;

  beforeEach(() => {
    registry = {
      getEntriesByVault: vi.fn().mockResolvedValue([]),
      getCloudMetadata: vi.fn().mockResolvedValue(null),
      putEntry: vi.fn(),
      putCloudMetadata: vi.fn(),
    } as any;
    gdrive = {
      scan: vi.fn().mockResolvedValue({
        files: [],
        nextToken: "new-token",
      }),
      connect: vi.fn(),
    } as any;
    service = new CloudSyncService(registry, gdrive);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // More deep integration tests would require mocking FileSystemBackend
  // which is instantiated inside CloudSyncService.sync.
});
