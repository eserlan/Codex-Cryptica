import { describe, expect, it } from "vitest";
import { mapTovMechanicsToStatSheet } from "../rules-sources/tov-generator-mapping";
import { TOV_MONSTER_TEMPLATE_ID } from "../rules-sources/tov-templates";
import {
  buildNpcNotes,
  toTovCreatureData,
  toTovQuickNpcData,
} from "./to-tov-data";

describe("toTovCreatureData", () => {
  it("converts a read creature to the mapper's shape and maps to a Monster sheet", () => {
    const data = toTovCreatureData({
      size: "Large",
      creatureType: "giant",
      cr: "3",
      ac: 13,
      hp: 45,
      hitDice: "6d10+12",
      abilityScores: { str: 18, dex: 8, con: 14, int: 6, wis: 9, cha: 7 },
      actions: [
        { name: "Greatclub", attackFormula: "1d20+6", damageFormula: "1d10+4" },
      ],
    });
    const sheet = mapTovMechanicsToStatSheet({ kind: "tov-creature", data });
    expect(sheet?.templateId).toBe(TOV_MONSTER_TEMPLATE_ID);
  });

  it("throws when AC, HP or CR is missing", () => {
    expect(() => toTovCreatureData({ ac: 13, hp: 45 })).toThrow(/cr/);
    expect(() => toTovCreatureData({ cr: "3", hp: 45 })).toThrow(/ac/);
    expect(() => toTovCreatureData({ cr: "3", ac: 13 })).toThrow(/hp/);
  });

  it("uses empty arrays for missing lists, never invented entries", () => {
    const data = toTovCreatureData({ cr: "1", ac: 12, hp: 9 });
    expect(data.traits).toEqual([]);
    expect(data.actions).toEqual([]);
    expect(data.damageImmunities).toEqual([]);
  });

  it("leaves size undefined when the size is not a sheet size", () => {
    const data = toTovCreatureData({
      cr: "1",
      ac: 12,
      hp: 9,
      size: "Colossal",
    });
    expect(data.size).toBeUndefined();
  });
});

describe("toTovQuickNpcData", () => {
  it("throws when AC, HP or CR is missing", () => {
    expect(() => toTovQuickNpcData({ ac: 15, hp: 65 })).toThrow(/cr/);
  });

  it("maps the attack fields through", () => {
    const data = toTovQuickNpcData({
      cr: "2",
      ac: 15,
      hp: 65,
      attackFormula: "1d20+5",
      damageFormula: "1d8+3",
    });
    expect(data.attackFormula).toBe("1d20+5");
    expect(data.damageFormula).toBe("1d8+3");
  });
});

describe("buildNpcNotes", () => {
  it("includes only the parts that were found", () => {
    const notes = buildNpcNotes({ cr: "2", speed: "30 ft." });
    expect(notes).toContain("**CR 2**");
    expect(notes).toContain("**Speed**: 30 ft.");
    expect(notes).not.toContain("Abilities");
    expect(notes).not.toContain("Primary Attack");
  });

  it("returns an empty string when nothing was found", () => {
    expect(buildNpcNotes({})).toBe("");
  });
});
