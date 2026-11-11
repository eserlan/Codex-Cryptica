import { describe, expect, it } from "bun:test";
import { hexNoise } from "../../src/region/noise";
import { hashSeed } from "../../src/region/seed";

const seed = hashSeed("K7Q2-9FXM");

describe("hexNoise", () => {
  it("is repeatable and stays within 0 to 1", () => {
    for (let q = -20; q <= 20; q += 3) {
      for (let r = -20; r <= 20; r += 3) {
        const a = hexNoise(seed, { q, r }, "height");
        expect(a).toBe(hexNoise(seed, { q, r }, "height"));
        expect(a).toBeGreaterThanOrEqual(0);
        expect(a).toBeLessThanOrEqual(1);
      }
    }
  });

  it("changes smoothly between neighbours", () => {
    let worst = 0;
    for (let q = -15; q <= 15; q++) {
      for (let r = -15; r <= 15; r++) {
        const here = hexNoise(seed, { q, r }, "height");
        const next = hexNoise(seed, { q: q + 1, r }, "height");
        worst = Math.max(worst, Math.abs(here - next));
      }
    }
    expect(worst).toBeLessThan(0.45);
  });

  it("differs between seeds and between channels", () => {
    const hex = { q: 4, r: -3 };
    expect(hexNoise(seed, hex, "height")).not.toBe(
      hexNoise(hashSeed("OTHER"), hex, "height"),
    );
    expect(hexNoise(seed, hex, "height")).not.toBe(
      hexNoise(seed, hex, "wetness"),
    );
  });

  it("uses the whole range, so every terrain can appear", () => {
    const values: number[] = [];
    for (let q = -25; q <= 25; q++)
      for (let r = -25; r <= 25; r++)
        values.push(hexNoise(seed, { q, r }, "height"));
    expect(Math.min(...values)).toBeLessThan(0.15);
    expect(Math.max(...values)).toBeGreaterThan(0.85);
  });

  it("matches literal values (cross-device repeatability)", () => {
    // If these change, every landscape changes: raise REGION_RULES_VERSION.
    expect(hexNoise(seed, { q: 0, r: 0 }, "height")).toBeCloseTo(0.03923069, 6);
    expect(hexNoise(seed, { q: 7, r: -4 }, "wetness")).toBeCloseTo(
      0.28492671,
      6,
    );
    expect(hexNoise(seed, { q: -12, r: 9 }, "height")).toBeCloseTo(
      0.56859474,
      6,
    );
  });
});
