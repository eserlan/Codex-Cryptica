import { describe, expect, it } from "vitest";
import {
  socialHubConfig,
  buildSocialHubSchema,
  buildTavernSchema,
  generateSocialHubLocal,
  generateTavernLocal,
  VENUE_TYPE_TRAITS,
  ATMOSPHERE_TRAITS,
  WEALTH_LEVEL_TRAITS,
  CLIENTELE_TRAITS,
  TROUBLE_TRAITS,
  SETTLEMENT_TYPE_TRAITS,
  SOCIAL_HUB_TRAIT_VOCABULARY,
  SOCIAL_HUB_PRESETS,
  TAVERN_PRESETS,
} from "./index";
import { resolveSmart, validateSchema, applyPreset } from "./smart";

function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const GENRES = socialHubConfig.genres;

describe("social hub & tavern trait annotations", () => {
  it("uses only traits from the closed vocabulary", () => {
    const vocab = new Set(SOCIAL_HUB_TRAIT_VOCABULARY);
    const maps = [
      VENUE_TYPE_TRAITS,
      ATMOSPHERE_TRAITS,
      WEALTH_LEVEL_TRAITS,
      CLIENTELE_TRAITS,
      TROUBLE_TRAITS,
      SETTLEMENT_TYPE_TRAITS,
    ];
    for (const map of maps) {
      for (const [key, traits] of Object.entries(map)) {
        for (const trait of traits) {
          expect(
            vocab.has(trait),
            `Unknown trait '${trait}' in entry '${key}'`,
          ).toBe(true);
        }
      }
    }
  });

  it("annotates every venue type across all 14 genres", () => {
    for (const genre of GENRES) {
      const venueTypes = socialHubConfig.venueTypesByGenre[genre] ?? [];
      for (const vt of venueTypes) {
        expect(
          VENUE_TYPE_TRAITS[vt],
          `Missing venue type annotation for '${genre} -> ${vt}'`,
        ).toBeDefined();
      }
    }
  });

  it("annotates every clientele across all 14 genres", () => {
    for (const genre of GENRES) {
      const clienteles = socialHubConfig.clientelesByGenre[genre] ?? [];
      for (const c of clienteles) {
        expect(
          CLIENTELE_TRAITS[c],
          `Missing clientele annotation for '${genre} -> ${c}'`,
        ).toBeDefined();
      }
    }
  });

  it("annotates every atmosphere, wealth level, trouble, and settlement type", () => {
    for (const atm of socialHubConfig.atmospheres) {
      expect(ATMOSPHERE_TRAITS[atm]).toBeDefined();
    }
    for (const wl of socialHubConfig.wealthLevels) {
      expect(WEALTH_LEVEL_TRAITS[wl]).toBeDefined();
    }
    for (const tr of socialHubConfig.troubles) {
      expect(TROUBLE_TRAITS[tr]).toBeDefined();
    }
    for (const st of socialHubConfig.settlementTypes) {
      expect(SETTLEMENT_TYPE_TRAITS[st]).toBeDefined();
    }
  });
});

describe("social hub & tavern schema validation", () => {
  it("builds a valid social hub schema", () => {
    const schema = buildSocialHubSchema();
    expect(validateSchema(schema)).toEqual([]);
  });

  it("builds a valid tavern schema", () => {
    const schema = buildTavernSchema();
    expect(validateSchema(schema)).toEqual([]);
  });
});

describe("social hub generation relaxation and coherence", () => {
  it("never relaxes any constraint across all genres and seeds for social hub", () => {
    const schema = buildSocialHubSchema();
    for (const genre of GENRES) {
      for (let seed = 1; seed <= 30; seed++) {
        const result = resolveSmart(schema, { genre }, seededRng(seed * 37));
        expect(
          result.relaxations,
          `Relaxation occurred for genre '${genre}' on seed ${seed}`,
        ).toEqual([]);
      }
    }
  });

  it("never relaxes any constraint across seeds for tavern", () => {
    const schema = buildTavernSchema();
    for (let seed = 1; seed <= 30; seed++) {
      const result = resolveSmart(
        schema,
        { genre: "Fantasy" },
        seededRng(seed * 43),
      );
      expect(
        result.relaxations,
        `Relaxation occurred for tavern on seed ${seed}`,
      ).toEqual([]);
    }
  });

  it("preserves manual options and generates full local output", () => {
    const hub = generateSocialHubLocal(
      {
        genre: "Cyberpunk",
        venueType: "Hacker Café",
        wealthLevel: "Modest (reliable, no frills)",
      },
      seededRng(10),
    );
    expect(hub.type).toBe("location");
    expect(hub.summary).toContain("hacker café");
    expect(hub.lore).toContain("Hacker Café");

    const tavern = generateTavernLocal(
      {
        type: "Mead Hall",
        settlementType: "Market town",
      },
      seededRng(20),
    );
    expect(tavern.type).toBe("location");
    expect(tavern.summary).toContain("mead hall");
    expect(tavern.summary).toContain("market town");
  });
});

describe("social hub & tavern presets", () => {
  it("applies curated social hub presets without relaxation", () => {
    const schema = buildSocialHubSchema();
    for (const preset of SOCIAL_HUB_PRESETS) {
      const config = applyPreset({ genre: preset.genres[0] }, preset);
      const result = resolveSmart(schema, config, seededRng(101));
      expect(result.relaxations).toEqual([]);
      for (const [key, expectedValue] of Object.entries(preset.set)) {
        expect(result.values[key]).toBe(expectedValue);
      }
    }
  });

  it("applies curated tavern presets without relaxation", () => {
    const schema = buildTavernSchema();
    for (const preset of TAVERN_PRESETS) {
      const config = applyPreset({ genre: "Fantasy" }, preset);
      const result = resolveSmart(schema, config, seededRng(202));
      expect(result.relaxations).toEqual([]);
      for (const [key, expectedValue] of Object.entries(preset.set)) {
        expect(result.values[key]).toBe(expectedValue);
      }
    }
  });
});
