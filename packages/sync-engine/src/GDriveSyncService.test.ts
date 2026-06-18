import { describe, it, expect, vi, beforeEach } from "vitest";
import { GDriveSyncService } from "./GDriveSyncService";
import { AppEventBus } from "@codex/events";

describe("GDriveSyncService", () => {
  let service: GDriveSyncService;
  let mockEventBus: AppEventBus;
  let mockSyncService: any;
  let mockMetadataService: any;
  let mockDriveBackend: any;
  let mockOpfsBackend: any;
  let mockDeps: any;

  beforeEach(() => {
    mockEventBus = new AppEventBus();
    mockSyncService = {
      sync: vi.fn().mockResolvedValue({
        created: [],
        updated: [],
        deleted: [],
        failed: [],
        conflicts: [],
      }),
    };
    mockMetadataService = {
      getMetadata: vi.fn().mockResolvedValue({ remoteFolderId: "folder123" }),
      updateLastSync: vi.fn().mockResolvedValue(undefined),
    };
    mockDriveBackend = {
      setVaultFolderId: vi.fn(),
    };
    mockOpfsBackend = {
      setHandle: vi.fn(),
    };
    mockDeps = {
      getOpfsHandle: vi.fn().mockResolvedValue({}),
      now: vi.fn().mockReturnValue(1000000), // Fixed time for tests
    };

    service = new GDriveSyncService(
      mockEventBus,
      mockSyncService,
      mockMetadataService,
      mockDriveBackend,
      mockOpfsBackend,
      mockDeps,
    );
  });

  it("should push to Drive when push() is called", async () => {
    await service.push("v1");

    expect(mockSyncService.sync).toHaveBeenCalledWith(
      "v1",
      mockDriveBackend,
      mockOpfsBackend,
      "push",
    );

    expect(mockDriveBackend.setVaultFolderId).toHaveBeenCalledWith("folder123");
    expect(mockMetadataService.updateLastSync).toHaveBeenCalledWith("v1");
  });

  it("should pull from Drive when pull() is called", async () => {
    await service.pull("v1");

    expect(mockSyncService.sync).toHaveBeenCalledWith(
      "v1",
      mockDriveBackend,
      mockOpfsBackend,
      "pull",
    );
  });

  it("should skip sync if another tab is recently synced", async () => {
    // Simulate another tab starting sync 5 seconds ago
    const fixedNow = 1000000;
    (service as any).lastTabSync = fixedNow - 5000;

    await service.push("v1");

    expect(mockSyncService.sync).not.toHaveBeenCalled();
  });

  it("should emit SYNC:DRIVE_SYNC_FAILED on error", async () => {
    mockSyncService.sync.mockRejectedValue(new Error("Drive Full"));

    const failSpy = vi.fn();
    mockEventBus.subscribe("SYNC:DRIVE_SYNC_FAILED", failSpy);

    await expect(service.push("v1")).rejects.toThrow("Drive Full");

    expect(failSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ error: "Drive Full" }),
      }),
    );
  });
});
