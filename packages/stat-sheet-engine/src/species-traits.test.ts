import { describe, expect, it } from "vitest";
import {
  EntitySchema,
  SpeciesDefinitionSchema,
  type StatSheetField,
} from "schema";
import { calculateSpecies, previewSpecies } from "./species-traits";

const definition = SpeciesDefinitionSchema.parse({
  kind: "species",
  version: 1,
  traits: [
    {
      id: "power",
      name: "Powerful",
      description: "Strong",
      adjustments: [
        { key: "strength", amount: 2 },
        { key: "strength", amount: 0.5 },
      ],
    },
    {
      id: "reserved",
      name: "Reserved",
      description: "Quiet",
      adjustments: [{ key: "presence", amount: -1 }],
    },
    {
      id: "sight",
      name: "Night sight",
      description: "See in darkness",
      adjustments: [],
    },
  ],
});
const source = EntitySchema.parse({
  id: "kethari",
  title: "Kethari",
  type: "creature",
  speciesDefinition: definition,
});
const fields: StatSheetField[] = [
  { id: "a", key: "strength", label: "Might", type: "number", value: 10 },
  { id: "b", key: "presence", label: "Charm", type: "number", value: 8 },
];
const hero = () =>
  EntitySchema.parse({
    id: "hero",
    title: "Hero",
    type: "character",
    content: "Manual abilities",
    connections: [{ target: "friend", type: "knows" }],
    statSheet: { fields },
  });

describe("species adjustments", () => {
  it.each([
    [fields],
    [
      fields.map((f, i) => ({
        ...f,
        id: `other-${i}`,
        label: `Attribute ${i}`,
      })),
    ],
  ])("resolves exact keys across layouts without changing bases", (layout) => {
    const entity = { ...hero(), statSheet: { fields: layout } };
    const before = structuredClone(entity);
    const snapshot = previewSpecies(entity, source);
    const result = calculateSpecies(snapshot, layout);
    expect(result.map((r) => r.effective)).toEqual([12.5, 12.5, 7]);
    expect(result.map((r) => r.amount)).toEqual([2, 0.5, -1]);
    expect(snapshot.traits[2].name).toBe("Night sight");
    expect(entity).toEqual(before);
  });

  it.each([
    [[], "Missing key"],
    [[{ ...fields[0], key: "Strength", label: "strength" }], "Missing key"],
    [[fields[0], { ...fields[0], id: "duplicate" }], "Ambiguous key"],
    ...["counter", "dice", "dice-pool", "item-table", "text"].map((type) => [
      [{ ...fields[0], type }],
      "Target must be a number field",
    ]),
    [[{ ...fields[0], value: undefined }], "Base must be a finite number"],
    [[{ ...fields[0], value: "10" }], "Base must be a finite number"],
    [[{ ...fields[0], value: Infinity }], "Base must be a finite number"],
    [[fields[0], { ...fields[0], key: "different" }], "Ambiguous field ID"],
  ])("skips incompatible targets: %j", (layout, reason) => {
    const entity = {
      ...hero(),
      statSheet: { fields: layout as StatSheetField[] },
    };
    const snapshot = previewSpecies(entity, source);
    expect(
      calculateSpecies(snapshot, entity.statSheet.fields)[0].reason,
    ).toContain(reason);
    expect(snapshot.traits[0].adjustments[0].resolution.status).toBe("skipped");
  });

  it("skips non-finite arithmetic including combined contributions", () => {
    const huge = {
      ...source,
      speciesDefinition: {
        ...definition,
        traits: [
          {
            ...definition.traits[0],
            adjustments: [
              { key: "strength", amount: Number.MAX_VALUE },
              { key: "strength", amount: Number.MAX_VALUE },
            ],
          },
        ],
      },
    };
    const snapshot = previewSpecies(hero(), huge);
    expect(
      calculateSpecies(snapshot, fields).every((r) =>
        r.reason?.includes("finite"),
      ),
    ).toBe(true);
  });

  it("binds IDs once, never rebinding skipped or removed fields", () => {
    const snapshot = previewSpecies(hero(), source);
    expect(
      calculateSpecies(snapshot, [
        { ...fields[0], key: "renamed", label: "Changed", value: 13 },
      ])[0].effective,
    ).toBe(15.5);
    expect(
      calculateSpecies(snapshot, [{ ...fields[0], id: "replacement" }])[0]
        .reason,
    ).toContain("unavailable");
    expect(
      calculateSpecies(snapshot, [{ ...fields[0], type: "text" }])[0].reason,
    ).toContain("number field");
    const missing = previewSpecies({ ...hero(), statSheet: undefined }, source);
    expect(calculateSpecies(missing, fields)[0].reason).toContain(
      "Missing key",
    );
  });

  it("reselects idempotently and replaces from edited bases, preserving unrelated data", () => {
    const original = hero();
    const selected = {
      ...original,
      appliedSpecies: previewSpecies(original, source),
    };
    source.speciesDefinition!.traits[0].description = "Edited source";
    expect(previewSpecies(selected, source)).toEqual(selected.appliedSpecies);
    expect(selected.appliedSpecies.traits[0].description).toBe("Strong");
    const edited = {
      ...selected,
      statSheet: { fields: [{ ...fields[0], value: 13 }, fields[1]] },
    };
    const other = {
      ...source,
      id: "other",
      speciesDefinition: {
        ...definition,
        traits: [
          {
            ...definition.traits[0],
            adjustments: [{ key: "strength", amount: -1 }],
          },
        ],
      },
    };
    const replaced = {
      ...edited,
      appliedSpecies: previewSpecies(edited, other),
    };
    expect(
      calculateSpecies(replaced.appliedSpecies, replaced.statSheet.fields)[0]
        .effective,
    ).toBe(12);
    const removed = { ...replaced, appliedSpecies: undefined };
    expect(
      calculateSpecies(removed.appliedSpecies, removed.statSheet.fields),
    ).toEqual([]);
    expect(removed.statSheet.fields[0].value).toBe(13);
    expect(removed.content).toBe(original.content);
    expect(removed.connections).toEqual(original.connections);
    expect(removed.statSheet.fields[1]).toEqual(fields[1]);
  });

  it("supports ability-only selections without a sheet and rejects undesignated sources", () => {
    const ability = {
      ...source,
      speciesDefinition: {
        ...definition,
        traits: [{ ...definition.traits[2] }],
      },
    };
    expect(
      previewSpecies({ ...hero(), statSheet: undefined }, ability).traits,
    ).toEqual(ability.speciesDefinition.traits);
    expect(() =>
      previewSpecies(hero(), { ...source, speciesDefinition: undefined }),
    ).toThrow();
  });
});

describe("arbitrary keys and changing numeric availability", () => {
  it("supports custom keys without a system mapping and skips overflow after base edits", () => {
    const entity = EntitySchema.parse({
      id: "pilot",
      title: "Pilot",
      type: "npc",
      statSheet: {
        fields: [
          {
            id: "flux-id",
            key: "Flux_7",
            label: "Drive",
            type: "number",
            value: 0,
          },
        ],
      },
    });
    const species = {
      ...source,
      id: "alien",
      speciesDefinition: {
        ...definition,
        traits: [
          {
            id: "flux",
            name: "Flux sensitivity",
            description: "Sensitive",
            adjustments: [{ key: "Flux_7", amount: Number.MAX_VALUE }],
          },
        ],
      },
    };
    const snapshot = previewSpecies(entity, species);
    expect(
      calculateSpecies(snapshot, entity.statSheet!.fields)[0].effective,
    ).toBe(Number.MAX_VALUE);
    const before = structuredClone(snapshot);
    const changed = [
      { ...entity.statSheet!.fields[0], value: Number.MAX_VALUE },
    ];
    expect(calculateSpecies(snapshot, changed)[0].reason).toContain("finite");
    expect(snapshot).toEqual(before);
    expect(changed[0].value).toBe(Number.MAX_VALUE);
  });
});
