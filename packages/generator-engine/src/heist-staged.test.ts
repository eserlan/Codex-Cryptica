import { describe, expect, it, vi } from "vitest";
import {
  assembleHeist,
  checkHeistObjectiveStage,
  checkHeistResponseStage,
  checkHeistSecurityStage,
  generateHeistStaged,
  heistStatsLog,
  type HeistStagedStats,
} from "./heist-staged";
import { buildHeistPrompt, type HeistGeneratorOptions } from "./public-heist";
import type { JsonObject } from "./staged-runtime";
import type { StagedProgressStep } from "./staged-progress";

import {
  RESOLVED_THEFT,
  RESOLVED_RESCUE,
  VALID_STAGE_1,
  VALID_STAGE_2,
  VALID_STAGE_3,
} from "./heist-staged.fixtures";

describe("checkHeistObjectiveStage", () => {
  it("accepts a complete, valid objective stage", () => {
    const check = checkHeistObjectiveStage(VALID_STAGE_1, RESOLVED_THEFT);
    expect(check.hard).toEqual([]);
    expect(check.soft).toEqual([]);
  });

  it("flags missing title, hook, objective, or casing as hard problems", () => {
    const empty: JsonObject = {};
    const check = checkHeistObjectiveStage(empty, RESOLVED_THEFT);
    expect(check.hard).toContain("missing required field: title");
    expect(check.hard).toContain("missing required player-facing hook: score");
    expect(check.hard).toContain("missing required objective section");
    expect(check.hard).toContain("missing required casing intel");
  });

  it("flags banned placeholder names as hard problems", () => {
    const draft = {
      ...VALID_STAGE_1,
      title: "The Master Thorne Score",
    };
    const check = checkHeistObjectiveStage(draft, RESOLVED_THEFT);
    expect(check.hard.some((h) => h.includes("banned placeholder name"))).toBe(
      true,
    );
  });

  describe("heistType invariant enforcement", () => {
    it.each([
      ["Theft", "destroy the sacred relic with explosives", true],
      ["Theft", "safely acquire the sacred chalice", false],
      ["Swindle", "assassinate the bank manager in his office", true],
      ["Swindle", "trick the bank manager into signing over the deed", false],
      ["Rescue", "execute the captive before they can speak", true],
      ["Rescue", "extract Dr. Catherine Mercer quietly", false],
      ["Assassination", "steal the baronial jewel collection and run", true],
      ["Assassination", "eliminate Baron Krell at the banquet", false],
      ["Plant Evidence", "steal the secret ledger from the desk", true],
      ["Plant Evidence", "leave the forged documents in the archive", false],
    ])(
      "%s with objective '%s' flagged=%s",
      (heistType, objectiveSnippet, expectedFlagged) => {
        const resolved = buildHeistPrompt({ heistType }).resolved;
        const draft = {
          ...VALID_STAGE_1,
          score: `Complete the ${heistType} before dawn.`,
          objective: `Our goal is to ${objectiveSnippet}.\n- **The catch**: Catch\n- **Pressure**: Pressure`,
        };
        const check = checkHeistObjectiveStage(draft, resolved);
        const isFlagged = check.hard.some(
          (h) => h.includes(`A ${heistType}`) || h.includes(`An ${heistType}`),
        );
        expect(isFlagged).toBe(expectedFlagged);
      },
    );

    it("flags removal wording on non-Theft heists", () => {
      const draft = {
        ...VALID_STAGE_1,
        objective:
          "Infiltrate the facility to secure the prize's location.\n- **The catch**: Catch\n- **Pressure**: Pressure",
      };
      const check = checkHeistObjectiveStage(draft, RESOLVED_RESCUE);
      expect(check.hard.some((h) => h.includes("no prize to steal"))).toBe(
        true,
      );
    });
  });

  describe("casing intel and context fidelity soft checks", () => {
    it("flags vague casing intel lacking physical or schedule facts as soft", () => {
      const draft = {
        ...VALID_STAGE_1,
        casing: [
          {
            label: "Concept",
            detail: "It will be very difficult to get in without being seen.",
          },
          {
            label: "Danger",
            detail: "Bad things might happen if the crew is careless.",
          },
          { label: "Target", detail: "The goal is important to our patrons." },
        ],
      };
      const check = checkHeistObjectiveStage(draft, RESOLVED_THEFT);
      expect(check.soft).toContain(
        "Casing intel lacks actionable physical or schedule facts (e.g. routes, shifts, guards, locks).",
      );
    });

    it("flags omission of requested prize or campaign context as soft", () => {
      const draft = {
        ...VALID_STAGE_1,
        title: "The Vault Robbery",
        score: "Steal the golden bowl from the chapel before morning.",
        objective:
          "The golden bowl is kept inside a steel box.\n- **The catch**: Fragile\n- **Pressure**: Careful handling",
      };
      const check = checkHeistObjectiveStage(draft, RESOLVED_THEFT);
      expect(check.soft.some((s) => s.includes("Sunstone Chalice"))).toBe(true);
      expect(check.soft.some((s) => s.includes("campaign context"))).toBe(true);
    });
  });
});

describe("checkHeistSecurityStage", () => {
  it("accepts valid security rings with multiple bypass approaches", () => {
    const check = checkHeistSecurityStage(
      VALID_STAGE_2,
      VALID_STAGE_1,
      RESOLVED_THEFT,
    );
    expect(check.hard).toEqual([]);
    expect(check.soft).toEqual([]);
  });

  it("flags missing rings as hard problems", () => {
    const check = checkHeistSecurityStage(
      { rings: {} },
      VALID_STAGE_1,
      RESOLVED_THEFT,
    );
    expect(check.hard).toContain("missing required security ring: Perimeter");
    expect(check.hard).toContain("missing required security ring: Access");
    expect(
      check.hard.some((h) => h.includes("missing required security ring")),
    ).toBe(true);
  });

  it("flags rings with fewer than two distinct bypass approaches", () => {
    const singleApproach = {
      rings: {
        perimeter: "Guard dogs bark at anyone nearby with no way through.",
        access:
          "A locked oak portcullis bars access to the hall. Pass by picking the lever lock, or by presenting stolen deacon keys.",
        inner:
          "The inner reliquary sanctum guards the Sunstone Chalice behind an altar cage. Pass by using the deacon's prayer phrase, or lifting the brass hinges.",
      },
    };
    const check = checkHeistSecurityStage(
      singleApproach,
      VALID_STAGE_1,
      RESOLVED_THEFT,
    );
    expect(check.hard).toContain(
      "Perimeter ring does not describe at least two distinct bypass approaches.",
    );
  });

  it("flags inner ring that fails to guard Stage 1 objective", () => {
    const wrongInner = {
      rings: {
        perimeter:
          "Patrols circle the courtyard. Pass by timing their sweep or wearing pilgrim vestments.",
        access:
          "A portcullis is locked. Pass by picking the lock or crawling through ducts.",
        inner:
          "A reinforced glass cage holds an ancient dragon skull. Pass by breaking the glass or using magic.",
      },
    };
    const check = checkHeistSecurityStage(
      wrongInner,
      VALID_STAGE_1,
      RESOLVED_THEFT,
    );
    expect(
      check.hard.some((h) => h.includes("must guard the objective or prize")),
    ).toBe(true);
  });

  it("flags unanchored clocks lacking step count or trigger as soft", () => {
    const unanchoredClock = {
      ...VALID_STAGE_2,
      rings: {
        ...((VALID_STAGE_2.rings as JsonObject) ?? {}),
        access:
          "A watch clock ticks in the hall. Pass by picking the lock or climbing through vents.",
      },
    };
    const check = checkHeistSecurityStage(
      unanchoredClock,
      VALID_STAGE_1,
      RESOLVED_THEFT,
    );
    expect(check.soft).toContain(
      "Security rings introduce a clock without specifying its step count or advance trigger.",
    );
  });
});

describe("checkHeistResponseStage", () => {
  it("accepts valid response stage with 5-step alarm and getaway", () => {
    const check = checkHeistResponseStage(
      VALID_STAGE_3,
      { ...VALID_STAGE_1, ...VALID_STAGE_2 },
      RESOLVED_THEFT,
    );
    expect(check.hard).toEqual([]);
    expect(check.soft).toEqual([]);
  });

  it("flags missing alarm track, complications, getaway, or flashbacks", () => {
    const check = checkHeistResponseStage(
      {},
      { ...VALID_STAGE_1, ...VALID_STAGE_2 },
      RESOLVED_THEFT,
    );
    expect(check.hard).toContain("missing required alarm track");
    expect(check.hard).toContain("missing required complications");
    expect(check.hard).toContain("missing required getaway section");
    expect(check.hard).toContain("missing required flashback opportunities");
  });

  it("requires exactly one default and two alternative complications", () => {
    const check = checkHeistResponseStage(
      {
        ...VALID_STAGE_3,
        complications: [
          { label: "Early Bells (default)", detail: "The bells ring early." },
          { label: "Rival Syndicate", detail: "Rivals arrive." },
          { label: "Holy Oil Spill", detail: "Oil catches fire." },
          { label: "Guard Rotation", detail: "A patrol changes course." },
        ],
      },
      { ...VALID_STAGE_1, ...VALID_STAGE_2 },
      RESOLVED_THEFT,
    );

    expect(check.hard).toContain(
      "Complications must contain exactly three entries: one default and two alternatives.",
    );
  });

  it("rejects complication arrays without exactly one default marker", () => {
    const check = checkHeistResponseStage(
      {
        ...VALID_STAGE_3,
        complications: [
          { label: "Early Bells", detail: "The bells ring early." },
          { label: "Rival Syndicate", detail: "Rivals arrive." },
          { label: "Holy Oil Spill", detail: "Oil catches fire." },
        ],
      },
      { ...VALID_STAGE_1, ...VALID_STAGE_2 },
      RESOLVED_THEFT,
    );

    expect(check.hard).toContain(
      "Complications must contain exactly three entries: one default and two alternatives.",
    );
  });

  it("flags incomplete alarm tracks with fewer than 5 escalating levels", () => {
    const incompleteAlarm = {
      ...VALID_STAGE_3,
      alarmTrack: [
        { level: 0, label: "Quiet", detail: "Routine." },
        { level: 1, label: "Alert", detail: "Alert sounded." },
      ],
    };
    const check = checkHeistResponseStage(
      incompleteAlarm,
      { ...VALID_STAGE_1, ...VALID_STAGE_2 },
      RESOLVED_THEFT,
    );
    expect(check.hard).toContain(
      "Alarm track must contain all five escalating levels (0 — Quiet through 4 — Lethal Response).",
    );
  });

  it("flags getaway that ignores prize transport constraints", () => {
    const hugeResolved = buildHeistPrompt({
      heistType: "Theft",
      targetType: "Private Vault",
    }).resolved;
    hugeResolved.prizeComplicationLabel = "Huge";

    const narrowDuctGetaway = {
      ...VALID_STAGE_3,
      getaway:
        "Escape by crawling through the narrow duct behind the altar. **Pursuit**: Guards follow on foot.",
    };
    const check = checkHeistResponseStage(
      narrowDuctGetaway,
      { ...VALID_STAGE_1, ...VALID_STAGE_2 },
      hugeResolved,
    );
    expect(
      check.hard.some((h) => h.includes("narrow passages with a Huge prize")),
    ).toBe(true);
  });

  it("flags exotic security mechanisms in getaway absent from Stage 2 as soft", () => {
    const exoticGetaway = {
      ...VALID_STAGE_3,
      getaway:
        "Cross the laser grid in the courtyard to reach the van. **Pursuit**: Guards follow.",
    };
    const check = checkHeistResponseStage(
      exoticGetaway,
      { ...VALID_STAGE_1, ...VALID_STAGE_2 },
      RESOLVED_THEFT,
    );
    expect(check.soft.some((s) => s.includes("absent from Stage 2"))).toBe(
      true,
    );
  });
});

describe("generateHeistStaged runner", () => {
  const options: HeistGeneratorOptions = {
    genre: "Classic Fantasy",
    heistType: "Theft",
    targetType: "Temple Reliquary",
    targetScale: "Major",
    prize: "Sunstone Chalice",
    campaignContext: "House Valdor's rebellion",
  };
  const prompt = buildHeistPrompt(options);

  function scriptedModel(
    replies: {
      stage1?: JsonObject[];
      stage2?: JsonObject[];
      stage3?: JsonObject[];
      audit?: JsonObject;
      repair?: JsonObject;
    } = {},
  ) {
    let callCount = 0;
    let s1Index = 0;
    let s2Index = 0;
    let s3Index = 0;

    const s1List = replies.stage1 ?? [VALID_STAGE_1];
    const s2List = replies.stage2 ?? [VALID_STAGE_2];
    const s3List = replies.stage3 ?? [VALID_STAGE_3];

    return {
      get callCount() {
        return callCount;
      },
      complete: vi.fn(async (_system: string, userMessage: string) => {
        callCount++;
        if (userMessage.includes("STAGE 1 OF 3")) {
          const item = s1List[Math.min(s1Index++, s1List.length - 1)];
          return JSON.stringify(item);
        }
        if (userMessage.includes("STAGE 2 OF 3")) {
          const item = s2List[Math.min(s2Index++, s2List.length - 1)];
          return JSON.stringify(item);
        }
        if (userMessage.includes("STAGE 3 OF 3")) {
          const item = s3List[Math.min(s3Index++, s3List.length - 1)];
          return JSON.stringify(item);
        }
        if (userMessage.includes("Audit this generated tabletop RPG heist")) {
          return JSON.stringify(
            replies.audit ?? {
              verdict: "clean",
              fullScore: "Infiltrate and retrieve the chalice.",
              transitions: [
                {
                  event: "Objective completed",
                  stateBefore: "Infiltration",
                  stateAfter: "Getaway",
                  factsChanged: ["chalice: taken"],
                },
              ],
              issues: [],
            },
          );
        }
        if (userMessage.includes("Repair the heist you just audited")) {
          return JSON.stringify(
            replies.repair ??
              assembleHeist(
                VALID_STAGE_1,
                VALID_STAGE_2,
                VALID_STAGE_3,
                prompt.resolved,
              ),
          );
        }
        return JSON.stringify(VALID_STAGE_1);
      }),
    };
  }

  it("happy path: completes with 4 calls (3 stages + 1 clean audit), locking earlier facts", async () => {
    const model = scriptedModel();
    const progressSteps: StagedProgressStep[][] = [];
    let statsRecorded: HeistStagedStats | undefined;

    const result = await generateHeistStaged(prompt, options, {
      complete: model.complete,
      onProgress: (steps) => progressSteps.push(steps),
      onStats: (s) => (statsRecorded = s),
    });

    expect(result).not.toBeNull();
    expect(result!.output.title).toBe(VALID_STAGE_1.title);
    expect(result!.stats.outcome).toBe("staged");
    expect(result!.stats.aiCalls).toBe(4); // 3 stages + 1 audit
    expect(result!.stats.repairedStages).toEqual([]);
    expect(statsRecorded).toBeDefined();
    expect(statsRecorded!.outcome).toBe("staged");

    const finalProgress = progressSteps[progressSteps.length - 1];
    expect(finalProgress.map((s) => s.status)).toEqual([
      "done",
      "done",
      "done",
      "done",
    ]);
  });

  it("retry recovery: retries a stage when the first attempt has a hard problem and succeeds", async () => {
    const invalidStage1 = { ...VALID_STAGE_1, title: "" }; // missing title
    const model = scriptedModel({
      stage1: [invalidStage1, VALID_STAGE_1],
    });

    const result = await generateHeistStaged(prompt, options, {
      complete: model.complete,
    });

    expect(result).not.toBeNull();
    expect(result!.stats.aiCalls).toBe(5); // stage 1 retried (+1)
    expect(result!.stats.repairedStages).toContain("objective");
  });

  it("keeps first draft when retry is worse", async () => {
    // Attempt 1 has soft problem, attempt 2 has hard problem
    const softDraft = {
      ...VALID_STAGE_1,
      casing: [{ label: "Idea", detail: "A thought about the mission." }],
    };
    const hardDraft = {
      ...VALID_STAGE_1,
      title: "",
      score: "",
    };
    const model = scriptedModel({
      stage1: [softDraft, hardDraft],
    });

    const result = await generateHeistStaged(prompt, options, {
      complete: model.complete,
    });

    expect(result).not.toBeNull();
    expect(result!.output.title).toBe(VALID_STAGE_1.title);
  });

  it("null fallback on unusable stage after exhausting retries", async () => {
    const broken = { title: "" };
    const model = scriptedModel({
      stage1: [broken, broken],
    });

    let statsRecorded: HeistStagedStats | undefined;
    const result = await generateHeistStaged(prompt, options, {
      complete: model.complete,
      onStats: (s) => (statsRecorded = s),
    });

    expect(result).toBeNull();
    expect(statsRecorded).toBeDefined();
    expect(statsRecorded!.outcome).toBe("fell-back");
    expect(statsRecorded!.stoppedAt).toBe("objective");
  });

  it("mid-run abort throws AbortError immediately and returns nothing", async () => {
    const controller = new AbortController();
    let callIndex = 0;
    const complete = vi.fn(async () => {
      callIndex++;
      if (callIndex === 2) {
        controller.abort();
      }
      return JSON.stringify(VALID_STAGE_1);
    });

    await expect(
      generateHeistStaged(prompt, options, {
        complete,
        signal: controller.signal,
      }),
    ).rejects.toThrow();
  });

  it("audit triggers targeted repair and accepts it if deterministic checks don't regress", async () => {
    const repairedDoc = assembleHeist(
      VALID_STAGE_1,
      VALID_STAGE_2,
      VALID_STAGE_3,
      prompt.resolved,
    );
    repairedDoc.summary = "Updated summary after successful repair.";

    const model = scriptedModel({
      audit: {
        verdict: "repair",
        fullScore: "Score summary",
        transitions: [
          {
            event: "Objective completion",
            stateBefore: "Infiltration",
            stateAfter: "Getaway",
            factsChanged: ["chalice: taken"],
          },
        ],
        issues: [
          {
            id: "state-1",
            sections: ["Security Rings"],
            problem: "Minor inconsistency in alarm timing",
            requiredFact: "Ensure alarm timing matches the gate lock.",
          },
        ],
      },
      repair: repairedDoc,
    });

    const result = await generateHeistStaged(prompt, options, {
      complete: model.complete,
    });

    expect(result).not.toBeNull();
    expect(result!.stats.coherenceRepaired).toBe(true);
    expect(result!.stats.aiCalls).toBe(5); // 3 stages + 1 audit + 1 repair
    expect(result!.output.summary).toBe(
      "Updated summary after successful repair.",
    );
  });

  it("heistStatsLog formats stats without exposing generated text", () => {
    const log = heistStatsLog({
      outcome: "staged",
      aiCalls: 4,
      elapsedMs: 1200,
      repairedStages: ["objective"],
      coherenceRepaired: true,
      reviewIssues: ["timing issue"],
      reviewSkipped: false,
      remainingIssues: [],
    });
    expect(log).toEqual({
      outcome: "staged",
      stoppedAt: undefined,
      aiCalls: 4,
      elapsedMs: 1200,
      repairedStageCount: 1,
      coherenceRepaired: true,
      reviewIssueCount: 1,
      remainingIssueCount: 0,
    });
    expect(JSON.stringify(log)).not.toContain("Sunstone Chalice");
  });
});
