import { describe, it, expect } from "vitest";
import {
  pickFrom,
  getRandomItems,
  generateName,
  nameTable,
  type Rng,
} from "./generator-helpers";

/** Deterministic RNG cycling through a fixed sequence of [0,1) values. */
function seededRng(values: number[]): Rng {
  let i = 0;
  return () => values[i++ % values.length];
}

describe("seo generators base — injectable RNG", () => {
  it("pickFrom selects deterministically with a seeded rng", () => {
    const arr = ["a", "b", "c", "d"];
    expect(pickFrom(arr, () => 0)).toBe("a");
    expect(pickFrom(arr, () => 0.5)).toBe("c");
    expect(pickFrom(arr, () => 0.99)).toBe("d");
  });

  it("getRandomItems is reproducible for a fixed rng", () => {
    const arr = [1, 2, 3, 4, 5];
    const rng = seededRng([0.1, 0.9, 0.2, 0.8, 0.3]);
    const first = getRandomItems(arr, 3, rng);
    const rng2 = seededRng([0.1, 0.9, 0.2, 0.8, 0.3]);
    const second = getRandomItems(arr, 3, rng2);
    expect(first).toEqual(second);
    expect(first).toHaveLength(3);
  });

  it("getRandomItems produces the exact Fisher-Yates result for a known rng", () => {
    // rng() === 0 always → each swap picks index 0.
    // [1,2,3,4,5] -> [5,2,3,4,1] -> [4,2,3,5,1] -> [3,2,4,5,1] -> [2,3,4,5,1]
    expect(getRandomItems([1, 2, 3, 4, 5], 3, () => 0)).toEqual([2, 3, 4]);
  });

  it("getRandomItems keeps all elements (no loss/duplication)", () => {
    const rng = seededRng([0.7, 0.2, 0.5, 0.9]);
    const all = getRandomItems([1, 2, 3, 4, 5], 5, rng);
    expect([...all].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("generateName is deterministic under a seeded rng", () => {
    // rng sequence: prefix idx, suffix idx, descriptor gate (>0.6 false), ...
    const rng = seededRng([0, 0, 0]);
    const name = generateName(rng);
    expect(name).toBe(`${nameTable.prefixes[0]}${nameTable.suffixes[0]}`);
  });

  it("generateName appends a descriptor when the gate rng exceeds 0.6", () => {
    const rng = seededRng([0, 0, 0.99, 0]);
    const name = generateName(rng);
    expect(name).toBe(
      `${nameTable.prefixes[0]}${nameTable.suffixes[0]} ${nameTable.descriptors[0]}`,
    );
  });

  it("defaults to Math.random when no rng is injected", () => {
    const arr = ["x"];
    expect(pickFrom(arr)).toBe("x"); // single element — any rng yields it
    expect(typeof generateName()).toBe("string");
  });
});
