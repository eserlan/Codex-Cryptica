import { describe, expect, it } from "vitest";
import { heistStatsLog } from "./heist-staged-contracts";

describe("heist diagnostic logging", () => {
  it("reports fallback location and issue counts without issue text", () => {
    const log = heistStatsLog({
      outcome: "fell-back",
      stoppedAt: "security",
      aiCalls: 3,
      elapsedMs: 0,
      repairedStages: [],
      coherenceRepaired: false,
      reviewIssues: [],
      reviewSkipped: true,
      remainingIssues: ["Private campaign detail"],
    });
    expect(log).toMatchObject({
      outcome: "fell-back",
      stoppedAt: "security",
      repairedStageCount: 0,
      remainingIssueCount: 1,
    });
    expect(JSON.stringify(log)).not.toContain("Private campaign detail");
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
