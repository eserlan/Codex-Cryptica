import { describe, expect, it } from "vitest";
import {
  SUPERHERO_POWER_SCALES,
  SUPERHERO_POWER_SCALE_FALLBACKS,
  SUPERHERO_POWER_SCALE_HINTS,
} from "./superhero-power-scale";

describe("superhero power scale", () => {
  it("defines the six canonical levels in ascending order", () => {
    expect(SUPERHERO_POWER_SCALES).toEqual([
      "Street",
      "City",
      "National",
      "Global",
      "Cosmic",
      "Multiversal",
    ]);
  });

  it("gives every level a distinct, non-trivial hint", () => {
    const hints = SUPERHERO_POWER_SCALES.map(
      (level) => SUPERHERO_POWER_SCALE_HINTS[level],
    );
    for (const hint of hints) {
      expect(hint.length).toBeGreaterThan(40);
    }
    expect(new Set(hints).size).toBe(hints.length);
  });

  it("has exactly one hint per level, no orphans in either direction", () => {
    expect(Object.keys(SUPERHERO_POWER_SCALE_HINTS).sort()).toEqual(
      [...SUPERHERO_POWER_SCALES].sort(),
    );
  });

  it("has complete local fallback framing for every level", () => {
    for (const level of SUPERHERO_POWER_SCALES) {
      const fallback = SUPERHERO_POWER_SCALE_FALLBACKS[level];
      expect(fallback.methods.length).toBeGreaterThan(20);
      expect(fallback.resources.length).toBeGreaterThan(20);
      expect(fallback.territory.length).toBeGreaterThan(20);
      expect(fallback.planStages).toHaveLength(6);
    }
  });
});
