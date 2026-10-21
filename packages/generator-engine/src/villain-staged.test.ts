import { describe, expect, it, vi } from "vitest";
import {
  checkVillainConcept,
  checkVillainOrganisation,
  checkVillainEnding,
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
import { stagePlanProblems } from "./villain-staged-checks";
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
  rawReplies?: Record<string, string[]>;
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
    const rawReplies = script.rawReplies?.[marker];
    if (rawReplies) return pick(`raw:${marker}`, rawReplies);
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
    expect(lore).toContain(
      "Dependency chain (required stages): raise tolls → withdraw licences",
    );
    expect(lore).toContain(
      "Timeline: Twenty-one days to the midsummer charter",
    );
    expect(lore).toContain(
      "### Villain at a Glance\n- Wants every harbour toll",
    );
    // A conditional diversion says so, and what sets it off.
    expect(lore).toContain(
      "**Stage 5: Chase the fled clerk** — Conditional diversion, only if the clerk who forged the notices is found. Timing: Any time after Day 9.",
    );
    expect(lore).toContain(
      "**Stage 1: Raise the tolls** — Required. Timing: Days 1-5.",
    );
    // A disruption names the later stage it changes.
    expect(lore).toContain("Effect on Stage 6: The charter hearing opens");
  });

  it("fixes the assigned structure before any prose and states it from the plan", async () => {
    const model = scriptedModel();
    const result = await run(model);
    const stage1 = model.messages[0];
    expect(stage1).toContain("Assigned structure");
    const orgLabel = /- Organisation: ([^—]+) —/.exec(stage1)![1].trim();
    // Later stages see the same assigned choice, and the output labels it.
    expect(model.messages[1]).toContain(`- Organisation: ${orgLabel}`);
    expect(result!.output.lore).toContain(
      `### Organisation & Power Structure\n**${orgLabel}.** `,
    );
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
    const one = {
      ...VALID_ORGANISATION,
      lieutenants: (VALID_ORGANISATION.lieutenants as JsonObject[]).slice(0, 1),
    };
    const model = scriptedModel({ organisation: [one] });
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
      stoppedProblems: ["give N to N lieutenants, one per assigned slot"],
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

  it("accepts one lieutenant more than the slots, without an assigned awareness", async () => {
    const extra = {
      name: "Hesper Quill",
      role: "Courier of the harbour office",
      relationship: "A cousin placed there for safety",
      motivation: "Wants the harbour kept as it is.",
      loyalty: "Family.",
      secret: "Reads the sealed notices.",
    };
    const four = {
      ...VALID_ORGANISATION,
      lieutenants: [...(VALID_ORGANISATION.lieutenants as JsonObject[]), extra],
    };
    const result = await run(scriptedModel({ organisation: [four] }));
    expect(result).not.toBeNull();
    const lines = result!.output.lore
      .split("\n")
      .filter((l) => l.startsWith("- **") && l.includes("Relationship:"));
    expect(lines).toHaveLength(4);
    expect(lines.filter((l) => l.includes("Awareness:"))).toHaveLength(3);
    expect(lines[3]).toContain("Hesper Quill");
  });

  it("accepts one lieutenant fewer than the slots", async () => {
    const two = {
      ...VALID_ORGANISATION,
      lieutenants: (VALID_ORGANISATION.lieutenants as JsonObject[]).slice(0, 2),
    };
    const result = await run(scriptedModel({ organisation: [two] }));
    expect(result).not.toBeNull();
  });

  it("rejects two lieutenants more than the slots", async () => {
    const [a, b, c] = VALID_ORGANISATION.lieutenants as JsonObject[];
    const five = {
      ...VALID_ORGANISATION,
      lieutenants: [
        a,
        b,
        c,
        { ...a, name: "Una Pell" },
        { ...b, name: "Rho Dane" },
      ],
    };
    expect(await run(scriptedModel({ organisation: [five] }))).toBeNull();
  });

  it("says why a stage stopped without repeating generated text", async () => {
    const named = { ...VALID_CONCEPT, title: "Maren Holt, the Quiet Toll" };
    const onStats = vi.fn();
    await run(scriptedModel({ concept: [named] }), { onStats });
    const stats = onStats.mock.calls[0][0] as VillainStagedStats;
    expect(stats.stoppedProblems).toEqual(["banned placeholder name"]);
    expect(JSON.stringify(villainStatsLog(stats))).not.toContain("Maren");
  });

  it("adds the reasons to the failed step only when asked, and never the text", async () => {
    const named = { ...VALID_CONCEPT, title: "Maren Holt, the Quiet Toll" };
    const detail = async (showReasons?: boolean) => {
      const progress: StagedProgressStep[][] = [];
      await run(scriptedModel({ concept: [named] }), {
        showReasons,
        onProgress: (s: StagedProgressStep[]) => progress.push(s),
      });
      return progress[progress.length - 1][0].detail;
    };
    expect(await detail(true)).toBe(
      "writing it in one pass instead (banned placeholder name)",
    );
    expect(await detail(true)).not.toContain("Maren");
    expect(await detail(false)).toBe("writing it in one pass instead");
    expect(await detail()).toBe("writing it in one pass instead");
  });

  it("reports an unreadable reply as the reason", async () => {
    const onStats = vi.fn();
    const model = scriptedModel();
    model.complete.mockImplementation(async () => "not json at all");
    await run(model, { onStats });
    expect(
      (onStats.mock.calls[0][0] as VillainStagedStats).stoppedProblems,
    ).toEqual(["the reply was not a usable JSON object"]);
  });

  it("reports an unreadable retry instead of the previous hard failure", async () => {
    const { title: _title, ...noTitle } = VALID_CONCEPT;
    const model = scriptedModel({
      rawReplies: {
        "STAGE 1 OF 4": [JSON.stringify(noTitle), "not json at all"],
      },
    });
    const onStats = vi.fn();

    await run(model, { onStats });

    expect(
      (onStats.mock.calls[0][0] as VillainStagedStats).stoppedProblems,
    ).toEqual(["the reply was not a usable JSON object"]);
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
    ["five clues", Array.from({ length: 5 }, (_, i) => `Clue ${i}`)],
    ["seven clues", Array.from({ length: 7 }, (_, i) => `Clue ${i}`)],
    ["null", null],
    ["a string", "Strange orders"],
  ])("rejects firstSigns that are %s", (_label, firstSigns) => {
    const check = checkVillainConcept({ ...VALID_CONCEPT, firstSigns }, []);
    expect(check.hard.join(" ")).toContain("firstSigns");
  });

  it("rejects more than four personal connections", () => {
    const personalConnections = Array.from(
      { length: 5 },
      (_, i) => `Connection ${i}`,
    );
    expect(
      checkVillainPlan({ ...VALID_PLAN, personalConnections }).hard.join(" "),
    ).toContain('"personalConnections" needs 2 to 4 hooks');
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
    const eight = [...stages, ...stages.slice(0, 2)];
    expect(checkVillainPlan({ ...VALID_PLAN, stages: eight }).hard).toContain(
      "give 5 to 7 plan stages (you gave 8)",
    );
  });
});

describe("stagePlanProblems", () => {
  const stages = VALID_PLAN.stages as JsonObject[];
  const patch = (i: number, change: JsonObject) =>
    stages.map((s, j) => (j === i ? { ...s, ...change } : s));

  it("accepts a plan with a conditional diversion and downstream effects", () => {
    expect(stagePlanProblems(stages)).toEqual([]);
  });

  it.each([
    ["no kind", patch(0, { kind: undefined }), "stage 1 needs a kind"],
    ["an unknown kind", patch(0, { kind: "optional" }), "stage 1 needs a kind"],
    ["no timing", patch(1, { timing: "" }), 'stage 2 has no "timing"'],
    [
      "a conditional stage with no trigger",
      patch(4, { trigger: "" }),
      'stage 5 is conditional but has no "trigger"',
    ],
    [
      "no effect on a required stage",
      patch(0, { disruptionEffect: undefined }),
      'required stage 1 needs a "disruptionEffect"',
    ],
    [
      "an effect that points backwards",
      patch(2, { disruptionEffect: { stage: 2, change: "Worse." } }),
      "stage 3's disruptionEffect must name a later stage",
    ],
    [
      "an effect that points past the plan",
      patch(0, { disruptionEffect: { stage: 9, change: "Worse." } }),
      "stage 1's disruptionEffect must name a later stage",
    ],
    [
      "a last stage that is conditional",
      patch(5, { kind: "conditional", trigger: "t" }),
      "the last stage must be required",
    ],
  ])("flags %s", (_label, changed, expected) => {
    expect(stagePlanProblems(changed).join(" | ")).toContain(expected);
  });

  it("flags a plan with fewer than four required stages", () => {
    const mostlyConditional = stages.map((s, i) =>
      i > 0 && i < 4 ? { ...s, kind: "conditional", trigger: "t" } : s,
    );
    expect(stagePlanProblems(mostlyConditional).join(" ")).toContain(
      "at least four stages must be required",
    );
  });

  it("does not ask the last required stage for an effect, nor a conditional one", () => {
    const problems = stagePlanProblems(stages).join(" ");
    expect(problems).not.toContain("required stage 6");
    expect(problems).not.toContain("required stage 5");
  });

  it("asks for a dependency chain with one step per required stage, not per stage", () => {
    const soft = checkVillainPlan({
      ...VALID_PLAN,
      dependencyChain: ["a", "b", "c", "d", "e", "f"],
    }).soft;
    expect(soft.join(" ")).toContain("5 required stages");
    expect(checkVillainPlan(VALID_PLAN).soft).toEqual([]);
  });

  it("asks for a timeline", () => {
    expect(checkVillainPlan({ ...VALID_PLAN, timeline: "" }).soft).toEqual([
      '"timeline" is missing or empty',
    ]);
  });
});

describe("copy", () => {
  const lieutenants = VALID_ORGANISATION.lieutenants as JsonObject[];
  const withLieutenant = (change: JsonObject) => ({
    ...VALID_ORGANISATION,
    lieutenants: lieutenants.map((l, i) => (i === 0 ? { ...l, ...change } : l)),
  });

  it("never doubles a full stop, whichever way the model ended each field", async () => {
    const model = scriptedModel({
      organisation: [
        withLieutenant({
          role: "Spokesman who reads the tolls aloud.",
          relationship: "A rival who wants the chair.",
          motivation: "Wants the chair!",
          loyalty: "Conditional",
          secret: "Courts the guilds?",
        }),
      ],
    });
    const { output } = (await run(model))!;
    expect(output.lore).not.toContain("..");
    expect(output.lore).toContain(
      "**Tobias Arlen** — Spokesman who reads the tolls aloud. Relationship: A rival who wants the chair. Motivation: Wants the chair! Loyalty: Conditional. Secret or agenda: Courts the guilds? Awareness:",
    );
  });

  it("prints assigned kinds inline in their sections, not as headings", async () => {
    const model = scriptedModel();
    const stage1 = (await run(model))!;
    const assigned = [
      ...model.messages[0].matchAll(
        /- (?:Organisation|Fatal flaw|Weak point|Price of defeating them): ([^—]+) —/g,
      ),
    ].map((m) => m[1].trim());
    expect(assigned).toHaveLength(4);
    expect(stage1.output.lore).toContain(
      `### Organisation & Power Structure\n**${assigned[0]}.** `,
    );
    expect(stage1.output.lore).toContain(
      `### Fatal Flaw\n**${assigned[1]}.** `,
    );
    expect(stage1.output.lore).toContain(
      `### Weakness / Vulnerability\n**${assigned[2]}.** `,
    );
    expect(stage1.output.lore).toContain(
      `### Moral Complication\n**${assigned[3]}.** `,
    );
    for (const label of assigned) {
      expect(stage1.output.lore).not.toContain(`### ${label}`);
    }
  });

  it("leaves out the glance section when the ending has none", async () => {
    const { atAGlance: _glance, ...noGlance } = VALID_ENDING;
    const result = await run(scriptedModel({ ending: [noGlance, noGlance] }));
    expect(result!.output.lore).not.toContain("Villain at a Glance");
    expect(checkVillainEnding(noGlance).soft.join(" ")).toContain("atAGlance");
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
