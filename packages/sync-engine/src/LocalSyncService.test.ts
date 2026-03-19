import { describe, it, expect, vi, beforeEach } from "vitest";
import { LocalSyncService } from "./LocalSyncService";

describe("LocalSyncService", () => {
  let mockRegistry: any;
  let service: LocalSyncService;

  beforeEach(() => {
    mockRegistry = {
      clearVault: vi.fn().mockResolvedValue(undefined),
      getEntriesByVault: vi.fn().mockResolvedValue([]),
      getOpfsStatesByVault: vi.fn().mockResolvedValue([]),
    };
    service = new LocalSyncService(mockRegistry);
  });

  it("should reset registry", async () => {
    await service.resetRegistry("v1");
    expect(mockRegistry.clearVault).toHaveBeenCalledWith("v1");
  });

  it("should call underlying sync service", async () => {
    const mockLocalHandle = {
      [Symbol.asyncIterator]: vi
        .fn()
        .mockReturnValue({ next: () => Promise.resolve({ done: true }) }),
    };
    const mockOpfsHandle = {
      [Symbol.asyncIterator]: vi
        .fn()
        .mockReturnValue({ next: () => Promise.resolve({ done: true }) }),
    };

    const result = await service.sync(
      "v1",
      mockLocalHandle as any,
      mockOpfsHandle as any,
    );
    expect(result).toBeDefined();
    expect(result.created).toEqual([]);
  });
});
