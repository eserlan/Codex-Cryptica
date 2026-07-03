import { describe, it, expect } from "vitest";
import type { Core } from "cytoscape";
import {
  initGraph,
  applyLargeGraphRenderHints,
  isLargeGraphSize,
} from "./index";

describe("initGraph adaptive zoom", () => {
  it("should calculate higher minZoom for small graphs", async () => {
    const cy = await initGraph({
      headless: true,
      elements: [
        { group: "nodes", data: { id: "1" } },
        { group: "nodes", data: { id: "2" } },
      ],
    });

    // nodeCount = 2
    // minZoom = max(0.05, 0.3 - 2 * 0.0005) = 0.299
    expect(cy.minZoom()).toBeCloseTo(0.299, 3);
  });

  it("should calculate lower minZoom for large graphs", async () => {
    const manyNodes = Array.from({ length: 1000 }, (_, i) => ({
      group: "nodes",
      data: { id: i.toString() },
    }));

    const cy = await initGraph({
      headless: true,
      elements: manyNodes as any,
    });

    // nodeCount = 1000
    // minZoom = max(0.01, 0.3 - 1000 * 0.0005) = max(0.01, -0.2) = 0.01
    expect(cy.minZoom()).toBe(0.01);
  });

  it("should use a constant maxZoom of 9.0", async () => {
    const manyNodes = Array.from({ length: 1000 }, (_, i) => ({
      group: "nodes",
      data: { id: i.toString() },
    }));

    const cy = await initGraph({
      headless: true,
      elements: manyNodes as any,
    });

    // maxZoom is now constant 9.0
    expect(cy.maxZoom()).toBe(9.0);
  });

  it("should configure wheelSensitivity to 1.0 for smoother scrolling", async () => {
    const cy = await initGraph({
      headless: true,
      elements: [],
    });

    expect((cy as any)._private?.options?.wheelSensitivity).toBe(1.0);
  });

  it("should enable large-graph viewport render shortcuts", async () => {
    const manyEdges = Array.from({ length: 1801 }, (_, i) => ({
      group: "edges",
      data: {
        id: `edge-${i}`,
        source: "source",
        target: "target",
      },
    }));

    const cy = await initGraph({
      headless: true,
      elements: [
        { group: "nodes", data: { id: "source" } },
        { group: "nodes", data: { id: "target" } },
        ...manyEdges,
      ] as any,
    });

    expect((cy as any)._private?.options?.hideEdgesOnViewport).toBe(true);
    expect((cy as any)._private?.options?.motionBlur).toBe(true);
  });
});

describe("isLargeGraphSize", () => {
  it("flags graphs above the node threshold", () => {
    expect(isLargeGraphSize(701, 0)).toBe(true);
    expect(isLargeGraphSize(700, 0)).toBe(false);
  });

  it("flags graphs above the edge threshold", () => {
    expect(isLargeGraphSize(0, 1801)).toBe(true);
    expect(isLargeGraphSize(0, 1800)).toBe(false);
  });
});

describe("applyLargeGraphRenderHints", () => {
  const makeCy = (overrides: Record<string, unknown> = {}) => {
    const renderer = {
      hideEdgesOnViewport: false,
      motionBlurEnabled: false,
      motionBlur: false,
    };
    const cy = {
      container: () => ({}) as unknown,
      renderer: () => renderer,
      ...overrides,
    } as unknown as Core;
    return { cy, renderer };
  };

  it("patches the live renderer flags when the graph is large", () => {
    const { cy, renderer } = makeCy();

    const applied = applyLargeGraphRenderHints(cy, true);

    expect(applied).toBe(true);
    expect(renderer.hideEdgesOnViewport).toBe(true);
    expect(renderer.motionBlurEnabled).toBe(true);
    expect(renderer.motionBlur).toBe(true);
  });

  it("clears the flags when the graph is no longer large", () => {
    const { cy, renderer } = makeCy();
    renderer.hideEdgesOnViewport = true;
    renderer.motionBlurEnabled = true;
    renderer.motionBlur = true;

    applyLargeGraphRenderHints(cy, false);

    expect(renderer.hideEdgesOnViewport).toBe(false);
    expect(renderer.motionBlurEnabled).toBe(false);
    expect(renderer.motionBlur).toBe(false);
  });

  it("is a no-op for headless graphs without a container", () => {
    const { cy, renderer } = makeCy({ container: () => null });

    const applied = applyLargeGraphRenderHints(cy, true);

    expect(applied).toBe(false);
    expect(renderer.hideEdgesOnViewport).toBe(false);
  });
});
