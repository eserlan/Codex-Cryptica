import { describe, it, expect } from "vitest";
import type { Entity } from "schema";
import { buildParentCandidates } from "./parent-picker-candidates";

const entity = (id: string, parent?: string) =>
  ({ id, title: id, type: "location", parent }) as Entity;

const titles = (entities: Entity[]) => entities.map((e) => e.id);

describe("buildParentCandidates", () => {
  // realm > citadel > keep, with an unrelated warden alongside.
  const vault = [
    entity("realm"),
    entity("citadel", "realm"),
    entity("keep", "citadel"),
    entity("warden"),
  ];

  it("offers every entity to something outside the hierarchy", () => {
    expect(titles(buildParentCandidates("warden", vault))).toEqual([
      "realm",
      "citadel",
      "keep",
    ]);
  });

  it("never offers an entity itself", () => {
    expect(titles(buildParentCandidates("realm", vault))).not.toContain(
      "realm",
    );
  });

  it("never offers a direct child", () => {
    expect(titles(buildParentCandidates("citadel", vault))).toEqual([
      "realm",
      "warden",
    ]);
  });

  it("never offers a grandchild", () => {
    // Nesting realm under keep would close realm > citadel > keep into a loop.
    expect(titles(buildParentCandidates("realm", vault))).toEqual(["warden"]);
  });

  it("matches ids that differ only by case, as the tree does", () => {
    // An imported entity keeps the id it arrived with, while updateEntity
    // normalizes the parent it writes — so the two sides can disagree in case.
    const mixed = [entity("NPCs"), entity("goblin", "npcs")];
    expect(titles(buildParentCandidates("NPCs", mixed))).toEqual([]);
  });

  it("terminates on a hierarchy that already contains a loop", () => {
    const looped = [entity("a", "b"), entity("b", "a"), entity("c")];
    expect(titles(buildParentCandidates("a", looped))).toEqual(["c"]);
  });

  it("treats an entity with no children as free to move anywhere else", () => {
    expect(titles(buildParentCandidates("keep", vault))).toEqual([
      "realm",
      "citadel",
      "warden",
    ]);
  });
});
