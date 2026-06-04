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
    textureOnViewport: true,
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
