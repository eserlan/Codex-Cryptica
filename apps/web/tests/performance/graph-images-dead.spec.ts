import { expect, test } from "@playwright/test";
import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { setupVaultPage } from "../test-helpers";

/**
 * What a link that answers 404 *without CORS headers* costs, in this session
 * and after a reload. Discord's CDN does this for expired attachments: the
 * status is hidden from `fetch`, so the link cannot be called dead, and every
 * load used to request it again (once for the fetch, once more when the graph
 * handed the plain URL to Cytoscape), each adding a console 404.
 *
 * Counts requests per dead URL in the first session and again after a reload.
 *
 * The images are served by a real HTTP server on another port, not by
 * Playwright's request interception: intercepted responses are not held to CORS
 * the way a real cross-origin host is, which made the 404's status readable and
 * hid the very case this measures.
 */

const ENTITY_COUNT = 120;
const WAIT_LIMIT_MS = 60_000;
const SETTLE_MS = 4_000;

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

const isDead = (index: number) => index % 5 === 0;

/** A cross-origin image host: fast images with CORS headers, dead ones without. */
function startImageHost() {
  const counts = { dead: 0 };
  const server = http.createServer((request, response) => {
    if (request.url?.startsWith("/dead/")) {
      counts.dead += 1;
      response.writeHead(404, { "content-type": "text/plain" });
      response.end("");
      return;
    }
    response.writeHead(200, {
      "content-type": "image/png",
      "access-control-allow-origin": "*",
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
const deadCount = Array.from({ length: ENTITY_COUNT }, (_, i) => i).filter(
  isDead,
).length;

function createEntities(origin: string) {
  const entities: Record<string, any> = {};
  for (let i = 0; i < ENTITY_COUNT; i += 1) {
    const url = `${origin}/${isDead(i) ? "dead" : "fast"}/${i}.png`;
    entities[`dead-${i}`] = {
      id: `dead-${i}`,
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
    entities[`dead-${source}`].connections.push({
      target: `dead-${target}`,
      type: "related",
      label: "Related",
      strength: 1,
    });
  }
  return entities;
}

test.describe.configure({ mode: "serial" });

test("dead link requests across a reload", async ({ page }) => {
  test.setTimeout(240_000);
  const host = await startImageHost();

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
  const session1 = host.counts.dead;

  host.counts.dead = 0;
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
  const session2 = host.counts.dead;
  host.stop();

  const result = {
    deadUrls: deadCount,
    session1PerUrl: +(session1 / deadCount).toFixed(2),
    session2PerUrl: +(session2 / deadCount).toFixed(2),
  };
  const output = path.join("test-results", "graph-images-dead.json");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`GRAPH_IMAGES_DEAD ${JSON.stringify(result)}`);
  // The first session still pays for the CORS fetch and then the plain-image
  // probe, so at most two requests per dead link.
  expect(session1).toBeGreaterThan(0);
  expect(session1).toBeLessThanOrEqual(deadCount * 2);
  // What this change is for: a reload makes no request at all for a link an
  // earlier session found unreachable. Without this the scenario would still
  // pass if the reload re-requested every dead link.
  expect(session2).toBe(0);
});
