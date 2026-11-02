import { describe, expect, it, vi } from "vitest";
import {
  ExternalImageFiles,
  externalCacheName,
  legacyExternalCacheName,
} from "./external-image-files";
import type { IAssetIOAdapter } from "./asset-types";

function setup() {
  const root = { name: "vault" } as FileSystemDirectoryHandle;
  const cache = { name: ".cache" } as FileSystemDirectoryHandle;
  const directory = { name: "external_images" } as FileSystemDirectoryHandle;
  const io: IAssetIOAdapter = {
    readOpfsBlob: vi.fn().mockResolvedValue(new Blob(["cached"])),
    writeOpfsFile: vi.fn().mockResolvedValue(undefined),
    getDirectoryHandle: vi
      .fn()
      .mockResolvedValueOnce(cache)
      .mockResolvedValue(directory),
    isNotFoundError: vi.fn(),
    deleteFile: vi.fn().mockResolvedValue(undefined),
  };
  return { root, cache, directory, io, files: new ExternalImageFiles(io) };
}

describe("ExternalImageFiles", () => {
  it("reads the cache directory and writes paths relative to the vault", async () => {
    const { root, cache, directory, io, files } = setup();
    await files.read(root, "image.cache");
    expect(io.getDirectoryHandle).toHaveBeenNthCalledWith(
      1,
      root,
      [".cache"],
      true,
    );
    expect(io.getDirectoryHandle).toHaveBeenNthCalledWith(
      2,
      cache,
      ["external_images"],
      true,
    );
    expect(io.readOpfsBlob).toHaveBeenCalledWith(["image.cache"], directory);
    await files.write(root, "image.cache", "content");
    expect(io.writeOpfsFile).toHaveBeenCalledWith(
      [".cache", "external_images", "image.cache"],
      "content",
      root,
      "vault",
    );
    expect(files.canDelete).toBe(true);
    await files.dropOriginal(root, "image.cache");
    expect(io.deleteFile).toHaveBeenCalledWith(
      [".cache", "external_images", "image.cache"],
      root,
      "vault",
    );
  });

  it("propagates read/write errors but tolerates unavailable or failed deletion", async () => {
    const { root, io, files } = setup();
    vi.mocked(io.readOpfsBlob).mockRejectedValue(new Error("denied"));
    vi.mocked(io.writeOpfsFile).mockRejectedValue(new Error("full"));
    vi.mocked(io.deleteFile!).mockRejectedValue(new Error("denied"));
    await expect(files.read(root, "image.cache")).rejects.toThrow("denied");
    await expect(files.write(root, "image.cache", "")).rejects.toThrow("full");
    await expect(
      files.dropOriginal(root, "image.cache"),
    ).resolves.toBeUndefined();
    delete io.deleteFile;
    expect(files.canDelete).toBe(false);
    await expect(
      files.dropOriginal(root, "image.cache"),
    ).resolves.toBeUndefined();
  });

  it("hashes exact URLs while retaining the legacy lower-case naming scheme", async () => {
    expect(await externalCacheName("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad.cache",
    );
    expect(await externalCacheName("https://host/Art")).not.toBe(
      await externalCacheName("https://host/art"),
    );
    expect(legacyExternalCacheName("https://HOST/Art.png")).toBe(
      "https___host_art_png.cache",
    );
    expect(legacyExternalCacheName("x".repeat(101))).toHaveLength(106);
  });
});
