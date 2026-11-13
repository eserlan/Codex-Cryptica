import { describe, expect, it } from "vitest";
import type { ArtworkAsset } from "../src/catalogue";
import { matchArtwork } from "../src/matching";

function makeFixture(count: number): ArtworkAsset[] {
  const genres = [
    "fantasy",
    "contemporary",
    "sci-fi",
    "horror",
    "neutral",
  ] as const;
  const primaryPool = [
    "forest",
    "harbour",
    "tavern",
    "ruin",
    "station",
    "street",
  ];
  const settingPool = ["coast", "urban", "wilderness", "underground"];
  const moodPool = ["quiet", "tense", "ominous", "warm"];
  const timePool = ["day", "night", "dusk", "dawn"];
  return Array.from({ length: count }, (_, index) => ({
    id: `asset-${String(index).padStart(3, "0")}`,
    type: "location",
    genres: [genres[index % genres.length]],
    primaryCues: [primaryPool[index % primaryPool.length]],
    settingCues: [settingPool[index % settingPool.length]],
    moodCues: [moodPool[index % moodPool.length]],
    timeCues: [timePool[index % timePool.length]],
    excludes: [],
    review: {
      status: "approved",
      reviewer: "bench",
      date: "2026-11-12",
      notes: "benchmark",
    },
  })) as unknown as ArtworkAsset[];
}

describe("matching benchmark", () => {
  it("selects from a 200-asset catalogue under 10 ms p95", () => {
    const assets = makeFixture(200);
    const samples: number[] = [];
    for (let i = 0; i < 50; i++) {
      const start = performance.now();
      const hit = matchArtwork(assets, {
        type: "location",
        genre: "fantasy",
        primaryCues: ["forest", "harbour"],
        settingCues: ["coast"],
        moodCues: ["quiet"],
        timeCues: ["night"],
      });
      samples.push(performance.now() - start);
      expect(hit).not.toBeNull();
    }
    samples.sort((a, b) => a - b);
    const p95 = samples[Math.floor(samples.length * 0.95) - 1] ?? 0;
    expect(p95).toBeLessThan(10);
  });
});
