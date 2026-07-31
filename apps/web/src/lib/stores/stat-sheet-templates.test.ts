import { describe, it, expect, beforeEach, vi } from "vitest";
import type { StatSheetField } from "schema";
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

  it("includes a built-in template for each supported system", () => {
    const ids = BUILT_IN_STAT_SHEET_TEMPLATES.map((t) => t.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "builtin-dnd-character",
        "builtin-dnd-npc",
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
    });
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

  it("assigns fresh, non-colliding ids when cloning — so appending two templates that share field ids (e.g. two 'hp' fields) never produces duplicates", () => {
    const dnd = BUILT_IN_STAT_SHEET_TEMPLATES.find(
      (t) => t.id === "builtin-dnd-character",
    )!;
    const npc = BUILT_IN_STAT_SHEET_TEMPLATES.find(
      (t) => t.id === "builtin-dnd-npc",
    )!;
    // Both templates use "hp" as their Hit Points field id.
    expect(dnd.fields.some((f) => f.id === "hp")).toBe(true);
    expect(npc.fields.some((f) => f.id === "hp")).toBe(true);

    const appended = [
      ...store.cloneTemplateFields(dnd),
      ...store.cloneTemplateFields(npc),
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

  it("enables and disables all templates with setAllTemplatesEnabled", async () => {
    await store.setAllTemplatesEnabled(false);

    expect(store.enabledTemplateIds).toEqual([]);
    expect(store.availableTemplates).toEqual([]);

    await store.setAllTemplatesEnabled(true);

    expect(store.availableTemplates.length).toBe(store.allTemplates.length);
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
