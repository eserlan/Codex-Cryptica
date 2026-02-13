import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";
import * as Comlink from "comlink";
import {
  getTimelineLayout,
  type TimelineLayoutOptions,
} from "./layouts/timeline";

// Register fcose
if (typeof cytoscape !== "undefined") {
  cytoscape.use(fcose);
}

export type LayoutResult = Record<string, { x: number; y: number }>;

export class LayoutEngine {
  /**
   * Run a force-directed layout (fcose) in the background.
   */
  async runFcose(elements: any[], options: any = {}): Promise<LayoutResult> {
    const cy = cytoscape({
      headless: true,
      elements,
      style: [],
    });

    return new Promise<LayoutResult>((resolve, reject) => {
      try {
        const layout = cy.layout({
          name: "fcose",
          ...options,
          stop: () => {
            const positions: LayoutResult = {};
            cy.nodes().forEach((node) => {
              positions[node.id()] = node.position();
            });
            cy.destroy();
            resolve(positions);
          },
        });

        layout.run();
      } catch (error) {
        try {
          cy.destroy();
        } catch {
          // ignore cleanup errors
        }
        reject(error);
      }
    });
  }

  /**
   * Run the custom timeline layout in the background.
   */
  async runTimeline(
    nodes: any[],
    options: TimelineLayoutOptions,
  ): Promise<LayoutResult> {
    // getTimelineLayout already returns LayoutResult and doesn't need cy
    return getTimelineLayout(nodes, options);
  }
}

export function exposeLayoutEngine(engine: LayoutEngine) {
  Comlink.expose(engine);
}
