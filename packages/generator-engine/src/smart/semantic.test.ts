import { describe, expect, it } from "vitest";
import { analyseIntent, applyIntent, intentBias } from "./semantic";
import { BASE_LEXICON, mergeLexicons } from "./lexicon";
import type { SmartGeneratorSchema } from "./types";

/** Traits found in a description, strongest first, ignoring the scores. */
function traitsOf(text: string): string[] {
  return analyseIntent(text, BASE_LEXICON)
    .filter((s) => !s.negated)
    .map((s) => s.trait);
}

describe("analyseIntent", () => {
  it("finds nothing in an empty description", () => {
    expect(analyseIntent("", BASE_LEXICON)).toEqual([]);
    expect(analyseIntent("   ", BASE_LEXICON)).toEqual([]);
  });

  it("reads the epic's worked example", () => {
    const traits = traitsOf(
      "A prosperous but creepy coastal town controlled by merchants",
    );
    expect(traits).toContain("prosperous");
    expect(traits).toContain("eerie");
    expect(traits).toContain("coastal");
    expect(traits).toContain("trade");
    expect(traits).toContain("medium");
  });

  it("reads the second worked example", () => {
    const traits = traitsOf("isolated mining colony slowly being abandoned");
    expect(traits).toContain("isolated");
    expect(traits).toContain("mining");
    expect(traits).toContain("declining");
  });

  it("matches more than exact keyword equality", () => {
    expect(traitsOf("ruled by merchants")).toContain("trade");
    expect(traitsOf("a merchant oligarchy")).toContain("trade");
    expect(traitsOf("mercantile interests run the place")).toContain("trade");
  });

  it("matches multi-word phrases", () => {
    expect(traitsOf("a port town")).toContain("coastal");
    expect(traitsOf("built around a holy site")).toContain("religious");
  });

  it("scores an exact phrase above a morphological variant", () => {
    const exact = analyseIntent("wealthy", BASE_LEXICON)[0];
    const variant = analyseIntent("wealthier", BASE_LEXICON)[0];
    expect(exact.score).toBeGreaterThan(variant.score);
    expect(variant.trait).toBe("prosperous");
  });

  it("returns the phrase that produced each signal", () => {
    const [signal] = analyseIntent("a coastal settlement", BASE_LEXICON);
    expect(signal.phrase).toBe("coastal");
  });

  it("sorts the strongest signal first", () => {
    const signals = analyseIntent(
      "coastal coastal coastal and slightly grim",
      BASE_LEXICON,
    );
    expect(signals[0].trait).toBe("coastal");
  });

  it("handles a description with nothing recognisable", () => {
    expect(analyseIntent("zzz qqq wibble", BASE_LEXICON)).toEqual([]);
  });
});

describe("analyseIntent — negation", () => {
  it("marks a negated match rather than dropping it", () => {
    const signals = analyseIntent("not a port town", BASE_LEXICON);
    const coastal = signals.find((s) => s.trait === "coastal");
    expect(coastal?.negated).toBe(true);
  });

  it("recognises several negators", () => {
    for (const text of [
      "no religious presence",
      "without any religious site",
      "never religious",
    ]) {
      const signal = analyseIntent(text, BASE_LEXICON).find(
        (s) => s.trait === "religious",
      );
      expect(signal?.negated).toBe(true);
    }
  });

  it("does not negate a match that is out of the negator's reach", () => {
    const signals = analyseIntent(
      "no temples here, though the harbour is busy and coastal trade thrives",
      BASE_LEXICON,
    );
    expect(signals.find((s) => s.trait === "religious")?.negated).toBe(true);
    expect(signals.find((s) => s.trait === "coastal")?.negated).toBe(false);
  });

  it("keeps the stronger side of a contradiction and records both", () => {
    const signals = analyseIntent(
      "wealthy wealthy prosperous but not wealthy",
      BASE_LEXICON,
    );
    const prosperous = signals.filter((s) => s.trait === "prosperous");
    expect(prosperous.some((s) => s.negated)).toBe(true);
    expect(prosperous.some((s) => !s.negated)).toBe(true);
  });
});

describe("intentBias", () => {
  it("favours the traits a description asked for", () => {
    const bias = intentBias(analyseIntent("a coastal town", BASE_LEXICON));
    expect(bias.coastal).toBeGreaterThan(1);
  });

  it("suppresses a negated trait outright", () => {
    const bias = intentBias(analyseIntent("not coastal", BASE_LEXICON));
    expect(bias.coastal).toBe(0);
  });

  it("leaves unmentioned traits alone", () => {
    const bias = intentBias(analyseIntent("a coastal town", BASE_LEXICON));
    expect(bias.mining).toBeUndefined();
  });

  it("is empty for an empty description", () => {
    expect(intentBias([])).toEqual({});
  });
});

const schema: SmartGeneratorSchema = {
  id: "test",
  axes: [
    {
      id: "environment",
      label: "Environment",
      pool: () => [
        { value: "Coastal harbour", traits: ["coastal", "maritime"] },
        { value: "Mountain pass", traits: ["mountain", "inland"] },
        { value: "Deep forest", traits: ["forest", "inland"] },
      ],
    },
    {
      id: "primaryFunction",
      label: "Primary Function",
      pool: () => [
        { value: "Trade hub", traits: ["trade"] },
        { value: "Mining settlement", traits: ["mining"] },
        { value: "Fortress", traits: ["military"] },
      ],
    },
  ],
};

describe("applyIntent", () => {
  it("locks an axis when one option clearly wins", () => {
    const signals = analyseIntent("a coastal harbour town", BASE_LEXICON);
    const { config, inferred } = applyIntent(schema, signals, {});
    expect(config.locked?.environment).toEqual({
      value: "Coastal harbour",
      source: "inferred",
    });
    expect(inferred.map((i) => i.axisId)).toContain("environment");
  });

  it("describes what it inferred, for the chips UI", () => {
    const signals = analyseIntent("a coastal harbour town", BASE_LEXICON);
    const { inferred } = applyIntent(schema, signals, {});
    const environment = inferred.find((i) => i.axisId === "environment");
    expect(environment?.label).toBe("Environment");
    expect(environment?.value).toBe("Coastal harbour");
    expect(environment?.phrases.length).toBeGreaterThan(0);
  });

  it("biases rather than locks when the signal is weak", () => {
    const signals = analyseIntent("somewhere a bit inland", BASE_LEXICON);
    const { config, inferred } = applyIntent(schema, signals, {});
    // Two options share the inland trait, so nothing should be pinned.
    expect(config.locked?.environment).toBeUndefined();
    expect(inferred.find((i) => i.axisId === "environment")).toBeUndefined();
    expect(config.bias?.inland).toBeGreaterThan(1);
  });

  it("never overrides a choice the user already made", () => {
    const signals = analyseIntent("a coastal harbour town", BASE_LEXICON);
    const { config, inferred } = applyIntent(schema, signals, {
      locked: { environment: { value: "Mountain pass", source: "manual" } },
    });
    expect(config.locked?.environment).toEqual({
      value: "Mountain pass",
      source: "manual",
    });
    expect(inferred.find((i) => i.axisId === "environment")).toBeUndefined();
  });

  it("never overrides a preset either", () => {
    const signals = analyseIntent("a coastal harbour town", BASE_LEXICON);
    const { config } = applyIntent(schema, signals, {
      locked: { environment: { value: "Deep forest", source: "preset" } },
    });
    expect(config.locked?.environment.source).toBe("preset");
  });

  it("does not lock an axis a negation ruled out", () => {
    const signals = analyseIntent("not coastal, and no mining", BASE_LEXICON);
    const { config } = applyIntent(schema, signals, {});
    expect(config.locked?.environment).toBeUndefined();
    expect(config.locked?.primaryFunction).toBeUndefined();
    expect(config.bias?.coastal).toBe(0);
    expect(config.bias?.mining).toBe(0);
  });

  it("changes nothing when the description says nothing useful", () => {
    const { config, inferred } = applyIntent(schema, [], { genre: "Fantasy" });
    expect(config).toEqual({ genre: "Fantasy", bias: {} });
    expect(inferred).toEqual([]);
  });

  it("infers across several axes at once", () => {
    const signals = analyseIntent(
      "a coastal harbour that lives on trade",
      BASE_LEXICON,
    );
    const { config } = applyIntent(schema, signals, {});
    expect(config.locked?.environment.value).toBe("Coastal harbour");
    expect(config.locked?.primaryFunction.value).toBe("Trade hub");
  });
});

describe("mergeLexicons", () => {
  it("adds generator-specific phrases to the shared vocabulary", () => {
    const merged = mergeLexicons(BASE_LEXICON, [
      { trait: "coastal", phrases: ["tideward"] },
    ]);
    const signals = analyseIntent("a tideward settlement", merged);
    expect(signals[0].trait).toBe("coastal");
    // The shared phrases still work.
    expect(analyseIntent("a coastal settlement", merged)[0].trait).toBe(
      "coastal",
    );
  });
});

describe("applyIntent — naming an option outright", () => {
  const named: SmartGeneratorSchema = {
    id: "named",
    axes: [
      {
        id: "primaryFunction",
        label: "Primary Function",
        pool: () => [
          { value: "Fishing village", traits: ["maritime"] },
          { value: "Trade hub", traits: ["trade"] },
          { value: "Military fortress", traits: ["military"] },
        ],
      },
    ],
  };

  it("pins an option the description names, even against a shared trait", () => {
    const text = "a fishing village that also does some trade";
    const signals = analyseIntent(text, BASE_LEXICON);
    const { config } = applyIntent(named, signals, {}, text);
    expect(config.locked?.primaryFunction).toEqual({
      value: "Fishing village",
      source: "inferred",
    });
  });

  // Known limitation, pinned deliberately so it is visible rather than folklore.
  // Only the negator words carry exclusion; "anything but X" reads as a request
  // for X. "but" cannot join the negator list, because "prosperous but creepy"
  // would then negate the creepy.
  it('does not yet understand "anything but" as an exclusion', () => {
    const text = "anything but a fishing village";
    const signals = analyseIntent(text, BASE_LEXICON);
    const { config } = applyIntent(named, signals, {}, text);
    expect(config.locked?.primaryFunction?.value).toBe("Fishing village");
  });

  it("ignores a negated name match", () => {
    const text = "not a fishing village";
    const signals = analyseIntent(text, BASE_LEXICON);
    const { config } = applyIntent(named, signals, {}, text);
    expect(config.locked?.primaryFunction).toBeUndefined();
  });

  it("still works when no description is passed", () => {
    const signals = analyseIntent("a fishing village", BASE_LEXICON);
    const { config } = applyIntent(named, signals, {});
    expect(config.locked?.primaryFunction?.value).toBe("Fishing village");
  });
});
