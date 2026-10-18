import { describe, expect, it } from "vitest";
import { createLayoutGraph } from "./layout.worker";

describe("createLayoutGraph", () => {
  const node = (id: string, size: number) => ({
    data: { id, _w: size, _h: size },
    position: { x: 0, y: 0 },
    actualW: size,
    actualH: size,
  });

  it("gives each node its layout size, so repulsion acts on real extents", () => {
    const cy = createLayoutGraph(
      [node("a", 82), node("b", 40)],
      [{ data: { id: "ab", source: "a", target: "b" } }],
    );
    expect(cy.$id("a").width()).toBe(82);
    expect(cy.$id("b").height()).toBe(40);
    cy.destroy();
  });

  it("builds an empty graph without failing (negative)", () => {
    const cy = createLayoutGraph([], []);
    expect(cy.nodes().length).toBe(0);
    cy.destroy();
  });
});
