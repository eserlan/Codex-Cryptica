import { describe, expect, it } from "vitest";
import { settlementConfig } from "./public-settlement-constants";
import { settlementSchema } from "./public-settlement-schema";
import { FUNCTION_TRAITS } from "./public-settlement-traits";
import {
  buildAdventureHooks,
  buildCurrentTensionParagraph,
  buildInhabitants,
  buildLifeHere,
  buildNotableInhabitants,
  institutionalNote,
  rungFor,
  scaleFor,
  scaleFunctionPhrase,
  selectDiverseFactions,
  selectDiversePoi,
  settlementFactionCategoryPool,
  settlementLocationCategoryPool,
  withArticle,
} from "./public-settlement-community";
import { resolveSmart, type ResolveContext } from "./smart";

function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** A representative resolved config for Fantasy, at a given size. */
function resolve(genre: string, size: string, rng = seededRng(1)) {
  const result = resolveSmart(
    settlementSchema,
    { genre, locked: { size: { value: size, source: "manual" } } },
    rng,
  );
  return result;
}

describe("rungFor / scaleFor", () => {
  const sizes = settlementConfig.sizesByGenre["Fantasy"];

  it("finds the rung index of a known size", () => {
    expect(rungFor(sizes, "Hamlet")).toBe(0);
    expect(rungFor(sizes, "City")).toBe(3);
  });

  it("falls back to the middle rung for a custom size", () => {
    expect(rungFor(sizes, "Floating Sky-Island")).toBe(1);
  });

  it("scales notable inhabitants, factions and economic groups upward with rung", () => {
    const hamlet = scaleFor(0);
    const city = scaleFor(3);
    expect(city.notableInhabitants).toBeGreaterThan(hamlet.notableInhabitants);
    expect(city.factions).toBeGreaterThanOrEqual(hamlet.factions);
    expect(city.economicGroups).toBeGreaterThan(hamlet.economicGroups);
  });

  it("keeps every rung's notable inhabitant count in the 3-6 range", () => {
    for (let rung = 0; rung <= 3; rung++) {
      const { notableInhabitants } = scaleFor(rung);
      expect(notableInhabitants).toBeGreaterThanOrEqual(3);
      expect(notableInhabitants).toBeLessThanOrEqual(6);
    }
  });
});

describe("buildInhabitants", () => {
  it("scales the number of economic groups with settlement size", () => {
    const rng = seededRng(3);
    const hamlet = resolve("Fantasy", "Hamlet", seededRng(3));
    const city = resolve("Fantasy", "City", seededRng(3));
    const hamletResult = buildInhabitants(hamlet.values, scaleFor(0), rng);
    const cityResult = buildInhabitants(city.values, scaleFor(3), rng);
    expect(cityResult.economicGroups.length).toBeGreaterThan(
      hamletResult.economicGroups.length,
    );
  });

  it("always contributes a group tied to the settlement's primary function", () => {
    const resolved = resolve("Fantasy", "Village", seededRng(5));
    const result = buildInhabitants(resolved.values, scaleFor(1), seededRng(5));
    expect(result.economicGroups.length).toBeGreaterThan(0);
  });

  it("avoids arbitrary precision like exact head counts", () => {
    const resolved = resolve("Fantasy", "Town", seededRng(7));
    const result = buildInhabitants(resolved.values, scaleFor(2), seededRng(7));
    for (const line of result.economicGroups) {
      expect(line).not.toMatch(/\bexactly\b/i);
      expect(line).not.toMatch(/\b\d{2,}\s+(blacksmiths|fishermen|farmers)\b/i);
    }
  });

  it("is deterministic for a fixed seed", () => {
    const resolved = resolve("Fantasy", "Village", seededRng(9));
    const a = buildInhabitants(resolved.values, scaleFor(1), seededRng(9));
    const b = buildInhabitants(resolved.values, scaleFor(1), seededRng(9));
    expect(a).toEqual(b);
  });

  it("works across every genre without throwing", () => {
    for (const genre of settlementConfig.genres) {
      const resolved = resolve(genre, "Village", seededRng(11));
      expect(() =>
        buildInhabitants(resolved.values, scaleFor(1), seededRng(11)),
      ).not.toThrow();
    }
  });
});

describe("buildNotableInhabitants", () => {
  it("returns the requested count with unique names", () => {
    const resolved = resolve("Fantasy", "Town", seededRng(13));
    const inhabitants = buildNotableInhabitants(
      resolved.values,
      "Fantasy",
      5,
      "Saltmere",
      seededRng(13),
    );
    expect(inhabitants).toHaveLength(5);
    expect(new Set(inhabitants.map((i) => i.name)).size).toBe(5);
  });

  it("never names an inhabitant after the settlement itself", () => {
    const rng = seededRng(17);
    for (let i = 0; i < 30; i++) {
      const resolved = resolve("Fantasy", "Village", rng);
      const inhabitants = buildNotableInhabitants(
        resolved.values,
        "Fantasy",
        4,
        "Dunmar",
        rng,
      );
      expect(inhabitants.map((n) => n.name)).not.toContain("Dunmar");
    }
  });

  it("does not make every inhabitant an authority or faction figure", () => {
    const resolved = resolve("Fantasy", "City", seededRng(19));
    const inhabitants = buildNotableInhabitants(
      resolved.values,
      "Fantasy",
      6,
      "Highmarch",
      seededRng(19),
    );
    const authorityLike = inhabitants.filter((i) => i.category === "authority");
    expect(authorityLike.length).toBeLessThanOrEqual(2);
    expect(inhabitants.some((i) => i.category === "profession")).toBe(true);
    expect(inhabitants.some((i) => i.category === "social")).toBe(true);
  });

  it("gives every inhabitant a name, role and one-sentence note", () => {
    const resolved = resolve("Fantasy", "Village", seededRng(23));
    const inhabitants = buildNotableInhabitants(
      resolved.values,
      "Fantasy",
      4,
      "Rill",
      seededRng(23),
    );
    for (const inhabitant of inhabitants) {
      expect(inhabitant.name.length).toBeGreaterThan(0);
      expect(inhabitant.role.length).toBeGreaterThan(0);
      expect(inhabitant.note.length).toBeGreaterThan(0);
      // A single sentence: no more than one internal terminal punctuation mark.
      expect(inhabitant.note.match(/[.!?]/g)?.length ?? 0).toBeLessThanOrEqual(
        1,
      );
    }
  });

  it("works across every genre without throwing", () => {
    for (const genre of settlementConfig.genres) {
      const resolved = resolve(genre, "Village", seededRng(29));
      expect(() =>
        buildNotableInhabitants(
          resolved.values,
          genre,
          4,
          "Test",
          seededRng(29),
        ),
      ).not.toThrow();
    }
  });
});

describe("buildLifeHere", () => {
  it("selects a subset of categories rather than all seven every time", () => {
    const resolved = resolve("Fantasy", "Town", seededRng(31));
    const details = buildLifeHere(resolved.values, seededRng(31));
    expect(details.length).toBeGreaterThanOrEqual(3);
    expect(details.length).toBeLessThan(7);
  });

  it("never mentions the current tension, to avoid thematic monoculture", () => {
    const rng = seededRng(37);
    for (let i = 0; i < 20; i++) {
      const resolved = resolve("Fantasy", "Town", rng);
      const details = buildLifeHere(resolved.values, rng);
      for (const detail of details) {
        expect(detail.toLowerCase()).not.toContain(
          resolved.values.mainTension.toLowerCase(),
        );
      }
    }
  });

  it("works across every genre without throwing", () => {
    for (const genre of settlementConfig.genres) {
      const resolved = resolve(genre, "Town", seededRng(41));
      expect(() => buildLifeHere(resolved.values, seededRng(41))).not.toThrow();
    }
  });
});

describe("selectDiversePoi", () => {
  it("draws locations from more than one category when the pool allows it", () => {
    const rng = seededRng(43);
    const ctx: ResolveContext = { genre: "Fantasy", values: {}, traits: [] };
    const pool = settlementLocationCategoryPool("Fantasy");
    const { categories } = selectDiversePoi(pool, 6, ctx, rng);
    expect(new Set(categories).size).toBeGreaterThan(1);
  });

  it("returns exactly the requested count when the pool is large enough", () => {
    const rng = seededRng(47);
    const ctx: ResolveContext = { genre: "Fantasy", values: {}, traits: [] };
    const pool = settlementLocationCategoryPool("Fantasy");
    const { values } = selectDiversePoi(pool, 6, ctx, rng);
    expect(values).toHaveLength(6);
    expect(new Set(values).size).toBe(6);
  });
});

describe("selectDiverseFactions", () => {
  it("draws factions from more than one category when the pool allows it", () => {
    const rng = seededRng(53);
    const ctx: ResolveContext = { genre: "Fantasy", values: {}, traits: [] };
    const pool = settlementFactionCategoryPool("Fantasy");
    const { categories } = selectDiverseFactions(pool, 3, ctx, rng);
    expect(new Set(categories).size).toBeGreaterThan(1);
  });

  it("still makes sense as independent factions rather than restating a single dispute", () => {
    // Weak proxy: categories differ, which is the mechanism that keeps
    // motivations independent rather than every faction sharing one trait.
    const rng = seededRng(59);
    const ctx: ResolveContext = { genre: "Cyberpunk", values: {}, traits: [] };
    const pool = settlementFactionCategoryPool("Cyberpunk");
    const { values, categories } = selectDiverseFactions(pool, 2, ctx, rng);
    expect(values).toHaveLength(2);
    expect(categories[0]).not.toBe(categories[1]);
  });
});

describe("buildAdventureHooks", () => {
  const ctx = {
    environment: "Mountain pass",
    primaryFunction: "Mining settlement",
    authorityType: "Tribal elders",
    mainTension: "Famine or drought",
    factions: ["The Iron Shield Guard", "The Gilded Merchants"],
    pois: ["Market Bazaar", "Ruined Watchtower", "Grand Archive"],
    inhabitants: [
      {
        name: "Rill",
        role: "Council Member",
        note: "x",
        category: "authority" as const,
      },
      {
        name: "Dax",
        role: "Mine Foreman",
        note: "y",
        category: "profession" as const,
      },
    ],
  };

  it("returns exactly three hooks", () => {
    const hooks = buildAdventureHooks(ctx, seededRng(61));
    expect(hooks).toHaveLength(3);
  });

  it("only the first hook mentions the current tension", () => {
    const rng = seededRng(67);
    for (let i = 0; i < 30; i++) {
      const hooks = buildAdventureHooks(ctx, rng);
      const [political, ordinary, exploration] = hooks;
      expect(political.toLowerCase()).toContain("famine or drought");
      expect(ordinary.toLowerCase()).not.toContain("famine or drought");
      expect(exploration.toLowerCase()).not.toContain("famine or drought");
    }
  });

  it("falls back gracefully when there is no non-authority inhabitant", () => {
    const noSocial = { ...ctx, inhabitants: [ctx.inhabitants[0]] };
    expect(() => buildAdventureHooks(noSocial, seededRng(71))).not.toThrow();
  });

  it("is deterministic for a fixed seed", () => {
    const a = buildAdventureHooks(ctx, seededRng(73));
    const b = buildAdventureHooks(ctx, seededRng(73));
    expect(a).toEqual(b);
  });
});

describe("buildAdventureHooks — avoids repeating a landmark", () => {
  it("does not use the same point of interest for both the ordinary and exploration hooks", () => {
    const rng = seededRng(83);
    const ctx = {
      environment: "Mountain pass",
      primaryFunction: "Mining settlement",
      authorityType: "Tribal elders",
      mainTension: "Famine or drought",
      factions: ["The Iron Shield Guard", "The Gilded Merchants"],
      pois: ["Market Bazaar", "Ruined Watchtower"],
      inhabitants: [] as const,
    };
    for (let i = 0; i < 100; i++) {
      const hooks = buildAdventureHooks(ctx, rng);
      const [, ordinary, exploration] = hooks;
      const mentionsBoth =
        (ordinary.includes("Market Bazaar") ||
          ordinary.includes("market bazaar")) &&
        (exploration.includes("Market Bazaar") ||
          exploration.includes("market bazaar"));
      const mentionsBothWatchtower =
        (ordinary.includes("Ruined Watchtower") ||
          ordinary.includes("ruined watchtower")) &&
        (exploration.includes("Ruined Watchtower") ||
          exploration.includes("ruined watchtower"));
      expect(mentionsBoth).toBe(false);
      expect(mentionsBothWatchtower).toBe(false);
    }
  });
});

describe("buildNotableInhabitants — avoids repeating a profession title", () => {
  it("gives the two profession slots different roles when options allow it", () => {
    const rng = seededRng(89);
    const resolved = resolve("Fantasy", "City", rng);
    for (let i = 0; i < 50; i++) {
      const inhabitants = buildNotableInhabitants(
        resolved.values,
        "Fantasy",
        6,
        "Highmarch",
        rng,
      );
      const professionRoles = inhabitants
        .filter((n) => n.category === "profession")
        .map((n) => n.role);
      if (professionRoles.length === 2) {
        expect(professionRoles[0]).not.toBe(professionRoles[1]);
      }
    }
  });
});

describe("scaleFunctionPhrase", () => {
  it("never describes a hamlet-rung settlement as a city", () => {
    const phrase = scaleFunctionPhrase(["academic"], 0);
    expect(phrase.toLowerCase()).not.toContain("city");
    expect(phrase.toLowerCase()).not.toContain("district");
    expect(phrase.toLowerCase()).not.toContain("university");
  });

  it("gives the city rung a bigger noun than the hamlet rung", () => {
    const hamlet = scaleFunctionPhrase(["academic"], 0);
    const city = scaleFunctionPhrase(["academic"], 3);
    expect(hamlet).not.toBe(city);
  });

  it("falls back to a generic scale noun when no trait matches and no raw value is given", () => {
    const phrase = scaleFunctionPhrase(["nonexistent-trait" as never], 0);
    expect(phrase.length).toBeGreaterThan(0);
  });

  it("respects a custom or unrecognised function verbatim instead of dropping it", () => {
    // A custom axis value, or a legacy value like the deprecated `economy`
    // option, carries no traits. There is no honest basis to scale-adjust
    // something unrecognised, so the raw value is kept rather than silently
    // replaced with a bland "town".
    const phrase = scaleFunctionPhrase([], 1, "Mining");
    expect(phrase).toBe("mining");
  });

  it("is deterministic: same traits and rung always give the same phrase", () => {
    expect(scaleFunctionPhrase(["trade"], 2)).toBe(
      scaleFunctionPhrase(["trade"], 2),
    );
  });

  it("covers every trait that appears as a primary function anywhere", () => {
    const traits = new Set(Object.values(FUNCTION_TRAITS).flat());
    const uncovered: string[] = [];
    for (const trait of traits) {
      const phrase = scaleFunctionPhrase([trait], 0);
      if (!phrase || phrase.length === 0) uncovered.push(trait);
    }
    expect(uncovered).toEqual([]);
  });
});

describe("withArticle", () => {
  it("uses 'an' before a vowel sound", () => {
    expect(withArticle("academic enclave")).toBe("an academic enclave");
    expect(withArticle("outpost")).toBe("an outpost");
  });

  it("uses 'a' before a consonant sound", () => {
    expect(withArticle("trading hamlet")).toBe("a trading hamlet");
  });
});

describe("institutionalNote", () => {
  it("returns a note for the smallest rung", () => {
    const note = institutionalNote(["academic"], 0);
    expect(note).toBeTruthy();
  });

  it("returns nothing for the largest rung, where scale is not a constraint", () => {
    const note = institutionalNote(["academic"], 3);
    expect(note).toBeUndefined();
  });
});

describe("buildCurrentTensionParagraph", () => {
  const inhabitants = [
    {
      name: "Sable",
      role: "Guild Representative",
      note: "x",
      category: "authority" as const,
    },
    {
      name: "Cass",
      role: "Caravan Master",
      note: "y",
      category: "profession" as const,
    },
  ];

  it("names the authority-figure inhabitant when one exists", () => {
    const rng = seededRng(97);
    for (let i = 0; i < 20; i++) {
      const p = buildCurrentTensionParagraph(
        "Famine or drought",
        inhabitants,
        rng,
      );
      expect(p).toContain("Sable");
    }
  });

  it("still produces a paragraph with no inhabitants at all", () => {
    expect(() =>
      buildCurrentTensionParagraph("Famine or drought", [], seededRng(101)),
    ).not.toThrow();
  });

  it("always mentions the tension itself", () => {
    const rng = seededRng(103);
    for (let i = 0; i < 10; i++) {
      const p = buildCurrentTensionParagraph(
        "Famine or drought",
        inhabitants,
        rng,
      );
      expect(p.toLowerCase()).toContain("famine or drought");
    }
  });
});
