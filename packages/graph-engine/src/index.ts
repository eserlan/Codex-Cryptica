import type { Core } from "cytoscape";

export * from "./transformer";
export * from "./layouts/timeline";
export * from "./layouts/orbit";
export * from "./renderer/overlays";
export * from "./defaults";
export * from "./LayoutManager";
export * from "./GraphStyles";
export * from "./events/useGraphEvents";
export * from "./sync/useGraphSync";
export * from "./sync/ImageManager";

export interface GraphOptions {
  container?: HTMLElement;
  elements?: any[];
  style?: any[];
  headless?: boolean;
}

export const LARGE_GRAPH_NODE_THRESHOLD = 700;
export const LARGE_GRAPH_EDGE_THRESHOLD = 1800;

/** Single source of truth for the large-graph perf-mode threshold. */
export const isLargeGraphSize = (nodeCount: number, edgeCount: number) =>
  nodeCount > LARGE_GRAPH_NODE_THRESHOLD ||
  edgeCount > LARGE_GRAPH_EDGE_THRESHOLD;

/**
 * Re-applies the large-graph viewport render hints to a *live* cy instance.
 *
 * `hideEdgesOnViewport` and `motionBlur` are renderer-level flags that
 * cytoscape only copies into the renderer once, at construction. On the normal
 * async-load path the graph is still empty when `initGraph` runs (the vault's
 * active id is set before its entities stream in), so those flags init to
 * `false` and never turn on as the graph grows large. The per-frame render path
 * reads the renderer properties directly, so patching them here makes the
 * optimisations actually engage without recreating the instance.
 *
 * No-op for headless graphs (no canvas renderer to tune). Returns whether the
 * hints were applied, for testability.
 */
export const applyLargeGraphRenderHints = (
  cy: Core,
  isLarge: boolean,
): boolean => {
  const withRenderer = cy as unknown as {
    renderer?: () => Record<string, unknown> | null | undefined;
    container?: () => unknown;
  };
  // Headless graphs use a null renderer that never paints — nothing to tune.
  if (withRenderer.container?.() == null) return false;
  const renderer = withRenderer.renderer?.();
  if (!renderer) return false;
  renderer.hideEdgesOnViewport = isLarge;
  renderer.motionBlurEnabled = isLarge;
  renderer.motionBlur = isLarge;
  return true;
};

// Cache the imported modules so we don't re-register plugins
let corePromise: Promise<any> | null = null;

export const initGraph = async (options: GraphOptions) => {
  if (!corePromise) {
    corePromise = (async () => {
      try {
        const [cytoscapeModule, fcoseModule] = await Promise.all([
          import("cytoscape"),
          import("cytoscape-fcose"),
        ]);

        const cytoscape = cytoscapeModule.default;
        const fcose = fcoseModule.default;

        cytoscape.use(fcose);
        return cytoscape;
      } catch (err) {
        corePromise = null;
        throw err;
      }
    })();
  }

  const cytoscape = await corePromise;

  const nodeCount = (options.elements || []).filter(
    (el) => el.group === "nodes" || (!el.group && el.data && !el.data.source),
  ).length;
  const edgeCount = (options.elements || []).filter(
    (el) => el.group === "edges" || (!el.group && el.data?.source),
  ).length;
  const isLargeGraph = isLargeGraphSize(nodeCount, edgeCount);

  return (cytoscape as unknown as (opt: any) => Core)({
    container: options.container,
    headless: options.headless,
    elements: options.elements || [],
    style: options.style || [
      {
        selector: "node",
        style: {
          "background-color": "#666",
          label: (node: any) =>
            node.data("isPast") ? `${node.data("label")}*` : node.data("label"),
        },
      },
      {
        selector: "edge",
        style: {
          width: 3,
          "line-color": "#ccc",
          "target-arrow-color": "#ccc",
          "target-arrow-shape": "triangle",
          "curve-style": "bezier",
        },
      },
    ],
    layout: {
      name: "preset",
    },
    // Rendering Optimizations
    hideLabelsOnViewport: true,
    hideEdgesOnViewport: isLargeGraph,
    textureOnViewport: true,
    motionBlur: isLargeGraph,
    motionBlurOpacity: 0.08,
    // Cap DPR at 1.5 — on 2× retina "auto" rasterises at 4× pixel area,
    // which dominates GPU cost for large graphs. 1.5 is imperceptible to
    // users while halving rasterisation work on HiDPI displays.
    pixelRatio:
      typeof window !== "undefined"
        ? Math.min(window.devicePixelRatio || 1, 1.5)
        : 1,
    minZoom: Math.max(0.01, 0.3 - nodeCount * 0.0005),
    maxZoom: 9.0,
    wheelSensitivity: 1.0,
  });
};
