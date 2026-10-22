import { describe, expect, it } from "vitest";
import {
  CONCEPT_DIMENSIONS,
  type ConceptDimension,
  conceptPool,
  formatConceptBlock,
  genreFamily,
  rollConcept,
} from "./concept-dimensions";
import { factionConfig } from "./public-faction-constants";

const DIMENSIONS = Object.keys(CONCEPT_DIMENSIONS) as ConceptDimension[];

/** A deterministic random source, so the same seed gives the same draw. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

describe("rollConcept", () => {
  it("returns the same choices for the same seed", () => {
    const first = rollConcept("Classic Fantasy", "Grounded", seeded(7));
    const second = rollConcept("Classic Fantasy", "Grounded", seeded(7));
    expect(first).toEqual(second);
  });

  it("returns one choice for every dimension", () => {
    const choices = rollConcept("Pirate", "Tense", seeded(3));
    expect(choices.map((choice) => choice.dimension)).toEqual(DIMENSIONS);
  });

  it("draws only from the pool for the genre and tone", () => {
    const pool = new Set(
      DIMENSIONS.flatMap((dimension) =>
        conceptPool(dimension, "Classic Fantasy", "Grounded").map(
          (item) => item.id,
        ),
      ),
    );
    for (let seed = 1; seed <= 200; seed++) {
      for (const choice of rollConcept(
        "Classic Fantasy",
        "Grounded",
        seeded(seed),
      )) {
        expect(pool.has(choice.id)).toBe(true);
      }
    }
  });

  it("skips avoided entries while others remain", () => {
    const pool = conceptPool("situation", "Pirate", "Grounded");
    const keep = pool[pool.length - 1];
    const avoid = new Set(
      pool.filter((item) => item.id !== keep.id).map((item) => item.id),
    );
    const [situation] = rollConcept("Pirate", "Grounded", seeded(5), avoid);
    expect(situation.id).toBe(keep.id);
  });

  it("falls back to the full pool when every entry is avoided", () => {
    const everything = new Set(
      DIMENSIONS.flatMap((dimension) =>
        CONCEPT_DIMENSIONS[dimension].map((item) => item.id),
      ),
    );
    const choices = rollConcept("Pirate", "Grounded", seeded(9), everything);
    expect(choices).toHaveLength(DIMENSIONS.length);
    for (const choice of choices) {
      expect(choice.id).not.toBe("");
    }
  });
});

describe("genre families", () => {
  it("maps every faction theme to a family", () => {
    for (const theme of factionConfig.themes) {
      expect(genreFamily(theme), theme).toBeDefined();
    }
  });

  it("keeps space entries out of a pre-industrial genre", () => {
    const pool = conceptPool(
      "distinctiveElement",
      "Classic Fantasy",
      "Grounded",
    );
    expect(pool.some((item) => item.id === "orbital-hatch")).toBe(false);
    expect(pool.some((item) => item.id === "night-bathhouse")).toBe(false);
    expect(pool.some((item) => item.id === "river-mill")).toBe(true);
  });

  it("keeps gothic entries out of a space genre", () => {
    const pool = conceptPool(
      "distinctiveElement",
      "Sci-Fi / Space Opera",
      "Grounded",
    );
    expect(pool.some((item) => item.id === "night-bathhouse")).toBe(false);
    expect(pool.some((item) => item.id === "orbital-hatch")).toBe(true);
  });

  it("uses only untagged entries for a custom genre", () => {
    expect(genreFamily("Mystery Pulp Zebra")).toBeUndefined();
    for (const dimension of DIMENSIONS) {
      for (const item of conceptPool(
        dimension,
        "Mystery Pulp Zebra",
        "Grounded",
      )) {
        expect(item.families).toBeUndefined();
      }
    }
  });
});

describe("dark entries", () => {
  it("excludes dark entries for a hopeful tone", () => {
    for (const dimension of DIMENSIONS) {
      const pool = conceptPool(dimension, "Classic Fantasy", "Hopeful");
      expect(pool.some((item) => item.dark)).toBe(false);
    }
  });

  it("excludes dark entries for the optimistic genre", () => {
    for (const dimension of DIMENSIONS) {
      const pool = conceptPool(
        dimension,
        "Optimistic Exploration Sci-Fi",
        "Grounded",
      );
      expect(pool.some((item) => item.dark)).toBe(false);
    }
  });

  it("keeps dark entries for a grim tone in a grim genre", () => {
    const pool = conceptPool("stakeKind", "Cosmic Horror", "Bleak");
    expect(pool.some((item) => item.dark)).toBe(true);
  });
});

describe("pool size", () => {
  it("gives every genre at least six options per dimension, for every tone", () => {
    for (const genre of factionConfig.themes) {
      for (const tone of ["Grounded", "Hopeful"]) {
        for (const dimension of DIMENSIONS) {
          expect(
            conceptPool(dimension, genre, tone).length,
            `${genre} / ${tone} / ${dimension}`,
          ).toBeGreaterThanOrEqual(6);
        }
      }
    }
  });
});

describe("formatConceptBlock", () => {
  it("renders every choice and the genre-terms instruction", () => {
    const choices = rollConcept("Steampunk", "Eerie", seeded(11));
    const block = formatConceptBlock(choices);
    expect(block).toContain("genre's own terms");
    for (const choice of choices) {
      expect(block).toContain(choice.guidance);
    }
  });

  it("renders nothing when there are no choices", () => {
    expect(formatConceptBlock([])).toBe("");
  });
});
