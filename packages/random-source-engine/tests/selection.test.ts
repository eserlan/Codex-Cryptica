import { describe, it, expect } from "vitest";
import { DiceEngine } from "dice-engine";
import { selectIndex, totalWeight, weightsOf } from "../src/selection";
import { seededCrypto } from "./helpers/seeded-crypto";
import type { TableEntry } from "../src/types";

const entry = (id: string, weight?: number): TableEntry => ({
  id,
  text: id,
  weight,
});

describe("selectIndex", () => {
  it("always returns 0 for a single-entry table", () => {
    const dice = new DiceEngine(seededCrypto());
    for (let i = 0; i < 20; i++) {
      expect(selectIndex([1], dice)).toBe(0);
    }
  });

  it("covers the full range of equally weighted entries", () => {
    const dice = new DiceEngine(seededCrypto());
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      seen.add(selectIndex([1, 1, 1, 1, 1], dice));
    }
    expect([...seen].sort()).toEqual([0, 1, 2, 3, 4]);
  });

  it("never returns an out-of-bounds index", () => {
    const dice = new DiceEngine(seededCrypto());
    for (let i = 0; i < 500; i++) {
      const idx = selectIndex([3, 1, 5], dice);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(3);
    }
  });

  it("honours configured weights over many rolls (SC-008)", () => {
    const dice = new DiceEngine(seededCrypto(99));
    const counts = [0, 0];
    const runs = 4000;
    for (let i = 0; i < runs; i++) {
      counts[selectIndex([3, 1], dice)]++;
    }
    // Expect ~75% / ~25%. Allow generous slack for statistical variance.
    const ratio = counts[0] / runs;
    expect(ratio).toBeGreaterThan(0.7);
    expect(ratio).toBeLessThan(0.8);
  });

  it("treats a missing weight as 1", () => {
    expect(weightsOf([entry("a"), entry("b", 4)])).toEqual([1, 4]);
    expect(totalWeight([entry("a"), entry("b", 4)])).toBe(5);
  });

  it("throws on an empty weight list rather than returning a bogus index", () => {
    const dice = new DiceEngine(seededCrypto());
    expect(() => selectIndex([], dice)).toThrow();
  });
});
