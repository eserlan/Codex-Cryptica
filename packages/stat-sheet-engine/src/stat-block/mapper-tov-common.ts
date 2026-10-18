import type { StatSheetField } from "schema";
import type { StatBlockIR } from "./types";
import { TOV_LUCK_FIXTURE } from "../rules-sources/fixtures/tov-luck.fixture";
import { D20_ABILITY_KEYS } from "./mapper-shared";

export function mapTovLuckField(ir: StatBlockIR): StatSheetField {
  const vital = ir.vitals.find((v) => v.id === "luck");
  return {
    id: "luck",
    label: "Luck Points",
    type: "counter",
    value: vital?.current ?? 0,
    min: 0,
    max: vital?.max ?? TOV_LUCK_FIXTURE.defaultMax,
  };
}

export function mapTovSaveFields(ir: StatBlockIR): StatSheetField[] {
  const secondary = ir.defences.secondaryDefences || {};
  return D20_ABILITY_KEYS.flatMap((key) => {
    const attr = ir.attributes[key];
    if (!attr) return [];
    const bonus =
      secondary[`${key}_save`] !== undefined
        ? Number(secondary[`${key}_save`])
        : (attr.modifier ?? Math.floor((Number(attr.value) - 10) / 2));
    return [
      {
        id: `${key}_save`,
        label: `${attr.label} Save`,
        type: "dice" as const,
        formula: `1d20${bonus >= 0 ? `+${bonus}` : bonus}`,
        modifierSource: `${key}_score`,
      },
    ];
  });
}
