import { describe, expect, it, vi } from "vitest";
import {
  assembleHeist,
  generateHeistStaged,
  type HeistStagedStats,
} from "./heist-staged";
import { buildHeistPrompt, type HeistGeneratorOptions } from "./public-heist";
import type { JsonObject } from "./staged-runtime";
import type { StagedProgressStep } from "./staged-progress";

import {
  VALID_STAGE_1,
  VALID_STAGE_2,
  VALID_STAGE_3,
} from "./heist-staged.fixtures";

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
});
