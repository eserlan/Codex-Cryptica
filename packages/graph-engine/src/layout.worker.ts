/// <reference lib="webworker" />

import Cytoscape from "cytoscape";
import type { Core } from "cytoscape";
import fcose from "cytoscape-fcose";

Cytoscape.use(fcose);

interface SerializedLayoutNode {
  data: { id: string; _w: number; _h: number; [key: string]: unknown };
  position: { x: number; y: number };
  actualW: number;
  actualH: number;
}

interface SerializedLayoutEdge {
  data: { id: string; source: string; target: string; [key: string]: unknown };
}

interface WorkerRequest {
  jobId: number;
  nodes: SerializedLayoutNode[];
  edges: SerializedLayoutEdge[];
  options: Record<string, any>;
}

function serializeError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function getDegreeAwareLayoutOptions(options: Record<string, any>) {
  const baseRepulsion = Number(options.nodeRepulsion) || 250000;
  const baseEdgeLength = Number(options.idealEdgeLength) || 180;

  return {
    ...options,
    nodeRepulsion: (node: any) => {
      const degree = Number(node.data("_degree")) || 0;
      // Hubs repel much harder so they carve out space between clusters
      return baseRepulsion * (1 + Math.min(4.0, Math.sqrt(degree) * 0.55));
    },
    idealEdgeLength: (edge: any) => {
      const sourceDegree = Number(edge.source().data("_degree")) || 0;
      const targetDegree = Number(edge.target().data("_degree")) || 0;
      const maxDegree = Math.max(sourceDegree, targetDegree);
      const minDegree = Math.min(sourceDegree, targetDegree);

      // Hub↔hub: very long edges push clusters apart
      if (minDegree >= 5) return baseEdgeLength * 3.5;
      // Hub↔leaf: shorter to keep leaf near its hub
      if (maxDegree >= 5) return baseEdgeLength * 0.8;
      return baseEdgeLength;
    },
  };
}

function removeOverlaps(
  cy: Core,
  actualRadii: Float64Array,
  padding = 18,
  maxIter = 32,
) {
  const nodes = cy.nodes();
  const n = nodes.length;
  if (n < 2) return;

  const radii = actualRadii;
  let maxRadius = 0;
  for (let i = 0; i < n; i++) {
    if (radii[i] > maxRadius) maxRadius = radii[i];
  }
  const cellSize = 2 * maxRadius + padding;

  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const p = nodes[i].position();
    xs[i] = p.x;
    ys[i] = p.y;
  }

  // Numeric grid keys avoid string allocation on every node per iteration.
  // Grid coords stay within ±(2400/cellSize) ≈ ±30, so gx*10000+gy is
  // unique (|gy| < 10000) and fits comfortably in a safe integer.
  const packKey = (gx: number, gy: number) => gx * 10000 + gy;

  for (let iter = 0; iter < maxIter; iter++) {
    const grid = new Map<number, number[]>();
    for (let i = 0; i < n; i++) {
      const key = packKey(
        Math.floor(xs[i] / cellSize),
        Math.floor(ys[i] / cellSize),
      );
      let cell = grid.get(key);
      if (!cell) {
        cell = [];
        grid.set(key, cell);
      }
      cell.push(i);
    }

    let anyOverlap = false;
    for (let i = 0; i < n; i++) {
      const gcx = Math.floor(xs[i] / cellSize);
      const gcy = Math.floor(ys[i] / cellSize);
      const r1 = radii[i];
      for (let ddx = -1; ddx <= 1; ddx++) {
        for (let ddy = -1; ddy <= 1; ddy++) {
          const cell = grid.get(packKey(gcx + ddx, gcy + ddy));
          if (!cell) continue;
          for (const j of cell) {
            if (j <= i) continue;
            const dx = xs[j] - xs[i];
            const dy = ys[j] - ys[i];
            const minDist = r1 + radii[j] + padding;
            const dist2 = dx * dx + dy * dy;
            if (dist2 >= minDist * minDist) continue;
            anyOverlap = true;
            const dist = Math.sqrt(dist2);
            const push = (minDist - dist) / 2;
            if (dist < 0.001) {
              xs[i] -= push;
              xs[j] += push;
            } else {
              const nx = dx / dist;
              const ny = dy / dist;
              xs[i] -= nx * push;
              ys[i] -= ny * push;
              xs[j] += nx * push;
              ys[j] += ny * push;
            }
          }
        }
      }
    }
    if (!anyOverlap) break;
  }

  cy.batch(() => {
    for (let i = 0; i < n; i++) {
      nodes[i].position({ x: xs[i], y: ys[i] });
    }
  });
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { jobId, nodes, edges, options } = event.data;
  let cy: Core | null = null;

  const fail = (error: unknown) => {
    cy?.destroy();
    self.postMessage({
      jobId,
      positions: null,
      error: serializeError(error),
    });
  };

  try {
    // Build actual radii for removeOverlaps (layout uses uniform _w/_h,
    // but collision resolution needs real sizes)
    const actualRadii = new Float64Array(nodes.length);
    for (let i = 0; i < nodes.length; i++) {
      actualRadii[i] = Math.max(nodes[i].actualW, nodes[i].actualH) / 2;
    }

    cy = Cytoscape({
      headless: true,
      elements: {
        nodes: nodes.map((n) => ({
          data: n.data,
          position: n.position,
        })),
        edges: edges.map((e) => ({ data: e.data })),
      },
      style: [
        { selector: "node", style: { width: "data(_w)", height: "data(_h)" } },
      ],
    });

    const layout = cy.layout(getDegreeAwareLayoutOptions(options) as any);

    layout.one("layoutstop", () => {
      try {
        removeOverlaps(cy!, actualRadii);

        const positions: Record<
          string,
          { metadata: { coordinates: { x: number; y: number } } }
        > = {};
        cy!.nodes().forEach((node) => {
          const pos = node.position();
          positions[node.id()] = {
            metadata: { coordinates: { x: pos.x, y: pos.y } },
          };
        });

        cy!.destroy();
        cy = null;

        self.postMessage({ jobId, positions });
      } catch (error) {
        fail(error);
      }
    });

    layout.run();
  } catch (error) {
    fail(error);
  }
};
