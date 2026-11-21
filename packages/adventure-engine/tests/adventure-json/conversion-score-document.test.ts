import { describe, expect, it } from "vitest";
import {
  allEntities,
  citesSection,
  citesSourceId,
  entityTextStrings,
  hasScoredText,
  playerVisibleStrings,
  recordStrings,
  sourceReferenceMatches,
  type DocLike,
} from "../../src/adventure-json/conversion-score-document";

describe("conversion score document traversal", () => {
  it("collects known collections in scoring order and tolerates missing collections", () => {
    const doc = {
      scenes: [{ id: "scene" }],
      locations: [{ id: "location" }],
      unresolved: [{ id: "unresolved" }],
      extra: [{ id: "ignored" }],
    } as unknown as DocLike;
    expect(allEntities(doc).map((entity) => entity.id)).toEqual([
      "location",
      "scene",
      "unresolved",
    ]);
    expect(allEntities({} as DocLike)).toEqual([]);
  });

  it("matches sections by ID, anchor or normalised title", () => {
    const section = { sourceId: "mill", title: "The Mill" };
    expect(citesSection({ id: "mill" }, section)).toBe(true);
    expect(
      citesSection({ id: "room", sourceRef: { anchor: "mill" } }, section),
    ).toBe(true);
    expect(
      citesSection(
        { id: "room", sourceRef: { section: "  THE MILL " } },
        section,
      ),
    ).toBe(true);
    expect(
      citesSection(
        { id: "room", sourceRef: { section: "The Mill cellar" } },
        section,
      ),
    ).toBe(false);
    expect(citesSection({ id: "room" }, section)).toBe(false);
    expect(citesSourceId({ id: "mill" }, "mill")).toBe(true);
    expect(
      citesSourceId({ id: "room", sourceRef: { anchor: "mill" } }, "mill"),
    ).toBe(true);
    expect(
      citesSourceId({ id: "room", sourceRef: { section: "mill" } }, "mill"),
    ).toBe(false);
  });

  it("preserves recursive field paths and skips non-string leaves", () => {
    const strings: Array<{ field: string; value: unknown }> = [];
    recordStrings(
      "scenes",
      {
        id: "room",
        branches: [{ label: "Flood", count: 3, nothing: null }],
        conditions: ["Lever pulled", false],
      },
      (field, value) => strings.push({ field, value }),
    );
    expect(strings).toEqual([
      { field: "scenes room.id", value: "room" },
      { field: "scenes room.branches[0].label", value: "Flood" },
      { field: "scenes room.conditions[0]", value: "Lever pulled" },
    ]);
    const anonymous: string[] = [];
    recordStrings("scenes", { label: "Flood" }, (field) =>
      anonymous.push(field),
    );
    expect(anonymous).toEqual(["scenes ?.label"]);
  });

  it("excludes scoring metadata but includes nested content", () => {
    const entity = {
      id: "oak",
      epistemicStatus: "explicit",
      sourceRef: { section: "oak bridge" },
      body: "A bridge opens at noon",
      branches: [{ label: "oak" }],
      count: 3,
      nothing: null,
    };
    expect(entityTextStrings(entity)).toEqual([
      "A bridge opens at noon",
      "oak",
    ]);
    expect(hasScoredText(entity, "A bridge opens at noon", "oak")).toBe(false);
    expect(
      hasScoredText(
        { ...entity, body: "An oak bridge opens at noon" },
        "A bridge opens at noon",
        "oak",
      ),
    ).toBe(true);
    expect(
      hasScoredText(
        { id: "bridge", sourceRef: { section: "An oak bridge opens at noon" } },
        "An oak bridge opens at noon",
        "oak",
      ),
    ).toBe(false);
  });

  it("checks every expected source field while allowing additional actual fields", () => {
    expect(
      sourceReferenceMatches({ anchor: "mill", page: 4 }, { page: 4 }),
    ).toBe(true);
    expect(sourceReferenceMatches({ page: 5 }, { page: 4 })).toBe(false);
    expect(sourceReferenceMatches(undefined, { page: 4 })).toBe(false);
  });

  it("includes premise and all nested player-visible fields, excluding GM records", () => {
    const doc = {
      title: "Title",
      description: "Description",
      premise: {
        background: "Background",
        hook: "Hook",
        tone: "Tone",
        theme: ["Theme", 2],
      },
      scenes: [
        null,
        4,
        {
          id: "room",
          visibility: "player-visible",
          branches: [{ description: "Secret leak" }],
        },
        { id: "gm", visibility: "gm-only", body: "Hidden secret" },
      ],
    };
    const strings = playerVisibleStrings(doc);
    expect(strings.slice(0, 6)).toEqual([
      { field: "title", value: "Title" },
      { field: "description", value: "Description" },
      { field: "premise.background", value: "Background" },
      { field: "premise.hook", value: "Hook" },
      { field: "premise.tone", value: "Tone" },
      { field: "premise.theme[0]", value: "Theme" },
    ]);
    expect(strings.at(-1)).toEqual({
      field: "scenes room.branches[0].description",
      value: "Secret leak",
    });
    expect(strings.some(({ value }) => value === "Hidden secret")).toBe(false);
    expect(playerVisibleStrings({ premise: null, scenes: "invalid" })).toEqual(
      [],
    );
  });
});
