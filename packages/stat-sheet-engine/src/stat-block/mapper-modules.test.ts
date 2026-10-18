import { describe, expect, it } from "vitest";
import { StatBlockIRSchema } from "./types";
import { getVitalValue, mapHpField } from "./mapper-shared";
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
