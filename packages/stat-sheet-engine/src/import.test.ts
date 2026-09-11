import { describe, expect, it } from "vitest";
import { importTemplatePackage } from "./import";
import {
  legacyTemplatePackage,
  validTemplatePackage,
} from "./__fixtures__/template-packages";

describe("importTemplatePackage", () => {
  it("preserves canonical fields while assigning a local identity", () => {
    const imported = importTemplatePackage(validTemplatePackage, {
      id: "local-1",
    });

    expect(imported).toMatchObject({
      id: "local-1",
      name: "Night Watch",
      isBuiltIn: false,
    });
    expect(imported.fields).toHaveLength(
      validTemplatePackage.template.fields.length,
    );
    expect(imported.fields[0]).not.toHaveProperty("value");
  });

  it("migrates supported legacy packages", () => {
    const imported = importTemplatePackage(legacyTemplatePackage, {
      id: "local-legacy",
      name: "Renamed copy",
    });

    expect(imported.id).toBe("local-legacy");
    expect(imported.name).toBe("Renamed copy");
    expect(imported.fields[0]?.type).toBe("text");
  });

  it.each([
    [
      { schemaVersion: 999, template: validTemplatePackage.template },
      "future version",
    ],
    [
      {
        schemaVersion: 1,
        template: {
          ...validTemplatePackage.template,
          fields: [{ id: "x", label: "x", type: "secret" }],
        },
      },
      "unsupported field type",
    ],
    [
      {
        schemaVersion: 1,
        template: {
          ...validTemplatePackage.template,
          fields: [
            { ...validTemplatePackage.template.fields[0], value: "private" },
          ],
        },
      },
      "private field data",
    ],
  ])("rejects %s", (input) => {
    expect(() =>
      importTemplatePackage(input, { id: "local-invalid" }),
    ).toThrow();
  });
});
