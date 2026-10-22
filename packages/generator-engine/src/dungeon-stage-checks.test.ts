import { describe, expect, it } from "vitest";
import { checkFoundation, checkSectors } from "./dungeon-stage-checks";
import { foundation, sectors, setup } from "./dungeon-staged.test-fixtures";

describe("foundation checks", () => {
  it("accepts a complete foundation and rejects missing text and briefs", () => {
    const resolved = setup();
    const data = foundation(resolved);
    expect(checkFoundation(data, resolved)).toEqual({ hard: [], soft: [] });
    expect(
      checkFoundation({ ...data, title: " ", history: null }, resolved).hard,
    ).toEqual(["missing required fields: title, history"]);
    data.sectorBriefs[0].brief = "";
    expect(checkFoundation(data, resolved).hard).toEqual([
      "a sector brief is empty",
    ]);
  });

  it("rejects banned titles and reordered sector briefs", () => {
    const resolved = setup();
    const data = foundation(resolved);
    expect(
      checkFoundation({ ...data, title: "Aethel" }, resolved).hard.join(),
    ).toContain("banned names");
    expect(
      checkFoundation(
        { ...data, sectorBriefs: data.sectorBriefs.toReversed() },
        resolved,
      ).hard.join(),
    ).toContain("must be exactly");
  });
});

describe("sector checks", () => {
  it("keeps name, stock and list failures separate", () => {
    const resolved = setup();
    const data = sectors(resolved);
    expect(checkSectors(data, resolved)).toEqual({ hard: [], soft: [] });
    data.sectors[1].name = data.sectors[0].name;
    data.sectors[1].stockDetail = data.sectors[0].stockDetail;
    expect(checkSectors(data, resolved).hard).toEqual([
      "two sectors share the same stocked content",
      "two sectors share the same name",
    ]);
    data.sectors[0].description = "";
    data.sectors[0].stockDetail = "";
    expect(
      checkSectors(data, resolved, [data.sectors[0].name]).hard.join(),
    ).toContain("missing its name or description");
    expect(checkSectors(data, resolved).hard).toContain(
      "a sector has no stockDetail",
    );
    expect(
      checkSectors(data, resolved, [data.sectors[0].name]).hard.join(),
    ).toContain("already-used names");
  });
});
