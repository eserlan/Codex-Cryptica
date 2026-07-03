import { expect, test, type Page } from "@playwright/test";
import { dismissFrontPage, setupVaultPage } from "../test-helpers";

const NODE_COUNT = 1600;
const EDGE_COUNT = 9000;

// Frame-time budgets for continuous pan+zoom on the large graph. Deliberately
// generous for CI hardware variance — the goal is to catch regressions, not to
// gate on a hard fps target. We assert on avg (broad smoothness) and p90 (stable
// tail latency) rather than raw max: max is the single noisiest sample and was
// dominated by a one-off LOD style recompute when zoom first crosses a tier,
// which the warm-up below now amortises out. Max is kept only as a catastrophe
// guard for true multi-frame freezes.
const AVG_FRAME_BUDGET_MS = 200;
const P90_FRAME_BUDGET_MS = 350;
const MAX_FRAME_BUDGET_MS = 1500;

type LargeGraphMetrics = {
  seedMs: number;
  readyMs: number;
  vaultNodeCount: number;
  fullEdgeCount: number;
  graphNodeCount: number;
  graphEdgeCount: number;
  cyNodeCount: number;
  cyEdgeCount: number;
  maxViewportFrameMs: number;
  avgViewportFrameMs: number;
  p90ViewportFrameMs: number;
};

async function seedLargeVault(page: Page) {
  return page.evaluate(
    ({ nodeCount, edgeCount }) => {
      const start = performance.now();
      const vault = (window as any).vault;
      if (!vault?.entityStore) {
        throw new Error("Vault entity store is not available");
      }

      const entities: Record<string, any> = {};
      for (let i = 0; i < nodeCount; i++) {
        entities[`large-node-${i}`] = {
          id: `large-node-${i}`,
          type: i % 7 === 0 ? "location" : "npc",
          title: `Large Node ${i}`,
          tags: [],
          labels: i % 97 === 0 ? ["Important"] : [],
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

        entities[`large-node-${sourceIndex}`].connections.push({
          target: `large-node-${targetIndex}`,
          type: "related",
          label: "Related",
          strength: 1,
        });
        createdEdges++;
      }

      vault.status = "loading";
      vault.selectedEntityId = "large-node-42";
      vault.entityStore.entities = entities;
      vault.entityStore.initializeInboundConnections();
      vault.entityStore.rebuildIndexes();
      vault.status = "idle";
      vault.isInitialized = true;

      return performance.now() - start;
    },
    { nodeCount: NODE_COUNT, edgeCount: EDGE_COUNT },
  );
}

test.describe("large graph performance", () => {
  test("large vaults render the full graph with performance styling", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await setupVaultPage(page);

    const seedMs = await seedLargeVault(page);
    await dismissFrontPage(page);
    await page.keyboard.press("Escape");

    // Large vaults default to the culled focus view; this test exercises the
    // heavy full-graph stress path, so opt into rendering every element.
    await page.evaluate(() => {
      const graph = (window as any).graph;
      if (graph) graph.showFullGraph = true;
    });

    await page.waitForTimeout(1000);

    const initialReadiness = await page.evaluate(() => {
      const graph = (window as any).graph;
      const cy = (window as any).cy;
      return {
        isLargeGraph: graph?.isLargeGraph,
        stats: graph?.stats,
        graphElements: graph?.elements?.length,
        graphNodes: graph?.elements?.filter(
          (element: any) => element.group === "nodes",
        ).length,
        graphEdges: graph?.elements?.filter(
          (element: any) => element.group === "edges",
        ).length,
        cyNodes: cy?.nodes?.().length,
        cyEdges: cy?.edges?.().length,
        isLayoutRunning: (window as any).graphViewController?.isLayoutRunning,
      };
    });
    console.log(
      `Large graph initial readiness: ${JSON.stringify(initialReadiness)}`,
    );

    const readyStart = Date.now();
    try {
      await page.waitForFunction(
        ({ nodeCount, edgeCount }) => {
          const graph = (window as any).graph;
          const cy = (window as any).cy;
          if (!graph?.isLargeGraph || !cy) return false;

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
        { nodeCount: NODE_COUNT, edgeCount: EDGE_COUNT },
        { timeout: 60000 },
      );
    } catch (error) {
      const failureReadiness = await page.evaluate(() => {
        const graph = (window as any).graph;
        const cy = (window as any).cy;
        return {
          isLargeGraph: graph?.isLargeGraph,
          stats: graph?.stats,
          graphElements: graph?.elements?.length,
          graphNodes: graph?.elements?.filter(
            (element: any) => element.group === "nodes",
          ).length,
          graphEdges: graph?.elements?.filter(
            (element: any) => element.group === "edges",
          ).length,
          cyNodes: cy?.nodes?.().length,
          cyEdges: cy?.edges?.().length,
        };
      });
      throw new Error(
        `Large graph never reached full Cytoscape state: ${JSON.stringify(failureReadiness)}\n${String(error)}`,
        { cause: error },
      );
    }
    const readyMs = Date.now() - readyStart;

    const readiness = await page.evaluate(() => {
      const graph = (window as any).graph;
      const cy = (window as any).cy;
      return {
        isLargeGraph: graph?.isLargeGraph,
        stats: graph?.stats,
        graphElements: graph?.elements?.length,
        cyNodes: cy?.nodes?.().length,
        cyEdges: cy?.edges?.().length,
      };
    });
    console.log(`Large graph readiness: ${JSON.stringify(readiness)}`);

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
      { timeout: 60000 },
    );

    const metrics = await page.evaluate(
      async ({ seedMs, readyMs }) => {
        const graph = (window as any).graph;
        const vault = (window as any).vault;
        const cy = (window as any).cy;
        if (!graph || !vault || !cy) {
          throw new Error("Graph, vault, or Cytoscape is not available");
        }

        const graphNodeCount = graph.elements.filter(
          (element: any) => element.group === "nodes",
        ).length;
        const graphEdgeCount = graph.elements.filter(
          (element: any) => element.group === "edges",
        ).length;
        const fullEdgeCount = vault.allEntities.reduce(
          (sum: number, entity: any) => sum + (entity.connections?.length ?? 0),
          0,
        );

        const nextFrame = () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => resolve()),
          );

        const center = () => ({ x: cy.width() / 2, y: cy.height() / 2 });

        // Warm up: sweep zoom across every LOD tier (low/medium/high) before
        // measuring, so the one-off style recompute when crossing a tier
        // boundary happens here rather than mid-measurement. The measurement
        // loop below then reflects steady-state continuous interaction.
        const baseZoom = cy.zoom();
        for (const level of [baseZoom * 0.25, baseZoom * 4, baseZoom]) {
          cy.zoom({ level, renderedPosition: center() });
          await nextFrame();
        }
        // Extra JIT/raster settling frames.
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
          if (i >= 6) {
            frameTimes.push(performance.now() - start);
          }
        }

        const totalFrameTime = frameTimes.reduce((sum, ms) => sum + ms, 0);
        const sortedFrames = [...frameTimes].sort((a, b) => a - b);
        const p90Index = Math.min(
          sortedFrames.length - 1,
          Math.floor(sortedFrames.length * 0.9),
        );

        return {
          seedMs,
          readyMs,
          vaultNodeCount: vault.allEntities.length,
          fullEdgeCount,
          graphNodeCount,
          graphEdgeCount,
          cyNodeCount: cy.nodes().length,
          cyEdgeCount: cy.edges().length,
          maxViewportFrameMs: Math.max(...frameTimes),
          avgViewportFrameMs: totalFrameTime / frameTimes.length,
          p90ViewportFrameMs: sortedFrames[p90Index],
        } satisfies LargeGraphMetrics;
      },
      { seedMs, readyMs },
    );

    console.log(`Large graph metrics: ${JSON.stringify(metrics, null, 2)}`);

    expect(metrics.vaultNodeCount).toBe(NODE_COUNT);
    expect(metrics.fullEdgeCount).toBe(EDGE_COUNT);
    expect(metrics.graphNodeCount).toBe(NODE_COUNT);
    expect(metrics.graphEdgeCount).toBe(EDGE_COUNT);
    expect(metrics.cyNodeCount).toBe(metrics.graphNodeCount);
    expect(metrics.cyEdgeCount).toBe(metrics.graphEdgeCount);

    // Smoothness regression guards. avg = broad signal, p90 = stable tail
    // latency (ignores the single worst frame), max = catastrophe guard for
    // true multi-frame freezes. See the budget constants for rationale.
    expect(metrics.avgViewportFrameMs).toBeLessThan(AVG_FRAME_BUDGET_MS);
    expect(metrics.p90ViewportFrameMs).toBeLessThan(P90_FRAME_BUDGET_MS);
    expect(metrics.maxViewportFrameMs).toBeLessThan(MAX_FRAME_BUDGET_MS);
  });

  test("large vaults default to a culled focus view around the selection", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await setupVaultPage(page);

    // Seed sets selectedEntityId = "large-node-42"; do NOT opt into the full
    // graph — the default for a large vault should be the focus neighborhood.
    await seedLargeVault(page);
    await dismissFrontPage(page);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(1000);

    // Pin the focal node explicitly (the Escape/load flow clears the seeded
    // selection, which would otherwise fall back to the hub).
    await page.evaluate(() => {
      (window as any).vault.selectedEntityId = "large-node-42";
    });

    await page.waitForFunction(
      ({ nodeCount }) => {
        const graph = (window as any).graph;
        const cy = (window as any).cy;
        if (!graph?.isLargeGraph || !graph.focusViewActive || !cy) return false;
        const renderedNodes = graph.elements.filter(
          (element: any) => element.group === "nodes",
        ).length;
        const includesFocal = graph.elements.some(
          (element: any) => element.data?.id === "large-node-42",
        );
        return (
          includesFocal &&
          renderedNodes > 0 &&
          renderedNodes < nodeCount &&
          cy.nodes().length === renderedNodes
        );
      },
      { nodeCount: NODE_COUNT },
      { timeout: 60000 },
    );

    const focus = await page.evaluate(() => {
      const graph = (window as any).graph;
      const cy = (window as any).cy;
      const renderedNodes = graph.elements.filter(
        (element: any) => element.group === "nodes",
      ).length;
      return {
        focusViewActive: graph.focusViewActive,
        focusDepth: graph.focusDepth,
        vaultNodes: graph.fullGraphSize.nodeCount,
        renderedNodes,
        renderedNodeIncludesSelection: graph.elements.some(
          (element: any) => element.data?.id === "large-node-42",
        ),
        cyNodes: cy.nodes().length,
      };
    });

    console.log(`Focus view: ${JSON.stringify(focus)}`);

    expect(focus.focusViewActive).toBe(true);
    expect(focus.vaultNodes).toBe(NODE_COUNT);
    // The focus neighborhood must be a small fraction of the full vault and
    // must contain the selected node it is centered on.
    expect(focus.renderedNodes).toBeGreaterThan(0);
    expect(focus.renderedNodes).toBeLessThan(NODE_COUNT);
    expect(focus.renderedNodeIncludesSelection).toBe(true);
    expect(focus.cyNodes).toBe(focus.renderedNodes);

    await page.waitForTimeout(1000);

    // Increasing the focus depth must reveal more of the neighborhood through
    // the real cull → sync → render pipeline. We drive focusDepth directly here:
    // the zoom→depth ratchet is a timing heuristic (covered by resolveFocusDepth
    // unit tests), so gating CI on a live zoom gesture would be flaky.
    const reveal = await page.evaluate(async () => {
      const graph = (window as any).graph;
      const cy = (window as any).cy;
      const nodesAtDepth1 = cy.nodes().length;

      graph.focusDepth = graph.focusDepth + 1;

      const deadline = performance.now() + 8000;
      while (performance.now() < deadline) {
        if (cy.nodes().length > nodesAtDepth1) break;
        await new Promise((r) => setTimeout(r, 50));
      }
      return {
        depthAfter: graph.focusDepth,
        nodesBefore: nodesAtDepth1,
        nodesAfter: cy.nodes().length,
      };
    });

    console.log(`Focus depth reveal: ${JSON.stringify(reveal)}`);

    expect(reveal.depthAfter).toBe(focus.focusDepth + 1);
    expect(reveal.nodesAfter).toBeGreaterThan(reveal.nodesBefore);
  });
});
