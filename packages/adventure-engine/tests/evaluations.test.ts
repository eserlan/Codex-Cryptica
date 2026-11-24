import { describe, expect, it } from "vitest";
import {
  aggregateScores,
  buildAdventureRecap,
  canonSafetyFailures,
  consequenceCredibilityFailures,
  createPlayerTranscript,
  createScenarioState,
  evaluateAdventureRun,
  evaluateAdventureTurn,
  parseAdventureSession,
  scoreCanonSafety,
  scoreConsequenceCredibility,
  scoreContinuity,
  scorePlayerAgency,
  scoreSecrecy,
  scoreUnnecessaryEscalation,
  type AdventureSession,
  type AdventureTurnProposal,
} from "../src";

const now = "2026-11-10T10:00:00.000Z";

const emptyVisible = {
  objectives: { add: [], update: [], removeIds: [] },
  activeCharacters: { add: [], update: [], removeIds: [] },
  knownFacts: { add: [], update: [], removeIds: [] },
  relationships: { add: [], update: [], removeIds: [] },
};

const emptyHidden = {
  secrets: { add: [], update: [], removeIds: [] },
  gmThreads: { add: [], update: [], removeIds: [] },
};

function completeProposal(
  overrides: Partial<Extract<AdventureTurnProposal, { kind: "complete" }>> = {},
): Extract<AdventureTurnProposal, { kind: "complete" }> {
  return {
    kind: "complete",
    narration: "Rain patters on the cobblestones as the lantern flickers.",
    visiblePatch: emptyVisible,
    hiddenPatch: emptyHidden,
    revealSecretIds: [],
    provisionalFacts: [],
    sourceRecordIds: [],
    ...overrides,
  };
}

function makeSession(
  overrides: Partial<AdventureSession> = {},
): AdventureSession {
  const scenario1 = {
    ...createScenarioState({
      id: "scen-1",
      origin: { kind: "manual", manualId: "m-1" },
      playerVisible: {
        rumour: "Bells ring beneath the well at dusk.",
        lead: "Old Well",
      },
      gmOnly: {
        truth: "Smugglers use the dry cistern to move untaxed salt.",
      },
    }),
    knowledge: "heard" as const,
    anchorRefs: ["rec-well"],
    revealedSecretIds: [],
    secretBindings: { truth: "truth-1", eventIds: {} },
  };
  const scenario2 = {
    ...createScenarioState({
      id: "scen-2",
      origin: { kind: "manual", manualId: "m-2" },
      playerVisible: {
        rumour: "The bailiff's ledger is short three sacks of salt.",
        lead: "Bailiff Office",
      },
      gmOnly: {
        truth: "The bailiff takes a cut from the smugglers.",
      },
    }),
    knowledge: "unheard" as const,
    anchorRefs: ["rec-well"],
    revealedSecretIds: [],
    secretBindings: { truth: "truth-2", eventIds: {} },
  };

  return parseAdventureSession({
    schemaVersion: 3,
    id: "adv-eval-1",
    vaultId: "vault-1",
    title: "Evaluation Fixture",
    status: "active",
    createdAt: now,
    updatedAt: now,
    lastPlayedAt: now,
    revision: 1,
    playerCharacter: { kind: "canonical", recordId: "pc-1", name: "Kestrel" },
    premise: "Quiet evening in Oakhaven.",
    sourceRecords: [
      {
        recordId: "pc-1",
        recordType: "character",
        displayName: "Kestrel",
        role: "player-character",
        availability: "available",
      },
      {
        recordId: "rec-well",
        recordType: "location",
        displayName: "Oakhaven Well",
        role: "anchor",
        availability: "available",
      },
    ],
    places: [{ id: "place-1", name: "Oakhaven Square" }],
    currentPlaceId: "place-1",
    people: [
      {
        id: "person-1",
        name: "Bram",
        aliases: [],
        firstSeenTurnId: "turn-0",
      },
    ],
    scenarioCollection: {
      version: 1,
      items: [scenario1, scenario2],
      focusedScenarioId: "scen-1",
    },
    worldTime: { version: 1, elapsedMinutes: 10, events: [] },
    visibleState: {
      objectives: [],
      activeCharacters: [],
      knownFacts: [
        {
          id: "fact-canon-1",
          text: "Oakhaven Well stands in the centre of the square.",
          source: "canonical",
          sourceRecordId: "rec-well",
        },
      ],
      relationships: [],
    },
    hiddenState: {
      secrets: [
        {
          id: "secret-hidden-1",
          text: "CANARY-SILVER-KEY",
          status: "hidden",
        },
      ],
      gmThreads: [{ id: "thread-1", text: "Smuggler watch", status: "hidden" }],
    },
    provisionalFacts: [],
    turns: [],
    pendingRoll: null,
    dicePresets: [],
    resourceCounters: [],
    ...overrides,
  });
}

describe("adventure rubric evaluations", () => {
  it("scores a clean grounded turn 1 across all six rubric dimensions", () => {
    const prev = makeSession();
    const next = makeSession({
      revision: 2,
      worldTime: { version: 1, elapsedMinutes: 25, events: [] },
    });
    const proposal = completeProposal({
      timeAdvance: {
        minutes: 15,
        cause: "Walked around the square",
        developments: [
          { threadId: "thread-1", text: "Lanterns dim near the cistern." },
        ],
      },
    });
    const result = evaluateAdventureTurn(
      {
        narration: proposal.narration,
        playerCharacterName: "Kestrel",
        playerAction: "Inspect the cobblestones around the well.",
        proposal,
        previousSession: prev,
        session: next,
        recap: buildAdventureRecap(next),
        transcript: createPlayerTranscript(next),
      },
      ["CANARY-SILVER-KEY"],
    );

    expect(result.passed).toBe(true);
    expect(result.failures).toEqual([]);
    expect(result.scores).toEqual({
      agency: 1,
      secrecy: 1,
      continuity: 1,
      canonSafety: 1,
      consequenceCredibility: 1,
      unnecessaryEscalation: 1,
    });
  });

  it("detects PC agency violations in narration, setupNarration, and forced commands", () => {
    expect(
      scorePlayerAgency({
        narration: "Kestrel decides to open the iron grate.",
        playerCharacterName: "Kestrel",
        proposal: completeProposal(),
      }),
    ).toBe(0);

    expect(
      scorePlayerAgency({
        narration: "The air smells of damp stone.",
        playerCharacterName: "Kestrel",
        proposal: {
          kind: "roll-required",
          setupNarration: "You must climb down the well immediately.",
          uncertainty: "Can you hold the rope?",
          stakes: "You could slip.",
          sourceRecordIds: [],
        },
      }),
    ).toBe(0);
  });

  it("allows secret text on the turn it is explicitly revealed via revealSecretIds while rejecting unrevealed text", () => {
    const secretText =
      "The damp ledger records a lock fitted to the sluice pin.";
    const before = makeSession({
      hiddenState: {
        secrets: [
          { id: "secret-ledger-lock", text: secretText, status: "hidden" },
        ],
        gmThreads: [],
      },
    });
    const after = makeSession({
      hiddenState: {
        secrets: [
          { id: "secret-ledger-lock", text: secretText, status: "revealed" },
        ],
        gmThreads: [],
      },
    });
    const revealedProposal = completeProposal({
      narration: `You read the page: ${secretText}`,
      revealSecretIds: ["secret-ledger-lock"],
    });
    expect(
      scoreSecrecy({
        narration: revealedProposal.narration,
        proposal: revealedProposal,
        previousSession: before,
        session: after,
      }),
    ).toBe(1);

    const leakedProposal = completeProposal({
      narration: `You read the page: ${secretText}`,
      revealSecretIds: [],
    });
    expect(
      scoreSecrecy({
        narration: leakedProposal.narration,
        proposal: leakedProposal,
        previousSession: before,
        session: before,
      }),
    ).toBe(0);
  });

  it("keeps private causal commitments out of player-facing secrecy scoring", () => {
    const privateSummary =
      "Wick is owed three months of pay and wants a safe road out of the valley.";
    const proposal = completeProposal({
      causalCommitments: [
        {
          kind: "motive",
          commitmentClass: "supporting-explanation",
          subject: "Wick",
          summary: privateSummary,
        },
      ],
    });
    const before = makeSession();

    expect(
      scoreSecrecy({
        narration:
          "Wick keeps his reasons to himself and waits for your reply.",
        proposal,
        previousSession: before,
        gmOnlyLore: [privateSummary],
      }),
    ).toBe(1);

    const leakedProposal = completeProposal({
      narration: `Wick admits it: ${privateSummary}`,
      causalCommitments: proposal.causalCommitments,
    });
    expect(
      scoreSecrecy({
        narration: leakedProposal.narration,
        proposal: leakedProposal,
        previousSession: before,
        gmOnlyLore: [privateSummary],
      }),
    ).toBe(0);
  });

  it("detects secret leakage across narration, recap, transcript, errors, and unheard scenarios", () => {
    const session = makeSession();
    const leakProposal = completeProposal({
      narration:
        "You hear that the bailiff's ledger is short three sacks of salt.",
    });
    expect(
      scoreSecrecy(
        {
          narration: leakProposal.narration,
          proposal: leakProposal,
          previousSession: session,
        },
        ["CANARY-SILVER-KEY"],
      ),
    ).toBe(0);

    expect(
      scoreSecrecy(
        {
          narration: "Nothing unusual happens.",
          proposal: completeProposal(),
          previousSession: session,
          errorMessages: ["Storage error: CANARY-SILVER-KEY"],
        },
        ["CANARY-SILVER-KEY"],
      ),
    ).toBe(0);
  });

  it("detects continuity regressions in worldTime, people, places, and scenario state", () => {
    const prev = makeSession();
    const regressedTime = makeSession({
      worldTime: { version: 1, elapsedMinutes: 5, events: [] },
    });
    expect(
      scoreContinuity({
        narration: "Time slips backward.",
        proposal: completeProposal(),
        previousSession: prev,
        session: regressedTime,
      }),
    ).toBe(0);

    const missingPlace = makeSession({ currentPlaceId: "missing-place" });
    expect(
      scoreContinuity({
        narration: "Lost.",
        proposal: completeProposal(),
        previousSession: prev,
        session: missingPlace,
      }),
    ).toBe(0);

    const lostPerson = makeSession({ people: [] });
    expect(
      scoreContinuity({
        narration: "Bram vanished from history.",
        proposal: completeProposal(),
        previousSession: prev,
        session: lostPerson,
      }),
    ).toBe(0);
  });

  it("detects canon safety violations when duplicating canonical titles or overwriting canonical facts", () => {
    const prev = makeSession();
    const duplicatedTitle = completeProposal({
      provisionalFacts: [
        {
          kind: "place",
          name: "Oakhaven Well",
          summary: "A duplicate well.",
          visibility: "player-visible",
        },
      ],
    });
    const duplicateTurn = {
      narration: "The well stands before you.",
      proposal: duplicatedTitle,
      previousSession: prev,
    };
    expect(scoreCanonSafety(duplicateTurn)).toBe(0);
    expect(canonSafetyFailures(duplicateTurn)).toContain(
      "duplicate-canonical-title",
    );

    const overwrittenFact = makeSession({
      visibleState: {
        objectives: [],
        activeCharacters: [],
        knownFacts: [
          {
            id: "fact-canon-1",
            text: "Overwritten provisional fact.",
            source: "provisional",
          },
        ],
        relationships: [],
      },
    });
    expect(
      scoreCanonSafety({
        narration: "Canon overwritten.",
        proposal: completeProposal(),
        previousSession: prev,
        session: overwrittenFact,
      }),
    ).toBe(0);
  });

  it("requires canonical location and situation facts to reference a source record", () => {
    const prev = makeSession();
    for (const visibleState of [
      {
        ...prev.visibleState,
        location: {
          id: "location-1",
          text: "Oakhaven",
          source: "canonical" as const,
        },
      },
      {
        ...prev.visibleState,
        situation: {
          id: "situation-1",
          text: "Market day",
          source: "canonical" as const,
          sourceRecordId: "missing-record",
        },
      },
    ]) {
      const turn = {
        narration: "The market is busy.",
        proposal: completeProposal(),
        previousSession: prev,
        session: makeSession({ visibleState }),
      };
      expect(scoreCanonSafety(turn)).toBe(0);
      expect(canonSafetyFailures(turn)).toContain(
        "unattributed-canonical-fact",
      );
    }
  });

  it("accepts packageRecordIds and premise for canonical facts in package-backed sessions while rejecting unknown IDs", () => {
    const prev = makeSession({ sourceRecords: [] });
    const packageSession = makeSession({
      sourceRecords: [],
      visibleState: {
        location: {
          id: "location-pkg-1",
          text: "Sunken Priory",
          source: "canonical",
          sourceRecordId: "pkg-loc-1",
        },
        situation: {
          id: "situation-pkg-1",
          text: "Floodwaters rise at dusk.",
          source: "canonical",
          sourceRecordId: "premise",
        },
        knownFacts: [
          {
            id: "fact-pkg-1",
            text: "Sister Vael guards the dry bell tower.",
            source: "canonical",
            sourceRecordId: "pkg-actor-1",
          },
        ],
        activeCharacters: [],
        objectives: [],
        relationships: [],
      },
    });

    expect(
      scoreCanonSafety({
        narration: "Lanternlight glints off the priory steps.",
        proposal: completeProposal(),
        previousSession: prev,
        session: packageSession,
        packageRecordIds: ["pkg-loc-1", "pkg-actor-1"],
      }),
    ).toBe(1);

    const fabricatedSession = makeSession({
      sourceRecords: [],
      visibleState: {
        ...packageSession.visibleState,
        knownFacts: [
          {
            id: "fact-pkg-bad",
            text: "A secret tunnel leads to the duke's vault.",
            source: "canonical",
            sourceRecordId: "fabricated-record-id",
          },
        ],
      },
    });

    expect(
      scoreCanonSafety({
        narration: "You spot a concealed doorway.",
        proposal: completeProposal(),
        previousSession: prev,
        session: fabricatedSession,
        packageRecordIds: ["pkg-loc-1", "pkg-actor-1"],
      }),
    ).toBe(0);

    expect(
      scoreCanonSafety({
        narration: "Premise without packageRecordIds is still rejected.",
        proposal: completeProposal(),
        previousSession: prev,
        session: makeSession({
          sourceRecords: [],
          visibleState: {
            ...prev.visibleState,
            situation: {
              id: "situation-premise",
              text: "Floodwaters rise at dusk.",
              source: "canonical",
              sourceRecordId: "premise",
            },
          },
        }),
      }),
    ).toBe(0);
  });

  it("does not pass an empty run", () => {
    expect(evaluateAdventureRun([]).passed).toBe(false);
  });

  it("detects consequence credibility failures for unknown threads, multi-stage jumps, and same-turn reveal+elaboration", () => {
    const prev = makeSession();
    const unknownThread = completeProposal({
      timeAdvance: {
        minutes: 10,
        cause: "Waiting",
        developments: [{ threadId: "unknown-thread", text: "Ghost event" }],
      },
    });
    const unknownThreadTurn = {
      narration: "You wait.",
      proposal: unknownThread,
      previousSession: prev,
    };
    expect(scoreConsequenceCredibility(unknownThreadTurn)).toBe(0);
    expect(consequenceCredibilityFailures(unknownThreadTurn)).toEqual([
      "invalid-development-thread",
    ]);

    const sameTurnElaborate = completeProposal({
      revealScenarioIds: ["scen-2"],
      elaborateScenarios: [{ scenarioId: "scen-2", stage: "actionable-clue" }],
    });
    const sameTurnElaborateTurn = {
      narration: "Everything happens at once.",
      proposal: sameTurnElaborate,
      previousSession: prev,
    };
    expect(scoreConsequenceCredibility(sameTurnElaborateTurn)).toBe(0);
    expect(consequenceCredibilityFailures(sameTurnElaborateTurn)).toEqual([
      "same-turn-reveal-and-elaboration",
    ]);

    const stageJumpTurn = {
      narration: "A clue appears.",
      proposal: completeProposal({
        elaborateScenarios: [
          { scenarioId: "scen-1", stage: "revelation-crisis" },
        ],
      }),
      previousSession: prev,
    };
    expect(consequenceCredibilityFailures(stageJumpTurn)).toEqual([
      "elaboration-skips-stage",
    ]);

    const unchangedStageTurn = {
      narration: "The bell story remains hearsay.",
      proposal: completeProposal({
        elaborateScenarios: [{ scenarioId: "scen-1", stage: "hearsay" }],
      }),
      previousSession: prev,
    };
    expect(consequenceCredibilityFailures(unchangedStageTurn)).toEqual([
      "elaboration-stage-unchanged",
    ]);

    const unknownElaborationTurn = {
      narration: "A clue appears.",
      proposal: completeProposal({
        elaborateScenarios: [
          { scenarioId: "missing-scenario", stage: "actionable-clue" },
        ],
      }),
      previousSession: prev,
    };
    expect(consequenceCredibilityFailures(unknownElaborationTurn)).toEqual([
      "unknown-elaboration-scenario",
    ]);
  });

  it("flags unnecessary escalation when player declines a lead or acts ordinarily", () => {
    const proposal = completeProposal({
      narration:
        "Suddenly an ambush springs from the alley and you are forced to fight!",
      visiblePatch: {
        ...emptyVisible,
        objectives: {
          add: [{ text: "Defeat the smugglers", source: "provisional" }],
          update: [],
          removeIds: [],
        },
      },
    });
    expect(
      scoreUnnecessaryEscalation({
        narration: proposal.narration,
        playerAction: "I decline the lead and buy bread for supper.",
        proposal,
      }),
    ).toBe(0);
  });

  it("aggregates multi-turn runs and preserves backwards-compatible aggregateScores", () => {
    expect(aggregateScores([])).toBe(1);
    expect(aggregateScores([1, 0, 1, 1])).toBe(0.75);

    const prev = makeSession();
    const run = evaluateAdventureRun([
      {
        narration: "Quiet morning.",
        playerCharacterName: "Kestrel",
        playerAction: "Drink tea at the inn.",
        proposal: completeProposal(),
        previousSession: prev,
        session: prev,
      },
      {
        narration: "Kestrel decides to storm the cistern.",
        playerCharacterName: "Kestrel",
        playerAction: "Look out the window.",
        proposal: completeProposal(),
        previousSession: prev,
        session: prev,
      },
    ]);

    expect(run.passed).toBe(false);
    expect(run.failures).toEqual(["agency"]);
    expect(run.scores.agency).toBe(0.5);
    expect(run.scores.secrecy).toBe(1);
  });
});
