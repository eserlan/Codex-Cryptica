import { describe, expect, it } from "vitest";
import {
  CONCEPT_DIMENSIONS,
  type ConceptDimension,
  conceptPool,
  formatConceptBlock,
  genreFamily,
  rollAdventureConcept,
  rollBiasedConcept,
  rollConcept,
  rollCouncilVoteConcept,
  rollHeistConcept,
  rollMysteryConcept,
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

describe("rollMysteryConcept", () => {
  it("draws situation and conflict fitting the selected mystery type", () => {
    const theftChoices = rollMysteryConcept(
      "Classic Fantasy",
      "Grounded",
      "Theft",
      seeded(1),
    );
    const theftSituation = theftChoices.find(
      (c) => c.dimension === "situation",
    );
    expect([
      "routine-task-reveals",
      "shared-resource-failing",
      "two-communities-one-need",
    ]).toContain(theftSituation?.id);

    const murderChoices = rollMysteryConcept(
      "Classic Fantasy",
      "Grounded",
      "Murder",
      seeded(1),
    );
    const murderSituation = murderChoices.find(
      (c) => c.dimension === "situation",
    );
    expect([
      "staged-mishap",
      "expert-error-covered",
      "blame-on-wrong-people",
      "false-accusation-deflection",
    ]).toContain(murderSituation?.id);
  });

  it("steers 'Other' away from theft defaults", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const choices = rollMysteryConcept(
        "Classic Fantasy",
        "Grounded",
        "Other",
        seeded(seed),
      );
      const situation = choices.find((c) => c.dimension === "situation");
      expect(situation?.id).not.toBe("broken-vault");
      expect(situation?.id).not.toBe("inside-embezzlement");
    }
  });

  it("falls back to general rollConcept when mysteryType is undefined", () => {
    const direct = rollConcept("Steampunk", "Tense", seeded(42));
    const mystery = rollMysteryConcept(
      "Steampunk",
      "Tense",
      undefined,
      seeded(42),
    );
    expect(mystery).toEqual(direct);
  });

  it("respects avoidIds and falls back when preferred entries are avoided", () => {
    const avoided = new Set([
      "broken-vault",
      "quiet-switch",
      "inside-embezzlement",
    ]);
    const choices = rollMysteryConcept(
      "Classic Fantasy",
      "Grounded",
      "Theft",
      seeded(1),
      avoided,
    );
    const situation = choices.find((c) => c.dimension === "situation");
    expect(avoided.has(situation?.id ?? "")).toBe(false);
  });
});

describe("rollBiasedConcept", () => {
  it("biases choices towards specified preferred situations and conflicts", () => {
    const choices = rollBiasedConcept("Classic Fantasy", "Grounded", {
      preferredSituations: ["staged-mishap"],
      preferredConflicts: ["blackmail-pressure"],
      rng: seeded(1),
    });
    expect(choices.find((c) => c.dimension === "situation")?.id).toBe(
      "staged-mishap",
    );
    expect(choices.find((c) => c.dimension === "conflictSource")?.id).toBe(
      "blackmail-pressure",
    );
  });

  it("uses a fresh eligible situation when every preferred situation is avoided", () => {
    const preferredSituations = [
      "staged-mishap",
      "expert-error-covered",
      "blame-on-wrong-people",
      "false-accusation-deflection",
    ];
    const eligibleSituations = conceptPool(
      "situation",
      "Classic Fantasy",
      "Grounded",
    ).map((item) => item.id);
    const remaining = eligibleSituations.filter(
      (id) => !preferredSituations.includes(id),
    );

    expect(remaining.length).toBeGreaterThan(0);

    const choices = rollMysteryConcept(
      "Classic Fantasy",
      "Grounded",
      "Murder",
      seeded(4),
      new Set(preferredSituations),
    );

    expect(remaining).toContain(
      choices.find((choice) => choice.dimension === "situation")?.id,
    );
  });

  it("falls back to generic rollConcept when no preferences are specified", () => {
    const direct = rollConcept("Pirate", "Eerie", seeded(10));
    const biased = rollBiasedConcept("Pirate", "Eerie", { rng: seeded(10) });
    expect(biased).toEqual(direct);
  });
});

describe("rollAdventureConcept", () => {
  it("biases towards situations fitting one-shot emphasis", () => {
    const survivalChoices = rollAdventureConcept(
      "Classic Fantasy",
      "Grounded",
      "Survival",
      seeded(1),
    );
    const situation = survivalChoices.find((c) => c.dimension === "situation");
    expect([
      "shared-resource-failing",
      "settlement-splitting",
      "two-communities-one-need",
    ]).toContain(situation?.id);

    const intrigueChoices = rollAdventureConcept(
      "Classic Fantasy",
      "Grounded",
      "Intrigue",
      seeded(1),
    );
    const intrigueSituation = intrigueChoices.find(
      (c) => c.dimension === "situation",
    );
    expect([
      "secret-pact-fracturing",
      "false-accusation-deflection",
      "disputed-succession-tampering",
      "someone-not-who-they-claim",
    ]).toContain(intrigueSituation?.id);
  });

  it("falls back to generic rollConcept when emphasis is undefined", () => {
    const direct = rollConcept("Classic Fantasy", "Grounded", seeded(5));
    const adventure = rollAdventureConcept(
      "Classic Fantasy",
      "Grounded",
      undefined,
      seeded(5),
    );
    expect(adventure).toEqual(direct);
  });
});

describe("rollHeistConcept", () => {
  it("biases towards situations and conflicts fitting heist types", () => {
    const sabotage = rollHeistConcept(
      "Classic Fantasy",
      "Tense",
      "Sabotage",
      seeded(2),
    );
    const sabotageSituation = sabotage.find((c) => c.dimension === "situation");
    expect([
      "staged-mishap",
      "uncontrolled-contagion-anomaly",
      "shared-resource-failing",
      "ideological-sabotage",
    ]).toContain(sabotageSituation?.id);

    const rescue = rollHeistConcept(
      "Classic Fantasy",
      "Tense",
      "Rescue",
      seeded(2),
    );
    const rescueSituation = rescue.find((c) => c.dimension === "situation");
    expect([
      "rescue-against-deadline",
      "someone-not-who-they-claim",
      "blame-on-wrong-people",
    ]).toContain(rescueSituation?.id);
  });

  it("falls back to generic rollConcept when heistType is undefined", () => {
    const direct = rollConcept("Classic Fantasy", "Tense", seeded(3));
    const heist = rollHeistConcept(
      "Classic Fantasy",
      "Tense",
      undefined,
      seeded(3),
    );
    expect(heist).toEqual(direct);
  });
});

describe("rollCouncilVoteConcept", () => {
  it("biases towards political situations and institutional conflicts", () => {
    const council = rollCouncilVoteConcept(
      "Classic Fantasy",
      "Grounded",
      seeded(5),
    );
    const situation = council.find((c) => c.dimension === "situation");
    expect([
      "disputed-succession-tampering",
      "two-communities-one-need",
      "secret-pact-fracturing",
      "shared-resource-failing",
      "settlement-splitting",
      "false-accusation-deflection",
      "audit-about-to-expose",
    ]).toContain(situation?.id);

    const conflict = council.find((c) => c.dimension === "conflictSource");
    expect([
      "institution-rules",
      "jurisdictional-standoff",
      "blackmail-pressure",
      "secret-pact-fracturing",
      "competing-claims",
      "rival-ambition",
      "hidden-loyalty",
    ]).toContain(conflict?.id);
  });
});
