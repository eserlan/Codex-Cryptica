import { describe, expect, it } from "vitest";
import type { Entity } from "schema";
import {
  FALLBACK_COLOR,
  buildConnectionsElements,
  buildConnectionsStyle,
} from "./connections-cytoscape";
import type { ConnectionNeighbor } from "./entity-connections";

const entity = (partial: Partial<Entity> & { id: string }): Entity =>
  ({
    type: "character",
    title: partial.id,
    connections: [],
    ...partial,
  }) as unknown as Entity;

const neighbor = (
  partial: Partial<ConnectionNeighbor> & { id: string },
): ConnectionNeighbor => ({
  title: partial.id,
  type: "character",
  hasPastLabel: false,
  relations: [
    {
      type: "knows",
      displayLabel: "knows",
      direction: "outbound",
      isChild: false,
      strength: 1,
    },
  ],
  ...partial,
});

describe("buildConnectionsElements", () => {
  it("marks exactly one node as the centre", () => {
    const elements = buildConnectionsElements(entity({ id: "king" }), [
      neighbor({ id: "duke" }),
      neighbor({ id: "guard" }),
    ]);

    const centres = elements.filter((el) => el.data.isCentre);
    expect(centres).toHaveLength(1);
    expect(centres[0].data.id).toBe("king");
  });

  it("draws one edge from the centre to each neighbour", () => {
    const elements = buildConnectionsElements(entity({ id: "king" }), [
      neighbor({ id: "duke" }),
      neighbor({ id: "guard" }),
    ]);

    const edges = elements.filter((el) => el.group === "edges");
    expect(edges.map((e) => e.data.target).sort()).toEqual(["duke", "guard"]);
    expect(edges.every((e) => e.data.source === "king")).toBe(true);
  });

  it("reverses the arrow for a purely inbound neighbour, not a mixed one", () => {
    const elements = buildConnectionsElements(entity({ id: "king" }), [
      neighbor({
        id: "kingdom",
        relations: [
          {
            type: "owns",
            displayLabel: "rules",
            direction: "inbound",
            isChild: false,
            strength: 1,
          },
        ],
      }),
      neighbor({
        id: "duke",
        relations: [
          {
            type: "friendly",
            displayLabel: "ally",
            direction: "outbound",
            isChild: false,
            strength: 1,
          },
          {
            type: "knows",
            displayLabel: "knows",
            direction: "inbound",
            isChild: false,
            strength: 1,
          },
        ],
      }),
    ]);

    const edges = Object.fromEntries(
      elements
        .filter((el) => el.group === "edges")
        .map((e) => [e.data.target, e.data.reversed]),
    );
    expect(edges.kingdom).toBe(true);
    expect(edges.duke).toBe(false);
  });

  it("carries image, thumbnail and the past marker through to node data", () => {
    const elements = buildConnectionsElements(
      entity({ id: "king", image: "king.png" }),
      [
        neighbor({
          id: "ghost",
          thumbnail: "ghost-thumb.png",
          hasPastLabel: true,
        }),
      ],
    );

    const king = elements.find((el) => el.data.id === "king")!;
    const ghost = elements.find((el) => el.data.id === "ghost")!;
    expect(king.data.image).toBe("king.png");
    expect(ghost.data.thumbnail).toBe("ghost-thumb.png");
    expect(ghost.data.isPast).toBe(true);
  });
});

describe("buildConnectionsStyle", () => {
  const styleOptions = {
    tokens: { text: "#111", border: "#ccc", primary: "#f00" },
    getCategoryColor: (type: string) =>
      type === "faction" ? "#00ff00" : undefined,
  };

  it("has no `label` on the edge selector — relationship text lives in the DOM list, not the canvas", () => {
    const style = buildConnectionsStyle(styleOptions);
    const edgeRule = style.find(
      (rule) => "selector" in rule && rule.selector === "edge",
    ) as any;

    expect(edgeRule.style.label).toBeUndefined();
  });

  it("gives the centre node its own, larger rule", () => {
    const style = buildConnectionsStyle(styleOptions);
    const centreRule = style.find(
      (rule) => "selector" in rule && rule.selector === "node[isCentre]",
    ) as any;

    expect(centreRule.style.width).toBeGreaterThan(44);
  });

  it("colors a node by its own category and an edge by its target's category", () => {
    const style = buildConnectionsStyle(styleOptions);
    const nodeRule = style.find(
      (rule) => "selector" in rule && rule.selector === "node",
    ) as any;
    const edgeRule = style.find(
      (rule) => "selector" in rule && rule.selector === "edge",
    ) as any;
    const fakeNode = { data: (key: string) => ({ type: "faction" })[key] };
    const fakeEdge = { target: () => fakeNode };

    expect(nodeRule.style["background-color"](fakeNode)).toBe("#00ff00");
    expect(edgeRule.style["line-color"](fakeEdge)).toBe("#00ff00");
  });

  it("falls back to a neutral color for an unregistered category", () => {
    const style = buildConnectionsStyle(styleOptions);
    const nodeRule = style.find(
      (rule) => "selector" in rule && rule.selector === "node",
    ) as any;
    const fakeNode = { data: (key: string) => ({ type: "unregistered" })[key] };

    expect(nodeRule.style["background-color"](fakeNode)).toBe(FALLBACK_COLOR);
  });
});
