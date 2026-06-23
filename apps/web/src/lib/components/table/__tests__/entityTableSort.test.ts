import { describe, expect, it } from "vitest";
import type { Entity } from "schema";
import {
  sortEntities,
  nextSortState,
  getEntityUpdatedAt,
  type SortState,
} from "../entityTableSort";

function entity(
  partial: Partial<Entity> & { id: string; title: string },
): Entity {
  return {
    type: "note",
    tags: [],
    labels: [],
    aliases: [],
    connections: [],
    content: "",
    status: "active",
    ...partial,
  } as Entity;
}

const titles = (entities: Entity[]) => entities.map((e) => e.title);

describe("getEntityUpdatedAt", () => {
  it("prefers updatedAt over lastUpdated", () => {
    expect(
      getEntityUpdatedAt(
        entity({ id: "a", title: "A", updatedAt: 5, lastUpdated: 1 }),
      ),
    ).toBe(5);
  });

  it("falls back to lastUpdated", () => {
    expect(
      getEntityUpdatedAt(entity({ id: "a", title: "A", lastUpdated: 9 })),
    ).toBe(9);
  });

  it("returns undefined when neither is set", () => {
    expect(getEntityUpdatedAt(entity({ id: "a", title: "A" }))).toBeUndefined();
  });
});

describe("sortEntities", () => {
  const items: Entity[] = [
    entity({ id: "b", title: "Banana", type: "item", updatedAt: 200 }),
    entity({ id: "a", title: "apple", type: "character", updatedAt: 100 }),
    entity({ id: "c", title: "Cherry", type: "item", updatedAt: 300 }),
  ];

  it("sorts by title ascending (case-insensitive)", () => {
    const out = sortEntities(items, { key: "title", direction: "asc" });
    expect(titles(out)).toEqual(["apple", "Banana", "Cherry"]);
  });

  it("sorts by title descending", () => {
    const out = sortEntities(items, { key: "title", direction: "desc" });
    expect(titles(out)).toEqual(["Cherry", "Banana", "apple"]);
  });

  it("sorts by updated ascending", () => {
    const out = sortEntities(items, { key: "updated", direction: "asc" });
    expect(titles(out)).toEqual(["apple", "Banana", "Cherry"]);
  });

  it("sorts by updated descending", () => {
    const out = sortEntities(items, { key: "updated", direction: "desc" });
    expect(titles(out)).toEqual(["Cherry", "Banana", "apple"]);
  });

  it("sorts by type, tie-broken by title", () => {
    const out = sortEntities(items, { key: "type", direction: "asc" });
    expect(titles(out)).toEqual(["apple", "Banana", "Cherry"]);
  });

  it("puts entities missing the updated value last regardless of direction", () => {
    const withGaps: Entity[] = [
      entity({ id: "x", title: "Xeno" }), // no timestamp
      entity({ id: "y", title: "Yak", updatedAt: 50 }),
      entity({ id: "z", title: "Zed", updatedAt: 10 }),
    ];
    expect(
      titles(sortEntities(withGaps, { key: "updated", direction: "asc" })),
    ).toEqual(["Zed", "Yak", "Xeno"]);
    expect(
      titles(sortEntities(withGaps, { key: "updated", direction: "desc" })),
    ).toEqual(["Yak", "Zed", "Xeno"]);
  });

  it("does not mutate the input array", () => {
    const input = [...items];
    sortEntities(input, { key: "title", direction: "desc" });
    expect(input).toEqual(items);
  });
});

describe("nextSortState", () => {
  const base: SortState = { key: "title", direction: "asc" };

  it("toggles direction when selecting the active column", () => {
    expect(nextSortState(base, "title")).toEqual({
      key: "title",
      direction: "desc",
    });
    expect(nextSortState({ key: "title", direction: "desc" }, "title")).toEqual(
      {
        key: "title",
        direction: "asc",
      },
    );
  });

  it("defaults to ascending when switching columns", () => {
    expect(
      nextSortState({ key: "title", direction: "desc" }, "updated"),
    ).toEqual({
      key: "updated",
      direction: "asc",
    });
  });
});
