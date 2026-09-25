import { afterEach, describe, expect, it, vi } from "vitest";
import cytoscape from "cytoscape";
import { NodeHighlight } from "./node-highlight";

function graph() {
  return cytoscape({
    headless: true,
    elements: Array.from({ length: 50 }, (_, i) => ({ data: { id: `n${i}` } })),
  });
}

/** Records the ids each collection method is called on. */
function spyOnCollection(cy: cytoscape.Core, method: "removeStyle" | "stop") {
  const calls: string[][] = [];
  const proto = Object.getPrototypeOf(cy.nodes());
  const original = proto[method];
  vi.spyOn(proto, method).mockImplementation(function (this: any, ...args) {
    calls.push(this.map((ele: any) => ele.id()));
    return original.apply(this, args);
  });
  return calls;
}

afterEach(() => vi.restoreAllMocks());

describe("NodeHighlight", () => {
  it("clears style bypasses from the highlighted node only", () => {
    const cy = graph();
    const removed = spyOnCollection(cy, "removeStyle");
    const highlight = new NodeHighlight();
    highlight.mark("n3");

    highlight.clear(cy);

    // Previously every rendered node: a full style recompute per selection.
    expect(removed).toEqual([["n3"]]);
  });

  it("stops only running animations and the highlighted node", () => {
    const cy = graph();
    const stopped = spyOnCollection(cy, "stop");
    const highlight = new NodeHighlight();
    highlight.mark("n3");

    highlight.clear(cy);

    // Nothing is animating in a headless graph, so only the pulse node.
    expect(stopped.flat()).toEqual(["n3"]);
  });

  it("forgets the node once cleared", () => {
    const cy = graph();
    const removed = spyOnCollection(cy, "removeStyle");
    const highlight = new NodeHighlight();
    highlight.mark("n3");
    highlight.clear(cy);

    highlight.clear(cy);

    expect(removed).toEqual([["n3"]]);
  });

  it("is safe with nothing highlighted or a node that has gone", () => {
    const cy = graph();
    const removed = spyOnCollection(cy, "removeStyle");
    const highlight = new NodeHighlight();
    expect(() => highlight.clear(cy)).not.toThrow();

    highlight.mark("gone");
    expect(() => highlight.clear(cy)).not.toThrow();
    expect(removed).toEqual([]);
  });
});
