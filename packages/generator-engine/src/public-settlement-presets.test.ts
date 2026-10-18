import { describe, expect, it } from "vitest";
import { settlementConfig } from "./public-settlement-constants";
import { SETTLEMENT_PRESETS } from "./public-settlement-presets";
import { generateSettlementLocal } from "./public-settlement";
import { settlementSchema } from "./public-settlement-schema";
import { applyPreset, presetsFor, resolveSmart } from "./smart";

function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Every value a settlement axis can take, for the given genre. */
function poolFor(axisId: string, genre: string): string[] {
  switch (axisId) {
    case "size":
      return (settlementConfig.sizesByGenre[genre] ?? []).map((s) => s.name);
    case "environment":
      return settlementConfig.environmentsByGenre[genre] ?? [];
    case "primaryFunction":
      return settlementConfig.primaryFunctionsByGenre[genre] ?? [];
    case "tone":
      return settlementConfig.tonesByGenre[genre] ?? [];
    case "mainTension":
      return settlementConfig.mainTensionsByGenre[genre] ?? [];
    default:
      return [];
  }
}

describe("SETTLEMENT_PRESETS", () => {
  it("has unique ids", () => {
    const ids = SETTLEMENT_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only names axes the schema defines", () => {
    const axisIds = new Set(settlementSchema.axes.map((a) => a.id));
    const strays: string[] = [];
    for (const preset of SETTLEMENT_PRESETS) {
      for (const axisId of Object.keys(preset.set)) {
        if (!axisIds.has(axisId)) strays.push(`${preset.id}: ${axisId}`);
      }
    }
    expect(strays).toEqual([]);
  });

  it("only names axes the public form shows, so every choice stays editable", () => {
    const visible = new Set([
      "size",
      "environment",
      "primaryFunction",
      "tone",
      "mainTension",
    ]);
    const hidden: string[] = [];
    for (const preset of SETTLEMENT_PRESETS) {
      for (const axisId of Object.keys(preset.set)) {
        if (!visible.has(axisId)) hidden.push(`${preset.id}: ${axisId}`);
      }
    }
    expect(hidden).toEqual([]);
  });

  it("only uses values that exist in its genres' pools", () => {
    const unknown: string[] = [];
    for (const preset of SETTLEMENT_PRESETS) {
      const genres = preset.genres ?? settlementConfig.genres;
      for (const genre of genres) {
        for (const [axisId, value] of Object.entries(preset.set)) {
          if (!poolFor(axisId, genre).includes(value)) {
            unknown.push(`${preset.id}/${genre}/${axisId}: ${value}`);
          }
        }
      }
    }
    expect(unknown).toEqual([]);
  });

  it("leaves at least two axes open so the generator still has work to do", () => {
    const overspecified = SETTLEMENT_PRESETS.filter(
      (p) => Object.keys(p.set).length > 4,
    ).map((p) => p.id);
    expect(overspecified).toEqual([]);
  });

  it("names a genre that exists", () => {
    const known = new Set(settlementConfig.genres);
    const strays = SETTLEMENT_PRESETS.flatMap((p) =>
      (p.genres ?? []).filter((g) => !known.has(g)),
    );
    expect(strays).toEqual([]);
  });

  it("offers presets for the highest-traffic genres", () => {
    for (const genre of ["Fantasy", "Cyberpunk", "Sci-Fi", "Horror"]) {
      expect(presetsFor(SETTLEMENT_PRESETS, genre).length).toBeGreaterThan(1);
    }
  });
});

describe("applying a settlement preset", () => {
  it("resolves the preset's axes to exactly what it asked for", () => {
    const preset = SETTLEMENT_PRESETS.find((p) => p.id === "merchant-port");
    const config = applyPreset({ genre: "Fantasy" }, preset!);
    const { values } = resolveSmart(settlementSchema, config, seededRng(9));
    expect(values.environment).toBe("Coastal harbour");
    expect(values.primaryFunction).toBe("Trade hub");
  });

  it("still rolls the axes the preset left open", () => {
    const preset = SETTLEMENT_PRESETS.find((p) => p.id === "merchant-port");
    const config = applyPreset({ genre: "Fantasy" }, preset!);
    const rng = seededRng(11);
    const tones = new Set<string>();
    for (let i = 0; i < 60; i++) {
      tones.add(resolveSmart(settlementSchema, config, rng).values.tone);
    }
    expect(tones.size).toBeGreaterThan(1);
  });

  it("produces a settlement through the ordinary generator path", () => {
    const preset = SETTLEMENT_PRESETS.find((p) => p.id === "mining-village");
    const out = generateSettlementLocal(
      { genre: "Fantasy", ...preset!.set },
      seededRng(13),
    );
    expect(out.lore).toContain("**Environment**: Mountain pass");
    expect(out.lore).toContain("**Primary Function**: Mining settlement");
    expect(out.lore).toContain("**Scale**: Village");
  });
});
