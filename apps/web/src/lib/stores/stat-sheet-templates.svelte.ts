import { getDB } from "../utils/idb";
import type { StatSheetTemplate, StatSheetField } from "schema";
import { vaultRegistry } from "./vault-registry.svelte";
import { type IdGenerator, systemIdGenerator } from "$lib/utils/runtime-deps";
import { importTemplatePackage } from "@codex/stat-sheet-engine";
import type { PublicTemplatePackage } from "schema";

export const BUILT_IN_STAT_SHEET_TEMPLATES: StatSheetTemplate[] = [
  {
    id: "builtin-dnd-character",
    name: "D&D Character",
    description:
      "Hit points, armor class, ability checks, saves, and skill rolls for D&D-style play.",
    category: "character",
    isBuiltIn: true,
    fields: [
      { id: "hp", label: "Hit Points", type: "counter", min: 0, max: 100 },
      { id: "ac", label: "Armor Class", type: "number" },
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
      { id: "sec_combat", label: "Combat", type: "heading" },
      { id: "atk", label: "Attack Roll", type: "dice", formula: "1d20+5" },
      { id: "conditions", label: "Conditions", type: "text" },
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
        id: "persuasion",
        label: "Persuasion",
        type: "dice",
        formula: "1d20+0",
        modifierSource: "cha_score",
      },
    ],
  },
  {
    id: "builtin-dnd-npc",
    name: "D&D NPC",
    description: "Lightweight quick-stats block for NPCs and monsters.",
    category: "npc",
    isBuiltIn: true,
    fields: [
      { id: "hp", label: "Hit Points", type: "counter", min: 0, max: 100 },
      { id: "ac", label: "Armor Class", type: "number" },
      { id: "atk", label: "Attack Roll", type: "dice", formula: "1d20+3" },
    ],
  },
  {
    id: "builtin-pathfinder-character",
    name: "Pathfinder Character",
    description:
      "Ability checks, saves, HP, AC, and skill rolls for Pathfinder-style play.",
    category: "character",
    isBuiltIn: true,
    fields: [
      { id: "hp", label: "Hit Points", type: "counter", min: 0, max: 100 },
      { id: "ac", label: "Armor Class", type: "number" },
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
        id: "fort",
        label: "Fortitude",
        type: "dice",
        formula: "1d20+2",
        modifierSource: "con_score",
      },
      {
        id: "reflex",
        label: "Reflex",
        type: "dice",
        formula: "1d20+2",
        modifierSource: "dex_score",
      },
      {
        id: "will",
        label: "Will",
        type: "dice",
        formula: "1d20+2",
        modifierSource: "wis_score",
      },
      { id: "sec_combat", label: "Combat", type: "heading" },
      { id: "atk", label: "Attack Roll", type: "dice", formula: "1d20+5" },
      { id: "conditions", label: "Conditions", type: "text" },
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
      { id: "feats", label: "Feats & Abilities", type: "longtext" },
    ],
  },
  {
    id: "builtin-vampire-character",
    name: "World of Darkness / Vampire",
    description:
      "Attributes, dice-pool rolls, Willpower, Blood Pool/Hunger, and Disciplines for personal-horror play.",
    category: "character",
    isBuiltIn: true,
    fields: [
      { id: "willpower", label: "Willpower", type: "counter", min: 0, max: 10 },
      {
        id: "blood",
        label: "Blood Pool / Hunger",
        type: "counter",
        min: 0,
        max: 10,
      },
      { id: "humanity", label: "Humanity", type: "counter", min: 0, max: 10 },
      { id: "sec_attributes", label: "Attributes", type: "heading" },
      { id: "strength", label: "Strength", type: "number" },
      { id: "dexterity", label: "Dexterity", type: "number" },
      { id: "stamina", label: "Stamina", type: "number" },
      { id: "charisma", label: "Charisma", type: "number" },
      { id: "manipulation", label: "Manipulation", type: "number" },
      { id: "composure", label: "Composure", type: "number" },
      { id: "intelligence", label: "Intelligence", type: "number" },
      { id: "wits", label: "Wits", type: "number" },
      { id: "resolve", label: "Resolve", type: "number" },
      { id: "sec_rolls", label: "Rolls", type: "heading" },
      {
        id: "dice_pool",
        label: "Dice Pool Roll (d10s)",
        type: "dice",
        formula: "5d10",
      },
      { id: "sec_disciplines", label: "Disciplines & Powers", type: "heading" },
      { id: "disciplines", label: "Disciplines", type: "longtext" },
      { id: "conditions", label: "Conditions", type: "text" },
    ],
  },
  {
    id: "builtin-cyberpunk-character",
    name: "Cyberpunk",
    description:
      "Stats, skill checks, Humanity, and cyberware loadout for high-tech, low-life play.",
    category: "character",
    isBuiltIn: true,
    fields: [
      { id: "hp", label: "Hit Points", type: "counter", min: 0, max: 100 },
      { id: "armor", label: "Armor SP", type: "number" },
      { id: "humanity", label: "Humanity", type: "counter", min: 0, max: 100 },
      { id: "sec_stats", label: "Stats", type: "heading" },
      { id: "int", label: "INT", type: "number" },
      { id: "ref", label: "REF", type: "number" },
      { id: "dex", label: "DEX", type: "number" },
      { id: "tech", label: "TECH", type: "number" },
      { id: "cool", label: "COOL", type: "number" },
      { id: "will", label: "WILL", type: "number" },
      { id: "luck", label: "LUCK", type: "number" },
      { id: "body", label: "BODY", type: "number" },
      { id: "emp", label: "EMP", type: "number" },
      { id: "sec_combat", label: "Combat", type: "heading" },
      { id: "atk", label: "Weapon Attack", type: "dice", formula: "1d10+3" },
      { id: "damage", label: "Weapon Damage", type: "dice", formula: "2d6" },
      {
        id: "skill_check",
        label: "Skill Check",
        type: "dice",
        formula: "1d10+0",
      },
      { id: "sec_cyberware", label: "Cyberware", type: "heading" },
      { id: "cyberware", label: "Cyberware Loadout", type: "longtext" },
    ],
  },
  {
    id: "builtin-mythras-character",
    name: "Mythras",
    description:
      "Characteristics, derived attributes, hit locations, and d100 roll-under skills for Mythras / BRP-style play.",
    category: "character",
    isBuiltIn: true,
    fields: [
      { id: "ap", label: "Action Points", type: "counter", min: 0, max: 5 },
      { id: "lp", label: "Luck Points", type: "counter", min: 0, max: 10 },
      { id: "mp", label: "Magic Points", type: "counter", min: 0, max: 30 },
      { id: "hp", label: "Total Hit Points", type: "counter", min: 0, max: 50 },
      { id: "damage_mod", label: "Damage Modifier", type: "text" },
      { id: "initiative", label: "Initiative Bonus", type: "number" },
      { id: "move", label: "Movement (m)", type: "number" },
      { id: "healing_rate", label: "Healing Rate", type: "number" },
      { id: "xp_mod", label: "Experience Modifier", type: "number" },
      { id: "sec_characteristics", label: "Characteristics", type: "heading" },
      { id: "str", label: "STR", type: "number" },
      { id: "con", label: "CON", type: "number" },
      { id: "siz", label: "SIZ", type: "number" },
      { id: "dex", label: "DEX", type: "number" },
      { id: "int", label: "INT", type: "number" },
      { id: "pow", label: "POW", type: "number" },
      { id: "cha", label: "CHA", type: "number" },
      {
        id: "sec_hit_locations",
        label: "Hit Locations & Armor",
        type: "heading",
      },
      { id: "loc_head_ap", label: "Head AP (Armor)", type: "number" },
      { id: "loc_head_hp", label: "Head HP", type: "counter", min: 0, max: 20 },
      { id: "loc_chest_ap", label: "Chest AP (Armor)", type: "number" },
      {
        id: "loc_chest_hp",
        label: "Chest HP",
        type: "counter",
        min: 0,
        max: 20,
      },
      { id: "loc_abdomen_ap", label: "Abdomen AP (Armor)", type: "number" },
      {
        id: "loc_abdomen_hp",
        label: "Abdomen HP",
        type: "counter",
        min: 0,
        max: 20,
      },
      { id: "loc_rarm_ap", label: "Right Arm AP (Armor)", type: "number" },
      {
        id: "loc_rarm_hp",
        label: "Right Arm HP",
        type: "counter",
        min: 0,
        max: 20,
      },
      { id: "loc_larm_ap", label: "Left Arm AP (Armor)", type: "number" },
      {
        id: "loc_larm_hp",
        label: "Left Arm HP",
        type: "counter",
        min: 0,
        max: 20,
      },
      { id: "loc_rleg_ap", label: "Right Leg AP (Armor)", type: "number" },
      {
        id: "loc_rleg_hp",
        label: "Right Leg HP",
        type: "counter",
        min: 0,
        max: 20,
      },
      { id: "loc_lleg_ap", label: "Left Leg AP (Armor)", type: "number" },
      {
        id: "loc_lleg_hp",
        label: "Left Leg HP",
        type: "counter",
        min: 0,
        max: 20,
      },
      { id: "sec_skills", label: "Skills & Combat", type: "heading" },
      { id: "d100_check", label: "d100 Check", type: "dice", formula: "1d100" },
      {
        id: "athletics",
        label: "Athletics (d100)",
        type: "dice",
        formula: "1d100",
      },
      { id: "brawn", label: "Brawn (d100)", type: "dice", formula: "1d100" },
      { id: "evade", label: "Evade (d100)", type: "dice", formula: "1d100" },
      {
        id: "insight",
        label: "Insight (d100)",
        type: "dice",
        formula: "1d100",
      },
      {
        id: "perception",
        label: "Perception (d100)",
        type: "dice",
        formula: "1d100",
      },
      {
        id: "stealth",
        label: "Stealth (d100)",
        type: "dice",
        formula: "1d100",
      },
      {
        id: "willpower",
        label: "Willpower (d100)",
        type: "dice",
        formula: "1d100",
      },
      { id: "passions_cults", label: "Passions & Cults", type: "longtext" },
      {
        id: "weapons_table",
        label: "Weapons & Equipment",
        type: "item-table",
        columns: [
          { id: "name", label: "Weapon", type: "text" },
          { id: "size", label: "Size/Force", type: "text" },
          { id: "reach", label: "Reach", type: "text" },
          { id: "damage", label: "Damage", type: "dice" },
          { id: "ap", label: "AP", type: "number" },
          { id: "hp", label: "HP", type: "counter" },
        ],
        rows: [
          {
            name: "War Hammer",
            size: "M",
            reach: "S",
            damage: "1d6+2+1d2",
            ap: 6,
            hp: { value: 8, max: 8 },
          },
          {
            name: "Heater Shield",
            size: "L",
            reach: "S",
            damage: "1d4+1d2",
            ap: 6,
            hp: { value: 12, max: 12 },
          },
          {
            name: "Unarmed",
            size: "S",
            reach: "T",
            damage: "1d3+1d2",
            ap: 0,
            hp: { value: 0, max: 0 },
          },
        ],
      },
    ],
  },
  {
    id: "builtin-mythras-npc",
    name: "Mythras Creature / NPC",
    description:
      "Stat block for Mythras NPCs, monsters, and creatures with action points, hit locations, attacks, and creature traits.",
    category: "npc",
    isBuiltIn: true,
    fields: [
      { id: "ap", label: "Action Points", type: "counter", min: 0, max: 5 },
      { id: "mp", label: "Magic Points", type: "counter", min: 0, max: 30 },
      { id: "hp", label: "Total Hit Points", type: "counter", min: 0, max: 50 },
      { id: "damage_mod", label: "Damage Modifier", type: "text" },
      { id: "initiative", label: "Initiative Bonus", type: "number" },
      { id: "move", label: "Movement (m)", type: "number" },
      { id: "sec_characteristics", label: "Characteristics", type: "heading" },
      { id: "str", label: "STR", type: "number" },
      { id: "con", label: "CON", type: "number" },
      { id: "siz", label: "SIZ", type: "number" },
      { id: "dex", label: "DEX", type: "number" },
      { id: "int", label: "INT", type: "number" },
      { id: "pow", label: "POW", type: "number" },
      { id: "cha", label: "CHA", type: "number" },
      {
        id: "sec_hit_locations",
        label: "Hit Locations & Armor",
        type: "heading",
      },
      { id: "loc_head_ap", label: "Head AP (Armor)", type: "number" },
      { id: "loc_head_hp", label: "Head HP", type: "counter", min: 0, max: 20 },
      { id: "loc_chest_ap", label: "Chest AP (Armor)", type: "number" },
      {
        id: "loc_chest_hp",
        label: "Chest HP",
        type: "counter",
        min: 0,
        max: 20,
      },
      { id: "loc_abdomen_ap", label: "Abdomen AP (Armor)", type: "number" },
      {
        id: "loc_abdomen_hp",
        label: "Abdomen HP",
        type: "counter",
        min: 0,
        max: 20,
      },
      {
        id: "loc_rarm_ap",
        label: "Right Arm / Foreleg AP",
        type: "number",
      },
      {
        id: "loc_rarm_hp",
        label: "Right Arm / Foreleg HP",
        type: "counter",
        min: 0,
        max: 20,
      },
      {
        id: "loc_larm_ap",
        label: "Left Arm / Foreleg AP",
        type: "number",
      },
      {
        id: "loc_larm_hp",
        label: "Left Arm / Foreleg HP",
        type: "counter",
        min: 0,
        max: 20,
      },
      {
        id: "loc_rleg_ap",
        label: "Right Leg / Hindleg AP",
        type: "number",
      },
      {
        id: "loc_rleg_hp",
        label: "Right Leg / Hindleg HP",
        type: "counter",
        min: 0,
        max: 20,
      },
      {
        id: "loc_lleg_ap",
        label: "Left Leg / Hindleg AP",
        type: "number",
      },
      {
        id: "loc_lleg_hp",
        label: "Left Leg / Hindleg HP",
        type: "counter",
        min: 0,
        max: 20,
      },
      { id: "sec_combat", label: "Attacks & Creature Traits", type: "heading" },
      { id: "d100_check", label: "d100 Check", type: "dice", formula: "1d100" },
      { id: "evade", label: "Evade (d100)", type: "dice", formula: "1d100" },
      {
        id: "perception",
        label: "Perception (d100)",
        type: "dice",
        formula: "1d100",
      },
      { id: "attacks", label: "Attacks & Combat Styles", type: "longtext" },
      {
        id: "traits",
        label: "Creature Traits & Special Abilities",
        type: "longtext",
      },
    ],
  },
  {
    id: "builtin-ship",
    name: "Ship Systems",
    description: "Hull, shields, and crew tracking for vessels.",
    category: "ship",
    isBuiltIn: true,
    fields: [
      { id: "hull", label: "Hull", type: "counter", min: 0, max: 100 },
      { id: "shields", label: "Shields", type: "counter", min: 0, max: 100 },
      { id: "crew", label: "Crew", type: "number" },
      { id: "cargo", label: "Cargo", type: "text" },
    ],
  },
  {
    id: "builtin-settlement",
    name: "Settlement Overview",
    description: "Population, prosperity, and defenses for a settlement.",
    category: "location",
    isBuiltIn: true,
    fields: [
      { id: "population", label: "Population", type: "number" },
      {
        id: "prosperity",
        label: "Prosperity",
        type: "counter",
        min: 0,
        max: 10,
      },
      { id: "defenses", label: "Defenses", type: "counter", min: 0, max: 10 },
    ],
  },
  {
    id: "builtin-item-generic",
    name: "Generic Item",
    description: "Quantity, weight, value, and charges for any item.",
    category: "item",
    isBuiltIn: true,
    fields: [
      { id: "quantity", label: "Quantity", type: "counter", min: 0, max: 999 },
      { id: "weight", label: "Weight", type: "number" },
      { id: "value", label: "Value", type: "number" },
      { id: "charges", label: "Charges", type: "counter", min: 0, max: 20 },
    ],
  },
  {
    id: "builtin-item-dnd-magic",
    name: "D&D Magic Item",
    description: "Rarity, attunement, charges, and activation roll.",
    category: "item",
    isBuiltIn: true,
    fields: [
      { id: "rarity", label: "Rarity", type: "text" },
      { id: "attunement", label: "Attunement", type: "text" },
      { id: "charges", label: "Charges", type: "counter", min: 0, max: 20 },
      {
        id: "activation",
        label: "Activation Roll",
        type: "dice",
        formula: "1d20+0",
      },
    ],
  },
  {
    id: "builtin-item-cyberpunk-gear",
    name: "Cyberpunk Gear",
    description: "Cost, availability, and EV/weight for gear and hardware.",
    category: "item",
    isBuiltIn: true,
    fields: [
      { id: "cost", label: "Cost", type: "number" },
      { id: "availability", label: "Availability", type: "text" },
      { id: "ev", label: "EV / Weight", type: "number" },
    ],
  },
  {
    id: "builtin-item-mythras-gear",
    name: "Mythras Gear",
    description:
      "Encumbrance, value, damage, reach, armor points, and traits for Mythras weapons, armor, and equipment.",
    category: "item",
    isBuiltIn: true,
    fields: [
      { id: "item_name", label: "Item Name", type: "text" },
      { id: "enc", label: "ENC", type: "number" },
      { id: "ap", label: "Armor Points (AP)", type: "number" },
      { id: "item_hp", label: "Item HP", type: "counter", min: 0, max: 30 },
      { id: "damage", label: "Damage", type: "dice", formula: "1d8" },
      { id: "reach_range", label: "Reach / Range", type: "text" },
      { id: "traits", label: "Traits / Qualities", type: "text" },
      { id: "value", label: "Value (SP)", type: "number" },
    ],
  },
];

export class StatSheetTemplateStore {
  templates = $state<StatSheetTemplate[]>([]);
  // Vault-scoped map of category id -> template id, applied automatically
  // when a new entity of that category is created.
  categoryDefaults = $state<Record<string, string>>({});
  // Vault-scoped list of enabled template IDs for active vault, or null if all enabled.
  enabledTemplateIds = $state<string[] | null>(null);
  // Vault-scoped map of schema-template id -> default presentation-template
  // id (152-stat-sheet-templates). Stored the same way as categoryDefaults
  // rather than as a field on the StatSheetTemplate record itself, since
  // built-in schema templates (BUILT_IN_STAT_SHEET_TEMPLATES) are plain
  // hardcoded objects, not IDB records, and this way works uniformly for
  // both built-in and vault-owned schema templates.
  presentationDefaults = $state<Record<string, string>>({});
  // Caches the in-flight/completed init() *promise* (not just a started
  // flag), so any caller that mutates state before the constructor's
  // fire-and-forget init() has finished can await the same load and avoid
  // a race where init() resolves later and clobbers their change.
  private _initPromise: Promise<void> | null = null;
  private idGenerator: IdGenerator;

  constructor(idGenerator: IdGenerator = systemIdGenerator) {
    this.idGenerator = idGenerator;
    if (typeof window !== "undefined") void this.init();
  }

  get allTemplates(): StatSheetTemplate[] {
    return [...BUILT_IN_STAT_SHEET_TEMPLATES, ...this.templates];
  }

  get availableTemplates(): StatSheetTemplate[] {
    if (!this.enabledTemplateIds) return this.allTemplates;
    const set = new Set(this.enabledTemplateIds);
    return this.allTemplates.filter((t) => set.has(t.id));
  }

  isTemplateEnabled(templateId: string): boolean {
    if (!this.enabledTemplateIds) return true;
    return this.enabledTemplateIds.includes(templateId);
  }

  // Best-effort, constructor-time attempt: `vaultRegistry.activeVaultId` is
  // itself hydrated asynchronously from IDB, so on a cold page load this
  // very often runs before it's set and silently no-ops (see `load`). The
  // reliable path is `loadForVault`, called explicitly once the active
  // vault is actually known (vault.svelte.ts init / vault switch), the same
  // pattern `themeStore.loadForVault` and `oracle.loadForVault` use.
  init(force = false): Promise<void> {
    if (this._initPromise && !force) return this._initPromise;
    const vaultId = vaultRegistry.activeVaultId;
    this._initPromise = vaultId ? this.load(vaultId) : Promise.resolve();
    return this._initPromise;
  }

  loadForVault(vaultId: string): Promise<void> {
    this._initPromise = this.load(vaultId);
    return this._initPromise;
  }

  private async load(vaultId: string) {
    try {
      const db = await getDB();
      const all = await db.getAllFromIndex(
        "stat_sheet_templates",
        "by-vault",
        vaultId,
      );
      this.templates = all;
      const defaults = await db.get(
        "settings",
        `statSheetCategoryDefaults_${vaultId}`,
      );
      this.categoryDefaults = defaults ?? {};
      const enabled = await db.get(
        "settings",
        `statSheetEnabledTemplates_${vaultId}`,
      );
      this.enabledTemplateIds = enabled ?? null;
      const presentationDefaults = await db.get(
        "settings",
        `statSheetPresentationDefaults_${vaultId}`,
      );
      this.presentationDefaults = presentationDefaults ?? {};
    } catch (e) {
      console.error("[StatSheetTemplateStore] Failed to load templates:", e);
    }
  }

  async toggleTemplateEnabled(templateId: string): Promise<void> {
    await this.init();
    const vaultId = vaultRegistry.activeVaultId;
    if (!vaultId) return;

    const current =
      this.enabledTemplateIds ?? this.allTemplates.map((t) => t.id);
    const set = new Set(current);
    if (set.has(templateId)) {
      set.delete(templateId);
    } else {
      set.add(templateId);
    }
    const next = Array.from(set);
    this.enabledTemplateIds = next;

    const db = await getDB();
    await db.put("settings", next, `statSheetEnabledTemplates_${vaultId}`);
  }

  async setDefaultTemplate(category: string, templateId: string | null) {
    await this.init();
    const vaultId = vaultRegistry.activeVaultId;
    if (!vaultId) return;

    const next = { ...this.categoryDefaults };
    if (templateId) {
      next[category] = templateId;
    } else {
      delete next[category];
    }
    this.categoryDefaults = next;

    const db = await getDB();
    await db.put("settings", next, `statSheetCategoryDefaults_${vaultId}`);
  }

  getDefaultPresentationTemplateId(schemaTemplateId: string): string | null {
    return this.presentationDefaults[schemaTemplateId] ?? null;
  }

  async setDefaultPresentationTemplate(
    schemaTemplateId: string,
    presentationTemplateId: string | null,
  ): Promise<void> {
    await this.init();
    const vaultId = vaultRegistry.activeVaultId;
    if (!vaultId) return;

    const next = { ...this.presentationDefaults };
    if (presentationTemplateId) {
      next[schemaTemplateId] = presentationTemplateId;
    } else {
      delete next[schemaTemplateId];
    }
    this.presentationDefaults = next;

    const db = await getDB();
    await db.put("settings", next, `statSheetPresentationDefaults_${vaultId}`);
  }

  // Structural fields for the category's default template, or null if the
  // category has no default configured (or it points at a template that no
  // longer exists). Used to auto-populate new entities on creation.
  getDefaultFieldsForCategory(category: string): StatSheetField[] | null {
    const templateId = this.categoryDefaults[category];
    if (!templateId) return null;
    const template = this.allTemplates.find((t) => t.id === templateId);
    if (!template) return null;
    return this.cloneTemplateFields(template);
  }

  async saveAsTemplate(
    name: string,
    fields: StatSheetField[],
    options: { description?: string; category?: string } = {},
  ): Promise<StatSheetTemplate | null> {
    const vaultId = vaultRegistry.activeVaultId;
    if (!vaultId) return null;

    const template: StatSheetTemplate = {
      id: `template-${this.idGenerator.uuid()}`,
      name,
      description: options.description,
      category: options.category,
      isBuiltIn: false,
      fields: fields.map(
        ({ value: _value, collapsed: _collapsed, ...rest }) => rest,
      ),
    };

    try {
      const db = await getDB();
      await db.put("stat_sheet_templates", { ...template, vaultId });
      this.templates = [...this.templates, template];
      return template;
    } catch (e) {
      console.error("[StatSheetTemplateStore] Failed to save template:", e);
      return null;
    }
  }

  async importPublicTemplate(
    pkg: PublicTemplatePackage,
    options: { name?: string; replaceId?: string } = {},
  ): Promise<StatSheetTemplate | null> {
    await this.init();
    const vaultId = vaultRegistry.activeVaultId;
    if (!vaultId) return null;
    const name = options.name?.trim() || pkg.template.name;
    const existing = this.templates.find(
      (template) => template.name.trim().toLowerCase() === name.toLowerCase(),
    );
    if (existing && !options.replaceId) return null;
    const imported = importTemplatePackage(pkg, {
      id: `template-${this.idGenerator.uuid()}`,
      name,
    });
    try {
      const db = await getDB();
      const tx = db.transaction("stat_sheet_templates", "readwrite");
      if (existing && options.replaceId === existing.id)
        await tx.store.delete(existing.id);
      await tx.store.put({ ...imported, vaultId });
      await tx.done;
      this.templates =
        existing && options.replaceId === existing.id
          ? this.templates.map((template) =>
              template.id === existing.id ? imported : template,
            )
          : [...this.templates, imported];
      return imported;
    } catch (e) {
      console.error("[StatSheetTemplateStore] Failed to import template:", e);
      return null;
    }
  }

  async deleteTemplate(id: string): Promise<boolean> {
    try {
      const db = await getDB();
      await db.delete("stat_sheet_templates", id);
      this.templates = this.templates.filter((t) => t.id !== id);
      return true;
    } catch (e) {
      console.error("[StatSheetTemplateStore] Failed to delete template:", e);
      return false;
    }
  }

  async renameTemplate(id: string, name: string): Promise<boolean> {
    const vaultId = vaultRegistry.activeVaultId;
    const existing = this.templates.find((t) => t.id === id);
    if (!vaultId || !existing) return false;

    const updated: StatSheetTemplate = { ...$state.snapshot(existing), name };
    try {
      const db = await getDB();
      await db.put("stat_sheet_templates", { ...updated, vaultId });
      this.templates = this.templates.map((t) => (t.id === id ? updated : t));
      return true;
    } catch (e) {
      console.error("[StatSheetTemplateStore] Failed to rename template:", e);
      return false;
    }
  }

  async updateTemplateFields(
    id: string,
    fields: StatSheetField[],
  ): Promise<boolean> {
    const vaultId = vaultRegistry.activeVaultId;
    const existing = this.templates.find((t) => t.id === id);
    if (!vaultId || !existing) return false;

    const updated: StatSheetTemplate = {
      ...$state.snapshot(existing),
      fields: fields.map(
        ({ value: _value, collapsed: _collapsed, ...rest }) => rest,
      ),
    };
    try {
      const db = await getDB();
      await db.put("stat_sheet_templates", { ...updated, vaultId });
      this.templates = this.templates.map((t) => (t.id === id ? updated : t));
      return true;
    } catch (e) {
      console.error(
        "[StatSheetTemplateStore] Failed to update template fields:",
        e,
      );
      return false;
    }
  }

  // Preserves each field's template-defined id (e.g. "hp", "ac") so
  // presentation templates that reference those ids keep resolving after
  // the template is applied to an entity. Only regenerates an id if it
  // would collide with one already present on the target entity (relevant
  // when appending onto an existing stat sheet).
  cloneTemplateFields(
    template: StatSheetTemplate,
    existingFields: StatSheetField[] = [],
  ): StatSheetField[] {
    const usedIds = new Set(existingFields.map((f) => f.id));
    return template.fields.map((f) => {
      const id = usedIds.has(f.id) ? `field-${this.idGenerator.uuid()}` : f.id;
      usedIds.add(id);
      return {
        ...f,
        id,
        // Counters (HP, MP, AP, etc.) start full rather than at the implicit
        // zero default — a freshly-applied template shouldn't read as "dead".
        ...(f.type === "counter" && f.max !== undefined
          ? { value: f.max }
          : null),
      };
    });
  }
}

// Guards against duplicate module instances under Vite HMR (a module can get
// hot-reloaded while other already-loaded importers still hold a reference
// to the old instance) — the same pattern `themeStore` uses. Without this,
// one importer's write and another's read can silently land on two
// different instances, e.g. a category default persisting to IDB correctly
// but never showing up in the Settings UI.
const STAT_SHEET_TEMPLATE_STORE_KEY = "__codex_stat_sheet_template_store__";
export const statSheetTemplates: StatSheetTemplateStore =
  (globalThis as any)[STAT_SHEET_TEMPLATE_STORE_KEY] ??
  ((globalThis as any)[STAT_SHEET_TEMPLATE_STORE_KEY] =
    new StatSheetTemplateStore());
