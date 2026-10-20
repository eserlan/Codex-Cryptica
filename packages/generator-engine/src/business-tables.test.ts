import { describe, expect, it } from "vitest";
import {
  BUSINESS_TYPES,
  BUSINESS_POOLS,
  GENERIC_POOLS,
  PRICE_PATTERN,
  CRIMINAL_WORDS,
  genreGroup,
} from "./business-tables";

describe("genreGroup", () => {
  it.each([
    ["Classic Fantasy", "fantasy"],
    ["Dark Fantasy", "fantasy"],
    ["Sci-Fi / Space Opera", "scifi"],
    ["Cyberpunk / Corporate", "cyberpunk"],
    ["Cosmic Horror", "horror"],
    ["Weird West / Frontier", "western"],
    ["Swashbuckling / Nautical", "pirate"],
    ["Modern Urban", "modern"],
    ["something custom", "fantasy"],
  ])("maps %s to %s", (genre, group) => {
    expect(genreGroup(genre)).toBe(group);
  });
});

describe("business tables", () => {
  it("offers the types #3627 lists for fantasy, sci-fi and cyberpunk", () => {
    expect(BUSINESS_TYPES.fantasy).toEqual(
      expect.arrayContaining([
        "Blacksmith",
        "Apothecary",
        "Caravan company",
        "Mercenary company",
        "Courier service",
      ]),
    );
    expect(BUSINESS_TYPES.scifi).toEqual(
      expect.arrayContaining([
        "Starport freight company",
        "Salvage firm",
        "Data brokerage",
        "Private security company",
      ]),
    );
    expect(BUSINESS_TYPES.cyberpunk).toEqual(
      expect.arrayContaining([
        "Ripper clinic",
        "Fixer front",
        "Noodle bar",
        "Shell corporation",
      ]),
    );
  });

  it("has no empty genre list and no duplicate types", () => {
    for (const [group, types] of Object.entries(BUSINESS_TYPES)) {
      expect(types.length, group).toBeGreaterThanOrEqual(6);
      expect(new Set(types).size, group).toBe(types.length);
    }
  });

  it("gives every genre group at least 6 entries in each pool", () => {
    for (const [group, pools] of Object.entries(BUSINESS_POOLS)) {
      for (const [name, pool] of Object.entries(pools)) {
        if (name === "names") {
          const names = pool as unknown as { first: string[]; last: string[] };
          expect(
            names.first.length,
            `${group}.names.first`,
          ).toBeGreaterThanOrEqual(6);
          expect(
            names.last.length,
            `${group}.names.last`,
          ).toBeGreaterThanOrEqual(6);
          continue;
        }
        expect(
          (pool as readonly unknown[]).length,
          `${group}.${name}`,
        ).toBeGreaterThanOrEqual(6);
      }
    }
  });

  it("gives every generic pool at least 6 entries", () => {
    for (const [name, pool] of Object.entries(GENERIC_POOLS)) {
      expect(pool.length, name).toBeGreaterThanOrEqual(6);
    }
  });

  it("keeps price patterns out of every table", () => {
    const all =
      JSON.stringify(BUSINESS_POOLS) +
      JSON.stringify(BUSINESS_TYPES) +
      JSON.stringify(GENERIC_POOLS);
    expect(PRICE_PATTERN.test(all)).toBe(false);
  });

  it("keeps criminal words out of the non-criminal secret pool", () => {
    for (const secret of Object.values(BUSINESS_POOLS).flatMap(
      (p) => p.legitSecrets,
    )) {
      const lower = secret.toLowerCase();
      for (const word of CRIMINAL_WORDS)
        expect(lower.includes(word), secret).toBe(false);
    }
  });
});
