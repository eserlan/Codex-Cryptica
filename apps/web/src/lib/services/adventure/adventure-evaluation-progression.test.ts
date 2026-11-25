import { describe, expect, it } from "vitest";
import { parseAdventureSession } from "@codex/adventure-engine";
import { createCaseExecutionState } from "./adventure-evaluation-model";
import { summarizeProgression } from "./adventure-evaluation-progression";
import {
  completeProposal,
  makeEvaluation,
  makeSession,
} from "./adventure-evaluation.fixtures";

describe("adventure evaluation progression", () => {
  it("keeps retry counts when no turn was generated", () => {
    const state = createCaseExecutionState(makeSession());
    state.retryAttempts = 1;
    expect(summarizeProgression(state)).toMatchObject({
      retryAttempts: 1,
      committedTurns: 0,
      expectedSignalsMet: 0,
      expectedSignalsFailed: 0,
    });
  });

  it("accumulates expected-signal successes and failures for each executed turn", () => {
    const state = createCaseExecutionState(makeSession());
    const step = {
      playerAction: "Ask the clerk.",
      expectsActionableProgression: true,
    };
    state.executedTurns.push(
      { turn: 1, step, evaluation: makeEvaluation(), committed: false },
      {
        turn: 2,
        step,
        evaluation: makeEvaluation({
          proposal: completeProposal({
            suggestedActions: ["Read the ledger."],
          }),
        }),
        committed: true,
        progressKind: "actionable-discovery",
      },
    );

    expect(summarizeProgression(state)).toMatchObject({
      committedTurns: 1,
      actionableProgression: 1,
      expectedSignalsMet: 1,
      expectedSignalsFailed: 1,
    });
  });

  it("distinguishes normalized commitment reuse, unmarked conflict, and contested explanations", () => {
    const prior = {
      id: "motive-1",
      kind: "motive" as const,
      commitmentClass: "supporting-explanation" as const,
      subject: "Edda Vale",
      summary: "Edda tested the repaired clapper.",
      sourceTurnId: "turn-1",
      sourceRevision: 1,
      status: "committed" as const,
    };
    const session = parseAdventureSession({
      ...makeSession(),
      causalCommitments: [prior],
    });
    const state = createCaseExecutionState(session);
    for (const [index, commitment] of [
      {
        ...prior,
        subject: "EDDA  VALE",
        summary: "EDDA tested the repaired clapper.",
      },
      { ...prior, summary: "Edda warned of an intruder." },
      { ...prior, summary: "Edda warned of an intruder.", contested: true },
    ].entries()) {
      state.executedTurns.push({
        turn: index + 1,
        step: { playerAction: "Ask Edda." },
        evaluation: makeEvaluation({
          previousSession: session,
          session,
          proposal: completeProposal({ causalCommitments: [commitment] }),
        }),
        committed: true,
      });
    }

    expect(summarizeProgression(state)).toMatchObject({
      committedFactReuse: 1,
      causalConsistencyChecks: 3,
      causalConsistencyFailures: 1,
    });
  });
});
