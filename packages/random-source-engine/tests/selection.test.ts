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
      expect(selectIndex([1], dice).index).toBe(0);
    }
  });

  it("covers the full range of equally weighted entries", () => {
    const dice = new DiceEngine(seededCrypto());
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      seen.add(selectIndex([1, 1, 1, 1, 1], dice).index);
    }
    expect([...seen].sort()).toEqual([0, 1, 2, 3, 4]);
  });

  it("never returns an out-of-bounds index", () => {
    const dice = new DiceEngine(seededCrypto());
    for (let i = 0; i < 500; i++) {
      const idx = selectIndex([3, 1, 5], dice).index;
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(3);
    }
  });

  it("honours configured weights over many rolls (SC-008)", () => {
    const dice = new DiceEngine(seededCrypto(99));
    const counts = [0, 0];
    const runs = 4000;
    for (let i = 0; i < runs; i++) {
      counts[selectIndex([3, 1], dice).index]++;
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

  it("normalises the weights a number input can actually produce", () => {
    // `min="1"` on the editor's input blocks neither of these: clearing the
    // field reads as `Number("") === 0`, and typing a letter reads as NaN.
    expect(weightsOf([entry("cleared", 0)])).toEqual([0]);
    expect(weightsOf([entry("typed-letter", NaN)])).toEqual([0]);
    expect(weightsOf([entry("negative", -5)])).toEqual([0]);
    expect(weightsOf([entry("fractional", 2.6)])).toEqual([3]);
    expect(weightsOf([entry("infinite", Infinity)])).toEqual([0]);
  });

  it("never lets a NaN weight reach the cursor walk, where it would bias every roll to the last entry", () => {
    const dice = new DiceEngine(seededCrypto());
    const seen = new Set<number>();
    for (let i = 0; i < 200; i++) {
      seen.add(
        selectIndex(weightsOf([entry("a"), entry("b", NaN), entry("c")]), dice)
          .index,
      );
    }
    // "b" weighs nothing after normalising, so it never comes up — but "a" and
    // "c" both must, which a NaN total would have prevented.
    expect([...seen].sort()).toEqual([0, 2]);
  });

  it("reports the roll behind the pick, not the winning entry's band floor", () => {
    const dice = new DiceEngine(seededCrypto(7));
    for (let i = 0; i < 200; i++) {
      const { index, roll } = selectIndex([3, 1, 5], dice);
      expect(roll).toBeGreaterThanOrEqual(1);
      expect(roll).toBeLessThanOrEqual(9);
      // The roll must land inside the band it selected.
      const lower = [1, 4, 5][index];
      const upper = [3, 4, 9][index];
      expect(roll).toBeGreaterThanOrEqual(lower);
      expect(roll).toBeLessThanOrEqual(upper);
    }
  });

  it("throws on an all-zero weight list rather than picking arbitrarily", () => {
    const dice = new DiceEngine(seededCrypto());
    expect(() => selectIndex([0, 0], dice)).toThrow();
    expect(() => selectIndex([0], dice)).toThrow();
  });

  it("throws on an empty weight list rather than returning a bogus index", () => {
    const dice = new DiceEngine(seededCrypto());
    expect(() => selectIndex([], dice)).toThrow();
  });
});
