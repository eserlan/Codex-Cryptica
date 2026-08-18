import { describe, expect, it } from "vitest";
import type { Entity } from "schema";
import {
  buildConnectionNeighbors,
  connectionLabel,
  toConnectionRows,
  vaultConnectionContext,
} from "./entity-connections";

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
      {
        type: "friendly",
        label: "ally",
        displayLabel: "ally",
        direction: "outbound",
        isChild: false,
        strength: 1,
      },
    ]);
    expect(neighbors.find((n) => n.id === "kingdom")?.relations).toEqual([
      {
        type: "owns",
        label: "rules",
        displayLabel: "rules",
        direction: "inbound",
        isChild: false,
        strength: 1,
      },
    ]);
    expect(neighbors.find((n) => n.id === "heir")?.relations).toEqual([
      {
        type: "child",
        displayLabel: "child",
        direction: "inbound",
        isChild: true,
        strength: 1,
      },
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
    expect(
      neighbors[0].relations.map((r) => [r.displayLabel, r.direction]),
    ).toEqual([
      ["ally", "outbound"],
      ["employs", "outbound"],
      ["serves", "inbound"],
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
    expect(
      neighbors[0].relations.map((r) => [r.displayLabel, r.isChild]),
    ).toEqual([["mentors", false]]);
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

describe("toConnectionRows", () => {
  const hero = entity({
    id: "hero",
    title: "Hero",
    connections: [
      {
        target: "mentor",
        type: "friendly",
        label: "student of",
        strength: 0.5,
      },
    ],
  });
  const mentor = entity({
    id: "mentor",
    title: "Mentor",
    connections: [{ target: "hero", type: "knows", strength: 1 }],
  });
  const ward = entity({ id: "ward", title: "Ward", parent: "hero" });

  it("emits one editable row per relationship", () => {
    const rows = toConnectionRows(
      buildConnectionNeighbors(hero, context([hero, mentor, ward])),
    );

    expect(rows).toHaveLength(3);
    // `target`/`type`/`label` are what ConnectionEditor reads off a row.
    expect(rows[0]).toMatchObject({
      target: "mentor",
      targetId: "mentor",
      type: "friendly",
      label: "student of",
      strength: 0.5,
      displayTitle: "Mentor",
      isOutbound: true,
      isChild: false,
    });
    expect(rows[1]).toMatchObject({
      targetId: "mentor",
      type: "knows",
      isOutbound: false,
      isChild: false,
    });
    expect(rows[2]).toMatchObject({
      targetId: "ward",
      type: "child",
      isOutbound: false,
      isChild: true,
    });
  });
});

describe("vaultConnectionContext", () => {
  const owner = entity({
    id: "owner",
    connections: [{ target: "secret", type: "knows", strength: 1 }],
  });
  const secret = entity({ id: "secret", labels: ["hidden"] });
  const store = {
    entities: { owner, secret },
    allEntities: [owner, secret],
    inboundConnections: {},
    isGuest: false,
    defaultVisibility: "visible" as const,
  };

  it("shows everything to the vault owner", () => {
    const neighbors = buildConnectionNeighbors(
      owner,
      vaultConnectionContext(store),
    );

    expect(neighbors.map((n) => n.id)).toEqual(["secret"]);
  });

  it("hides entities a guest may not see", () => {
    const neighbors = buildConnectionNeighbors(
      owner,
      vaultConnectionContext({ ...store, isGuest: true }),
    );

    expect(neighbors).toEqual([]);
  });
});
