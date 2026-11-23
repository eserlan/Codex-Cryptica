import { test, expect, type Page } from "@playwright/test";
import fs from "fs";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { seedOnboardingComplete } from "./test-helpers";

/**
 * Browser-level regression tests for #5096: public cache bypass and offline
 * vault isolation across deploys.
 *
 * Harness: production build only (`bun run build` first; run via
 * playwright.sw.config.ts — the default config's Vite dev server never
 * registers the worker). Deploy simulation mechanism (mini-spec Task 1,
 * fallback variant): `vite preview` serves from memory, so disk swaps are
 * invisible to it. This spec therefore serves the build itself through a
 * small static server with a swappable overlay: scenario (c) overlays new
 * public HTML and changed service-worker bytes on the same origin and port,
 * with no second build and no files written.
 *
 * Browser exclusions: Chromium only (the repo's sole Playwright project).
 * Firefox and WebKit/Safari service-worker cache/update semantics are not
 * covered by this slice. Assertions are on real responses and real Cache
 * Storage contents, not on routing predicates (those are unit-tested in
 * src/lib/service-worker/*.test.ts).
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUILD_DIR = path.join(__dirname, "..", "build");
const PUBLIC_ROUTE = "/tools/quest-hook-generator";
const PUBLIC_HTML_FILE = path.join(
  BUILD_DIR,
  "tools",
  "quest-hook-generator.html",
);
const SW_FILE = path.join(BUILD_DIR, "service-worker.js");
const DEPLOY_MARKER = "SW-DEPLOY-B-5096";

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
  ".txt": "text/plain",
  ".webmanifest": "application/manifest+json",
};

/** Overlay bodies served in place of the build files (the "next deploy"). */
const overlay = new Map<string, string>();
let origin = "";

function startBuildServer(): Promise<http.Server> {
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(
      new URL(request.url ?? "/", "http://localhost").pathname,
    );

    const overlaid = overlay.get(pathname);
    if (overlaid !== undefined) {
      response.writeHead(200, {
        "Content-Type": pathname.endsWith(".js")
          ? "text/javascript"
          : "text/html",
      });
      response.end(overlaid);
      return;
    }

    const candidates = [
      path.join(BUILD_DIR, pathname),
      path.join(BUILD_DIR, `${pathname}.html`),
      path.join(BUILD_DIR, pathname, "index.html"),
    ];
    const file = candidates.find(
      (candidate) =>
        fs.existsSync(candidate) && fs.statSync(candidate).isFile(),
    );
    if (file) {
      response.writeHead(200, {
        "Content-Type":
          CONTENT_TYPES[path.extname(file)] ?? "application/octet-stream",
      });
      fs.createReadStream(file).pipe(response);
      return;
    }
    // Asset misses are real 404s; document misses get the SPA fallback,
    // matching the adapter-static deployment shape.
    if (path.extname(pathname)) {
      response.writeHead(404);
      response.end("not found");
      return;
    }
    response.writeHead(200, { "Content-Type": "text/html" });
    fs.createReadStream(path.join(BUILD_DIR, "index.html")).pipe(response);
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

test.describe.configure({ mode: "serial" });
test.setTimeout(180_000);

/**
 * Production pages do not expose `window.vault` (that is dev-only, see
 * stores/vault/singleton.ts), so set the performance-capture flag the app
 * itself honours before boot, then wait on the real vault store.
 */
async function setupProductionVaultPage(page: Page) {
  await page.addInitScript(() => {
    (window as any).__CODEX_PERFORMANCE_CAPTURE__ = true;
  });
  await page.addInitScript(seedOnboardingComplete);
  await page.goto(`${origin}/`);
  await page.waitForFunction(
    () => {
      const vault = (window as any).vault;
      return !!vault && vault.isInitialized === true && vault.status === "idle";
    },
    undefined,
    { timeout: 30_000 },
  );
  await expect(page.getByTestId("graph-canvas")).toBeVisible({
    timeout: 30_000,
  });
}

async function waitForServiceWorkerControl(page: Page) {
  await page.waitForFunction(
    () => !!navigator.serviceWorker?.controller,
    undefined,
    { timeout: 30_000 },
  );
}

async function cacheNames(page: Page): Promise<string[]> {
  return page.evaluate(() => caches.keys());
}

async function waitForVaultSeed(page: Page) {
  await page.waitForFunction(
    async () => {
      const names = await caches.keys();
      const current = names.find((name) => name.startsWith("cache-"));
      if (!current) return false;
      const cache = await caches.open(current);
      const keys = await cache.keys();
      const pathnames = keys.map((request) => new URL(request.url).pathname);
      // The seed must contain the document itself, not just assets fetched
      // while controlled: without it an offline reload has no shell.
      return (
        pathnames.includes("/") &&
        pathnames.some((pathname) => pathname.startsWith("/_app/immutable/"))
      );
    },
    undefined,
    { timeout: 30_000 },
  );
}

async function publicEntriesInCaches(page: Page): Promise<string[]> {
  return page.evaluate(async (publicRoute) => {
    const found: string[] = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) {
        const pathname = new URL(request.url).pathname;
        if (
          pathname === publicRoute ||
          pathname.startsWith("/tools/") ||
          pathname.startsWith("/for/") ||
          pathname.startsWith("/generators/") ||
          pathname.startsWith("/blog/")
        ) {
          found.push(`${name}:${pathname}`);
        }
      }
    }
    return found;
  }, PUBLIC_ROUTE);
}

async function entityCount(page: Page): Promise<number> {
  return page.evaluate(() => (window as any).vault?.allEntities?.length ?? -1);
}

test.describe("service worker: public bypass and offline vault (#5096)", () => {
  let server: http.Server;
  test.beforeAll(async () => {
    server = await startBuildServer();
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("build server did not bind a port");
    }
    origin = `http://127.0.0.1:${address.port}`;
  });
  test.afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test.beforeEach(async ({ page }) => {
    await setupProductionVaultPage(page);
    await waitForServiceWorkerControl(page);
    await waitForVaultSeed(page);
  });

  test("(a) offline reload of a seeded active vault renders without data loss", async ({
    page,
    context,
  }) => {
    const before = await entityCount(page);
    expect(before).toBeGreaterThanOrEqual(0);

    await context.setOffline(true);
    try {
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("graph-canvas")).toBeVisible({
        timeout: 30_000,
      });
      expect(await entityCount(page)).toBe(before);
    } finally {
      await context.setOffline(false);
    }
  });

  test("(b) public navigation after vault use is network-served and never cached in vault caches", async ({
    page,
  }) => {
    const response = await page.goto(`${origin}${PUBLIC_ROUTE}`);
    expect(response?.status()).toBe(200);
    await expect(page.locator("body")).not.toContainText(DEPLOY_MARKER);

    expect(await publicEntriesInCaches(page)).toEqual([]);
    const match = await page.evaluate(
      (url) => caches.match(url).then((hit) => !!hit),
      new URL(PUBLIC_ROUTE, page.url()).href,
    );
    expect(match).toBe(false);
  });

  test("(d) cross-navigation /tools/* <-> vault keeps both sides correct", async ({
    page,
  }) => {
    await page.goto(`${origin}${PUBLIC_ROUTE}`);
    expect(page.url()).toContain(PUBLIC_ROUTE);

    await page.goto(`${origin}/`);
    await expect(page.getByTestId("graph-canvas")).toBeVisible({
      timeout: 30_000,
    });
    await waitForVaultSeed(page);

    const response = await page.goto(`${origin}${PUBLIC_ROUTE}`);
    expect(response?.status()).toBe(200);
    expect(await publicEntriesInCaches(page)).toEqual([]);
  });

  test("(b-negative) offline public navigation fails as a network error, not a vault-cache fallback", async ({
    page,
    context,
  }) => {
    await context.setOffline(true);
    try {
      await expect(page.goto(`${origin}${PUBLIC_ROUTE}`)).rejects.toThrow();
    } finally {
      await context.setOffline(false);
    }
    // Back online the same route is served fresh again.
    const response = await page.goto(`${origin}${PUBLIC_ROUTE}`);
    expect(response?.status()).toBe(200);
  });

  test("(e) a new vault seed retires older caches and keeps the current one", async ({
    page,
  }) => {
    const legacyName = "cache-legacy-5096";
    await page.evaluate(async (name) => {
      const cache = await caches.open(name);
      await cache.put(
        "/__legacy-5096__",
        new Response("legacy", { headers: { "Content-Type": "text/plain" } }),
      );
    }, legacyName);
    expect(await cacheNames(page)).toContain(legacyName);

    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForServiceWorkerControl(page);

    await page.waitForFunction(
      async (name) => !(await caches.keys()).includes(name),
      legacyName,
      { timeout: 30_000 },
    );
    const remaining = await cacheNames(page);
    expect(remaining.some((name) => name.startsWith("cache-"))).toBe(true);
  });

  test("(c) a deployed public update is fresh under the previous controlling worker", async ({
    page,
    context,
  }) => {
    // Disable the HTTP cache so this isolates the service worker: the
    // question is whether the worker obscures the deploy, not whether the
    // preview server's cache headers are revalidated.
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });

    const originalHtml = fs.readFileSync(PUBLIC_HTML_FILE, "utf-8");
    const originalSw = fs.readFileSync(SW_FILE, "utf-8");
    expect(originalHtml).not.toContain(DEPLOY_MARKER);

    try {
      // Simulate a deploy on the same origin: the build server overlays new
      // public HTML and changed service-worker bytes; nothing is written.
      overlay.set(
        PUBLIC_ROUTE,
        originalHtml.replace(
          "</body>",
          `<div id="sw-deploy-marker">${DEPLOY_MARKER}</div></body>`,
        ),
      );
      overlay.set("/service-worker.js", `${originalSw}\n/* deploy-b-5096 */\n`);

      // Wait for the new worker to take control (skipWaiting + claim fires
      // controllerchange), not merely for some worker to be active — the old
      // worker is already active and would satisfy that weaker check.
      await page.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        const controlled = new Promise<void>((resolve) => {
          navigator.serviceWorker.addEventListener(
            "controllerchange",
            () => resolve(),
            { once: true },
          );
          setTimeout(resolve, 15_000);
        });
        await registration?.update();
        await controlled;
      });

      const response = await page.goto(`${origin}${PUBLIC_ROUTE}`);
      expect(response?.status()).toBe(200);
      await expect(page.locator("#sw-deploy-marker")).toHaveText(DEPLOY_MARKER);
      expect(await publicEntriesInCaches(page)).toEqual([]);
    } finally {
      overlay.delete(PUBLIC_ROUTE);
      overlay.delete("/service-worker.js");
    }
  });
});
