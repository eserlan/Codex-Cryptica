import { z } from "zod";
import { TOV_SYSTEM_ID } from "schema";

export const TovAbilityScoresSchema = z.object({
  str: z.number().int().min(1).max(30),
  dex: z.number().int().min(1).max(30),
  con: z.number().int().min(1).max(30),
  int: z.number().int().min(1).max(30),
  wis: z.number().int().min(1).max(30),
  cha: z.number().int().min(1).max(30),
});

export const TovQuickNpcMechanicsSchema = z.object({
  cr: z.string().min(1),
  ac: z.number().int().min(1),
  hp: z.number().int().min(1),
  hitDice: z.string().min(1),
  speed: z.string().default("30 ft."),
  attackName: z.string().min(1),
  attackBonus: z.number().int(),
  attackFormula: z.string().regex(/^\d*d\d+(\s*[+-]\s*\d+)?$/i),
  damageFormula: z.string().regex(/^\d*d\d+(\s*[+-]\s*\d+)?$/i),
  damageType: z.string().default("bludgeoning"),
  luck: z.number().int().min(0).max(5).default(0),
  abilityScores: TovAbilityScoresSchema,
  keySaves: z.array(z.string()).default([]),
  keySkills: z.array(z.string()).default([]),
  notes: z.string().default(""),
  isHomebrew: z.boolean().default(false),
});

export const TovCreatureActionSchema = z.object({
  name: z.string().min(1),
  attackFormula: z.string().optional(),
  damageFormula: z.string().optional(),
  description: z.string().min(1),
  isHomebrew: z.boolean().optional(),
});

export const TovCreatureMechanicsSchema = z.object({
  size: z.enum(["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"]),
  creatureType: z.string().min(1),
  subtype: z.string().optional(),
  alignment: z.string().default("unaligned"),
  cr: z.string().min(1),
  proficiencyBonus: z.number().int().min(2),
  doom: z.number().int().min(0).max(10).default(0),
  ac: z.number().int().min(1),
  acDetails: z.string().optional(),
  hp: z.number().int().min(1),
  hitDice: z.string().min(1),
  speed: z.string().min(1),
  abilityScores: TovAbilityScoresSchema,
  saveProficiencies: z.array(z.string()).default([]),
  skillProficiencies: z.array(z.string()).default([]),
  damageVulnerabilities: z.array(z.string()).default([]),
  damageResistances: z.array(z.string()).default([]),
  damageImmunities: z.array(z.string()).default([]),
  conditionImmunities: z.array(z.string()).default([]),
  senses: z.string().default("passive Perception 10"),
  languages: z.string().default("—"),
  traits: z
    .array(
      z.object({
        name: z.string().min(1),
        description: z.string().min(1),
        isHomebrew: z.boolean().optional(),
      }),
    )
    .default([]),
  actions: z.array(TovCreatureActionSchema).min(1),
  bonusActions: z.array(TovCreatureActionSchema).default([]),
  reactions: z.array(TovCreatureActionSchema).default([]),
  legendaryActions: z
    .array(
      z.object({
        name: z.string().min(1),
        cost: z.number().int().min(1).default(1),
        description: z.string().min(1),
      }),
    )
    .default([]),
  isHomebrew: z.boolean().default(false),
});

export const TovMagicItemMechanicsSchema = z.object({
  rarity: z.enum([
    "Common",
    "Uncommon",
    "Rare",
    "Very Rare",
    "Legendary",
    "Artifact",
  ]),
  category: z.enum([
    "Weapon",
    "Armor",
    "Shield",
    "Wondrous Item",
    "Potion",
    "Ring",
    "Rod",
    "Scroll",
    "Staff",
    "Wand",
  ]),
  attunement: z.boolean().default(false),
  attunementRequirement: z.string().optional(),
  activationAction: z
    .enum(["Action", "Bonus Action", "Reaction", "Minute", "Passive"])
    .default("Passive"),
  charges: z.number().int().min(1).optional(),
  rechargeRate: z.string().optional(),
  savingThrowDc: z.number().int().min(1).optional(),
  rulesText: z.string().min(1),
  isHomebrew: z.boolean().default(false),
});

export const GeneratorMechanicsBundleSchema = z.discriminatedUnion("kind", [
  z.object({
    systemId: z.literal(TOV_SYSTEM_ID),
    kind: z.literal("tov-quick-npc"),
    isHomebrew: z.boolean().default(false),
    homebrewNotice: z.string().optional(),
    data: TovQuickNpcMechanicsSchema,
  }),
  z.object({
    systemId: z.literal(TOV_SYSTEM_ID),
    kind: z.literal("tov-creature"),
    isHomebrew: z.boolean().default(false),
    homebrewNotice: z.string().optional(),
    data: TovCreatureMechanicsSchema,
  }),
  z.object({
    systemId: z.literal(TOV_SYSTEM_ID),
    kind: z.literal("tov-magic-item"),
    isHomebrew: z.boolean().default(false),
    homebrewNotice: z.string().optional(),
    data: TovMagicItemMechanicsSchema,
  }),
]);

export type GeneratorMechanicsBundle = z.infer<
  typeof GeneratorMechanicsBundleSchema
>;
export type TovQuickNpcMechanics = z.infer<typeof TovQuickNpcMechanicsSchema>;
export type TovCreatureMechanics = z.infer<typeof TovCreatureMechanicsSchema>;
export type TovMagicItemMechanics = z.infer<typeof TovMagicItemMechanicsSchema>;
