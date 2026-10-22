import { describe, expect, it } from "bun:test";
import {
  BIOME_ILLUSTRATION_STYLE,
  buildBiomeImagePrompt,
} from "../src/catalogue/images";
import type { ReferenceBiome } from "../src/model";

const biome: Omit<ReferenceBiome, "images"> = {
  id: "boreal-forest",
  name: "Boreal forest",
  category: "climate-zone",
  summary: "Cold conifer forest.",
  filters: ["cold"],
  conditions: {
    seasonality: [
      {
        text: "Long, cold winters and short summers.",
        basis: "pattern",
        sourceIds: ["s"],
      },
    ],
    waterAvailability: [],
    notes: [],
  },
  landscape: [
    {
      text: "Rolling glacial plains dotted with lakes and bogs.",
      basis: "pattern",
      sourceIds: ["s"],
    },
  ],
  vegetation: [
    {
      text: "Spruce, fir and pine dominate the canopy.",
      basis: "pattern",
      sourceIds: ["s"],
    },
    {
      text: "Moss carpets the forest floor.",
      basis: "pattern",
      sourceIds: ["s"],
    },
  ],
  wildlife: [
    {
      text: "Moose browse on willow near wetlands.",
      basis: "pattern",
      sourceIds: ["s"],
    },
  ],
  resources: [],
  hazards: [],
  variations: [],
  sourceIds: ["s"],
};

describe("buildBiomeImagePrompt", () => {
  it("starts with the shared style and names the biome", () => {
    const prompt = buildBiomeImagePrompt(biome);
    expect(prompt.startsWith(BIOME_ILLUSTRATION_STYLE)).toBe(true);
    expect(prompt).toContain("Boreal forest");
  });

  it("uses a plant, a landform and an animal from the biome's own text", () => {
    const prompt = buildBiomeImagePrompt(biome);
    expect(prompt).toContain("Spruce");
    expect(prompt).toContain("glacial plains");
    expect(prompt).toContain("Moose");
  });

  it("never uses the fictional 'fantasy, illustration of' prefix", () => {
    expect(buildBiomeImagePrompt(biome).toLowerCase()).not.toContain("fantasy");
  });

  it("is deterministic", () => {
    expect(buildBiomeImagePrompt(biome)).toBe(buildBiomeImagePrompt(biome));
  });

  it("still produces a prompt for a biome with no statements", () => {
    const bare = {
      ...biome,
      landscape: [],
      vegetation: [],
      wildlife: [],
      conditions: { seasonality: [], waterAvailability: [], notes: [] },
    };
    const prompt = buildBiomeImagePrompt(bare);
    expect(prompt.startsWith(BIOME_ILLUSTRATION_STYLE)).toBe(true);
    expect(prompt).toContain("Boreal forest");
  });
});
