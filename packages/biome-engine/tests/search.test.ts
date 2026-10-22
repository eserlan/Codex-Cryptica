import { describe, expect, it } from "bun:test";
import { listFilterFacets, searchBiomes } from "../src/search";
import { BIOME_IMAGE_HOST, type ReferenceBiome } from "../src/model";

function biome(
  id: string,
  name: string,
  filters: ReferenceBiome["filters"],
  extra: Partial<ReferenceBiome> = {},
): ReferenceBiome {
  return {
    id,
    name,
    category: "climate-zone",
    summary: `${name} summary.`,
    filters,
    conditions: { seasonality: [], waterAvailability: [], notes: [] },
    landscape: [],
    vegetation: [],
    wildlife: [],
    resources: [],
    hazards: [],
    variations: [],
    images: [
      {
        origin: "generated",
        url: `${BIOME_IMAGE_HOST}/biomes/${id}/1.webp`,
        alt: name,
        kind: "illustration",
        tool: "t",
        generatedAt: "2026-10-21",
        prompt: "p",
      },
    ],
    sourceIds: ["s"],
    ...extra,
  };
}

const catalogue: ReferenceBiome[] = [
  biome("hot-desert", "Hot desert", ["hot", "dry", "open"], {
    vegetation: [
      {
        text: "Scattered cacti and shrubs.",
        basis: "pattern",
        sourceIds: ["s"],
      },
    ],
  }),
  biome("boreal-forest", "Boreal forest (taiga)", ["cold", "forested"]),
  biome("tundra", "Tundra", ["cold", "open", "dry"]),
  biome("sahel-café", "Café steppe", ["dry", "open"]),
];

describe("searchBiomes", () => {
  it("returns the whole catalogue in order for an empty query", () => {
    expect(searchBiomes({}, catalogue).map((r) => r.biome.id)).toEqual([
      "hot-desert",
      "boreal-forest",
      "tundra",
      "sahel-café",
    ]);
    expect(searchBiomes({ text: "   " }, catalogue)).toHaveLength(4);
  });

  it("matches text case-insensitively over names", () => {
    expect(searchBiomes({ text: "DESERT" }, catalogue)[0].biome.id).toBe(
      "hot-desert",
    );
  });

  it("matches statement text", () => {
    const results = searchBiomes({ text: "cacti" }, catalogue);
    expect(results.map((r) => r.biome.id)).toEqual(["hot-desert"]);
    expect(results[0].matchedFields).toContain("vegetation");
  });

  it("ignores diacritics in both directions", () => {
    expect(searchBiomes({ text: "cafe" }, catalogue)).toHaveLength(1);
    expect(searchBiomes({ text: "café" }, catalogue)).toHaveLength(1);
  });

  it("requires every word to match", () => {
    expect(searchBiomes({ text: "hot desert" }, catalogue)).toHaveLength(1);
    expect(searchBiomes({ text: "hot tundra" }, catalogue)).toHaveLength(0);
  });

  it("combines filters with AND", () => {
    const ids = (filters: ReferenceBiome["filters"]) =>
      searchBiomes({ filters }, catalogue).map((r) => r.biome.id);
    expect(ids(["cold"])).toEqual(["boreal-forest", "tundra"]);
    expect(ids(["cold", "open"])).toEqual(["tundra"]);
    expect(ids(["cold", "hot"])).toEqual([]);
  });

  it("combines text and filters", () => {
    expect(
      searchBiomes({ text: "tundra", filters: ["cold"] }, catalogue),
    ).toHaveLength(1);
    expect(
      searchBiomes({ text: "tundra", filters: ["hot"] }, catalogue),
    ).toHaveLength(0);
  });

  it("returns an empty list, and never throws, for odd input", () => {
    for (const text of ["(((", "[a-", ".*", "\\", "%%%", "zzzzzz"]) {
      expect(() => searchBiomes({ text }, catalogue)).not.toThrow();
    }
    expect(searchBiomes({ text: "zzzzzz" }, catalogue)).toEqual([]);
  });
});

describe("listFilterFacets", () => {
  it("counts biomes per facet and omits unused facets", () => {
    const facets = listFilterFacets(catalogue);
    const byFacet = Object.fromEntries(facets.map((f) => [f.facet, f.count]));
    expect(byFacet.cold).toBe(2);
    expect(byFacet.open).toBe(3);
    expect(byFacet.coastal).toBeUndefined();
    expect(facets.find((f) => f.facet === "cold")?.label).toBe("Cold");
  });
});
