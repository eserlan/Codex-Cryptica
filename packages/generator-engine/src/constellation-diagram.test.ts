import { describe, it, expect } from "vitest";
import { buildConstellationDiagram } from "./constellation-diagram";
import type { ConstellationPattern } from "./public-constellation";

describe("buildConstellationDiagram", () => {
  it("scales every star into the fixed viewport", () => {
    const pattern: ConstellationPattern = {
      stars: [
        { x: 0, y: 0 },
        { x: 100, y: 100 },
        { x: 50, y: 50, brightness: "bright" },
      ],
      lines: [],
    };
    const layout = buildConstellationDiagram(pattern);

    expect(layout.nodes).toHaveLength(3);
    for (const node of layout.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x).toBeLessThanOrEqual(layout.width);
      expect(node.y).toBeGreaterThanOrEqual(0);
      expect(node.y).toBeLessThanOrEqual(layout.height);
    }
    // The bright star renders with a larger radius than the unset ones.
    expect(layout.nodes[2].radius).toBeGreaterThan(layout.nodes[0].radius);
  });

  it("carries a star's name and folklore note through to its node", () => {
    const pattern: ConstellationPattern = {
      stars: [{ x: 10, y: 10, name: "The Wick", notes: "Points the way." }],
      lines: [],
    };
    const layout = buildConstellationDiagram(pattern);
    expect(layout.nodes[0].name).toBe("The Wick");
    expect(layout.nodes[0].notes).toBe("Points the way.");
  });

  it("resolves lines to their endpoints' scaled coordinates", () => {
    const pattern: ConstellationPattern = {
      stars: [
        { x: 0, y: 0 },
        { x: 100, y: 100 },
      ],
      lines: [[0, 1]],
    };
    const layout = buildConstellationDiagram(pattern);
    expect(layout.lines).toHaveLength(1);
    expect(layout.lines[0]).toEqual({
      x1: layout.nodes[0].x,
      y1: layout.nodes[0].y,
      x2: layout.nodes[1].x,
      y2: layout.nodes[1].y,
    });
  });

  it("drops a line referencing an out-of-range index", () => {
    const pattern: ConstellationPattern = {
      stars: [
        { x: 0, y: 0 },
        { x: 100, y: 100 },
      ],
      lines: [
        [0, 1],
        [1, 99],
      ],
    };
    const layout = buildConstellationDiagram(pattern);
    expect(layout.lines).toHaveLength(1);
  });

  it("returns an empty layout for an undefined or empty pattern", () => {
    expect(buildConstellationDiagram(undefined).nodes).toEqual([]);
    expect(buildConstellationDiagram({ stars: [], lines: [] }).nodes).toEqual(
      [],
    );
  });
});
