import { describe, expect, it } from "bun:test";
import { EntitySchema } from "./entity";
import { BiomeProfileSchema } from "./biome";

const baseEntity = { id: "e1", type: "note", title: "Ashen Taiga" };

const validProfile = {
  version: 1,
  reference: null,
  own: {},
  alterations: [],
  referenceLinks: [],
};

describe("BiomeProfileSchema", () => {
  it("accepts a minimal profile and fills defaults", () => {
    const parsed = BiomeProfileSchema.parse(validProfile);
    expect(parsed.own.terrain).toBe("");
    expect(parsed.own.climate).toEqual({});
    expect(parsed.alterations).toEqual([]);
  });

  it("accepts a reference snapshot with ranges and statements", () => {
    const parsed = BiomeProfileSchema.parse({
      ...validProfile,
      reference: {
        biomeId: "tundra",
        name: "Tundra",
        capturedAt: 1,
        conditions: {
          temperature: { low: -20, high: 5, unit: "°C" },
          seasonality: [],
          waterAvailability: [],
          notes: [],
        },
        landscape: [{ text: "Flat", basis: "pattern", sourceIds: ["a"] }],
        vegetation: [],
        wildlife: [],
        resources: [],
        hazards: [],
        sourceIds: ["a"],
        sources: [{ id: "a", title: "A source" }],
      },
    });
    expect(parsed.reference?.biomeId).toBe("tundra");
  });

  it("rejects an unknown version", () => {
    expect(() =>
      BiomeProfileSchema.parse({ ...validProfile, version: 2 }),
    ).toThrow();
  });

  it("rejects a range whose low is above its high", () => {
    expect(() =>
      BiomeProfileSchema.parse({
        ...validProfile,
        own: { climate: { temperature: { low: 9, high: 1, unit: "°C" } } },
      }),
    ).toThrow();
  });

  it("rejects an alteration with an empty description but allows an empty cause", () => {
    const alteration = {
      id: "a1",
      aspect: "climate",
      description: "Ash rain",
    };
    const ok = BiomeProfileSchema.parse({
      ...validProfile,
      alterations: [alteration],
    });
    expect(ok.alterations[0].cause).toBe("");
    expect(() =>
      BiomeProfileSchema.parse({
        ...validProfile,
        alterations: [{ ...alteration, description: "" }],
      }),
    ).toThrow();
  });

  it("rejects an unknown alteration aspect", () => {
    expect(() =>
      BiomeProfileSchema.parse({
        ...validProfile,
        alterations: [{ id: "a1", aspect: "magic", description: "x" }],
      }),
    ).toThrow();
  });

  it("accepts https reference links and rejects other schemes", () => {
    expect(
      BiomeProfileSchema.parse({
        ...validProfile,
        referenceLinks: [{ url: "https://example.com/a", label: "A" }],
      }).referenceLinks,
    ).toHaveLength(1);
    for (const url of ["http://example.com", "javascript:alert(1)", "nope"]) {
      expect(() =>
        BiomeProfileSchema.parse({
          ...validProfile,
          referenceLinks: [{ url, label: "x" }],
        }),
      ).toThrow();
    }
  });

  it("rejects more than 10 reference links", () => {
    const links = Array.from({ length: 11 }, (_, i) => ({
      url: `https://example.com/${i}`,
      label: String(i),
    }));
    expect(() =>
      BiomeProfileSchema.parse({ ...validProfile, referenceLinks: links }),
    ).toThrow();
  });

  it("rejects own text over 4,000 characters", () => {
    expect(() =>
      BiomeProfileSchema.parse({
        ...validProfile,
        own: { terrain: "x".repeat(4001) },
      }),
    ).toThrow();
    expect(
      BiomeProfileSchema.parse({
        ...validProfile,
        own: { terrain: "x".repeat(4000) },
      }).own.terrain,
    ).toHaveLength(4000);
  });
});

describe("EntitySchema biome field", () => {
  it("still parses an entity without a biome field", () => {
    expect(EntitySchema.parse(baseEntity).biome).toBeUndefined();
  });

  it("parses an entity carrying a biome profile", () => {
    const parsed = EntitySchema.parse({
      ...baseEntity,
      kind: "biome",
      biome: validProfile,
    });
    expect(parsed.biome?.version).toBe(1);
  });

  it("rejects an entity with a malformed biome field", () => {
    expect(() =>
      EntitySchema.parse({ ...baseEntity, biome: { version: 1 } }),
    ).toThrow();
  });
});
