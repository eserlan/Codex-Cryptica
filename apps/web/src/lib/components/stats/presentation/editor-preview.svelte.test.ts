import { describe, expect, it } from "vitest";
import type { StatSheetTemplate, StatSheetField } from "schema";
import { createPresentationPreview } from "./editor-preview.svelte";

const health: StatSheetField = {
  id: "hp",
  type: "counter",
  label: "Health",
  max: 12,
  value: 2,
};
const schema: StatSheetTemplate = {
  id: "s",
  name: "Sheet",
  isBuiltIn: false,
  fields: [
    health,
    { id: "mp", type: "counter", label: "Mana" },
    { id: "str", type: "number", label: "Strength" },
    { id: "name", type: "text", label: "Name" },
    { id: "notes", type: "longtext", label: "Notes" },
    { id: "roll", type: "dice", label: "Roll" },
    { id: "heading", type: "heading", label: "Heading" },
  ],
};

describe("presentation editor preview", () => {
  it("uses representative values without updating the schema or entity data", () => {
    const preview = createPresentationPreview(
      () => "[hp]",
      () => schema,
    );
    expect(preview.context.fields.map((f) => f.value)).toEqual([
      7,
      5,
      10,
      "Sample text",
      "Sample notes go here.",
      45,
      undefined,
    ]);
    expect(preview.context.mode).toBe("preview");
    expect(preview.context.readOnly).toBe(true);
    preview.context.onUpdateFieldValue("hp", 99);
    preview.context.onAdjustCounter(preview.context.fields[0], 1);
    preview.context.onUpdateField("hp", { label: "Changed" });
    expect(health.value).toBe(2);
    expect(preview.context.fields[0].value).toBe(7);
  });

  it("collects nested missing references, unsupported directives, and incompatible displays", () => {
    const preview = createPresentationPreview(
      () =>
        ':::card\n{{stat.gone}}\n{{stat.name display="progress"}}\n:::future\nUnknown\n:::\n:::',
      () => schema,
    );
    expect(preview.diagnostics.missing.map((n) => n.fieldId)).toEqual(["gone"]);
    expect(preview.diagnostics.unknown.map((n) => n.name)).toEqual(["future"]);
    expect(
      preview.diagnostics.mismatched.map((n) => n.requestedDisplayMode),
    ).toEqual(["progress"]);
  });

  it("keeps section collapse local to each preview and toggles it both ways", () => {
    const source = ':::section title="Details"\n[hp]\n:::';
    const first = createPresentationPreview(
      () => source,
      () => schema,
    );
    const second = createPresentationPreview(
      () => source,
      () => schema,
    );
    const key = [...first.context.sectionKeys!.values()][0];
    expect(key).toBeTruthy();
    expect(first.context.isSectionCollapsed!(key)).toBe(false);
    first.context.onToggleSection!(key);
    expect(first.context.isSectionCollapsed!(key)).toBe(true);
    expect(second.context.isSectionCollapsed!(key)).toBe(false);
    first.context.onToggleSection!(key);
    expect(first.context.isSectionCollapsed!(key)).toBe(false);
  });

  it("returns no diagnostics for empty source", () => {
    const preview = createPresentationPreview(
      () => "",
      () => schema,
    );
    expect(preview.ast).toEqual([]);
    expect(preview.diagnostics).toEqual({
      missing: [],
      unknown: [],
      mismatched: [],
    });
  });
});
