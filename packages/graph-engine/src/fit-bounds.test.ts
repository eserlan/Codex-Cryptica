import { describe, expect, it } from "vitest";
import cytoscape from "cytoscape";
import { nodeFitBounds } from "./fit-bounds";

describe("nodeFitBounds", () => {
  it("covers every node's own box", () => {
    const cy = cytoscape({
      headless: true,
      styleEnabled: true,
      layout: { name: "preset" },
      style: [
        {
          selector: "node",
          style: { width: 20, height: 20, label: "data(label)" },
        },
      ],
      elements: [
        {
          data: { id: "a", label: "A very long label ".repeat(10) },
          position: { x: 0, y: 0 },
        },
        { data: { id: "b" }, position: { x: 100, y: 50 } },
        { data: { id: "ab", source: "a", target: "b" } },
      ],
    });
    const bb = nodeFitBounds(cy);
    // Node boxes: 20px plus a 1px border either side.
    expect(bb.x1).toBeCloseTo(-10, -0.5);
    expect(bb.x2).toBeCloseTo(110, -0.5);
    expect(bb.y2).toBeCloseTo(60, -0.5);
    cy.destroy();
  });

  it("falls back to fitting all elements when no node is displayed (negative)", () => {
    const cy = cytoscape({ headless: true, styleEnabled: true, elements: [] });
    const target = nodeFitBounds(cy);
    expect(typeof target.boundingBox).toBe("function");
    expect(target.length).toBe(0);
    cy.destroy();
  });
});
