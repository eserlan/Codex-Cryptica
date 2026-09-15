import { describe, expect, it, vi } from "vitest";
import {
  createVersionSkewResponse,
  handleFetchRequest,
  isVersionSkewResponse,
  matchCurrentThenOlderCache,
} from "./fetch-handler";

describe("fetch-handler", () => {
  describe("isVersionSkewResponse", () => {
    it("identifies HTML returned for JS or CSS asset requests as version skew", () => {
      expect(
        isVersionSkewResponse("/_app/immutable/nodes/1.js", "text/html"),
      ).toBe(true);
      expect(
        isVersionSkewResponse("/app.css", "text/html; charset=utf-8"),
      ).toBe(true);
    });

    it("does not flag legitimate script/style or document responses", () => {
      expect(
        isVersionSkewResponse(
          "/_app/immutable/nodes/1.js",
          "application/javascript",
        ),
      ).toBe(false);
      expect(isVersionSkewResponse("/app.css", "text/css")).toBe(false);
      expect(isVersionSkewResponse("/vault/world-1", "text/html")).toBe(false);
    });
  });

  describe("createVersionSkewResponse", () => {
    it("creates a 404 text response explaining version skew", async () => {
      const response = createVersionSkewResponse();
      expect(response.status).toBe(404);
      expect(response.statusText).toBe("Not Found");
      expect(response.headers.get("Content-Type")).toBe("text/plain");
      expect(await response.text()).toContain("Version Skew");
    });
  });

  describe("matchCurrentThenOlderCache", () => {
    it("prefers the current cache match", async () => {
      const current = new Response("current");
      const matchOlderCache = vi.fn();

      const result = await matchCurrentThenOlderCache({
        request: "https://codex.test/app.js",
        currentCache: { match: vi.fn().mockResolvedValue(current) },
        matchOlderCache,
      });

      expect(result).toBe(current);
      expect(matchOlderCache).not.toHaveBeenCalled();
    });

    it("falls back to older cache if current misses", async () => {
      const older = new Response("older");
      const matchOlderCache = vi.fn().mockResolvedValue(older);

      const result = await matchCurrentThenOlderCache({
        request: "https://codex.test/app.js",
        currentCache: { match: vi.fn().mockResolvedValue(undefined) },
        matchOlderCache,
      });

      expect(result).toBe(older);
      expect(matchOlderCache).toHaveBeenCalledOnce();
    });
  });

  describe("handleFetchRequest", () => {
    const origin = "https://codex.test";
    const cacheName = "test-cache";

    it("returns successful network response and writes to cache via waitUntil", async () => {
      const request = new Request("https://codex.test/_app/immutable/chunk.js");
      const networkResponse = new Response("console.log('hi')", {
        status: 200,
        headers: { "content-type": "application/javascript" },
      });
      const put = vi.fn().mockResolvedValue(undefined);
      const waitUntil = vi.fn();

      const response = await handleFetchRequest({
        request,
        cacheName,
        origin,
        cacheStorage: {
          open: vi.fn().mockResolvedValue({
            match: vi.fn(),
            put,
          }),
          match: vi.fn(),
        },
        fetchFn: vi.fn().mockResolvedValue(networkResponse),
        waitUntil,
      });

      expect(response).toBe(networkResponse);
      expect(waitUntil).toHaveBeenCalledOnce();
    });

    it("converts version-skew HTML responses into 404 Not Found", async () => {
      const request = new Request("https://codex.test/_app/immutable/chunk.js");
      const htmlResponse = new Response("<!DOCTYPE html><html>404</html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      });

      const response = await handleFetchRequest({
        request,
        cacheName,
        origin,
        cacheStorage: {
          open: vi.fn().mockResolvedValue({
            match: vi.fn(),
            put: vi.fn(),
          }),
          match: vi.fn(),
        },
        fetchFn: vi.fn().mockResolvedValue(htmlResponse),
      });

      expect(response.status).toBe(404);
      expect(await response.text()).toContain("Version Skew");
    });

    it("falls back to cache when offline", async () => {
      const request = new Request("https://codex.test/vault/doc");
      const cached = new Response("cached-content");

      const response = await handleFetchRequest({
        request,
        cacheName,
        origin,
        cacheStorage: {
          open: vi.fn().mockResolvedValue({
            match: vi.fn().mockResolvedValue(cached),
            put: vi.fn(),
          }),
          match: vi.fn().mockResolvedValue(undefined),
        },
        fetchFn: vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
      });

      expect(response).toBe(cached);
    });

    it("falls back to index.html for offline navigation requests", async () => {
      const request = new Request("https://codex.test/vault/doc", {
        headers: { mode: "navigate" },
      });
      Object.defineProperty(request, "mode", { value: "navigate" });
      const spaShell = new Response("<!DOCTYPE html><div id='app'>");

      const response = await handleFetchRequest({
        request,
        cacheName,
        origin,
        cacheStorage: {
          open: vi.fn().mockResolvedValue({
            match: vi
              .fn()
              .mockImplementation(async (req: RequestInfo | URL) => {
                if (req === "/" || req === "/index.html") return spaShell;
                return undefined;
              }),
            put: vi.fn(),
          }),
          match: vi.fn().mockResolvedValue(undefined),
        },
        fetchFn: vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
      });

      expect(response).toBe(spaShell);
    });

    it("handles aborted fetch requests cleanly without unhandled rejections", async () => {
      const request = new Request("https://codex.test/vault/doc");
      const abortError = new DOMException(
        "The user aborted a request.",
        "AbortError",
      );

      const response = await handleFetchRequest({
        request,
        cacheName,
        origin,
        cacheStorage: {
          open: vi.fn().mockResolvedValue({
            match: vi.fn().mockResolvedValue(undefined),
            put: vi.fn(),
          }),
          match: vi.fn().mockResolvedValue(undefined),
        },
        fetchFn: vi.fn().mockRejectedValue(abortError),
        isDev: false,
      });

      expect(response.type).toBe("error");
    });

    it("rethrows errors in development when isDev is true", async () => {
      const request = new Request("https://codex.test/vault/doc");
      const networkError = new Error("Network connection dropped");

      await expect(
        handleFetchRequest({
          request,
          cacheName,
          origin,
          cacheStorage: {
            open: vi.fn().mockResolvedValue({
              match: vi.fn().mockResolvedValue(undefined),
              put: vi.fn(),
            }),
            match: vi.fn().mockResolvedValue(undefined),
          },
          fetchFn: vi.fn().mockRejectedValue(networkError),
          isDev: true,
        }),
      ).rejects.toThrow("Network connection dropped");
    });
  });
});
