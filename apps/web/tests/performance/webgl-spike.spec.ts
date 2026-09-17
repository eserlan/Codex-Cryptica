/**
 * #3168 SPIKE — Cytoscape WebGL vs Canvas 2D comparison.
 *
 * Experimental, not a regression gate: every test here only records
 * measurements and parity observations (console JSON) for the spike report.
 * Toggle via `?webgl=1` (sticky in localStorage); default is Canvas 2D.
 */
import { expect, test, type Page } from "@playwright/test";
import { dismissFrontPage, seedOnboardingComplete } from "../test-helpers";

type RendererMode = "canvas" | "webgl";

const SCALES = [
  { label: "normal", nodes: 250, edges: 1400 },
  { label: "large", nodes: 500, edges: 2800 },
  { label: "very-large", nodes: 1000, edges: 5600 },
  { label: "stress", nodes: 1600, edges: 9000 },
] as const;

const BENIGN_CONSOLE_NOISE = [
  "webgl rendering enabled", // cytoscape's own experimental-flag log
  "cloudflareinsights", // local-dev beacon CORS noise, unrelated to the graph
  "ERR_FAILED", // local-dev blocked third-party requests
  "favicon",
];

function isSpikeError(text: string) {
  return !BENIGN_CONSOLE_NOISE.some((noise) => text.includes(noise));
}

async function gotoGraph(page: Page, mode: RendererMode) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
  });
  await page.addInitScript(seedOnboardingComplete);
  await page.goto(mode === "webgl" ? "/?webgl=1" : "/");
  await page.waitForFunction(
    () => (window as any).vault?.status === "idle",
    undefined,
    { timeout: 20000 },
  );
  await dismissFrontPage(page);
  await expect(page.getByTestId("graph-canvas")).toBeVisible({
    timeout: 15000,
  });
  // The controller only exists once the graph surface initialises.
  await page.waitForFunction(
    () => !!(window as any).graphViewController,
    undefined,
    { timeout: 20000 },
  );
  return errors;
}

function rendererSnapshot(page: Page) {
  return page.evaluate(() => {
    const cy = (window as any).cy;
    const controller = (window as any).graphViewController;
    const layers = [
      ...document.querySelectorAll(
        "#graph-canvas canvas, [data-testid='graph-canvas'] canvas",
      ),
    ].map((c) => c.getAttribute("data-id"));
    return {
      mode: controller?.rendererMode,
      cyNodes: cy?.nodes?.().length ?? -1,
      cyEdges: cy?.edges?.().length ?? -1,
      webgl2: !!document.createElement("canvas").getContext("webgl2"),
      layers,
    };
  });
}

async function seedVault(page: Page, nodeCount: number, edgeCount: number) {
  return page.evaluate(
    ({ nodeCount, edgeCount }) => {
      const start = performance.now();
      const vault = (window as any).vault;
      if (!vault?.entityStore) {
        throw new Error("Vault entity store is not available");
      }
      const entities: Record<string, any> = {};
      for (let i = 0; i < nodeCount; i++) {
        entities[`spike-node-${i}`] = {
          id: `spike-node-${i}`,
          type: i % 7 === 0 ? "location" : "npc",
          title: `Spike Node ${i}`,
          tags: [],
          labels: [],
          connections: [],
          content: "",
          updatedAt: i,
        };
      }
      let createdEdges = 0;
      for (
        let sourceIndex = 0;
        createdEdges < edgeCount;
        sourceIndex = (sourceIndex + 1) % nodeCount
      ) {
        const targetIndex =
          (sourceIndex * 37 + createdEdges * 13 + 1) % nodeCount;
        if (targetIndex === sourceIndex) continue;
        entities[`spike-node-${sourceIndex}`].connections.push({
          target: `spike-node-${targetIndex}`,
          type: "related",
          label: "Related",
          strength: 1,
        });
        createdEdges++;
      }
      vault.status = "loading";
      vault.selectedEntityId = "spike-node-42";
      vault.entityStore.entities = entities;
      vault.entityStore.initializeInboundConnections();
      vault.entityStore.rebuildIndexes();
      vault.status = "idle";
      vault.isInitialized = true;
      return performance.now() - start;
    },
    { nodeCount, edgeCount },
  );
}

async function waitFullGraph(page: Page, nodeCount: number, edgeCount: number) {
  await page.evaluate(() => {
    const graph = (window as any).graph;
    if (graph) graph.showFullGraph = true;
  });
  await page.waitForFunction(
    ({ nodeCount, edgeCount }) => {
      const graph = (window as any).graph;
      const cy = (window as any).cy;
      if (!graph || !cy) return false;
      const graphNodes = graph.elements.filter(
        (element: any) => element.group === "nodes",
      ).length;
      const graphEdges = graph.elements.filter(
        (element: any) => element.group === "edges",
      ).length;
      return (
        graphNodes === nodeCount &&
        graphEdges === edgeCount &&
        cy.nodes().length === graphNodes &&
        cy.edges().length === graphEdges
      );
    },
    { nodeCount, edgeCount },
    { timeout: 90000 },
  );
  await page.waitForFunction(
    () => {
      const cy = (window as any).cy;
      if (!cy) return false;
      return (
        cy.nodes(".pending-layout").length === 0 &&
        cy.nodes("[isPendingLayout]").length === 0
      );
    },
    undefined,
    { timeout: 90000 },
  );
}

function heapMB(page: Page) {
  return page.evaluate(() => {
    const bytes = (performance as any).memory?.usedJSHeapSize as
      number | undefined;
    return bytes == null ? -1 : bytes / 1048576;
  });
}

test.describe("webgl spike: renderer smoke", () => {
  for (const mode of ["canvas", "webgl"] as const) {
    test(`${mode} initialises its renderer layer without page errors`, async ({
      page,
    }) => {
      test.setTimeout(90000);
      const errors = await gotoGraph(page, mode);
      const snap = await rendererSnapshot(page);
      console.log(`SPIKE smoke ${mode}: ${JSON.stringify(snap)}`);
      expect(snap.mode).toBe(mode);
      if (mode === "webgl") {
        expect(snap.webgl2).toBe(true);
        expect(snap.layers).toContain("layer3-webgl");
      } else {
        expect(snap.layers).not.toContain("layer3-webgl");
      }
      expect(errors.filter(isSpikeError)).toEqual([]);
    });
  }
});

test.describe("webgl spike: interaction parity", () => {
  for (const mode of ["canvas", "webgl"] as const) {
    test(`${mode} supports select, hover, drag, zoom and context events`, async ({
      page,
    }) => {
      test.setTimeout(120000);
      const errors = await gotoGraph(page, mode);
      await seedVault(page, 60, 120);
      await waitFullGraph(page, 60, 120);

      // Event counters first — every stimulus below uses real pointer
      // input so renderer hit-testing (including the WebGL picking
      // framebuffer) is genuinely exercised.
      await page.evaluate(() => {
        const cy: any = (window as any).cy;
        (window as any).__spikeEvents = { mouseover: 0, cxttap: 0, tap: 0 };
        cy.on(
          "mouseover",
          "node",
          () => (window as any).__spikeEvents.mouseover++,
        );
        cy.on("cxttap", "node", () => (window as any).__spikeEvents.cxttap++);
        cy.on("tap", "node", () => (window as any).__spikeEvents.tap++);
      });
      const target = await page.evaluate(() => {
        const cy: any = (window as any).cy;
        cy.stop();
        cy.fit(undefined, 30);
        const cx = cy.width() / 2;
        const cyh = cy.height() / 2;
        let best: any = cy.nodes()[0];
        let bestD = Infinity;
        cy.nodes().forEach((n: any) => {
          const rp = n.renderedPosition();
          const d = Math.hypot(rp.x - cx, rp.y - cyh);
          if (d < bestD) {
            bestD = d;
            best = n;
          }
        });
        return {
          id: best.id(),
          before: { ...best.position() },
          rendered: best.renderedPosition(),
          zoomBefore: cy.zoom(),
        };
      });
      const box = await page.getByTestId("graph-canvas").boundingBox();
      const at = {
        x: box!.x + target.rendered.x,
        y: box!.y + target.rendered.y,
      };
      const hit = await page.evaluate(({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        const path: string[] = [];
        let cur: any = el;
        for (let i = 0; i < 4 && cur; i++) {
          path.push(
            `${cur.tagName}${cur.id ? "#" + cur.id : ""}.${(cur.className?.baseVal ?? cur.className ?? "").toString().split(" ").slice(0, 3).join(".")}`,
          );
          cur = cur.parentElement;
        }
        return {
          path,
          canvasVisible: !!document.querySelector(
            "[data-testid='graph-canvas'] canvas",
          ),
        };
      }, at);
      console.log(`SPIKE hit ${mode}: ${JSON.stringify({ at, hit })}`);

      // Hover, left-click select, right-click context, wheel zoom, drag.
      // Re-resolve and retry the click: async post-layout drift can move the
      // node between target capture and the click in dev builds.
      const t0 = Date.now();
      const atBox = await page.getByTestId("graph-canvas").boundingBox();
      let clicked = false;
      let clickedId = target.id;
      for (let attempt = 0; attempt < 4 && !clicked; attempt++) {
        const retry = await page.evaluate(() => {
          const cy: any = (window as any).cy;
          cy.stop();
          cy.fit(undefined, 30);
          const cx = cy.width() / 2;
          const cyh = cy.height() / 2;
          let best: any = cy.nodes()[0];
          let bestD = Infinity;
          cy.nodes().forEach((n: any) => {
            const rp = n.renderedPosition();
            const d = Math.hypot(rp.x - cx, rp.y - cyh);
            if (d < bestD) {
              bestD = d;
              best = n;
            }
          });
          const r = best.renderedPosition();
          return { id: best.id(), x: r.x, y: r.y };
        });
        await page.mouse.move(atBox!.x + retry.x, atBox!.y + retry.y, {
          steps: 5,
        });
        await page.waitForTimeout(300);
        await page.mouse.click(atBox!.x + retry.x, atBox!.y + retry.y);
        await page.waitForTimeout(300);
        clicked = await page.evaluate((id: string) => {
          const cy: any = (window as any).cy;
          return cy.getElementById(id).selected();
        }, retry.id);
        if (clicked) clickedId = retry.id;
      }
      expect(clicked).toBe(true);
      target.id = clickedId;
      await page.mouse.click(at.x, at.y, { button: "right" });
      await page.waitForTimeout(300);
      await page.keyboard.press("Escape");
      await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
      await page.mouse.wheel(0, -400);
      await page.waitForTimeout(300);
      // Re-resolve the screen position: the wheel-zoom above moved it.
      const atDrag = await page.evaluate((id: string) => {
        const cy: any = (window as any).cy;
        const rp = cy.getElementById(id).renderedPosition();
        const box = document
          .querySelector("[data-testid='graph-canvas']")!
          .getBoundingClientRect();
        return { x: box.x + rp.x, y: box.y + rp.y };
      }, target.id);
      await page.mouse.move(atDrag.x, atDrag.y, { steps: 5 });
      await page.mouse.down();
      await page.mouse.move(atDrag.x + 80, atDrag.y + 40, { steps: 8 });
      await page.mouse.up();
      const selectMs = Date.now() - t0;

      const result = await page.evaluate((target) => {
        const cy: any = (window as any).cy;
        const node = cy.getElementById(target.id);
        return {
          id: target.id,
          selected: node.selected(),
          before: target.before,
          dragged: { ...node.position() },
          zoomBefore: target.zoomBefore,
          zoomAfter: cy.zoom(),
          events: (window as any).__spikeEvents,
          a11ySummary: !!document.querySelector(
            "[data-testid='graph-a11y-summary']",
          ),
        };
      }, target);

      console.log(
        `SPIKE parity ${mode}: ${JSON.stringify({ ...result, selectMs })}`,
      );
      expect(result.selected).toBe(true);
      expect(result.events.mouseover).toBeGreaterThan(0);
      expect(result.events.tap).toBeGreaterThan(0);
      expect(result.events.cxttap).toBeGreaterThan(0);
      expect(result.zoomAfter).toBeGreaterThan(result.zoomBefore);
      expect(result.a11ySummary).toBe(true);
      expect(result.dragged.x).not.toBeCloseTo(result.before.x, 0);
      expect(errors.filter(isSpikeError)).toEqual([]);
      await page
        .getByTestId("graph-canvas")
        .screenshot({ path: `/tmp/spike-parity-${mode}.png` });
    });
  }
});

test.describe("webgl spike: mobile viewport", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  for (const mode of ["canvas", "webgl"] as const) {
    test(`${mode} renders and tap-selects on a mobile viewport`, async ({
      page,
    }) => {
      test.setTimeout(120000);
      const errors = await gotoGraph(page, mode);
      const snap = await rendererSnapshot(page);
      await seedVault(page, 60, 120);
      await waitFullGraph(page, 60, 120);
      const tapped = await page.evaluate(() => {
        const cy: any = (window as any).cy;
        cy.fit(undefined, 30);
        const cx = cy.width() / 2;
        const cyh = cy.height() / 2;
        let best: any = cy.nodes()[0];
        let bestD = Infinity;
        cy.nodes().forEach((n: any) => {
          const rp = n.renderedPosition();
          const d = Math.hypot(rp.x - cx, rp.y - cyh);
          if (d < bestD) {
            bestD = d;
            best = n;
          }
        });
        const r = best.renderedPosition();
        const box = document
          .querySelector("[data-testid='graph-canvas']")!
          .getBoundingClientRect();
        return { id: best.id(), x: box.x + r.x, y: box.y + r.y };
      });
      const hitMobile = await page.evaluate(
        ({ x, y }) => {
          const el: any = document.elementFromPoint(x, y);
          return el
            ? `${el.tagName}#${el.id}.${(el.className?.baseVal ?? el.className ?? "").toString().split(" ").slice(0, 4).join(".")}`
            : "none";
        },
        { x: tapped.x, y: tapped.y },
      );
      console.log(
        `SPIKE mobile hit ${mode}: ${JSON.stringify({ tapped, hitMobile })}`,
      );
      await page.touchscreen.tap(tapped.x, tapped.y);
      await page.waitForTimeout(500);
      const selected = await page.evaluate(
        (id: string) => (window as any).cy.getElementById(id).selected(),
        tapped.id,
      );
      console.log(
        `SPIKE mobile webgl: ${JSON.stringify({ mode: snap.mode, selected })}`,
      );
      expect(snap.mode).toBe(mode);
      expect(selected).toBe(true);
      expect(errors.filter(isSpikeError)).toEqual([]);
    });
  }
});

test.describe("webgl spike: canvas vs webgl benchmarks", () => {
  test.setTimeout(600000);

  for (const scale of SCALES) {
    for (const mode of ["canvas", "webgl"] as const) {
      for (const visuals of ["full", "simplified"] as const) {
        // Simplified visuals only at stress scale — labels off, to isolate
        // body/edge raster cost from text raster cost.
        if (visuals === "simplified" && scale.label !== "stress") continue;
        test(`${scale.label} ${scale.nodes}n/${scale.edges}e ${mode} ${visuals}`, async ({
          page,
        }) => {
          const errors = await gotoGraph(page, mode);
          const seedMs = await seedVault(page, scale.nodes, scale.edges);
          const heapBefore = await heapMB(page);
          const enterStart = Date.now();
          await waitFullGraph(page, scale.nodes, scale.edges);
          const enterUsableMs = Date.now() - enterStart;

          if (visuals === "simplified") {
            await page.evaluate(() => {
              const cy: any = (window as any).cy;
              cy.style()
                .append([{ selector: "node", style: { label: "" } }])
                .update();
            });
            await page.waitForTimeout(1000);
          }

          const metrics = await page.evaluate(async () => {
            const cy: any = (window as any).cy;
            const nextFrame = () =>
              new Promise<void>((resolve) =>
                requestAnimationFrame(() => resolve()),
              );
            const center = () => ({ x: cy.width() / 2, y: cy.height() / 2 });

            // Warm-up across LOD tiers so steady-state excludes one-off
            // style recomputes.
            const baseZoom = cy.zoom();
            for (const level of [baseZoom * 0.1, baseZoom * 0.35, baseZoom]) {
              cy.zoom({ level, renderedPosition: center() });
              await nextFrame();
            }
            for (let i = 0; i < 4; i++) {
              cy.panBy({ x: 8, y: -8 });
              await nextFrame();
            }

            const frameTimes: number[] = [];
            for (let i = 0; i < 36; i++) {
              const start = performance.now();
              cy.panBy({
                x: i % 2 === 0 ? 6 : -6,
                y: i % 3 === 0 ? 4 : -4,
              });
              cy.zoom({
                level: cy.zoom() * (i % 2 === 0 ? 1.002 : 0.998),
                renderedPosition: center(),
              });
              await nextFrame();
              if (i >= 6) frameTimes.push(performance.now() - start);
            }
            const sorted = [...frameTimes].sort((a, b) => a - b);
            const total = frameTimes.reduce((s, ms) => s + ms, 0);

            const node = cy.nodes()[3];
            const s0 = performance.now();
            node.select();
            await nextFrame();
            await nextFrame();
            const selectMs = performance.now() - s0;

            return {
              frames: frameTimes.length,
              avgFrameMs: total / frameTimes.length,
              p90FrameMs:
                sorted[
                  Math.min(
                    sorted.length - 1,
                    Math.ceil(sorted.length * 0.9) - 1,
                  )
                ],
              maxFrameMs: Math.max(...frameTimes),
              selectMs,
            };
          });
          const heapAfter = await heapMB(page);

          console.log(
            `SPIKE bench ${JSON.stringify({ scale: scale.label, nodes: scale.nodes, edges: scale.edges, mode, visuals, seedMs: Math.round(seedMs), enterUsableMs, heapBeforeMB: +heapBefore.toFixed(1), heapAfterMB: +heapAfter.toFixed(1), ...metrics })}`,
          );
          expect(errors.filter(isSpikeError)).toEqual([]);
          if (scale.label === "stress" && visuals === "full") {
            await page
              .getByTestId("graph-canvas")
              .screenshot({ path: `/tmp/spike-stress-${mode}.png` });
          }
        });
      }
    }
  }
});
