import { describe, expect, it } from "vitest";
import { SETTLEMENT_LEXICON } from "./public-settlement-lexicon";
import { settlementSchema } from "./public-settlement-schema";
import { generateSettlementLocal } from "./public-settlement";
import { analyseIntent, applyIntent, resolveSmart } from "./smart";

function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Run a description through the whole path, as the form will. */
function read(description: string, genre = "Fantasy") {
  const signals = analyseIntent(description, SETTLEMENT_LEXICON);
  return applyIntent(settlementSchema, signals, { genre }, description);
}

/** Axis id to inferred value, for compact expectations. */
function inferredValues(description: string, genre = "Fantasy") {
  return Object.fromEntries(
    read(description, genre).inferred.map((i) => [i.axisId, i.value]),
  );
}

describe("settlement free-text corpus", () => {
  it("reads the epic's headline example", () => {
    const values = inferredValues(
      "A prosperous but creepy coastal town controlled by merchants",
    );
    expect(values.environment).toBe("Coastal harbour");
    expect(values.tone).toBe("Decadent and corrupt");
    expect(values.size).toBe("Town");
  });

  it("reads a mining description", () => {
    const values = inferredValues(
      "a mining village up in the mountains, slowly dying",
    );
    expect(values.environment).toBe("Mountain pass");
    expect(values.primaryFunction).toBe("Mining settlement");
    expect(values.size).toBe("Village");
  });

  it("reads a religious description", () => {
    const values = inferredValues("a pilgrimage town built around a shrine");
    expect(values.primaryFunction).toBe("Pilgrimage town");
  });

  it("reads a scholarly description", () => {
    const values = inferredValues("a university city full of libraries");
    expect(values.primaryFunction).toBe("Academic city");
    expect(values.size).toBe("City");
  });

  it("reads a military description", () => {
    const values = inferredValues("a military fortress guarding the pass");
    expect(values.primaryFunction).toBe("Military fortress");
  });

  it("only weights a military description that names no single option", () => {
    // "Military fortress" and "Border checkpoint" are both military, and
    // nothing here picks between them, so neither should be pinned.
    const { inferred, config } = read("a fortified garrison on the border");
    expect(
      inferred.find((i) => i.axisId === "primaryFunction"),
    ).toBeUndefined();
    expect(config.bias?.military).toBeGreaterThan(1);
  });

  it("reads a farming description", () => {
    const values = inferredValues("a quiet farming community on the plains");
    expect(values.environment).toBe("Open plains");
    expect(values.primaryFunction).toBe("Farming community");
  });

  it("reads a cursed description", () => {
    const description = "a cursed village in the marshes";
    expect(inferredValues(description).environment).toBe("Marshland");
    // Two Fantasy tensions are supernatural, so "cursed" weights the roll
    // towards them rather than picking one on the reader's behalf.
    const { inferred, config } = read(description);
    expect(inferred.find((i) => i.axisId === "mainTension")).toBeUndefined();
    expect(config.bias?.supernatural).toBeGreaterThan(1);
  });

  it("reads a famine description", () => {
    const values = inferredValues("a village suffering a long drought");
    expect(values.mainTension).toBe("Famine or drought");
  });

  it("works in another genre's vocabulary", () => {
    const values = inferredValues(
      "a corporate arcology district under constant surveillance",
      "Cyberpunk",
    );
    expect(values.environment).toBe("Corporate arcology district");
  });

  it("reads a sci-fi description", () => {
    const values = inferredValues(
      "a research station on a terraformed moon",
      "Sci-Fi",
    );
    expect(values.primaryFunction).toBe("Research station");
  });

  it("reads a western description", () => {
    const values = inferredValues(
      "an outlaw hideout far from any law",
      "Western",
    );
    expect(values.primaryFunction).toBe("Outlaw hideout");
  });

  it("reads a post-apocalyptic description", () => {
    const description = "a fortified hilltop where survivors shelter";
    expect(inferredValues(description, "Post-Apocalyptic").environment).toBe(
      "Fortified hilltop",
    );
    // "Survivor refuge" and "Hidden sanctuary" are both refuges, so the
    // description weights them both instead of choosing.
    expect(
      read(description, "Post-Apocalyptic").config.bias?.refuge,
    ).toBeGreaterThan(1);
  });
});

describe("settlement free-text restraint", () => {
  it("infers nothing from a description with no settings in it", () => {
    const { inferred, config } = read("somewhere my players will remember");
    expect(inferred).toEqual([]);
    expect(config.locked).toBeUndefined();
  });

  it("infers nothing from an empty description", () => {
    const { inferred, config } = read("");
    expect(inferred).toEqual([]);
    expect(config.bias).toEqual({});
  });

  it("biases without pinning when several options fit equally", () => {
    // Six Fantasy environments are inland, so nothing here picks between them.
    const { inferred, config } = read("an inland settlement");
    expect(inferred.find((i) => i.axisId === "environment")).toBeUndefined();
    expect(config.bias?.inland).toBeGreaterThan(1);
  });

  it("honours a negation instead of pinning its opposite", () => {
    const { config } = read("a town, but definitely not coastal");
    expect(config.bias?.coastal).toBe(0);
    const rng = seededRng(3);
    for (let i = 0; i < 100; i++) {
      const { values } = resolveSmart(settlementSchema, config, rng);
      expect(values.environment).not.toBe("Coastal harbour");
    }
  });

  it("explains each inference with the wording that caused it", () => {
    const { inferred } = read("a coastal harbour town");
    const environment = inferred.find((i) => i.axisId === "environment");
    expect(environment?.phrases).toContain("coastal");
  });
});

describe("settlement free-text end to end", () => {
  it("produces a settlement matching the description", () => {
    const { config } = read(
      "A wealthy but sinister coastal town ruled by merchants",
    );
    const locked = Object.fromEntries(
      Object.entries(config.locked ?? {}).map(([k, v]) => [k, v.value]),
    );
    const out = generateSettlementLocal(
      { genre: "Fantasy", ...locked },
      seededRng(5),
    );
    expect(out.lore).toContain("**Environment**: Coastal harbour");
    expect(out.lore).toContain("**Scale**: Town");
  });

  it("leaves the unmentioned axes to the resolver, which keeps them coherent", () => {
    const { config } = read("a coastal harbour that lives on trade");
    const rng = seededRng(7);
    let merchantRule = 0;
    for (let i = 0; i < 200; i++) {
      const { values } = resolveSmart(settlementSchema, config, rng);
      if (values.authorityType === "Merchant guild") merchantRule++;
    }
    // Seven authorities, so flat randomness would be about 14%.
    expect(merchantRule / 200).toBeGreaterThan(0.3);
  });
});
