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
      const result = await assetManager.resolveImageUrl({} as any, "blob:123");
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

      const result = await assetManager.resolveImageUrl(
        {} as any,
        "images/cached.png",
      );
      expect(mockIO.readOpfsBlob).not.toHaveBeenCalled();
      expect(result).toBe("blob:mock-url");
    });

    it("uses the injected fetcher for external URLs (no global fetch)", async () => {
      const injected = vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(["img"])),
      });
      const isolated = new AssetManager(mockIO, mockImageProcessor, injected);

      // External https URL with no vault handle takes the fetcher path.
      const result = await isolated.resolveImageUrl(
        undefined,
        "https://example.com/pic.png",
      );

      expect(injected).toHaveBeenCalledWith(
        "https://example.com/pic.png",
        expect.objectContaining({ mode: "cors" }),
      );
      expect(global.fetch).not.toHaveBeenCalled();
      expect(result).toBe("blob:mock-url");
    });

    it("should try fallback handle if file not in primary vault", async () => {
      mockIO.readOpfsBlob.mockRejectedValueOnce(new Error("Not found"));
      mockIO.readOpfsBlob.mockResolvedValueOnce(new Blob(["fallback"]));

      const vaultHandle = { name: "v1" } as any;
      const fallbackHandle = { name: "f1" } as any;

      const result = await assetManager.resolveImageUrl(
        vaultHandle,
        "images/missing.png",
        undefined,
        fallbackHandle,
      );

      expect(mockIO.readOpfsBlob).toHaveBeenCalledTimes(2);
      expect(mockIO.readOpfsBlob).toHaveBeenLastCalledWith(
        ["images", "missing.png"],
        fallbackHandle,
      );
      expect(result).toBe("blob:mock-url");
    });

    it("should return empty string if ioAdapter identifies a not found error", async () => {
      mockIO.readOpfsBlob.mockRejectedValueOnce(new Error("Missing"));
      mockIO.isNotFoundError.mockReturnValueOnce(true);

      const result = await assetManager.resolveImageUrl(
        {} as any,
        "images/ghost.png",
      );
      expect(result).toBe("");
    });

    it("should return empty string if ioAdapter throws an unexpected error", async () => {
      mockIO.readOpfsBlob.mockRejectedValueOnce(new Error("Disk Failure"));
      mockIO.isNotFoundError.mockReturnValueOnce(false);

      const result = await assetManager.resolveImageUrl(
        {} as any,
        "images/fail.png",
      );
      expect(result).toBe("");
    });

    it("should handle redundant resolution finishing after synchronous check", async () => {
      // 1. First resolution starts
      const p1 = assetManager.resolveImageUrl({} as any, "images/race.png");

      // 2. Mock URL cache to have it already (simulating p2 finished while p1 was still in try block)
      (assetManager as any).urlCache.set("images/race.png", {
        url: "blob:winner",
        refs: 5,
      });

      const result = await p1;
      expect(result).toBe("blob:winner");
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
      expect((assetManager as any).urlCache.get("images/race.png").refs).toBe(
        6,
      );
    });

    describe("external URLs", () => {
      it("adopts a copy cached under the legacy name without fetching", async () => {
        const url = "https://cdn.discordapp.com/attachments/1/2/Map.png";
        const legacyName =
          url
            .replace(/[^a-z0-9]/gi, "_")
            .toLowerCase()
            .slice(-100) + ".cache";
        const cached = new Blob(["only surviving copy"]);
        mockIO.readOpfsBlob.mockImplementation(async (path: string[]) => {
          if (path[0] === legacyName) return cached;
          throw new Error("not found");
        });
        (global.fetch as any).mockResolvedValue({ ok: false, status: 404 });
        const vaultHandle = { name: "v1" } as any;

        const result = await assetManager.resolveImageUrl(vaultHandle, url);

        expect(result).toBe("blob:mock-url");
        expect(global.fetch).not.toHaveBeenCalled();
        const written = mockIO.writeOpfsFile.mock.calls[0];
        expect(written[0][2]).toMatch(/^[0-9a-f]{64}\.cache$/);
        expect(written[1]).toBe(cached);
      });

      it("fetches when neither the hashed nor the legacy copy exists", async () => {
        mockIO.readOpfsBlob.mockRejectedValue(new Error("not found"));
        (global.fetch as any).mockResolvedValue({
          ok: true,
          blob: () => Promise.resolve(new Blob(["remote"])),
        });

        await assetManager.resolveImageUrl(
          { name: "v1" } as any,
          "https://img.example/new.png",
        );

        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      it("keeps case-sensitive URLs in separate persistent cache files", async () => {
        mockIO.readOpfsBlob.mockRejectedValue(new Error("Not in cache"));
        (global.fetch as any).mockResolvedValue({
          ok: true,
          blob: () => Promise.resolve(new Blob(["remote"])),
        });
        const vaultHandle = { name: "v1" } as any;

        await assetManager.resolveImageUrl(
          vaultHandle,
          "https://example.com/images/Avatar.png",
        );
        await assetManager.resolveImageUrl(
          vaultHandle,
          "https://example.com/images/avatar.png",
        );

        const cachePaths = mockIO.writeOpfsFile.mock.calls.map((call) =>
          call[0].join("/"),
        );
        expect(cachePaths).toHaveLength(2);
        expect(cachePaths[0]).not.toBe(cachePaths[1]);
      });

      it("should return blob URL if no vaultHandle and fetch succeeds (Demo Mode)", async () => {
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          blob: () => Promise.resolve(new Blob(["remote-demo"])),
        });
        const result = await assetManager.resolveImageUrl(
          undefined,
          "https://example.com/demo.png",
        );
        expect(global.fetch).toHaveBeenCalled();
        expect(result).toBe("blob:mock-url");
      });

      it("should return original URL if no vaultHandle and fetch fails (Demo Mode)", async () => {
        (global.fetch as any).mockResolvedValueOnce({ ok: false });
        const result = await assetManager.resolveImageUrl(
          undefined,
          "https://example.com/fail.png",
        );
        expect(result).toBe("https://example.com/fail.png");
      });

      it("should fetch and cache external https URLs", async () => {
        mockIO.readOpfsBlob.mockRejectedValue(new Error("Not in cache")); // neither hashed nor legacy copy
        (global.fetch as any).mockResolvedValue({
          ok: true,
          blob: () => Promise.resolve(new Blob(["remote"])),
        });

        const vaultHandle = { name: "v1" } as any;
        const result = await assetManager.resolveImageUrl(
          vaultHandle,
          "https://example.com/img.png",
        );

        expect(global.fetch).toHaveBeenCalled();
        expect(mockIO.writeOpfsFile).toHaveBeenCalled();
        expect(result).toBe("blob:mock-url");
      });

      it("should use cached external image if available", async () => {
        mockIO.readOpfsBlob.mockResolvedValueOnce(new Blob(["cached-remote"]));
        const vaultHandle = { name: "v1" } as any;

        const result = await assetManager.resolveImageUrl(
          vaultHandle,
          "https://example.com/cached.png",
        );

        expect(mockIO.readOpfsBlob).toHaveBeenCalled();
        expect(global.fetch).not.toHaveBeenCalled();
        expect(result).toBe("blob:mock-url");
      });

      it("should return empty string and fire callback when external fetch returns 404", async () => {
        mockIO.readOpfsBlob.mockRejectedValue(new Error("Not in cache"));
        (global.fetch as any).mockResolvedValue({ ok: false, status: 404 });
        const onDead = vi.fn();
        assetManager.setOnDeadExternalImage(onDead);

        const result = await assetManager.resolveImageUrl(
          { name: "v1" } as any,
          "https://example.com/dead-404.png",
        );

        expect(result).toBe("");
        expect(onDead).toHaveBeenCalledWith("https://example.com/dead-404.png");
        expect(
          assetManager.isDeadExternal("https://example.com/dead-404.png"),
        ).toBe(true);

        // Subsequent call does not refetch
        (global.fetch as any).mockClear();
        const secondResult = await assetManager.resolveImageUrl(
          { name: "v1" } as any,
          "https://example.com/dead-404.png",
        );
        expect(secondResult).toBe("");
        expect(global.fetch).not.toHaveBeenCalled();
      });

      it("should return empty string and fire callback when external fetch returns 410", async () => {
        mockIO.readOpfsBlob.mockRejectedValue(new Error("Not in cache"));
        (global.fetch as any).mockResolvedValue({ ok: false, status: 410 });
        const onDead = vi.fn();
        assetManager.setOnDeadExternalImage(onDead);

        const result = await assetManager.resolveImageUrl(
          { name: "v1" } as any,
          "https://example.com/dead-410.png",
        );

        expect(result).toBe("");
        expect(onDead).toHaveBeenCalledWith("https://example.com/dead-410.png");
        expect(
          assetManager.isDeadExternal("https://example.com/dead-410.png"),
        ).toBe(true);
      });

      it("should return original URL and not mark dead on non-404/410 errors", async () => {
        mockIO.readOpfsBlob.mockRejectedValue(new Error("Not in cache"));
        (global.fetch as any).mockResolvedValue({ ok: false, status: 500 });
        const onDead = vi.fn();
        assetManager.setOnDeadExternalImage(onDead);

        const result = await assetManager.resolveImageUrl(
          { name: "v1" } as any,
          "https://example.com/server-error.png",
        );

        expect(result).toBe("https://example.com/server-error.png");
        expect(onDead).not.toHaveBeenCalled();
        expect(
          assetManager.isDeadExternal("https://example.com/server-error.png"),
        ).toBe(false);
      });

      it("should return original URL if external fetch fails", async () => {
        mockIO.readOpfsBlob.mockRejectedValue(new Error("Not in cache")); // neither hashed nor legacy copy
        (global.fetch as any).mockResolvedValue({ ok: false, status: 503 });
        const result = await assetManager.resolveImageUrl(
          { name: "v1" } as any,
          "https://example.com/fail.png",
        );
        expect(result).toBe("https://example.com/fail.png");
      });

      it("should return original URL if fetch throws", async () => {
        mockIO.readOpfsBlob.mockRejectedValue(new Error("Not in cache")); // neither hashed nor legacy copy
        (global.fetch as any).mockRejectedValueOnce(new Error("Fetch failed"));
        const result = await assetManager.resolveImageUrl(
          { name: "v1" } as any,
          "https://example.com/error.png",
        );
        expect(result).toBe("https://example.com/error.png");
      });

      it("should return original URL if directory access throws", async () => {
        mockIO.getDirectoryHandle.mockRejectedValueOnce(
          new Error("Access Denied"),
        );
        const result = await assetManager.resolveImageUrl(
          { name: "v1" } as any,
          "https://example.com/denied.png",
        );
        expect(result).toBe("https://example.com/denied.png");
      });
    });

    it("should return empty string if fileFetcher throws", async () => {
      const fetcher = vi.fn().mockRejectedValueOnce(new Error("Failed"));
      const result = await assetManager.resolveImageUrl(
        {} as any,
        "images/bad.png",
        fetcher,
      );
      expect(result).toBe("");
    });
  });

  describe("resolveThumbnailUrl", () => {
    const vault = { name: "vault-1" } as FileSystemDirectoryHandle;
    const url = "https://img.example/photo.png";
    const notFound = () => Promise.reject(new Error("not found"));

    it("generates an external image's thumbnail once and caches it in the vault", async () => {
      mockIO.readOpfsBlob.mockImplementation(notFound);
      (global.fetch as any).mockResolvedValue({
        ok: true,
        blob: async () => new Blob(["full"], { type: "image/png" }),
      });
      const manager = new AssetManager(
        mockIO,
        mockImageProcessor,
        global.fetch,
      );

      const result = await manager.resolveThumbnailUrl(vault, url);

      expect(result).toBe("blob:mock-url");
      expect(mockImageProcessor.generateThumbnail).toHaveBeenCalledWith(
        expect.any(Blob),
        200,
      );
      const written = mockIO.writeOpfsFile.mock.calls.map((c) =>
        c[0].join("/"),
      );
      expect(written.some((p) => p.endsWith(".thumb.webp"))).toBe(true);
      expect(written.some((p) => p.endsWith(".cache"))).toBe(true);
    });

    it("reads a cached thumbnail without generating or fetching", async () => {
      mockIO.readOpfsBlob.mockResolvedValue(
        new Blob(["thumb"], { type: "image/webp" }),
      );

      await assetManager.resolveThumbnailUrl(vault, url);

      expect(mockImageProcessor.generateThumbnail).not.toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockIO.readOpfsBlob.mock.calls[0][0][0]).toMatch(/\.thumb\.webp$/);
    });

    it("falls back to the original link when the image cannot be read", async () => {
      mockIO.readOpfsBlob.mockImplementation(notFound);
      (global.fetch as any).mockRejectedValue(new TypeError("CORS"));
      const manager = new AssetManager(
        mockIO,
        mockImageProcessor,
        global.fetch,
        undefined,
        undefined,
        // Keep the fallback deterministic: jsdom does not load remote images.
        async () => "unknown",
      );

      expect(await manager.resolveThumbnailUrl(vault, url)).toBe(url);
      expect(mockImageProcessor.generateThumbnail).not.toHaveBeenCalled();
    });

    describe("unreachable external images", () => {
      let now = 0;
      const clock = { now: () => now } as any;
      const blocked = () => {
        mockIO.readOpfsBlob.mockImplementation(notFound);
        (global.fetch as any).mockReset();
        (global.fetch as any).mockRejectedValue(new TypeError("CORS"));
        now = 0;
        return new AssetManager(
          mockIO,
          mockImageProcessor,
          global.fetch,
          clock,
          undefined,
          // Exercise fetch failures without waiting for jsdom image events.
          async () => "unknown",
        );
      };

      it("fetches a blocked image once, not again for the fallback", async () => {
        const manager = blocked();

        expect(await manager.resolveThumbnailUrl(vault, url)).toBe(url);

        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      it("does not retry a blocked image on the next load", async () => {
        const manager = blocked();
        await manager.resolveThumbnailUrl(vault, url);
        await manager.resolveThumbnailUrl(vault, url);
        await manager.resolveImageUrl(vault, url);

        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      it("tries the image again once the failure has aged out", async () => {
        const manager = blocked();
        await manager.resolveThumbnailUrl(vault, url);

        now = 5 * 60_000 + 1;
        await manager.resolveThumbnailUrl(vault, url);

        expect(global.fetch).toHaveBeenCalledTimes(2);
      });

      it("does not let one blocked image stop a different one loading (negative)", async () => {
        const manager = blocked();
        await manager.resolveThumbnailUrl(vault, url);
        (global.fetch as any).mockResolvedValue({
          ok: true,
          blob: () => Promise.resolve(new Blob(["img"])),
        });

        await manager.resolveThumbnailUrl(vault, "https://other.example/b.png");

        expect(global.fetch).toHaveBeenCalledTimes(2);
        expect(mockImageProcessor.generateThumbnail).toHaveBeenCalledTimes(1);
      });

      it("treats an error status as a failure too", async () => {
        const manager = blocked();
        (global.fetch as any).mockReset();
        (global.fetch as any).mockResolvedValue({ ok: false, status: 404 });

        await manager.resolveThumbnailUrl(vault, url);
        await manager.resolveThumbnailUrl(vault, url);

        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      it("gives every external fetch a timeout", async () => {
        const manager = blocked();
        await manager.resolveThumbnailUrl(vault, url);

        const init = (global.fetch as any).mock.calls[0][1];
        expect(init.signal).toBeInstanceOf(AbortSignal);
      });

      it("counts a timed-out fetch as a failure", async () => {
        const manager = blocked();
        (global.fetch as any).mockReset();
        (global.fetch as any).mockRejectedValue(
          new DOMException("timed out", "TimeoutError"),
        );

        expect(await manager.resolveThumbnailUrl(vault, url)).toBe(url);
        await manager.resolveThumbnailUrl(vault, url);
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });
    });

    describe("links the browser cannot load at all", () => {
      const DAY = 24 * 60 * 60_000;
      let now = 0;
      const clock = { now: () => now } as any;
      type Probe = (url: string) => Promise<"loaded" | "failed" | "unknown">;
      const markerWrites = () =>
        mockIO.writeOpfsFile.mock.calls.filter((call: any[]) =>
          String(call[0][2]).endsWith(".unreachable"),
        );

      const manager = (
        probe: Probe,
        failWith: unknown = new TypeError("CORS"),
      ) => {
        mockIO.readOpfsBlob.mockImplementation(notFound);
        (global.fetch as any).mockReset();
        (global.fetch as any).mockRejectedValue(failWith);
        mockIO.writeOpfsFile.mockClear();
        now = 1_000;
        return new AssetManager(
          mockIO,
          mockImageProcessor,
          global.fetch,
          clock,
          undefined,
          probe,
        );
      };

      it("shows no image and remembers it, when the status was hidden and the browser cannot load it either", async () => {
        const probe = vi.fn<Probe>().mockResolvedValue("failed");
        const assets = manager(probe);

        expect(await assets.resolveThumbnailUrl(vault, url)).toBe("");

        expect(probe).toHaveBeenCalledWith(url);
        expect(markerWrites()).toHaveLength(1);
        expect(markerWrites()[0][1]).toBe("1000");
      });

      it("makes no request at all in a later session while the marker is fresh", async () => {
        const probe = vi.fn<Probe>().mockResolvedValue("failed");
        const later = manager(probe);
        mockIO.readOpfsBlob.mockImplementation((path: string[]) =>
          path[0].endsWith(".unreachable")
            ? Promise.resolve(new Blob(["1000"]))
            : notFound(),
        );
        now = 1_000 + DAY - 1;

        expect(await later.resolveThumbnailUrl(vault, url)).toBe("");

        expect(global.fetch).not.toHaveBeenCalled();
        expect(probe).not.toHaveBeenCalled();
      });

      it("tries the link again once the marker is a day old", async () => {
        const probe = vi.fn<Probe>().mockResolvedValue("failed");
        const later = manager(probe);
        mockIO.readOpfsBlob.mockImplementation((path: string[]) =>
          path[0].endsWith(".unreachable")
            ? Promise.resolve(new Blob(["1000"]))
            : notFound(),
        );
        now = 1_000 + DAY;

        await later.resolveThumbnailUrl(vault, url);

        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      it("keeps the original link when the browser can load it plainly (negative)", async () => {
        const probe = vi.fn<Probe>().mockResolvedValue("loaded");
        const assets = manager(probe);

        expect(await assets.resolveThumbnailUrl(vault, url)).toBe(url);

        expect(markerWrites()).toHaveLength(0);
      });

      it("keeps the original link when the probe cannot tell (negative)", async () => {
        const probe = vi.fn<Probe>().mockResolvedValue("unknown");
        const assets = manager(probe);

        expect(await assets.resolveThumbnailUrl(vault, url)).toBe(url);

        expect(markerWrites()).toHaveLength(0);
      });

      it("does not probe a failure that was not a hidden status (negative)", async () => {
        const probe = vi.fn<Probe>().mockResolvedValue("failed");
        const assets = manager(
          probe,
          new DOMException("timed out", "TimeoutError"),
        );

        expect(await assets.resolveThumbnailUrl(vault, url)).toBe(url);

        expect(probe).not.toHaveBeenCalled();
        expect(markerWrites()).toHaveLength(0);
      });

      it("leaves a readable 404 to the dead-link path, not the probe (negative)", async () => {
        const probe = vi.fn<Probe>().mockResolvedValue("failed");
        const assets = manager(probe);
        (global.fetch as any).mockReset();
        (global.fetch as any).mockResolvedValue({ ok: false, status: 404 });

        expect(await assets.resolveThumbnailUrl(vault, url)).toBe("");

        expect(assets.isDeadExternal(url)).toBe(true);
        expect(probe).not.toHaveBeenCalled();
        expect(markerWrites()).toHaveLength(0);
      });

      it("prefers a cached thumbnail over the marker (negative)", async () => {
        const probe = vi.fn<Probe>().mockResolvedValue("failed");
        const assets = manager(probe);
        mockIO.readOpfsBlob.mockImplementation((path: string[]) =>
          path[0].endsWith(".unreachable")
            ? Promise.resolve(new Blob(["1000"]))
            : path[0].endsWith(".thumb.webp")
              ? Promise.resolve(new Blob(["thumb"]))
              : notFound(),
        );

        expect(await assets.resolveThumbnailUrl(vault, url)).toBe(
          "blob:mock-url",
        );
        expect(global.fetch).not.toHaveBeenCalled();
      });

      it("treats a marker timestamped in the future as invalid, so it cannot extend the day indefinitely", async () => {
        const probe = vi.fn<Probe>().mockResolvedValue("loaded");
        const assets = manager(probe);
        // A damaged file, or the clock having gone backwards, leaves a time
        // far ahead of now: a negative age must not count as fresh.
        mockIO.readOpfsBlob.mockImplementation((path: string[]) =>
          path[0].endsWith(".unreachable")
            ? Promise.resolve(new Blob([String(1_000 + 30 * DAY)]))
            : notFound(),
        );

        await assets.resolveThumbnailUrl(vault, url);

        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      it("forgets what it marked when cleared, so another vault is not affected", async () => {
        const probe = vi.fn<Probe>().mockResolvedValue("failed");
        const assets = manager(probe);
        expect(await assets.resolveThumbnailUrl(vault, url)).toBe("");
        expect(global.fetch).toHaveBeenCalledTimes(1);

        assets.clear();
        mockIO.readOpfsBlob.mockImplementation(notFound);
        (global.fetch as any).mockClear();
        probe.mockResolvedValue("loaded");

        // A different vault has no marker file; the in-memory one must be gone.
        expect(await assets.resolveThumbnailUrl(vault, url)).toBe(url);
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      it("stops suppressing in the same session once a day has passed", async () => {
        const probe = vi.fn<Probe>().mockResolvedValue("failed");
        const assets = manager(probe);
        expect(await assets.resolveThumbnailUrl(vault, url)).toBe("");
        (global.fetch as any).mockClear();
        mockIO.readOpfsBlob.mockImplementation(notFound);

        now = 1_000 + DAY - 1;
        expect(await assets.resolveThumbnailUrl(vault, url)).toBe("");
        expect(global.fetch).not.toHaveBeenCalled();

        now = 1_000 + DAY;
        probe.mockResolvedValue("loaded");
        expect(await assets.resolveThumbnailUrl(vault, url)).toBe(url);
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      it("probes a link the browser can load only once per failure window, not on every resolution", async () => {
        const probe = vi.fn<Probe>().mockResolvedValue("loaded");
        const assets = manager(probe);

        expect(await assets.resolveThumbnailUrl(vault, url)).toBe(url);
        expect(await assets.resolveThumbnailUrl(vault, url)).toBe(url);
        expect(await assets.resolveThumbnailUrl(vault, url)).toBe(url);

        expect(probe).toHaveBeenCalledTimes(1);
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      it("does not re-probe an inconclusive result either, and probes again once the failure window has expired", async () => {
        const probe = vi.fn<Probe>().mockResolvedValue("unknown");
        const assets = manager(probe);

        await assets.resolveThumbnailUrl(vault, url);
        await assets.resolveThumbnailUrl(vault, url);
        expect(probe).toHaveBeenCalledTimes(1);

        now = 1_000 + 5 * 60_000; // the five-minute failure window is over
        await assets.resolveThumbnailUrl(vault, url);
        expect(probe).toHaveBeenCalledTimes(2);
      });

      it("treats a damaged marker as no marker", async () => {
        const probe = vi.fn<Probe>().mockResolvedValue("loaded");
        const assets = manager(probe);
        mockIO.readOpfsBlob.mockImplementation((path: string[]) =>
          path[0].endsWith(".unreachable")
            ? Promise.resolve(new Blob(["not a time"]))
            : notFound(),
        );

        await assets.resolveThumbnailUrl(vault, url);

        expect(global.fetch).toHaveBeenCalledTimes(1);
      });
    });

    describe("hosts that send no CORS headers", () => {
      const WEEK = 7 * 24 * 60 * 60_000;
      const first = "https://scabard.example/user/a.webp";
      const second = "https://scabard.example/user/b.webp";
      const elsewhere = "https://other.example/c.webp";
      let now = 0;
      const clock = { now: () => now } as any;
      type Probe = (url: string) => Promise<"loaded" | "failed" | "unknown">;
      const hostMarkerWrites = () =>
        mockIO.writeOpfsFile.mock.calls.filter((call: any[]) =>
          String(call[0][2]).endsWith(".nocors"),
        );
      const hostMarker = (markedAt: string) =>
        mockIO.readOpfsBlob.mockImplementation((path: string[]) =>
          path[0].endsWith(".nocors")
            ? Promise.resolve(new Blob([markedAt]))
            : notFound(),
        );

      const manager = (
        probe: Probe,
        failWith: unknown = new TypeError("CORS"),
      ) => {
        mockIO.readOpfsBlob.mockImplementation(notFound);
        (global.fetch as any).mockReset();
        (global.fetch as any).mockRejectedValue(failWith);
        mockIO.writeOpfsFile.mockClear();
        now = 1_000;
        return new AssetManager(
          mockIO,
          mockImageProcessor,
          global.fetch,
          clock,
          undefined,
          probe,
        );
      };

      it("stops asking a host for images once it has shown it sends no CORS headers", async () => {
        const assets = manager(vi.fn<Probe>().mockResolvedValue("loaded"));

        expect(await assets.resolveThumbnailUrl(vault, first)).toBe(first);
        expect(await assets.resolveThumbnailUrl(vault, second)).toBe(second);

        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      it("makes one failed request for a whole batch from one host, not one each", async () => {
        const assets = manager(vi.fn<Probe>().mockResolvedValue("loaded"));
        const batch = Array.from(
          { length: 8 },
          (_, i) => `https://scabard.example/user/${i}.webp`,
        );

        const results = await Promise.all(
          batch.map((link) => assets.resolveThumbnailUrl(vault, link)),
        );

        expect(results).toEqual(batch);
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      it("records the host, with the time, for later sessions", async () => {
        const assets = manager(vi.fn<Probe>().mockResolvedValue("loaded"));

        await assets.resolveThumbnailUrl(vault, first);

        expect(hostMarkerWrites()).toHaveLength(1);
        expect(hostMarkerWrites()[0][1]).toBe("1000");
      });

      it("makes no CORS request at all in a later session while the host marker is fresh", async () => {
        const probe = vi.fn<Probe>().mockResolvedValue("loaded");
        const later = manager(probe);
        hostMarker("1000");
        now = 1_000 + WEEK - 1;

        expect(await later.resolveThumbnailUrl(vault, first)).toBe(first);
        expect(await later.resolveThumbnailUrl(vault, second)).toBe(second);

        expect(global.fetch).not.toHaveBeenCalled();
        expect(probe).not.toHaveBeenCalled();
      });

      it("asks the host again once the marker is a week old", async () => {
        const later = manager(vi.fn<Probe>().mockResolvedValue("loaded"));
        hostMarker("1000");
        now = 1_000 + WEEK;

        await later.resolveThumbnailUrl(vault, first);

        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      it("leaves other hosts alone (negative)", async () => {
        const assets = manager(vi.fn<Probe>().mockResolvedValue("loaded"));

        await assets.resolveThumbnailUrl(vault, first);
        await assets.resolveThumbnailUrl(vault, elsewhere);

        expect(global.fetch).toHaveBeenCalledTimes(2);
      });

      it("does not blame the host when the browser cannot load the image either (negative)", async () => {
        const assets = manager(vi.fn<Probe>().mockResolvedValue("failed"));

        await assets.resolveThumbnailUrl(vault, first);
        await assets.resolveThumbnailUrl(vault, second);

        expect(hostMarkerWrites()).toHaveLength(0);
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });

      it("does not blame the host when the probe cannot tell (negative)", async () => {
        const assets = manager(vi.fn<Probe>().mockResolvedValue("unknown"));

        await assets.resolveThumbnailUrl(vault, first);

        expect(hostMarkerWrites()).toHaveLength(0);
      });

      it("does not blame the host for a timeout (negative)", async () => {
        const probe = vi.fn<Probe>().mockResolvedValue("loaded");
        const assets = manager(
          probe,
          new DOMException("timed out", "TimeoutError"),
        );

        await assets.resolveThumbnailUrl(vault, first);

        expect(probe).not.toHaveBeenCalled();
        expect(hostMarkerWrites()).toHaveLength(0);
      });

      it("keeps fetching from a host that does send CORS headers (negative)", async () => {
        const assets = manager(vi.fn<Probe>().mockResolvedValue("loaded"));
        (global.fetch as any).mockReset();
        (global.fetch as any).mockResolvedValue({
          ok: true,
          blob: () => Promise.resolve(new Blob(["img"])),
        });
        const batch = Array.from(
          { length: 4 },
          (_, i) => `https://friendly.example/${i}.webp`,
        );

        await Promise.all(
          batch.map((link) => assets.resolveThumbnailUrl(vault, link)),
        );

        expect(global.fetch).toHaveBeenCalledTimes(4);
        expect(hostMarkerWrites()).toHaveLength(0);
      });

      it("prefers a cached thumbnail over the host marker (negative)", async () => {
        const assets = manager(vi.fn<Probe>().mockResolvedValue("loaded"));
        mockIO.readOpfsBlob.mockImplementation((path: string[]) =>
          path[0].endsWith(".nocors")
            ? Promise.resolve(new Blob(["1000"]))
            : path[0].endsWith(".thumb.webp")
              ? Promise.resolve(new Blob(["thumb"]))
              : notFound(),
        );

        expect(await assets.resolveThumbnailUrl(vault, first)).toBe(
          "blob:mock-url",
        );
        expect(global.fetch).not.toHaveBeenCalled();
      });

      it("treats a damaged host marker as no marker (negative)", async () => {
        const assets = manager(vi.fn<Probe>().mockResolvedValue("loaded"));
        hostMarker("not a time");

        await assets.resolveThumbnailUrl(vault, first);

        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      it("treats a host marker dated in the future as no marker (negative)", async () => {
        const assets = manager(vi.fn<Probe>().mockResolvedValue("loaded"));
        hostMarker(String(1_000 + 10 * WEEK));

        await assets.resolveThumbnailUrl(vault, first);

        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      it("forgets what it learned about hosts when cleared", async () => {
        const assets = manager(vi.fn<Probe>().mockResolvedValue("loaded"));
        await assets.resolveThumbnailUrl(vault, first);

        assets.clear();
        mockIO.readOpfsBlob.mockImplementation(notFound);
        await assets.resolveThumbnailUrl(vault, second);

        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });

    it("resolves local paths exactly like resolveImageUrl", async () => {
      const spy = vi.spyOn(assetManager, "resolveImageUrl");

      await assetManager.resolveThumbnailUrl(vault, "images/a_thumb.webp");

      expect(spy).toHaveBeenCalledWith(
        vault,
        "images/a_thumb.webp",
        undefined,
        undefined,
      );
    });

    it("releases the thumbnail URL it handed out", async () => {
      mockIO.readOpfsBlob.mockResolvedValue(
        new Blob(["thumb"], { type: "image/webp" }),
      );
      await assetManager.resolveThumbnailUrl(vault, url);

      assetManager.releaseThumbnailUrl(url);

      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    });
  });

  describe("importExternalImage", () => {
    const vault = { name: "vault-1" } as FileSystemDirectoryHandle;

    it("stores the image like an upload, with a thumbnail", async () => {
      mockIO.readOpfsBlob.mockResolvedValue(
        new Blob(["cached"], { type: "image/png" }),
      );

      const result = await assetManager.importExternalImage(
        vault,
        "https://img.example/photo.png",
        "hero",
      );

      expect(mockImageProcessor.convertToWebP).toHaveBeenCalled();
      expect(result?.image).toMatch(/^images\/img_hero_.*\.webp$/);
      expect(result?.thumbnail).toMatch(/_thumb\.webp$/);
    });

    it("returns null for local paths and unreadable images", async () => {
      expect(
        await assetManager.importExternalImage(vault, "images/a.webp", "hero"),
      ).toBeNull();

      mockIO.readOpfsBlob.mockRejectedValue(new Error("not found"));
      (global.fetch as any).mockResolvedValue({ ok: false, status: 404 });
      const manager = new AssetManager(
        mockIO,
        mockImageProcessor,
        global.fetch,
      );
      expect(
        await manager.importExternalImage(
          vault,
          "https://gone.example/x.png",
          "hero",
        ),
      ).toBeNull();
    });
  });

  describe("releaseImageUrl", () => {
    it("should ignore unknown paths", () => {
      assetManager.releaseImageUrl("unknown.png");
      expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    });

    it("should decrement ref count and revoke URL when reaching zero", () => {
      (assetManager as any).urlCache.set("test.png", {
        url: "blob:test",
        refs: 1,
      });

      assetManager.releaseImageUrl("test.png");
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test");
      expect((assetManager as any).urlCache.has("test.png")).toBe(false);
    });

    it("should NOT revoke if refs still above zero", () => {
      (assetManager as any).urlCache.set("test.png", {
        url: "blob:test",
        refs: 2,
      });

      assetManager.releaseImageUrl("test.png");
      expect(URL.revokeObjectURL).not.toHaveBeenCalled();
      expect((assetManager as any).urlCache.get("test.png").refs).toBe(1);
    });
  });

  describe("clear", () => {
    it("should revoke all cached URLs and clear map", () => {
      (assetManager as any).urlCache.set("a.png", { url: "blob:a", refs: 1 });
      (assetManager as any).urlCache.set("b.png", { url: "blob:b", refs: 1 });
      (assetManager as any).deadExternal.add("https://example.com/dead.png");
      (assetManager as any).failedExternal.set(
        "https://example.com/fail.png",
        123,
      );

      assetManager.clear();
      expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
      expect((assetManager as any).urlCache.size).toBe(0);
      expect(assetManager.isDeadExternal("https://example.com/dead.png")).toBe(
        false,
      );
      expect((assetManager as any).failedExternal.size).toBe(0);
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
      await assetManager.ensureAssetPersisted("images/exists.png", {
        name: "v1",
      } as any);
      expect(mockIO.writeOpfsFile).not.toHaveBeenCalled();
    });

    it("should migrate from blob source", async () => {
      mockIO.readOpfsBlob.mockRejectedValueOnce(new Error("Missing")); // 1. ensure check fails

      (global.fetch as any).mockResolvedValue({
        blob: () => Promise.resolve(new Blob(["migrated"])),
      });

      // Trick resolveImageUrl to return a blob URL
      (assetManager as any).urlCache.set("images/source.png", {
        url: "blob:src",
        refs: 1,
      });

      await assetManager.ensureAssetPersisted("images/source.png", {
        name: "v1",
      } as any);
      expect(mockIO.writeOpfsFile).toHaveBeenCalledWith(
        ["images", "source.png"],
        expect.any(Blob),
        expect.any(Object),
        "v1",
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

      await assetManager.ensureAssetPersisted(
        "images/guest.png",
        { name: "v1" } as any,
        fetcher,
      );
      expect(fetcher).toHaveBeenCalledWith("images/guest.png");
      expect(mockIO.writeOpfsFile).toHaveBeenCalled();
    });

    it("should handle fetch failure during blob migration", async () => {
      mockIO.readOpfsBlob.mockRejectedValueOnce(new Error("Missing"));
      (global.fetch as any).mockRejectedValueOnce(new Error("Network Error"));
      (assetManager as any).urlCache.set("images/fail.png", {
        url: "blob:fail",
        refs: 1,
      });

      await assetManager.ensureAssetPersisted("images/fail.png", {
        name: "v1",
      } as any);
      expect(mockIO.writeOpfsFile).not.toHaveBeenCalled();
    });

    it("should handle fileFetcher failure during migration", async () => {
      mockIO.readOpfsBlob.mockRejectedValueOnce(new Error("Missing"));
      const fetcher = vi.fn().mockRejectedValueOnce(new Error("Fetch Error"));

      await assetManager.ensureAssetPersisted(
        "images/broken.png",
        { name: "v1" } as any,
        fetcher,
      );
      expect(mockIO.writeOpfsFile).not.toHaveBeenCalled();
    });
  });
});
