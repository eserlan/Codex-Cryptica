import { describe, expect, it } from "vitest";
import {
  commitProposal,
  makeEvaluationTurn,
} from "./adventure-evaluation-turn";
import {
  completeProposal,
  makeCase,
  now,
} from "./adventure-evaluation.fixtures";

describe("adventure evaluation turn", () => {
  it("commits a completed turn with stable identifiers and filtered generation metadata", () => {
    const testCase = makeCase();
    const proposal = Object.assign(completeProposal(), {
      generationInfo: {
        modelKey: "qa-model",
        transport: "interaction" as const,
        privateProviderField: "omit",
      },
    });
    const result = commitProposal(
      testCase.session,
      proposal,
      testCase,
      { playerAction: "Inspect." },
      2,
      () => now,
    );

    expect(result).toMatchObject({
      failed: false,
      committed: true,
      session: { revision: 1 },
    });
    expect(result.session.turns.at(-1)).toMatchObject({
      id: "evaluation-case-turn-3",
      inputId: "evaluation-case-input-3",
      playerAction: "Inspect.",
      generation: { modelKey: "qa-model", transport: "interaction" },
    });
    expect(result.session.turns.at(-1)?.generation).not.toHaveProperty(
      "privateProviderField",
    );
    expect(testCase.session.revision).toBe(0);
  });

  it("retains the session when a roll resolution cannot be committed", () => {
    const testCase = makeCase();
    const result = commitProposal(
      testCase.session,
      completeProposal(),
      testCase,
      { playerAction: "Resolve.", phase: "roll-resolution" },
      0,
      () => now,
    );
    expect(result).toEqual({
      session: testCase.session,
      failed: true,
      committed: false,
    });
  });

  it("does not commit roll requests and builds their player-facing evaluation", () => {
    const testCase = makeCase();
    const proposal = {
      kind: "roll-required" as const,
      setupNarration: "Test the latch.",
      roll: { formula: "1d20", reason: "Open the latch" },
    };
    const commit = commitProposal(
      testCase.session,
      proposal,
      testCase,
      { playerAction: "Open." },
      0,
      () => now,
    );
    expect(commit).toEqual({
      session: testCase.session,
      failed: false,
      committed: false,
    });
    expect(
      makeEvaluationTurn(
        testCase,
        { playerAction: "Open." },
        proposal,
        testCase.session,
        commit.session,
        false,
        [],
        [],
      ),
    ).toMatchObject({ narration: "Test the latch.", proposal });
  });

  it("combines secrecy inputs while respecting step-level canary overrides", () => {
    const testCase = makeCase({
      canaries: ["case-secret"],
      gmOnlyLore: ["case lore"],
    });
    const evaluation = makeEvaluationTurn(
      testCase,
      {
        playerAction: "Ask.",
        canaries: [],
        forbiddenNpcKnowledge: ["npc secret"],
        gmOnlyLore: ["step lore"],
      },
      completeProposal(),
      testCase.session,
      testCase.session,
      true,
      [
        {
          recordId: "loc-1",
          displayName: "Market",
          content: "Square",
          role: "anchor",
          lore: "anchor lore",
        },
      ],
      [
        {
          recordId: "loc-2",
          displayName: "Tower",
          content: "Bell",
          role: "relevant",
          lore: "relevant lore",
        },
      ],
    );
    expect(evaluation.canaries).toEqual(["npc secret"]);
    expect(evaluation.gmOnlyLore).toEqual([
      "case lore",
      "step lore",
      "anchor lore",
      "relevant lore",
    ]);
    expect(evaluation.commitFailed).toBe(true);
    expect(JSON.stringify(evaluation.recap)).not.toContain("CANARY-TOLL-COIN");
    expect(JSON.stringify(evaluation.transcript)).not.toContain(
      "CANARY-TOLL-COIN",
    );
  });
});
