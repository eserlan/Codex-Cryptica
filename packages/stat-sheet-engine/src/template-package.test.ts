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
});
