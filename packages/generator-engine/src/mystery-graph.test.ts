import { describe, expect, it } from "vitest";
import { buildMysteryGraph, buildMysteryGraphDiagram } from "./mystery-graph";

const foundation = {
  perpetratorId: "person-1",
  revelations: [
    { id: "rev-1", kind: "culprit", fact: "Mara copied the key" },
    { id: "rev-2", kind: "item", fact: "The record is in the vault" },
  ],
};
const cast = {
  keyItemLocationId: "place-2",
  suspects: [
    { id: "person-1", name: "Mara Quill" },
    { id: "person-2", name: "Oren Pike" },
  ],
  locations: [
    { id: "place-1", name: "Archive" },
    { id: "place-2", name: "Vault" },
  ],
};
const clues = {
  clues: [
    {
      id: "clue-1",
      observation: "A fresh scratch on the lock",
      sourceId: "place-1",
      supports: ["rev-1"],
      leadsTo: ["person-1", "clue-2"],
    },
    {
      id: "clue-2",
      observation: "Wax in the vault door",
      sourceId: "person-2",
      supports: ["rev-2", "rev-9"],
      leadsTo: ["place-2", "clue-2", "place-9"],
    },
  ],
};

describe("buildMysteryGraph", () => {
  const graph = buildMysteryGraph(foundation, cast, clues);

  it("has a node per person, place, clue and revelation", () => {
    expect(graph.nodes.map((n) => n.kind)).toEqual([
      "person",
      "person",
      "place",
      "place",
      "clue",
      "clue",
      "revelation",
      "revelation",
    ]);
  });

  it("marks the culprit and the key item's location only", () => {
    expect(
      graph.nodes.filter((n) => n.mark).map((n) => [n.id, n.mark]),
    ).toEqual([
      ["person-1", "culprit"],
      ["place-2", "key-item"],
    ]);
  });

  it("links sources, leads and supported conclusions", () => {
    expect(graph.edges).toContainEqual({
      from: "place-1",
      to: "clue-1",
      kind: "found",
    });
    expect(graph.edges).toContainEqual({
      from: "clue-1",
      to: "clue-2",
      kind: "leads",
    });
    expect(graph.edges).toContainEqual({
      from: "clue-2",
      to: "rev-2",
      kind: "supports",
    });
  });

  it("drops edges to unknown ids and to itself", () => {
    expect(
      graph.edges.some((e) => e.to === "rev-9" || e.to === "place-9"),
    ).toBe(false);
    expect(graph.edges.some((e) => e.from === e.to)).toBe(false);
  });

  it("tolerates missing stage data", () => {
    expect(buildMysteryGraph({}, {}, {})).toEqual({ nodes: [], edges: [] });
  });
});

describe("buildMysteryGraphDiagram", () => {
  const layout = buildMysteryGraphDiagram(
    buildMysteryGraph(foundation, cast, clues),
  );

  it("puts sources, clues and conclusions in columns, left to right", () => {
    const x = (kind: string) =>
      layout.nodes.find((n) => n.kind === kind)?.x ?? -1;
    expect(x("person")).toBe(x("place"));
    expect(x("person")).toBeLessThan(x("clue"));
    expect(x("clue")).toBeLessThan(x("revelation"));
  });

  it("stacks people above places in the first column without overlap", () => {
    const first = layout.nodes.filter(
      (n) => n.kind !== "clue" && n.kind !== "revelation",
    );
    for (let i = 1; i < first.length; i++)
      expect(first[i].y).toBeGreaterThanOrEqual(
        first[i - 1].y + first[i - 1].height,
      );
  });

  it("loops a clue-to-clue edge out of its column instead of through boxes", () => {
    const edge = layout.edges.find(
      (e) => e.from === "clue-1" && e.to === "clue-2",
    );
    const clue = layout.nodes.find((n) => n.id === "clue-1")!;
    const right = clue.x + clue.width;
    expect(edge?.path.startsWith(`M ${right} `)).toBe(true);
    expect(edge?.path).toContain(`${right + 36}`);
  });

  it("keeps nodes in a column from overlapping and inside the canvas", () => {
    for (const node of layout.nodes) {
      expect(node.x + node.width).toBeLessThanOrEqual(layout.width);
      expect(node.y + node.height).toBeLessThanOrEqual(layout.height);
    }
  });

  it("draws a path for every edge and none for an empty graph", () => {
    expect(layout.edges).toHaveLength(
      buildMysteryGraph(foundation, cast, clues).edges.length,
    );
    expect(buildMysteryGraphDiagram({ nodes: [], edges: [] }).edges).toEqual(
      [],
    );
  });
});
