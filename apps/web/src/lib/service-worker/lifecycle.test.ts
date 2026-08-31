import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  activateBuild,
  installWorker,
  isVaultAppPath,
  shouldHandleVaultRequest,
} from "./lifecycle";

const pagesHeaders = readFileSync(
  resolve(process.cwd(), "static/_headers"),
  "utf8",
);
const serviceWorkerHeaders = pagesHeaders.match(
  /\/service-worker\.js\s+([^\n]+)(?=\n\n|$)/,
)?.[1];

describe("Cloudflare Pages cache headers", () => {
  it("always revalidates the service worker after a deployment", () => {
    expect(serviceWorkerHeaders).toBe(
      "Cache-Control: no-cache, must-revalidate",
    );
  });

  it("does not permit a stale service worker to be kept for a fixed duration", () => {
    expect(serviceWorkerHeaders).not.toContain("max-age=");
  });
});

describe("isVaultAppPath", () => {
  it.each([
    "/",
    "/vault/world-1",
    "/canvas",
    "/canvas/session-map",
    "/map/initiative",
    "/oracle",
    "/import",
  ])("recognises the vault app route %s", (pathname) => {
    expect(isVaultAppPath(pathname)).toBe(true);
  });

  it.each([
    "/blog",
    "/blog/offline-worldbuilding",
    "/generators",
    "/generators/fantasy/name",
    "/for/game-masters",
    "/tools/faction-generator",
    "/import/legendkeeper",
  ])("rejects the public route %s", (pathname) => {
    expect(isVaultAppPath(pathname)).toBe(false);
  });
});

describe("shouldHandleVaultRequest", () => {
  it("handles vault navigations and code requested by a vault client", () => {
    expect(
      shouldHandleVaultRequest({
        pathname: "/vault/world-1",
        mode: "navigate",
        destination: "document",
      }),
    ).toBe(true);
    expect(
      shouldHandleVaultRequest({
        pathname: "/_app/immutable/nodes/4.js",
        mode: "cors",
        destination: "script",
        clientPathname: "/vault/world-1",
      }),
    ).toBe(true);
  });

  it("bypasses public pages and same-origin API responses", () => {
    expect(
      shouldHandleVaultRequest({
        pathname: "/blog/offline-worldbuilding",
        mode: "navigate",
        destination: "document",
      }),
    ).toBe(false);
    expect(
      shouldHandleVaultRequest({
        pathname: "/api/cloud-backup/status",
        mode: "cors",
        destination: "",
        clientPathname: "/vault/world-1",
      }),
    ).toBe(false);
  });
});

describe("service worker lifecycle", () => {
  it("activates without eagerly downloading the site build", async () => {
    const skipWaiting = vi.fn().mockResolvedValue(undefined);

    await installWorker({ skipWaiting });

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
      warn: vi.fn(),
    });

    expect(deleteCache).toHaveBeenCalledTimes(2);
    expect(deleteCache).toHaveBeenCalledWith("cache-old");
    expect(deleteCache).toHaveBeenCalledWith("cache-older");
    expect(deleteCache).not.toHaveBeenCalledWith("cache-current");
    expect(claimClients).toHaveBeenCalledOnce();
  });

  it("claims clients when cache enumeration fails", async () => {
    const cacheError = new Error("cannot list caches");
    const claimClients = vi.fn().mockResolvedValue(undefined);
    const warn = vi.fn();

    await activateBuild({
      cacheName: "cache-current",
      cacheStorage: {
        keys: vi.fn().mockRejectedValue(cacheError),
        delete: vi.fn(),
      },
      claimClients,
      warn,
    });

    expect(warn).toHaveBeenCalledWith(
      "[SW] Failed to enumerate caches",
      cacheError,
    );
    expect(claimClients).toHaveBeenCalledOnce();
  });

  it("continues cleanup and claims clients when deleting a cache fails", async () => {
    const cacheError = new Error("cannot delete cache");
    const deleteCache = vi
      .fn()
      .mockRejectedValueOnce(cacheError)
      .mockResolvedValueOnce(true);
    const claimClients = vi.fn().mockResolvedValue(undefined);
    const warn = vi.fn();

    await activateBuild({
      cacheName: "cache-current",
      cacheStorage: {
        keys: vi.fn().mockResolvedValue(["cache-old", "cache-older"]),
        delete: deleteCache,
      },
      claimClients,
      warn,
    });

    expect(warn).toHaveBeenCalledWith(
      "[SW] Failed to delete cache: cache-old",
      cacheError,
    );
    expect(deleteCache).toHaveBeenCalledWith("cache-older");
    expect(claimClients).toHaveBeenCalledOnce();
  });
});
