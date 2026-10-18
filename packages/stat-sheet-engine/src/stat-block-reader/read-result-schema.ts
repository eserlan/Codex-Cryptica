import { z } from "zod";

/** Accepts "13" as 13, leaves anything else for the schema to judge. */
const intLike = z.preprocess(
  (value) =>
    typeof value === "string" && /^\s*[+-]?\d+\s*$/.test(value)
      ? Number(value)
      : value,
  z.number().int(),
);

/** Accepts a bare number (CR 5) as text. */
const textLike = z.preprocess(
  (value) => (typeof value === "number" ? String(value) : value),
  z.string(),
);

const num = intLike.nullable().optional();
const text = textLike.nullable().optional();
const textList = z.array(textLike).nullable().optional();

export const SIZE_VALUES = [
  "Tiny",
  "Small",
  "Medium",
  "Large",
  "Huge",
  "Gargantuan",
] as const;

const abilityScoresSchema = z
  .object({
    str: num,
    dex: num,
    con: num,
    int: num,
    wis: num,
    cha: num,
  })
  .nullable()
  .optional();

const namedTextSchema = z.object({
  name: z.string(),
  description: text,
});

const actionSchema = z.object({
  name: z.string(),
  attackFormula: text,
  damageFormula: text,
  description: text,
});

const legendarySchema = z.object({
  name: z.string(),
  cost: num,
  description: text,
});

export const CreatureValuesSchema = z.object({
  size: text,
  creatureType: text,
  subtype: text,
  alignment: text,
  cr: text,
  proficiencyBonus: num,
  doom: num,
  ac: num,
  acDetails: text,
  hp: num,
  hitDice: text,
  speed: text,
  abilityScores: abilityScoresSchema,
  saveProficiencies: textList,
  skillProficiencies: textList,
  damageVulnerabilities: textList,
  damageResistances: textList,
  damageImmunities: textList,
  conditionImmunities: textList,
  senses: text,
  languages: text,
  traits: z.array(namedTextSchema).nullable().optional(),
  actions: z.array(actionSchema).nullable().optional(),
  bonusActions: z.array(actionSchema).nullable().optional(),
  reactions: z.array(actionSchema).nullable().optional(),
  legendaryActions: z.array(legendarySchema).nullable().optional(),
});

export const NpcValuesSchema = z.object({
  cr: text,
  ac: num,
  hp: num,
  hitDice: text,
  speed: text,
  attackName: text,
  attackBonus: num,
  attackFormula: text,
  damageFormula: text,
  damageType: text,
  luck: num,
  abilityScores: abilityScoresSchema,
  keySaves: textList,
  keySkills: textList,
  notes: text,
});

export const FieldNoteSchema = z.object({
  path: z.string().min(1),
  state: z.enum(["check", "converted", "derived"]),
  reason: z.enum([
    "uncertain",
    "malformed",
    "not-in-source",
    "out-of-range",
    "unmarked-change",
    "converted",
    "from-cr",
  ]),
  source: z.string().nullable().optional(),
  original: z.string().nullable().optional(),
});

export const LeftoverSchema = z.object({
  label: z.string().min(1),
  text: z.string(),
});

export const CandidateSchema = z.object({
  name: z.string().min(1),
  index: z.number().int(),
});
