import type {
  TovAbilityScoresData,
  TovCreatureData,
  TovQuickNpcData,
} from "../rules-sources/tov-generator-mapping";
import { SIZE_VALUES } from "./read-result-schema";
import type { AbilityKey, CreatureValues, NpcValues } from "./types";

/**
 * Placeholders below only satisfy the mapper's required types. The merge plan
 * (merge.ts) writes a field only when its source values were read, so none of
 * these reach a saved sheet. Anything the reader did not find is left undefined.
 */
const PLACEHOLDER_SCORES: TovAbilityScoresData = {
  str: 10,
  dex: 10,
  con: 10,
  int: 10,
  wis: 10,
  cha: 10,
};
const ABILITY_KEYS: AbilityKey[] = ["str", "dex", "con", "int", "wis", "cha"];

function requireFound(values: Record<string, unknown>, keys: string[]): void {
  const missing = keys.filter(
    (key) => values[key] === undefined || values[key] === null,
  );
  if (missing.length > 0) {
    throw new Error(`Missing required values: ${missing.join(", ")}`);
  }
}

function scoresOf(
  input: CreatureValues["abilityScores"] | NpcValues["abilityScores"],
): TovAbilityScoresData {
  const out = { ...PLACEHOLDER_SCORES };
  for (const key of ABILITY_KEYS) {
    const score = input?.[key];
    if (typeof score === "number") out[key] = score;
  }
  return out;
}

function creatureClassification(values: CreatureValues) {
  const size = SIZE_VALUES.find((s) => s === values.size);
  return {
    // Undefined when the size is not a valid one, so the mapper leaves it empty.
    size: size as TovCreatureData["size"],
    creatureType: values.creatureType ?? "",
    subtype: values.subtype ?? undefined,
    alignment: values.alignment ?? undefined,
    cr: values.cr as string,
    proficiencyBonus: values.proficiencyBonus ?? 0,
    doom: values.doom ?? 0,
  };
}

function creatureDefences(values: CreatureValues) {
  return {
    ac: values.ac as number,
    acDetails: values.acDetails ?? undefined,
    hp: values.hp as number,
    hitDice: values.hitDice ?? "",
    speed: values.speed ?? "",
    senses: values.senses ?? undefined,
    languages: values.languages ?? undefined,
  };
}

function creatureIdentity(values: CreatureValues) {
  return {
    ...creatureClassification(values),
    ...creatureDefences(values),
    abilityScores: scoresOf(values.abilityScores),
  };
}

function creatureLists(values: CreatureValues) {
  return {
    saveProficiencies: values.saveProficiencies ?? [],
    skillProficiencies: values.skillProficiencies ?? [],
    damageVulnerabilities: values.damageVulnerabilities ?? [],
    damageResistances: values.damageResistances ?? [],
    damageImmunities: values.damageImmunities ?? [],
    conditionImmunities: values.conditionImmunities ?? [],
    traits: (values.traits ?? []).map((trait) => ({
      name: trait.name,
      description: trait.description ?? "",
    })),
    legendaryActions: (values.legendaryActions ?? []).map((action) => ({
      name: action.name,
      cost: action.cost ?? undefined,
      description: action.description ?? "",
    })),
  };
}

/** Throws when AC, HP or CR is missing. Callers check canSaveReadResult first. */
export function toTovCreatureData(values: CreatureValues): TovCreatureData {
  requireFound(values as Record<string, unknown>, ["ac", "hp", "cr"]);
  return {
    ...creatureIdentity(values),
    ...creatureLists(values),
    actions: (values.actions ?? []).map(toAction),
    bonusActions: (values.bonusActions ?? []).map(toAction),
    reactions: (values.reactions ?? []).map(toAction),
  };
}

function toAction(action: NonNullable<CreatureValues["actions"]>[number]) {
  return {
    name: action.name,
    attackFormula: action.attackFormula ?? undefined,
    damageFormula: action.damageFormula ?? undefined,
    description: action.description ?? "",
  };
}

/** Throws when AC, HP or CR is missing. */
export function toTovQuickNpcData(values: NpcValues): TovQuickNpcData {
  requireFound(values as Record<string, unknown>, ["ac", "hp", "cr"]);
  return {
    cr: values.cr as string,
    ac: values.ac as number,
    hp: values.hp as number,
    hitDice: values.hitDice ?? undefined,
    speed: values.speed ?? undefined,
    attackName: values.attackName ?? undefined,
    attackBonus: values.attackBonus ?? undefined,
    attackFormula: values.attackFormula ?? "",
    damageFormula: values.damageFormula ?? "",
    damageType: values.damageType ?? undefined,
    luck: values.luck ?? undefined,
    abilityScores: scoresOf(values.abilityScores),
    keySaves: values.keySaves ?? [],
    keySkills: values.keySkills ?? [],
    notes: values.notes ?? undefined,
  };
}

function formatModifier(score: number): string {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

/**
 * Builds the NPC notes block from the parts that were actually found. Parts
 * that were not found are left out, never filled with placeholders.
 */
export function buildNpcNotes(values: NpcValues): string {
  const lines: string[] = [];
  if (values.cr) lines.push(`**CR ${values.cr}**`);
  if (values.speed) lines.push(`**Speed**: ${values.speed}`);
  if (values.attackName) {
    const detail = [values.attackFormula, values.damageFormula]
      .filter(Boolean)
      .join(", ");
    const damageType = values.damageType ? ` ${values.damageType}` : "";
    lines.push(
      `**Primary Attack**: ${values.attackName}${detail ? ` (${detail}${damageType})` : ""}`,
    );
  }
  const scores = values.abilityScores;
  if (scores) {
    const parts = ABILITY_KEYS.flatMap((key) => {
      const score = scores[key];
      if (typeof score !== "number") return [];
      return [`${key.toUpperCase()} ${score} (${formatModifier(score)})`];
    });
    if (parts.length > 0) lines.push(`**Abilities**: ${parts.join(", ")}`);
  }
  if (values.keySaves?.length) {
    lines.push(`**Key Saves**: ${values.keySaves.join(", ")}`);
  }
  if (values.keySkills?.length) {
    lines.push(`**Key Skills**: ${values.keySkills.join(", ")}`);
  }
  if (values.notes) lines.push(`\n${values.notes}`);
  return lines.join("\n");
}
