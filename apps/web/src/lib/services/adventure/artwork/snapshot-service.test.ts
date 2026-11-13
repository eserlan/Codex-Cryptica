import { describe, expect, it, vi } from "vitest";
import { ArtworkSnapshotService } from "./snapshot-service";
const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1]);
describe("kept artwork snapshot", () => {
  it("writes and verifies the exact source bytes", async () => {
    let stored: Blob | undefined;
    const service = new ArtworkSnapshotService({
      id: () => "unique",
      writeNew: async (_path, blob) => {
        stored = blob;
      },
      read: async () => stored!,
      remove: vi.fn(),
      dimensions: async () => ({ width: 1, height: 1 }),
      digest: async () => "a".repeat(64),
    });
    const result = await service.preserve(
      new Blob([bytes], { type: "image/png" }),
      new AbortController().signal,
    );
    expect(result.path).toBe("images/artwork_unique.png");
    expect(new Uint8Array(await stored!.arrayBuffer())).toEqual(bytes);
  });
  it("rejects mismatched signatures before writing", async () => {
    const write = vi.fn();
    const service = new ArtworkSnapshotService({
      id: () => "unique",
      writeNew: write,
      read: vi.fn(),
      remove: vi.fn(),
      dimensions: async () => ({ width: 1, height: 1 }),
      digest: async () => "a".repeat(64),
    });
    await expect(
      service.preserve(
        new Blob(["not png"], { type: "image/png" }),
        new AbortController().signal,
      ),
    ).rejects.toThrow();
    expect(write).not.toHaveBeenCalled();
  });
  it("removes an uncommitted copy if verification fails", async () => {
    const remove = vi.fn();
    const service = new ArtworkSnapshotService({
      id: () => "unique",
      writeNew: async () => {},
      read: async () => new Blob(["bad"], { type: "image/png" }),
      remove,
      dimensions: async () => ({ width: 1, height: 1 }),
      digest: async (data) =>
        data.byteLength === bytes.length ? "a".repeat(64) : "b".repeat(64),
    });
    await expect(
      service.preserve(
        new Blob([bytes], { type: "image/png" }),
        new AbortController().signal,
      ),
    ).rejects.toThrow();
    expect(remove).toHaveBeenCalledWith("images/artwork_unique.png");
  });
});
