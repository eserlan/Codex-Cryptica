import { describe, it, expect } from "vitest";
import {
  cleanDieSpec,
  dieFormula,
  dieRange,
  parseDieNotation,
} from "../src/dice-notation";
import type { DieSpec } from "../src/types";

describe("dieFormula", () => {
  it("renders a plain single die without a leading count", () => {
    expect(dieFormula({ sides: 6 })).toBe("d6");
  });

  it("renders a multi-die roll", () => {
    expect(dieFormula({ sides: 6, count: 2 })).toBe("2d6");
  });

  it("renders keep-highest", () => {
    expect(dieFormula({ sides: 6, count: 4, keepHighest: 3 })).toBe("4d6kh3");
  });

  it("renders keep-lowest", () => {
    expect(dieFormula({ sides: 20, count: 2, keepLowest: 1 })).toBe("2d20kl1");
  });

  it("renders a positive modifier with a plus sign", () => {
    expect(dieFormula({ sides: 6, count: 2, modifier: 3 })).toBe("2d6+3");
  });

  it("renders a negative modifier without a double sign", () => {
    expect(dieFormula({ sides: 6, count: 2, modifier: -1 })).toBe("2d6-1");
  });

  it("omits a zero modifier", () => {
    expect(dieFormula({ sides: 6, modifier: 0 })).toBe("d6");
  });
});

describe("dieRange", () => {
  it("matches d100 as before (backward compatibility)", () => {
    expect(dieRange({ sides: 100 })).toEqual({ min: 1, max: 100 });
  });

  it("sums a plain multi-die roll", () => {
    expect(dieRange({ sides: 6, count: 2 })).toEqual({ min: 2, max: 12 });
  });

  it("computes keep-highest as the kept count's own extremes", () => {
    expect(dieRange({ sides: 6, count: 4, keepHighest: 3 })).toEqual({
      min: 3,
      max: 18,
    });
  });

  it("computes keep-lowest the same way", () => {
    expect(dieRange({ sides: 20, count: 2, keepLowest: 1 })).toEqual({
      min: 1,
      max: 20,
    });
  });

  it("shifts the range by a modifier", () => {
    expect(dieRange({ sides: 6, count: 2, modifier: 3 })).toEqual({
      min: 5,
      max: 15,
    });
  });
});

describe("parseDieNotation", () => {
  it.each([
    ["d6", { sides: 6 }],
    ["2d6", { sides: 6, count: 2 }],
    ["3d10", { sides: 10, count: 3 }],
    ["4d6kh3", { sides: 6, count: 4, keepHighest: 3 }],
    ["2d20kh1", { sides: 20, count: 2, keepHighest: 1 }],
    ["2d20kl1", { sides: 20, count: 2, keepLowest: 1 }],
    ["2d6+3", { sides: 6, count: 2, modifier: 3 }],
    ["2d6-1", { sides: 6, count: 2, modifier: -1 }],
  ] satisfies Array<[string, DieSpec]>)("parses %s", (input, expected) => {
    const result = parseDieNotation(input);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual(expected);
  });

  it("rejects more than one dice group", () => {
    const result = parseDieNotation("1d20 - 1d4");
    expect(result.ok).toBe(false);
  });

  it("rejects exploding dice", () => {
    const result = parseDieNotation("4d6!");
    expect(result.ok).toBe(false);
  });

  it("rejects keeping more dice than are rolled", () => {
    const result = parseDieNotation("2d6kh3");
    expect(result.ok).toBe(false);
  });

  it("rejects an empty expression", () => {
    const result = parseDieNotation("   ");
    expect(result.ok).toBe(false);
  });

  it("rejects an unparseable expression", () => {
    const result = parseDieNotation("not a die");
    expect(result.ok).toBe(false);
  });

  it("rejects a dice count that would make a table roll unbounded", () => {
    const result = parseDieNotation("1000000000d6");
    expect(result.ok).toBe(false);
  });

  it("rejects formulas whose possible result range is too large to validate", () => {
    const result = parseDieNotation("2d10000");
    expect(result.ok).toBe(false);
  });

  it("round-trips through dieFormula", () => {
    for (const notation of [
      "d6",
      "2d6",
      "4d6kh3",
      "2d20kl1",
      "2d6+3",
      "2d6-1",
    ]) {
      const parsed = parseDieNotation(notation);
      expect(parsed.ok).toBe(true);
      if (parsed.ok) expect(dieFormula(parsed.value)).toBe(notation);
    }
  });
});

describe("cleanDieSpec", () => {
  it("drops a redundant count of 1", () => {
    expect(cleanDieSpec({ sides: 6, count: 1 })).toEqual({ sides: 6 });
  });

  it("drops a zero modifier", () => {
    expect(cleanDieSpec({ sides: 6, modifier: 0 })).toEqual({ sides: 6 });
  });

  it("clamps a keep amount to the dice actually rolled", () => {
    expect(cleanDieSpec({ sides: 6, count: 2, keepHighest: 5 })).toEqual({
      sides: 6,
      count: 2,
      keepHighest: 2,
    });
  });

  it("falls back to 1 for what a cleared or invalid number input can produce", () => {
    // Mirrors weightsOf's note: a cleared field is `Number("") === 0`, a typed
    // letter is NaN, and both must land somewhere sane rather than propagate.
    expect(cleanDieSpec({ sides: 6, count: NaN })).toEqual({ sides: 6 });
    expect(cleanDieSpec({ sides: 6, count: 0 })).toEqual({ sides: 6 });
    expect(cleanDieSpec({ sides: 6, count: 3, keepHighest: NaN })).toEqual({
      sides: 6,
      count: 3,
      keepHighest: 1,
    });
  });

  it("keeps only the winning keep field when the editor state has both", () => {
    // Not reachable through the editor's own controls, but a defensive
    // guarantee for anything constructing DieSpec directly (e.g. import).
    expect(
      cleanDieSpec({ sides: 6, count: 3, keepHighest: 2, keepLowest: 1 }),
    ).toEqual({ sides: 6, count: 3, keepHighest: 2 });
  });
});
