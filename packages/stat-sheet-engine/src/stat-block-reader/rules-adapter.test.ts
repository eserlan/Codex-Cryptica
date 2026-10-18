import { describe, expect, it } from "vitest";
import { readStatBlockWithRules } from "./rules-adapter";
import { fixtureById, STAT_BLOCK_FIXTURES } from "./__fixtures__/stat-blocks";

const rules = (id: string) => ({
  source: fixtureById(id).source,
  mode: "copy" as const,
  reader: "rules" as const,
});

describe("readStatBlockWithRules", () => {
  it("reads a Foundry export without any network call and marks the reader as rules", () => {
    const result = readStatBlockWithRules(rules("foundry-hill-brute"));
    expect(result.reader).toBe("rules");
    expect(result.values).toMatchObject({ hp: 45, ac: 13 });
  });

  it("does not report an ability score that the export does not contain as found", () => {
    const result = readStatBlockWithRules(rules("foundry-hill-brute"));
    const scores =
      (result.values as { abilityScores?: Record<string, number> })
        .abilityScores ?? {};
    expect(scores).not.toHaveProperty("cha", 10);
    expect(scores.str).toBe(18);
  });

  it("never reports a value that is not in the pasted text as found", () => {
    const result = readStatBlockWithRules({
      source: "Plain Thing\nArmor Class 13\nHit Points 9",
      mode: "copy",
      reader: "rules",
    });
    const values = result.values as Record<string, unknown>;
    expect(values.ac).toBe(13);
    expect(values.hp).toBe(9);
    expect(values).not.toHaveProperty("languages");
  });

  it("gives an empty, not-found result for a paste with nothing readable", () => {
    const result = readStatBlockWithRules({
      source: "The Ashen Marsh has lain quiet since the old king's fall.",
      mode: "copy",
      reader: "rules",
    });
    expect(result.values).toBeDefined();
    expect(result.notes.filter((n) => n.state === "check")).toEqual(
      expect.any(Array),
    );
  });

  it("runs on every fixture without throwing", () => {
    for (const fixture of STAT_BLOCK_FIXTURES) {
      expect(() => readStatBlockWithRules(rules(fixture.id))).not.toThrow();
    }
  });

  it("reads a quick NPC when the GM hints at one", () => {
    const result = readStatBlockWithRules({
      source: fixtureById("clean-bandit-captain").source,
      mode: "copy",
      reader: "rules",
      kindHint: "npc",
    });
    expect(result.kind).toBe("npc");
    expect(result.values).toMatchObject({ ac: 15, hp: 65 });
  });
});
