import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  activateBuild,
  getVaultSeedUrls,
  installWorker,
  isVaultAppPath,
  matchCurrentThenOlderCache,
  seedVaultCache,
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
    "/guest/shared-world",
    "/help/offline-sync",
    "/dice",
    "/templates",
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

describe("getVaultSeedUrls", () => {
  it("keeps only the current vault document and same-origin immutable assets", () => {
    expect(
      getVaultSeedUrls({
        sourceUrl: "https://codex.test/vault/world-1?view=graph#entity",
        origin: "https://codex.test",
        requestedUrls: [
          "https://codex.test/vault/world-1?view=graph",
          "https://codex.test/_app/immutable/app.js",
          "https://codex.test/blog/post",
          "https://codex.test/api/cloud-backup/status",
          "https://assets.test/_app/immutable/foreign.js",
          "http://[invalid",
        ],
      }),
    ).toEqual([
      "https://codex.test/vault/world-1?view=graph",
      "https://codex.test/_app/immutable/app.js",
    ]);
  });

  it("rejects seed requests sent from a non-vault client", () => {
    expect(
      getVaultSeedUrls({
        sourceUrl: "https://codex.test/help/offline-sync",
        origin: "https://codex.test",
        requestedUrls: ["https://codex.test/_app/immutable/app.js"],
      }),
    ).toEqual([]);
  });
});

describe("service worker lifecycle", () => {
  it("prefers the current service-worker cache for offline responses", async () => {
    const currentResponse = new Response("current");
    const matchOlderCache = vi.fn();

    const response = await matchCurrentThenOlderCache({
      request: new Request("https://codex.test/vault/world-1"),
      currentCache: { match: vi.fn().mockResolvedValue(currentResponse) },
      matchOlderCache,
    });

    expect(response).toBe(currentResponse);
    expect(matchOlderCache).not.toHaveBeenCalled();
  });

  it("checks older caches only when the current cache misses", async () => {
    const olderResponse = new Response("older");
    const request = new Request("https://codex.test/vault/world-1");
    const matchOlderCache = vi.fn().mockResolvedValue(olderResponse);

    const response = await matchCurrentThenOlderCache({
      request,
      currentCache: { match: vi.fn().mockResolvedValue(undefined) },
      matchOlderCache,
    });

    expect(response).toBe(olderResponse);
    expect(matchOlderCache).toHaveBeenCalledOnce();
    expect(matchOlderCache).toHaveBeenCalledWith(request);
  });

  it("activates without eagerly downloading the site build", async () => {
    const skipWaiting = vi.fn().mockResolvedValue(undefined);

    await installWorker({ skipWaiting });

    expect(skipWaiting).toHaveBeenCalledOnce();
  });

  it("claims open clients without deleting the last usable cache", async () => {
    const claimClients = vi.fn().mockResolvedValue(undefined);

    await activateBuild({
      claimClients,
    });

    expect(claimClients).toHaveBeenCalledOnce();
  });

  it("deletes old service-worker caches only after the vault shell is seeded", async () => {
    const put = vi.fn().mockResolvedValue(undefined);
    const deleteCache = vi.fn().mockResolvedValue(true);
    const fetchResource = vi.fn().mockImplementation(
      async (url: string) =>
        new Response(
          url.endsWith(".js") ? "export {};" : "<main>Vault</main>",
          {
            status: 200,
            headers: {
              "content-type": url.endsWith(".js")
                ? "text/javascript"
                : "text/html",
            },
          },
        ),
    );

    const seeded = await seedVaultCache({
      cacheName: "cache-current",
      urls: [
        "https://codex.test/vault/world-1",
        "https://codex.test/_app/immutable/app.js",
      ],
      cacheStorage: {
        open: vi.fn().mockResolvedValue({ put }),
        keys: vi
          .fn()
          .mockResolvedValue(["cache-old", "cache-current", "image-cache"]),
        delete: deleteCache,
      },
      fetchResource,
      warn: vi.fn(),
    });

    expect(seeded).toBe(true);
    expect(put).toHaveBeenCalledTimes(2);
    expect(deleteCache).toHaveBeenCalledOnce();
    expect(deleteCache).toHaveBeenCalledWith("cache-old");
    expect(deleteCache).not.toHaveBeenCalledWith("image-cache");
  });

  it("retains old caches when any vault shell resource cannot be seeded", async () => {
    const seedError = new Error("asset unavailable");
    const deleteCache = vi.fn();
    const warn = vi.fn();

    const seeded = await seedVaultCache({
      cacheName: "cache-current",
      urls: [
        "https://codex.test/vault/world-1",
        "https://codex.test/_app/immutable/missing.js",
      ],
      cacheStorage: {
        open: vi.fn().mockResolvedValue({
          put: vi.fn().mockResolvedValue(undefined),
        }),
        keys: vi.fn().mockResolvedValue(["cache-old"]),
        delete: deleteCache,
      },
      fetchResource: vi
        .fn()
        .mockResolvedValueOnce(new Response("<main>Vault</main>"))
        .mockRejectedValueOnce(seedError),
      warn,
    });

    expect(seeded).toBe(false);
    expect(warn).toHaveBeenCalledWith(
      "[SW] Failed to seed vault shell: https://codex.test/_app/immutable/missing.js",
      seedError,
    );
    expect(deleteCache).not.toHaveBeenCalled();
  });

  it("reports a cache-open failure without attempting to retire old caches", async () => {
    const cacheError = new Error("storage unavailable");
    const deleteCache = vi.fn();
    const warn = vi.fn();

    const seeded = await seedVaultCache({
      cacheName: "cache-current",
      urls: ["https://codex.test/vault/world-1"],
      cacheStorage: {
        open: vi.fn().mockRejectedValue(cacheError),
        keys: vi.fn(),
        delete: deleteCache,
      },
      fetchResource: vi.fn(),
      warn,
    });

    expect(seeded).toBe(false);
    expect(warn).toHaveBeenCalledWith(
      "[SW] Failed to open vault cache",
      cacheError,
    );
    expect(deleteCache).not.toHaveBeenCalled();
  });
});
