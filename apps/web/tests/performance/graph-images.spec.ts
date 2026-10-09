import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { setupVaultPage } from "../test-helpers";

/**
 * How quickly the graph paints node pictures when every entity points at an
 * external image, and how those requests behave.
 *
 * The large-vault fixture cannot show this: its focus view is dense enough to
 * switch images off (`perfStylingActive`). This scenario uses a sparser vault
 * shaped like a real one (a few hundred nodes, about two edges each) and mock
 * image hosts, so a run is repeatable and needs no network.
 *
 * Hosts: `fast` answers at once with CORS headers, `slow` answers after a
 * delay, `blocked` answers without CORS headers (the fetch fails, but a plain
 * image load works), `hung` never answers.
 */

const ENTITY_COUNT = 300;
const EDGE_COUNT = 575;
const SLOW_DELAY_MS = 1500;
const BLOCKED_DELAY_MS = 300;
const WAIT_LIMIT_MS = 60_000;

// 1x1 PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

type Mix = { fast: number; slow: number; blocked: number; hung: number };

/** Share of entities per host, out of 20. Deterministic by entity index. */
const MIXES: Record<string, Mix> = {
  typical: { fast: 12, slow: 5, blocked: 3, hung: 0 },
  "with-hung": { fast: 11, slow: 5, blocked: 3, hung: 1 },
};

function hostFor(index: number, mix: Mix) {
  const slot = index % 20;
  if (slot < mix.fast) return "fast";
  if (slot < mix.fast + mix.slow) return "slow";
  if (slot < mix.fast + mix.slow + mix.blocked) return "blocked";
  return "hung";
}

function createEntities(mix: Mix) {
  const entities: Record<string, any> = {};
  for (let i = 0; i < ENTITY_COUNT; i += 1) {
    const url = `https://img-${hostFor(i, mix)}.test/${i}.png`;
    entities[`img-${i}`] = {
      id: `img-${i}`,
      type: "character",
      title: `Image entity ${i}`,
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
  for (let edge = 0; edge < EDGE_COUNT; edge += 1) {
    const source = edge % ENTITY_COUNT;
    const target = (source * 37 + edge * 13 + 1) % ENTITY_COUNT;
    if (source === target) continue;
    entities[`img-${source}`].connections.push({
      target: `img-${target}`,
      type: "related",
      label: "Related",
      strength: 1,
    });
  }
  return entities;
}

test.describe.configure({ mode: "serial" });

for (const [name, mix] of Object.entries(MIXES)) {
  test(`graph images: ${name}`, async ({ page }) => {
    test.setTimeout(150_000);
    const requests: Record<string, number> = {
      fast: 0,
      slow: 0,
      blocked: 0,
      hung: 0,
    };

    await page.route(
      /^https:\/\/img-(fast|slow|blocked|hung)\.test\//,
      async (route) => {
        const kind = /img-(\w+)\.test/.exec(route.request().url())![1];
        requests[kind] += 1;
        if (kind === "hung") return; // never answers
        if (kind === "slow")
          await new Promise((r) => setTimeout(r, SLOW_DELAY_MS));
        if (kind === "blocked")
          await new Promise((r) => setTimeout(r, BLOCKED_DELAY_MS));
        await route.fulfill({
          status: 200,
          contentType: "image/png",
          body: PNG,
          headers:
            kind === "blocked" ? {} : { "access-control-allow-origin": "*" },
        });
      },
    );

    await page.addInitScript(() => {
      (window as any).__CODEX_PERFORMANCE_CAPTURE__ = true;
      localStorage.setItem("codex_world_page_dismissed_at", String(Date.now()));
    });
    await setupVaultPage(page);

    // Record when pictures land, starting from the moment the entities arrive.
    await page.evaluate((total) => {
      const rec: any = { marks: {}, count: 0, last: 0, t0: 0 };
      (window as any).__imgRec = rec;
      const steps: [string, number][] = [
        ["first", 1 / total],
        ["p25", 0.25],
        ["p50", 0.5],
        ["p75", 0.75],
        ["p90", 0.9],
        ["all", 1],
      ];
      window.setInterval(() => {
        const cy = (window as any).cy;
        if (!cy || !rec.t0) return;
        let n = 0;
        cy.nodes().forEach((node: any) => {
          if (node.data("resolvedImage")) n += 1;
        });
        const dt = performance.now() - rec.t0;
        rec.count = n;
        if (n > 0) rec.last = dt;
        for (const [key, fraction] of steps) {
          if (rec.marks[key] === undefined && n >= fraction * total)
            rec.marks[key] = Math.round(dt);
        }
      }, 25);
    }, ENTITY_COUNT);

    const entities = createEntities(mix);
    await page.evaluate(async (fixture) => {
      const vault = (window as any).vault;
      if (!vault?.entityStore)
        throw new Error("Performance vault hook unavailable");
      (window as any).__imgRec.t0 = performance.now();
      vault.status = "loading";
      vault.entityStore.entities = fixture;
      vault.entityStore.initializeInboundConnections();
      vault.entityStore.rebuildIndexes();
      vault.status = "idle";
      vault.isInitialized = true;
      (window as any).graphViewController?.syncElements();
      (window as any).graphViewController?.syncRenderHints();
    }, entities);

    await page.waitForFunction(
      () => {
        const cy = (window as any).cy;
        return Boolean(cy && cy.nodes().length > 0);
      },
      undefined,
      { timeout: 60_000 },
    );
    const imagesActive = await page.evaluate(() => {
      const graph = (window as any).graph;
      return graph ? graph.showImages && !graph.perfStylingActive : null;
    });

    // Wait until every node has a picture, or until the limit.
    const finished = await page
      .waitForFunction(
        (total) => (window as any).__imgRec.count >= total,
        ENTITY_COUNT,
        { timeout: WAIT_LIMIT_MS },
      )
      .then(() => true)
      .catch(() => false);

    const rec = await page.evaluate(() => (window as any).__imgRec);
    const perUrl = (kind: keyof Mix) => {
      const urls = Array.from({ length: ENTITY_COUNT }, (_, i) => i).filter(
        (i) => hostFor(i, mix) === kind,
      ).length;
      return urls === 0 ? null : +(requests[kind] / urls).toFixed(2);
    };
    const result = {
      scenario: name,
      entityCount: ENTITY_COUNT,
      imagesActive,
      finished,
      resolvedCount: rec.count,
      msToFirst: rec.marks.first ?? null,
      msToP25: rec.marks.p25 ?? null,
      msToP50: rec.marks.p50 ?? null,
      msToP75: rec.marks.p75 ?? null,
      msToP90: rec.marks.p90 ?? null,
      msToAll: rec.marks.all ?? null,
      requestsPerUrl: {
        fast: perUrl("fast"),
        slow: perUrl("slow"),
        blocked: perUrl("blocked"),
        hung: perUrl("hung"),
      },
    };
    const output = path.join("test-results", `graph-images-${name}.json`);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
    console.log(`GRAPH_IMAGES ${JSON.stringify(result)}`);

    expect(imagesActive).toBe(true);
  });
}
