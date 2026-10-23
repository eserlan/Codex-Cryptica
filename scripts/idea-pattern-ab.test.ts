import { describe, expect, it, vi } from "vitest";
import {
  IDEA_CASES,
  leakedPatternNames,
  modelCounts,
  parseModes,
  patternCoverage,
  runDetection,
  runRoute,
  scorePatterns,
  summarise,
  summariseDetection,
  toMarkdown,
} from "./idea-pattern-ab";
import {
  parsePatternAnalysis,
  PATTERN_ANALYSIS_SYSTEM,
  STRUCTURAL_SIGNALS,
} from "../packages/generator-engine/src/narrative-pattern-analysis";
import { getNarrativePattern } from "../packages/generator-engine/src/narrative-patterns";

const development = (stressTest = "Who pays when the truth comes out?") =>
  JSON.stringify({
    title: "The Dragon's Ward",
    whatIsInteresting: "The monster is the kingdom's shield.",
    preservedCore: ["The dragon protects the kingdom from the king."],
    stressTests: [stressTest],
    questionsForCreator: ["What did the knight do for the king?"],
  });

const analysis = JSON.stringify({
  patterns: [{ id: "misunderstood-monster", evidence: "the dragon" }],
  otherPatterns: [{ name: "Fallen Knight", evidence: "disgraced knight" }],
  structure: Object.fromEntries(
    STRUCTURAL_SIGNALS.map((s) => [s, { level: "present", note: "" }]),
  ),
  revealDependency: "",
  expectations: [],
  distinctiveness: "The triangle is the point.",
});

/** Answers the analysis call and the developer call differently. */
const fakeModel = (developReply = development()) =>
  vi.fn(async (system: string) =>
    system === PATTERN_ANALYSIS_SYSTEM ? analysis : developReply,
  );

const clock = () => {
  let t = 0;
  return () => (t += 10);
};

const dragon = IDEA_CASES[0];

describe("idea pattern cases", () => {
  it("covers ten distinct premises", () => {
    expect(IDEA_CASES).toHaveLength(10);
    expect(new Set(IDEA_CASES.map((c) => c.id)).size).toBe(10);
    expect(new Set(IDEA_CASES.map((c) => c.probe)).size).toBe(10);
  });

  it("labels each case with real, non-overlapping taxonomy ids", () => {
    for (const c of IDEA_CASES) {
      for (const id of [...c.expected, ...c.acceptable]) {
        expect(getNarrativePattern(id), `${c.id}: ${id}`).toBeDefined();
      }
      expect(c.expected.filter((id) => c.acceptable.includes(id))).toEqual([]);
    }
  });

  it("includes premises that should match nothing, to catch invented matches", () => {
    expect(IDEA_CASES.filter((c) => c.expected.length === 0).length).toBe(4);
  });
});

describe("pattern scoring", () => {
  const found = (...ids: string[]) =>
    parsePatternAnalysis(
      JSON.stringify({
        ...JSON.parse(analysis),
        patterns: ids.map((id) => ({ id, evidence: "x" })),
      }),
    );

  it("splits matches into found, missed and wrong", () => {
    const score = scorePatterns(
      dragon,
      found("misunderstood-monster", "hidden-heir"),
      "detect",
    );
    expect(score).toMatchObject({
      hits: ["misunderstood-monster"],
      missed: ["disgraced-champion", "rot-at-the-top"],
      wrong: ["hidden-heir"],
      offList: ["Fallen Knight"],
    });
  });

  it("does not count an acceptable reading as wrong", () => {
    const score = scorePatterns(
      dragon,
      found(...dragon.expected, "truth-behind-the-legend"),
      "detect",
    );
    expect(score).toMatchObject({ missed: [], wrong: [] });
  });

  it("returns no score without an analysis", () => {
    expect(scorePatterns(dragon, null, "assess")).toBeNull();
  });

  it("totals found, missed, wrong and exact analyses", () => {
    const moon = IDEA_CASES.find((c) => c.id === "vague-moon")!;
    const scores = [
      scorePatterns(dragon, found(...dragon.expected), "detect")!,
      scorePatterns(dragon, found("misunderstood-monster"), "detect")!,
      scorePatterns(moon, found("ticking-clock"), "detect")!,
    ];
    expect(summariseDetection(scores)).toEqual({
      scored: 3,
      found: "4/6",
      missed: 2,
      wrong: 1,
      exact: 1,
    });
    expect(summariseDetection([])).toMatchObject({ found: "0/0", exact: 0 });
  });
});

describe("runDetection", () => {
  it("makes only the classifier call", async () => {
    const complete = fakeModel();
    const run = await runDetection(dragon, complete);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete.mock.calls[0][0]).toBe(PATTERN_ANALYSIS_SYSTEM);
    expect(run.analysis?.patterns).toHaveLength(1);
  });

  it("records a failed call instead of throwing", async () => {
    const run = await runDetection(
      dragon,
      vi.fn().mockRejectedValue(new Error("proxy down")),
    );
    expect(run).toMatchObject({ analysis: null, error: "proxy down" });
  });
});

describe("runRoute", () => {
  it("makes one call on the baseline route, with no brief", async () => {
    const complete = fakeModel();
    const run = await runRoute("baseline", dragon, "assess", complete, clock());
    expect(run.calls).toBe(1);
    expect(run.analysis).toBeNull();
    expect(run.result?.title).toBe("The Dragon's Ward");
    expect(complete.mock.calls[0][1]).not.toContain(
      "Narrative pattern analysis",
    );
  });

  it("analyses first on the assisted route and passes the brief on", async () => {
    const complete = fakeModel();
    const run = await runRoute("assisted", dragon, "assess", complete, clock());
    expect(run.calls).toBe(2);
    expect(run.analysis?.patterns[0].pattern.id).toBe("misunderstood-monster");
    expect(complete.mock.calls[1][1]).toContain("Misunderstood Monster");
    expect(run.elapsedMs).toBeGreaterThan(0);
  });

  it("records a failed analysis instead of throwing", async () => {
    const complete = vi.fn().mockResolvedValue("not json");
    const run = await runRoute("assisted", dragon, "assess", complete, clock());
    expect(run.result).toBeNull();
    expect(run.error).toContain("not readable");
    expect(run.calls).toBe(1);
  });
});

/** A fake proxy completion that reports a model per call, as the proxy does. */
const reportingModel = (...keys: string[]) => {
  const inner = fakeModel();
  const complete = Object.assign(
    async (system: string, message: string) => {
      const reply = await inner(system, message);
      complete.models.push(keys.shift() ?? "unknown");
      return reply;
    },
    { models: [] as string[] },
  );
  return complete;
};

describe("model reporting", () => {
  it("records which model answered each call of a route", async () => {
    const run = await runRoute(
      "assisted",
      dragon,
      "assess",
      reportingModel("luna-fast", "gemini-flash-lite"),
      clock(),
    );
    expect(run.models).toEqual(["luna-fast", "gemini-flash-lite"]);
  });

  it("records models for detection, and none from a plain completion", async () => {
    const run = await runDetection(dragon, reportingModel("gemini-flash-lite"));
    expect(run.models).toEqual(["gemini-flash-lite"]);
    const plain = await runRoute("baseline", dragon, "assess", fakeModel());
    expect(plain.models).toEqual([]);
  });

  it("counts calls per model and flags a missing report", () => {
    expect(
      modelCounts([["luna-fast", "gemini-flash-lite"], ["luna-fast"]]),
    ).toBe("luna-fast × 2, gemini-flash-lite × 1");
    expect(modelCounts([[], []])).toBe("not reported");
  });

  it("shows models in the summary and the side-by-side heading", async () => {
    const baseline = await runRoute(
      "baseline",
      dragon,
      "assess",
      reportingModel("gemini-flash-lite"),
      clock(),
    );
    const assisted = await runRoute(
      "assisted",
      dragon,
      "assess",
      fakeModel(),
      clock(),
    );
    expect(summarise([baseline]).models).toBe("gemini-flash-lite × 1");
    const md = toMarkdown([{ case: dragon, baseline, assisted }]);
    expect(md).toContain("ms, models: gemini-flash-lite)");
    expect(md).toContain("ms, models: not reported)");
  });
});

describe("metrics", () => {
  it("flags pattern names leaking into creator-facing text", async () => {
    const leaky = await runRoute(
      "assisted",
      dragon,
      "assess",
      fakeModel(development("This is a Misunderstood Monster story.")),
      clock(),
    );
    const clean = await runRoute(
      "assisted",
      dragon,
      "assess",
      fakeModel(),
      clock(),
    );
    expect(leakedPatternNames(leaky)).toEqual(["Misunderstood Monster"]);
    expect(leakedPatternNames(clean)).toEqual([]);
  });

  it("matches whole phrases only, so an embedded name is not a leak", async () => {
    const embedded = await runRoute(
      "assisted",
      dragon,
      "assess",
      fakeModel(development("Who holds the hidden heirloom?")),
      clock(),
    );
    expect(leakedPatternNames(embedded)).toEqual([]);
  });

  it("summarises calls, failures, pattern counts and coverage", async () => {
    const ok = await runRoute(
      "assisted",
      dragon,
      "assess",
      fakeModel(),
      clock(),
    );
    const failed = await runRoute(
      "assisted",
      dragon,
      "assess",
      vi.fn().mockRejectedValue(new Error("proxy down")),
      clock(),
    );
    expect(summarise([ok, failed])).toMatchObject({
      runs: 2,
      failed: 1,
      medianCalls: 1.5,
      meanPatterns: 1,
      meanOffList: 1,
      leakedRuns: 0,
    });
    expect(summarise([])).toMatchObject({
      runs: 0,
      medianMs: 0,
      meanPatterns: 0,
    });
    expect(patternCoverage([ok, ok, failed])).toEqual({
      "misunderstood-monster": 2,
    });
  });

  it("renders both routes for reading side by side", async () => {
    const baseline = await runRoute(
      "baseline",
      dragon,
      "assess",
      fakeModel(),
      clock(),
    );
    const assisted = await runRoute(
      "assisted",
      dragon,
      "assess",
      fakeModel(),
      clock(),
    );
    const md = toMarkdown([{ case: dragon, baseline, assisted }]);
    expect(md).toContain("## dragon-protector · assess");
    expect(md).toContain("### baseline (calls: 1,");
    expect(md).toContain("_off-list_ **Fallen Knight**");
    expect(md).toContain(
      "_Pattern score: found misunderstood-monster; missed disgraced-champion, rot-at-the-top; wrong none._",
    );
    expect(md.match(/_Pattern score:/g)).toHaveLength(1);
  });
});

describe("parseModes", () => {
  it("accepts known modes and rejects unknown ones", () => {
    expect(parseModes("assess, develop")).toEqual(["assess", "develop"]);
    expect(() => parseModes("assess,grade")).toThrow("grade");
  });
});
