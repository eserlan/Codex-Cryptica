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

  return (cytoscape as any)({
    container: options.container,
    headless: options.headless,
    elements: options.elements || [],
    style: options.style || [
      {
        selector: "node",
        style: {
          "background-color": "#666",
          label: "data(label)", // Updated to use label
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
    pixelRatio: "auto",
    wheelSensitivity: 0.1,
    minZoom: 0.02,
    maxZoom: 1.5,
  });
};
