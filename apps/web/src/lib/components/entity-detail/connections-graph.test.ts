import { describe, expect, it } from "vitest";
import type { Entity } from "schema";
import {
  MAX_CONNECTION_NODES,
  buildConnectionNeighbors,
  connectionLabel,
  edgeLabelPosition,
  layoutConnectionGraph,
} from "./connections-graph";

const entity = (partial: Partial<Entity> & { id: string }): Entity =>
  ({
    type: "character",
    title: partial.id,
    connections: [],
    ...partial,
  }) as unknown as Entity;

function context(entities: Entity[], isVisible?: (e: Entity) => boolean) {
  const byId = new Map(entities.map((e) => [e.id, e]));
  const inbound: Record<
    string,
    { sourceId: string; connection: Entity["connections"][number] }[]
  > = {};
  for (const source of entities) {
    for (const connection of source.connections ?? []) {
      (inbound[connection.target] ??= []).push({
        sourceId: source.id,
        connection,
      });
    }
  }
  return {
    getEntity: (id: string) => byId.get(id),
    inbound,
    allEntities: entities,
    isVisible,
  };
}

describe("connectionLabel", () => {
  it("prefers a custom label", () => {
    expect(connectionLabel({ label: "Spouse", type: "related_to" })).toBe(
      "Spouse",
    );
  });

  it("humanises the connection type when no label is set", () => {
    expect(connectionLabel({ type: "located_in" })).toBe("located in");
    expect(connectionLabel({ label: "   ", type: "part_of" })).toBe("part of");
    expect(connectionLabel({})).toBe("related to");
  });
});

describe("buildConnectionNeighbors", () => {
  const king = entity({
    id: "king",
    title: "King Béla",
    connections: [
      { target: "duke", type: "friendly", label: "ally", strength: 1 },
      { target: "guard", type: "owns", label: "commands", strength: 1 },
    ],
  });
  const duke = entity({ id: "duke", title: "Duke Miklós" });
  const guard = entity({ id: "guard", title: "Royal Guard", type: "faction" });
  const kingdom = entity({
    id: "kingdom",
    title: "Kingdom of Pagen",
    type: "location",
    connections: [
      { target: "king", type: "owns", label: "rules", strength: 1 },
    ],
  });
  const heir = entity({ id: "heir", title: "Heir", parent: "King" });

  it("collects outbound, inbound and child neighbours", () => {
    const neighbors = buildConnectionNeighbors(
      king,
      context([king, duke, guard, kingdom, heir]),
    );

    expect(neighbors.map((n) => n.id).sort()).toEqual([
      "duke",
      "guard",
      "heir",
      "kingdom",
    ]);
    expect(neighbors.find((n) => n.id === "duke")?.relations).toEqual([
      { label: "ally", direction: "outbound" },
    ]);
    expect(neighbors.find((n) => n.id === "kingdom")?.relations).toEqual([
      { label: "rules", direction: "inbound" },
    ]);
    expect(neighbors.find((n) => n.id === "heir")?.relations).toEqual([
      { label: "child", direction: "inbound" },
    ]);
  });

  it("does not walk past the first hop", () => {
    const far = entity({
      id: "far",
      connections: [{ target: "duke", type: "knows", strength: 1 }],
    });
    const neighbors = buildConnectionNeighbors(
      king,
      context([king, duke, guard, far]),
    );

    expect(neighbors.map((n) => n.id)).not.toContain("far");
  });

  it("merges multiple relationships to the same entity into one node", () => {
    const a = entity({
      id: "a",
      connections: [
        { target: "b", type: "friendly", label: "ally", strength: 1 },
        { target: "b", type: "owns", label: "employs", strength: 1 },
      ],
    });
    const b = entity({
      id: "b",
      connections: [
        { target: "a", type: "knows", label: "serves", strength: 1 },
      ],
    });

    const neighbors = buildConnectionNeighbors(a, context([a, b]));

    expect(neighbors).toHaveLength(1);
    expect(neighbors[0].relations).toEqual([
      { label: "ally", direction: "outbound" },
      { label: "employs", direction: "outbound" },
      { label: "serves", direction: "inbound" },
    ]);
  });

  it("skips self-links, missing targets and entities hidden from guests", () => {
    const lonely = entity({
      id: "lonely",
      connections: [
        { target: "lonely", type: "knows", strength: 1 },
        { target: "ghost", type: "knows", strength: 1 },
        { target: "secret", type: "knows", strength: 1 },
      ],
    });
    const secret = entity({ id: "secret" });

    const neighbors = buildConnectionNeighbors(
      lonely,
      context([lonely, secret], (e) => e.id !== "secret"),
    );

    expect(neighbors).toEqual([]);
  });

  it("keeps an explicit connection instead of adding a duplicate child edge", () => {
    const parent = entity({
      id: "parent",
      connections: [
        { target: "kid", type: "friendly", label: "mentors", strength: 1 },
      ],
    });
    const kid = entity({ id: "kid", parent: "parent" });

    const neighbors = buildConnectionNeighbors(parent, context([parent, kid]));

    expect(neighbors).toHaveLength(1);
    expect(neighbors[0].relations).toEqual([
      { label: "mentors", direction: "outbound" },
    ]);
  });

  it("flags neighbours carrying the past label", () => {
    const now = entity({
      id: "now",
      connections: [{ target: "then", type: "knows", strength: 1 }],
    });
    const then = entity({ id: "then", labels: ["Past"] });

    const neighbors = buildConnectionNeighbors(now, context([now, then]));

    expect(neighbors[0].hasPastLabel).toBe(true);
  });
});

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
  it("sits between the centre and the node", () => {
    expect(edgeLabelPosition({ x: 90, y: 50, ring: 0 }, 0.5)).toEqual({
      x: 70,
      y: 50,
    });
  });
});
