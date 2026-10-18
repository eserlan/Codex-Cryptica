import { describe, expect, it } from "vitest";
import { CreatureValuesSchema, NpcValuesSchema } from "./read-result-schema";

describe("CreatureValuesSchema (no defaults)", () => {
  it("leaves missing values absent instead of filling defaults", () => {
    const parsed = CreatureValuesSchema.parse({
      ac: 13,
      cr: "3",
      abilityScores: { str: 18 },
    });
    expect(parsed).not.toHaveProperty("hp");
    expect(parsed).not.toHaveProperty("languages");
    expect(parsed.abilityScores).toEqual({ str: 18 });
    expect(parsed.abilityScores).not.toHaveProperty("cha");
  });

  it("accepts numbers written as strings and numeric CR", () => {
    const parsed = CreatureValuesSchema.parse({ ac: "13", cr: 5 });
    expect(parsed.ac).toBe(13);
    expect(parsed.cr).toBe("5");
  });

  it("rejects a value that cannot be a number", () => {
    expect(() => CreatureValuesSchema.parse({ hp: "lots" })).toThrow();
  });

  it("drops keys the sheet has no field for", () => {
    const parsed = CreatureValuesSchema.parse({ ac: 13, lairActions: "x" });
    expect(parsed).not.toHaveProperty("lairActions");
  });
});

describe("NpcValuesSchema", () => {
  it("keeps attack fields and leaves luck absent when not given", () => {
    const parsed = NpcValuesSchema.parse({
      attackName: "Scimitar",
      attackFormula: "1d20+5",
    });
    expect(parsed).not.toHaveProperty("luck");
    expect(parsed.attackFormula).toBe("1d20+5");
  });
});
