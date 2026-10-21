import { describe, expect, it, vi } from "vitest";
import {
  checkVillainConcept,
  checkVillainOrganisation,
  checkVillainPlan,
  generateVillainStaged,
  villainCoherenceFindings,
  villainStatsLog,
  VILLAIN_STEPS,
  type VillainStagedStats,
} from "./villain-staged";
import { buildVillainPrompt, type ResolvedVillain } from "./public-villain";
import type { JsonObject } from "./staged-runtime";
import type { StagedProgressStep } from "./staged-progress";
import { planVillainAxes } from "./villain-diversity";
import {
  VALID_CONCEPT,
  VALID_ENDING,
  VALID_ORGANISATION,
  VALID_PLAN,
} from "./villain-staged.fixtures";

function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const resolved: ResolvedVillain = buildVillainPrompt(
  {
    genre: "Classic Fantasy",
    tone: "Grim",
    threatScale: "Regional",
    archetype: "Corrupt Ruler",
    sympathy: "Selfish but Human",
    worldRelation: "Predator",
  },
  "",
  lcg(1),
).resolved;

interface Script {
  concept?: JsonObject[];
  organisation?: JsonObject[];
  plan?: JsonObject[];
  ending?: JsonObject[];
  review?: string[];
  repair?: string[];
  /** Runs before each reply, for abort tests. */
  onCall?: (marker: string) => void;
}

const CLEAN_REVIEW = JSON.stringify({ verdict: "clean", issues: [] });

function scriptedModel(script: Script = {}) {
  const index: Record<string, number> = {};
  const messages: string[] = [];
  const pick = <T>(key: string, list: T[]): T => {
    const i = Math.min(index[key] ?? 0, list.length - 1);
    index[key] = (index[key] ?? 0) + 1;
    return list[i];
  };
  const replies: Record<string, () => string> = {
    "STAGE 1 OF 4": () =>
      JSON.stringify(pick("c", script.concept ?? [VALID_CONCEPT])),
    "STAGE 2 OF 4": () =>
      JSON.stringify(pick("o", script.organisation ?? [VALID_ORGANISATION])),
    "STAGE 3 OF 4": () =>
      JSON.stringify(pick("p", script.plan ?? [VALID_PLAN])),
    "STAGE 4 OF 4": () =>
      JSON.stringify(pick("e", script.ending ?? [VALID_ENDING])),
    review: () => pick("r", script.review ?? [CLEAN_REVIEW]),
    repair: () => pick("x", script.repair ?? ['{"fixes":{}}']),
  };
  const markerOf = (message: string): string =>
    /STAGE \d OF 4/.exec(message)?.[0] ??
    (message.includes("Coherence review of a finished villain.")
      ? "review"
      : message.startsWith("Repair a finished villain")
        ? "repair"
        : "unknown");
  const complete = vi.fn(async (_system: string, message: string) => {
    messages.push(message);
    const marker = markerOf(message);
    script.onCall?.(marker);
    const reply = replies[marker];
    if (!reply) throw new Error(`unexpected message: ${message.slice(0, 60)}`);
    return reply();
  });
  return { complete, messages };
}

const run = (model: ReturnType<typeof scriptedModel>, extra = {}) =>
  generateVillainStaged(resolved, {
    complete: model.complete,
    rng: lcg(7),
    ...extra,
  });

describe("generateVillainStaged", () => {
  it("writes the villain in four stages and a review", async () => {
    const model = scriptedModel();
    const onStats = vi.fn();
    const result = await run(model, { onStats });
    expect(result).not.toBeNull();
    expect(model.complete).toHaveBeenCalledTimes(5);
    expect(result!.stats).toMatchObject({
      outcome: "staged",
      aiCalls: 5,
      coherenceRepaired: false,
      reviewSkipped: false,
    });
    expect(onStats).toHaveBeenCalledTimes(1);
    const { content, lore, title } = result!.output;
    expect(title).toBe("Ottoline Brack, the Quiet Toll");
    expect(content).toContain("### First Signs");
    for (const heading of [
      "### Ultimate Goal",
      "### Lieutenants & Inner Circle",
      "### Organisation & Power Structure",
      "### The Villain's Plan",
      "### Weakness / Vulnerability",
      "### Moral Complication",
      "### If Defeated",
    ]) {
      expect(lore).toContain(heading);
    }
    expect(lore).toContain("Dependency chain: raise tolls → withdraw licences");
  });

  it("fixes the assigned structure before any prose and states it from the plan", async () => {
    const model = scriptedModel();
    const result = await run(model);
    const stage1 = model.messages[0];
    expect(stage1).toContain("Assigned structure");
    const orgLabel = /- Organisation: ([^—]+) —/.exec(stage1)![1].trim();
    // Later stages see the same assigned choice, and the output labels it.
    expect(model.messages[1]).toContain(`- Organisation: ${orgLabel}`);
    expect(result!.output.lore).toContain(`**${orgLabel}.**`);
  });

  it("keeps the awareness of each lieutenant from the plan, not the model", async () => {
    const lieutenants = (VALID_ORGANISATION.lieutenants as JsonObject[]).map(
      (l) => ({ ...l, knowsPlan: "knows everything" }),
    );
    const model = scriptedModel({
      organisation: [{ ...VALID_ORGANISATION, lieutenants }],
    });
    const { output } = (await run(model))!;
    const awareness = output.lore.match(/Awareness: ([^.]+)\./g) ?? [];
    expect(awareness).toHaveLength(3);
    expect(output.lore).not.toContain("knows everything");
  });

  it("retries a stage once with the problems named", async () => {
    const { title: _title, ...noTitle } = VALID_CONCEPT;
    const model = scriptedModel({ concept: [noTitle, VALID_CONCEPT] });
    const progress: StagedProgressStep[][] = [];
    const result = await run(model, {
      onProgress: (s: StagedProgressStep[]) => progress.push(s),
    });
    expect(result!.stats.repairedStages).toEqual(["concept"]);
    expect(model.messages[1]).toContain("not usable");
    expect(model.messages[1]).toContain('"title" is missing or empty');
    expect(
      progress.some((steps) => steps[0].detail === "fixing problems"),
    ).toBe(true);
  });

  it("keeps the first usable draft when the retry is unreadable", async () => {
    const generic = {
      ...VALID_CONCEPT,
      fatalFlaw:
        "He cannot predict or understand unpredictable emotional human behaviour.",
    };
    const model = scriptedModel({ concept: [generic, {}] });
    const result = await run(model);
    expect(result).not.toBeNull();
    expect(result!.output.lore).toContain("unpredictable emotional human");
  });

  it("returns null and names the stage when one stays unusable", async () => {
    const two = {
      ...VALID_ORGANISATION,
      lieutenants: (VALID_ORGANISATION.lieutenants as JsonObject[]).slice(0, 2),
    };
    const model = scriptedModel({ organisation: [two] });
    const onStats = vi.fn();
    const progress: StagedProgressStep[][] = [];
    const result = await run(model, {
      onStats,
      onProgress: (s: StagedProgressStep[]) => progress.push(s),
    });
    expect(result).toBeNull();
    const stats = onStats.mock.calls[0][0] as VillainStagedStats;
    expect(stats).toMatchObject({
      outcome: "fell-back",
      stoppedAt: "organisation",
    });
    const last = progress[progress.length - 1];
    expect(last.map((s) => s.status)).toEqual([
      "done",
      "fallback",
      "skipped",
      "skipped",
      "skipped",
    ]);
    // Stage 1, then stage 2 twice. Nothing after the failing stage runs.
    expect(model.complete).toHaveBeenCalledTimes(3);
  });

  it("rejects a villain named with a banned placeholder name", async () => {
    const named = { ...VALID_CONCEPT, title: "Maren Holt, the Quiet Toll" };
    const model = scriptedModel({ concept: [named] });
    const result = await run(model);
    expect(result).toBeNull();
    expect(model.messages[1]).toContain("banned placeholder name: Maren");
  });

  it("rejects a plan whose stage count is outside 5 to 7", async () => {
    const short = {
      ...VALID_PLAN,
      stages: (VALID_PLAN.stages as JsonObject[]).slice(0, 3),
    };
    const result = await run(scriptedModel({ plan: [short] }));
    expect(result).toBeNull();
  });

  it("stops on cancellation without returning anything partial", async () => {
    const controller = new AbortController();
    const model = scriptedModel({
      onCall: (marker) => {
        if (marker === "STAGE 2 OF 4") controller.abort();
      },
    });
    const onStats = vi.fn();
    await expect(
      run(model, { signal: controller.signal, onStats }),
    ).rejects.toBeDefined();
    expect(onStats).not.toHaveBeenCalled();
    expect(model.complete).toHaveBeenCalledTimes(2);
  });

  it("still returns the villain when the review is unreadable", async () => {
    const model = scriptedModel({ review: ["not json", "still not json"] });
    const result = await run(model);
    expect(result).not.toBeNull();
    expect(result!.stats.reviewSkipped).toBe(true);
    expect(result!.stats.coherenceRepaired).toBe(false);
  });

  it("applies a repair that fixes what the review found", async () => {
    const model = scriptedModel({
      review: [
        JSON.stringify({
          verdict: "repair",
          issues: [
            { field: "weakness", problem: "Does not follow from the guilds." },
          ],
        }),
      ],
      repair: [
        JSON.stringify({
          fixes: {
            weakness:
              "The guild masters only follow the reeve while she keeps paying their pensions out of the harbour tolls.",
          },
        }),
      ],
    });
    const result = await run(model);
    expect(result!.stats).toMatchObject({
      coherenceRepaired: true,
      reviewIssues: ["Does not follow from the guilds."],
    });
    expect(result!.output.lore).toContain("out of the harbour tolls");
  });

  it("throws away a repair that makes the sections drift apart", async () => {
    const model = scriptedModel({
      review: [
        JSON.stringify({
          verdict: "repair",
          issues: [{ field: "motivation", problem: "Vague." }],
        }),
      ],
      repair: [
        JSON.stringify({
          fixes: {
            ultimateGoal: "A quiet retirement somewhere warm.",
            finalConfrontation: "Beneath an unrelated mountain.",
          },
        }),
      ],
    });
    const result = await run(model);
    expect(result!.stats.coherenceRepaired).toBe(false);
    expect(result!.output.lore).toContain("strongroom");
    expect(result!.output.lore).not.toContain("quiet retirement");
  });

  it("ignores repairs to fields outside the repairable list", async () => {
    const model = scriptedModel({
      review: [
        JSON.stringify({
          verdict: "repair",
          issues: [{ field: "title", problem: "Rename it." }],
        }),
      ],
    });
    const result = await run(model);
    // "title" is not repairable, so the review issue is dropped.
    expect(result!.stats.reviewIssues).toEqual([]);
    expect(model.complete).toHaveBeenCalledTimes(5);
  });

  it("reports deterministic problems that remain after a failed repair", async () => {
    const unrelated = {
      ...VALID_ENDING,
      moralComplication: "Afterwards there is a power vacuum and a gang war.",
    };
    const model = scriptedModel({ ending: [unrelated, unrelated] });
    const result = await run(model);
    expect(result!.stats.remainingIssues.join(" ")).toContain("power vacuum");
  });
});

describe("villainStatsLog", () => {
  it("logs counts only", () => {
    const log = villainStatsLog({
      outcome: "staged",
      aiCalls: 5,
      elapsedMs: 10,
      repairedStages: ["concept"],
      coherenceRepaired: true,
      reviewIssues: ["secret text"],
      reviewSkipped: false,
      remainingIssues: [],
    });
    expect(JSON.stringify(log)).not.toContain("secret text");
    expect(log).toMatchObject({ repairedStageCount: 1, reviewIssueCount: 1 });
  });

  it("lists every step the page shows", () => {
    expect(VILLAIN_STEPS.map((s) => s.id)).toEqual([
      "concept",
      "organisation",
      "plan",
      "ending",
      "coherence",
    ]);
  });
});

describe("villainCoherenceFindings", () => {
  const drafts = {
    concept: VALID_CONCEPT,
    organisation: VALID_ORGANISATION,
    plan: VALID_PLAN,
    ending: VALID_ENDING,
  };

  it("finds nothing in sections that talk about the same things", () => {
    expect(villainCoherenceFindings(drafts)).toEqual([]);
  });

  it("flags a goal that the last stage does not lead to", () => {
    const found = villainCoherenceFindings({
      ...drafts,
      concept: {
        ...VALID_CONCEPT,
        ultimateGoal: "A quiet retirement somewhere warm.",
      },
    });
    expect(found.map((f) => f.field)).toContain("ultimateGoal");
  });

  it("flags a finale at a place the plan never sets up", () => {
    const found = villainCoherenceFindings({
      ...drafts,
      ending: { ...VALID_ENDING, finalConfrontation: "On a distant glacier." },
    });
    expect(found.map((f) => f.field)).toEqual(["finalConfrontation"]);
  });

  it("flags a generic flaw, a master object and a power vacuum on the assembled text", () => {
    const found = villainCoherenceFindings({
      ...drafts,
      concept: {
        ...VALID_CONCEPT,
        fatalFlaw:
          "She cannot predict unpredictable emotional human behaviour.",
      },
      ending: {
        ...VALID_ENDING,
        weakness:
          "Everything depends on one master ledger in the harbour office.",
        moralComplication: "Her fall leaves a power vacuum over the harbour.",
      },
    });
    expect(found.map((f) => f.field)).toEqual(
      expect.arrayContaining(["fatalFlaw", "weakness", "moralComplication"]),
    );
  });
});

describe("review grounding", () => {
  it("gives the review and repair the campaign context on the public route", async () => {
    const withContext = {
      ...resolved,
      campaignContext: "The harbour of Saltmere.",
    };
    const model = scriptedModel({
      review: [
        JSON.stringify({
          verdict: "repair",
          issues: [{ field: "weakness", problem: "Vague." }],
        }),
      ],
      repair: [
        JSON.stringify({
          fixes: { weakness: "The harbour guild masters desert her." },
        }),
      ],
    });
    await generateVillainStaged(withContext, {
      complete: model.complete,
      rng: lcg(7),
    });
    const review = model.messages.find((m) => m.includes("Coherence review"))!;
    const repair = model.messages.find((m) =>
      m.startsWith("Repair a finished"),
    )!;
    expect(review).toContain("The harbour of Saltmere.");
    expect(repair).toContain("The harbour of Saltmere.");
  });
});

describe("stage checks", () => {
  const axes = planVillainAxes("Corrupt Ruler", "Classic Fantasy", lcg(3));
  const lieutenants = VALID_ORGANISATION.lieutenants as JsonObject[];

  it("flags a conflict domain villains keep landing in, unless the campaign asks for it", () => {
    const logistics = { ...VALID_CONCEPT, conflictDomain: "Supply chains" };
    expect(checkVillainConcept(logistics, []).soft.join(" ")).toContain(
      "keep landing in",
    );
    expect(
      checkVillainConcept(logistics, [], "A war over supply chains.").soft,
    ).toEqual([]);
    expect(checkVillainConcept(VALID_CONCEPT, []).soft).toEqual([]);
  });

  it.each([
    ["one clue", ["Only one."]],
    ["seven clues", Array.from({ length: 7 }, (_, i) => `Clue ${i}`)],
    ["null", null],
    ["a string", "Strange orders"],
  ])("rejects firstSigns that are %s", (_label, firstSigns) => {
    const check = checkVillainConcept({ ...VALID_CONCEPT, firstSigns }, []);
    expect(check.hard.join(" ")).toContain("firstSigns");
  });

  it("rejects a lieutenant with a missing field or a repeated name", () => {
    const missing = lieutenants.map((l, i) =>
      i === 1 ? { ...l, secret: "" } : l,
    );
    expect(
      checkVillainOrganisation(
        { ...VALID_ORGANISATION, lieutenants: missing },
        axes,
        [],
      ).hard,
    ).toEqual(['lieutenant 2 has no "secret"']);
    const twins = lieutenants.map((l) => ({ ...l, name: "Tobias Arlen" }));
    expect(
      checkVillainOrganisation(
        { ...VALID_ORGANISATION, lieutenants: twins },
        axes,
        [],
      ).hard,
    ).toContain("two lieutenants share a name");
  });

  it("rejects lieutenants named after something the campaign already uses", () => {
    const check = checkVillainOrganisation(VALID_ORGANISATION, axes, [
      "Tobias Arlen",
    ]);
    expect(check.hard.join(" ")).toContain("Tobias Arlen");
  });

  it("rejects non-object stages and a plan with more than seven stages", () => {
    const stages = VALID_PLAN.stages as JsonObject[];
    expect(
      checkVillainPlan({ ...VALID_PLAN, stages: [null, ...stages.slice(1)] })
        .hard.length,
    ).toBeGreaterThan(0);
    const eight = [...stages, ...stages.slice(0, 3)];
    expect(checkVillainPlan({ ...VALID_PLAN, stages: eight }).hard).toContain(
      "give 5 to 7 plan stages (you gave 8)",
    );
  });
});

describe("campaign names", () => {
  it("fails the concept when the title reuses a name the campaign already has", async () => {
    const model = scriptedModel();
    const result = await run(model, { avoidNames: ["Ottoline Brack"] });
    expect(result).toBeNull();
    expect(model.messages[0]).toContain("Already used in this campaign");
    expect(model.messages[1]).toContain("banned placeholder name");
  });

  it("does not ban a name the campaign context itself introduces", async () => {
    const withContext = {
      ...resolved,
      campaignContext: "Ottoline Brack runs the harbour.",
    };
    const model = scriptedModel();
    const result = await generateVillainStaged(withContext, {
      complete: model.complete,
      rng: lcg(7),
      avoidNames: ["Ottoline Brack"],
    });
    expect(result).not.toBeNull();
  });
});

describe("repair limits", () => {
  const reviewOnWeakness = JSON.stringify({
    verdict: "repair",
    issues: [{ field: "weakness", problem: "Vague." }],
  });

  it("ignores a repair that is not an object of fixes", async () => {
    const model = scriptedModel({
      review: [reviewOnWeakness],
      repair: ['{"fixes":["not","an","object"]}'],
    });
    const result = await run(model);
    expect(result!.stats.coherenceRepaired).toBe(false);
  });

  it("ignores a runaway replacement", async () => {
    const model = scriptedModel({
      review: [reviewOnWeakness],
      repair: [
        JSON.stringify({ fixes: { weakness: `harbour ${"x ".repeat(2000)}` } }),
      ],
    });
    const result = await run(model);
    expect(result!.stats.coherenceRepaired).toBe(false);
    expect(result!.output.lore).not.toContain("x x x x");
  });
});
