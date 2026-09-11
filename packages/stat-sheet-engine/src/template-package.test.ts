import { describe, expect, it } from "vitest";
import {
  validateTemplatePackage,
  projectTemplatePackage,
} from "./template-package";
import {
  privateDataTemplatePackage,
  validTemplatePackage,
} from "./__fixtures__/template-packages";

describe("template package", () => {
  it("accepts a value-free package and preserves field order", () => {
    const parsed = validateTemplatePackage(validTemplatePackage);
    expect(parsed.template.fields.map((field) => field.id)).toEqual([
      "section",
      "hp",
      "attack",
    ]);
  });

  it("rejects private or unknown field values", () => {
    expect(() => validateTemplatePackage(privateDataTemplatePackage)).toThrow();
  });

  it("requires a system or controlled category", () => {
    expect(() =>
      validateTemplatePackage({
        ...validTemplatePackage,
        template: {
          ...validTemplatePackage.template,
          system: undefined,
          category: undefined,
        },
      }),
    ).toThrow("system or entity category");
  });

  it("projects local values and collapsed UI state out of a template", () => {
    const result = projectTemplatePackage(
      {
        id: "local",
        name: "Local",
        fields: [
          {
            id: "hp",
            label: "HP",
            type: "counter",
            value: 10,
            collapsed: true,
          },
        ],
      },
      { system: "Homebrew" },
    );
    expect(result.template.fields[0]).not.toHaveProperty("value");
    expect(result.template.fields[0]).not.toHaveProperty("collapsed");
  });

  it("projects item-table fields, column definitions, linkVaultItems, and modifierSource", () => {
    const result = projectTemplatePackage(
      {
        id: "weapons-sheet",
        name: "Weapons Sheet",
        fields: [
          {
            id: "str_check",
            label: "STR Check",
            type: "dice",
            formula: "1d20+2",
            modifierSource: "str_score",
          },
          {
            id: "weapons",
            label: "Weapons Table",
            type: "item-table",
            linkVaultItems: true,
            columns: [
              { id: "name", label: "Weapon Name", type: "text" },
              { id: "dmg", label: "Damage", type: "dice" },
            ],
          },
        ],
      },
      { system: "D&D 5e" },
    );

    expect(result.template.fields[0].modifierSource).toBe("str_score");
    expect(result.template.fields[1].type).toBe("item-table");
    expect(result.template.fields[1].linkVaultItems).toBe(true);
    expect(result.template.fields[1].columns).toEqual([
      { id: "name", label: "Weapon Name", type: "text" },
      { id: "dmg", label: "Damage", type: "dice" },
    ]);
  });

  it("surfaces specific field index and reason when field min exceeds max", () => {
    expect(() =>
      projectTemplatePackage(
        {
          id: "invalid-min-max",
          name: "Invalid Sheet",
          fields: [
            { id: "hp", label: "HP", type: "counter", min: 50, max: 10 },
          ],
        },
        { system: "Homebrew" },
      ),
    ).toThrowError("Field 1: Field minimum cannot exceed maximum");
  });

  it("surfaces specific field label and column validation failures", () => {
    expect(() =>
      projectTemplatePackage(
        {
          id: "empty-label",
          name: "Invalid Sheet",
          fields: [{ id: "f1", label: "   ", type: "text" }],
        },
        { system: "Homebrew" },
      ),
    ).toThrowError("Field 1 (label): cannot be empty");
  });

  it("falls back to default description when description is blank", () => {
    const result = projectTemplatePackage(
      {
        id: "blank-desc",
        name: "Valid Sheet",
        description: "   ",
        fields: [{ id: "hp", label: "HP", type: "counter" }],
      },
      { description: "  ", system: "Homebrew" },
    );
    expect(result.template.description).toBe("Reusable Stat Sheet layout");
  });
});
