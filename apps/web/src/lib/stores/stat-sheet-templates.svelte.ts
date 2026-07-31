import { getDB } from "../utils/idb";
import type { StatSheetTemplate, StatSheetField } from "schema";
import { vaultRegistry } from "./vault-registry.svelte";
import { type IdGenerator, systemIdGenerator } from "$lib/utils/runtime-deps";

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
      { id: "sec_abilities", label: "Ability Checks", type: "heading" },
      { id: "str", label: "STR Check", type: "dice", formula: "1d20+0" },
      { id: "dex", label: "DEX Check", type: "dice", formula: "1d20+0" },
      { id: "con", label: "CON Check", type: "dice", formula: "1d20+0" },
      { id: "int", label: "INT Check", type: "dice", formula: "1d20+0" },
      { id: "wis", label: "WIS Check", type: "dice", formula: "1d20+0" },
      { id: "cha", label: "CHA Check", type: "dice", formula: "1d20+0" },
      { id: "sec_combat", label: "Combat", type: "heading" },
      { id: "atk", label: "Attack Roll", type: "dice", formula: "1d20+5" },
      { id: "conditions", label: "Conditions", type: "text" },
      { id: "sec_skills", label: "Skills", type: "heading" },
      {
        id: "perception",
        label: "Perception",
        type: "dice",
        formula: "1d20+0",
      },
      { id: "stealth", label: "Stealth", type: "dice", formula: "1d20+0" },
      {
        id: "athletics",
        label: "Athletics",
        type: "dice",
        formula: "1d20+0",
      },
      {
        id: "persuasion",
        label: "Persuasion",
        type: "dice",
        formula: "1d20+0",
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
      { id: "sec_abilities", label: "Ability Checks", type: "heading" },
      { id: "str", label: "STR Check", type: "dice", formula: "1d20+0" },
      { id: "dex", label: "DEX Check", type: "dice", formula: "1d20+0" },
      { id: "con", label: "CON Check", type: "dice", formula: "1d20+0" },
      { id: "int", label: "INT Check", type: "dice", formula: "1d20+0" },
      { id: "wis", label: "WIS Check", type: "dice", formula: "1d20+0" },
      { id: "cha", label: "CHA Check", type: "dice", formula: "1d20+0" },
      { id: "sec_saves", label: "Saving Throws", type: "heading" },
      { id: "fort", label: "Fortitude", type: "dice", formula: "1d20+2" },
      { id: "reflex", label: "Reflex", type: "dice", formula: "1d20+2" },
      { id: "will", label: "Will", type: "dice", formula: "1d20+2" },
      { id: "sec_combat", label: "Combat", type: "heading" },
      { id: "atk", label: "Attack Roll", type: "dice", formula: "1d20+5" },
      { id: "conditions", label: "Conditions", type: "text" },
      { id: "sec_skills", label: "Skills", type: "heading" },
      {
        id: "perception",
        label: "Perception",
        type: "dice",
        formula: "1d20+0",
      },
      { id: "stealth", label: "Stealth", type: "dice", formula: "1d20+0" },
      {
        id: "athletics",
        label: "Athletics",
        type: "dice",
        formula: "1d20+0",
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
      { id: "loc_head", label: "Head (AP/HP)", type: "text" },
      { id: "loc_chest", label: "Chest (AP/HP)", type: "text" },
      { id: "loc_abdomen", label: "Abdomen (AP/HP)", type: "text" },
      { id: "loc_rarm", label: "Right Arm (AP/HP)", type: "text" },
      { id: "loc_larm", label: "Left Arm (AP/HP)", type: "text" },
      { id: "loc_rleg", label: "Right Leg (AP/HP)", type: "text" },
      { id: "loc_lleg", label: "Left Leg (AP/HP)", type: "text" },
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
      { id: "combat_styles", label: "Combat Styles", type: "longtext" },
      {
        id: "professional_skills",
        label: "Professional & Magic Skills",
        type: "longtext",
      },
      { id: "passions_cults", label: "Passions & Cults", type: "longtext" },
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
    } catch (e) {
      console.error("[StatSheetTemplateStore] Failed to load templates:", e);
    }
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

  // Assigns fresh instance ids rather than reusing the template's own field
  // ids, since those are only unique *within* one template — applying two
  // templates to the same entity (or the same template twice) would
  // otherwise collide and duplicate `id`s in the entity's field list.
  cloneTemplateFields(template: StatSheetTemplate): StatSheetField[] {
    return template.fields.map((f) => ({
      ...f,
      id: `field-${this.idGenerator.uuid()}`,
    }));
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
