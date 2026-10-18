import { describe, expect, it } from "bun:test";
import { suggest } from "../src/suggest";
import {
  academy,
  elara,
  elenaOne,
  elenaTwo,
  hiddenSpy,
  makeSource,
} from "./fixtures";

describe("suggest", () => {
  it("returns a matching entity with its type and descriptor", () => {
    const source = makeSource([elara, academy]);
    const [first] = suggest("ela", source);
    expect(first).toEqual({
      entityId: "e-elara",
      title: "Elara Voss",
      entityType: "character",
      descriptor: "Grand Archmage of the Royal Academy.",
    });
  });

  it("labels a match that came from an alias", () => {
    const source = makeSource([elara]);
    const [first] = suggest("arch", source);
    expect(first.entityId).toBe("e-elara");
    expect(first.matchedAlias).toBe("Archmage");
  });

  it("ranks a title prefix above a mid-title match", () => {
    const prefix = { id: "e-old", title: "Old Voss", type: "character" };
    const middle = { id: "e-hold", title: "Hold Oldwin", type: "location" };
    const source = makeSource([middle, prefix]);
    // "old" starts "Old Voss" (title prefix) but only sits inside "Hold Oldwin".
    expect(suggest("old", source).map((s) => s.entityId)).toEqual([
      "e-old",
      "e-hold",
    ]);
  });

  it("adds visible full-text search hits that the title and aliases missed", () => {
    const source = makeSource([elara, academy]);
    const hits = suggest("ferry", source, ["e-academy", "e-elara"]);
    expect(hits.map((s) => s.entityId)).toContain("e-academy");
  });

  it("never adds a hidden entity from search hits", () => {
    const source = makeSource([elara, hiddenSpy]);
    const ids = suggest("zzz", source, [hiddenSpy.id]).map((s) => s.entityId);
    expect(ids).not.toContain(hiddenSpy.id);
  });

  it("ignores search hits for ids that no longer exist", () => {
    const source = makeSource([elara]);
    expect(suggest("zzz", source, ["e-gone"])).toEqual([]);
  });

  it("uses the first content line as the descriptor when there is no summary", () => {
    const source = makeSource([academy]);
    expect(suggest("royal", source)[0].descriptor).toBe("A school of magic.");
  });

  it("marks entities that share a title with a disambiguator", () => {
    const source = makeSource([elenaOne, elenaTwo]);
    const results = suggest("elena", source);
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.disambiguator)).toEqual([
      "A ferry captain.",
      "A village by the river.",
    ]);
  });

  it("never returns a hidden entity", () => {
    const source = makeSource([hiddenSpy, elara]);
    expect(suggest("shadow", source)).toEqual([]);
  });

  it("returns an empty list when nothing matches", () => {
    const source = makeSource([elara]);
    expect(suggest("zzz", source)).toEqual([]);
  });

  it("offers the first visible entities for an empty query, skipping hidden ones", () => {
    const source = makeSource([hiddenSpy, academy, elara]);
    expect(suggest("", source).map((s) => s.entityId)).toEqual([
      "e-elara",
      "e-academy",
    ]);
  });

  it("returns no entities for a blank query when the Vault has none visible", () => {
    expect(suggest("   ", makeSource([hiddenSpy]))).toEqual([]);
  });

  it("respects the limit", () => {
    const source = makeSource([elenaOne, elenaTwo, elara]);
    expect(suggest("e", source, undefined, 2)).toHaveLength(2);
  });

  it("ranks a 5,000-entity Vault in under 200 ms", () => {
    const entities = Array.from({ length: 5000 }, (_, i) => ({
      id: `e-${i}`,
      title: `Entity ${i} ${i % 7 === 0 ? "Elara" : "Other"}`,
      type: "character",
      summary: "A generated record for the performance check.",
    }));
    const source = makeSource(entities);
    const started = performance.now();
    const results = suggest("elara", source);
    const elapsed = performance.now() - started;
    expect(results.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(200);
  });
});
