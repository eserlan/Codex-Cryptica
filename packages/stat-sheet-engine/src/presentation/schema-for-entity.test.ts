import { describe, expect, it } from "vitest";
import type { StatSheetTemplate } from "schema";
import { resolveStatSheetSchema } from "./schema-for-entity";

const LOCAL_ID = "entity-local-stat-sheet:npc-1";

const mythras: StatSheetTemplate = {
  id: "tpl-mythras",
  name: "Mythras",
  fields: [
    { id: "str", label: "STR", type: "number" },
    { id: "athletics", label: "Athletics", type: "dice", formula: "1d100" },
  ],
};

describe("resolveStatSheetSchema", () => {
  it("appends a character's own fields to the bound template's vocabulary", () => {
    // The whole point: Mythras/BRP/WFRP/GURPS characters each carry a
    // different set of skills, so the template is only the starting sheet.
    const schema = resolveStatSheetSchema(
      {
        templateId: "tpl-mythras",
        fields: [
          { id: "str", label: "STR", type: "number", value: 13 },
          {
            id: "shooting_ak47",
            label: "Shooting (AK47)",
            type: "dice",
            formula: "1d100",
            value: 45,
          },
        ],
      },
      mythras,
      LOCAL_ID,
    );

    expect(schema?.fields.map((f) => f.id)).toEqual([
      "str",
      "athletics",
      "shooting_ak47",
    ]);
  });

  it("keeps the bound template's id so existing layouts still resolve", () => {
    // `isTemplateUsable` matches on `schema.id === template.schemaTemplateId`.
    // Minting an entity-local id here would drop the character back to the
    // standard renderer the moment it gained a field.
    const schema = resolveStatSheetSchema(
      {
        templateId: "tpl-mythras",
        fields: [{ id: "cow_milking", label: "Cow Milking", type: "number" }],
      },
      mythras,
      LOCAL_ID,
    );

    expect(schema?.id).toBe("tpl-mythras");
    expect(schema?.name).toBe("Mythras");
  });

  it("strips per-entity value and UI state from the appended fields", () => {
    const schema = resolveStatSheetSchema(
      {
        templateId: "tpl-mythras",
        fields: [
          {
            id: "cow_milking",
            label: "Cow Milking",
            type: "number",
            value: 62,
            collapsed: true,
            favorite: true,
            barField: true,
          },
        ],
      },
      mythras,
      LOCAL_ID,
    );

    const appended = schema?.fields.find((f) => f.id === "cow_milking");
    expect(appended).toEqual({
      id: "cow_milking",
      label: "Cow Milking",
      type: "number",
    });
  });

  it("does not duplicate a field the character shares with its template", () => {
    const schema = resolveStatSheetSchema(
      {
        templateId: "tpl-mythras",
        fields: [{ id: "str", label: "STR", type: "number", value: 13 }],
      },
      mythras,
      LOCAL_ID,
    );

    expect(schema?.fields.map((f) => f.id)).toEqual(["str", "athletics"]);
  });

  it("returns the template untouched when the character adds nothing", () => {
    const schema = resolveStatSheetSchema(
      { templateId: "tpl-mythras", fields: [] },
      mythras,
      LOCAL_ID,
    );

    expect(schema).toBe(mythras);
  });

  it("falls back to null when the bound template no longer exists", () => {
    // FR-010: the caller drops to the standard renderer rather than throwing.
    const schema = resolveStatSheetSchema(
      {
        templateId: "tpl-deleted",
        fields: [{ id: "str", label: "STR", type: "number", value: 13 }],
      },
      null,
      LOCAL_ID,
    );

    expect(schema).toBeNull();
  });

  it("synthesizes an entity-local schema for a manually assembled sheet", () => {
    const schema = resolveStatSheetSchema(
      {
        templateId: null,
        fields: [{ id: "hp", label: "HP", type: "number", value: 8 }],
      },
      null,
      LOCAL_ID,
    );

    expect(schema?.id).toBe(LOCAL_ID);
    expect(schema?.name).toBe("Custom Stat Sheet");
    expect(schema?.isBuiltIn).toBe(false);
    expect(schema?.fields).toEqual([{ id: "hp", label: "HP", type: "number" }]);
  });

  it("returns null when there is nothing to render against", () => {
    expect(resolveStatSheetSchema(null, null, LOCAL_ID)).toBeNull();
    expect(resolveStatSheetSchema(undefined, null, LOCAL_ID)).toBeNull();
    expect(
      resolveStatSheetSchema({ templateId: null, fields: [] }, null, LOCAL_ID),
    ).toBeNull();
  });
});
