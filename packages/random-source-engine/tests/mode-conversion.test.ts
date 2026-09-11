import { describe, it, expect } from "vitest";
import { toRanged, toWeighted } from "../src/mode-conversion";
import type { RandomSource } from "../src/types";

const weighted: RandomSource = {
  id: "t",
  name: "T",
  kind: "table",
  labels: [],
  selection: { mode: "weighted" },
  entries: [
    { id: "a", text: "Alpha", weight: 3 },
    { id: "b", text: "Beta", weight: 1 },
    { id: "c", text: "Gamma", weight: 2 },
  ],
};

describe("weighted → ranged (FR-004a)", () => {
  it("allocates contiguous ranges in entry order", () => {
    const out = toRanged(weighted);
    expect(out.entries?.map((e) => e.range)).toEqual([
      { min: 1, max: 3 },
      { min: 4, max: 4 },
      { min: 5, max: 6 },
    ]);
  });

  it("gives each range a width equal to its weight", () => {
    const out = toRanged(weighted);
    const widths = out.entries?.map((e) => e.range!.max - e.range!.min + 1);
    expect(widths).toEqual([3, 1, 2]);
  });

  it("sets the die to the sum of the weights", () => {
    const out = toRanged(weighted);
    expect(out.selection).toEqual({ mode: "ranged", die: { sides: 6 } });
  });

  it("drops the weight field", () => {
    const out = toRanged(weighted);
    expect(out.entries?.every((e) => e.weight === undefined)).toBe(true);
  });

  it("treats a missing weight as 1", () => {
    const out = toRanged({
      ...weighted,
      entries: [
        { id: "a", text: "Alpha" },
        { id: "b", text: "Beta" },
      ],
    });
    expect(out.entries?.map((e) => e.range)).toEqual([
      { min: 1, max: 1 },
      { min: 2, max: 2 },
    ]);
  });
});

describe("ranged → weighted (FR-004a)", () => {
  it("sets each weight to its range width", () => {
    const back = toWeighted(toRanged(weighted));
    expect(back.entries?.map((e) => e.weight)).toEqual([3, 1, 2]);
  });

  it("drops the die and the range fields", () => {
    const back = toWeighted(toRanged(weighted));
    expect(back.selection).toEqual({ mode: "weighted" });
    expect(back.entries?.every((e) => e.range === undefined)).toBe(true);
  });
});

describe("round-trip", () => {
  it("returns the original weighted table unchanged", () => {
    expect(toWeighted(toRanged(weighted))).toEqual(weighted);
  });

  it("is a no-op when converting to the mode already in use", () => {
    expect(toWeighted(weighted)).toEqual(weighted);
    const r = toRanged(weighted);
    expect(toRanged(r)).toEqual(r);
  });
});
