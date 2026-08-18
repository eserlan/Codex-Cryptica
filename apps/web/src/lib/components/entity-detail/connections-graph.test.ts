import { describe, expect, it } from "vitest";
import {
  EDGE_LABEL_FRACTION,
  MAX_CONNECTION_NODES,
  edgeLabelPosition,
  layoutConnectionGraph,
} from "./connections-graph";

describe("layoutConnectionGraph", () => {
  it("returns nothing for an unconnected entity", () => {
    expect(layoutConnectionGraph(0)).toEqual([]);
  });

  it("puts the first neighbour straight above the centre", () => {
    const [first] = layoutConnectionGraph(4);

    expect(first.x).toBe(50);
    expect(first.y).toBeLessThan(50);
    expect(first.ring).toBe(0);
  });

  it("keeps a small set on a single ring", () => {
    const positions = layoutConnectionGraph(9);

    expect(positions).toHaveLength(9);
    expect(positions.every((p) => p.ring === 0)).toBe(true);
  });

  it("splits larger sets across two interleaved rings", () => {
    const positions = layoutConnectionGraph(20);

    expect(positions).toHaveLength(20);
    const inner = positions.filter((p) => p.ring === 1);
    const outer = positions.filter((p) => p.ring === 2);
    expect(inner).toHaveLength(6);
    expect(outer).toHaveLength(14);
    // Outer nodes sit further from the centre than inner ones.
    const spread = (p: { x: number; y: number }) =>
      Math.hypot(p.x - 50, p.y - 50);
    expect(Math.min(...outer.map(spread))).toBeGreaterThan(
      Math.max(...inner.map(spread)),
    );
  });

  it("caps the node count and keeps every node inside the box", () => {
    const positions = layoutConnectionGraph(200);

    expect(positions).toHaveLength(MAX_CONNECTION_NODES);
    for (const p of positions) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(100);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(100);
    }
  });
});

describe("edgeLabelPosition", () => {
  it("defaults to the shared edge-label fraction", () => {
    expect(edgeLabelPosition({ x: 90, y: 30, ring: 0 })).toEqual({
      x: 50 + 40 * EDGE_LABEL_FRACTION,
      y: 50 - 20 * EDGE_LABEL_FRACTION,
    });
  });

  it("sits between the centre and the node", () => {
    expect(edgeLabelPosition({ x: 90, y: 50, ring: 0 }, 0.5)).toEqual({
      x: 70,
      y: 50,
    });
  });
});
