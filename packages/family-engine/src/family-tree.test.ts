import { describe, it, expect } from "vitest";
import type { Entity } from "schema";
import { buildFamilyTree } from "./family-tree";

type Conn = { target: string; type: string; label?: string };

function char(
  id: string,
  connections: Conn[] = [],
  extra: Partial<Entity> = {},
): Entity {
  return {
    id,
    type: "character",
    title: id.toUpperCase(),
    connections: connections.map((c) => ({ ...c, strength: 1 })),
    ...extra,
  } as unknown as Entity;
}

function map(...entities: Entity[]): Record<string, Entity> {
  return Object.fromEntries(entities.map((e) => [e.id, e]));
}

const ids = (members: { entityId: string }[]) =>
  members.map((m) => m.entityId).sort();

describe("buildFamilyTree", () => {
  it("places parents, children and partners in the right buckets", () => {
    const entities = map(
      char("focus", [
        { target: "mom", type: "child_of" },
        { target: "kid", type: "parent_of" },
        { target: "spouse", type: "spouse_of" },
      ]),
      char("mom"),
      char("kid"),
      char("spouse"),
    );
    const tree = buildFamilyTree("focus", entities);
    expect(ids(tree.parents)).toEqual(["mom"]);
    expect(ids(tree.children)).toEqual(["kid"]);
    expect(ids(tree.partners)).toEqual(["spouse"]);
    expect(tree.parents[0].generation).toBe(-1);
    expect(tree.children[0].generation).toBe(1);
  });

  it("reads a family link from either direction", () => {
    // Only the parent records `parent_of`; the child records nothing.
    const entities = map(
      char("parent", [{ target: "child", type: "parent_of" }]),
      char("child"),
    );
    expect(ids(buildFamilyTree("child", entities).parents)).toEqual(["parent"]);
    expect(ids(buildFamilyTree("parent", entities).children)).toEqual([
      "child",
    ]);
  });

  it("infers siblings from a shared parent", () => {
    const entities = map(
      char("parent", [
        { target: "a", type: "parent_of" },
        { target: "b", type: "parent_of" },
      ]),
      char("a"),
      char("b"),
    );
    const tree = buildFamilyTree("a", entities);
    expect(ids(tree.siblings)).toEqual(["b"]);
    expect(tree.siblings[0].generation).toBe(0);
  });

  it("supports explicit sibling_of links when parents are unknown", () => {
    // No parents anywhere; the sibling bond is stated directly, labelled.
    const entities = map(
      char("focus", [{ target: "bro", type: "sibling_of" }]),
      char("bro", [{ target: "focus", type: "sibling_of", label: "Brother" }]),
    );
    const tree = buildFamilyTree("focus", entities);
    expect(ids(tree.siblings)).toEqual(["bro"]);
    expect(tree.siblings[0].relationLabel).toBe("Brother");
  });

  it("merges explicit and shared-parent siblings without duplicates", () => {
    const entities = map(
      char("parent", [
        { target: "focus", type: "parent_of" },
        { target: "shared", type: "parent_of" },
      ]),
      char("focus", [{ target: "explicit", type: "sibling_of" }]),
      char("shared"),
      char("explicit", [
        { target: "focus", type: "sibling_of", label: "Sister" },
      ]),
    );
    const tree = buildFamilyTree("focus", entities);
    expect(ids(tree.siblings)).toEqual(["explicit", "shared"]);
    const explicit = tree.siblings.find((s) => s.entityId === "explicit");
    expect(explicit?.relationLabel).toBe("Sister");
  });

  it("returns multiple partners (edge case)", () => {
    const entities = map(
      char("focus", [
        { target: "p1", type: "spouse_of" },
        { target: "p2", type: "spouse_of" },
      ]),
      char("p1"),
      char("p2"),
    );
    expect(ids(buildFamilyTree("focus", entities).partners)).toEqual([
      "p1",
      "p2",
    ]);
  });

  it("skips dangling and non-character targets (edge case)", () => {
    const entities = map(
      char("focus", [
        { target: "ghost", type: "parent_of" }, // not in map
        { target: "place", type: "parent_of" }, // not a character
      ]),
      {
        id: "place",
        type: "location",
        title: "Place",
        connections: [],
      } as unknown as Entity,
    );
    expect(buildFamilyTree("focus", entities).children).toEqual([]);
  });

  it("tolerates a missing intermediate generation (edge case)", () => {
    // grandparent -> (missing parent) ; grandchild recorded directly on gp.
    const entities = map(
      char("grandparent", [{ target: "grandchild", type: "parent_of" }]),
      char("grandchild"),
    );
    const tree = buildFamilyTree("grandparent", entities);
    expect(ids(tree.children)).toEqual(["grandchild"]);
    expect(tree.parents).toEqual([]);
  });

  it("derives lifespan and deceased status", () => {
    const entities = map(
      char("dead", [], {
        start_date: { year: 1000 } as never,
        end_date: { year: 1050 } as never,
      }),
      char("living", [], { start_date: { year: 1200 } as never }),
    );
    const dead = buildFamilyTree("dead", entities).focus;
    expect(dead.deceased).toBe(true);
    expect(dead.lifespan).toBe("1000–1050");
    const living = buildFamilyTree("living", entities).focus;
    expect(living.deceased).toBe(false);
    expect(living.lifespan).toBe("b. 1200");
  });

  it("uses a real label as role and ignores the auto 'past' label", () => {
    const entities = map(
      char("knight", [], { labels: ["past", "Knight of the Vale"] } as never),
    );
    expect(buildFamilyTree("knight", entities).focus.role).toBe(
      "Knight of the Vale",
    );
  });

  it("derives gender from a Male/Female label, case-insensitively", () => {
    const entities = map(
      char("a", [], { labels: ["Male"] } as never),
      char("b", [], { labels: ["female"] } as never),
      char("c", [], { labels: ["Knight"] } as never),
    );
    expect(buildFamilyTree("a", entities).focus.gender).toBe("male");
    expect(buildFamilyTree("b", entities).focus.gender).toBe("female");
    expect(buildFamilyTree("c", entities).focus.gender).toBeUndefined();
  });

  it("excludes the gender label from the role fallback", () => {
    const entities = map(
      char("a", [], { labels: ["Male", "Blacksmith"] } as never),
    );
    const focus = buildFamilyTree("a", entities).focus;
    expect(focus.role).toBe("Blacksmith");
    expect(focus.gender).toBe("male");
  });

  it("does not mark deceased for a non-finite end_date year", () => {
    const entities = map(
      char("x", [], { end_date: { year: Number.NaN } as never }),
    );
    const focus = buildFamilyTree("x", entities).focus;
    expect(focus.deceased).toBe(false);
    expect(focus.lifespan).toBeUndefined();
  });

  it("does not mutate the input entities", () => {
    const entities = map(
      char("parent", [{ target: "child", type: "parent_of" }]),
      char("child"),
    );
    const snapshot = JSON.stringify(entities);
    buildFamilyTree("child", entities);
    expect(JSON.stringify(entities)).toBe(snapshot);
  });
});
