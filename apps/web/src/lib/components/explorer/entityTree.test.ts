import { describe, it, expect } from "vitest";
import type { Entity } from "schema";
import { buildEntityTree } from "./entityTree";

describe("entityTree helper", () => {
  const e1: Entity = {
    id: "e1",
    title: "Root A",
    type: "location",
    status: "active",
    tags: [],
    labels: [],
    connections: [],
    aliases: [],
    content: "",
  };
  const e2: Entity = {
    id: "e2",
    title: "Child B",
    type: "character",
    status: "active",
    tags: [],
    labels: [],
    connections: [],
    aliases: [],
    content: "",
    parent: "e1",
  };
  const e3: Entity = {
    id: "e3",
    title: "Grandchild C",
    type: "item",
    status: "active",
    tags: [],
    labels: [],
    connections: [],
    aliases: [],
    content: "",
    parent: "e2",
  };
  const e4: Entity = {
    id: "e4",
    title: "Root D",
    type: "location",
    status: "active",
    tags: [],
    labels: [],
    connections: [],
    aliases: [],
    content: "",
  };

  const allEntities = [e1, e2, e3, e4];

  it("should build a flat tree when there are no parent relationships", () => {
    const roots = buildEntityTree([e1, e4], [e1, e4]);
    expect(roots).toHaveLength(2);
    expect(roots[0].entity.id).toBe("e1");
    expect(roots[1].entity.id).toBe("e4");
  });

  it("should nest child and grandchild nodes correctly", () => {
    const roots = buildEntityTree(allEntities, allEntities);
    expect(roots).toHaveLength(2); // e1 and e4 are roots
    expect(roots[0].entity.id).toBe("e1");
    expect(roots[0].children).toHaveLength(1);
    expect(roots[0].children[0].entity.id).toBe("e2");
    expect(roots[0].children[0].children).toHaveLength(1);
    expect(roots[0].children[0].children[0].entity.id).toBe("e3");
  });

  it("should include ancestor path even if only descendant matches the filter", () => {
    // Only e3 (Grandchild C) matches the query filter
    const roots = buildEntityTree(allEntities, [e3]);
    expect(roots).toHaveLength(1); // e1 is the root ancestor, so it's included
    expect(roots[0].entity.id).toBe("e1");
    expect(roots[0].isMatchingQuery).toBe(false); // e1 doesn't match query

    expect(roots[0].children).toHaveLength(1);
    expect(roots[0].children[0].entity.id).toBe("e2");
    expect(roots[0].children[0].isMatchingQuery).toBe(false); // e2 doesn't match query

    expect(roots[0].children[0].children).toHaveLength(1);
    expect(roots[0].children[0].children[0].entity.id).toBe("e3");
    expect(roots[0].children[0].children[0].isMatchingQuery).toBe(true); // e3 matches query
  });
});
