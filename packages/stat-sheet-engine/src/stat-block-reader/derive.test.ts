import { describe, expect, it } from "vitest";
import { deriveProficiencyBonus, proficiencyForCr } from "./derive";
import type { ReadResult } from "./types";

function creature(values: Record<string, unknown>): ReadResult {
  return {
    outcome: "ok",
    candidates: [],
    looksLike: "tov",
    kind: "creature",
    name: "Test",
    values: values as ReadResult["values"],
    notes: [],
    leftovers: [],
    reader: "ai",
    corrected: [],
  };
}

describe("deriveProficiencyBonus", () => {
  it("derives proficiency from CR 5 as +3 and notes it", () => {
    const result = deriveProficiencyBonus(creature({ cr: "5" }));
    expect(result.values).toMatchObject({ proficiencyBonus: 3 });
    expect(result.notes).toContainEqual({
      path: "proficiencyBonus",
      state: "derived",
      reason: "from-cr",
    });
  });

  it("derives +2 from CR 1/4", () => {
    const result = deriveProficiencyBonus(creature({ cr: "1/4" }));
    expect(result.values).toMatchObject({ proficiencyBonus: 2 });
  });

  it("keeps a stated proficiency bonus with no note", () => {
    const result = deriveProficiencyBonus(
      creature({ cr: "5", proficiencyBonus: 4 }),
    );
    expect(result.values).toMatchObject({ proficiencyBonus: 4 });
    expect(result.notes).toHaveLength(0);
  });

  it("leaves proficiency absent when there is no CR", () => {
    const result = deriveProficiencyBonus(creature({ ac: 13 }));
    expect(result.values).not.toHaveProperty("proficiencyBonus");
  });

  it("leaves proficiency absent when the CR is not in the table", () => {
    expect(proficiencyForCr("31")).toBeUndefined();
  });
});
