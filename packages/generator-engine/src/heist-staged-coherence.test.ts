import { describe, expect, it, vi } from "vitest";
import { finishHeistCoherence } from "./heist-staged-coherence";
import { assembleHeist } from "./heist-staged-assembly";
import type { HeistRunState } from "./heist-staged-contracts";
import {
  RESOLVED_THEFT,
  VALID_STAGE_1,
  VALID_STAGE_2,
  VALID_STAGE_3,
} from "./heist-staged.fixtures";
import { StagedProgress } from "./staged-progress";
import type { JsonObject } from "./staged-runtime";

const cleanAudit = {
  verdict: "clean",
  fullScore: "Retrieve the chalice and escape.",
  transitions: [
    {
      event: "Objective completion",
      stateBefore: "Infiltration",
      stateAfter: "Escape",
      factsChanged: ["chalice: taken"],
    },
  ],
  issues: [],
};
const repairAudit = {
  ...cleanAudit,
  verdict: "repair",
  issues: [
    {
      id: "timing",
      sections: ["Security Rings"],
      problem: "Alarm timing conflicts.",
      requiredFact: "Keep the alarm consistent.",
    },
  ],
};

function document(): JsonObject {
  return assembleHeist(
    VALID_STAGE_1,
    VALID_STAGE_2,
    VALID_STAGE_3,
    RESOLVED_THEFT,
  );
}

function runState() {
  const progress = vi.fn();
  const run: HeistRunState = {
    system: "Generate a heist.",
    progress: new StagedProgress(
      [{ id: "coherence", label: "Review" }],
      progress,
    ),
    stats: {
      outcome: "fell-back",
      aiCalls: 0,
      elapsedMs: 0,
      repairedStages: [],
      coherenceRepaired: false,
      reviewIssues: [],
      reviewSkipped: false,
      remainingIssues: [],
    },
  };
  return { run, progress };
}

describe("heist coherence and repair", () => {
  it("reviews a valid assembly once and forwards review context", async () => {
    const { run, progress } = runState();
    const complete = vi.fn(async (_system: string, _message: string) =>
      JSON.stringify(cleanAudit),
    );
    const output = await finishHeistCoherence(
      { complete },
      run,
      document(),
      RESOLVED_THEFT,
      "Locked review context",
    );
    expect(output?.title).toBe(VALID_STAGE_1.title);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete.mock.calls[0][1]).toContain("Locked review context");
    expect(run.stats).toMatchObject({
      aiCalls: 1,
      reviewSkipped: false,
      coherenceRepaired: false,
    });
    expect(progress.mock.lastCall?.[0][0].status).toBe("done");
  });

  it.each([{}, { content: "", lore: "Text" }, { content: "Text", lore: "" }])(
    "falls back without an AI call on an unusable assembly: %j",
    async (assembled) => {
      const { run, progress } = runState();
      const complete = vi.fn();
      expect(
        await finishHeistCoherence(
          { complete },
          run,
          assembled,
          RESOLVED_THEFT,
        ),
      ).toBeNull();
      expect(complete).not.toHaveBeenCalled();
      expect(run.stats.stoppedAt).toBe("assembly");
      expect(progress.mock.lastCall?.[0][0].status).toBe("fallback");
    },
  );

  it.each(["rejection", "invalid JSON"])(
    "keeps a valid assembly when its audit fails: %s",
    async (failure) => {
      const { run } = runState();
      const complete = vi.fn<() => Promise<string>>();
      if (failure === "rejection")
        complete.mockRejectedValue(new Error("Offline"));
      else complete.mockResolvedValue("not JSON");
      const output = await finishHeistCoherence(
        { complete },
        run,
        document(),
        RESOLVED_THEFT,
      );
      expect(output?.title).toBe(VALID_STAGE_1.title);
      expect(run.stats).toMatchObject({
        aiCalls: 1,
        reviewSkipped: true,
        coherenceRepaired: false,
      });
    },
  );

  it("accepts a repair without structural regression and records review issues", async () => {
    const { run } = runState();
    const repaired = { ...document(), summary: "Repaired score." };
    const complete = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce(JSON.stringify(repairAudit))
      .mockResolvedValueOnce(JSON.stringify(repaired));
    const output = await finishHeistCoherence(
      { complete },
      run,
      document(),
      RESOLVED_THEFT,
    );
    expect(output?.summary).toBe("Repaired score.");
    expect(run.stats).toMatchObject({
      aiCalls: 2,
      coherenceRepaired: true,
      reviewIssues: ["Alarm timing conflicts."],
    });
  });

  it.each(["regression", "invalid JSON", "rejection"])(
    "retains the original when repair fails: %s",
    async (failure) => {
      const { run } = runState();
      const complete = vi
        .fn<() => Promise<string>>()
        .mockResolvedValueOnce(JSON.stringify(repairAudit));
      if (failure === "rejection")
        complete.mockRejectedValueOnce(new Error("Offline"));
      else
        complete.mockResolvedValueOnce(
          failure === "invalid JSON"
            ? "not JSON"
            : JSON.stringify({
                ...document(),
                summary: "Bad repair.",
                lore: "Missing sections.",
              }),
        );
      const output = await finishHeistCoherence(
        { complete },
        run,
        document(),
        RESOLVED_THEFT,
      );
      expect(output?.summary).toBe(VALID_STAGE_1.summary);
      expect(run.stats).toMatchObject({ aiCalls: 2, coherenceRepaired: false });
    },
  );

  it("builds a deterministic repair audit when review fails on a structurally incomplete draft", async () => {
    const { run } = runState();
    const complete = vi
      .fn(async (_system: string, _message: string) =>
        JSON.stringify(document()),
      )
      .mockRejectedValueOnce(new Error("Audit unavailable"));
    const output = await finishHeistCoherence(
      { complete },
      run,
      { ...document(), lore: "Missing sections." },
      RESOLVED_THEFT,
    );
    expect(output?.lore).toContain("### Security Rings");
    expect(complete.mock.calls[1][1]).toContain("det-1");
    expect(run.stats).toMatchObject({
      aiCalls: 2,
      reviewSkipped: true,
      coherenceRepaired: true,
    });
  });

  it.each(["audit", "repair"])(
    "propagates cancellation during %s",
    async (stage) => {
      const { run, progress } = runState();
      const controller = new AbortController();
      const reason = new DOMException("Cancelled", "AbortError");
      const complete = vi.fn(async () => {
        controller.abort(reason);
        return JSON.stringify(stage === "audit" ? cleanAudit : document());
      });
      if (stage === "repair")
        complete.mockResolvedValueOnce(JSON.stringify(repairAudit));
      await expect(
        finishHeistCoherence(
          { complete, signal: controller.signal },
          run,
          document(),
          RESOLVED_THEFT,
        ),
      ).rejects.toBe(reason);
      expect(complete).toHaveBeenCalledTimes(stage === "audit" ? 1 : 2);
      expect(run.stats.coherenceRepaired).toBe(false);
      expect(progress.mock.lastCall?.[0][0].status).toBe("active");
    },
  );
});
