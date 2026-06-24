import { describe, expect, it } from "vitest";
import type { Entity } from "schema";
import {
  sortEntities,
  nextSortState,
  getEntityCreatedAt,
  getEntityModifiedAt,
  type SortState,
  type ConnectionSummary,
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

describe("getEntityCreatedAt", () => {
  it("returns createdAt when set", () => {
    expect(
      getEntityCreatedAt(entity({ id: "a", title: "A", createdAt: 7 })),
    ).toBe(7);
  });

  it("returns undefined when createdAt is absent", () => {
    expect(
      getEntityCreatedAt(entity({ id: "a", title: "A", updatedAt: 5 })),
    ).toBeUndefined();
  });
});

describe("getEntityModifiedAt", () => {
  it("prefers modifiedAt over updatedAt and lastUpdated", () => {
    expect(
      getEntityModifiedAt(
        entity({
          id: "a",
          title: "A",
          modifiedAt: 9,
          updatedAt: 5,
          lastUpdated: 1,
        }),
      ),
    ).toBe(9);
  });

  it("falls back to updatedAt then lastUpdated", () => {
    expect(
      getEntityModifiedAt(entity({ id: "a", title: "A", updatedAt: 5 })),
    ).toBe(5);
    expect(
      getEntityModifiedAt(entity({ id: "a", title: "A", lastUpdated: 3 })),
    ).toBe(3);
  });

  it("returns undefined when no timestamp is set", () => {
    expect(
      getEntityModifiedAt(entity({ id: "a", title: "A" })),
    ).toBeUndefined();
  });
});

describe("sortEntities", () => {
  const items: Entity[] = [
    entity({
      id: "b",
      title: "Banana",
      type: "item",
      createdAt: 20,
      modifiedAt: 200,
    }),
    entity({
      id: "a",
      title: "apple",
      type: "character",
      createdAt: 30,
      modifiedAt: 100,
    }),
    entity({
      id: "c",
      title: "Cherry",
      type: "item",
      createdAt: 10,
      modifiedAt: 300,
    }),
  ];

  it("sorts by title ascending (case-insensitive)", () => {
    const out = sortEntities(items, { key: "title", direction: "asc" });
    expect(titles(out)).toEqual(["apple", "Banana", "Cherry"]);
  });

  it("sorts by title descending", () => {
    const out = sortEntities(items, { key: "title", direction: "desc" });
    expect(titles(out)).toEqual(["Cherry", "Banana", "apple"]);
  });

  it("sorts by created ascending", () => {
    const out = sortEntities(items, { key: "created", direction: "asc" });
    expect(titles(out)).toEqual(["Cherry", "Banana", "apple"]);
  });

  it("sorts by modified ascending", () => {
    const out = sortEntities(items, { key: "modified", direction: "asc" });
    expect(titles(out)).toEqual(["apple", "Banana", "Cherry"]);
  });

  it("sorts by modified descending", () => {
    const out = sortEntities(items, { key: "modified", direction: "desc" });
    expect(titles(out)).toEqual(["Cherry", "Banana", "apple"]);
  });

  it("sorts by type, tie-broken by title", () => {
    const out = sortEntities(items, { key: "type", direction: "asc" });
    expect(titles(out)).toEqual(["apple", "Banana", "Cherry"]);
  });

  it("sorts by total connections while retaining unconnected entities", () => {
    const counts: Record<string, ConnectionSummary> = {
      a: { inbound: 1, outbound: 2, total: 3 },
      b: { inbound: 0, outbound: 0, total: 0 },
      c: { inbound: 2, outbound: 3, total: 5 },
    };

    expect(
      titles(
        sortEntities(items, { key: "connections", direction: "asc" }, counts),
      ),
    ).toEqual(["Banana", "apple", "Cherry"]);
    expect(
      titles(
        sortEntities(items, { key: "connections", direction: "desc" }, counts),
      ),
    ).toEqual(["Cherry", "apple", "Banana"]);
  });

  it("puts entities missing the sort value last regardless of direction", () => {
    const withGaps: Entity[] = [
      entity({ id: "x", title: "Xeno" }), // no timestamps
      entity({ id: "y", title: "Yak", modifiedAt: 50 }),
      entity({ id: "z", title: "Zed", modifiedAt: 10 }),
    ];
    expect(
      titles(sortEntities(withGaps, { key: "modified", direction: "asc" })),
    ).toEqual(["Zed", "Yak", "Xeno"]);
    expect(
      titles(sortEntities(withGaps, { key: "modified", direction: "desc" })),
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
      nextSortState({ key: "title", direction: "desc" }, "modified"),
    ).toEqual({
      key: "modified",
      direction: "asc",
    });
  });
});
