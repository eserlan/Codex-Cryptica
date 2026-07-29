import { describe, expect, it } from "vitest";
import { calculateGraphLevels } from "./graph-flow-layout";

describe("calculateGraphLevels", () => {
  const nodes = ["start", "left", "right", "end"].map((id) => ({ id }));

  it("places connected branches into shared graph-depth levels", () => {
    const levels = calculateGraphLevels({
      nodes,
      edges: [
        { source: "start", target: "left" },
        { source: "start", target: "right" },
        { source: "left", target: "end" },
      ],
      isRoot: (node) => node.id === "start",
    });

    expect(levels.map((level) => level.map((node) => node.id))).toEqual([
      ["start"],
      ["left", "right"],
      ["end"],
    ]);
  });

  it("supports undirected traversal while excluding shortcut edges", () => {
    const levels = calculateGraphLevels({
      nodes,
      edges: [
        { source: "left", target: "start", kind: "standard" },
        { source: "left", target: "end", kind: "standard" },
        { source: "start", target: "right", kind: "hidden" },
      ],
      isRoot: (node) => node.id === "start",
      direction: "undirected",
      includeEdge: (edge) => edge.kind !== "hidden",
      disconnectedLevel: () => 3,
    });

    expect(levels.map((level) => level.map((node) => node.id))).toEqual([
      ["start"],
      ["left"],
      ["end"],
      ["right"],
    ]);
  });

  it("terminates safely when the graph contains a cycle", () => {
    const levels = calculateGraphLevels({
      nodes: nodes.slice(0, 3),
      edges: [
        { source: "start", target: "left" },
        { source: "left", target: "right" },
        { source: "right", target: "start" },
      ],
      isRoot: (node) => node.id === "start",
    });

    expect(levels.flat().map((node) => node.id)).toEqual([
      "start",
      "left",
      "right",
    ]);
  });
});
