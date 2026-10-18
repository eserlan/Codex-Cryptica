import { describe, it, expect } from "vitest";
import { similarity, suggestNames } from "../src/suggest";

describe("similarity", () => {
  it("scores an exact match as 1 and unrelated strings near 0", () => {
    expect(similarity("forest", "forest")).toBe(1);
    expect(similarity("forest", "zzzzzz")).toBe(0);
  });

  it("scores a transposition higher than an unrelated name", () => {
    const typo = similarity("froest encounters", "forest encounters");
    const other = similarity("froest encounters", "urban complications");
    expect(typo).toBeGreaterThan(other);
  });

  it("returns 0 for strings too short to have a bigram", () => {
    expect(similarity("a", "ab")).toBe(0);
  });
});

describe("suggestNames", () => {
  const names = ["Forest Encounters", "Urban Encounters", "Complications"];

  it("offers the closest name first for a near miss", () => {
    expect(suggestNames("forest encounter", names)[0]).toBe(
      "Forest Encounters",
    );
  });

  it("offers nothing rather than a weak guess — naming a wrong table is worse than admitting the miss", () => {
    expect(suggestNames("xylophone", names)).toEqual([]);
  });

  it("returns nothing for a blank query", () => {
    expect(suggestNames("   ", names)).toEqual([]);
  });

  it("honours the limit", () => {
    expect(suggestNames("encounters", names, 1)).toHaveLength(1);
  });

  it("compares case- and whitespace-insensitively", () => {
    expect(suggestNames("  COMPLICATIONS  ", names)).toContain("Complications");
  });
});
