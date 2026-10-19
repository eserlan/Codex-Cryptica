import { describe, expect, it } from "vitest";
import { createFullEncounterSessionFixture } from "./map-session-test-fixtures";
import {
  childTokenNotes,
  cloneTokenRecord,
  hydrateTokenRecords,
  layerEdgeZIndex,
  removeTokenRecord,
} from "./vtt-token-records";

const makeToken = () => createFullEncounterSessionFixture().tokens["token-1"];

describe("token record transformations", () => {
  it("hydrates linked note text without changing other token fields", () => {
    const note = {
      ...makeToken(),
      kind: "note" as const,
      noteBody: "Old text",
    };
    const hydrated = hydrateTokenRecords(
      { note },
      { entities: { "entity-1": { title: "Updated", content: "" } } },
    );
    expect(hydrated.note).toMatchObject({
      name: "Updated",
      noteBody: "",
      x: 100,
    });
    expect(note.noteBody).toBe("Old text");
  });

  it("retains missing entities and preserves token text when entity fields are absent", () => {
    const source = makeToken();
    expect(hydrateTokenRecords({ source }, undefined).source).toBe(source);
    expect(hydrateTokenRecords({ source }, { entities: {} }).source).toBe(
      source,
    );
    expect(
      hydrateTokenRecords(
        { source },
        { entities: { "entity-1": { title: "", content: "Not a note" } } },
      ).source,
    ).toMatchObject({ name: source.name, noteBody: source.noteBody });
    const note = { ...source, kind: "note" as const, noteBody: "Keep" };
    expect(
      hydrateTokenRecords({ note }, { entities: { "entity-1": {} } }).note
        .noteBody,
    ).toBe("Keep");
  });

  it("clones with an escaped sequential name, grid offset and layer-local ordering", () => {
    const source = {
      ...makeToken(),
      name: "Mage (A) #2",
      layer: "terrain" as const,
      zIndex: 2,
    };
    const sameName = { ...source, id: "another", name: "Mage (A) #5" };
    const otherLayer = {
      ...source,
      id: "hero",
      name: "Hero",
      layer: "token" as const,
      zIndex: 100,
    };
    const clone = cloneTokenRecord(source, [source, sameName, otherLayer], 25, {
      uuid: () => "clone",
    });
    expect(clone).toMatchObject({
      id: "clone",
      name: "Mage (A) #6",
      x: 125,
      y: 175,
      zIndex: 3,
      layer: "terrain",
    });
    expect(source.name).toBe("Mage (A) #2");
  });

  it("gives blank cloned names and a missing grid sensible defaults", () => {
    const source = { ...makeToken(), name: " " };
    expect(
      cloneTokenRecord(source, [source], 0, { uuid: () => "clone" }),
    ).toMatchObject({ name: "Token #2", x: 150, y: 200 });
  });

  it("removes a parent and detaches direct children without changing unrelated records", () => {
    const parent = makeToken();
    const child = { ...parent, id: "child", parentTokenId: parent.id };
    const unrelated = { ...parent, id: "other" };
    const tokens = { [parent.id]: parent, child, unrelated };
    expect(childTokenNotes(tokens, parent.id)).toEqual([child]);
    expect(childTokenNotes(tokens, "missing")).toEqual([]);
    const result = removeTokenRecord(tokens, parent.id);
    expect(result[parent.id]).toBeUndefined();
    expect(result.child.parentTokenId).toBeUndefined();
    expect(result.unrelated).toBe(unrelated);
    expect(tokens.child.parentTokenId).toBe(parent.id);
  });

  it("ignores other layers and invalid ordering values, keeping the initial edge floors", () => {
    const source = { ...makeToken(), layer: "terrain" as const, zIndex: 2 };
    const tokens = [
      source,
      { ...source, zIndex: -3 },
      { ...source, zIndex: NaN },
      { ...source, layer: "token" as const, zIndex: 100 },
    ];
    expect(layerEdgeZIndex(tokens, "terrain", true)).toBe(3);
    expect(layerEdgeZIndex(tokens, "terrain", false)).toBe(-4);
    expect(layerEdgeZIndex([], "terrain", true)).toBe(0);
    expect(layerEdgeZIndex([], "terrain", false)).toBe(-1);
  });
});
