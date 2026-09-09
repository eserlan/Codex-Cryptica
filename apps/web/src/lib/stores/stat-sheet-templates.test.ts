import { describe, it, expect, beforeEach, vi } from "vitest";
import type { StatSheetField, StatSheetTemplate } from "schema";
import { getDB } from "../utils/idb";

const { vaultRegistryState } = vi.hoisted(() => ({
  vaultRegistryState: { activeVaultId: "test-vault" as string | null },
}));

vi.mock("./vault-registry.svelte", () => ({
  vaultRegistry: {
    get activeVaultId() {
      return vaultRegistryState.activeVaultId;
    },
  },
}));

import {
  StatSheetTemplateStore,
  BUILT_IN_STAT_SHEET_TEMPLATES,
} from "./stat-sheet-templates.svelte";

describe("StatSheetTemplateStore", () => {
  let store: StatSheetTemplateStore;

  beforeEach(async () => {
    const db = await getDB();
    await db.clear("stat_sheet_templates");
    await db.delete("settings", "statSheetCategoryDefaults_test-vault");
    vaultRegistryState.activeVaultId = "test-vault";
    store = new StatSheetTemplateStore();
  });

  it("exposes the built-in templates by default", () => {
    expect(store.allTemplates).toEqual(BUILT_IN_STAT_SHEET_TEMPLATES);
  });

  it("imports a valid public template as a new local copy", async () => {
    const imported = await store.importPublicTemplate({
      schemaVersion: 1,
      template: {
        name: "Community Watch",
        description: "Shared layout",
        system: "Homebrew",
        labels: [],
        fields: [{ id: "hp", label: "HP", type: "counter" }],
      },
    });
    expect(imported?.name).toBe("Community Watch");
    expect(store.templates).toContainEqual(imported);
  });

  it("rejects a duplicate import without changing the existing template", async () => {
    await store.saveAsTemplate("Community Watch", []);
    const imported = await store.importPublicTemplate({
      schemaVersion: 1,
      template: {
        name: "Community Watch",
        description: "Shared layout",
        system: "Homebrew",
        labels: [],
        fields: [{ id: "hp", label: "HP", type: "counter" }],
      },
    });
    expect(imported).toBeNull();
    expect(
      store.templates.filter((template) => template.name === "Community Watch"),
    ).toHaveLength(1);
  });

  it("includes a built-in template for each supported system", () => {
    const ids = BUILT_IN_STAT_SHEET_TEMPLATES.map((t) => t.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "builtin-dnd-character",
        "builtin-dnd-npc",
        "builtin-dnd5e-monster",
        "builtin-pathfinder-character",
        "builtin-vampire-character",
        "builtin-cyberpunk-character",
        "builtin-mythras-character",
        "builtin-ship",
        "builtin-settlement",
        "builtin-item-generic",
        "builtin-item-dnd-magic",
        "builtin-item-cyberpunk-gear",
        "builtin-item-mythras-gear",
      ]),
    );
  });

  it("tags item templates with the real 'item' category so they surface as defaults for the Item category", () => {
    const itemTemplates = BUILT_IN_STAT_SHEET_TEMPLATES.filter((t) =>
      t.id.startsWith("builtin-item-"),
    );
    expect(itemTemplates.length).toBeGreaterThanOrEqual(3);
    for (const template of itemTemplates) {
      expect(template.category).toBe("item");
    }
  });

  it("does not include generic 'Notes' fields, since that duplicates entity lore/content", () => {
    for (const template of BUILT_IN_STAT_SHEET_TEMPLATES) {
      const notesFields = template.fields.filter(
        (f) => f.type === "longtext" && f.label === "Notes",
      );
      expect(notesFields).toHaveLength(0);
    }
  });

  it("gives ability/attribute checks and skills rollable dice fields where the system supports it", () => {
    const dnd = BUILT_IN_STAT_SHEET_TEMPLATES.find(
      (t) => t.id === "builtin-dnd-character",
    )!;
    expect(dnd.fields.find((f) => f.id === "str")).toMatchObject({
      type: "dice",
      formula: "1d20+0",
    });
    expect(dnd.fields.find((f) => f.id === "perception")).toMatchObject({
      type: "dice",
    });

    const mythras = BUILT_IN_STAT_SHEET_TEMPLATES.find(
      (t) => t.id === "builtin-mythras-character",
    )!;
    expect(mythras.fields.find((f) => f.id === "evade")).toMatchObject({
      type: "dice",
      formula: "1d100",
      label: "Evade",
    });
    expect(
      mythras.fields
        .filter((field) => field.type === "dice")
        .some((field) => field.label.includes("(d100)")),
    ).toBe(false);
    expect(mythras.fields.find((f) => f.id === "ap")).toMatchObject({
      type: "counter",
      min: 0,
      max: 5,
    });
    expect(mythras.fields.find((f) => f.id === "loc_head_ap")).toMatchObject({
      type: "number",
      label: "Head AP (Armor)",
    });
    expect(mythras.fields.find((f) => f.id === "loc_head_hp")).toMatchObject({
      type: "counter",
      label: "Head HP",
    });
    expect(mythras.fields.find((f) => f.id === "combat_styles")).toMatchObject({
      type: "longtext",
      label: "Combat Styles",
    });
    expect(
      mythras.fields.find((f) => f.id === "professional_skills"),
    ).toMatchObject({
      type: "longtext",
      label: "Professional & Magic Skills",
    });

    const mythrasGear = BUILT_IN_STAT_SHEET_TEMPLATES.find(
      (t) => t.id === "builtin-item-mythras-gear",
    )!;
    expect(mythrasGear.fields.find((f) => f.id === "damage")).toMatchObject({
      type: "dice",
      formula: "1d8",
    });
    expect(
      mythrasGear.fields.find((f) => f.id === "reach_range"),
    ).toMatchObject({
      type: "text",
      label: "Reach / Range",
    });

    const mythrasNpc = BUILT_IN_STAT_SHEET_TEMPLATES.find(
      (t) => t.id === "builtin-mythras-npc",
    )!;
    expect(mythrasNpc.category).toBe("npc");
    expect(mythrasNpc.fields.find((f) => f.id === "attacks")).toMatchObject({
      type: "longtext",
      label: "Attacks & Combat Styles",
    });
    expect(mythrasNpc.fields.find((f) => f.id === "traits")).toMatchObject({
      type: "longtext",
      label: "Creature Traits & Special Abilities",
    });
    expect(
      mythrasNpc.fields
        .filter((field) => field.type === "dice")
        .some((field) => field.label.includes("(d100)")),
    ).toBe(false);
  });

  describe("builtin-dnd5e-monster (#2873)", () => {
    const monster = BUILT_IN_STAT_SHEET_TEMPLATES.find(
      (t) => t.id === "builtin-dnd5e-monster",
    )!;
    const fieldById = (id: string) => monster.fields.find((f) => f.id === id);

    it("exists as a distinct template from the lightweight D&D NPC block", () => {
      expect(monster).toBeDefined();
      expect(monster.category).toBe("npc");
      const lightweight = BUILT_IN_STAT_SHEET_TEMPLATES.find(
        (t) => t.id === "builtin-dnd-npc",
      )!;
      expect(lightweight).toBeDefined();
      expect(lightweight.fields.length).toBeLessThan(monster.fields.length);
    });

    it("covers identity fields: size, type, subtype, alignment, CR, proficiency bonus", () => {
      expect(fieldById("size")).toMatchObject({ type: "text" });
      expect(fieldById("creature_type")).toMatchObject({ type: "text" });
      expect(fieldById("subtype")).toMatchObject({ type: "text" });
      expect(fieldById("alignment")).toMatchObject({ type: "text" });
      // Fractional CRs (1/8, 1/4, 1/2) rule out a numeric field.
      expect(fieldById("cr")).toMatchObject({ type: "text" });
      expect(fieldById("proficiency_bonus")).toMatchObject({ type: "number" });
    });

    it("makes HP a counter usable as an in-play tracker, with max/hit-dice preserved", () => {
      expect(fieldById("hp")).toMatchObject({ type: "counter", min: 0 });
      expect(fieldById("hp")!.max).toBeGreaterThan(0);
      expect(fieldById("hit_dice")).toMatchObject({ type: "text" });
      expect(fieldById("ac")).toMatchObject({ type: "number" });
      expect(fieldById("speed")).toMatchObject({ type: "text" });
      expect(fieldById("speed_modes")).toMatchObject({ type: "text" });
    });

    it("gives all six ability scores as numbers", () => {
      for (const score of [
        "str_score",
        "dex_score",
        "con_score",
        "int_score",
        "wis_score",
        "cha_score",
      ]) {
        expect(fieldById(score)).toMatchObject({ type: "number" });
      }
    });

    it("derives saving throw and skill dice rolls from ability scores via modifierSource", () => {
      expect(fieldById("str_save")).toMatchObject({
        type: "dice",
        modifierSource: "str_score",
      });
      expect(fieldById("dex_save")).toMatchObject({
        type: "dice",
        modifierSource: "dex_score",
      });
      expect(fieldById("perception")).toMatchObject({
        type: "dice",
        modifierSource: "wis_score",
      });
      expect(fieldById("passive_perception")).toMatchObject({
        type: "number",
      });
    });

    it("covers damage/condition defences, senses, and languages as plain text lists", () => {
      for (const id of [
        "damage_vulnerabilities",
        "damage_resistances",
        "damage_immunities",
        "condition_immunities",
        "senses",
        "languages",
      ]) {
        expect(fieldById(id)).toMatchObject({ type: "text" });
      }
    });

    it("preserves traits and spellcasting as editable rules text rather than rigid fields", () => {
      expect(fieldById("traits")).toMatchObject({ type: "longtext" });
      expect(fieldById("spellcasting")).toMatchObject({ type: "longtext" });
      expect(fieldById("lair_actions")).toMatchObject({ type: "longtext" });
    });

    it("keeps actions, bonus actions, reactions, and legendary actions as separate repeatable entries with rollable attack/damage formulas", () => {
      for (const id of ["actions", "bonus_actions", "reactions"]) {
        const field = fieldById(id)!;
        expect(field.type).toBe("item-table");
        expect(field.linkVaultItems).toBe(false);
        const columnIds = field.columns?.map((c) => c.id);
        expect(columnIds).toEqual(
          expect.arrayContaining(["name", "attack", "damage", "description"]),
        );
        expect(field.columns?.find((c) => c.id === "attack")).toMatchObject({
          type: "dice",
        });
        expect(field.columns?.find((c) => c.id === "damage")).toMatchObject({
          type: "dice",
        });
      }

      const legendary = fieldById("legendary_actions")!;
      expect(legendary.type).toBe("item-table");
      expect(legendary.linkVaultItems).toBe(false);
      expect(legendary.columns?.map((c) => c.id)).toEqual(
        expect.arrayContaining(["name", "cost", "description"]),
      );

      expect(fieldById("multiattack")).toMatchObject({ type: "text" });
      expect(fieldById("legendary_actions_intro")).toMatchObject({
        type: "text",
      });
    });

    it("has no generic notes field, and every longtext field has a specific label", () => {
      const notesFields = monster.fields.filter(
        (f) => f.type === "longtext" && f.label === "Notes",
      );
      expect(notesFields).toHaveLength(0);
    });
  });

  it("saves the current fields as a new vault-scoped template", async () => {
    const mockIdGenerator = { uuid: vi.fn(() => "new-id") };
    store = new StatSheetTemplateStore(mockIdGenerator);

    const saved = await store.saveAsTemplate(
      "My Custom Sheet",
      [
        { id: "hp", label: "Hit Points", type: "counter", value: 24 },
        { id: "sec", label: "Combat", type: "heading", collapsed: true },
      ],
      { category: "character" },
    );

    expect(saved?.id).toBe("template-new-id");
    expect(saved?.fields).toEqual([
      { id: "hp", label: "Hit Points", type: "counter" },
      { id: "sec", label: "Combat", type: "heading" },
    ]);

    expect(store.allTemplates).toContainEqual(
      expect.objectContaining({ name: "My Custom Sheet" }),
    );

    const db = await getDB();
    const persisted = await db.get("stat_sheet_templates", "template-new-id");
    expect(persisted?.vaultId).toBe("test-vault");
  });

  it("loads previously saved templates scoped to the active vault on init", async () => {
    const db = await getDB();
    await db.put("stat_sheet_templates", {
      id: "template-abc",
      name: "Loaded Template",
      fields: [],
      vaultId: "test-vault",
    });
    await db.put("stat_sheet_templates", {
      id: "template-other-vault",
      name: "Other Vault Template",
      fields: [],
      vaultId: "another-vault",
    });

    const newStore = new StatSheetTemplateStore();
    await newStore.init(true);

    expect(newStore.templates).toHaveLength(1);
    expect(newStore.templates[0].id).toBe("template-abc");
  });

  it("applies a template by cloning its structural fields without instance values", () => {
    const template = BUILT_IN_STAT_SHEET_TEMPLATES[0];
    const cloned = store.cloneTemplateFields(template);

    expect(cloned.map((f) => f.label)).toEqual(
      template.fields.map((f) => f.label),
    );
    expect(cloned).not.toBe(template.fields);
    cloned[0].label = "Mutated";
    expect(template.fields[0].label).not.toBe("Mutated");
  });

  it("initializes counter fields at their max value so a fresh character isn't shown as depleted", () => {
    const template: StatSheetTemplate = {
      id: "t1",
      name: "Test",
      fields: [
        { id: "hp", label: "HP", type: "counter", min: 0, max: 30 },
        { id: "ap", label: "AP", type: "counter", min: 0, max: 5 },
        { id: "notes", label: "Notes", type: "text" },
        { id: "misc", label: "Misc", type: "counter" },
      ],
    };

    const cloned = store.cloneTemplateFields(template);

    expect(cloned.find((f) => f.id !== "misc" && f.label === "HP")?.value).toBe(
      30,
    );
    expect(cloned.find((f) => f.label === "AP")?.value).toBe(5);
    expect(cloned.find((f) => f.label === "Notes")?.value).toBeUndefined();
    // A counter with no max configured has nothing sensible to default to.
    expect(cloned.find((f) => f.label === "Misc")?.value).toBeUndefined();
  });

  it("preserves the template's own field ids when cloning — so presentation templates referencing e.g. 'hp'/'ac' keep resolving after the template is applied", () => {
    const dnd = BUILT_IN_STAT_SHEET_TEMPLATES.find(
      (t) => t.id === "builtin-dnd-character",
    )!;

    const cloned = store.cloneTemplateFields(dnd);

    expect(cloned.map((f) => f.id)).toEqual(dnd.fields.map((f) => f.id));
  });

  it("assigns a fresh id only when appending would otherwise collide with an existing field — so appending two templates that share field ids (e.g. two 'hp' fields) never produces duplicates", () => {
    const dnd = BUILT_IN_STAT_SHEET_TEMPLATES.find(
      (t) => t.id === "builtin-dnd-character",
    )!;
    const npc = BUILT_IN_STAT_SHEET_TEMPLATES.find(
      (t) => t.id === "builtin-dnd-npc",
    )!;
    // Both templates use "hp" as their Hit Points field id.
    expect(dnd.fields.some((f) => f.id === "hp")).toBe(true);
    expect(npc.fields.some((f) => f.id === "hp")).toBe(true);

    const dndFields = store.cloneTemplateFields(dnd);
    const appended = [
      ...dndFields,
      ...store.cloneTemplateFields(npc, dndFields),
    ];
    const ids = appended.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("deletes a saved template", async () => {
    const saved = await store.saveAsTemplate("Temp", []);
    expect(store.templates).toHaveLength(1);

    await store.deleteTemplate(saved!.id);

    expect(store.templates).toHaveLength(0);
    const db = await getDB();
    expect(await db.get("stat_sheet_templates", saved!.id)).toBeUndefined();
  });

  it("renames a saved template", async () => {
    const saved = await store.saveAsTemplate("Old Name", []);

    await store.renameTemplate(saved!.id, "New Name");

    expect(store.templates[0].name).toBe("New Name");
    const db = await getDB();
    const persisted = await db.get("stat_sheet_templates", saved!.id);
    expect(persisted?.name).toBe("New Name");
  });

  it("does nothing when renaming a template that doesn't exist", async () => {
    const ok = await store.renameTemplate("missing-id", "New Name");
    expect(ok).toBe(false);
    expect(store.templates).toHaveLength(0);
  });

  it("returns null and does not throw when saving a template fails (e.g. IDB error)", async () => {
    const db = await getDB();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const putSpy = vi.spyOn(db, "put").mockRejectedValueOnce(new Error("boom"));

    try {
      const result = await store.saveAsTemplate("Broken", []);

      expect(result).toBeNull();
      expect(store.templates).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalled();
    } finally {
      putSpy.mockRestore();
      consoleSpy.mockRestore();
    }
  });

  it("returns false and does not throw when deleting a template fails", async () => {
    const saved = await store.saveAsTemplate("Temp", []);
    const db = await getDB();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const deleteSpy = vi
      .spyOn(db, "delete")
      .mockRejectedValueOnce(new Error("boom"));

    try {
      const ok = await store.deleteTemplate(saved!.id);

      expect(ok).toBe(false);
      expect(store.templates).toHaveLength(1);
    } finally {
      deleteSpy.mockRestore();
      consoleSpy.mockRestore();
    }
  });

  it("sets and persists a default template for a category", async () => {
    await store.setDefaultTemplate("character", "builtin-dnd-character");

    expect(store.categoryDefaults.character).toBe("builtin-dnd-character");

    const db = await getDB();
    const persisted = await db.get(
      "settings",
      "statSheetCategoryDefaults_test-vault",
    );
    expect(persisted).toEqual({ character: "builtin-dnd-character" });
  });

  it("clears a category default when set to null", async () => {
    await store.setDefaultTemplate("character", "builtin-dnd-character");
    await store.setDefaultTemplate("character", null);

    expect(store.categoryDefaults.character).toBeUndefined();
    const db = await getDB();
    const persisted = await db.get(
      "settings",
      "statSheetCategoryDefaults_test-vault",
    );
    expect(persisted).toEqual({});
  });

  it("loads persisted category defaults on init", async () => {
    const db = await getDB();
    await db.put(
      "settings",
      { npc: "builtin-dnd-npc" },
      "statSheetCategoryDefaults_test-vault",
    );

    const newStore = new StatSheetTemplateStore();
    await newStore.init(true);

    expect(newStore.categoryDefaults).toEqual({ npc: "builtin-dnd-npc" });
  });

  it("recovers persisted category defaults via loadForVault even when the constructor's own init() lost the race against vaultRegistry.activeVaultId hydration", async () => {
    // Persist a default as if set in a previous session.
    const db = await getDB();
    await db.put(
      "settings",
      { npc: "builtin-dnd-npc" },
      "statSheetCategoryDefaults_test-vault",
    );

    // Simulate a cold page load: activeVaultId is still null (vaultRegistry
    // hasn't finished hydrating from IDB yet) at the moment the store is
    // constructed, so its own fire-and-forget init() call bails out.
    vaultRegistryState.activeVaultId = null;
    const coldStore = new StatSheetTemplateStore();
    await coldStore.init();
    expect(coldStore.categoryDefaults).toEqual({});

    // vaultRegistry finishes hydrating shortly after; app code calls
    // loadForVault(id) once the real vault id is known.
    vaultRegistryState.activeVaultId = "test-vault";
    await coldStore.loadForVault("test-vault");

    expect(coldStore.categoryDefaults).toEqual({ npc: "builtin-dnd-npc" });
  });

  it("returns cloned default fields for a configured category", async () => {
    await store.setDefaultTemplate("npc", "builtin-dnd-npc");

    const fields = store.getDefaultFieldsForCategory("npc");

    expect(fields).not.toBeNull();
    expect(fields!.map((f) => f.label)).toEqual(
      BUILT_IN_STAT_SHEET_TEMPLATES.find(
        (t) => t.id === "builtin-dnd-npc",
      )!.fields.map((f) => f.label),
    );
  });

  it("returns null when the category has no default configured", () => {
    expect(store.getDefaultFieldsForCategory("item")).toBeNull();
  });

  it("returns null when the configured default template no longer exists", async () => {
    await store.setDefaultTemplate("character", "template-deleted");
    expect(store.getDefaultFieldsForCategory("character")).toBeNull();
  });

  it("toggles template applicability per vault and filters availableTemplates", async () => {
    expect(store.isTemplateEnabled("builtin-dnd-character")).toBe(true);
    expect(store.availableTemplates.length).toBe(store.allTemplates.length);

    await store.toggleTemplateEnabled("builtin-dnd-character");

    expect(store.isTemplateEnabled("builtin-dnd-character")).toBe(false);
    expect(
      store.availableTemplates.find((t) => t.id === "builtin-dnd-character"),
    ).toBeUndefined();

    const db = await getDB();
    const persisted = await db.get(
      "settings",
      "statSheetEnabledTemplates_test-vault",
    );
    expect(persisted).not.toContain("builtin-dnd-character");

    await store.toggleTemplateEnabled("builtin-dnd-character");
    expect(store.isTemplateEnabled("builtin-dnd-character")).toBe(true);
  });

  it("updates fields of a saved template via updateTemplateFields", async () => {
    const saved = await store.saveAsTemplate("My Sheet", [
      { id: "a", label: "Alpha", type: "text" },
      { id: "b", label: "Beta", type: "text" },
    ]);

    const nextFields: StatSheetField[] = [
      { id: "b", label: "Beta", type: "text" },
      { id: "a", label: "Alpha", type: "text" },
    ];

    const ok = await store.updateTemplateFields(saved!.id, nextFields);

    expect(ok).toBe(true);
    expect(store.templates[0].fields).toEqual(nextFields);
    const db = await getDB();
    const persisted = await db.get("stat_sheet_templates", saved!.id);
    expect(persisted?.fields).toEqual(nextFields);
  });
});
