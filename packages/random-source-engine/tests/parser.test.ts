import { describe, it, expect } from "vitest";
import { parseRandomSource, serialiseRandomSource } from "../src/parser";
import type { RandomSource } from "../src/types";

const weightedTable: RandomSource = {
  id: "t1",
  name: "Forest Encounters",
  kind: "table",
  labels: ["encounters", "wilderness"],
  selection: { mode: "weighted" },
  entries: [
    { id: "e1", text: "A {creature} guarding {treasure}", weight: 3 },
    { id: "e2", text: "An abandoned shrine", weight: 1 },
  ],
};

const rangedTable: RandomSource = {
  id: "t2",
  name: "Loot d100",
  kind: "table",
  description: "Rolled after a fight",
  labels: [],
  selection: { mode: "ranged", die: { sides: 100 } },
  entries: [
    { id: "e1", text: "A rusted blade", range: { min: 1, max: 50 } },
    { id: "e2", text: "A sealed letter", range: { min: 51, max: 100 } },
  ],
};

const deck: RandomSource = {
  id: "d1",
  name: "Complications",
  kind: "deck",
  labels: ["solo"],
  deckOptions: { drawMode: "without-replacement", allowReversals: true },
  cards: [
    {
      id: "c1",
      title: "The Tower",
      body: "Something collapses",
      reversedMeaning: "Something is rebuilt",
      imagePath: "assets/tower.png",
    },
    { id: "c2", title: "The Road", body: "A journey begins" },
  ],
  spreads: [
    {
      id: "s1",
      name: "Three card",
      positions: ["Situation", "Complication", "Outcome"],
    },
  ],
};

describe("parseRandomSource / serialiseRandomSource", () => {
  it.each([
    ["a weighted table", weightedTable],
    ["a ranged table", rangedTable],
    ["a deck", deck],
  ])("round-trips %s", (_label, source) => {
    const result = parseRandomSource(serialiseRandomSource(source));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual(source);
  });

  it("keeps reference tokens intact through a round-trip", () => {
    const result = parseRandomSource(serialiseRandomSource(weightedTable));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.entries?.[0].text).toContain("{creature}");
    expect(result.value.entries?.[0].text).toContain("{treasure}");
  });

  it("reports a parse failure for a file with no frontmatter", () => {
    const result = parseRandomSource("just some text");
    expect(result.ok).toBe(false);
  });

  it("reports a parse failure for an unknown kind", () => {
    const result = parseRandomSource(
      ["---", "id: x", "name: X", "kind: wardrobe", "---", ""].join("\n"),
    );
    expect(result.ok).toBe(false);
  });

  it("escapes pipes in entry text so the markdown table stays parseable", () => {
    const tricky: RandomSource = {
      ...weightedTable,
      entries: [{ id: "e1", text: "left | right", weight: 1 }],
    };
    const result = parseRandomSource(serialiseRandomSource(tricky));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.entries?.[0].text).toBe("left | right");
  });
});
