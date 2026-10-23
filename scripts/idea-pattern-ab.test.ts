import { describe, expect, it, vi } from "vitest";
import {
  IDEA_CASES,
  leakedPatternNames,
  parseModes,
  patternCoverage,
  runRoute,
  summarise,
  toMarkdown,
} from "./idea-pattern-ab";
import {
  PATTERN_ANALYSIS_SYSTEM,
  STRUCTURAL_SIGNALS,
} from "../packages/generator-engine/src/narrative-pattern-analysis";

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
  });
});

describe("parseModes", () => {
  it("accepts known modes and rejects unknown ones", () => {
    expect(parseModes("assess, develop")).toEqual(["assess", "develop"]);
    expect(() => parseModes("assess,grade")).toThrow("grade");
  });
});
