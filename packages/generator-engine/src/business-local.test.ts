import { describe, expect, it } from "vitest";
import { factionConfig } from "./public-faction-constants";
import { BUSINESS_TYPES, genreGroup } from "./business-tables";
import {
  generateBusinessLocal,
  resolveBusinessOptions,
} from "./business-local";
import { checkBusiness } from "./business-checks";

/** Deterministic PRNG so every run builds the same businesses. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Every canonical theme, plus free-text genres a user might type.
const GENRE_SAMPLES = [
  ...new Set([
    ...factionConfig.themes,
    "Modern Urban",
    "Weird West / Frontier",
    "Swashbuckling / Nautical",
  ]),
];

describe("resolveBusinessOptions", () => {
  it("fills every default when only nothing is given", () => {
    const opts = resolveBusinessOptions({}, seeded(1));
    expect(opts.genre).toBe("Classic Fantasy");
    expect(BUSINESS_TYPES.fantasy).toContain(opts.businessType);
    expect(opts.scale).toBe("small");
    expect(opts.legitimacy).toBe("legitimate");
    expect(opts.wealth).toBe("modest");
    expect(opts.tone).toBe("grounded");
    expect(opts.playersOwn).toBe(false);
  });

  it("keeps a custom business type even when it is outside the genre list", () => {
    const opts = resolveBusinessOptions(
      { genre: "Cyberpunk / Corporate", businessType: "Blacksmith" },
      seeded(2),
    );
    expect(opts.businessType).toBe("Blacksmith");
  });

  it("trims campaign context to the generator context limit", () => {
    const long = "x".repeat(5000);
    const opts = resolveBusinessOptions({ campaignContext: long }, seeded(3));
    expect(opts.campaignContext.length).toBe(1200);
  });
});

describe("generateBusinessLocal", () => {
  it("passes every deterministic check for every genre, type and seed (SC-001, SC-002)", () => {
    for (const genre of GENRE_SAMPLES) {
      for (const businessType of BUSINESS_TYPES[genreGroup(genre)]) {
        for (let seed = 1; seed <= 3; seed++) {
          const doc = generateBusinessLocal(
            { genre, businessType },
            seeded(seed * 97),
          );
          expect(
            checkBusiness(doc),
            `${genre} / ${businessType} / ${seed}`,
          ).toEqual([]);
          expect(doc.fallbackSections).toEqual([]);
        }
      }
    }
  });

  it("gives the leadership role of owner by default, with no management section", () => {
    const doc = generateBusinessLocal({ genre: "Classic Fantasy" }, seeded(4));
    expect(doc.leadership.role).toBe("owner");
    expect(doc.management).toBeUndefined();
  });

  it("makes leadership a manager and adds a management section when the players own it", () => {
    const doc = generateBusinessLocal(
      { genre: "Classic Fantasy", playersOwn: true },
      seeded(5),
    );
    expect(doc.leadership.role).toBe("manager");
    expect(doc.management).toBeDefined();
    expect(doc.management!.strengths.length).toBeGreaterThanOrEqual(2);
    expect(doc.management!.strengths.length).toBeLessThanOrEqual(3);
    expect(doc.management!.obligations.length).toBeGreaterThanOrEqual(1);
    expect(doc.management!.successAttracts.length).toBeGreaterThanOrEqual(1);
  });

  it("keeps staff count within the scale range", () => {
    const tiny = generateBusinessLocal(
      { genre: "Classic Fantasy", scale: "tiny" },
      seeded(6),
    );
    expect(tiny.staff.length).toBeLessThanOrEqual(1);
    const major = generateBusinessLocal(
      { genre: "Classic Fantasy", scale: "major" },
      seeded(7),
    );
    expect(major.staff.length).toBeGreaterThanOrEqual(3);
    expect(major.staff.length).toBeLessThanOrEqual(4);
  });

  it("never gives a fully legitimate business a criminal secret", () => {
    for (let seed = 1; seed <= 25; seed++) {
      const doc = generateBusinessLocal(
        { genre: "Cyberpunk / Corporate", legitimacy: "legitimate" },
        seeded(seed),
      );
      expect(
        checkBusiness(doc).filter((i) => i.code === "legit-secret-criminal"),
      ).toEqual([]);
    }
  });

  it("ties every hook to something established in the business", () => {
    const doc = generateBusinessLocal(
      { genre: "Sci-Fi / Space Opera" },
      seeded(8),
    );
    expect(doc.hooks.length).toBeGreaterThanOrEqual(2);
    expect(doc.hooks.length).toBeLessThanOrEqual(3);
    expect(
      checkBusiness(doc).filter((i) => i.code === "hook-unanchored"),
    ).toEqual([]);
  });

  it("is deterministic for a given seed", () => {
    const a = generateBusinessLocal({ genre: "Classic Fantasy" }, seeded(9));
    const b = generateBusinessLocal({ genre: "Classic Fantasy" }, seeded(9));
    expect(a).toEqual(b);
  });

  it("generates well within the 200 ms budget on average (SC-003)", () => {
    const start = performance.now();
    for (let i = 0; i < 20; i++)
      generateBusinessLocal({ genre: "Classic Fantasy" }, seeded(i));
    const avg = (performance.now() - start) / 20;
    expect(avg).toBeLessThan(200);
  });
});
