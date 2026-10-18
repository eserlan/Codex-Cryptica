import { describe, expect, it } from "vitest";
import type { StatSheet } from "schema";
import {
  applyStatSheetMerge,
  canSaveReadResult,
  planStatSheetMerge,
} from "./merge";
import {
  TOV_MONSTER_TEMPLATE_ID,
  TOV_NPC_TEMPLATE_ID,
} from "../rules-sources/tov-templates";
import type { ReadResult } from "./types";

const CREATURE: ReadResult = {
  outcome: "ok",
  candidates: [],
  looksLike: "tov",
  kind: "creature",
  name: "Hill Brute",
  values: {
    size: "Large",
    creatureType: "giant",
    cr: "3",
    proficiencyBonus: 2,
    ac: 13,
    hp: 45,
    hitDice: "6d10+12",
    speed: "30 ft.",
    abilityScores: { str: 18, dex: 8, con: 14, int: 6, wis: 9, cha: 7 },
    saveProficiencies: ["str", "con"],
    skillProficiencies: ["athletics"],
    actions: [
      { name: "Greatclub", attackFormula: "1d20+6", damageFormula: "1d10+4" },
    ],
  },
  notes: [{ path: "proficiencyBonus", state: "derived", reason: "from-cr" }],
  leftovers: [],
  reader: "ai",
  corrected: [],
};

const field = (id: string, value: string | number) => ({
  id,
  label: id,
  type: "number" as const,
  value,
});

function existingSheet(templateId: string | null, fields: object[]): StatSheet {
  return { templateId, fields } as unknown as StatSheet;
}

describe("canSaveReadResult (FR-015a)", () => {
  it("is false when HP is missing and not on the existing sheet", () => {
    const { hp: _hp, ...withoutHp } = CREATURE.values as Record<
      string,
      unknown
    >;
    expect(canSaveReadResult({ ...CREATURE, values: withoutHp as never })).toBe(
      false,
    );
  });

  it("is true when HP is missing from the read but already on the sheet", () => {
    const { hp: _hp, ...withoutHp } = CREATURE.values as Record<
      string,
      unknown
    >;
    const sheet = existingSheet(TOV_MONSTER_TEMPLATE_ID, [field("hp", 30)]);
    expect(
      canSaveReadResult({ ...CREATURE, values: withoutHp as never }, sheet),
    ).toBe(true);
  });
});

describe("planStatSheetMerge with no existing sheet", () => {
  it("writes the fields whose source values were found", () => {
    const plan = planStatSheetMerge(CREATURE, null);
    expect(plan.blocked).toBeNull();
    const ids = plan.writes.map((w) => w.fieldId);
    expect(ids).toEqual(
      expect.arrayContaining(["ac", "hp", "str_score", "str_save", "actions"]),
    );
  });

  it("never writes a field whose source was not found", () => {
    const plan = planStatSheetMerge(CREATURE, null);
    const ids = plan.writes.map((w) => w.fieldId);
    expect(ids).not.toContain("languages");
    expect(ids).not.toContain("senses");
    expect(ids).not.toContain("passive_perception");
  });

  it("writes only the saves and skills the text names", () => {
    const plan = planStatSheetMerge(CREATURE, null);
    const str = plan.writes.find((w) => w.fieldId === "str_save");
    expect(str?.after.formula).toBe("1d20+6");
    // DEX is not in the stat block's save list, so no DEX save is invented.
    expect(plan.writes.map((w) => w.fieldId)).not.toContain("dex_save");
    // Athletics is listed; Stealth is not.
    expect(plan.writes.map((w) => w.fieldId)).toContain("athletics");
    expect(plan.writes.map((w) => w.fieldId)).not.toContain("stealth");
  });

  it("never writes a template default the mapper left alone", () => {
    const plan = planStatSheetMerge(CREATURE, null);
    const sheet = applyStatSheetMerge(plan, null);
    const notWritten = sheet.fields.filter(
      (f) => !plan.writes.some((w) => w.fieldId === f.id),
    );
    for (const field of notWritten) {
      expect(field.formula).toBeUndefined();
      expect(field.value).toBeUndefined();
    }
  });

  it("writes a save only when the save list was found", () => {
    const withoutSaves = {
      ...CREATURE,
      values: { ...CREATURE.values, saveProficiencies: undefined } as never,
    };
    const plan = planStatSheetMerge(withoutSaves, null);
    expect(plan.writes.map((w) => w.fieldId)).not.toContain("str_save");
  });

  it("blocks when AC, HP or CR is missing", () => {
    const plan = planStatSheetMerge(
      { ...CREATURE, values: { hp: 9 } as never },
      null,
    );
    expect(plan.blocked).toBe("missing-required");
    expect(plan.writes).toEqual([]);
  });

  it("builds a sheet whose unfound fields are empty, not template defaults", () => {
    const plan = planStatSheetMerge(CREATURE, null);
    const sheet = applyStatSheetMerge(plan, null);
    const languages = sheet.fields.find((f) => f.id === "languages");
    expect(languages?.value).toBeUndefined();
    const hp = sheet.fields.find((f) => f.id === "hp");
    expect(hp?.value).toBe(45);
  });
});

describe("planStatSheetMerge with an existing sheet (FR-017)", () => {
  it("keeps a not-found field's current value and never touches custom fields", () => {
    const sheet = existingSheet(TOV_MONSTER_TEMPLATE_ID, [
      field("languages", "Common"),
      { id: "gm_secret", label: "GM secret", type: "text", value: "x" },
    ]);
    const plan = planStatSheetMerge(CREATURE, sheet);
    expect(plan.writes.map((w) => w.fieldId)).not.toContain("languages");
    expect(plan.untouched).toContain("gm_secret");
    const applied = applyStatSheetMerge(plan, sheet);
    expect(applied.fields.find((f) => f.id === "languages")?.value).toBe(
      "Common",
    );
    expect(applied.fields.find((f) => f.id === "gm_secret")?.value).toBe("x");
  });

  it("lists values it will overwrite", () => {
    const sheet = existingSheet(TOV_MONSTER_TEMPLATE_ID, [field("ac", 10)]);
    const plan = planStatSheetMerge(CREATURE, sheet);
    expect(plan.overwrites.map((w) => w.fieldId)).toContain("ac");
    expect(plan.overwrites.find((w) => w.fieldId === "ac")?.before).toBe(10);
  });

  it("is blocked when the existing sheet uses a different template", () => {
    const sheet = existingSheet(TOV_NPC_TEMPLATE_ID, []);
    const plan = planStatSheetMerge(CREATURE, sheet);
    expect(plan.blocked).toBe("template-mismatch");
    expect(plan.writes).toEqual([]);
  });
});

describe("NPC notes", () => {
  it("is rebuilt only from found parts and kept when no part is found", () => {
    const npc: ReadResult = {
      ...CREATURE,
      kind: "npc",
      values: { cr: "2", ac: 15, hp: 65, speed: "30 ft." } as never,
      notes: [],
    };
    const plan = planStatSheetMerge(npc, null);
    const notes = plan.writes.find((w) => w.fieldId === "notes");
    expect(notes?.after.value).toContain("**CR 2**");
    expect(notes?.after.value).not.toContain("Abilities");
  });
});
