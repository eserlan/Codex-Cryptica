import { describe, it, expect } from "vitest";
import type { Entity } from "schema";
import { wouldCreateCycle } from "./cycle-detection";

type Conn = { target: string; type: string };

function char(id: string, connections: Conn[] = []): Entity {
  return {
    id,
    type: "character",
    title: id,
    connections: connections.map((c) => ({ ...c, strength: 1 })),
  } as unknown as Entity;
}

function map(...entities: Entity[]): Record<string, Entity> {
  return Object.fromEntries(entities.map((e) => [e.id, e]));
}

describe("wouldCreateCycle", () => {
  it("returns true when the proposed parent is the child itself", () => {
    const entities = map(char("a"));
    expect(wouldCreateCycle(entities, "a", "a")).toBe(true);
  });

  it("returns true when the proposed parent is a descendant of the child", () => {
    // a -> b -> c ; making c a parent of a would loop.
    const entities = map(
      char("a", [{ target: "b", type: "parent_of" }]),
      char("b", [{ target: "c", type: "parent_of" }]),
      char("c"),
    );
    expect(wouldCreateCycle(entities, "a", "c")).toBe(true);
  });

  it("detects descendants recorded from the child side (child_of)", () => {
    const entities = map(
      char("a"),
      char("b", [{ target: "a", type: "child_of" }]), // b is child of a
    );
    expect(wouldCreateCycle(entities, "a", "b")).toBe(true);
  });

  it("returns false for a valid new parent link", () => {
    const entities = map(char("a"), char("newParent"));
    expect(wouldCreateCycle(entities, "a", "newParent")).toBe(false);
  });

  it("terminates on already-cyclic input", () => {
    const entities = map(
      char("a", [{ target: "b", type: "parent_of" }]),
      char("b", [{ target: "a", type: "parent_of" }]), // pre-existing loop
    );
    expect(wouldCreateCycle(entities, "a", "outsider")).toBe(false);
  });
});
