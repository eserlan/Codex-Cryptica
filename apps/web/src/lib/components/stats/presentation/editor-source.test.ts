import { describe, expect, it } from "vitest";
import type { StatSheetTemplate } from "schema";
import {
  deriveFieldDisplayOverrides,
  generateStarterLayout,
} from "./editor-source";

const schema: StatSheetTemplate = {
  id: "s",
  name: "Example",
  isBuiltIn: false,
  fields: [
    { id: "health-id", key: "hp", label: "Health", type: "counter", max: 10 },
    { id: "heading", label: "Abilities", type: "heading" },
    { id: "roll", label: "Roll", type: "dice" },
    { id: "score", label: "Score", type: "number" },
    { id: "notes", label: "Notes", type: "text" },
  ],
};

describe("editor source", () => {
  it("builds cards around headings and keeps field-specific display modes", () => {
    expect(generateStarterLayout(schema)).toBe(
      '## Example\n\n:::card\n{{stat.hp display="current-max"}}\n:::\n\n:::card\n### Abilities\n{{stat.roll display="plain"}}\n{{stat.score display="prominent"}}\n{{stat.notes}}\n:::\n',
    );
  });

  it("does not add an empty card when there are no fields", () => {
    expect(generateStarterLayout({ ...schema, fields: [] })).toBe(
      "## Example\n\n",
    );
  });

  it("handles first and consecutive headings without merging cards", () => {
    expect(
      generateStarterLayout({
        ...schema,
        fields: [schema.fields[1], schema.fields[1]],
      }),
    ).toBe(
      "## Example\n\n:::card\n### Abilities\n:::\n\n:::card\n### Abilities\n:::\n",
    );
  });

  it("resolves saved keys to ids while preserving missing references and nested overrides", () => {
    expect(
      deriveFieldDisplayOverrides(
        ':::card\n{{stat.hp display="progress" hide-label}}\n{{stat.gone hide-label}}\n{{stat.notes}}\n:::',
        schema.fields,
      ),
    ).toEqual({
      "health-id": { displayMode: "progress", hideLabel: true },
      gone: { hideLabel: true },
    });
  });

  it("returns no overrides for empty source or ordinary references", () => {
    expect(deriveFieldDisplayOverrides("")).toEqual({});
    expect(deriveFieldDisplayOverrides("[hp]", schema.fields)).toEqual({});
  });
});
