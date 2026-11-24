import { describe, expect, it } from "vitest";
import {
  applyCompletedTurn,
  applyRollRequest,
  recordPendingRollOutcome,
  resolveRecordedRoll,
  type AdventureSession,
  type AdventureTurnProposal,
} from "../src";
import { persistedTurnSchema } from "../src/turn-schemas";
import {
  proposal as makeBaseProposal,
  session as makeBaseSession,
} from "./reducer-fixtures";

function makeSession(): AdventureSession {
  const base = makeBaseSession();
  return {
    ...base,
    turns: [],
    visibleState: {
      ...base.visibleState,
      location: { id: "loc-harbor-gate", text: "Harbor Gate" },
      situation: { id: "sit-harbor", text: "Mist curls off the pilings." },
      activeCharacters: [
        {
          id: "char-harbormaster",
          text: "Harbormaster Vance: watching the quay.",
        },
      ],
    },
  };
}

function completeProposal(
  overrides: Partial<Extract<AdventureTurnProposal, { kind: "complete" }>> = {},
): Extract<AdventureTurnProposal, { kind: "complete" }> {
  const base = makeBaseProposal();
  return {
    ...base,
    narration: "You take in the quiet quay.",
    ...overrides,
  };
}

function commitTurn(
  session: AdventureSession,
  inputId: string,
  playerAction: string,
  proposal: Extract<AdventureTurnProposal, { kind: "complete" }>,
  directorDelivery?: NonNullable<
    NonNullable<
      AdventureSession["turns"][number]["generation"]
    >["directorDelivery"]
  >,
) {
  const res = applyCompletedTurn(session, proposal, {
    turnId: `turn-${inputId}`,
    inputId,
    now: "2026-11-24T12:05:00.000Z",
    playerAction,
    generation: {
      transport: "stateless",
      threadMode: "new",
      ...(directorDelivery ? { directorDelivery } : {}),
    },
  });
  expect(res.ok).toBe(true);
  if (!res.ok) throw new Error("Expected turn commit to succeed");
  return res.value;
}

describe("Action fulfilment trace (#5196)", () => {
  it("traces object inspection with and without a state patch", () => {
    const base = makeSession();
    const withoutPatch = commitTurn(
      base,
      "inspect-1",
      "Inspect the weathered mooring post",
      completeProposal({
        narration:
          "Iron rings bolted into the oak post are pitted with salt, though nothing is tied to them.",
      }),
    );
    expect(withoutPatch.turns.at(-1)?.generation?.actionResolution).toEqual({
      outcome: "resolved",
      validation: "accepted",
      evidenceCategory: "observation",
    });

    const withPatch = commitTurn(
      withoutPatch,
      "inspect-2",
      "Check under the loose plank by the bollard",
      completeProposal({
        narration:
          "You pry up the plank and find a waxed tally chit wedged beneath.",
        visiblePatch: {
          ...makeBaseProposal().visiblePatch,
          knownFacts: {
            add: [
              {
                source: "canonical",
                text: "A waxed tally chit was wedged under the plank.",
              },
            ],
            update: [],
            removeIds: [],
          },
        },
      }),
    );
    expect(withPatch.turns.at(-1)?.generation?.actionResolution).toEqual({
      outcome: "resolved",
      validation: "accepted",
      evidenceCategory: "discovery",
    });
  });

  it("distinguishes guided movement from credible refusal/block", () => {
    const base = makeSession();
    const moved = commitTurn(
      base,
      "move-1",
      "Go to the customs house",
      completeProposal({
        narration: "You cross the cobbles and step inside the customs house.",
        visiblePatch: {
          ...makeBaseProposal().visiblePatch,
          location: { source: "canonical", text: "Customs House" },
        },
      }),
    );
    expect(moved.turns.at(-1)?.generation?.actionResolution).toEqual({
      outcome: "resolved",
      validation: "accepted",
      evidenceCategory: "movement",
    });

    const blocked = commitTurn(
      moved,
      "move-2",
      "Open the vaulted archive door",
      completeProposal({
        narration:
          "The archive door is barred from the inside and the watchman refuses to let you pass.",
      }),
    );
    expect(blocked.turns.at(-1)?.generation?.actionResolution).toEqual({
      outcome: "credible-blocked",
      validation: "accepted",
      evidenceCategory: "credible-block",
    });
  });

  it("tracks pending roll without fabricating a turn and marks resolved roll on commit", () => {
    const base = makeSession();
    const rollReq = applyRollRequest(
      base,
      {
        kind: "roll-required",
        setupNarration: "You brace your shoulder against the swollen hatch.",
        uncertainty: "Whether the rusted latch gives way cleanly.",
        stakes: "Success opens the hold; failure draws the dock guard.",
        dice: {
          expression: "2d6",
          outcomeBands: [
            { id: "band-high", range: "10-12", label: "Clean break" },
            { id: "band-mid", range: "7-9", label: "Noisy entry" },
            { id: "band-low", range: "2-6", label: "Stuck fast" },
          ],
        },
        sourceRecordIds: [],
      },
      {
        turnId: "roll-1",
        inputId: "roll-in-1",
        now: "2026-11-24T12:02:00.000Z",
        playerAction: "Force the swollen hatch",
      },
    );
    expect(rollReq.ok).toBe(true);
    if (!rollReq.ok) return;
    expect(rollReq.value.turns).toHaveLength(0);
    expect(rollReq.value.pendingRoll).toBeTruthy();

    const recorded = recordPendingRollOutcome(
      rollReq.value,
      "roll-in-1",
      { total: 11, label: "Clean break" },
      {
        turnId: "roll-1",
        inputId: "roll-in-1",
        now: "2026-11-24T12:03:00.000Z",
      },
    );
    expect(recorded.ok).toBe(true);
    if (!recorded.ok) return;

    const resolved = resolveRecordedRoll(
      recorded.value,
      completeProposal({
        narration: "The latch snaps cleanly and the hatch swings open.",
      }),
      {
        turnId: "turn-roll-1",
        inputId: "roll-in-1",
        now: "2026-11-24T12:04:00.000Z",
        playerAction: "Force the swollen hatch",
        generation: {
          transport: "interaction",
          threadMode: "continued",
        },
      },
    );
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.value.turns.at(-1)?.generation?.actionResolution).toEqual({
      outcome: "resolved",
      validation: "accepted",
      evidenceCategory: "roll-resolved",
      resolvedRoll: true,
    });
  });

  it("distinguishes witness response with epistemic limits (#5175) from clear non-answer and quiet play", () => {
    const base = makeSession();
    const limited = commitTurn(
      base,
      "ask-1",
      "Ask Harbormaster Vance who signed the manifest",
      completeProposal({
        narration:
          '"The ink was smudged before it reached my desk," Vance says, "so I cannot say who signed it, though the courier wore a green dock-guild cloak."',
      }),
    );
    expect(limited.turns.at(-1)?.generation?.actionResolution).toEqual({
      outcome: "resolved",
      validation: "accepted",
      evidenceCategory: "witness-limit",
    });

    const nonAnswer = commitTurn(
      limited,
      "ask-2",
      "Ask Vance where the courier went",
      completeProposal({
        narration: "Vance shrugs and says he has no idea and cannot tell you.",
      }),
    );
    expect(nonAnswer.turns.at(-1)?.generation?.actionResolution).toEqual({
      outcome: "unresolved",
      validation: "accepted",
      evidenceCategory: "non-answer",
    });

    const quiet = commitTurn(
      nonAnswer,
      "quiet-1",
      "Wait quietly by the lantern and watch the tide come in",
      completeProposal({
        narration:
          "Dark water laps steadily against the pilings as the fog thickens.",
      }),
    );
    expect(quiet.turns.at(-1)?.generation?.actionResolution).toEqual({
      outcome: "resolved",
      validation: "accepted",
      evidenceCategory: "quiet-play",
    });
  });

  it("classifies genuine material clarification", () => {
    const base = makeSession();
    const clarified = commitTurn(
      base,
      "clarify-1",
      "Open it",
      completeProposal({
        narration:
          "Before we proceed, could you clarify which one you mean: the ironbound sea chest or the harbormaster's ledger?",
      }),
    );
    expect(clarified.turns.at(-1)?.generation?.actionResolution).toEqual({
      outcome: "clarification",
      validation: "accepted",
      evidenceCategory: "clarification",
    });
  });

  it("marks dropped patches as corrected and avoids false success when nothing applied", () => {
    const base = makeSession();
    const droppedOnly = commitTurn(
      base,
      "drop-1",
      "Update the nonexistent dock record",
      completeProposal({
        narration: "You flip through the pages.",
        visiblePatch: {
          ...makeBaseProposal().visiblePatch,
          knownFacts: {
            add: [],
            update: [
              { id: "missing-fact", source: "canonical", text: "Updated text" },
            ],
            removeIds: [],
          },
        },
      }),
      {
        status: "included",
        reason: "delivered",
        deliveredChars: 180,
        recoveryReason: "none",
      },
    );
    const gen = droppedOnly.turns.at(-1)?.generation;
    expect(gen?.directorDelivery?.status).toBe("included");
    expect(gen?.actionResolution).toEqual({
      outcome: "unresolved",
      validation: "corrected",
      evidenceCategory: "dropped-patch",
      droppedCount: 1,
      droppedKinds: ["state-patch"],
    });
  });

  it("does not treat source references as a state change, but counts relationships", () => {
    const base = makeSession();
    const sourceOnly = commitTurn(
      base,
      "drop-source-only",
      "Update the nonexistent dock record",
      completeProposal({
        narration: "You flip through the pages.",
        sourceRecordIds: ["record-cited-by-the-response"],
        visiblePatch: {
          ...makeBaseProposal().visiblePatch,
          knownFacts: {
            add: [],
            update: [
              { id: "missing-fact", source: "canonical", text: "Updated text" },
            ],
            removeIds: [],
          },
        },
      }),
    );
    expect(sourceOnly.turns.at(-1)?.generation?.actionResolution).toMatchObject(
      {
        outcome: "unresolved",
        evidenceCategory: "dropped-patch",
      },
    );

    const relationshipAndDrop = commitTurn(
      base,
      "drop-with-relationship",
      "Update the nonexistent dock record and ask Vance for help",
      completeProposal({
        narration: "Vance agrees to help you.",
        visiblePatch: {
          ...makeBaseProposal().visiblePatch,
          knownFacts: {
            add: [],
            update: [
              { id: "missing-fact", source: "canonical", text: "Updated text" },
            ],
            removeIds: [],
          },
          relationships: {
            add: [
              {
                source: "provisional",
                text: "Vance is willing to help.",
                subjectId: "char-harbormaster",
                disposition: "helpful",
              },
            ],
            update: [],
            removeIds: [],
          },
        },
      }),
    );
    expect(
      relationshipAndDrop.turns.at(-1)?.generation?.actionResolution,
    ).toMatchObject({
      outcome: "resolved",
      validation: "corrected",
      evidenceCategory: "state-patch",
    });
  });

  it("classifies accepted scenario and package-scene progress from committed state", () => {
    const base = makeSession();
    const heardScenario = {
      version: 1 as const,
      id: "scenario-1",
      origin: { kind: "manual" as const, manualId: "seed-1" },
      playerVisible: { rumour: "Lights on the road", lead: "The old mill" },
      knowledge: "heard" as const,
      stage: "hearsay" as const,
      status: "open" as const,
      events: [],
      anchorRefs: [],
      revealedSecretIds: [],
      secretBindings: {
        truth: "truth-1",
        ifInvestigated: "investigated-1",
        eventIds: {},
      },
      gmOnly: {
        truth: "Smugglers signal from the mill",
        ifInvestigated: "Crates beneath the floor",
      },
    };
    const scenarioSession: AdventureSession = {
      ...base,
      scenarioCollection: {
        version: 1,
        items: [heardScenario],
        focusedScenarioId: "scenario-1",
      },
    };
    const scenarioAdvanced = commitTurn(
      scenarioSession,
      "scenario-only",
      "Investigate the old mill",
      completeProposal({
        narration: "You find a fresh trail leading beneath the waterwheel.",
        elaborateScenarios: [
          {
            scenarioId: "scenario-1",
            stage: "actionable-clue",
            discovery: "A fresh trail beneath the waterwheel",
          },
        ],
      }),
    );
    expect(
      scenarioAdvanced.turns.at(-1)?.generation?.actionResolution,
    ).toMatchObject({ outcome: "resolved", evidenceCategory: "discovery" });

    const packageSession: AdventureSession = {
      ...base,
      sourcePackage: {
        packageId: "reference-one-shot",
        version: "1.0.0",
        formatVersion: "adventure-json/v1",
        hash: "a".repeat(64),
      },
      packageProgress: { sceneId: "scene-entry" },
    };
    const sceneMoveProposal = completeProposal({
      narration: "You step into the old mill.",
      visiblePatch: {
        ...makeBaseProposal().visiblePatch,
        packageSceneId: "scene-mill",
      },
    });
    const moved = applyCompletedTurn(packageSession, sceneMoveProposal, {
      turnId: "turn-package-scene",
      inputId: "package-scene-only",
      now: "2026-11-24T12:05:00.000Z",
      playerAction: "Enter the old mill",
      packageSceneIds: ["scene-entry", "scene-mill"],
      generation: { transport: "stateless", threadMode: "new" },
    });
    expect(moved.ok).toBe(true);
    if (!moved.ok) return;
    expect(
      moved.value.turns.at(-1)?.generation?.actionResolution,
    ).toMatchObject({ outcome: "resolved", evidenceCategory: "movement" });
  });

  it("preserves uninstrumented legacy turns and round-trips through persistedTurnSchema", () => {
    const base = makeSession();
    const legacy = applyCompletedTurn(
      base,
      completeProposal({ narration: "You pause at the gate." }),
      {
        turnId: "turn-legacy",
        inputId: "in-legacy",
        now: "2026-11-24T12:01:00.000Z",
        playerAction: "Pause",
      },
    );
    expect(legacy.ok).toBe(true);
    if (!legacy.ok) return;
    expect(legacy.value.turns[0]?.generation).toBeUndefined();
    expect(persistedTurnSchema.safeParse(legacy.value.turns[0]).success).toBe(
      true,
    );

    const instrumented = commitTurn(
      legacy.value,
      "in-new",
      "Look at the gate",
      completeProposal({ narration: "The iron gate stands ajar." }),
    );
    expect(
      persistedTurnSchema.safeParse(instrumented.turns.at(-1)).success,
    ).toBe(true);
  });
});
