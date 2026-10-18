import { expect, test } from "@playwright/test";
import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { setupVaultPage } from "../test-helpers";

/**
 * What a host that serves images but sends no CORS headers costs, in this
 * session and after a reload. Scabard and Google Photos do this: the picture
 * loads fine as a plain image, but the app's own CORS fetch for it (to make a
 * thumbnail) can never succeed, fails with a console error, and used to be
 * repeated for every image on every load.
 *
 * Counts requests to the host and console errors per image, in the first
 * session and again after a reload. The images come from a real HTTP server on
 * another port so the browser enforces CORS as it would for a real host.
 */

const ENTITY_COUNT = 80;
const WAIT_LIMIT_MS = 60_000;
const SETTLE_MS = 4_000;

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

/** A cross-origin image host that serves real images but sends no CORS headers. */
function startImageHost() {
  const counts = { requests: 0 };
  const server = http.createServer((_request, response) => {
    counts.requests += 1;
    response.writeHead(200, {
      "content-type": "image/png",
      // Distinct, uncacheable responses: every request is counted.
      "cache-control": "no-store",
    });
    response.end(PNG);
  });
  return new Promise<{
    origin: string;
    counts: typeof counts;
    stop: () => void;
  }>((resolve) =>
    server.listen(0, "127.0.0.1", () =>
      resolve({
        origin: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
        counts,
        stop: () => server.close(),
      }),
    ),
  );
}
function createEntities(origin: string) {
  const entities: Record<string, any> = {};
  for (let i = 0; i < ENTITY_COUNT; i += 1) {
    const url = `${origin}/nocors/${i}.png`;
    entities[`nocors-${i}`] = {
      id: `nocors-${i}`,
      type: "character",
      title: `Entity ${i}`,
      labels: [],
      connections: [],
      content: "Deterministic benchmark content.",
      lore: "",
      image: url,
      thumbnail: url,
      updatedAt: i,
      modifiedAt: i,
    };
  }
  for (let edge = 0; edge < ENTITY_COUNT * 2; edge += 1) {
    const source = edge % ENTITY_COUNT;
    const target = (source * 37 + edge * 13 + 1) % ENTITY_COUNT;
    if (source === target) continue;
    entities[`nocors-${source}`].connections.push({
      target: `nocors-${target}`,
      type: "related",
      label: "Related",
      strength: 1,
    });
  }
  return entities;
}

test.describe.configure({ mode: "serial" });

test("no-CORS host cost across a reload", async ({ page }) => {
  test.setTimeout(240_000);
  const host = await startImageHost();
  const errors = { failedFetch: 0, corsPolicy: 0 };
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (!text.includes(host.origin.replace("http://", ""))) return;
    if (text.includes("CORS policy")) errors.corsPolicy += 1;
    else errors.failedFetch += 1;
  });

  await page.addInitScript(() => {
    (window as any).__CODEX_PERFORMANCE_CAPTURE__ = true;
    localStorage.setItem("codex_world_page_dismissed_at", String(Date.now()));
  });
  await setupVaultPage(page);

  const clearThemePrompt = async () => {
    const prompt = page.getByTestId("vault-theme-modal");
    if (await prompt.isVisible()) {
      await page.getByRole("button", { name: "LATER" }).click();
    }
  };
  const settle = async () => {
    const deadline = Date.now() + WAIT_LIMIT_MS;
    for (;;) {
      await clearThemePrompt();
      const resolved = await page.evaluate(() => {
        const cy = (window as any).cy;
        if (!cy) return 0;
        let n = 0;
        cy.nodes().forEach((node: any) => {
          if (node.data("resolvedImage")) n += 1;
        });
        return n;
      });
      if (resolved >= ENTITY_COUNT) break;
      if (Date.now() > deadline) throw new Error(`only ${resolved} resolved`);
      await page.waitForTimeout(500);
    }
    await page.waitForTimeout(SETTLE_MS);
  };

  await page.evaluate(async (fixture) => {
    const w = window as any;
    const vault = w.vault;
    vault.status = "loading";
    vault.entityStore.entities = fixture;
    vault.entityStore.initializeInboundConnections();
    vault.entityStore.rebuildIndexes();
    vault.status = "idle";
    vault.isInitialized = true;
    w.graphViewController?.syncElements();
    await vault.persistToIndexedDB(vault.activeVaultId);
    await w.cacheService?.bulkSet(
      Object.values(fixture).map((entity: any) => ({
        path: `${vault.activeVaultId}:entities/${entity.id}.md`,
        lastModified: entity.modifiedAt,
        entity,
      })),
    );
  }, createEntities(host.origin));
  await settle();
  const session1 = { requests: host.counts.requests, ...errors };

  host.counts.requests = 0;
  errors.failedFetch = 0;
  errors.corsPolicy = 0;
  await page.reload();
  await page.waitForFunction(
    (count) => {
      const vault = (window as any).vault;
      return vault?.status === "idle" && vault.allEntities?.length === count;
    },
    ENTITY_COUNT,
    { timeout: 60_000 },
  );
  await page.waitForFunction(
    () => Boolean((window as any).cy?.nodes().length),
    undefined,
    { timeout: 60_000 },
  );
  await settle();
  const session2 = { requests: host.counts.requests, ...errors };
  host.stop();

  const per = (n: number) => +(n / ENTITY_COUNT).toFixed(2);
  const result = {
    images: ENTITY_COUNT,
    session1: {
      requestsPerImage: per(session1.requests),
      consoleErrorsPerImage: per(session1.failedFetch + session1.corsPolicy),
    },
    session2: {
      requestsPerImage: per(session2.requests),
      consoleErrorsPerImage: per(session2.failedFetch + session2.corsPolicy),
    },
  };
  const output = path.join("test-results", "graph-images-nocors.json");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`GRAPH_IMAGES_NOCORS ${JSON.stringify(result)}`);
  expect(session1.requests).toBeGreaterThan(0);
  // What this change is for. Only the first image from the host finds out it
  // sends no CORS headers, so the first session logs a handful of errors, not
  // one or two per image, and a reload logs none: the host is remembered.
  // Without it the scenario would still pass if every image failed on its own.
  expect(session1.failedFetch + session1.corsPolicy).toBeLessThanOrEqual(4);
  expect(session2.failedFetch + session2.corsPolicy).toBe(0);
});
