import { describe, expect, it } from "vitest";
import type { StatSheetField, Trait, TraitSelection } from "schema";
import {
  computeEffectiveValues,
  isSpeciesDefinition,
  previewTraitSelection,
  removeTraitSelection,
  setTraitSelection,
} from "./trait-packages";

const dndFields = (): StatSheetField[] => [
  { id: "hp", label: "Hit Points", type: "counter", min: 0, max: 100 },
  { id: "str_score", label: "STR", type: "number", value: 10 },
  { id: "cha_score", label: "CHA", type: "number", value: 12 },
  { id: "int_score", label: "INT", type: "number" },
  { id: "str", label: "STR Check", type: "dice", formula: "1d20+0" },
];

const customFields = (): StatSheetField[] => [
  {
    id: "7f3c2a10-aaaa-4bbb-8ccc-000000000001",
    key: "might",
    label: "Might",
    type: "number",
    value: 5,
  },
];

const trait = (
  name: string,
  adjustments: { target: string; amount: number }[],
): Trait => ({ id: name, name, description: "", adjustments });

const selection = (title: string, traits: Trait[]): TraitSelection => ({
  kind: "species",
  sourceId: title,
  sourceTitle: title,
  appliedAt: 1,
  traits,
});

describe("previewTraitSelection", () => {
  it("applies positive and negative adjustments by id", () => {
    const fields = dndFields();
    const before = structuredClone(fields);
    const rows = previewTraitSelection(fields, [
      trait("Brute", [
        { target: "str_score", amount: 2 },
        { target: "cha_score", amount: -1 },
      ]),
    ]);
    expect(rows[0]).toMatchObject({
      status: "applied",
      fieldId: "str_score",
      base: 10,
      effective: 12,
    });
    expect(rows[1]).toMatchObject({ status: "applied", effective: 11 });
    expect(fields).toEqual(before);
  });

  it("resolves by key on a custom sheet", () => {
    const rows = previewTraitSelection(customFields(), [
      trait("Brute", [{ target: "might", amount: 1 }]),
    ]);
    expect(rows[0]).toMatchObject({ status: "applied", effective: 6 });
  });

  it("reports missing and incompatible targets", () => {
    const rows = previewTraitSelection(dndFields(), [
      trait("T", [
        { target: "nope", amount: 1 },
        { target: "hp", amount: 1 },
        { target: "str", amount: 1 },
      ]),
    ]);
    expect(rows[0].status).toBe("missing");
    expect(rows[1]).toMatchObject({
      status: "incompatible",
      fieldType: "counter",
    });
    expect(rows[2]).toMatchObject({
      status: "incompatible",
      fieldType: "dice",
    });
  });
});

describe("computeEffectiveValues", () => {
  it("adds two traits on the same field and lists contributions", () => {
    const fields = dndFields();
    const before = structuredClone(fields);
    const map = computeEffectiveValues(fields, [
      selection("Kethari", [
        trait("A", [{ target: "str_score", amount: 2 }]),
        trait("B", [{ target: "str_score", amount: -1 }]),
      ]),
    ]);
    const entry = map.get("str_score");
    expect(entry?.base).toBe(10);
    expect(entry?.effective).toBe(11);
    expect(entry?.contributions).toEqual([
      { sourceTitle: "Kethari", traitName: "A", amount: 2 },
      { sourceTitle: "Kethari", traitName: "B", amount: -1 },
    ]);
    expect(map.has("cha_score")).toBe(false);
    expect(fields).toEqual(before);
  });

  it("treats a non-number base as 0 and skips non-number fields", () => {
    const map = computeEffectiveValues(dndFields(), [
      selection("K", [
        trait("A", [
          { target: "int_score", amount: 3 },
          { target: "hp", amount: 3 },
        ]),
      ]),
    ]);
    expect(map.get("int_score")).toMatchObject({ base: 0, effective: 3 });
    expect(map.has("hp")).toBe(false);
  });

  it("resolves by key", () => {
    const fields = customFields();
    const map = computeEffectiveValues(fields, [
      selection("K", [trait("A", [{ target: "might", amount: 2 }])]),
    ]);
    expect(map.get(fields[0].id)?.effective).toBe(7);
  });
});

describe("setTraitSelection / removeTraitSelection", () => {
  const a = selection("A", [trait("a", [{ target: "str_score", amount: 2 }])]);
  const b = selection("B", [trait("b", [{ target: "cha_score", amount: 1 }])]);

  it("replaces an existing species selection", () => {
    const next = setTraitSelection([a], b);
    expect(next).toEqual([b]);
    const map = computeEffectiveValues(dndFields(), next);
    expect(map.has("str_score")).toBe(false);
    expect(map.has("cha_score")).toBe(true);
  });

  it("does not mutate its input", () => {
    const input = [a];
    setTraitSelection(input, b);
    expect(input).toEqual([a]);
  });

  it("removal leaves no contributions", () => {
    const next = removeTraitSelection([a], "species");
    expect(next).toEqual([]);
    expect(computeEffectiveValues(dndFields(), next).size).toBe(0);
  });
});

describe("isSpeciesDefinition", () => {
  const pkg = { kind: "species" as const, traits: [] };
  it("is true for a marked creature", () => {
    expect(isSpeciesDefinition({ type: "creature", traitPackage: pkg })).toBe(
      true,
    );
  });
  it("is false for an unmarked creature and a character with a package", () => {
    expect(isSpeciesDefinition({ type: "creature" })).toBe(false);
    expect(isSpeciesDefinition({ type: "character", traitPackage: pkg })).toBe(
      false,
    );
  });
});
