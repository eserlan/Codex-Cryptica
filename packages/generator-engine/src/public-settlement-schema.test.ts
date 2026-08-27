import { describe, expect, it } from "vitest";
import { settlementConfig } from "./public-settlement-constants";
import {
  buildSettlementSchema,
  settlementSchema,
} from "./public-settlement-schema";
import {
  AUTHORITY_TRAITS,
  ENVIRONMENT_TRAITS,
  FUNCTION_TRAITS,
  SETTLEMENT_TRAIT_VOCABULARY,
  TENSION_TRAITS,
  TONE_TRAITS,
} from "./public-settlement-traits";
import { generateSettlementLocal } from "./public-settlement";
import { resolveSmart, validateSchema } from "./smart";

function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const GENRES = settlementConfig.genres;

describe("settlement trait annotations", () => {
  const axes = [
    ["environmentsByGenre", ENVIRONMENT_TRAITS] as const,
    ["primaryFunctionsByGenre", FUNCTION_TRAITS] as const,
    ["tonesByGenre", TONE_TRAITS] as const,
    ["mainTensionsByGenre", TENSION_TRAITS] as const,
    ["authorityTypesByGenre", AUTHORITY_TRAITS] as const,
  ];

  for (const [poolKey, traitMap] of axes) {
    it(`annotates every option in ${poolKey}`, () => {
      const pools = settlementConfig[poolKey] as Record<string, string[]>;
      const missing: string[] = [];
      for (const genre of GENRES) {
        for (const value of pools[genre] ?? []) {
          if (!traitMap[value]) missing.push(`${genre}: ${value}`);
        }
      }
      expect(missing).toEqual([]);
    });
  }

  it("uses only vocabulary traits", () => {
    const vocabulary = new Set<string>(SETTLEMENT_TRAIT_VOCABULARY);
    const strays: string[] = [];
    for (const [, traitMap] of axes) {
      for (const [value, traits] of Object.entries(traitMap)) {
        for (const trait of traits) {
          if (!vocabulary.has(trait)) strays.push(`${value}: ${trait}`);
        }
      }
    }
    expect(strays).toEqual([]);
  });

  it("gives every annotated option at least one trait", () => {
    const empty: string[] = [];
    for (const [, traitMap] of axes) {
      for (const [value, traits] of Object.entries(traitMap)) {
        if (traits.length === 0) empty.push(value);
      }
    }
    expect(empty).toEqual([]);
  });
});

describe("settlementSchema", () => {
  it("resolves axes in causal order", () => {
    expect(settlementSchema.axes.map((a) => a.id)).toEqual([
      "environment",
      "primaryFunction",
      "authorityType",
      "tone",
      "mainTension",
      "size",
    ]);
  });

  it("has no forward references in its rules", () => {
    expect(validateSchema(buildSettlementSchema())).toEqual([]);
  });

  it("resolves every genre without ever relaxing a constraint", () => {
    const rng = seededRng(2026);
    const relaxed: string[] = [];
    for (const genre of GENRES) {
      for (let i = 0; i < 200; i++) {
        const result = resolveSmart(settlementSchema, { genre }, rng);
        for (const relaxation of result.relaxations) {
          relaxed.push(`${genre}/${relaxation.axisId}/${relaxation.dropped}`);
        }
      }
    }
    expect([...new Set(relaxed)]).toEqual([]);
  });

  it("gives every genre a full set of values", () => {
    const rng = seededRng(5);
    for (const genre of GENRES) {
      const { values } = resolveSmart(settlementSchema, { genre }, rng);
      for (const axis of settlementSchema.axes) {
        expect(values[axis.id]).toBeTruthy();
      }
    }
  });

  it("scales size traits across each genre's own ladder", () => {
    const { axes } = resolveSmart(
      settlementSchema,
      { genre: "Fantasy" },
      seededRng(1),
    );
    const size = axes.find((a) => a.axisId === "size");
    expect(size?.traits.length).toBe(1);
    expect(["tiny", "small", "medium", "large"]).toContain(size?.traits[0]);
  });
});

describe("settlement coherence", () => {
  it("never puts a maritime function inland", () => {
    const rng = seededRng(99);
    const landlocked = [
      "Mountain pass",
      "Open plains",
      "Desert oasis",
      "Underground cavern",
    ];
    for (let i = 0; i < 400; i++) {
      const { values } = resolveSmart(
        settlementSchema,
        { genre: "Fantasy" },
        rng,
      );
      if (landlocked.includes(values.environment)) {
        expect(values.primaryFunction).not.toBe(
          "Fishing and salvage community",
        );
      }
    }
  });

  it("favours a trade-shaped authority for a trade-shaped function", () => {
    const rng = seededRng(123);
    let merchantRule = 0;
    let tradeTotal = 0;
    for (let i = 0; i < 600; i++) {
      const { values } = resolveSmart(
        settlementSchema,
        { genre: "Fantasy" },
        rng,
      );
      if (values.primaryFunction !== "Trade hub") continue;
      tradeTotal++;
      if (values.authorityType === "Merchant guild") merchantRule++;
    }
    // 7 authorities in the Fantasy pool, so flat randomness would give ~14%.
    expect(tradeTotal).toBeGreaterThan(30);
    expect(merchantRule / tradeTotal).toBeGreaterThan(0.25);
  });

  it("still produces the full spread of options rather than collapsing", () => {
    const rng = seededRng(7);
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) {
      seen.add(
        resolveSmart(settlementSchema, { genre: "Fantasy" }, rng).values
          .primaryFunction,
      );
    }
    expect(seen.size).toBe(
      settlementConfig.primaryFunctionsByGenre["Fantasy"].length,
    );
  });
});

describe("generateSettlementLocal — through the smart resolver", () => {
  it("honours a custom scale the user typed and borrows a population band", () => {
    const out = generateSettlementLocal(
      { genre: "Fantasy", size: "Floating archipelago" },
      seededRng(3),
    );
    expect(out.lore).toContain("**Scale**: Floating archipelago");
    expect(out.lore).toMatch(/\*\*Scale\*\*: Floating archipelago \(.+\)/);
  });

  it("honours every locked axis at once", () => {
    const out = generateSettlementLocal(
      {
        genre: "Fantasy",
        environment: "Mountain pass",
        primaryFunction: "Mining settlement",
        tone: "Grim and weathered",
        mainTension: "Famine or drought",
        authorityType: "Tribal elders",
      },
      seededRng(4),
    );
    expect(out.lore).toContain("**Environment**: Mountain pass");
    expect(out.lore).toContain("**Primary Function**: Mining settlement");
    expect(out.lore).toContain("**Official Authority**: Tribal elders");
    expect(out.lore).toContain("**Tone**: Grim and weathered");
    expect(out.lore).toContain("Famine or drought");
  });
});
