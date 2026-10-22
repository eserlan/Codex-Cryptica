import { describe, expect, it } from "bun:test";
import {
  ImageRefSchema,
  ReferenceBiomeSchema,
  BIOME_IMAGE_HOST,
  RangeSchema,
  StatementSchema,
} from "../src/model";

const url = `${BIOME_IMAGE_HOST}/biomes/tundra/1.webp`;

const generated = {
  origin: "generated",
  url,
  alt: "Low tundra under a pale sky",
  kind: "illustration",
  tool: "test-model",
  generatedAt: "2026-10-21",
  prompt: "Realistic landscape illustration of tundra",
};

const licensed = {
  origin: "licensed",
  url: `${BIOME_IMAGE_HOST}/biomes/tundra/2.webp`,
  alt: "Tundra in summer",
  kind: "photograph",
  creator: "A. Photographer",
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Example.jpg",
  licence: "CC-BY-4.0",
  licenceUrl: "https://creativecommons.org/licenses/by/4.0/",
};

describe("Range and Statement", () => {
  it("requires low <= high and a unit", () => {
    expect(RangeSchema.safeParse({ low: 1, high: 2, unit: "mm" }).success).toBe(
      true,
    );
    expect(RangeSchema.safeParse({ low: 3, high: 2, unit: "mm" }).success).toBe(
      false,
    );
    expect(RangeSchema.safeParse({ low: 1, high: 2, unit: "" }).success).toBe(
      false,
    );
  });

  it("requires a basis on every statement", () => {
    expect(StatementSchema.safeParse({ text: "x" }).success).toBe(false);
    expect(
      StatementSchema.safeParse({ text: "x", basis: "guess" }).success,
    ).toBe(false);
    expect(
      StatementSchema.safeParse({ text: "x", basis: "exception" }).success,
    ).toBe(true);
  });
});

describe("ImageRefSchema", () => {
  it("accepts generated and licensed images", () => {
    expect(ImageRefSchema.safeParse(generated).success).toBe(true);
    expect(ImageRefSchema.safeParse(licensed).success).toBe(true);
  });

  it("requires alt text on both forms", () => {
    expect(ImageRefSchema.safeParse({ ...generated, alt: "" }).success).toBe(
      false,
    );
    expect(ImageRefSchema.safeParse({ ...licensed, alt: "" }).success).toBe(
      false,
    );
  });

  it("requires generation details on a generated image", () => {
    for (const field of ["tool", "generatedAt", "prompt"]) {
      expect(
        ImageRefSchema.safeParse({ ...generated, [field]: "" }).success,
      ).toBe(false);
    }
  });

  it("never lets a generated image be labelled a photograph", () => {
    expect(
      ImageRefSchema.safeParse({ ...generated, kind: "photograph" }).success,
    ).toBe(false);
  });

  it("allows a missing review but rejects an incomplete one", () => {
    expect(ImageRefSchema.safeParse(generated).success).toBe(true);
    expect(
      ImageRefSchema.safeParse({
        ...generated,
        review: { reviewedBy: "A", reviewedAt: "2026-10-22", notes: "ok" },
      }).success,
    ).toBe(true);
    expect(
      ImageRefSchema.safeParse({
        ...generated,
        review: { reviewedBy: "A" },
      }).success,
    ).toBe(false);
  });

  it("requires creator, source, licence and an allow-listed licence on a licensed image", () => {
    for (const field of ["creator", "sourceUrl", "licenceUrl"]) {
      expect(
        ImageRefSchema.safeParse({ ...licensed, [field]: "" }).success,
      ).toBe(false);
    }
    expect(
      ImageRefSchema.safeParse({ ...licensed, licence: "All-Rights-Reserved" })
        .success,
    ).toBe(false);
  });

  it("only accepts https URLs on the asset host", () => {
    for (const bad of [
      "http://assets.codexcryptica.com/biomes/tundra/1.webp",
      "https://example.com/biomes/tundra/1.webp",
      "/local/tundra.webp",
      "file:///tmp/tundra.webp",
    ]) {
      expect(ImageRefSchema.safeParse({ ...generated, url: bad }).success).toBe(
        false,
      );
    }
  });
});

describe("ReferenceBiomeSchema", () => {
  const biome = {
    id: "tundra",
    name: "Tundra",
    category: "climate-zone",
    summary: "Cold, treeless plains.",
    filters: ["cold"],
    conditions: {},
    landscape: [],
    vegetation: [],
    wildlife: [],
    resources: [],
    hazards: [],
    variations: [],
    images: [generated],
    sourceIds: ["koppen"],
  };

  it("accepts a complete biome", () => {
    expect(ReferenceBiomeSchema.safeParse(biome).success).toBe(true);
  });

  it("rejects a summary over 160 characters", () => {
    expect(
      ReferenceBiomeSchema.safeParse({ ...biome, summary: "x".repeat(161) })
        .success,
    ).toBe(false);
  });

  it("rejects a biome with no images or no sources", () => {
    expect(
      ReferenceBiomeSchema.safeParse({ ...biome, images: [] }).success,
    ).toBe(false);
    expect(
      ReferenceBiomeSchema.safeParse({ ...biome, sourceIds: [] }).success,
    ).toBe(false);
  });

  it("rejects a non-kebab-case id", () => {
    expect(
      ReferenceBiomeSchema.safeParse({ ...biome, id: "Tundra Biome" }).success,
    ).toBe(false);
  });
});
