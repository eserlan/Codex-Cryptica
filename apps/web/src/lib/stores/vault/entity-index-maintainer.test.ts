import { describe, expect, it } from "vitest";
import { EntityIndexMaintainer } from "./entity-index-maintainer.svelte";
import type { LocalEntity } from "./types";

const entity = (id: string, patch: Partial<LocalEntity> = {}): LocalEntity =>
  ({
    id,
    type: "character",
    title: `Title ${id}`,
    labels: [],
    aliases: [],
    status: "active",
    content: "",
    connections: [],
    ...patch,
  }) as unknown as LocalEntity;

function build(
  count: number,
  patch: (i: number) => Partial<LocalEntity> = () => ({}),
) {
  const entities: Record<string, LocalEntity> = {};
  for (let i = 0; i < count; i++) entities[`e${i}`] = entity(`e${i}`, patch(i));
  const index = new EntityIndexMaintainer();
  index.rebuildIndexes(entities);
  return { entities, index };
}

const edit = (
  entities: Record<string, LocalEntity>,
  ids: string[],
  patch: (e: LocalEntity) => Partial<LocalEntity>,
) => {
  const next = { ...entities };
  for (const id of ids) next[id] = { ...entities[id], ...patch(entities[id]) };
  return next;
};

describe("EntityIndexMaintainer.handleEntitiesUpdate batches", () => {
  it("replaces every edited entity in all three lists, keeping order", () => {
    const { entities, index } = build(20);
    const ids = ["e3", "e7", "e15"];
    const next = edit(entities, ids, () => ({ content: "edited" }));

    index.handleEntitiesUpdate(entities, next);

    for (const list of [index.allEntities, index.allActiveEntities]) {
      expect(list.map((e) => e.id)).toEqual(Object.keys(entities));
      for (const id of ids) {
        expect(list.find((e) => e.id === id)?.content).toBe("edited");
      }
    }
    expect(index.allEntities.find((e) => e.id === "e4")?.content).toBe("");
  });

  it("leaves entities that were not edited as the same objects", () => {
    const { entities, index } = build(10);
    const before = index.allEntities.find((e) => e.id === "e9");

    index.handleEntitiesUpdate(
      entities,
      edit(entities, ["e1"], () => ({ content: "x" })),
    );

    expect(index.allEntities.find((e) => e.id === "e9")).toBe(before);
  });

  it("puts graph-relevant edits into graphEntities and bumps the version once per batch", () => {
    const { entities, index } = build(30);
    const ids = Array.from({ length: 12 }, (_, i) => `e${i}`);
    const versionBefore = index.graphStructureVersion;
    const next = edit(entities, ids, () => ({
      connections: [{ target: "e29", type: "related", strength: 1 }],
    }));

    index.handleEntitiesUpdate(entities, next);

    expect(index.graphStructureVersion).toBe(versionBefore + 1);
    for (const id of ids) {
      expect(
        index.graphEntities.find((e) => e.id === id)?.connections,
      ).toHaveLength(1);
    }
    expect(index.graphEntities.map((e) => e.id)).toEqual(Object.keys(entities));
  });

  it("does not touch the graph for an edit the graph does not render (negative)", () => {
    const { entities, index } = build(10);
    const versionBefore = index.graphStructureVersion;
    const graphBefore = index.graphEntities;

    index.handleEntitiesUpdate(
      entities,
      edit(entities, ["e2", "e3"], () => ({ content: "prose" })),
    );

    expect(index.graphStructureVersion).toBe(versionBefore);
    expect(index.graphEntities).toBe(graphBefore);
  });

  it("does not put a draft edit into the active list (negative)", () => {
    const { entities, index } = build(6, (i) =>
      i === 2 ? { status: "draft" } : {},
    );
    const draftBefore = index.allEntities.find((e) => e.id === "e2");

    index.handleEntitiesUpdate(
      entities,
      edit(entities, ["e2"], () => ({ content: "draft edit" })),
    );

    expect(index.allEntities.find((e) => e.id === "e2")?.content).toBe(
      "draft edit",
    );
    expect(index.allActiveEntities.find((e) => e.id === "e2")).toBeUndefined();
    expect(draftBefore?.content).toBe("");
  });

  it("handles a mix of heavy and light edits in one batch", () => {
    const { entities, index } = build(12);
    const next = edit(entities, ["e1"], () => ({ title: "Renamed" }));
    next.e5 = { ...entities.e5, content: "light" };
    next.e8 = {
      ...entities.e8,
      connections: [{ target: "e1", type: "related", strength: 1 }],
    };

    index.handleEntitiesUpdate(entities, next);

    const byId = (list: LocalEntity[], id: string) =>
      list.find((e) => e.id === id)!;
    expect(byId(index.allEntities, "e1").title).toBe("Renamed");
    expect(byId(index.graphEntities, "e1").title).toBe("Renamed");
    expect(byId(index.allEntities, "e5").content).toBe("light");
    expect(byId(index.graphEntities, "e8").connections).toHaveLength(1);
  });

  it("does not carry one batch's edits into the next", () => {
    const { entities, index } = build(8);
    const first = edit(entities, ["e2"], () => ({ content: "first" }));
    index.handleEntitiesUpdate(entities, first);
    const second = edit(first, ["e4"], () => ({ content: "second" }));

    index.handleEntitiesUpdate(first, second);

    expect(index.allEntities.find((e) => e.id === "e2")?.content).toBe("first");
    expect(index.allEntities.find((e) => e.id === "e4")?.content).toBe(
      "second",
    );
  });
});
