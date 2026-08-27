import { describe, expect, it } from "vitest";
import { pickFrom } from "../random-utils";
import { resolveSmart, validateSchema } from "./resolve";
import type { SmartAxis, SmartGeneratorSchema } from "./types";

/** Deterministic RNG so every expectation below is reproducible. */
function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const ENVIRONMENTS = [
  "Coastal harbour",
  "Mountain pass",
  "River crossing",
  "Desert oasis",
];
const FUNCTIONS = ["Trade hub", "Mining camp", "Fishing village"];

function axis(id: string, pool: readonly string[]): SmartAxis {
  return { id, label: id, pool: () => pool };
}

/** A schema of bare strings: the shape every generator has today. */
const plainSchema: SmartGeneratorSchema = {
  id: "test-plain",
  axes: [axis("environment", ENVIRONMENTS), axis("primaryFunction", FUNCTIONS)],
};

describe("resolveSmart — backwards compatibility", () => {
  it("reproduces the pickFrom sequence exactly for a trait-free schema", () => {
    const expected = {
      environment: pickFrom(ENVIRONMENTS, seededRng(42)),
      primaryFunction: pickFrom(FUNCTIONS, seededRng(42)),
    };
    // Same seed, same order, one rng draw per axis — the resolver must not
    // consume the stream differently from the current pickFrom calls.
    const rng = seededRng(42);
    const first = pickFrom(ENVIRONMENTS, rng);
    const second = pickFrom(FUNCTIONS, rng);

    const result = resolveSmart(plainSchema, {}, seededRng(42));

    expect(result.values.environment).toBe(first);
    expect(result.values.primaryFunction).toBe(second);
    expect(expected.environment).toBe(first);
  });

  it("is deterministic for a fixed seed", () => {
    const a = resolveSmart(plainSchema, {}, seededRng(7));
    const b = resolveSmart(plainSchema, {}, seededRng(7));
    expect(a.values).toEqual(b.values);
  });

  it("marks unlocked axes as random and reports no relaxations", () => {
    const result = resolveSmart(plainSchema, {}, seededRng(3));
    expect(result.axes.map((a) => a.source)).toEqual(["random", "random"]);
    expect(result.relaxations).toEqual([]);
  });

  it("throws a descriptive error when an authored pool is empty", () => {
    const broken: SmartGeneratorSchema = {
      id: "broken",
      axes: [axis("environment", [])],
    };
    expect(() => resolveSmart(broken, {}, seededRng(1))).toThrow(
      /environment/i,
    );
  });
});

describe("resolveSmart — locked values", () => {
  it("takes a locked value verbatim and keeps its provenance", () => {
    const result = resolveSmart(
      plainSchema,
      { locked: { environment: { value: "Mountain pass", source: "manual" } } },
      seededRng(5),
    );
    expect(result.values.environment).toBe("Mountain pass");
    expect(result.axes[0].source).toBe("manual");
  });

  it("accepts a custom value that is not in the pool", () => {
    const result = resolveSmart(
      plainSchema,
      {
        locked: {
          environment: { value: "Floating sky-island", source: "manual" },
        },
      },
      seededRng(5),
    );
    expect(result.values.environment).toBe("Floating sky-island");
    expect(result.axes[0].traits).toEqual([]);
  });

  it("carries the traits of a locked value that does match a pool option", () => {
    const schema: SmartGeneratorSchema = {
      id: "traited",
      axes: [
        {
          id: "environment",
          label: "Environment",
          pool: () => [{ value: "Coastal harbour", traits: ["coastal"] }],
        },
      ],
    };
    const result = resolveSmart(
      schema,
      {
        locked: { environment: { value: "Coastal harbour", source: "preset" } },
      },
      seededRng(1),
    );
    expect(result.axes[0].traits).toEqual(["coastal"]);
  });

  it("does not consume the rng for a locked axis", () => {
    const rng = seededRng(9);
    const locked = resolveSmart(
      plainSchema,
      { locked: { environment: { value: "Desert oasis", source: "manual" } } },
      rng,
    );
    // The single draw that happened must be the FIRST draw of the stream.
    expect(locked.values.primaryFunction).toBe(
      pickFrom(FUNCTIONS, seededRng(9)),
    );
  });
});

describe("resolveSmart — weighting", () => {
  it("draws heavier options more often", () => {
    const schema: SmartGeneratorSchema = {
      id: "weighted",
      axes: [
        {
          id: "tone",
          label: "Tone",
          pool: () => [
            { value: "Common", weight: 9 },
            { value: "Rare", weight: 1 },
          ],
        },
      ],
    };
    const rng = seededRng(11);
    let common = 0;
    for (let i = 0; i < 1000; i++) {
      if (resolveSmart(schema, {}, rng).values.tone === "Common") common++;
    }
    expect(common).toBeGreaterThan(850);
    expect(common).toBeLessThan(950);
  });

  it("applies a trait bias as a weight multiplier", () => {
    const schema: SmartGeneratorSchema = {
      id: "biased",
      axes: [
        {
          id: "environment",
          label: "Environment",
          pool: () => [
            { value: "Coastal harbour", traits: ["coastal"] },
            { value: "Mountain pass", traits: ["inland"] },
          ],
        },
      ],
    };
    const rng = seededRng(13);
    let coastal = 0;
    for (let i = 0; i < 1000; i++) {
      const r = resolveSmart(schema, { bias: { coastal: 9 } }, rng);
      if (r.values.environment === "Coastal harbour") coastal++;
    }
    expect(coastal).toBeGreaterThan(850);
  });

  it("suppresses an option when a negated intent zeroes its trait", () => {
    const schema: SmartGeneratorSchema = {
      id: "suppressed",
      axes: [
        {
          id: "environment",
          label: "Environment",
          pool: () => [
            { value: "Coastal harbour", traits: ["coastal"] },
            { value: "Mountain pass", traits: ["inland"] },
          ],
        },
      ],
    };
    const rng = seededRng(17);
    for (let i = 0; i < 50; i++) {
      const r = resolveSmart(schema, { bias: { coastal: 0 } }, rng);
      expect(r.values.environment).toBe("Mountain pass");
    }
  });

  it("boosts an option when an already-resolved trait is present", () => {
    const schema: SmartGeneratorSchema = {
      id: "boosted",
      axes: [
        {
          id: "environment",
          label: "Environment",
          pool: () => [{ value: "Coastal harbour", traits: ["coastal"] }],
        },
        {
          id: "primaryFunction",
          label: "Primary Function",
          pool: () => [
            { value: "Fishing village", boosts: { coastal: 20 } },
            { value: "Mining camp" },
          ],
        },
      ],
    };
    const rng = seededRng(19);
    let fishing = 0;
    for (let i = 0; i < 200; i++) {
      if (
        resolveSmart(schema, {}, rng).values.primaryFunction ===
        "Fishing village"
      )
        fishing++;
    }
    expect(fishing).toBeGreaterThan(180);
  });
});

describe("resolveSmart — dependencies and exclusions", () => {
  const schema: SmartGeneratorSchema = {
    id: "deps",
    axes: [
      {
        id: "environment",
        label: "Environment",
        pool: () => [
          { value: "Coastal harbour", traits: ["coastal"] },
          { value: "Mountain pass", traits: ["inland"] },
        ],
      },
      {
        id: "primaryFunction",
        label: "Primary Function",
        pool: () => [
          { value: "Fishing village", requires: { trait: "coastal" } },
          { value: "Mining camp", excludes: { trait: "coastal" } },
          { value: "Trade hub" },
        ],
      },
    ],
  };

  it("drops options whose requires is unmet by the resolved traits", () => {
    const rng = seededRng(23);
    for (let i = 0; i < 100; i++) {
      const r = resolveSmart(schema, {}, rng);
      if (r.values.environment === "Mountain pass") {
        expect(r.values.primaryFunction).not.toBe("Fishing village");
      }
    }
  });

  it("drops options whose excludes holds", () => {
    const rng = seededRng(29);
    for (let i = 0; i < 100; i++) {
      const r = resolveSmart(schema, {}, rng);
      if (r.values.environment === "Coastal harbour") {
        expect(r.values.primaryFunction).not.toBe("Mining camp");
      }
    }
  });

  it("matches a predicate against a resolved axis value", () => {
    const byValue: SmartGeneratorSchema = {
      id: "by-value",
      axes: [
        { id: "size", label: "Scale", pool: () => ["Village"] },
        {
          id: "authority",
          label: "Authority",
          pool: () => [
            {
              value: "Elected council",
              requires: { axis: "size", anyOf: ["City"] },
            },
            { value: "Village elder" },
          ],
        },
      ],
    };
    const r = resolveSmart(byValue, {}, seededRng(31));
    expect(r.values.authority).toBe("Village elder");
  });

  it("lets a pool read already-resolved values for conditional tables", () => {
    const conditional: SmartGeneratorSchema = {
      id: "conditional",
      axes: [
        {
          id: "environment",
          label: "Environment",
          pool: () => ["Coastal harbour"],
        },
        {
          id: "landmark",
          label: "Landmark",
          pool: (ctx) =>
            ctx.values.environment === "Coastal harbour"
              ? ["The tide-mill"]
              : ["The dry well"],
        },
      ],
    };
    const r = resolveSmart(conditional, {}, seededRng(37));
    expect(r.values.landmark).toBe("The tide-mill");
  });
});

describe("resolveSmart — relaxation", () => {
  it("drops the bias first when it would empty the pool, and records it", () => {
    const schema: SmartGeneratorSchema = {
      id: "all-suppressed",
      axes: [
        {
          id: "tone",
          label: "Tone",
          pool: () => [
            { value: "Bleak", traits: ["dark"] },
            { value: "Grim", traits: ["dark"] },
          ],
        },
      ],
    };
    const r = resolveSmart(schema, { bias: { dark: 0 } }, seededRng(41));
    expect(["Bleak", "Grim"]).toContain(r.values.tone);
    expect(r.relaxations).toEqual([{ axisId: "tone", dropped: "bias" }]);
  });

  it("drops excludes before requires when over-constrained", () => {
    const schema: SmartGeneratorSchema = {
      id: "over-excluded",
      axes: [
        {
          id: "environment",
          label: "Environment",
          pool: () => ["Mountain pass"],
        },
        {
          id: "primaryFunction",
          label: "Primary Function",
          pool: () => [
            {
              value: "Mining camp",
              excludes: { axis: "environment", anyOf: ["Mountain pass"] },
            },
          ],
        },
      ],
    };
    const r = resolveSmart(schema, {}, seededRng(43));
    expect(r.values.primaryFunction).toBe("Mining camp");
    expect(r.relaxations).toEqual([
      { axisId: "primaryFunction", dropped: "excludes" },
    ]);
  });

  it("drops requires last and still returns a value", () => {
    const schema: SmartGeneratorSchema = {
      id: "over-required",
      axes: [
        {
          id: "environment",
          label: "Environment",
          pool: () => ["Mountain pass"],
        },
        {
          id: "primaryFunction",
          label: "Primary Function",
          pool: () => [
            { value: "Fishing village", requires: { trait: "coastal" } },
          ],
        },
      ],
    };
    const r = resolveSmart(schema, {}, seededRng(47));
    expect(r.values.primaryFunction).toBe("Fishing village");
    expect(r.relaxations).toEqual([
      { axisId: "primaryFunction", dropped: "excludes" },
      { axisId: "primaryFunction", dropped: "requires" },
    ]);
  });
});

describe("validateSchema", () => {
  it("reports a predicate that references a later axis", () => {
    const schema: SmartGeneratorSchema = {
      id: "forward-ref",
      axes: [
        {
          id: "environment",
          label: "Environment",
          pool: () => [
            {
              value: "Coastal harbour",
              requires: { axis: "primaryFunction", anyOf: ["Trade hub"] },
            },
          ],
        },
        {
          id: "primaryFunction",
          label: "Primary Function",
          pool: () => ["Trade hub"],
        },
      ],
    };
    expect(validateSchema(schema)).toEqual([
      'Axis "environment" option "Coastal harbour" references axis "primaryFunction", which resolves later.',
    ]);
  });

  it("reports a predicate that references an unknown axis", () => {
    const schema: SmartGeneratorSchema = {
      id: "unknown-ref",
      axes: [
        {
          id: "environment",
          label: "Environment",
          pool: () => [
            {
              value: "Coastal harbour",
              excludes: { axis: "nope", anyOf: ["x"] },
            },
          ],
        },
      ],
    };
    expect(validateSchema(schema)).toEqual([
      'Axis "environment" option "Coastal harbour" references axis "nope", which the schema does not define.',
    ]);
  });

  it("passes a well-ordered schema", () => {
    expect(validateSchema(plainSchema)).toEqual([]);
  });
});
