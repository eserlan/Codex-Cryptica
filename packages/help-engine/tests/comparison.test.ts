import { describe, expect, it } from "vitest";
import type { HelpChunk } from "../src/bundle";
import type { ScoredChunk } from "../src/retrieval";
import { detectComparison, ensureBothSides, retrieve } from "../src/retrieval";
import { SCREENS } from "./eval/questions";
import { buildRealBundle } from "./eval/evaluate";

describe("detectComparison", () => {
  it.each([
    [
      "What is the difference between the graph and the canvas?",
      ["graph"],
      ["canva"],
    ],
    [
      "Should I use a generator or the Oracle to make a new NPC?",
      ["use", "generator"],
      ["oracl"],
    ],
    [
      "Is importing notes the same as generating entries?",
      ["import", "not"],
      ["generat", "entity"],
    ],
    [
      "Does Google Drive sync replace a portable backup?",
      ["googl", "driv", "sync"],
      ["portabl", "backup"],
    ],
    ["Is a map pin the same as a connection?", ["map", "pin"], ["connect"]],
    ["Graph versus canvas", ["graph"], ["canva"]],
  ])("finds the two sides of %s", (question, left, right) => {
    expect(detectComparison(question)).toEqual({ left, right });
  });

  it("drops the purpose clause, which is not a thing being compared", () => {
    const comparison = detectComparison(
      "Should I use a generator or the Oracle to make a new NPC?",
    )!;
    expect(comparison.right).not.toContain("npc");
  });

  it("drops words both sides share", () => {
    const comparison = detectComparison(
      "Is Cloud Backup the same as the backup file?",
    )!;

    expect(comparison.left).toEqual(["cloud"]);
    expect(comparison.right).toEqual(["fil"]);
  });

  it.each([
    "How do I connect the faction I just created?",
    "How do I roll a random NPC?",
    "What can I do here?",
    "Where is the Connections tab?",
    "Can I generate a ship?",
    "",
  ])("returns null for the ordinary question %j", (question) => {
    expect(detectComparison(question)).toBeNull();
  });

  it("ignores a comparison whose sides are identical", () => {
    expect(detectComparison("Is the graph the same as the graph?")).toBeNull();
  });
});

const chunk = (
  id: string,
  title: string,
  text: string,
  featureId: string | null,
): HelpChunk => ({
  id,
  sourceId: id.split("#")[0],
  kind: "help",
  featureId,
  helpId: id.split("#")[0],
  title,
  heading: "",
  text,
  hash: id,
});

const scored = (c: HelpChunk, score: number): ScoredChunk => ({
  chunk: c,
  score,
  lexical: score,
  relevance: score,
});

const graph = scored(
  chunk(
    "graph-basics#0",
    "Graph Basics",
    "The graph shows nodes.",
    "graph-view",
  ),
  0.9,
);
const reportsA = scored(
  chunk(
    "entity-reports#0",
    "Entity Reports",
    "Reports can be built from the graph or the canvas.",
    "entity-reports",
  ),
  0.85,
);
const reportsB = scored(
  chunk(
    "entity-reports#1",
    "Entity Reports",
    "A report can start from selected entities on the canvas.",
    "entity-reports",
  ),
  0.8,
);
const canvas = scored(
  chunk(
    "spatial-canvas#0",
    "Spatial Canvas",
    "The canvas is a free board.",
    "canvas",
  ),
  0.7,
);
const filler = scored(
  chunk("themes#0", "Themes", "Pick colours for your vault.", null),
  0.4,
);
const pool = [graph, reportsA, reportsB, canvas, filler];
const sides = { left: ["graph"], right: ["canva"] };

describe("ensureBothSides", () => {
  it("brings in the guide for a side the leading results do not cover", () => {
    const result = ensureBothSides(
      [graph, reportsA, reportsB, filler],
      pool,
      sides,
      4,
    );

    const leading = result.slice(0, 3).map((item) => item.chunk.sourceId);
    expect(leading).toContain("graph-basics");
    expect(leading).toContain("spatial-canvas");
  });

  it("keeps the list length: what is displaced still follows", () => {
    const shown = [graph, reportsA, reportsB, filler];
    const result = ensureBothSides(shown, pool, sides, 4);

    expect(result).toHaveLength(4);
    expect(result).toContain(canvas);
    expect(result).toContain(filler);
  });

  it("leaves the ranking alone when both sides are already covered", () => {
    const shown = [graph, canvas, reportsA, filler];

    expect(ensureBothSides(shown, pool, sides, 4)).toBe(shown);
  });

  it("does not displace the covering result of the side that is already covered", () => {
    const result = ensureBothSides(
      [graph, reportsA, reportsB, filler],
      pool,
      sides,
      4,
    );

    expect(result).toContain(graph);
  });

  it("does nothing when a side has no guide named for it", () => {
    const shown = [graph, reportsA, reportsB, filler];

    expect(
      ensureBothSides(shown, pool, { left: ["graph"], right: ["zebra"] }, 4),
    ).toBe(shown);
  });

  it("does not add a chunk that only mentions the word in its body", () => {
    // reportsA mentions "canvas" in its text but is not about the canvas.
    const withoutCanvasGuide = [graph, reportsA, reportsB, filler];
    const shown = [graph, reportsA, filler];

    expect(ensureBothSides(shown, withoutCanvasGuide, sides, 4)).toBe(shown);
  });

  it("respects the limit", () => {
    const result = ensureBothSides(
      [graph, reportsA, reportsB, filler],
      pool,
      sides,
      3,
    );

    expect(result).toHaveLength(3);
  });
});

describe("comparison questions against the real help articles", () => {
  const bundle = buildRealBundle();
  const sources = (question: string, screen: string, n = 3) =>
    retrieve(question, bundle, SCREENS[screen])
      .chunks.slice(0, n)
      .map((c) => c.chunk.sourceId);

  it("answers graph versus canvas with both guides", () => {
    const top = sources(
      "What is the difference between the graph and the canvas?",
      "graph",
    );

    expect(
      top.some((id) => id === "graph-basics" || id === "registry:graph-view"),
    ).toBe(true);
    expect(
      top.some((id) => id === "spatial-canvas" || id === "registry:canvas"),
    ).toBe(true);
  });

  it("answers generator versus Oracle with the Oracle guide as well", () => {
    expect(
      sources(
        "Should I use a generator or the Oracle to make a new NPC?",
        "generators",
      ),
    ).toContain("oracle-guide");
  });

  it("answers publish versus export with the publishing guide as well", () => {
    const top = sources(
      "Should I publish a world or export a backup for safekeeping?",
      "settings",
    );

    expect(
      top.some((id) => id === "publishing" || id === "registry:publishing"),
    ).toBe(true);
  });

  it("still refuses an unrelated comparison instead of inventing sources", () => {
    const result = retrieve(
      "Should I use Excel or Google Sheets for my budget?",
      bundle,
      SCREENS.graph,
    );

    expect(result.noMatch).toBe(true);
    expect(result.chunks).toEqual([]);
  });

  it("leaves a non-comparison question's results unchanged by the headline scenario", () => {
    expect(
      sources("How do I connect the faction I just created?", "connections"),
    ).toContain("connections-tab");
  });
});
