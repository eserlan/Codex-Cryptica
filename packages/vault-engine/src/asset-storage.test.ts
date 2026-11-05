import { describe, expect, it, vi } from "vitest";
import { AssetStorage } from "./asset-storage";
import type { IAssetIOAdapter, IImageProcessor } from "./asset-types";

function setup() {
  const root = { name: "vault" } as FileSystemDirectoryHandle;
  const io: IAssetIOAdapter = {
    readOpfsBlob: vi.fn().mockRejectedValue(new Error("missing")),
    writeOpfsFile: vi.fn().mockResolvedValue(undefined),
    getDirectoryHandle: vi.fn(),
    isNotFoundError: vi.fn(),
  };
  const processor: IImageProcessor = {
    convertToWebP: vi.fn().mockResolvedValue(new Blob(["webp"])),
    generateThumbnail: vi.fn().mockResolvedValue(new Blob(["thumb"])),
  };
  const fetcher = vi.fn<typeof fetch>();
  return {
    root,
    io,
    processor,
    fetcher,
    storage: new AssetStorage(io, processor, fetcher, { now: () => 42 }),
  };
}

describe("AssetStorage", () => {
  it("saves converted artwork and a thumbnail with the injected clock", async () => {
    const { root, io, processor, storage } = setup();
    const blob = new Blob(["original"]);
    expect(await storage.saveImageToVault(root, blob, "entity")).toEqual({
      image: "images/img_entity_42.webp",
      thumbnail: "images/img_entity_42_thumb.webp",
    });
    expect(processor.generateThumbnail).toHaveBeenCalledWith(blob, 200);
    expect(io.writeOpfsFile).toHaveBeenCalledTimes(2);
    await expect(
      storage.saveImageToVault(undefined, blob, "entity"),
    ).rejects.toThrow("Vault not open");
  });

  it("reads fallback storage after primary storage fails and normalises paths", async () => {
    const { root, io, storage } = setup();
    const fallback = { name: "fallback" } as FileSystemDirectoryHandle;
    const blob = new Blob(["fallback"]);
    vi.mocked(io.readOpfsBlob)
      .mockRejectedValueOnce(new Error("missing"))
      .mockResolvedValueOnce(blob);
    expect(await storage.readLocal("./images/./art.png", root, fallback)).toBe(
      blob,
    );
    expect(io.readOpfsBlob).toHaveBeenLastCalledWith(
      ["images", "art.png"],
      fallback,
    );
    vi.mocked(io.readOpfsBlob).mockRejectedValue(new Error("missing"));
    await expect(storage.readLocal("art.png", root)).rejects.toThrow("missing");
  });

  it("persists a missing relative source and skips existing or remote assets", async () => {
    const { root, io, storage } = setup();
    const blob = new Blob(["guest"]);
    const resolve = vi.fn().mockResolvedValue("images/guest.png");
    const fileFetcher = vi.fn().mockResolvedValue(blob);
    await storage.ensureAssetPersisted(
      "./images/guest.png",
      root,
      resolve,
      fileFetcher,
    );
    expect(io.writeOpfsFile).toHaveBeenCalledWith(
      ["images", "guest.png"],
      blob,
      root,
      "vault",
    );
    vi.mocked(io.readOpfsBlob).mockResolvedValue(blob);
    resolve.mockClear();
    await storage.ensureAssetPersisted("images/guest.png", root, resolve);
    await storage.ensureAssetPersisted(
      "https://example.com/a.png",
      root,
      resolve,
    );
    expect(resolve).not.toHaveBeenCalled();
  });

  it("does not write when a blob or relative source cannot be fetched", async () => {
    const { root, io, storage, fetcher } = setup();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      fetcher.mockRejectedValue(new Error("offline"));
      await storage.ensureAssetPersisted(
        "art.png",
        root,
        async () => "blob:broken",
      );
      await storage.ensureAssetPersisted(
        "art.png",
        root,
        async () => "art.png",
        async () => {
          throw new Error("offline");
        },
      );
      expect(io.writeOpfsFile).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledTimes(2);
    } finally {
      warn.mockRestore();
    }
  });
});
