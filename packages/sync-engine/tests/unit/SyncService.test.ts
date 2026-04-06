import { describe, it, expect, vi } from "vitest";
import { SyncService } from "../../src/SyncService";
import { type ISyncBackend, type FileMetadata } from "../../src/types";

// Test subclass to expose protected method
class TestSyncService extends SyncService {
  public async testCompareContent(
    path: string,
    fsBackend: ISyncBackend,
    opfsBackend: ISyncBackend,
    fsMetadata?: FileMetadata,
    opfsMetadata?: FileMetadata,
    opfsBlob?: Blob,
    fsBlob?: Blob,
  ) {
    return this.compareContent(
      path,
      fsBackend,
      opfsBackend,
      fsMetadata,
      opfsMetadata,
      opfsBlob,
      fsBlob,
    );
  }
}

describe("SyncService.compareContent", () => {
  const mockRegistry = {} as any;
  const service = new TestSyncService(mockRegistry);
  const mockBackend = {} as any;

  it("should correctly compare identical text files", async () => {
    const blob1 = new Blob(["hello world"]);
    const blob2 = new Blob(["hello world"]);

    const result = await service.testCompareContent(
      "test.md",
      mockBackend,
      mockBackend,
      undefined,
      undefined,
      blob1,
      blob2,
    );

    expect(result).toBe(true);
  });

  it("should correctly identify different text files", async () => {
    const blob1 = new Blob(["hello world"]);
    const blob2 = new Blob(["hello universe"]);

    const result = await service.testCompareContent(
      "test.md",
      mockBackend,
      mockBackend,
      undefined,
      undefined,
      blob1,
      blob2,
    );

    expect(result).toBe(false);
  });

  it("should correctly compare identical large binary files using chunking", async () => {
    // 1.5 MiB of data to trigger chunking (> 1 MiB)
    const size = 1.5 * 1024 * 1024;
    const data = new Uint8Array(size);
    for (let i = 0; i < size; i++) data[i] = i % 256;

    const blob1 = new Blob([data]);
    const blob2 = new Blob([data]);

    const result = await service.testCompareContent(
      "image.png",
      mockBackend,
      mockBackend,
      undefined,
      undefined,
      blob1,
      blob2,
    );

    expect(result).toBe(true);
  });

  it("should correctly identify different large binary files at different offsets", async () => {
    const size = 1.5 * 1024 * 1024;
    const data1 = new Uint8Array(size);
    const data2 = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      data1[i] = i % 256;
      data2[i] = i % 256;
    }

    // Change a byte in the second chunk (> 1 MiB)
    const diffIndex = Math.floor(1.2 * 1024 * 1024);
    data2[diffIndex] = 99;

    expect(data1[diffIndex]).not.toBe(data2[diffIndex]);

    const blob1 = new Blob([data1]);
    const blob2 = new Blob([data2]);

    const result = await service.testCompareContent(
      "image.png",
      mockBackend,
      mockBackend,
      undefined,
      undefined,
      blob1,
      blob2,
    );

    expect(result).toBe(false);
  });

  it("should return false immediately if sizes differ for binary files", async () => {
    const blob1 = new Blob([new Uint8Array(100)]);
    const blob2 = new Blob([new Uint8Array(200)]);

    // Mock slice should not even be called if size check works
    const sliceSpy = vi.spyOn(blob1, "slice");

    const result = await service.testCompareContent(
      "image.png",
      mockBackend,
      mockBackend,
      undefined,
      undefined,
      blob1,
      blob2,
    );

    expect(result).toBe(false);
    expect(sliceSpy).not.toHaveBeenCalled();
  });
});
