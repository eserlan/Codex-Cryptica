import { describe, it, expect } from "vitest";
import {
  pickFrom,
  getRandomItems,
  generateName,
  nameTable,
  type Rng,
} from "./base";

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
