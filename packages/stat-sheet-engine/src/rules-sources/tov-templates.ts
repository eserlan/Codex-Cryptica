import {
  type StatSheetTemplate,
  type StatSheetField,
  TOV_SYSTEM_ID,
} from "schema";

export const TOV_CHARACTER_TEMPLATE_ID = "builtin-tov-character" as const;
export const TOV_NPC_TEMPLATE_ID = "builtin-tov-npc" as const;
export const TOV_MONSTER_TEMPLATE_ID = "builtin-tov-monster" as const;

/**
 * Action table columns for ToV character attacks.
 */
const TOV_ATTACK_TABLE_COLUMNS: NonNullable<StatSheetField["columns"]> = [
  { id: "name", label: "Name", type: "text" },
  { id: "attack", label: "Attack", type: "dice", formula: "1d20+0" },
  { id: "damage", label: "Damage", type: "dice", formula: "1d6+0" },
  { id: "type", label: "Damage Type", type: "text" },
  { id: "description", label: "Notes / Range", type: "text" },
];

/**
 * Action table columns for ToV creature actions, bonus actions, and reactions.
 */
const TOV_CREATURE_ACTION_COLUMNS: NonNullable<StatSheetField["columns"]> = [
  { id: "name", label: "Name", type: "text" },
  { id: "attack", label: "Attack / Save", type: "dice", formula: "1d20+0" },
  { id: "damage", label: "Damage", type: "dice", formula: "1d6+0" },
  { id: "description", label: "Description", type: "text" },
];

/**
 * Row shape for Legendary Actions in ToV.
 */
const TOV_LEGENDARY_ACTION_COLUMNS: NonNullable<StatSheetField["columns"]> = [
  { id: "name", label: "Name", type: "text" },
  { id: "cost", label: "Cost", type: "number" },
  { id: "description", label: "Description", type: "text" },
];

/**
 * Full Tales of the Valiant hero character sheet.
 * Models BFRD Lineage, Heritage, Background, Class/Subclass, Level, Talents,
 * Luck Points (1-5 pool), ability checks, saves, skills, and structured attacks.
 */
export const TOV_CHARACTER_TEMPLATE: StatSheetTemplate = {
  id: TOV_CHARACTER_TEMPLATE_ID,
  name: "ToV Character",
  description:
    "Tales of the Valiant hero sheet — Lineage, Heritage, Talents, Luck pool, ability scores, saves, skills, and structured attacks.",
  category: "character",
  systemId: TOV_SYSTEM_ID,
  isBuiltIn: true,
  fields: [
    { id: "sec_identity", label: "Identity & Heritage", type: "heading" },
    { id: "lineage", label: "Lineage", type: "text" },
    { id: "heritage", label: "Heritage", type: "text" },
    { id: "background", label: "Background", type: "text" },
    { id: "class", label: "Class & Subclass", type: "text" },
    { id: "level", label: "Level", type: "number" },
    { id: "proficiency_bonus", label: "Proficiency Bonus", type: "number" },

    { id: "sec_vitals", label: "Vitals & Defences", type: "heading" },
    { id: "hp", label: "Hit Points", type: "counter", min: 0, max: 100 },
    { id: "ac", label: "Armor Class", type: "number" },
    { id: "speed", label: "Speed", type: "text" },
    { id: "hit_dice", label: "Hit Dice", type: "text" },
    { id: "luck", label: "Luck Points", type: "counter", min: 0, max: 5 },

    { id: "sec_scores", label: "Ability Scores", type: "heading" },
    { id: "str_score", label: "STR", type: "number" },
    { id: "dex_score", label: "DEX", type: "number" },
    { id: "con_score", label: "CON", type: "number" },
    { id: "int_score", label: "INT", type: "number" },
    { id: "wis_score", label: "WIS", type: "number" },
    { id: "cha_score", label: "CHA", type: "number" },

    { id: "sec_abilities", label: "Ability Checks", type: "heading" },
    {
      id: "str",
      label: "STR Check",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "str_score",
    },
    {
      id: "dex",
      label: "DEX Check",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "dex_score",
    },
    {
      id: "con",
      label: "CON Check",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "con_score",
    },
    {
      id: "int",
      label: "INT Check",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "int_score",
    },
    {
      id: "wis",
      label: "WIS Check",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "wis_score",
    },
    {
      id: "cha",
      label: "CHA Check",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "cha_score",
    },

    { id: "sec_saves", label: "Saving Throws", type: "heading" },
    {
      id: "str_save",
      label: "STR Save",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "str_score",
    },
    {
      id: "dex_save",
      label: "DEX Save",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "dex_score",
    },
    {
      id: "con_save",
      label: "CON Save",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "con_score",
    },
    {
      id: "int_save",
      label: "INT Save",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "int_score",
    },
    {
      id: "wis_save",
      label: "WIS Save",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "wis_score",
    },
    {
      id: "cha_save",
      label: "CHA Save",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "cha_score",
    },

    { id: "sec_skills", label: "Skills", type: "heading" },
    {
      id: "acrobatics",
      label: "Acrobatics",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "dex_score",
    },
    {
      id: "animal_handling",
      label: "Animal Handling",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "wis_score",
    },
    {
      id: "arcana",
      label: "Arcana",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "int_score",
    },
    {
      id: "athletics",
      label: "Athletics",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "str_score",
    },
    {
      id: "deception",
      label: "Deception",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "cha_score",
    },
    {
      id: "history",
      label: "History",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "int_score",
    },
    {
      id: "insight",
      label: "Insight",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "wis_score",
    },
    {
      id: "intimidation",
      label: "Intimidation",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "cha_score",
    },
    {
      id: "investigation",
      label: "Investigation",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "int_score",
    },
    {
      id: "medicine",
      label: "Medicine",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "wis_score",
    },
    {
      id: "nature",
      label: "Nature",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "int_score",
    },
    {
      id: "perception",
      label: "Perception",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "wis_score",
    },
    {
      id: "performance",
      label: "Performance",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "cha_score",
    },
    {
      id: "persuasion",
      label: "Persuasion",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "cha_score",
    },
    {
      id: "religion",
      label: "Religion",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "int_score",
    },
    {
      id: "sleight_of_hand",
      label: "Sleight of Hand",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "dex_score",
    },
    {
      id: "stealth",
      label: "Stealth",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "dex_score",
    },
    {
      id: "survival",
      label: "Survival",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "wis_score",
    },

    { id: "sec_combat", label: "Combat & Attacks", type: "heading" },
    {
      id: "attacks",
      label: "Attacks & Weapons",
      type: "item-table",
      columns: TOV_ATTACK_TABLE_COLUMNS,
      rows: [],
      linkVaultItems: false,
    },
    { id: "conditions", label: "Conditions & Buffs", type: "text" },

    { id: "sec_talents", label: "Talents & Lineage Traits", type: "heading" },
    {
      id: "talents",
      label: "Talents (Martial, Magic, Technical)",
      type: "longtext",
    },
    { id: "features", label: "Class & Subclass Features", type: "longtext" },
    {
      id: "lineage_traits",
      label: "Lineage & Heritage Traits",
      type: "longtext",
    },
  ],
};

/**
 * Lightweight ToV NPC quick-stats template.
 */
export const TOV_NPC_TEMPLATE: StatSheetTemplate = {
  id: TOV_NPC_TEMPLATE_ID,
  name: "ToV NPC",
  description:
    "Lightweight quick-stats block for Tales of the Valiant NPCs with Luck and quick attack.",
  category: "npc",
  systemId: TOV_SYSTEM_ID,
  isBuiltIn: true,
  fields: [
    { id: "hp", label: "Hit Points", type: "counter", min: 0, max: 100 },
    { id: "ac", label: "Armor Class", type: "number" },
    { id: "luck", label: "Luck Points", type: "counter", min: 0, max: 5 },
    { id: "atk", label: "Attack Roll", type: "dice", formula: "1d20+3" },
    { id: "damage", label: "Damage Roll", type: "dice", formula: "1d6+2" },
    { id: "notes", label: "Quick Stats & Traits", type: "longtext" },
  ],
};

/**
 * Full BFRD creature/monster stat-sheet template.
 * Includes size, creature type, CR, defences, Doom points, saves, senses,
 * traits, structured actions, bonus actions, reactions, and legendary actions.
 */
export const TOV_MONSTER_TEMPLATE: StatSheetTemplate = {
  id: TOV_MONSTER_TEMPLATE_ID,
  name: "ToV Monster",
  description:
    "Full BFRD creature stat block — size, type, CR, defences, Doom points, saves, senses, traits, and structured actions.",
  category: "npc",
  systemId: TOV_SYSTEM_ID,
  isBuiltIn: true,
  fields: [
    { id: "sec_identity", label: "Identity", type: "heading" },
    { id: "size", label: "Size", type: "text" },
    { id: "creature_type", label: "Creature Type", type: "text" },
    { id: "subtype", label: "Subtype / Qualifiers", type: "text" },
    { id: "alignment", label: "Alignment", type: "text" },
    { id: "cr", label: "Challenge Rating", type: "text" },
    { id: "proficiency_bonus", label: "Proficiency Bonus", type: "number" },
    { id: "doom", label: "Doom Points", type: "counter", min: 0, max: 10 },

    { id: "sec_defence", label: "Defence & Movement", type: "heading" },
    { id: "ac", label: "Armor Class", type: "number" },
    { id: "ac_details", label: "AC Source / Details", type: "text" },
    { id: "hp", label: "Hit Points", type: "counter", min: 0, max: 200 },
    { id: "hit_dice", label: "Hit Point Maximum / Hit Dice", type: "text" },
    { id: "speed", label: "Speed", type: "text" },

    { id: "sec_scores", label: "Ability Scores", type: "heading" },
    { id: "str_score", label: "STR", type: "number" },
    { id: "dex_score", label: "DEX", type: "number" },
    { id: "con_score", label: "CON", type: "number" },
    { id: "int_score", label: "INT", type: "number" },
    { id: "wis_score", label: "WIS", type: "number" },
    { id: "cha_score", label: "CHA", type: "number" },

    { id: "sec_saves", label: "Saving Throws", type: "heading" },
    {
      id: "str_save",
      label: "STR Save",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "str_score",
    },
    {
      id: "dex_save",
      label: "DEX Save",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "dex_score",
    },
    {
      id: "con_save",
      label: "CON Save",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "con_score",
    },
    {
      id: "int_save",
      label: "INT Save",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "int_score",
    },
    {
      id: "wis_save",
      label: "WIS Save",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "wis_score",
    },
    {
      id: "cha_save",
      label: "CHA Save",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "cha_score",
    },

    { id: "sec_skills", label: "Skills", type: "heading" },
    {
      id: "perception",
      label: "Perception",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "wis_score",
    },
    {
      id: "stealth",
      label: "Stealth",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "dex_score",
    },
    {
      id: "athletics",
      label: "Athletics",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "str_score",
    },
    {
      id: "arcana",
      label: "Arcana",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "int_score",
    },
    {
      id: "insight",
      label: "Insight",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "wis_score",
    },
    {
      id: "persuasion",
      label: "Persuasion",
      type: "dice",
      formula: "1d20+0",
      modifierSource: "cha_score",
    },
    { id: "other_skills", label: "Other Skills", type: "text" },
    { id: "passive_perception", label: "Passive Perception", type: "number" },

    {
      id: "sec_defences_senses",
      label: "Defences, Senses & Languages",
      type: "heading",
    },
    {
      id: "damage_vulnerabilities",
      label: "Damage Vulnerabilities",
      type: "text",
    },
    { id: "damage_resistances", label: "Damage Resistances", type: "text" },
    { id: "damage_immunities", label: "Damage Immunities", type: "text" },
    {
      id: "condition_immunities",
      label: "Condition Immunities",
      type: "text",
    },
    { id: "senses", label: "Senses", type: "text" },
    { id: "languages", label: "Languages", type: "text" },

    { id: "sec_traits", label: "Traits & Spellcasting", type: "heading" },
    { id: "traits", label: "Traits / Special Abilities", type: "longtext" },
    {
      id: "spellcasting",
      label: "Spellcasting / Innate Spellcasting",
      type: "longtext",
    },

    { id: "sec_actions", label: "Actions", type: "heading" },
    { id: "multiattack", label: "Multiattack", type: "text" },
    {
      id: "actions",
      label: "Actions",
      type: "item-table",
      columns: TOV_CREATURE_ACTION_COLUMNS,
      rows: [],
      linkVaultItems: false,
    },

    {
      id: "sec_bonus_reactions",
      label: "Bonus Actions & Reactions",
      type: "heading",
    },
    {
      id: "bonus_actions",
      label: "Bonus Actions",
      type: "item-table",
      columns: TOV_CREATURE_ACTION_COLUMNS,
      rows: [],
      linkVaultItems: false,
    },
    {
      id: "reactions",
      label: "Reactions",
      type: "item-table",
      columns: TOV_CREATURE_ACTION_COLUMNS,
      rows: [],
      linkVaultItems: false,
    },

    {
      id: "sec_legendary",
      label: "Legendary & Lair Actions",
      type: "heading",
    },
    {
      id: "legendary_actions_intro",
      label: "Legendary Action Usage",
      type: "text",
    },
    {
      id: "legendary_actions",
      label: "Legendary Actions",
      type: "item-table",
      columns: TOV_LEGENDARY_ACTION_COLUMNS,
      rows: [],
      linkVaultItems: false,
    },
    {
      id: "lair_actions",
      label: "Lair Actions / Regional Effects",
      type: "longtext",
    },
  ],
};

export const TOV_TEMPLATES: readonly StatSheetTemplate[] = [
  TOV_CHARACTER_TEMPLATE,
  TOV_NPC_TEMPLATE,
  TOV_MONSTER_TEMPLATE,
];
