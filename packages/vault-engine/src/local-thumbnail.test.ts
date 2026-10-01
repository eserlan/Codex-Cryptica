import { describe, expect, it, vi } from "vitest";
import { LocalThumbnailCache } from "./local-thumbnail";
import type { IAssetIOAdapter, IImageProcessor } from "./asset-manager";

function fixture(canGenerate = () => true) {
  const source = new File(["original"], "portrait.png", { lastModified: 100 });
  const thumbnail = new Blob(["thumbnail"]);
  const files = new Map<string, Blob>([["images/portrait.png", source]]);
  const root = {
    name: "vault",
    prefix: "",
  } as unknown as FileSystemDirectoryHandle;
  const io = {
    getDirectoryHandle: vi.fn(async (_root: unknown, path: string[]) => ({
      prefix: path.join("/"),
    })),
    readOpfsBlob: vi.fn(async (path: string[], dir: { prefix: string }) => {
      const blob = files.get([dir.prefix, ...path].filter(Boolean).join("/"));
      if (!blob) throw new Error("missing");
      return blob;
    }),
    writeOpfsFile: vi.fn(
      async (path: string[], blob: Blob, dir: { prefix: string }) => {
        files.set([dir.prefix, ...path].filter(Boolean).join("/"), blob);
      },
    ),
  } as unknown as IAssetIOAdapter;
  const processor = {
    generateThumbnail: vi.fn(async () => thumbnail),
  } as unknown as IImageProcessor;
  const cache = new LocalThumbnailCache(io, processor, canGenerate);
  const resolve = () => cache.resolve(root, "images/portrait.png");
  return { source, thumbnail, files, io, processor, cache, root, resolve };
}

describe("local thumbnails", () => {
  it("returns originals immediately, then persists thumbnails in the background", async () => {
    const f = fixture();
    try {
      expect(await f.resolve()).toBe(f.source);
      expect(f.processor.generateThumbnail).not.toHaveBeenCalled();
      await vi.waitFor(() =>
        expect(f.io.writeOpfsFile).toHaveBeenCalledTimes(1),
      );
      expect(await f.resolve()).toBe(f.thumbnail);
      // A fresh session reuses the persisted thumbnail.
      const next = new LocalThumbnailCache(f.io, f.processor);
      expect(await next.resolve(f.root, "images/portrait.png")).toBe(
        f.thumbnail,
      );
      next.clear();
      expect(f.processor.generateThumbnail).toHaveBeenCalledTimes(1);
    } finally {
      f.cache.clear();
    }
  });
  it("reuses directory handles across repeated reads", async () => {
    const f = fixture(() => false);
    try {
      await f.resolve();
      await f.resolve();
      expect(f.io.getDirectoryHandle).toHaveBeenCalledTimes(2);
      expect(f.processor.generateThumbnail).not.toHaveBeenCalled();
    } finally {
      f.cache.clear();
    }
  });
  it("keeps 1,000 distinct image reads independent of generation", async () => {
    const f = fixture(() => false);
    try {
      const paths = Array.from({ length: 1000 }, (_, i) => `images/${i}.png`);
      paths.forEach((path) => f.files.set(path, f.source));
      const resolved = await Promise.all(
        paths.map((path) => f.cache.resolve(f.root, path)),
      );
      expect(resolved).toHaveLength(1000);
      expect(resolved.every((blob) => blob === f.source)).toBe(true);
      expect(f.io.getDirectoryHandle).toHaveBeenCalledTimes(2);
      expect(f.processor.generateThumbnail).not.toHaveBeenCalled();
    } finally {
      f.cache.clear();
    }
  });
  it("invalidates persisted thumbnails when the source revision changes", async () => {
    const f = fixture();
    try {
      await f.resolve();
      await vi.waitFor(() =>
        expect(f.io.writeOpfsFile).toHaveBeenCalledTimes(1),
      );
      const replacement = new File(["replacement"], "portrait.png", {
        lastModified: 200,
      });
      f.files.set("images/portrait.png", replacement);
      expect(await f.resolve()).toBe(replacement);
      await vi.waitFor(() =>
        expect(f.io.writeOpfsFile).toHaveBeenCalledTimes(2),
      );
    } finally {
      f.cache.clear();
    }
  });
  it("keeps originals usable after background generation fails", async () => {
    const f = fixture();
    try {
      vi.mocked(f.processor.generateThumbnail).mockRejectedValue(
        new Error("decode"),
      );
      expect(await f.resolve()).toBe(f.source);
      await vi.waitFor(() =>
        expect(f.processor.generateThumbnail).toHaveBeenCalledTimes(1),
      );
      expect(f.io.writeOpfsFile).not.toHaveBeenCalled();
    } finally {
      f.cache.clear();
    }
  });
  it("does not persist an in-flight thumbnail after clear", async () => {
    const f = fixture();
    let finish!: (blob: Blob) => void;
    vi.mocked(f.processor.generateThumbnail).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    try {
      await f.resolve();
      await vi.waitFor(() => expect(finish).toBeDefined());
      f.cache.clear();
      finish(f.thumbnail);
      await Promise.resolve();
      await Promise.resolve();
      expect(f.io.writeOpfsFile).not.toHaveBeenCalled();
    } finally {
      f.cache.clear();
    }
  });

  it("keeps originals usable if background cache writing fails", async () => {
    const f = fixture();
    vi.mocked(f.io.writeOpfsFile).mockRejectedValue(new Error("quota"));
    try {
      expect(await f.resolve()).toBe(f.source);
      await vi.waitFor(() =>
        expect(f.io.writeOpfsFile).toHaveBeenCalledTimes(1),
      );
      expect(await f.resolve()).toBe(f.source);
    } finally {
      f.cache.clear();
    }
  });

  it("cancels queued work on clear", async () => {
    const f = fixture();
    await f.resolve();
    f.cache.clear();
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(f.processor.generateThumbnail).not.toHaveBeenCalled();
  });
  it("rejects a missing original", async () => {
    const f = fixture();
    f.files.clear();
    await expect(f.resolve()).rejects.toThrow("missing");
    f.cache.clear();
  });
});
