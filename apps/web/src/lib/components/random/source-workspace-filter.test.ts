import { describe, expect, it } from "vitest";
import type { RandomSource } from "random-source-engine";

import { collectLabels, countOf, filterSources } from "./source-workspace-filter";

function source(overrides: Partial<RandomSource>): RandomSource {
  return {
    id: overrides.id ?? "id",
    name: overrides.name ?? "Untitled",
    kind: overrides.kind ?? "table",
    labels: overrides.labels ?? [],
    entries: overrides.entries,
    cards: overrides.cards,
    spreads: overrides.spreads,
  };
}

describe("collectLabels", () => {
  it("collects every distinct label across sources, sorted", () => {
    const all = [
      source({ id: "1", labels: ["travel"] }),
      source({ id: "2", labels: ["dungeon", "travel"] }),
      source({ id: "3", labels: [] }),
    ];
    expect(collectLabels(all)).toEqual(["dungeon", "travel"]);
  });

  it("returns an empty list when nothing has labels", () => {
    expect(collectLabels([source({ id: "1" })])).toEqual([]);
  });
});

describe("filterSources", () => {
  const all = [
    source({ id: "1", name: "Tavern Names", labels: ["travel"] }),
    source({ id: "2", name: "Dungeon Traps", labels: ["dungeon"] }),
    source({ id: "3", name: "Desert Encounters", labels: ["travel", "dungeon"] }),
  ];

  it("filters by a case-insensitive name search and sorts alphabetically", () => {
    expect(filterSources(all, "tavern", []).map((s) => s.name)).toEqual([
      "Tavern Names",
    ]);
    expect(filterSources(all, "", []).map((s) => s.name)).toEqual([
      "Desert Encounters",
      "Dungeon Traps",
      "Tavern Names",
    ]);
  });

  it("requires every active label to be present, not merely one", () => {
    expect(
      filterSources(all, "", ["travel", "dungeon"]).map((s) => s.name),
    ).toEqual(["Desert Encounters"]);
  });

  it("returns nothing when the search matches no source", () => {
    expect(filterSources(all, "nonexistent", [])).toEqual([]);
  });
});

describe("countOf", () => {
  it("counts table entries for a table", () => {
    const table = source({ entries: [{ id: "e1", text: "a", weight: 1 }] });
    expect(countOf("table", table)).toBe(1);
  });

  it("counts deck cards for a deck", () => {
    const deck = source({ cards: [{ id: "c1", title: "a", body: "" }] });
    expect(countOf("deck", deck)).toBe(1);
  });

  it("returns 0 when the relevant collection is missing", () => {
    expect(countOf("table", source({}))).toBe(0);
    expect(countOf("deck", source({}))).toBe(0);
  });
});
