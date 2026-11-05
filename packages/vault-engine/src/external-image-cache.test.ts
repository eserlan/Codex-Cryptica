import { afterEach, describe, expect, it, vi } from "vitest";
import { ExternalImageCache } from "./external-image-cache";
import {
  ExternalImageFiles,
  externalCacheName,
  legacyExternalCacheName,
} from "./external-image-files";
import { ExternalImageNetwork } from "./external-image-network";
import type { IAssetIOAdapter, IImageProcessor } from "./asset-types";

function setup() {
  const blobs = new Map<string, Blob>();
  const root = {
    name: "vault",
    async *entries() {
      for (const name of blobs.keys()) yield [name, {}];
    },
  } as unknown as FileSystemDirectoryHandle;
  const io: IAssetIOAdapter = {
    getDirectoryHandle: vi.fn().mockResolvedValue(root),
    readOpfsBlob: vi.fn(async (path) => {
      const blob = blobs.get(path[path.length - 1]);
      if (!blob) throw new Error("missing");
      return blob;
    }),
    writeOpfsFile: vi.fn(async (path, content) => {
      blobs.set(
        path[path.length - 1],
        typeof content === "string" ? new Blob([content]) : content,
      );
    }),
    isNotFoundError: vi.fn(),
    deleteFile: vi.fn(async (path) => {
      blobs.delete(path[path.length - 1]);
    }),
  };
  const processor: IImageProcessor = {
    convertToWebP: vi.fn(),
    generateThumbnail: vi.fn().mockResolvedValue(new Blob(["thumb"])),
  };
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue({
    ok: true,
    blob: async () => new Blob(["network"]),
  } as Response);
  const files = new ExternalImageFiles(io);
  const network = new ExternalImageNetwork(files, fetcher);
  const idle = vi.fn(() => true);
  const cache = new ExternalImageCache(files, network, processor, idle);
  return { root, blobs, io, processor, fetcher, network, idle, cache };
}

afterEach(() => vi.useRealTimers());

describe("ExternalImageCache", () => {
  it("adopts a legacy cached image even when migration cannot be written", async () => {
    const { root, blobs, io, fetcher, cache } = setup();
    const url = "https://host/expired";
    const original = new Blob(["legacy"]);
    blobs.set(legacyExternalCacheName(url), original);
    vi.mocked(io.writeOpfsFile).mockRejectedValue(new Error("full"));
    expect(await cache.readOrFetchExternal(root, url)).toBe(original);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("caches fetched originals, then replaces them with generated thumbnails", async () => {
    const { root, blobs, processor, fetcher, cache } = setup();
    const url = "https://host/art";
    const name = await externalCacheName(url);
    expect(await cache.readOrFetchExternal(root, url)).toBeInstanceOf(Blob);
    expect(blobs.has(name)).toBe(true);
    const thumb = await cache.readOrCreateExternalThumbnail(root, url);
    expect(thumb).toBeInstanceOf(Blob);
    expect(processor.generateThumbnail).toHaveBeenCalledWith(
      expect.any(Blob),
      200,
    );
    expect(blobs.has(name)).toBe(false);
    expect(await cache.readOrCreateExternalThumbnail(root, url)).toBe(thumb);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(processor.generateThumbnail).toHaveBeenCalledTimes(1);
  });

  it("stops at directory errors and returns null for failed thumbnail generation", async () => {
    const { root, io, processor, fetcher, cache } = setup();
    vi.mocked(io.getDirectoryHandle).mockRejectedValueOnce(new Error("denied"));
    expect(
      await cache.readOrFetchExternal(root, "https://host/denied"),
    ).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
    vi.mocked(processor.generateThumbnail).mockRejectedValue(
      new Error("decode"),
    );
    expect(
      await cache.readOrCreateExternalThumbnail(root, "https://host/broken"),
    ).toBeNull();
    expect(io.deleteFile).not.toHaveBeenCalled();
  });

  it("waits for idle before pruning paired originals and cancels scheduled pruning on clear", async () => {
    vi.useFakeTimers();
    const { root, blobs, io, idle, cache } = setup();
    const name = await externalCacheName("https://host/paired");
    blobs.set(name, new Blob());
    blobs.set(name.replace(/\.cache$/, ".thumb.webp"), new Blob());
    blobs.set("legacy.cache", new Blob());
    idle.mockReturnValue(false);
    cache.pruneDelayMs = 10;
    cache.schedulePrune(root);
    await vi.advanceTimersByTimeAsync(10);
    expect(io.deleteFile).not.toHaveBeenCalled();
    idle.mockReturnValue(true);
    await vi.advanceTimersByTimeAsync(10);
    expect(blobs.has(name)).toBe(false);
    expect(blobs.has("legacy.cache")).toBe(true);
    cache.clear();
    vi.mocked(io.deleteFile!).mockClear();
    cache.schedulePrune(root);
    cache.clear();
    await vi.advanceTimersByTimeAsync(10);
    expect(io.deleteFile).not.toHaveBeenCalled();
  });
});
