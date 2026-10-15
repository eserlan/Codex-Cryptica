import type { StatSheet, StatSheetField } from "schema";
import {
  TOV_NPC_TEMPLATE_ID,
  TOV_CHARACTER_TEMPLATE_ID,
  TOV_MONSTER_TEMPLATE_ID,
  TOV_NPC_TEMPLATE,
  TOV_CHARACTER_TEMPLATE,
  TOV_MONSTER_TEMPLATE,
} from "./tov-templates";

export interface TovAbilityScoresData {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export interface TovQuickNpcData {
  cr?: string;
  ac: number;
  hp: number;
  hitDice?: string;
  speed?: string;
  attackName?: string;
  attackBonus?: number;
  attackFormula: string;
  damageFormula: string;
  damageType?: string;
  luck?: number;
  abilityScores?: TovAbilityScoresData;
  keySaves?: string[];
  keySkills?: string[];
  notes?: string;
  isHomebrew?: boolean;
}

export interface TovCharacterData {
  lineage: string;
  heritage: string;
  background: string;
  className: string;
  subclass?: string;
  level: number;
  proficiencyBonus: number;
  ac: number;
  hp: number;
  hitDice: string;
  speed: string;
  luck?: number;
  abilityScores: TovAbilityScoresData;
  saveProficiencies?: string[];
  skillProficiencies?: string[];
  attacks?: Array<{
    name: string;
    attackFormula: string;
    damageFormula: string;
    type?: string;
    description?: string;
  }>;
  talents?: string[];
  features?: string[];
  lineageTraits?: string[];
  spellSlots?: Record<string, number>;
  isHomebrew?: boolean;
}

export interface TovCreatureData {
  size: "Tiny" | "Small" | "Medium" | "Large" | "Huge" | "Gargantuan";
  creatureType: string;
  subtype?: string;
  alignment?: string;
  cr: string;
  proficiencyBonus: number;
  doom?: number;
  ac: number;
  acDetails?: string;
  hp: number;
  hitDice: string;
  speed: string;
  abilityScores: TovAbilityScoresData;
  saveProficiencies?: string[];
  skillProficiencies?: string[];
  damageVulnerabilities?: string[];
  damageResistances?: string[];
  damageImmunities?: string[];
  conditionImmunities?: string[];
  senses?: string;
  languages?: string;
  traits?: Array<{ name: string; description: string; isHomebrew?: boolean }>;
  actions?: Array<{
    name: string;
    attackFormula?: string;
    damageFormula?: string;
    description: string;
    isHomebrew?: boolean;
  }>;
  bonusActions?: Array<{
    name: string;
    attackFormula?: string;
    damageFormula?: string;
    description: string;
    isHomebrew?: boolean;
  }>;
  reactions?: Array<{
    name: string;
    attackFormula?: string;
    damageFormula?: string;
    description: string;
    isHomebrew?: boolean;
  }>;
  legendaryActions?: Array<{
    name: string;
    cost?: number;
    description: string;
  }>;
  isHomebrew?: boolean;
}

export type TovGeneratorBundle =
  | { kind: "tov-quick-npc"; data: TovQuickNpcData; [key: string]: unknown }
  | { kind: "tov-character"; data: TovCharacterData; [key: string]: unknown }
  | { kind: "tov-creature"; data: TovCreatureData; [key: string]: unknown }
  | { kind: "tov-magic-item"; [key: string]: unknown }
  | { kind: "tov-encounter"; [key: string]: unknown };

function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

function formatRollFormula(mod: number): string {
  return `1d20${formatModifier(mod)}`;
}

const ABILITY_KEYS: Array<keyof TovAbilityScoresData> = [
  "str",
  "dex",
  "con",
  "int",
  "wis",
  "cha",
];

const SKILL_ABILITY_MAP: Record<string, keyof TovAbilityScoresData> = {
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

/**
 * Transforms structured Tales of the Valiant mechanics into a native StatSheet
 * matching builtin-tov-npc, builtin-tov-character, or builtin-tov-monster.
 * Returns null if the bundle kind is not a supported stat sheet type (e.g. magic item).
 */
export function mapTovMechanicsToStatSheet(
  bundle: TovGeneratorBundle,
): StatSheet | null {
  if (!bundle || typeof bundle !== "object") return null;

  switch (bundle.kind) {
    case "tov-quick-npc":
      return mapQuickNpc(bundle.data);
    case "tov-character":
      return mapCharacter(bundle.data);
    case "tov-creature":
      return mapCreature(bundle.data);
    default:
      return null;
  }
}

function mapQuickNpc(data: TovQuickNpcData): StatSheet {
  const summaryLines = quickNpcSummary(data);
  const fields: StatSheetField[] = TOV_NPC_TEMPLATE.fields.map((f) => {
    switch (f.id) {
      case "hp":
        return {
          ...f,
          value: data.hp,
          min: 0,
          max: Math.max(f.max ?? 100, data.hp),
        };
      case "ac":
        return { ...f, value: data.ac };
      case "luck":
        return { ...f, value: data.luck ?? 0 };
      case "atk":
        return { ...f, formula: data.attackFormula };
      case "damage":
        return { ...f, formula: data.damageFormula };
      case "notes":
        return { ...f, value: summaryLines.join("\n") };
      default:
        return { ...f };
    }
  });

  return { templateId: TOV_NPC_TEMPLATE_ID, fields };
}

function quickNpcSummary(data: TovQuickNpcData): string[] {
  const summaryLines: string[] = [];
  addSummaryLine(summaryLines, data.cr, (cr) => `**CR ${cr}**`);
  addSummaryLine(summaryLines, data.speed, (speed) => `**Speed**: ${speed}`);
  addSummaryLine(summaryLines, data.attackName, (name) =>
    `**Primary Attack**: ${name} (${data.attackFormula}, ${data.damageFormula} ${data.damageType ?? ""})`.trim(),
  );
  addSummaryLine(summaryLines, data.abilityScores, formatAbilityScores);
  addSummaryLine(
    summaryLines,
    data.keySaves?.join(", "),
    (saves) => `**Key Saves**: ${saves}`,
  );
  addSummaryLine(
    summaryLines,
    data.keySkills?.join(", "),
    (skills) => `**Key Skills**: ${skills}`,
  );
  addSummaryLine(summaryLines, data.notes, (notes) => `\n${notes}`);

  return summaryLines;
}

function addSummaryLine<T>(
  lines: string[],
  value: T | undefined,
  format: (value: T) => string,
): void {
  if (value) lines.push(format(value));
}

function formatAbilityScores(scores: TovAbilityScoresData): string {
  return `**Abilities**: STR ${scores.str} (${formatModifier(abilityModifier(scores.str))}), DEX ${scores.dex} (${formatModifier(abilityModifier(scores.dex))}), CON ${scores.con} (${formatModifier(abilityModifier(scores.con))}), INT ${scores.int} (${formatModifier(abilityModifier(scores.int))}), WIS ${scores.wis} (${formatModifier(abilityModifier(scores.wis))}), CHA ${scores.cha} (${formatModifier(abilityModifier(scores.cha))})`;
}

function mapCharacter(data: TovCharacterData): StatSheet {
  const values: Record<string, Partial<StatSheetField>> = {
    lineage: { value: data.lineage },
    heritage: { value: data.heritage },
    background: { value: data.background },
    class: {
      value: data.subclass
        ? `${data.className} (${data.subclass})`
        : data.className,
    },
    level: { value: data.level },
    proficiency_bonus: { value: data.proficiencyBonus },
    ac: { value: data.ac },
    speed: { value: data.speed },
    hit_dice: { value: data.hitDice },
    luck: { value: data.luck ?? 0 },
    attacks: {
      rows: (data.attacks ?? []).map((attack) => ({
        name: attack.name,
        attack: attack.attackFormula,
        damage: attack.damageFormula,
        type: attack.type ?? "",
        description: attack.description ?? "",
      })),
    },
    talents: { value: (data.talents ?? []).join("\n\n") },
    features: { value: (data.features ?? []).join("\n\n") },
    lineage_traits: { value: (data.lineageTraits ?? []).join("\n\n") },
  };
  const proficiency = getProficiencySets(
    data.saveProficiencies,
    data.skillProficiencies,
  );

  const fields: StatSheetField[] = TOV_CHARACTER_TEMPLATE.fields.map(
    (field) => {
      if (field.id === "hp") {
        return {
          ...field,
          value: data.hp,
          min: 0,
          max: Math.max(field.max ?? 100, data.hp),
        };
      }
      if (values[field.id]) return { ...field, ...values[field.id] };
      return mapRollField(
        field,
        data.abilityScores,
        data.proficiencyBonus,
        proficiency,
        true,
      );
    },
  );

  return {
    templateId: TOV_CHARACTER_TEMPLATE_ID,
    fields,
  };
}

function mapCreature(data: TovCreatureData): StatSheet {
  const values = creatureFieldValues(data);
  const proficiency = getProficiencySets(
    data.saveProficiencies,
    data.skillProficiencies,
  );

  const fields = TOV_MONSTER_TEMPLATE.fields.map((field) =>
    mapCreatureField(field, data, values, proficiency),
  );

  return {
    templateId: TOV_MONSTER_TEMPLATE_ID,
    fields,
  };
}

function creatureFieldValues(
  data: TovCreatureData,
): Record<string, Partial<StatSheetField>> {
  return {
    ...creatureIdentityFields(data),
    ...creatureDefenseFields(data),
    ...creatureActionFields(data),
  };
}

function creatureIdentityFields(
  data: TovCreatureData,
): Record<string, Partial<StatSheetField>> {
  return {
    size: { value: data.size },
    creature_type: { value: data.creatureType },
    subtype: { value: data.subtype ?? "" },
    alignment: { value: data.alignment ?? "unaligned" },
    cr: { value: data.cr },
    proficiency_bonus: { value: data.proficiencyBonus },
    doom: { value: data.doom ?? 0 },
    ac: { value: data.ac },
    ac_details: { value: data.acDetails ?? "" },
    hit_dice: { value: data.hitDice },
    speed: { value: data.speed },
  };
}

function creatureDefenseFields(
  data: TovCreatureData,
): Record<string, Partial<StatSheetField>> {
  return {
    damage_vulnerabilities: {
      value: (data.damageVulnerabilities ?? []).join(", "),
    },
    damage_resistances: { value: (data.damageResistances ?? []).join(", ") },
    damage_immunities: { value: (data.damageImmunities ?? []).join(", ") },
    condition_immunities: {
      value: (data.conditionImmunities ?? []).join(", "),
    },
    senses: { value: data.senses ?? "" },
    languages: { value: data.languages ?? "—" },
    traits: {
      value: (data.traits ?? [])
        .map((trait) => `**${trait.name}**. ${trait.description}`)
        .join("\n\n"),
    },
  };
}

function creatureActionFields(
  data: TovCreatureData,
): Record<string, Partial<StatSheetField>> {
  return {
    actions: { rows: mapActionRows(data.actions) },
    bonus_actions: { rows: mapActionRows(data.bonusActions) },
    reactions: { rows: mapActionRows(data.reactions) },
    legendary_actions: {
      rows: (data.legendaryActions ?? []).map((action) => ({
        name: action.name,
        cost: action.cost ?? 1,
        description: action.description,
      })),
    },
  };
}

function mapCreatureField(
  field: StatSheetField,
  data: TovCreatureData,
  values: Record<string, Partial<StatSheetField>>,
  proficiency: ProficiencySets,
): StatSheetField {
  if (field.id === "hp") {
    return {
      ...field,
      value: data.hp,
      min: 0,
      max: Math.max(field.max ?? 200, data.hp),
    };
  }
  const value = values[field.id];
  if (value) return { ...field, ...value };
  return mapRollField(
    field,
    data.abilityScores,
    data.proficiencyBonus,
    proficiency,
    false,
  );
}

interface ProficiencySets {
  saves: Set<string>;
  skills: Set<string>;
}

function getProficiencySets(
  saves: string[] | undefined,
  skills: string[] | undefined,
): ProficiencySets {
  return {
    saves: new Set((saves ?? []).map((save) => save.toLowerCase())),
    skills: new Set(
      (skills ?? []).map((skill) =>
        skill.toLowerCase().replace(/[\s-]+/g, "_"),
      ),
    ),
  };
}

function mapRollField(
  field: StatSheetField,
  scores: TovAbilityScoresData,
  proficiencyBonus: number,
  proficiency: ProficiencySets,
  includeAbilityChecks: boolean,
): StatSheetField {
  return (
    mapAbilityScoreField(field, scores) ??
    mapAbilityCheckField(field, scores, includeAbilityChecks) ??
    mapSavingThrowField(field, scores, proficiencyBonus, proficiency) ??
    mapSkillField(field, scores, proficiencyBonus, proficiency) ?? { ...field }
  );
}

function mapAbilityScoreField(
  field: StatSheetField,
  scores: TovAbilityScoresData,
): StatSheetField | undefined {
  if (!field.id.endsWith("_score")) return undefined;
  const key = field.id.replace("_score", "") as keyof TovAbilityScoresData;
  return key in scores ? { ...field, value: scores[key] } : undefined;
}

function mapAbilityCheckField(
  field: StatSheetField,
  scores: TovAbilityScoresData,
  enabled: boolean,
): StatSheetField | undefined {
  const key = field.id as keyof TovAbilityScoresData;
  if (!enabled || !ABILITY_KEYS.includes(key)) return undefined;
  return {
    ...field,
    formula: formatRollFormula(abilityModifier(scores[key])),
    modifierSource: `${key}_score`,
  };
}

function mapSavingThrowField(
  field: StatSheetField,
  scores: TovAbilityScoresData,
  proficiencyBonus: number,
  proficiency: ProficiencySets,
): StatSheetField | undefined {
  if (!field.id.endsWith("_save")) return undefined;
  const key = field.id.replace("_save", "") as keyof TovAbilityScoresData;
  if (!(key in scores)) return undefined;
  const bonus = proficiency.saves.has(key) ? proficiencyBonus : 0;
  return {
    ...field,
    formula: formatRollFormula(abilityModifier(scores[key]) + bonus),
    modifierSource: undefined,
  };
}

function mapSkillField(
  field: StatSheetField,
  scores: TovAbilityScoresData,
  proficiencyBonus: number,
  proficiency: ProficiencySets,
): StatSheetField | undefined {
  const ability = SKILL_ABILITY_MAP[field.id];
  if (!ability) return undefined;
  const label = field.label.toLowerCase().replace(/[\s-]+/g, "_");
  const proficient =
    proficiency.skills.has(field.id) || proficiency.skills.has(label);
  const bonus = proficient ? proficiencyBonus : 0;
  return {
    ...field,
    formula: formatRollFormula(abilityModifier(scores[ability]) + bonus),
    modifierSource: undefined,
  };
}

type TovActionData = NonNullable<TovCreatureData["actions"]>[number];

function mapActionRows(actions: TovActionData[] | undefined) {
  return (actions ?? []).map((action) => ({
    name: action.name,
    attack: action.attackFormula ?? "—",
    damage: action.damageFormula ?? "—",
    description: action.description,
  }));
}
