import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  parseAdventureSession,
  type AdventureSession,
} from "@codex/adventure-engine";
import {
  AdventureEvaluationRunner,
  adventureEvaluationRunner,
} from "./adventure-evaluation-runner";
import type {
  AdventureEvaluationCase,
  AdventureEvaluationCaseResult,
  AdventureEvaluationCondition,
  AdventureEvaluationConditionResult,
  AdventureEvaluationResetClassification,
  AdventureEvaluationResult,
  AdventureEvaluationRunnerOptions,
  AdventureEvaluationStep,
  AdventureEvaluationTelemetry,
  AdventureEvaluationTurnTelemetry,
} from "./adventure-evaluation-runner";
import type {
  AdventureGenerationOptions,
  AdventureTurnGenerationRequest,
} from "@codex/ai-engine";
import {
  createGmDirectorEvaluationSession,
  GM_DIRECTOR_EVALUATION_STEPS,
} from "../../../../../../packages/adventure-engine/tests/fixtures/gm-director-evaluation";

import {
  now,
  emptyVisible,
  completeProposal,
  makeSession,
} from "./adventure-evaluation.fixtures";

describe("AdventureEvaluationRunner", () => {
  it("preserves the public evaluation contracts at the original import path", () => {
    expectTypeOf<
      Awaited<ReturnType<AdventureEvaluationRunner["run"]>>
    >().toEqualTypeOf<AdventureEvaluationResult[]>();
    expectTypeOf<
      Awaited<ReturnType<AdventureEvaluationRunner["runConditionMatrix"]>>
    >().toEqualTypeOf<AdventureEvaluationConditionResult[]>();
    expectTypeOf<AdventureEvaluationResult["cases"]>().toEqualTypeOf<
      AdventureEvaluationCaseResult[]
    >();
    expectTypeOf<AdventureEvaluationCase["turns"]>().toEqualTypeOf<
      AdventureEvaluationStep[] | undefined
    >();
    expectTypeOf<
      AdventureEvaluationResult["telemetry"]
    >().toEqualTypeOf<AdventureEvaluationTelemetry>();
    expectTypeOf<AdventureEvaluationTelemetry["turns"]>().toEqualTypeOf<
      AdventureEvaluationTurnTelemetry[]
    >();
    expectTypeOf<
      AdventureEvaluationTurnTelemetry["resetClassification"]
    >().toEqualTypeOf<AdventureEvaluationResetClassification>();
    expectTypeOf<
      AdventureEvaluationConditionResult["condition"]
    >().toEqualTypeOf<AdventureEvaluationCondition>();
    expectTypeOf<
      NonNullable<ConstructorParameters<typeof AdventureEvaluationRunner>[2]>
    >().toEqualTypeOf<AdventureEvaluationRunnerOptions>();
  });

  it("forwards QA Director treatment and reasoning effort to generation", async () => {
    const generate = vi.fn(async () => completeProposal());
    const runner = new AdventureEvaluationRunner({ generate }, ["luna-fast"], {
      directorEnabled: false,
      reasoningEffort: "medium",
    });

    await runner.run([
      {
        id: "qa-treatment",
        session: makeSession(),
        playerAction: "Ask the baker what they saw.",
        playerCharacterName: "Kestrel",
        canaries: [],
      },
    ]);

    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({ directorEnabled: false }),
      expect.objectContaining({
        modelName: "luna-fast",
        reasoningEffort: "medium",
      }),
    );
  });

  it("runs the eight isolated Director, effort, and context conditions", async () => {
    const generate = vi.fn(
      async (
        request: AdventureTurnGenerationRequest,
        options: AdventureGenerationOptions,
      ) => {
        const turn = GM_DIRECTOR_EVALUATION_STEPS.findIndex(
          (step) => step.playerAction === request.playerAction,
        );
        const proposal = completeProposal({
          narration:
            turn === 2
              ? "Oren heard one clear stroke from the market but did not see who rang it. The watch ledger may record why it sounded."
              : turn === 3
                ? "The bell rope is intact and the outer latch is undisturbed; you find no sign of forced entry."
                : "Edda rests a hand on the bell rope as the noon note fades. The watch ledger offers a useful record to check next.",
          suggestedActions: [
            "Check the watch ledger for the scheduled test.",
            "Inspect the bell rope and latch.",
            "Return to the market if you prefer.",
          ],
          ...(turn === 3
            ? {
                visiblePatch: {
                  ...emptyVisible,
                  knownFacts: {
                    add: [
                      {
                        text: "The bell rope and tower latch are undisturbed; no sign of forced entry.",
                        source: "provisional" as const,
                      },
                    ],
                    update: [],
                    removeIds: [],
                  },
                },
              }
            : {}),
        });
        return Object.assign(proposal, {
          generationInfo: {
            modelKey: options.modelName,
            reasoningEffort: options.reasoningEffort,
            transport:
              request.contextMode === "reconstructed"
                ? ("stateless" as const)
                : ("interaction" as const),
            threadMode:
              turn === 0 || request.contextMode === "reconstructed"
                ? ("new" as const)
                : turn === GM_DIRECTOR_EVALUATION_STEPS.length - 1
                  ? ("reset" as const)
                  : ("continued" as const),
            ...(turn === GM_DIRECTOR_EVALUATION_STEPS.length - 1
              ? { resetReason: "unknown" as const }
              : {}),
          },
        });
      },
    );
    const clearInteraction = vi.fn();
    const confirmInteraction = vi.fn();
    const runner = new AdventureEvaluationRunner({
      generate,
      clearInteraction,
      confirmInteraction,
    });
    const testCase: AdventureEvaluationCase = {
      id: "matrix-case",
      session: createGmDirectorEvaluationSession(),
      playerAction: GM_DIRECTOR_EVALUATION_STEPS[0]!.playerAction,
      playerCharacterName: "Mara",
      canaries: [],
      turns: GM_DIRECTOR_EVALUATION_STEPS,
    };
    const results = await runner.runConditionMatrix([testCase]);

    expect(results).toHaveLength(8);
    expect(new Set(results.map((item) => item.condition.contextMode))).toEqual(
      new Set(["retained", "reconstructed"]),
    );
    expect(generate).toHaveBeenCalledTimes(
      8 * GM_DIRECTOR_EVALUATION_STEPS.length,
    );
    expect(
      generate.mock.calls.map(([request]) => request.playerAction),
    ).toEqual(
      Array.from({ length: 8 }, () =>
        GM_DIRECTOR_EVALUATION_STEPS.map((step) => step.playerAction),
      ).flat(),
    );
    expect(
      generate.mock.calls.map(([request, options]) => ({
        modelName: options.modelName,
        reasoningEffort: options.reasoningEffort,
        directorEnabled: request.directorEnabled,
        contextMode: request.contextMode,
      })),
    ).toEqual(
      results.flatMap(({ condition }) =>
        GM_DIRECTOR_EVALUATION_STEPS.map(() => ({
          modelName: condition.modelName,
          reasoningEffort: condition.reasoningEffort,
          directorEnabled: condition.directorEnabled,
          contextMode: condition.contextMode,
        })),
      ),
    );
    expect(
      generate.mock.calls
        .filter((_, index) => index % GM_DIRECTOR_EVALUATION_STEPS.length === 0)
        .map(([request]) => ({ ...request.session, id: "same-fixture-id" })),
    ).toEqual(
      Array.from({ length: 8 }, () => ({
        ...testCase.session,
        id: "same-fixture-id",
      })),
    );
    expect(results[0]?.results[0]?.cases[0]?.telemetry).toMatchObject({
      providerUsage: "unavailable",
      estimatedPrice: "unavailable",
      turns: [
        expect.objectContaining({
          modelKey: "luna-fast",
          requestedEffort: "low",
          actualEffort: "low",
          contextMode: "retained",
          transport: "interaction",
          threadMode: "new",
          resetClassification: "none",
          committed: true,
        }),
        ...Array.from({ length: GM_DIRECTOR_EVALUATION_STEPS.length - 2 }, () =>
          expect.objectContaining({
            modelKey: "luna-fast",
            actualEffort: "low",
            threadMode: "continued",
            resetClassification: "none",
            committed: true,
          }),
        ),
        expect.objectContaining({
          resetClassification: "scripted",
          committed: true,
        }),
      ],
    });
    expect(results[0]?.results[0]?.cases[0]?.progression).toEqual({
      meaningfulAdvancement: 0,
      committedTurns: GM_DIRECTOR_EVALUATION_STEPS.length,
      substantiveAnswers: GM_DIRECTOR_EVALUATION_STEPS.length,
      actionableProgression: GM_DIRECTOR_EVALUATION_STEPS.length,
      usefulNegativeFindings: 1,
      causalStateChanges: 0,
      committedFactReuse: 0,
      causalConsistencyChecks: 0,
      causalConsistencyFailures: 0,
      npcKnowledgeChecks: 1,
      npcKnowledgeViolations: 0,
      validQuietOutcomes: 1,
      repeatedNonAnswers: 0,
      agencyPreserved: GM_DIRECTOR_EVALUATION_STEPS.length,
      expectedSignalsMet: 12,
      expectedSignalsFailed: 0,
      retryAttempts: 0,
    });
    expect(results.every((item) => item.results[0]?.passed)).toBe(true);
    expect(
      results[0]?.results[0]?.cases[0]?.telemetry.turns.every(
        (turn) =>
          turn.rubrics?.agency === 1 &&
          turn.rubrics.secrecy === 1 &&
          turn.rubrics.continuity === 1 &&
          turn.rubrics.canonSafety === 1 &&
          turn.rubrics.consequenceCredibility === 1 &&
          turn.rubrics.unnecessaryEscalation === 1 &&
          turn.rubricFailures?.length === 0,
      ),
    ).toBe(true);
    expect(confirmInteraction).toHaveBeenCalledTimes(
      4 * GM_DIRECTOR_EVALUATION_STEPS.length,
    );
    expect(clearInteraction).toHaveBeenCalledTimes(
      4 + 2 * 4 * GM_DIRECTOR_EVALUATION_STEPS.length,
    );
  });

  it("recognizes common grounded negative findings without treating ignorance as evidence", async () => {
    const cases = [
      {
        narration: "The latch shows no signs of forced entry.",
        expected: true,
      },
      { narration: "No visible marks appear around the lock.", expected: true },
      { narration: "The search turns up nothing in the box.", expected: true },
      {
        narration: "The rope and latch are visible from here.",
        expected: false,
      },
      {
        narration: "No one at the market knows who rang the bell.",
        expected: false,
      },
    ];

    for (const [index, testCase] of cases.entries()) {
      const runner = new AdventureEvaluationRunner(
        {
          generate: vi.fn(async () =>
            completeProposal({ narration: testCase.narration }),
          ),
        },
        ["luna-fast"],
        { commitNow: () => now },
      );
      const result = await runner.run([
        {
          id: `negative-finding-${index}`,
          session: makeSession(),
          playerAction:
            "Inspect the bell rope and latch for signs of tampering.",
          playerCharacterName: "Kestrel",
          canaries: [],
          turns: [
            {
              playerAction:
                "Inspect the bell rope and latch for signs of tampering.",
              expectsUsefulNegativeFinding: true,
            },
          ],
        },
      ]);

      expect(
        result[0]?.cases[0]?.telemetry.turns[0]?.expectedSignals
          .usefulNegativeFinding,
        testCase.narration,
      ).toBe(testCase.expected);
    }
  });

  it("does not pass providers when there are no evaluation cases", async () => {
    const runner = new AdventureEvaluationRunner({ generate: vi.fn() }, [
      "empty-provider",
    ]);

    const [result] = await runner.run([]);

    expect(result?.cases).toEqual([]);
    expect(result?.passed).toBe(false);
  });

  it("reports an unconfigured generation service as an explicit failed run", async () => {
    const [result] = await adventureEvaluationRunner.run([
      {
        id: "unconfigured",
        session: makeSession(),
        playerAction: "Look around.",
        playerCharacterName: "Kestrel",
        canaries: [],
      },
    ]);

    expect(result?.cases[0]?.passed).toBe(false);
    expect(result?.cases[0]?.continuity).toBe(0);
    expect(result?.cases[0]?.executionFailures).toEqual([
      { turn: 1, kind: "generation" },
    ]);
    expect(result?.telemetry.turns[0]).toMatchObject({
      modelKey: "unknown",
      actualEffort: "unknown",
      transport: "unknown",
      resetClassification: "unknown",
    });
  });

  it("keeps model, transport, effort, and reset fields unknown when generation omits them", async () => {
    const runner = new AdventureEvaluationRunner(
      { generate: vi.fn(async () => completeProposal()) },
      ["luna-fast"],
      { reasoningEffort: "medium" },
    );

    const [result] = await runner.run([
      {
        id: "unknown-generation-metadata",
        session: makeSession(),
        playerAction: "Ask the baker for a rumour.",
        playerCharacterName: "Kestrel",
        canaries: [],
      },
    ]);

    expect(result?.telemetry.turns[0]).toMatchObject({
      modelKey: "unknown",
      requestedEffort: "medium",
      actualEffort: "unknown",
      contextMode: "unspecified",
      transport: "unknown",
      threadMode: "unknown",
      resetClassification: "unknown",
    });
  });

  it("retries a failed generation against the same uncommitted turn after clearing provider history", async () => {
    const seen: AdventureTurnGenerationRequest[] = [];
    const clearInteraction = vi.fn();
    const confirmInteraction = vi.fn();
    let attempts = 0;
    const generate = vi.fn(async (request: AdventureTurnGenerationRequest) => {
      seen.push(request);
      attempts += 1;
      if (attempts === 1) throw new Error("temporary provider failure");
      return Object.assign(completeProposal(), {
        generationInfo: {
          modelKey: "luna-fast",
          reasoningEffort: "low" as const,
          transport: "interaction" as const,
          threadMode: "new" as const,
        },
      });
    });
    const runner = new AdventureEvaluationRunner(
      { generate, clearInteraction, confirmInteraction },
      ["luna-fast"],
      { reasoningEffort: "low", commitNow: () => now },
    );

    const [result] = await runner.run([
      {
        id: "retry-same-action",
        session: makeSession(),
        playerAction: "Check the watch ledger.",
        playerCharacterName: "Kestrel",
        canaries: [],
        turns: [
          {
            playerAction: "Check the watch ledger.",
            retryOnGenerationFailure: true,
          },
        ],
      },
    ]);

    expect(generate).toHaveBeenCalledTimes(2);
    expect(seen.map((request) => request.playerAction)).toEqual([
      "Check the watch ledger.",
      "Check the watch ledger.",
    ]);
    expect(seen[1]?.session.revision).toBe(seen[0]?.session.revision);
    expect(result?.cases[0]?.telemetry.modelCalls).toBe(2);
    expect(result?.cases[0]?.telemetry.turns[0]?.generationAttempts).toBe(2);
    expect(result?.cases[0]?.progression.retryAttempts).toBe(1);
    expect(result?.cases[0]?.progression.committedTurns).toBe(1);
    expect(result?.cases[0]?.executionFailures).toEqual([]);
    expect(clearInteraction).toHaveBeenCalledTimes(2);
    expect(confirmInteraction).toHaveBeenCalledTimes(1);
  });

  it("stops a multi-turn sequence after generation retries are exhausted", async () => {
    const generate = vi.fn(async () => {
      throw new Error("provider unavailable");
    });
    const runner = new AdventureEvaluationRunner({ generate }, ["luna-fast"], {
      reasoningEffort: "low",
      commitNow: () => now,
    });

    const [result] = await runner.run([
      {
        id: "stop-after-generation-failure",
        session: makeSession(),
        playerAction: "Check the watch ledger.",
        playerCharacterName: "Kestrel",
        canaries: [],
        turns: [
          {
            playerAction: "Check the watch ledger.",
            retryOnGenerationFailure: true,
          },
          { playerAction: "Ask the clerk about the bell." },
        ],
      },
    ]);

    expect(generate).toHaveBeenCalledTimes(2);
    expect(result?.cases[0]?.executionFailures).toEqual([
      { turn: 1, kind: "generation" },
    ]);
    expect(result?.telemetry.turns).toHaveLength(1);
    expect(result?.cases[0]?.passed).toBe(false);
  });

  it("scores stable committed-fact reuse and fails an unmarked causal contradiction", async () => {
    const commitment = {
      kind: "motive" as const,
      commitmentClass: "supporting-explanation" as const,
      subject: "Edda Vale",
      summary: "Edda tested the repaired clapper at the watch's request.",
    };
    const stableRunner = new AdventureEvaluationRunner(
      {
        generate: vi.fn(async () =>
          completeProposal({ causalCommitments: [commitment] }),
        ),
      },
      ["luna-fast"],
      { commitNow: () => now },
    );
    const stable = await stableRunner.run([
      {
        id: "causal-reuse",
        session: makeSession(),
        playerAction: "Ask Edda about the test.",
        playerCharacterName: "Kestrel",
        canaries: [],
        turns: [
          { playerAction: "Ask Edda about the test." },
          { playerAction: "Return to the test details." },
        ],
      },
    ]);

    expect(stable[0]?.cases[0]?.progression.committedFactReuse).toBe(1);
    expect(stable[0]?.cases[0]?.progression.causalConsistencyChecks).toBe(1);
    expect(stable[0]?.cases[0]?.progression.causalConsistencyFailures).toBe(0);
    expect(stable[0]?.cases[0]?.passed).toBe(true);

    const conflicting = new AdventureEvaluationRunner(
      {
        generate: vi.fn(async (request) =>
          completeProposal({
            causalCommitments: [
              {
                ...commitment,
                summary:
                  request.playerAction === "Change the explanation."
                    ? "Edda rang the bell to warn of an intruder."
                    : commitment.summary,
              },
            ],
          }),
        ),
      },
      ["luna-fast"],
      { commitNow: () => now },
    );
    const contradiction = await conflicting.run([
      {
        id: "causal-conflict",
        session: makeSession(),
        playerAction: "Ask Edda about the test.",
        playerCharacterName: "Kestrel",
        canaries: [],
        turns: [
          { playerAction: "Ask Edda about the test." },
          { playerAction: "Change the explanation." },
        ],
      },
    ]);

    expect(
      contradiction[0]?.cases[0]?.progression.causalConsistencyFailures,
    ).toBe(1);
    expect(contradiction[0]?.cases[0]?.passed).toBe(false);
  });

  it("passes grounded context, scores all 6 rubric dimensions, and records deterministic telemetry", async () => {
    let clock = 1_000;
    let hydrations = 0;
    const generate = vi.fn(async (request) => {
      clock += 25;
      if (request.playerAction === "Walk to the South Gate.") {
        return completeProposal({
          narration: "You walk past the stalls toward the South Gate.",
          moveTo: { name: "South Gate" },
          timeAdvance: {
            minutes: 15,
            cause: "Walked to the gate",
            developments: [
              { threadId: "thread-1", text: "Guards close the side wicket." },
            ],
          },
        });
      }
      return completeProposal({
        narration: "Lantern light glints on the timber gatehouse.",
      });
    });

    const grounding = {
      prepare: vi.fn(async ({ session }: { session: AdventureSession }) => {
        hydrations += 2;
        return {
          vaultId: session.vaultId,
          sessionId: session.id,
          revision: session.revision,
          purpose: "action" as const,
          anchors: [
            {
              recordId: "loc-1",
              displayName: "Oakhaven Market",
              content: "A cobbled market square.",
              lore: "GM-ONLY-TUNNEL-BELOW",
              role: "anchor" as const,
            },
          ],
          relevant: [
            {
              recordId: "npc-1",
              displayName: "Warden Hale",
              content: "Keeps the gate ledger.",
              role: "turn-source" as const,
            },
          ],
          sessionKnowledge: {} as any,
        };
      }),
    };

    const runner = new AdventureEvaluationRunner(
      { generate },
      ["stub-provider"],
      {
        grounding,
        now: () => clock,
        getRetrievalHydrations: () => hydrations,
        commitNow: () => "2026-11-10T10:05:00.000Z",
      },
    );

    const results = await runner.run([
      {
        id: "multi-turn-case",
        session: makeSession(),
        playerAction: "Walk to the South Gate.",
        playerCharacterName: "Kestrel",
        canaries: ["CANARY-TOLL-COIN"],
        turns: [
          { playerAction: "Walk to the South Gate." },
          { playerAction: "Inspect the gatehouse." },
        ],
      },
    ]);

    expect(results).toHaveLength(1);
    const [res] = results;
    expect(res!.provider).toBe("stub-provider");
    expect(res!.passed).toBe(true);
    expect(res!.agency).toBe(1);
    expect(res!.secrecy).toBe(1);
    expect(res!.continuity).toBe(1);
    expect(res!.canonSafety).toBe(1);
    expect(res!.consequenceCredibility).toBe(1);
    expect(res!.unnecessaryEscalation).toBe(1);
    expect(res!.telemetry.modelCalls).toBe(2);
    expect(res!.telemetry.retrievalHydrations).toBe(4);
    expect(res!.telemetry.serializedStateChars).toBeGreaterThan(0);
    expect(res!.telemetry.generationInputChars).toBeGreaterThan(
      res!.telemetry.serializedStateChars,
    );
    expect(res!.telemetry.durationMs).toBe(50);
    expect(res!.telemetry.expansionCount).toBe(2); // 1 new place + 1 worldTime event
    expect(generate.mock.calls[0]![0].anchors).toHaveLength(1);
    expect(generate.mock.calls[0]![0].relevant).toHaveLength(1);
  });

  it("commits the supplied outcome once during roll resolution", async () => {
    const suppliedOutcome = {
      kind: "numeric" as const,
      value: 17,
      label: "success",
    };
    const session = parseAdventureSession({
      ...makeSession(),
      pendingRoll: {
        id: "roll-1",
        inputId: "roll-input-1",
        playerAction: "Leap across the gap.",
        uncertainty: "Whether Kestrel can reach the ledge.",
        stakes: "A fall would cause injury.",
        resolutionStatus: "ready-to-resolve",
        suppliedOutcome,
        createdAt: now,
        outcomeRecordedAt: now,
      },
    });
    const runner = new AdventureEvaluationRunner(
      { generate: vi.fn(async () => completeProposal()) },
      ["stub-provider"],
      { commitNow: () => now },
    );

    const [result] = await runner.run([
      {
        id: "roll-resolution-case",
        session,
        playerAction: "The result is 17.",
        playerCharacterName: "Kestrel",
        canaries: [],
        phase: "roll-resolution",
      },
    ]);

    expect(result?.continuity).toBe(1);
    expect(result?.passed).toBe(true);
  });

  it("fails continuity when a complete proposal is rejected without a pending roll", async () => {
    const clearInteraction = vi.fn();
    const confirmInteraction = vi.fn();
    const generate = vi.fn(async () =>
      completeProposal({ revealSecretIds: ["unknown-secret"] }),
    );
    const runner = new AdventureEvaluationRunner(
      {
        generate,
        clearInteraction,
        confirmInteraction,
      },
      ["stub-provider"],
      { commitNow: () => now },
    );

    const [result] = await runner.run([
      {
        id: "rejected-completion-case",
        session: makeSession(),
        playerAction: "Look around the market.",
        playerCharacterName: "Kestrel",
        canaries: [],
        turns: [
          { playerAction: "Look around the market." },
          { playerAction: "Ask the baker about the bell." },
        ],
      },
    ]);

    expect(result?.continuity).toBe(0);
    expect(result?.passed).toBe(false);
    expect(result?.cases[0]?.executionFailures).toEqual([
      { turn: 1, kind: "commit" },
    ]);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(result?.telemetry.turns).toHaveLength(1);
    expect(clearInteraction).toHaveBeenCalledTimes(1);
    expect(confirmInteraction).not.toHaveBeenCalled();
  });

  it("attributes shared retrieval hydration counts to serialized providers", async () => {
    let hydrations = 0;
    const grounding = {
      prepare: async ({ session }: { session: AdventureSession }) => {
        await Promise.resolve();
        hydrations += 1;
        return {
          vaultId: session.vaultId,
          sessionId: session.id,
          revision: session.revision,
          purpose: "action" as const,
          anchors: [],
          relevant: [],
          sessionKnowledge: {} as any,
        };
      },
    };
    const runner = new AdventureEvaluationRunner(
      {
        generate: vi.fn(async () => completeProposal()),
      },
      ["provider-a", "provider-b"],
      {
        grounding,
        getRetrievalHydrations: () => hydrations,
        commitNow: () => now,
      },
    );

    const results = await runner.run([
      {
        id: "shared-counter-case",
        session: makeSession(),
        playerAction: "Look around the market.",
        playerCharacterName: "Kestrel",
        canaries: [],
      },
    ]);

    expect(
      results.map((result) => result.telemetry.retrievalHydrations),
    ).toEqual([1, 1]);
  });

  it("applies a case-level roll-resolution phase to multi-turn steps", async () => {
    const suppliedOutcome = {
      kind: "numeric" as const,
      value: 17,
      label: "success",
    };
    const session = parseAdventureSession({
      ...makeSession(),
      pendingRoll: {
        id: "roll-1",
        inputId: "roll-input-1",
        playerAction: "Leap across the gap.",
        uncertainty: "Whether Kestrel can reach the ledge.",
        stakes: "A fall would cause injury.",
        resolutionStatus: "ready-to-resolve",
        suppliedOutcome,
        createdAt: now,
        outcomeRecordedAt: now,
      },
    });
    const seenPhases: string[] = [];
    const seenSessions: AdventureSession[] = [];
    const runner = new AdventureEvaluationRunner(
      {
        generate: vi.fn(async (request) => {
          seenPhases.push(request.phase);
          seenSessions.push(request.session);
          return completeProposal();
        }),
      },
      ["stub-provider"],
      { commitNow: () => now },
    );

    const [result] = await runner.run([
      {
        id: "multi-turn-roll-resolution-case",
        session,
        playerAction: "The result is 17.",
        playerCharacterName: "Kestrel",
        canaries: [],
        phase: "roll-resolution",
        turns: [
          { playerAction: "The result is 17." },
          { playerAction: "Cross to the ledge.", phase: "action" },
        ],
      },
    ]);

    expect(seenPhases).toEqual(["roll-resolution", "action"]);
    // The recorded outcome is committed exactly once: by the second turn the
    // pending roll is resolved and only one resolved turn exists.
    const secondTurnSession = seenSessions[1]!;
    expect(secondTurnSession.pendingRoll).toBeNull();
    expect(secondTurnSession.turns).toHaveLength(1);
    expect(secondTurnSession.turns[0]?.resolvedRoll?.outcome).toEqual(
      suppliedOutcome,
    );
    expect(result?.continuity).toBe(1);
    expect(result?.passed).toBe(true);
  });

  it("fails continuity when a roll-resolution proposal cannot be committed", async () => {
    const session = parseAdventureSession({
      ...makeSession(),
      pendingRoll: {
        id: "roll-1",
        inputId: "roll-input-1",
        playerAction: "Leap across the gap.",
        uncertainty: "Whether Kestrel can reach the ledge.",
        stakes: "A fall would cause injury.",
        resolutionStatus: "ready-to-resolve",
        suppliedOutcome: { kind: "numeric", value: 17 },
        createdAt: now,
        outcomeRecordedAt: now,
      },
    });
    const runner = new AdventureEvaluationRunner(
      {
        generate: vi.fn(async () =>
          completeProposal({ narration: "CANARY-TOLL-COIN" }),
        ),
      },
      ["stub-provider"],
      { commitNow: () => now },
    );

    const [result] = await runner.run([
      {
        id: "rejected-roll-resolution-case",
        session,
        playerAction: "The result is 17.",
        playerCharacterName: "Kestrel",
        canaries: ["CANARY-TOLL-COIN"],
        phase: "roll-resolution",
      },
    ]);

    expect(result?.continuity).toBe(0);
    expect(result?.passed).toBe(false);
  });

  it("flags failures for canary/GM-lore leakage, agency override, canon duplication, and unnecessary escalation", async () => {
    const generate = vi.fn(async () =>
      completeProposal({
        narration:
          "Kestrel decides to charge! Suddenly an ambush erupts! CANARY-TOLL-COIN",
        visiblePatch: {
          ...emptyVisible,
          objectives: {
            add: [{ text: "Defeat the bandits", source: "provisional" }],
            update: [],
            removeIds: [],
          },
        },
        provisionalFacts: [
          {
            kind: "place",
            name: "Oakhaven Market",
            summary: "Duplicate canonical location",
            visibility: "player-visible",
          },
        ],
      }),
    );

    const runner = new AdventureEvaluationRunner({ generate }, ["bad-model"]);
    const [res] = await runner.run([
      {
        id: "failing-case",
        session: makeSession(),
        playerAction: "I decline the rumour and rest at the inn.",
        playerCharacterName: "Kestrel",
        canaries: ["CANARY-TOLL-COIN"],
      },
    ]);

    expect(res!.passed).toBe(false);
    expect(res!.agency).toBe(0);
    expect(res!.secrecy).toBe(0);
    expect(res!.canonSafety).toBe(0);
    expect(res!.unnecessaryEscalation).toBe(0);
  });
});
