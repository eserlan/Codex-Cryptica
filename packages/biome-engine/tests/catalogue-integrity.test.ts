import { describe, expect, it } from "bun:test";
import { BIOME_CATALOGUE, BIOME_SOURCES } from "../src/catalogue";
import {
  BIOME_IMAGE_HOST,
  ReferenceBiomeSchema,
  type ReferenceBiome,
  type Statement,
} from "../src/model";

function statementsOf(biome: ReferenceBiome): Statement[] {
  return [
    ...biome.landscape,
    ...biome.vegetation,
    ...biome.wildlife,
    ...biome.resources,
    ...biome.hazards,
    ...biome.variations,
    ...biome.conditions.seasonality,
    ...biome.conditions.waterAvailability,
    ...biome.conditions.notes,
  ];
}

describe("catalogue integrity (structure)", () => {
  it("has no more than 15 biomes", () => {
    expect(BIOME_CATALOGUE.length).toBeLessThanOrEqual(15);
  });

  it("has unique ids", () => {
    const ids = BIOME_CATALOGUE.map((biome) => biome.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const biome of BIOME_CATALOGUE) {
    describe(biome.id, () => {
      it("matches the biome schema", () => {
        const result = ReferenceBiomeSchema.safeParse(biome);
        expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
      });

      it("has a generated image first", () => {
        expect(biome.images[0].origin).toBe("generated");
        expect(biome.images[0].kind).toBe("illustration");
      });

      it("uses the deterministic R2 image URL pattern", () => {
        const pattern = new RegExp(
          `^${BIOME_IMAGE_HOST.replace(/[.]/g, "\\.")}/biomes/${biome.id}/\\d+\\.webp$`,
        );
        for (const image of biome.images) {
          expect(image.url).toMatch(pattern);
        }
      });

      it("has unique image URLs and non-empty alt text", () => {
        const urls = biome.images.map((image) => image.url);
        expect(new Set(urls).size).toBe(urls.length);
        for (const image of biome.images) {
          expect(image.alt.trim().length).toBeGreaterThan(0);
        }
      });

      it("cites sources that exist", () => {
        expect(biome.sourceIds.length).toBeGreaterThan(0);
        for (const id of biome.sourceIds) {
          expect(BIOME_SOURCES[id], `missing source ${id}`).toBeDefined();
        }
        for (const statement of statementsOf(biome)) {
          for (const id of statement.sourceIds) {
            expect(BIOME_SOURCES[id], `missing source ${id}`).toBeDefined();
          }
        }
      });

      it("labels every statement with a basis and at least one source", () => {
        const statements = statementsOf(biome);
        expect(statements.length).toBeGreaterThan(0);
        for (const statement of statements) {
          expect(["pattern", "simplification", "exception"]).toContain(
            statement.basis,
          );
          expect(statement.sourceIds.length).toBeGreaterThan(0);
        }
      });

      it("describes elevation for high-elevation biomes", () => {
        if (biome.filters.includes("high-elevation")) {
          expect(biome.conditions.elevation).toBeDefined();
        }
      });

      it("never uses a bare number for conditions", () => {
        for (const range of [
          biome.conditions.temperature,
          biome.conditions.precipitation,
          biome.conditions.elevation,
        ]) {
          if (range) {
            expect(range.low).toBeLessThanOrEqual(range.high);
            expect(range.unit.length).toBeGreaterThan(0);
          }
        }
      });
    });
  }
});

describe("catalogue integrity (sources)", () => {
  it("keys each source by its own id", () => {
    for (const [key, source] of Object.entries(BIOME_SOURCES)) {
      expect(source.id).toBe(key);
      expect(source.title.length).toBeGreaterThan(0);
    }
  });
});
