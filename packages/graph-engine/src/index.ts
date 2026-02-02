import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";

cytoscape.use(fcose);

export * from "./transformer";
export * from "./layouts/timeline";
export * from "./layouts/orbit";
export * from "./renderer/overlays";
export * from "./defaults";
import { DEFAULT_LAYOUT_OPTIONS } from "./defaults";

export interface GraphOptions {
  container?: HTMLElement;
  elements?: any[];
  style?: any[];
  headless?: boolean;
}

export const initGraph = (options: GraphOptions) => {
  return cytoscape({
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
      ...DEFAULT_LAYOUT_OPTIONS,      
    },
  });
};
