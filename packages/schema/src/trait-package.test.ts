import { describe, expect, it } from "vitest";
import {
  EntitySchema,
  MAX_TRAITS_PER_PACKAGE,
  TraitAdjustmentSchema,
  TraitSchema,
} from "./index";

const base = {
  id: "e1",
  title: "Kethari",
  type: "creature",
  content: "",
};

const trait = {
  id: "t1",
  name: "Brute",
  description: "Strong",
  adjustments: [{ target: "str_score", amount: 2 }],
};

describe("trait package schema", () => {
  it("parses an entity with traitPackage and traitSelections", () => {
    const parsed = EntitySchema.parse({
      ...base,
      traitPackage: { kind: "species", traits: [trait] },
      traitSelections: [
        {
          kind: "species",
          sourceId: "s1",
          sourceTitle: "Kethari",
          appliedAt: 1,
          traits: [trait],
        },
      ],
    });
    expect(parsed.traitPackage?.traits[0].name).toBe("Brute");
    expect(parsed.traitSelections).toHaveLength(1);
  });

  it("still parses an entity without them", () => {
    const parsed = EntitySchema.parse(base);
    expect(parsed.traitPackage).toBeUndefined();
    expect(parsed.traitSelections).toBeUndefined();
  });

  it("rejects duplicate selection kinds and oversized trait snapshots", () => {
    const selection = {
      kind: "species",
      sourceId: "s1",
      sourceTitle: "Kethari",
      appliedAt: 1,
      traits: [trait],
    };
    expect(
      EntitySchema.safeParse({
        ...base,
        traitSelections: [selection, { ...selection, sourceId: "s2" }],
      }).success,
    ).toBe(false);
    expect(
      EntitySchema.safeParse({
        ...base,
        traitSelections: [
          {
            ...selection,
            traits: Array(MAX_TRAITS_PER_PACKAGE + 1).fill(trait),
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("rejects zero, non-finite and empty-target adjustments", () => {
    expect(
      TraitAdjustmentSchema.safeParse({ target: "a", amount: 0 }).success,
    ).toBe(false);
    expect(
      TraitAdjustmentSchema.safeParse({ target: "a", amount: Infinity })
        .success,
    ).toBe(false);
    expect(
      TraitAdjustmentSchema.safeParse({ target: "a", amount: NaN }).success,
    ).toBe(false);
    expect(
      TraitAdjustmentSchema.safeParse({ target: "", amount: 1 }).success,
    ).toBe(false);
  });

  it("rejects a trait with an empty name and defaults optional lists", () => {
    expect(TraitSchema.safeParse({ ...trait, name: "" }).success).toBe(false);
    const t = TraitSchema.parse({ id: "x", name: "N" });
    expect(t.description).toBe("");
    expect(t.adjustments).toEqual([]);
  });
});
