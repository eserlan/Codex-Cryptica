import type { StatSheet, StatSheetField } from "schema";
import {
  TOV_MONSTER_TEMPLATE,
  TOV_MONSTER_TEMPLATE_ID,
  TOV_NPC_TEMPLATE,
  TOV_NPC_TEMPLATE_ID,
} from "../rules-sources/tov-templates";
import {
  mapTovMechanicsToStatSheet,
  type TovGeneratorBundle,
} from "../rules-sources/tov-generator-mapping";
import {
  buildNpcNotes,
  toTovCreatureData,
  toTovQuickNpcData,
} from "./to-tov-data";
import type {
  AbilityKey,
  FieldWrite,
  MergePlan,
  NpcValues,
  ReadResult,
} from "./types";

const ABILITIES: AbilityKey[] = ["str", "dex", "con", "int", "wis", "cha"];

/** Mirrors SKILL_ABILITY_MAP in tov-generator-mapping.ts, which is not exported there. */
const SKILL_ABILITY: Record<string, AbilityKey> = {
  athletics: "str",
  acrobatics: "dex",
  sleight_of_hand: "dex",
  stealth: "dex",
  arcana: "int",
  history: "int",
  investigation: "int",
  nature: "int",
  religion: "int",
  animal_handling: "wis",
  insight: "wis",
  medicine: "wis",
  perception: "wis",
  survival: "wis",
  deception: "cha",
  intimidation: "cha",
  performance: "cha",
  persuasion: "cha",
};

const CREATURE_PATHS: Record<string, string[]> = {
  size: ["size"],
  creature_type: ["creatureType"],
  subtype: ["subtype"],
  alignment: ["alignment"],
  cr: ["cr"],
  proficiency_bonus: ["proficiencyBonus"],
  doom: ["doom"],
  ac: ["ac"],
  ac_details: ["acDetails"],
  hp: ["hp"],
  hit_dice: ["hitDice"],
  speed: ["speed"],
  damage_vulnerabilities: ["damageVulnerabilities"],
  damage_resistances: ["damageResistances"],
  damage_immunities: ["damageImmunities"],
  condition_immunities: ["conditionImmunities"],
  senses: ["senses"],
  languages: ["languages"],
  traits: ["traits"],
  actions: ["actions"],
  bonus_actions: ["bonusActions"],
  reactions: ["reactions"],
  legendary_actions: ["legendaryActions"],
};

const NPC_PATHS: Record<string, string[]> = {
  ac: ["ac"],
  hp: ["hp"],
  luck: ["luck"],
  atk: ["attackFormula"],
  damage: ["damageFormula"],
};

/** Source value paths a sheet field depends on. Undefined means no mapping. */
export function sourcePathsFor(
  templateId: string,
  fieldId: string,
): string[] | undefined {
  const npc = templateId === TOV_NPC_TEMPLATE_ID;
  if (npc) return NPC_PATHS[fieldId];

  if (CREATURE_PATHS[fieldId]) return CREATURE_PATHS[fieldId];

  const ability = ABILITIES.find(
    (a) => a === fieldId || `${a}_score` === fieldId,
  );
  if (ability) return [`abilityScores.${ability}`];

  const save = ABILITIES.find((a) => `${a}_save` === fieldId);
  if (save)
    return [`abilityScores.${save}`, "proficiencyBonus", "saveProficiencies"];

  const skillAbility = SKILL_ABILITY[fieldId];
  if (skillAbility) {
    return [
      `abilityScores.${skillAbility}`,
      "proficiencyBonus",
      "skillProficiencies",
    ];
  }
  return undefined;
}

function isPresent(root: unknown, path: string): boolean {
  let current: unknown = root;
  for (const part of path.split(".")) {
    if (current === null || typeof current !== "object") return false;
    current = (current as Record<string, unknown>)[part];
  }
  return current !== undefined && current !== null;
}

function bundleFor(result: ReadResult): TovGeneratorBundle {
  if (result.kind === "npc") {
    return {
      kind: "tov-quick-npc",
      data: toTovQuickNpcData(result.values),
    };
  }
  return {
    kind: "tov-creature",
    data: toTovCreatureData(result.values),
  };
}

const NPC_NOTES_PARTS = [
  "cr",
  "speed",
  "attackName",
  "abilityScores",
  "keySaves",
  "keySkills",
  "notes",
];

/** Required values are present on the read result or on the existing sheet. */
export function canSaveReadResult(
  result: ReadResult,
  existing: StatSheet | null = null,
): boolean {
  const values = result.values as Record<string, unknown>;
  return ["ac", "hp", "cr"].every((key) => {
    if (values[key] !== undefined && values[key] !== null) return true;
    if (!existing) return false;
    const field = existing.fields.find((f) => f.id === key);
    return (
      field?.value !== undefined && field.value !== null && field.value !== ""
    );
  });
}

function valueOf(field: Partial<StatSheetField>): unknown {
  return field.value ?? field.formula ?? field.rows;
}

/**
 * Works out which sheet fields a read result may write. A field is written only
 * when every source value it depends on was found (FR-006, FR-017). Existing
 * values are overwritten only by found ones; GM custom fields are never touched.
 */
function blockReason(
  result: ReadResult,
  existing: StatSheet | null,
  templateId: string,
): MergePlan["blocked"] {
  if (existing?.templateId && existing.templateId !== templateId) {
    return "template-mismatch";
  }
  return canSaveReadResult(result, existing) ? null : "missing-required";
}

function templateFieldMap(templateId: string): Map<string, StatSheetField> {
  const template =
    templateId === TOV_NPC_TEMPLATE_ID
      ? TOV_NPC_TEMPLATE
      : TOV_MONSTER_TEMPLATE;
  return new Map(template.fields.map((f) => [f.id, f] as const));
}

function keyOf(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

/** Saves and skills count only when the stat block names them. */
function isNamedInText(
  fieldId: string,
  values: Record<string, unknown>,
): boolean {
  const save = ABILITIES.find((a) => `${a}_save` === fieldId);
  if (save) return listHas(values.saveProficiencies, save);
  if (SKILL_ABILITY[fieldId])
    return listHas(values.skillProficiencies, fieldId);
  return true;
}

function listHas(list: unknown, key: string): boolean {
  return (
    Array.isArray(list) &&
    list.some((item) => typeof item === "string" && keyOf(item) === key)
  );
}

function writeNpcNotes(
  field: StatSheetField,
  templateId: string,
  values: Record<string, unknown>,
): Partial<StatSheetField> | undefined {
  if (templateId !== TOV_NPC_TEMPLATE_ID || field.id !== "notes") {
    return undefined;
  }
  const anyPart = NPC_NOTES_PARTS.some((key) => isPresent(values, key));
  return anyPart ? { value: buildNpcNotes(values as NpcValues) } : undefined;
}

function writeFoundField(
  field: StatSheetField,
  templateId: string,
  values: Record<string, unknown>,
): Partial<StatSheetField> | undefined {
  const paths = sourcePathsFor(templateId, field.id);
  if (!paths || !paths.every((path) => isPresent(values, path)))
    return undefined;
  if (!isNamedInText(field.id, values)) return undefined;
  const after = pickWritable(field);
  return valueOf(after) === undefined ? undefined : after;
}

/**
 * The value this import would write to one sheet field, or undefined to leave
 * the field alone. Writes need every source value the field depends on.
 */
function writeFor(
  field: StatSheetField,
  templateId: string,
  values: Record<string, unknown>,
  template: Map<string, StatSheetField>,
): Partial<StatSheetField> | undefined {
  if (field.type === "heading") return undefined;
  // The mapper hands back the template field itself when it sets nothing.
  // That default must never be written as if it were a read value.
  const templateField = template.get(field.id);
  if (
    templateField &&
    JSON.stringify(templateField) === JSON.stringify(field)
  ) {
    return undefined;
  }
  // A save or skill is only written when the text names it. An unnamed one
  // would be a modifier the stat block never gave (FR-006).
  if (templateId === TOV_NPC_TEMPLATE_ID && field.id === "notes") {
    return writeNpcNotes(field, templateId, values);
  }
  return writeFoundField(field, templateId, values);
}

/**
 * Works out which sheet fields a read result may write. A field is written only
 * when every source value it depends on was found (FR-006, FR-017). Existing
 * values are overwritten only by found ones; GM custom fields are never touched.
 */
export function planStatSheetMerge(
  result: ReadResult,
  existing: StatSheet | null,
): MergePlan {
  const templateId =
    result.kind === "npc" ? TOV_NPC_TEMPLATE_ID : TOV_MONSTER_TEMPLATE_ID;
  const blocked = blockReason(result, existing, templateId);
  if (blocked)
    return { templateId, writes: [], overwrites: [], untouched: [], blocked };

  const template = templateFieldMap(templateId);
  const values = result.values as Record<string, unknown>;
  const mapped = mapTovMechanicsToStatSheet(bundleFor(result))?.fields ?? [];
  const writes: FieldWrite[] = [];
  const untouched: string[] = [];
  for (const field of mapped) {
    const after = writeFor(field, templateId, values, template);
    if (!after) {
      untouched.push(field.id);
      continue;
    }
    const current = existing?.fields.find((f) => f.id === field.id);
    writes.push({
      fieldId: field.id,
      before: current ? valueOf(current) : undefined,
      after,
    });
  }

  const overwrites = writes.filter(
    (w) =>
      isNonEmpty(w.before) &&
      JSON.stringify(w.before) !== JSON.stringify(valueOf(w.after)),
  );
  const written = new Set(writes.map((w) => w.fieldId));
  const custom = (existing?.fields ?? [])
    .map((f) => f.id)
    .filter((id) => !template.has(id));
  return {
    templateId,
    writes,
    overwrites,
    untouched: [...untouched, ...custom].filter((id) => !written.has(id)),
    blocked: null,
  };
}

function isNonEmpty(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function pickWritable(field: StatSheetField): Partial<StatSheetField> {
  const out: Partial<StatSheetField> = {};
  if (field.value !== undefined) out.value = field.value;
  if (field.formula !== undefined) out.formula = field.formula;
  if (field.rows !== undefined) out.rows = field.rows;
  if (field.min !== undefined) out.min = field.min;
  if (field.max !== undefined) out.max = field.max;
  return out;
}

function clearField(field: StatSheetField): StatSheetField {
  if (field.type === "heading") return field;
  return { ...field, value: undefined, formula: undefined, rows: undefined };
}

/**
 * Applies a plan. For an entity with no sheet, the template is used and fields
 * the reader did not find are left empty, not at the template default.
 */
export function applyStatSheetMerge(
  plan: MergePlan,
  existing: StatSheet | null,
): StatSheet {
  const writeFor = new Map(plan.writes.map((w) => [w.fieldId, w.after]));
  const template =
    plan.templateId === TOV_NPC_TEMPLATE_ID
      ? TOV_NPC_TEMPLATE
      : TOV_MONSTER_TEMPLATE;

  if (!existing) {
    return {
      templateId: plan.templateId,
      fields: template.fields.map((field) => {
        const after = writeFor.get(field.id);
        return after ? { ...field, ...after } : clearField(field);
      }),
    } as StatSheet;
  }

  const fields = existing.fields.map((field) => {
    const after = writeFor.get(field.id);
    return after ? { ...field, ...after } : field;
  });
  const present = new Set(existing.fields.map((f) => f.id));
  for (const field of template.fields) {
    const after = writeFor.get(field.id);
    if (after && !present.has(field.id)) fields.push({ ...field, ...after });
  }
  return { ...existing, templateId: plan.templateId, fields };
}

/** Exposed for tests: the mapper output for a read result, before planning. */
export function mapReadResultToSheet(result: ReadResult): StatSheet | null {
  return mapTovMechanicsToStatSheet(bundleFor(result));
}

export type { TovGeneratorBundle };
