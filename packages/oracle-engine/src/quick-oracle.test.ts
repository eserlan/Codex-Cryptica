import { describe, it, expect } from "vitest";
import {
  rollOracleOutcome,
  rollPbtAMove,
  rollActionSpark,
  rollD20,
  type OracleOdds,
  type OracleTier,
} from "./quick-oracle";

describe("quick-oracle", () => {
  describe("rollOracleOutcome", () => {
    it("returns extreme positive for low roll on even odds", () => {
      const outcome = rollOracleOutcome("even", () => 0.05); // roll = 6
      expect(outcome.tier).toBe("extreme_positive");
      expect(outcome.text).toBe("Yes, and...");
      expect(outcome.formattedCue).toBe("Oracle: Yes, and...");
    });

    it("returns positive for middle-low roll on even odds", () => {
      const outcome = rollOracleOutcome("even", () => 0.25); // roll = 26
      expect(outcome.tier).toBe("positive");
      expect(outcome.text).toBe("Yes");
      expect(outcome.formattedCue).toBe("Oracle: Yes");
    });

    it("returns mixed positive (Yes, but...) on even odds", () => {
      const outcome = rollOracleOutcome("even", () => 0.5); // roll = 51
      expect(outcome.tier).toBe("mixed_positive");
      expect(outcome.text).toBe("Yes, but...");
      expect(outcome.formattedCue).toBe("Oracle: Yes, but...");
    });

    it("returns mixed negative (No, but...) on even odds", () => {
      const outcome = rollOracleOutcome("even", () => 0.6); // roll = 61
      expect(outcome.tier).toBe("mixed_negative");
      expect(outcome.text).toBe("No, but...");
      expect(outcome.formattedCue).toBe("Oracle: No, but...");
    });

    it("returns negative (No) on even odds", () => {
      const outcome = rollOracleOutcome("even", () => 0.8); // roll = 81
      expect(outcome.tier).toBe("negative");
      expect(outcome.text).toBe("No");
      expect(outcome.formattedCue).toBe("Oracle: No");
    });

    it("returns extreme negative (No, and...) on even odds", () => {
      const outcome = rollOracleOutcome("even", () => 0.95); // roll = 96
      expect(outcome.tier).toBe("extreme_negative");
      expect(outcome.text).toBe("No, and...");
      expect(outcome.formattedCue).toBe("Oracle: No, and...");
    });

    it("applies likely weighting and labels correctly", () => {
      const outcome = rollOracleOutcome("likely", () => 0.5); // roll = 51 -> Yes
      expect(outcome.text).toBe("Yes");
      expect(outcome.formattedCue).toBe("Oracle (likely): Yes");
    });

    it("applies unlikely weighting and labels correctly", () => {
      const outcome = rollOracleOutcome("unlikely", () => 0.5); // roll = 51 -> No
      expect(outcome.text).toBe("No");
      expect(outcome.formattedCue).toBe("Oracle (unlikely): No");
    });
  });

  describe("rollPbtAMove", () => {
    it("evaluates strong hit (10+)", () => {
      // die1 = 5 (0.8 * 6 + 1 = 5), die2 = 6 (0.9 * 6 + 1 = 6) -> 11
      let count = 0;
      const result = rollPbtAMove(() => (count++ === 0 ? 0.8 : 0.9));
      expect(result.total).toBe(11);
      expect(result.tier).toBe("strong_hit");
      expect(result.formattedCue).toContain("Strong Hit");
    });

    it("evaluates weak hit (7-9)", () => {
      let count = 0;
      const result = rollPbtAMove(() => (count++ === 0 ? 0.4 : 0.6)); // 3 + 4 = 7
      expect(result.total).toBe(7);
      expect(result.tier).toBe("weak_hit");
      expect(result.formattedCue).toContain("Weak Hit");
    });

    it("evaluates miss (6-)", () => {
      let count = 0;
      const result = rollPbtAMove(() => (count++ === 0 ? 0.1 : 0.1)); // 1 + 1 = 2
      expect(result.total).toBe(2);
      expect(result.tier).toBe("miss");
      expect(result.formattedCue).toContain("Miss");
    });
  });

  describe("rollActionSpark", () => {
    it("generates deterministic action/theme pairs", () => {
      let count = 0;
      const spark = rollActionSpark(() => (count++ === 0 ? 0 : 0));
      expect(spark.verb).toBe("Betray");
      expect(spark.noun).toBe("Secret Oath");
      expect(spark.formattedCue).toBe("Spark: Betray Secret Oath");
    });
  });

  describe("rollD20", () => {
    it("generates fair d20 rolls", () => {
      const roll = rollD20(() => 0.99); // 20
      expect(roll.roll).toBe(20);
      expect(roll.formattedCue).toBe("d20 = 20");
    });

    it("keeps endpoint random values within valid dice and table ranges", () => {
      expect(rollD20(() => 1).roll).toBe(20);
      expect(rollActionSpark(() => 1)).toMatchObject({
        verb: "Surrender",
        noun: "Silent Watcher",
      });
    });

    it("rejects a non-finite injected random value", () => {
      expect(() => rollD20(() => Number.NaN)).toThrow(RangeError);
    });
  });
});

// A random source that gives exactly this d100 roll.
const rollAs = (roll: number) => () => (roll - 1 + 0.5) / 100;

const YES: OracleTier[] = ["extreme_positive", "positive", "mixed_positive"];

const yesCount = (odds: OracleOdds) => {
  let count = 0;
  for (let roll = 1; roll <= 100; roll++) {
    if (YES.includes(rollOracleOutcome(odds, rollAs(roll)).tier)) count++;
  }
  return count;
};

describe("rollOracleOutcome with the spec 174 odds", () => {
  it("returns a valid tier for very likely and very unlikely", () => {
    for (const odds of ["very_likely", "very_unlikely"] as const) {
      for (const roll of [1, 30, 60, 90, 100]) {
        const outcome = rollOracleOutcome(odds, rollAs(roll));
        expect(outcome.roll).toBe(roll);
        expect(outcome.text).toMatch(/^(Yes|No)/);
      }
    }
  });

  it("gives yes at least as often from unlikely to very likely", () => {
    expect(yesCount("very_unlikely")).toBeLessThanOrEqual(yesCount("unlikely"));
    expect(yesCount("unlikely")).toBeLessThanOrEqual(yesCount("even"));
    expect(yesCount("even")).toBeLessThanOrEqual(yesCount("likely"));
    expect(yesCount("likely")).toBeLessThanOrEqual(yesCount("very_likely"));
  });

  it("keeps the existing three odds unchanged for fixed rolls", () => {
    expect(rollOracleOutcome("likely", rollAs(15)).text).toBe("Yes, and...");
    expect(rollOracleOutcome("likely", rollAs(66)).text).toBe("Yes, but...");
    expect(rollOracleOutcome("unlikely", rollAs(4)).text).toBe("Yes");
    expect(rollOracleOutcome("even", rollAs(50)).text).toBe("Yes, but...");
    expect(rollOracleOutcome("even", rollAs(91)).text).toBe("No, and...");
  });
});
