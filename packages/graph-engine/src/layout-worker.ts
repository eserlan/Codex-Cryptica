import * as Comlink from "comlink";
import {
  getTimelineLayout,
  type TimelineLayoutOptions,
} from "./layouts/timeline";

export type LayoutResult = Record<string, { x: number; y: number }>;

let workerCyPromise: Promise<any> | null = null;

export class LayoutEngine {
  /**
   * Run a force-directed layout (fcose) in the background.
   */
  async runFcose(elements: any[], options: any = {}): Promise<LayoutResult> {
    if (!workerCyPromise) {
      workerCyPromise = (async () => {
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
          workerCyPromise = null;
          throw err;
        }
      })();
    }

    const cytoscape = await workerCyPromise;

    const cy = cytoscape({
      headless: true,
      elements,
      style: [
        {
          selector: "node",
          style: {
            width: "data(width)",
            height: "data(height)",
          },
        },
        // Fallback for nodes without measured dimensions
        {
          selector: "node[!width]",
          style: {
            width: 32,
          },
        },
        {
          selector: "node[!height]",
          style: {
            height: 32,
          },
        },
      ],
    });

    // Explicitly set positions from element data to ensure Cytoscape applies them correctly
    // especially in headless mode where initialization might be sensitive to element order.
    // ADDITION: Add a tiny bit of random jitter if nodes are at the same position (e.g. 0,0)
    // to prevent fcose from collapsing into a diagonal line when randomize is false.
    cy.nodes().forEach((node: any) => {
      const el = elements.find(
        (e) => e.group === "nodes" && e.data.id === node.id(),
      );
      if (el && el.position) {
        const jitter = () => (Math.random() - 0.5) * 0.1; // Tiny jitter
        node.position({
          x: el.position.x + jitter(),
          y: el.position.y + jitter(),
        });
      }
    });

    return new Promise<LayoutResult>((resolve, reject) => {
      try {
        const layout = cy.layout({
          name: "fcose",
          ...options,
          stop: () => {
            const positions: LayoutResult = {};
            cy.nodes().forEach((node: any) => {
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
