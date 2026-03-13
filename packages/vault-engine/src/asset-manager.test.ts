import { describe, it, expect, vi, beforeEach } from "vitest";
import { AssetManager } from "./asset-manager";
import type { IAssetIOAdapter, IImageProcessor } from "./asset-manager";

describe("AssetManager", () => {
  let assetManager: AssetManager;
  let mockIO: ReturnType<typeof vi.mocked<IAssetIOAdapter>>;
  let mockImageProcessor: ReturnType<typeof vi.mocked<IImageProcessor>>;

  beforeEach(() => {
    mockIO = {
      writeOpfsFile: vi.fn().mockResolvedValue(undefined),
      readOpfsBlob: vi
        .fn()
        .mockResolvedValue(new Blob(["mock data"], { type: "image/png" })),
      getDirectoryHandle: vi.fn().mockResolvedValue({}),
    } as any;

    mockImageProcessor = {
      convertToWebP: vi
        .fn()
        .mockResolvedValue(new Blob(["webp"], { type: "image/webp" })),
      generateThumbnail: vi
        .fn()
        .mockResolvedValue(new Blob(["thumb"], { type: "image/webp" })),
    };

    assetManager = new AssetManager(mockIO, mockImageProcessor);

    // Mock URL.createObjectURL for testing
    global.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
  });

  describe("saveImageToVault", () => {
    it("should throw if vaultHandle is missing", async () => {
      await expect(
        assetManager.saveImageToVault(undefined, new Blob(), "e1"),
      ).rejects.toThrow("Vault not open");
    });

    it("should convert and save image and thumbnail", async () => {
      const mockHandle = { name: "vault-1" } as FileSystemDirectoryHandle;
      const result = await assetManager.saveImageToVault(
        mockHandle,
        new Blob(),
        "e1",
        "original.png",
      );

      expect(mockImageProcessor.convertToWebP).toHaveBeenCalled();
      expect(mockImageProcessor.generateThumbnail).toHaveBeenCalled();
      expect(mockIO.writeOpfsFile).toHaveBeenCalledTimes(2);
      expect(result.image).toContain("original.webp");
      expect(result.thumbnail).toContain("original_thumb.webp");
    });
  });

  describe("resolveImageUrl", () => {
    it("should return empty string for empty path", async () => {
      const result = await assetManager.resolveImageUrl({} as any, "");
      expect(result).toBe("");
    });

    it("should return data URIs directly", async () => {
      const result = await assetManager.resolveImageUrl(
        {} as any,
        "data:image/png;base64,123",
      );
      expect(result).toBe("data:image/png;base64,123");
    });

    it("should use fileFetcher if provided (Guest Mode)", async () => {
      const fetcher = vi.fn().mockResolvedValue(new Blob());
      const result = await assetManager.resolveImageUrl(
        {} as any,
        "images/test.webp",
        fetcher,
      );
      expect(fetcher).toHaveBeenCalledWith("images/test.webp");
      expect(result).toBe("blob:mock-url");
    });

    it("should resolve local OPFS path", async () => {
      const mockHandle = {} as FileSystemDirectoryHandle;
      const result = await assetManager.resolveImageUrl(
        mockHandle,
        "images/test.webp",
      );
      expect(mockIO.readOpfsBlob).toHaveBeenCalledWith(
        ["images", "test.webp"],
        mockHandle,
      );
      expect(result).toBe("blob:mock-url");
    });
  });
});
