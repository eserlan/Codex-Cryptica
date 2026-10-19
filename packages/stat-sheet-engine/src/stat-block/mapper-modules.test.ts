import { describe, expect, it } from "vitest";
import { StatBlockIRSchema } from "./types";
import { derivedRollFormula, getVitalValue, mapHpField } from "./mapper-shared";
import { mapToDndCharacter } from "./mapper-d20";
import { mapToMythrasCharacter } from "./mapper-mythras";
import { mapToVampireCharacter } from "./mapper-vampire";
import {
  mapToSynthesizedTemplate,
  synthesizeTemplateFromIr,
} from "./mapper-synthesized";
import { mapToTovCharacter } from "./mapper-tov-character";
import { mapToTovNpc, mapToTovMonster } from "./mapper-tov-creatures";
import { mapTovLuckField, mapTovSaveFields } from "./mapper-tov-common";

const ir = StatBlockIRSchema.parse({
  system: "dnd5e",
  identity: { name: "Test", category: "character" },
  vitals: [{ id: "hp", label: "Hit Points", current: 12, max: 20 }],
  attributes: { str: { label: "Strength", value: 14 } },
});

describe("stat block mapper modules", () => {
  it("shares common vital mapping", () => {
    expect(getVitalValue(ir, "missing", 3)).toBe(3);
    expect(mapHpField(ir)?.value).toBe(12);
  });

  it("maps D20 character fields", () => {
    expect(mapToDndCharacter(ir).map((field) => field.id)).toContain(
      "str_score",
    );
  });

  it("maps Mythras character fields", () => {
    expect(
      mapToMythrasCharacter({ ...ir, system: "mythras" }).map(
        (field) => field.id,
      ),
    ).toContain("d100_check");
  });

  it("maps Vampire character fields", () => {
    expect(
      mapToVampireCharacter({ ...ir, system: "vtm" }).map((field) => field.id),
    ).toContain("dice_pool");
  });

  it("synthesizes a template and maps matching values", () => {
    const template = synthesizeTemplateFromIr({ ...ir, system: "generic" });
    expect(
      mapToSynthesizedTemplate(ir, template).find((field) => field.id === "hp")
        ?.value,
    ).toBe(12);
  });

  it("maps Tales of the Valiant characters", () => {
    expect(
      mapToTovCharacter({ ...ir, system: "tales-of-the-valiant" }).map(
        (field) => field.id,
      ),
    ).toContain("luck");
  });

  it("maps Tales of the Valiant NPCs and monsters", () => {
    const tov = { ...ir, system: "tales-of-the-valiant" as const };
    expect(mapToTovNpc(tov).map((field) => field.id)).toContain("luck");
    expect(mapToTovMonster(tov).map((field) => field.id)).toContain("doom");
  });

  it("shares Tales of the Valiant luck and save fields", () => {
    const tov = { ...ir, system: "tales-of-the-valiant" as const };
    expect(mapTovLuckField(tov).id).toBe("luck");
    expect(mapTovSaveFields(tov).map((field) => field.id)).toContain(
      "str_save",
    );
  });
});

describe("derivedRollFormula", () => {
  it("writes a bonus equal to the ability modifier as one term", () => {
    expect(derivedRollFormula(3, 16)).toBe("1d20+3");
    expect(derivedRollFormula(-1, 8)).toBe("1d20-1");
  });

  it("keeps a proficiency bonus in front of the derived modifier", () => {
    expect(derivedRollFormula(5, 16)).toBe("1d20+2+3");
    expect(derivedRollFormula(1, 8)).toBe("1d20+2-1");
  });

  it("keeps a bonus below the modifier as a negative term", () => {
    expect(derivedRollFormula(1, 16)).toBe("1d20-2+3");
  });

  it("leaves the bonus whole when there is no numeric score to derive from", () => {
    expect(derivedRollFormula(5, undefined)).toBe("1d20+5");
    expect(derivedRollFormula(5, null)).toBe("1d20+5");
    expect(derivedRollFormula(5, "")).toBe("1d20+5");
    expect(derivedRollFormula(-2, "unknown")).toBe("1d20-2");
  });
});
