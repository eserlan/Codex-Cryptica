import { describe, expect, it } from "vitest";
import {
  ONE_SHOT_KITS,
  ONE_SHOT_SEEDS,
  seedKeyForGenre,
} from "./one-shot-seeds";
import {
  checkPlayability,
  generateOneShotLocal,
  oneShotConfig,
} from "./public-one-shot";
import { ONE_SHOT_EMPHASES } from "./one-shot-types";

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const local = (options: Record<string, unknown>, seed: number) =>
  generateOneShotLocal(options, seeded(seed)).oneShot!;

const SEEDS = [1, 2, 3, 5, 8, 13, 21, 34];

describe("one-shot seed pools", () => {
  it("gives every genre bucket at least four of each kind of content", () => {
    for (const [bucket, seed] of Object.entries(ONE_SHOT_SEEDS)) {
      for (const [field, values] of Object.entries(seed)) {
        expect(values.length, `${bucket}.${field}`).toBeGreaterThanOrEqual(4);
        expect(new Set(values).size, `${bucket}.${field} repeats`).toBe(
          values.length,
        );
      }
    }
  });

  it("gives Dark Fantasy and Post-Apocalyptic their own buckets", () => {
    expect(seedKeyForGenre("Dark Fantasy")).toBe("darkfantasy");
    expect(seedKeyForGenre("Post-Apocalyptic")).toBe("wasteland");
    expect(seedKeyForGenre("Western / Frontier")).toBe("frontier");
    expect(seedKeyForGenre("Classic Fantasy")).toBe("fantasy");
    expect(seedKeyForGenre("Vampire / Gothic Noir")).toBe("darkfantasy");
    expect(seedKeyForGenre("Cosmic Horror")).toBe("horror");
    expect(seedKeyForGenre("Something new")).toBe("fantasy");
  });

  it("maps every builder genre onto a seed pool, and reaches all eight pools", () => {
    const buckets = oneShotConfig.genres.map(seedKeyForGenre);
    for (const key of buckets) expect(ONE_SHOT_SEEDS[key]).toBeDefined();
    expect(new Set(buckets)).toEqual(new Set(Object.keys(ONE_SHOT_SEEDS)));
  });

  it("only uses placeholders the builder fills in", () => {
    const text = JSON.stringify([ONE_SHOT_SEEDS, ONE_SHOT_KITS]);
    const used = new Set(text.match(/\{[a-z]+\}/g));
    expect([...used].sort()).toEqual(
      ["{item}", "{patron}", "{place}", "{villain}"].sort(),
    );
  });
});

describe("emphasis kits", () => {
  it("has five approaches, five middle challenges and three climaxes each", () => {
    for (const emphasis of ONE_SHOT_EMPHASES) {
      const kit = ONE_SHOT_KITS[emphasis];
      expect(kit.approaches).toHaveLength(5);
      expect(kit.challenges.middle).toHaveLength(5);
      expect(kit.challenges.climax).toHaveLength(3);
    }
  });

  it("never repeats a middle challenge or complication inside one adventure", () => {
    for (const emphasis of ONE_SHOT_EMPHASES) {
      for (const seed of SEEDS) {
        const a = local({ emphasis, durationHours: 6 }, seed);
        const middle = a.scenes.filter((s) => s.kind === "middle");
        expect(middle.length).toBeGreaterThan(1);
        const challenges = middle.map((s) => s.challenge.description);
        const situations = middle.map((s) => s.situation);
        expect(new Set(challenges).size).toBe(challenges.length);
        expect(new Set(situations).size).toBe(situations.length);
      }
    }
  });
});

describe("generated variety", () => {
  it("varies the opening, stakes, villain and finale across runs", () => {
    for (const genre of oneShotConfig.genres) {
      const runs = SEEDS.map((seed) =>
        local({ genre, emphasis: "Action", durationHours: 3 }, seed),
      );
      const distinct = (pick: (a: (typeof runs)[number]) => unknown) =>
        new Set(runs.map(pick)).size;
      expect(
        distinct((a) => a.opening.readAloud),
        genre,
      ).toBeGreaterThan(1);
      expect(
        distinct((a) => a.briefing.stakes),
        genre,
      ).toBeGreaterThan(1);
      expect(
        distinct((a) => a.briefing.trigger),
        genre,
      ).toBeGreaterThan(1);
      expect(
        distinct((a) => a.scenes.at(-1)!.challenge.description),
        genre,
      ).toBeGreaterThan(1);
      expect(
        distinct((a) => a.npcs.find((n) => n.id === a.antagonistId)!.tactics),
        genre,
      ).toBeGreaterThan(1);
    }
  });

  it("keeps every genre and emphasis free of playability gaps", () => {
    for (const genre of oneShotConfig.genres) {
      for (const emphasis of ONE_SHOT_EMPHASES) {
        for (const durationHours of [2, 4, 6]) {
          for (const seed of SEEDS.slice(0, 4)) {
            const a = local({ genre, emphasis, durationHours }, seed);
            expect(
              checkPlayability(a).map((g) => g.message),
              `${genre} / ${emphasis} / ${durationHours}h / seed ${seed}`,
            ).toEqual([]);
          }
        }
      }
    }
  });

  it("title-cases item names without capitalising after an apostrophe", () => {
    const titles = new Set(
      SEEDS.flatMap((seed) =>
        oneShotConfig.genres.map((genre) => local({ genre }, seed).title),
      ),
    );
    for (const title of titles) expect(title).not.toMatch(/'S\b/);
    expect([...titles].some((t) => /'s\b/.test(t))).toBe(true);
  });

  it("fills every placeholder in the generated adventure", () => {
    for (const genre of oneShotConfig.genres) {
      const a = local({ genre, durationHours: 4 }, 7);
      expect(JSON.stringify(a), genre).not.toMatch(
        /\{(item|patron|place|villain)\}/,
      );
    }
  });
});
