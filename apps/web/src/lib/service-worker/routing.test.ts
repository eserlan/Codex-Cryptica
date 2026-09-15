import { describe, expect, it } from "vitest";
import {
  getVaultSeedUrls,
  isPotentialVaultAsset,
  isVaultAppPath,
  isViteDevUrl,
  shouldBypassFetchSynchronously,
  shouldHandleVaultRequest,
} from "./routing";

describe("routing", () => {
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
      "/my-stuff",
      "/silhouettes",
    ])("rejects the public route %s", (pathname) => {
      expect(isVaultAppPath(pathname)).toBe(false);
    });
  });

  describe("isViteDevUrl", () => {
    it("detects Vite dev-server asset requests", () => {
      expect(isViteDevUrl(new URL("https://codex.test/src/App.svelte"))).toBe(
        true,
      );
      expect(
        isViteDevUrl(new URL("https://codex.test/src/main.ts?v=123")),
      ).toBe(true);
      expect(isViteDevUrl(new URL("https://codex.test/@vite/client"))).toBe(
        true,
      );
      expect(
        isViteDevUrl(new URL("https://codex.test/@fs/home/espen/foo")),
      ).toBe(true);
      expect(
        isViteDevUrl(
          new URL("https://codex.test/node_modules/svelte/index.js"),
        ),
      ).toBe(true);
    });

    it("does not match production assets", () => {
      expect(
        isViteDevUrl(new URL("https://codex.test/_app/immutable/nodes/1.js")),
      ).toBe(false);
      expect(isViteDevUrl(new URL("https://codex.test/vault/world-1"))).toBe(
        false,
      );
    });
  });

  describe("isPotentialVaultAsset", () => {
    it("recognises cacheable runtime destinations and immutable files", () => {
      expect(isPotentialVaultAsset("/bundle.js", "script")).toBe(true);
      expect(isPotentialVaultAsset("/theme.css", "style")).toBe(true);
      expect(isPotentialVaultAsset("/font.woff2", "font")).toBe(true);
      expect(isPotentialVaultAsset("/_app/immutable/nodes/4.js", "")).toBe(
        true,
      );
      expect(isPotentialVaultAsset("/engine.wasm", "")).toBe(true);
    });

    it("rejects non-asset and data endpoints", () => {
      expect(isPotentialVaultAsset("/silhouettes/__data.json", "")).toBe(false);
      expect(isPotentialVaultAsset("/api/sync", "")).toBe(false);
      expect(isPotentialVaultAsset("/my-stuff", "document")).toBe(false);
    });
  });

  describe("shouldBypassFetchSynchronously", () => {
    const origin = "https://codex.test";

    it("bypasses cross-origin requests", () => {
      expect(
        shouldBypassFetchSynchronously({
          url: new URL("https://assets.codexcryptica.com/img.webp"),
          mode: "cors",
          destination: "image",
          origin,
        }),
      ).toBe(true);
    });

    it("bypasses non-http protocols", () => {
      expect(
        shouldBypassFetchSynchronously({
          url: new URL("chrome-extension://xyz/script.js"),
          mode: "no-cors",
          destination: "script",
          origin,
        }),
      ).toBe(true);
    });

    it("bypasses Vite dev requests", () => {
      expect(
        shouldBypassFetchSynchronously({
          url: new URL("https://codex.test/@vite/client"),
          mode: "cors",
          destination: "script",
          origin,
        }),
      ).toBe(true);
    });

    it("bypasses navigations to public non-vault routes", () => {
      expect(
        shouldBypassFetchSynchronously({
          url: new URL("https://codex.test/silhouettes"),
          mode: "navigate",
          destination: "document",
          origin,
        }),
      ).toBe(true);
      expect(
        shouldBypassFetchSynchronously({
          url: new URL("https://codex.test/my-stuff"),
          mode: "navigate",
          destination: "document",
          origin,
        }),
      ).toBe(true);
      expect(
        shouldBypassFetchSynchronously({
          url: new URL("https://codex.test/blog/post-1"),
          mode: "navigate",
          destination: "document",
          origin,
        }),
      ).toBe(true);
    });

    it("does not bypass navigations to vault routes", () => {
      expect(
        shouldBypassFetchSynchronously({
          url: new URL("https://codex.test/vault/world-1"),
          mode: "navigate",
          destination: "document",
          origin,
        }),
      ).toBe(false);
      expect(
        shouldBypassFetchSynchronously({
          url: new URL("https://codex.test/"),
          mode: "navigate",
          destination: "document",
          origin,
        }),
      ).toBe(false);
    });

    it("bypasses subresources that cannot possibly be vault assets", () => {
      expect(
        shouldBypassFetchSynchronously({
          url: new URL("https://codex.test/api/sync"),
          mode: "cors",
          destination: "",
          origin,
        }),
      ).toBe(true);
      expect(
        shouldBypassFetchSynchronously({
          url: new URL("https://codex.test/silhouettes/__data.json"),
          mode: "cors",
          destination: "",
          origin,
        }),
      ).toBe(true);
    });

    it("allows potential vault subresources through for client-pathname checking", () => {
      expect(
        shouldBypassFetchSynchronously({
          url: new URL("https://codex.test/_app/immutable/nodes/1.js"),
          mode: "cors",
          destination: "script",
          origin,
        }),
      ).toBe(false);
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
});
