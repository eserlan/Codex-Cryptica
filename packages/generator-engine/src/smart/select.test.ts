import { describe, expect, it } from "vitest";
import { selectSmart } from "./select";
import type { ResolveContext } from "./types";

function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const coastal: ResolveContext = {
  genre: "Fantasy",
  values: { environment: "Coastal harbour" },
  traits: ["coastal", "maritime"],
};

const inland: ResolveContext = {
  genre: "Fantasy",
  values: { environment: "Mountain pass" },
  traits: ["mountain", "inland"],
};

const LOCATIONS = [
  { value: "The Marina", traits: ["maritime"], requires: { trait: "coastal" } },
  { value: "The Mine Head", traits: ["mining"] },
  { value: "The Market", traits: ["trade"] },
  { value: "The Chapel", traits: ["religious"] },
  { value: "The Barracks", traits: ["military"] },
] as const;

describe("selectSmart", () => {
  it("returns the requested number of distinct values", () => {
    const result = selectSmart(LOCATIONS, 3, coastal, {}, seededRng(1));
    expect(result.values).toHaveLength(3);
    expect(new Set(result.values).size).toBe(3);
  });

  it("never returns an option whose requires is unmet", () => {
    const rng = seededRng(2);
    for (let i = 0; i < 200; i++) {
      const result = selectSmart(LOCATIONS, 3, inland, {}, rng);
      expect(result.values).not.toContain("The Marina");
    }
  });

  it("allows that option once the context supports it", () => {
    const rng = seededRng(3);
    let seen = false;
    for (let i = 0; i < 100; i++) {
      if (
        selectSmart(LOCATIONS, 3, coastal, {}, rng).values.includes(
          "The Marina",
        )
      ) {
        seen = true;
        break;
      }
    }
    expect(seen).toBe(true);
  });

  it("favours options whose traits match the resolved context", () => {
    const context: ResolveContext = {
      genre: "Fantasy",
      values: {},
      traits: ["religious"],
    };
    const pool = [
      { value: "The Chapel", traits: ["religious"], boosts: { religious: 20 } },
      { value: "The Mine Head", traits: ["mining"] },
      { value: "The Market", traits: ["trade"] },
      { value: "The Barracks", traits: ["military"] },
    ] as const;
    const rng = seededRng(5);
    let chapel = 0;
    for (let i = 0; i < 200; i++) {
      if (
        selectSmart(pool, 1, context, {}, rng).values.includes("The Chapel")
      ) {
        chapel++;
      }
    }
    expect(chapel).toBeGreaterThan(160);
  });

  it("takes bare strings and treats them as unconstrained", () => {
    const result = selectSmart(["A", "B", "C"], 2, inland, {}, seededRng(7));
    expect(result.values).toHaveLength(2);
    for (const value of result.values) expect(["A", "B", "C"]).toContain(value);
  });

  it("returns everything available when asked for more than the pool holds", () => {
    const result = selectSmart(["A", "B"], 5, inland, {}, seededRng(11));
    expect([...result.values].sort()).toEqual(["A", "B"]);
  });

  it("relaxes rather than returning fewer than asked for", () => {
    const pool = [
      { value: "The Marina", requires: { trait: "coastal" } },
      { value: "The Docks", requires: { trait: "coastal" } },
    ] as const;
    const result = selectSmart(pool, 2, inland, {}, seededRng(13));
    expect(result.values).toHaveLength(2);
    expect(result.relaxations).toEqual([
      { axisId: "selection", dropped: "excludes" },
      { axisId: "selection", dropped: "requires" },
    ]);
  });

  it("is deterministic for a fixed seed", () => {
    const a = selectSmart(LOCATIONS, 3, coastal, {}, seededRng(17));
    const b = selectSmart(LOCATIONS, 3, coastal, {}, seededRng(17));
    expect(a.values).toEqual(b.values);
  });

  it("returns nothing for a count of zero", () => {
    expect(
      selectSmart(LOCATIONS, 0, coastal, {}, seededRng(19)).values,
    ).toEqual([]);
  });
});

describe("selectSmart — relaxation when the strict pool is merely too small", () => {
  it("relaxes requires when the strict pool is non-empty but smaller than count", () => {
    // Two of five options require a trait the context lacks, leaving 3 valid
    // candidates for a request of 4 — narrow() must not stop relaxing just
    // because the strict pool happens to be non-empty (#2536 regression).
    const pool = [
      { value: "A" },
      { value: "B" },
      { value: "C" },
      { value: "D", requires: { trait: "coastal" } },
      { value: "E", requires: { trait: "coastal" } },
    ] as const;
    const inland = { genre: "Fantasy", values: {}, traits: [] };
    const result = selectSmart(pool, 4, inland, {}, seededRng(23));
    expect(result.values).toHaveLength(4);
    // narrow() always tries dropping excludes before requires, even when only
    // requires mattered here — the same order resolveSmart's own relaxation
    // tests document.
    expect(result.relaxations).toEqual([
      { axisId: "selection", dropped: "excludes" },
      { axisId: "selection", dropped: "requires" },
    ]);
  });

  it("does not relax when the strict pool already meets the count", () => {
    const pool = [
      { value: "A" },
      { value: "B" },
      { value: "C" },
      { value: "D", requires: { trait: "coastal" } },
    ] as const;
    const inland = { genre: "Fantasy", values: {}, traits: [] };
    const result = selectSmart(pool, 3, inland, {}, seededRng(29));
    expect(result.values).toHaveLength(3);
    expect(result.values).not.toContain("D");
    expect(result.relaxations).toEqual([]);
  });
});
