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
          console.error("[LayoutWorker] Failed to load Cytoscape/fcose:", err);
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
            // If images are off, use standard 32x32.
            // If images are on, use data(width/height) with fallback to 32.
            width: options.showImages ? "data(width)" : 32,
            height: options.showImages ? "data(height)" : 32,
            "min-width": 32,
            "min-height": 32,
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
    const nodeMap = new Map<string, any>();
    elements.forEach((el) => {
      if (el.group === "nodes") {
        nodeMap.set(el.data.id, el);
      }
    });

    cy.nodes().forEach((node: any) => {
      const el = nodeMap.get(node.id());
      if (el && el.position) {
        // Add a tiny bit of jitter if randomize is false to prevent numerical collapse
        // but only if the position is actually present.
        const jitter = options.randomize ? 0 : (Math.random() - 0.5) * 0.1;
        const pos = {
          x: Number(el.position.x) + jitter,
          y: Number(el.position.y) + jitter,
        };

        if (isNaN(pos.x) || isNaN(pos.y)) {
          console.warn(
            `[LayoutWorker] Invalid position for node ${node.id()}:`,
            el.position,
          );
        } else {
          node.position(pos);
        }
      }
    });

    return new Promise<LayoutResult>((resolve, reject) => {
      try {
        const layout = cy.layout({
          name: "fcose",
          ...options,
          // Explicitly force dimension awareness
          nodeDimensionsIncludeLabels: true,
          uniformNodeDimensions: false,
          stop: () => {
            const positions: LayoutResult = {};

            cy.nodes().forEach((node: any) => {
              const pos = node.position();
              positions[node.id()] = { x: pos.x, y: pos.y };
            });

            cy.destroy();
            resolve(positions);
          },
        });

        layout.run();
      } catch (error) {
        console.error("[LayoutWorker] fcose layout failed:", error);
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
