import { describe, expect, it, vi } from "vitest";
import { activateBuild, precacheBuild } from "./lifecycle";

describe("service worker lifecycle", () => {
  it("precaches the current build and activates the worker immediately", async () => {
    const add = vi.fn().mockResolvedValue(undefined);
    const skipWaiting = vi.fn().mockResolvedValue(undefined);

    await precacheBuild({
      cacheName: "cache-current",
      assets: ["/", "/app.js"],
      cacheStorage: {
        open: vi.fn().mockResolvedValue({ add }),
      },
      skipWaiting,
      warn: vi.fn(),
    });

    expect(add).toHaveBeenCalledTimes(2);
    expect(add).toHaveBeenNthCalledWith(1, "/");
    expect(add).toHaveBeenNthCalledWith(2, "/app.js");
    expect(skipWaiting).toHaveBeenCalledOnce();
  });

  it("still activates when an individual asset cannot be cached", async () => {
    const cacheError = new Error("asset unavailable");
    const add = vi
      .fn()
      .mockRejectedValueOnce(cacheError)
      .mockResolvedValueOnce(undefined);
    const skipWaiting = vi.fn().mockResolvedValue(undefined);
    const warn = vi.fn();

    await precacheBuild({
      cacheName: "cache-current",
      assets: ["/missing.png", "/app.js"],
      cacheStorage: {
        open: vi.fn().mockResolvedValue({ add }),
      },
      skipWaiting,
      warn,
    });

    expect(warn).toHaveBeenCalledWith(
      "[SW] Failed to cache asset: /missing.png",
      cacheError,
    );
    expect(add).toHaveBeenCalledWith("/app.js");
    expect(skipWaiting).toHaveBeenCalledOnce();
  });

  it("removes old caches and claims open clients", async () => {
    const deleteCache = vi.fn().mockResolvedValue(true);
    const claimClients = vi.fn().mockResolvedValue(undefined);

    await activateBuild({
      cacheName: "cache-current",
      cacheStorage: {
        keys: vi
          .fn()
          .mockResolvedValue(["cache-old", "cache-current", "cache-older"]),
        delete: deleteCache,
      },
      claimClients,
    });

    expect(deleteCache).toHaveBeenCalledTimes(2);
    expect(deleteCache).toHaveBeenCalledWith("cache-old");
    expect(deleteCache).toHaveBeenCalledWith("cache-older");
    expect(deleteCache).not.toHaveBeenCalledWith("cache-current");
    expect(claimClients).toHaveBeenCalledOnce();
  });
});
