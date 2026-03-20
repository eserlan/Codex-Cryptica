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
      isNotFoundError: vi.fn().mockReturnValue(false),
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
    global.URL.revokeObjectURL = vi.fn();
    global.fetch = vi.fn();
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

    it("should return blob URLs directly", async () => {
      const result = await assetManager.resolveImageUrl(
        {} as any,
        "blob:123",
      );
      expect(result).toBe("blob:123");
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

    it("should debounce concurrent resolutions for the same path", async () => {
      const p1 = assetManager.resolveImageUrl({} as any, "images/dual.png");
      const p2 = assetManager.resolveImageUrl({} as any, "images/dual.png");
      expect(p1).toBe(p2);
      await p1;
      expect(mockIO.readOpfsBlob).toHaveBeenCalledTimes(1);
    });

    it("should increment ref count and reuse URL from cache", async () => {
      await assetManager.resolveImageUrl({} as any, "images/cached.png");
      mockIO.readOpfsBlob.mockClear();
      
      const result = await assetManager.resolveImageUrl({} as any, "images/cached.png");
      expect(mockIO.readOpfsBlob).not.toHaveBeenCalled();
      expect(result).toBe("blob:mock-url");
    });

    it("should try fallback handle if file not in primary vault", async () => {
      mockIO.readOpfsBlob.mockRejectedValueOnce(new Error("Not found"));
      mockIO.readOpfsBlob.mockResolvedValueOnce(new Blob(["fallback"]));
      
      const vaultHandle = { name: "v1" } as any;
      const fallbackHandle = { name: "f1" } as any;
      
      const result = await assetManager.resolveImageUrl(vaultHandle, "images/missing.png", undefined, fallbackHandle);
      
      expect(mockIO.readOpfsBlob).toHaveBeenCalledTimes(2);
      expect(mockIO.readOpfsBlob).toHaveBeenLastCalledWith(["images", "missing.png"], fallbackHandle);
      expect(result).toBe("blob:mock-url");
    });

    it("should return empty string if ioAdapter identifies a not found error", async () => {
      mockIO.readOpfsBlob.mockRejectedValueOnce(new Error("Missing"));
      mockIO.isNotFoundError.mockReturnValueOnce(true);
      
      const result = await assetManager.resolveImageUrl({} as any, "images/ghost.png");
      expect(result).toBe("");
    });

    it("should return empty string if ioAdapter throws an unexpected error", async () => {
      mockIO.readOpfsBlob.mockRejectedValueOnce(new Error("Disk Failure"));
      mockIO.isNotFoundError.mockReturnValueOnce(false);
      
      const result = await assetManager.resolveImageUrl({} as any, "images/fail.png");
      expect(result).toBe("");
    });

    it("should handle redundant resolution finishing after synchronous check", async () => {
      // 1. First resolution starts
      const p1 = assetManager.resolveImageUrl({} as any, "images/race.png");
      
      // 2. Mock URL cache to have it already (simulating p2 finished while p1 was still in try block)
      (assetManager as any).urlCache.set("images/race.png", { url: "blob:winner", refs: 5 });
      
      const result = await p1;
      expect(result).toBe("blob:winner");
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
      expect((assetManager as any).urlCache.get("images/race.png").refs).toBe(6);
    });

    describe("external URLs", () => {
      it("should return blob URL if no vaultHandle and fetch succeeds (Demo Mode)", async () => {
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          blob: () => Promise.resolve(new Blob(["remote-demo"])),
        });
        const result = await assetManager.resolveImageUrl(undefined, "https://example.com/demo.png");
        expect(global.fetch).toHaveBeenCalled();
        expect(result).toBe("blob:mock-url");
      });

      it("should return original URL if no vaultHandle and fetch fails (Demo Mode)", async () => {
        (global.fetch as any).mockResolvedValueOnce({ ok: false });
        const result = await assetManager.resolveImageUrl(undefined, "https://example.com/fail.png");
        expect(result).toBe("https://example.com/fail.png");
      });

      it("should fetch and cache external https URLs", async () => {
        mockIO.readOpfsBlob.mockRejectedValueOnce(new Error("Not in cache"));
        (global.fetch as any).mockResolvedValue({
          ok: true,
          blob: () => Promise.resolve(new Blob(["remote"])),
        });

        const vaultHandle = { name: "v1" } as any;
        const result = await assetManager.resolveImageUrl(vaultHandle, "https://example.com/img.png");
        
        expect(global.fetch).toHaveBeenCalled();
        expect(mockIO.writeOpfsFile).toHaveBeenCalled();
        expect(result).toBe("blob:mock-url");
      });

      it("should use cached external image if available", async () => {
        mockIO.readOpfsBlob.mockResolvedValueOnce(new Blob(["cached-remote"]));
        const vaultHandle = { name: "v1" } as any;
        
        const result = await assetManager.resolveImageUrl(vaultHandle, "https://example.com/cached.png");
        
        expect(mockIO.readOpfsBlob).toHaveBeenCalled();
        expect(global.fetch).not.toHaveBeenCalled();
        expect(result).toBe("blob:mock-url");
      });

      it("should return original URL if external fetch fails", async () => {
        mockIO.readOpfsBlob.mockRejectedValueOnce(new Error("Not in cache"));
        (global.fetch as any).mockResolvedValue({ ok: false });
        const result = await assetManager.resolveImageUrl({ name: "v1" } as any, "https://example.com/fail.png");
        expect(result).toBe("https://example.com/fail.png");
      });

      it("should return original URL if fetch throws", async () => {
        mockIO.readOpfsBlob.mockRejectedValueOnce(new Error("Not in cache"));
        (global.fetch as any).mockRejectedValueOnce(new Error("Fetch failed"));
        const result = await assetManager.resolveImageUrl({ name: "v1" } as any, "https://example.com/error.png");
        expect(result).toBe("https://example.com/error.png");
      });

      it("should return original URL if directory access throws", async () => {
        mockIO.getDirectoryHandle.mockRejectedValueOnce(new Error("Access Denied"));
        const result = await assetManager.resolveImageUrl({ name: "v1" } as any, "https://example.com/denied.png");
        expect(result).toBe("https://example.com/denied.png");
      });
    });

    it("should return empty string if fileFetcher throws", async () => {
      const fetcher = vi.fn().mockRejectedValueOnce(new Error("Failed"));
      const result = await assetManager.resolveImageUrl({} as any, "images/bad.png", fetcher);
      expect(result).toBe("");
    });
  });

  describe("releaseImageUrl", () => {
    it("should ignore unknown paths", () => {
      assetManager.releaseImageUrl("unknown.png");
      expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    });

    it("should decrement ref count and revoke URL when reaching zero", () => {
      (assetManager as any).urlCache.set("test.png", { url: "blob:test", refs: 1 });
      
      assetManager.releaseImageUrl("test.png");
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test");
      expect((assetManager as any).urlCache.has("test.png")).toBe(false);
    });

    it("should NOT revoke if refs still above zero", () => {
      (assetManager as any).urlCache.set("test.png", { url: "blob:test", refs: 2 });
      
      assetManager.releaseImageUrl("test.png");
      expect(URL.revokeObjectURL).not.toHaveBeenCalled();
      expect((assetManager as any).urlCache.get("test.png").refs).toBe(1);
    });
  });

  describe("clear", () => {
    it("should revoke all cached URLs and clear map", () => {
      (assetManager as any).urlCache.set("a.png", { url: "blob:a", refs: 1 });
      (assetManager as any).urlCache.set("b.png", { url: "blob:b", refs: 1 });
      
      assetManager.clear();
      expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
      expect((assetManager as any).urlCache.size).toBe(0);
    });
  });

  describe("ensureAssetPersisted", () => {
    it("should return early for empty path or protocol paths", async () => {
      await assetManager.ensureAssetPersisted("", {} as any);
      await assetManager.ensureAssetPersisted("https://ex.com", {} as any);
      expect(mockIO.readOpfsBlob).not.toHaveBeenCalled();
    });

    it("should skip if already in OPFS", async () => {
      mockIO.readOpfsBlob.mockResolvedValueOnce(new Blob());
      await assetManager.ensureAssetPersisted("images/exists.png", { name: "v1" } as any);
      expect(mockIO.writeOpfsFile).not.toHaveBeenCalled();
    });

    it("should migrate from blob source", async () => {
      mockIO.readOpfsBlob.mockRejectedValueOnce(new Error("Missing")); // 1. ensure check fails
      
      (global.fetch as any).mockResolvedValue({
        blob: () => Promise.resolve(new Blob(["migrated"])),
      });

      // Trick resolveImageUrl to return a blob URL
      (assetManager as any).urlCache.set("images/source.png", { url: "blob:src", refs: 1 });
      
      await assetManager.ensureAssetPersisted("images/source.png", { name: "v1" } as any);
      expect(mockIO.writeOpfsFile).toHaveBeenCalledWith(
        ["images", "source.png"],
        expect.any(Blob),
        expect.any(Object),
        "v1"
      );
    });

    it("should migrate from fileFetcher source", async () => {
      mockIO.readOpfsBlob.mockRejectedValueOnce(new Error("Missing"));
      const blob = new Blob(["guest-data"]);
      const fetcher = vi.fn().mockResolvedValue(blob);
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(blob),
      });
      
      await assetManager.ensureAssetPersisted("images/guest.png", { name: "v1" } as any, fetcher);
      expect(fetcher).toHaveBeenCalledWith("images/guest.png");
      expect(mockIO.writeOpfsFile).toHaveBeenCalled();
    });

    it("should handle fetch failure during blob migration", async () => {
      mockIO.readOpfsBlob.mockRejectedValueOnce(new Error("Missing"));
      (global.fetch as any).mockRejectedValueOnce(new Error("Network Error"));
      (assetManager as any).urlCache.set("images/fail.png", { url: "blob:fail", refs: 1 });
      
      await assetManager.ensureAssetPersisted("images/fail.png", { name: "v1" } as any);
      expect(mockIO.writeOpfsFile).not.toHaveBeenCalled();
    });

    it("should handle fileFetcher failure during migration", async () => {
      mockIO.readOpfsBlob.mockRejectedValueOnce(new Error("Missing"));
      const fetcher = vi.fn().mockRejectedValueOnce(new Error("Fetch Error"));
      
      await assetManager.ensureAssetPersisted("images/broken.png", { name: "v1" } as any, fetcher);
      expect(mockIO.writeOpfsFile).not.toHaveBeenCalled();
    });
  });
});
