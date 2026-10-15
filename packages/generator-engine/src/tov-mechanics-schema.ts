import { z } from "zod";
import { TOV_SYSTEM_ID } from "schema";

export const TovAbilityScoresSchema = z.object({
  str: z.coerce.number().int().min(1).max(30).default(10),
  dex: z.coerce.number().int().min(1).max(30).default(10),
  con: z.coerce.number().int().min(1).max(30).default(10),
  int: z.coerce.number().int().min(1).max(30).default(10),
  wis: z.coerce.number().int().min(1).max(30).default(10),
  cha: z.coerce.number().int().min(1).max(30).default(10),
});

export const TovQuickNpcMechanicsSchema = z.object({
  cr: z.string().min(1).default("1/2"),
  ac: z.coerce.number().int().min(1).default(12),
  hp: z.coerce.number().int().min(1).default(15),
  hitDice: z.string().min(1).default("3d8+3"),
  speed: z.string().default("30 ft."),
  attackName: z.string().min(1).default("Dagger"),
  attackBonus: z.coerce.number().int().default(3),
  attackFormula: z.string().default("1d20+3"),
  damageFormula: z.string().default("1d4+1"),
  damageType: z.string().default("piercing"),
  luck: z.coerce.number().int().min(0).max(5).default(0),
  abilityScores: TovAbilityScoresSchema.default({
    str: 10,
    dex: 12,
    con: 12,
    int: 10,
    wis: 10,
    cha: 10,
  }),
  keySaves: z.array(z.string()).default([]),
  keySkills: z.array(z.string()).default([]),
  notes: z.string().default(""),
  isHomebrew: z.boolean().default(false),
});

export const TovCharacterAttackSchema = z.object({
  name: z.string().min(1),
  attackFormula: z.string().default("1d20+0"),
  damageFormula: z.string().default("1d6+0"),
  type: z.string().default("slashing"),
  description: z.string().optional(),
});

export const TovCharacterMechanicsSchema = z.object({
  lineage: z.string().min(1).default("Human"),
  heritage: z.string().min(1).default("Cosmopolitan"),
  background: z.string().min(1).default("Outlander"),
  className: z.string().min(1).default("Fighter"),
  subclass: z.string().optional(),
  level: z.coerce.number().int().min(1).max(20).default(1),
  proficiencyBonus: z.coerce.number().int().min(2).default(2),
  ac: z.coerce.number().int().min(1).default(10),
  hp: z.coerce.number().int().min(1).default(10),
  hitDice: z.string().min(1).default("1d10"),
  speed: z.string().default("30 ft."),
  luck: z.coerce.number().int().min(0).max(5).default(0),
  abilityScores: TovAbilityScoresSchema.default({
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
  }),
  saveProficiencies: z.array(z.string()).default([]),
  skillProficiencies: z.array(z.string()).default([]),
  attacks: z.array(TovCharacterAttackSchema).default([]),
  talents: z.array(z.string()).default([]),
  features: z.array(z.string()).default([]),
  lineageTraits: z.array(z.string()).default([]),
  spellSlots: z.record(z.string(), z.number()).optional(),
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
  size: z
    .enum(["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"])
    .default("Medium"),
  creatureType: z.string().min(1).default("Beast"),
  subtype: z.string().optional(),
  alignment: z.string().default("unaligned"),
  cr: z.string().min(1).default("1"),
  proficiencyBonus: z.coerce.number().int().min(2).default(2),
  doom: z.coerce.number().int().min(0).max(10).default(0),
  ac: z.coerce.number().int().min(1).default(12),
  acDetails: z.string().optional(),
  hp: z.coerce.number().int().min(1).default(22),
  hitDice: z.string().min(1).default("4d8+4"),
  speed: z.string().min(1).default("30 ft."),
  abilityScores: TovAbilityScoresSchema.default({
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
  }),
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
  actions: z.array(TovCreatureActionSchema).default([]),
  bonusActions: z.array(TovCreatureActionSchema).default([]),
  reactions: z.array(TovCreatureActionSchema).default([]),
  legendaryActions: z
    .array(
      z.object({
        name: z.string().min(1),
        cost: z.coerce.number().int().min(1).default(1),
        description: z.string().min(1),
      }),
    )
    .default([]),
  isHomebrew: z.boolean().default(false),
});

export const TovMagicItemMechanicsSchema = z.object({
  rarity: z
    .enum(["Common", "Uncommon", "Rare", "Very Rare", "Legendary", "Artifact"])
    .default("Common"),
  category: z
    .enum([
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
    ])
    .default("Wondrous Item"),
  attunement: z.boolean().default(false),
  attunementRequirement: z.string().optional(),
  activationAction: z
    .enum(["Action", "Bonus Action", "Reaction", "Minute", "Passive"])
    .default("Passive"),
  charges: z.coerce.number().int().min(1).optional(),
  rechargeRate: z.string().optional(),
  savingThrowDc: z.coerce.number().int().min(1).optional(),
  rulesText: z.string().min(1).default(""),
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
    kind: z.literal("tov-character"),
    isHomebrew: z.boolean().default(false),
    homebrewNotice: z.string().optional(),
    data: TovCharacterMechanicsSchema,
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
export type TovAbilityScores = z.infer<typeof TovAbilityScoresSchema>;
export type TovQuickNpcMechanics = z.infer<typeof TovQuickNpcMechanicsSchema>;
export type TovCharacterMechanics = z.infer<typeof TovCharacterMechanicsSchema>;
export type TovCharacterAttack = z.infer<typeof TovCharacterAttackSchema>;
export type TovCreatureAction = z.infer<typeof TovCreatureActionSchema>;
export type TovCreatureMechanics = z.infer<typeof TovCreatureMechanicsSchema>;
export type TovMagicItemMechanics = z.infer<typeof TovMagicItemMechanicsSchema>;
