import { describe, it, expect, vi } from "vitest";
import { SyncContentComparator } from "./SyncContentComparator";

describe("SyncContentComparator", () => {
  const comparator = new SyncContentComparator();
  const mockBackend = {
    download: vi.fn(),
  } as any;

  it("compares identical markdown content", async () => {
    const blob = new Blob(["same content"]);

    await expect(
      comparator.compareContent(
        "note.md",
        mockBackend,
        mockBackend,
        undefined,
        undefined,
        blob,
        blob,
      ),
    ).resolves.toBe(true);
  });

  it("detects different binary content across chunks", async () => {
    const size = 1.5 * 1024 * 1024;
    const left = new Uint8Array(size);
    const right = new Uint8Array(size);

    for (let i = 0; i < size; i++) {
      left[i] = i % 255;
      right[i] = i % 255;
    }

    right[Math.floor(1.2 * 1024 * 1024)] = 99;

    await expect(
      comparator.compareContent(
        "image.png",
        mockBackend,
        mockBackend,
        undefined,
        undefined,
        new Blob([left]),
        new Blob([right]),
      ),
    ).resolves.toBe(false);
  });

  it("returns false when file sizes differ", async () => {
    const sliceSpy = vi.spyOn(Blob.prototype, "slice");

    await expect(
      comparator.compareContent(
        "image.png",
        mockBackend,
        mockBackend,
        undefined,
        undefined,
        new Blob([new Uint8Array(10)]),
        new Blob([new Uint8Array(20)]),
      ),
    ).resolves.toBe(false);

    expect(sliceSpy).not.toHaveBeenCalled();
    sliceSpy.mockRestore();
  });
});
