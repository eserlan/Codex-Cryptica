import type { StatSheetField } from "schema";
import type { StatBlockIR } from "./types";
export const D20_ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"];
export const MYTHRAS_CHAR_KEYS = [
  "str",
  "con",
  "siz",
  "dex",
  "int",
  "pow",
  "cha",
];
export const MYTHRAS_LOCATION_DEFINITIONS = [
  { key: "head", label: "Head", defaultHp: 5, npcLabel: "Head" },
  { key: "chest", label: "Chest", defaultHp: 7, npcLabel: "Chest" },
  { key: "abdomen", label: "Abdomen", defaultHp: 6, npcLabel: "Abdomen" },
  {
    key: "rarm",
    label: "Right Arm",
    defaultHp: 4,
    npcLabel: "Right Arm / Foreleg",
  },
  {
    key: "larm",
    label: "Left Arm",
    defaultHp: 4,
    npcLabel: "Left Arm / Foreleg",
  },
  {
    key: "rleg",
    label: "Right Leg",
    defaultHp: 5,
    npcLabel: "Right Leg / Hindleg",
  },
  {
    key: "lleg",
    label: "Left Leg",
    defaultHp: 5,
    npcLabel: "Left Leg / Hindleg",
  },
];
export function getVitalValue(
  ir: StatBlockIR,
  id: string,
  fallback: number,
): number {
  return ir.vitals.find((v) => v.id === id)?.current ?? fallback;
}
export function mapHpField(
  ir: StatBlockIR,
  defaultMax = 100,
): StatSheetField | null {
  const hpVital = ir.vitals.find((v) => v.id === "hp") || ir.vitals[0];
  if (!hpVital) return null;
  return {
    id: "hp",
    label: "Hit Points",
    type: "counter",
    value: hpVital.current ?? hpVital.max ?? 10,
    min: hpVital.min ?? 0,
    max: Math.max(defaultMax, hpVital.max ?? hpVital.current ?? defaultMax),
  };
}
export function mapAcField(ir: StatBlockIR): StatSheetField | null {
  if (ir.defences.armorRating === undefined) return null;
  return {
    id: "ac",
    label: "Armor Class",
    type: "number",
    value: Number(ir.defences.armorRating),
  };
}

export function appendHpSublabelField(
  fields: StatSheetField[],
  ir: StatBlockIR,
  label: string,
): void {
  const hpVital = ir.vitals.find((v) => v.id === "hp") || ir.vitals[0];
  if (hpVital?.sublabel) {
    fields.push({
      id: "hit_dice",
      label,
      type: "text",
      value: hpVital.sublabel,
    });
  }
}
export function mapMythrasLocations(
  sec: Record<string, string | number>,
  isNpc = false,
): StatSheetField[] {
  const fields: StatSheetField[] = [];
  for (const loc of MYTHRAS_LOCATION_DEFINITIONS) {
    const apVal = Number(sec[`loc_${loc.key}_ap`] ?? 0);
    const hpVal = Number(sec[`loc_${loc.key}_hp`] ?? loc.defaultHp);
    const label = isNpc ? loc.npcLabel : loc.label;
    const apSuffix = isNpc ? "AP" : "AP (Armor)";
    fields.push({
      id: `loc_${loc.key}_ap`,
      label: `${label} ${apSuffix}`,
      type: "number",
      value: apVal,
    });
    fields.push({
      id: `loc_${loc.key}_hp`,
      label: `${label} HP`,
      type: "counter",
      value: hpVal,
      min: 0,
      max: 20,
    });
  }
  return fields;
}
export function mapMythrasCharacteristics(ir: StatBlockIR): StatSheetField[] {
  const fields: StatSheetField[] = [];
  for (const c of MYTHRAS_CHAR_KEYS) {
    const attr = ir.attributes[c];
    if (attr)
      fields.push({
        id: c,
        label: attr.label,
        type: "number",
        value: Number(attr.value),
      });
  }
  return fields;
}
export function mapMythrasVitalsAndChars(
  ir: StatBlockIR,
  defaultMp: number,
  isNpc: boolean,
): StatSheetField[] {
  const fields: StatSheetField[] = [
    {
      id: "ap",
      label: "Action Points",
      type: "counter",
      value: getVitalValue(ir, "ap", 3),
      min: 0,
      max: 5,
    },
  ];
  if (!isNpc) {
    fields.push({
      id: "lp",
      label: "Luck Points",
      type: "counter",
      value: getVitalValue(ir, "lp", 2),
      min: 0,
      max: 10,
    });
  }
  fields.push(
    {
      id: "mp",
      label: "Magic Points",
      type: "counter",
      value: getVitalValue(ir, "mp", defaultMp),
      min: 0,
      max: 30,
    },
    {
      id: "hp",
      label: "Total Hit Points",
      type: "counter",
      value: getVitalValue(ir, "hp", 15),
      min: 0,
      max: 50,
    },
    ...mapMythrasCharacteristics(ir),
    ...mapMythrasLocations(ir.defences.secondaryDefences || {}, isNpc),
  );
  return fields;
}
export function formatFeaturesAsProse(
  features: Array<{ name: string; text: string }>,
): string {
  return features.map((t) => `**${t.name}**: ${t.text}`).join("\n\n");
}

/**
 * Maps a StatBlockIR into concrete StatSheetField[] for Codex Cryptica.
 */
