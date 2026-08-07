/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";

vi.mock("$app/paths", () => ({ base: "" }));

vi.mock("./vault-registry.svelte", () => ({
  vaultRegistry: { activeVaultId: "vault-1" },
}));

vi.mock("./stat-sheet-templates.svelte", () => ({
  statSheetTemplates: {
    getDefaultPresentationTemplateId: () => null,
    setDefaultPresentationTemplate: vi.fn(),
  },
}));

vi.mock("../utils/idb", () => {
  const store = new Map<string, unknown>();
  return {
    getDB: vi.fn().mockResolvedValue({
      put: vi.fn().mockImplementation(async (table: string, val: any) => {
        store.set(`${table}_${val.id}`, val);
        return val.id;
      }),
      delete: vi.fn().mockImplementation(async (table: string, id: string) => {
        store.delete(`${table}_${id}`);
      }),
      getAllFromIndex: vi.fn().mockResolvedValue([]),
    }),
  };
});

import { PresentationTemplateStore } from "./presentation-templates.svelte";

function makeStore() {
  return new PresentationTemplateStore({
    uuid: vi.fn(() => `id-${Math.random()}`),
  });
}

describe("PresentationTemplateStore.saveTemplate name uniqueness", () => {
  it("provides a generated NPC or monster presentation for creature sheets", () => {
    const store = makeStore();

    const available = store.availableTemplatesForSchema(
      "entity-local-stat-sheet:dire-wolf",
      [{ id: "hp", label: "Hit Points", type: "counter" }],
      "creature",
    );

    expect(available[0]).toMatchObject({
      name: "Standard NPC / Monster Sheet",
      isBuiltIn: true,
      source: expect.stringContaining("### NPC / Monster Sheet"),
    });
    expect(available[0]?.source).toContain(":::stat-group columns=4");
    expect(available).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Standard Form" }),
        expect.objectContaining({ name: "Compact Stat Block" }),
      ]),
    );
  });

  it("provides character sheets with both character and NPC presentation options", () => {
    const store = makeStore();

    const available = store.availableTemplatesForSchema(
      "entity-local-stat-sheet:hero",
      [{ id: "hp", label: "Hit Points", type: "counter" }],
      "character",
    );

    expect(available).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Standard Character Sheet",
          isBuiltIn: true,
          source: expect.stringContaining("### Character Sheet"),
        }),
        expect.objectContaining({
          name: "Standard NPC / Monster Sheet",
          isBuiltIn: true,
          source: expect.stringContaining("{{stat.hp}}"),
        }),
      ]),
    );
    expect(available[0]?.source).toContain(":::stat-group columns=3");
  });

  it("generates both reusable character and NPC layouts for a stat schema", () => {
    const store = makeStore();

    const layouts = store.generatedLayoutsForSchema("schema-1", [
      { id: "hp", label: "Hit Points", type: "counter" },
    ]);

    expect(layouts.map((layout) => layout.name)).toEqual([
      "Standard Character Sheet",
      "Standard NPC / Monster Sheet",
    ]);
  });

  it("auto-suffixes a new template whose name collides with an existing one for the same schema", async () => {
    const store = makeStore();
    const first = await store.saveTemplate({
      schemaTemplateId: "schema-1",
      name: "My Layout",
      source: "",
      formatVersion: 1,
    });
    const second = await store.saveTemplate({
      schemaTemplateId: "schema-1",
      name: "My Layout",
      source: "",
      formatVersion: 1,
    });

    expect(first?.name).toBe("My Layout");
    expect(second?.name).toBe("My Layout (2)");
  });

  it("does not suffix a same-named template for a different schema", async () => {
    const store = makeStore();
    await store.saveTemplate({
      schemaTemplateId: "schema-1",
      name: "My Layout",
      source: "",
      formatVersion: 1,
    });
    const other = await store.saveTemplate({
      schemaTemplateId: "schema-2",
      name: "My Layout",
      source: "",
      formatVersion: 1,
    });

    expect(other?.name).toBe("My Layout");
  });

  it("does not suffix when re-saving an existing template under its own unchanged name", async () => {
    const store = makeStore();
    const created = await store.saveTemplate({
      schemaTemplateId: "schema-1",
      name: "My Layout",
      source: "one",
      formatVersion: 1,
    });
    const resaved = await store.saveTemplate({
      id: created!.id,
      schemaTemplateId: "schema-1",
      name: "My Layout",
      source: "two",
      formatVersion: 1,
    });

    expect(resaved?.id).toBe(created?.id);
    expect(resaved?.name).toBe("My Layout");
    expect(resaved?.source).toBe("two");
  });
});
