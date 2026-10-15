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
  | { kind: "tov-magic-item"; [key: string]: unknown };

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
  const summaryLines: string[] = [];
  if (data.cr) summaryLines.push(`**CR ${data.cr}**`);
  if (data.speed) summaryLines.push(`**Speed**: ${data.speed}`);
  if (data.attackName) {
    summaryLines.push(
      `**Primary Attack**: ${data.attackName} (${data.attackFormula}, ${data.damageFormula} ${data.damageType ?? ""})`.trim(),
    );
  }
  if (data.abilityScores) {
    const scores = data.abilityScores;
    summaryLines.push(
      `**Abilities**: STR ${scores.str} (${formatModifier(abilityModifier(scores.str))}), DEX ${scores.dex} (${formatModifier(abilityModifier(scores.dex))}), CON ${scores.con} (${formatModifier(abilityModifier(scores.con))}), INT ${scores.int} (${formatModifier(abilityModifier(scores.int))}), WIS ${scores.wis} (${formatModifier(abilityModifier(scores.wis))}), CHA ${scores.cha} (${formatModifier(abilityModifier(scores.cha))})`,
    );
  }
  if (data.keySaves?.length) {
    summaryLines.push(`**Key Saves**: ${data.keySaves.join(", ")}`);
  }
  if (data.keySkills?.length) {
    summaryLines.push(`**Key Skills**: ${data.keySkills.join(", ")}`);
  }
  if (data.notes) {
    summaryLines.push(`\n${data.notes}`);
  }

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

  return {
    templateId: TOV_NPC_TEMPLATE_ID,
    fields,
  };
}

function mapCharacter(data: TovCharacterData): StatSheet {
  const scores = data.abilityScores;
  const pb = data.proficiencyBonus;
  const saveProfs = new Set(
    (data.saveProficiencies ?? []).map((s) => s.toLowerCase()),
  );
  const skillProfs = new Set(
    (data.skillProficiencies ?? []).map((s) =>
      s.toLowerCase().replace(/[\s-]+/g, "_"),
    ),
  );

  const fields: StatSheetField[] = TOV_CHARACTER_TEMPLATE.fields.map((f) => {
    switch (f.id) {
      case "lineage":
        return { ...f, value: data.lineage };
      case "heritage":
        return { ...f, value: data.heritage };
      case "background":
        return { ...f, value: data.background };
      case "class":
        return {
          ...f,
          value: data.subclass
            ? `${data.className} (${data.subclass})`
            : data.className,
        };
      case "level":
        return { ...f, value: data.level };
      case "proficiency_bonus":
        return { ...f, value: pb };
      case "hp":
        return {
          ...f,
          value: data.hp,
          min: 0,
          max: Math.max(f.max ?? 100, data.hp),
        };
      case "ac":
        return { ...f, value: data.ac };
      case "speed":
        return { ...f, value: data.speed };
      case "hit_dice":
        return { ...f, value: data.hitDice };
      case "luck":
        return { ...f, value: data.luck ?? 0 };
      case "attacks":
        return {
          ...f,
          rows: (data.attacks ?? []).map((atk) => ({
            name: atk.name,
            attack: atk.attackFormula,
            damage: atk.damageFormula,
            type: atk.type ?? "",
            description: atk.description ?? "",
          })),
        };
      case "talents":
        return { ...f, value: (data.talents ?? []).join("\n\n") };
      case "features":
        return { ...f, value: (data.features ?? []).join("\n\n") };
      case "lineage_traits":
        return { ...f, value: (data.lineageTraits ?? []).join("\n\n") };
      default:
        break;
    }

    // Ability scores: str_score, dex_score, etc.
    if (f.id.endsWith("_score")) {
      const key = f.id.replace("_score", "") as keyof TovAbilityScoresData;
      if (scores[key] !== undefined) {
        return { ...f, value: scores[key] };
      }
    }

    // Ability checks: str, dex, etc.
    if (ABILITY_KEYS.includes(f.id as keyof TovAbilityScoresData)) {
      const key = f.id as keyof TovAbilityScoresData;
      const mod = abilityModifier(scores[key]);
      return {
        ...f,
        formula: formatRollFormula(mod),
        modifierSource: `${key}_score`,
      };
    }

    // Saving throws: str_save, dex_save, etc.
    if (f.id.endsWith("_save")) {
      const key = f.id.replace("_save", "") as keyof TovAbilityScoresData;
      if (scores[key] !== undefined) {
        const mod = abilityModifier(scores[key]);
        const isProf = saveProfs.has(key);
        const saveMod = mod + (isProf ? pb : 0);
        return {
          ...f,
          formula: formatRollFormula(saveMod),
          modifierSource: `${key}_score`,
        };
      }
    }

    // Skills
    if (SKILL_ABILITY_MAP[f.id]) {
      const attrKey = SKILL_ABILITY_MAP[f.id];
      const mod = abilityModifier(scores[attrKey]);
      const isProf =
        skillProfs.has(f.id) ||
        skillProfs.has(f.label.toLowerCase().replace(/[\s-]+/g, "_"));
      const skillMod = mod + (isProf ? pb : 0);
      return {
        ...f,
        formula: formatRollFormula(skillMod),
        modifierSource: `${attrKey}_score`,
      };
    }

    return { ...f };
  });

  return {
    templateId: TOV_CHARACTER_TEMPLATE_ID,
    fields,
  };
}

function mapCreature(data: TovCreatureData): StatSheet {
  const scores = data.abilityScores;
  const pb = data.proficiencyBonus;
  const saveProfs = new Set(
    (data.saveProficiencies ?? []).map((s) => s.toLowerCase()),
  );
  const skillProfs = new Set(
    (data.skillProficiencies ?? []).map((s) =>
      s.toLowerCase().replace(/[\s-]+/g, "_"),
    ),
  );

  const fields: StatSheetField[] = TOV_MONSTER_TEMPLATE.fields.map((f) => {
    switch (f.id) {
      case "size":
        return { ...f, value: data.size };
      case "creature_type":
        return { ...f, value: data.creatureType };
      case "subtype":
        return { ...f, value: data.subtype ?? "" };
      case "alignment":
        return { ...f, value: data.alignment ?? "unaligned" };
      case "cr":
        return { ...f, value: data.cr };
      case "proficiency_bonus":
        return { ...f, value: pb };
      case "doom":
        return { ...f, value: data.doom ?? 0 };
      case "ac":
        return { ...f, value: data.ac };
      case "ac_details":
        return { ...f, value: data.acDetails ?? "" };
      case "hp":
        return {
          ...f,
          value: data.hp,
          min: 0,
          max: Math.max(f.max ?? 200, data.hp),
        };
      case "hit_dice":
        return { ...f, value: data.hitDice };
      case "speed":
        return { ...f, value: data.speed };
      case "damage_vulnerabilities":
        return {
          ...f,
          value: (data.damageVulnerabilities ?? []).join(", "),
        };
      case "damage_resistances":
        return { ...f, value: (data.damageResistances ?? []).join(", ") };
      case "damage_immunities":
        return { ...f, value: (data.damageImmunities ?? []).join(", ") };
      case "condition_immunities":
        return {
          ...f,
          value: (data.conditionImmunities ?? []).join(", "),
        };
      case "senses":
        return { ...f, value: data.senses ?? "" };
      case "languages":
        return { ...f, value: data.languages ?? "—" };
      case "traits":
        return {
          ...f,
          value: (data.traits ?? [])
            .map((t) => `**${t.name}**. ${t.description}`)
            .join("\n\n"),
        };
      case "actions":
        return {
          ...f,
          rows: (data.actions ?? []).map((a) => ({
            name: a.name,
            attack: a.attackFormula ?? "—",
            damage: a.damageFormula ?? "—",
            description: a.description,
          })),
        };
      case "bonus_actions":
        return {
          ...f,
          rows: (data.bonusActions ?? []).map((a) => ({
            name: a.name,
            attack: a.attackFormula ?? "—",
            damage: a.damageFormula ?? "—",
            description: a.description,
          })),
        };
      case "reactions":
        return {
          ...f,
          rows: (data.reactions ?? []).map((a) => ({
            name: a.name,
            attack: a.attackFormula ?? "—",
            damage: a.damageFormula ?? "—",
            description: a.description,
          })),
        };
      case "legendary_actions":
        return {
          ...f,
          rows: (data.legendaryActions ?? []).map((la) => ({
            name: la.name,
            cost: la.cost ?? 1,
            description: la.description,
          })),
        };
      default:
        break;
    }

    // Ability scores: str_score, dex_score, etc.
    if (f.id.endsWith("_score")) {
      const key = f.id.replace("_score", "") as keyof TovAbilityScoresData;
      if (scores[key] !== undefined) {
        return { ...f, value: scores[key] };
      }
    }

    // Saving throws: str_save, dex_save, etc.
    if (f.id.endsWith("_save")) {
      const key = f.id.replace("_save", "") as keyof TovAbilityScoresData;
      if (scores[key] !== undefined) {
        const mod = abilityModifier(scores[key]);
        const isProf = saveProfs.has(key);
        const saveMod = mod + (isProf ? pb : 0);
        return {
          ...f,
          formula: formatRollFormula(saveMod),
          modifierSource: `${key}_score`,
        };
      }
    }

    // Skills on creature sheet
    if (SKILL_ABILITY_MAP[f.id]) {
      const attrKey = SKILL_ABILITY_MAP[f.id];
      const mod = abilityModifier(scores[attrKey]);
      const isProf =
        skillProfs.has(f.id) ||
        skillProfs.has(f.label.toLowerCase().replace(/[\s-]+/g, "_"));
      const skillMod = mod + (isProf ? pb : 0);
      return {
        ...f,
        formula: formatRollFormula(skillMod),
        modifierSource: `${attrKey}_score`,
      };
    }

    return { ...f };
  });

  return {
    templateId: TOV_MONSTER_TEMPLATE_ID,
    fields,
  };
}
