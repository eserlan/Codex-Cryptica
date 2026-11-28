import { describe, expect, it } from "vitest";
import { generationSummary } from "./adventure-diagnostic-generation";
import { quietSession } from "./test-fixtures/adventure-review";

describe("Adventure generation diagnostics", () => {
  it("tallies recorded metadata separately from legacy unknown turns", () => {
    const session = quietSession(4);
    session.turns[1].generation = {
      transport: "interaction",
      threadMode: "continued",
      scenarioIds: ["scenario-1"],
      progressCategory: "actionable-discovery",
      directorDelivery: {
        status: "retained",
        reason: "retained-unchanged",
        deliveredChars: 0,
      },
      actionResolution: {
        outcome: "resolved",
        validation: "accepted",
        evidenceCategory: "state-patch",
      },
    };
    session.turns[2].generation = {
      transport: "stateless",
      threadMode: "reset",
      progressCategory: "repeated-non-answer",
    };
    session.turns[3].generation = {
      transport: "interaction",
      threadMode: "reset",
      resetReason: "revision-mismatch",
      revisionMismatchCause: "state-correction",
      actionResolution: {
        outcome: "unresolved",
        validation: "corrected",
        evidenceCategory: "dropped-patch",
      },
    };

    expect(generationSummary(session)).toMatchObject({
      turnsWithGeneration: 3,
      turnsWithoutGeneration: 1,
      transportCounts: { interaction: 2, stateless: 1, unknown: 1 },
      threadModeCounts: { new: 0, continued: 1, reset: 2, unknown: 1 },
      threadReuseTurns: 1,
      resets: 2,
      lastResetReason: "revision-mismatch",
      lastRevisionMismatchCause: "state-correction",
      lastScenarioIds: ["scenario-1"],
      directorDelivery: { retained: 1, unknown: 3 },
      actionOutcome: { resolved: 1, unresolved: 1, unknown: 2 },
      actionValidation: { accepted: 1, corrected: 1, unknown: 2 },
      recentMeaningfulProgressTurns: 1,
    });
  });

  it("limits recent progress to five classifications without losing total counts", () => {
    const session = quietSession(7);
    session.turns.forEach((turn, index) => {
      turn.generation = {
        progressCategory:
          index < 2 ? "actionable-discovery" : "no-observable-change",
      };
    });

    expect(generationSummary(session)).toMatchObject({
      progressCategoryCounts: {
        "actionable-discovery": 2,
        "no-observable-change": 5,
      },
      recentProgressCategories: Array(5).fill("no-observable-change"),
      recentMeaningfulProgressTurns: 0,
      lastProgressCategory: "no-observable-change",
    });
  });

  it("distinguishes an unrecorded reset reason from no reset", () => {
    const session = quietSession(1);
    expect(generationSummary(session).lastResetReason).toBeNull();
    expect(generationSummary(session)).not.toHaveProperty(
      "pendingRollActionResolution",
    );
    session.turns[0].generation = { threadMode: "reset" };
    expect(generationSummary(session).lastResetReason).toBe("unknown");
    expect(generationSummary(session)).not.toHaveProperty(
      "lastRevisionMismatchCause",
    );
  });

  it("reports a pending roll independently of committed generation metadata", () => {
    const session = quietSession(0);
    session.pendingRoll = {
      id: "roll-1",
      inputId: "input-roll",
      playerAction: "Open the lock",
      setupNarration: "The lock resists.",
      uncertainty: "Whether the lock opens",
      stakes: "The watch may arrive",
      resolutionStatus: "awaiting-outcome",
      createdAt: session.createdAt,
    };

    expect(generationSummary(session)).toMatchObject({
      turnsWithGeneration: 0,
      turnsWithoutGeneration: 0,
      pendingRollActionResolution: {
        outcome: "roll-required",
        validation: "accepted",
        evidenceCategory: "roll-pending",
      },
      lastScenarioIds: [],
    });
  });
});
