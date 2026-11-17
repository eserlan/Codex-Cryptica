import { describe, expect, it } from "vitest";
import {
  AppliedSpeciesSchema,
  EntitySchema,
  SpeciesDefinitionSchema,
} from "./index";

const trait = {
  id: "power",
  name: "Powerful",
  description: "Strong",
  adjustments: [{ key: "strength", amount: 2 }],
};
const definition = { kind: "species", version: 1, traits: [trait] };

describe("species metadata", () => {
  it("does not add metadata to old entities", () => {
    const old = EntitySchema.parse({ id: "a", type: "character", title: "A" });
    expect(old).not.toHaveProperty("speciesDefinition");
    expect(old).not.toHaveProperty("appliedSpecies");
  });
  it("validates definitions and independent bound/skipped snapshots", () => {
    expect(SpeciesDefinitionSchema.parse(definition)).toEqual(definition);
    const snapshot = {
      kind: "species",
      version: 1,
      source: { entityId: "k", title: "Kethari", localEntityId: null },
      traits: [
        {
          ...trait,
          adjustments: [
            {
              key: "strength",
              amount: 2,
              resolution: { status: "bound", fieldId: "a" },
            },
            {
              key: "other",
              amount: -1,
              resolution: { status: "skipped", reason: "Missing key" },
            },
          ],
        },
      ],
    };
    expect(AppliedSpeciesSchema.parse(snapshot)).toEqual(snapshot);
  });
  it.each([
    { ...definition, version: 2 },
    { ...definition, kind: "background" },
    { ...definition, traits: [{ ...trait, name: " " }] },
    { ...definition, traits: [trait, trait] },
    ...["", "1key", "bad-key"].map((key) => ({
      ...definition,
      traits: [{ ...trait, adjustments: [{ key, amount: 2 }] }],
    })),
    ...[NaN, Infinity, "2", undefined].map((amount) => ({
      ...definition,
      traits: [{ ...trait, adjustments: [{ key: "strength", amount }] }],
    })),
  ])("rejects malformed metadata %j", (speciesDefinition) => {
    expect(
      EntitySchema.safeParse({
        id: "a",
        type: "creature",
        title: "A",
        speciesDefinition,
      }).success,
    ).toBe(false);
  });
});

describe("invalid saved resolutions", () => {
  it.each([
    { status: "bound" },
    { status: "bound", fieldId: "" },
    { status: "skipped", reason: "" },
    { status: "inferred", fieldId: "a" },
  ])("rejects %j rather than retargeting", (resolution) => {
    expect(
      AppliedSpeciesSchema.safeParse({
        ...definition,
        source: { entityId: "k", title: "Kethari", localEntityId: null },
        traits: [
          {
            ...trait,
            adjustments: [{ key: "strength", amount: 2, resolution }],
          },
        ],
      }).success,
    ).toBe(false);
  });
});
