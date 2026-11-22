import { describe, expect, it } from "vitest";
import {
  INVESTIGATIVE_STALL_TURN_LIMIT,
  MAX_PROGRESSION_LOOKBACK_TURNS,
  MULTI_WITNESS_NON_ANSWER_LIMIT,
  buildAdventurePrompt,
  buildGMDirectorBrief,
  classifyTurnProgress,
  createScenarioState,
  investigativeProgressPacing,
  parseAdventureSession,
  type AdventureSession,
  type CommittedAdventureTurn,
  type ScenarioItem,
} from "../src";
import { createLivingSettlementWorldEntrySession } from "./living-settlement-fixture";
import { session as baseSession } from "./reducer-fixtures";

const now = "2026-11-10T12:00:00.000Z";

function emptyPatch() {
  return { add: [], update: [], removeIds: [] };
}

function makeTurn(
  sequence: number,
  playerAction: string,
  narration: string,
  overrides: Partial<CommittedAdventureTurn> = {},
): CommittedAdventureTurn {
  return {
    id: `turn-${sequence}`,
    sequence,
    inputId: `input-${sequence}`,
    playerAction,
    narration,
    visiblePatch: {
      objectives: emptyPatch(),
      activeCharacters: emptyPatch(),
      knownFacts: emptyPatch(),
      relationships: emptyPatch(),
    },
    hiddenPatch: { secrets: emptyPatch(), gmThreads: emptyPatch() },
    revealedSecretIds: [],
    sourceRecordIds: [],
    provisionalFactIds: [],
    committedAt: now,
    ...overrides,
  };
}

function makeScenario(
  id: string,
  overrides: Partial<ScenarioItem> = {},
): ScenarioItem {
  const base = createScenarioState({
    id,
    origin: { kind: "manual", manualId: `manual-${id}` },
    playerVisible: {
      rumour: `Cooper Tams vanished before dawn near ${id}.`,
      lead: `Cooper's Yard (${id})`,
      source: "Harbourmaster Venn",
    },
    gmOnly: {
      truth: `GM-TRUTH-${id}: Venn forged the salt manifest.`,
      ifInvestigated: `GM-INV-${id}: Wax seal beneath the floor.`,
    },
  });
  return {
    ...base,
    knowledge: "heard",
    anchorRefs: [],
    revealedSecretIds: [],
    secretBindings: {
      truth: `truth-${id}`,
      ifInvestigated: `inv-${id}`,
      eventIds: {},
    },
    ...overrides,
  };
}

describe("Turn progression classifier (#5110)", () => {
  it("classifies all 9 TurnProgressKind categories accurately with negative guards", () => {
    // 1. scenario-stage-or-status-change
    const stageTurn = makeTurn(
      0,
      "Check the cooper's yard",
      "You step past the gate.",
    );
    const stageSession = parseAdventureSession({
      ...baseSession(),
      turns: [stageTurn],
      scenarioCollection: {
        version: 1,
        focusedScenarioId: "scen-1",
        items: [
          makeScenario("scen-1", {
            stage: "actionable-clue",
            events: [
              {
                id: "ev-stage",
                kind: "stage-change",
                visibility: "player",
                text: "Escalated to actionable clue.",
                at: now,
                turnId: stageTurn.id,
              },
            ],
          }),
        ],
      },
    });
    expect(classifyTurnProgress(stageTurn, stageSession)).toMatchObject({
      kind: "scenario-stage-or-status-change",
      meaningful: true,
      advancesPursuedThread: true,
    });

    // 2. actionable-discovery (positive: clue provisionalFact + physical evidence; negative: accounting/denial)
    const clueTurn = makeTurn(
      0,
      "Inspect the workshop hearth",
      "You pry up a loose stone and find a burned seal.",
      { provisionalFactIds: ["fact-clue"] },
    );
    const clueSession = parseAdventureSession({
      ...baseSession(),
      turns: [clueTurn],
      provisionalFacts: [
        {
          id: "fact-clue",
          kind: "clue",
          name: "Burned wax seal",
          summary: "Stamped with the harbourmaster's ring.",
          introducedOnTurnId: clueTurn.id,
          visibility: "player-visible",
        },
      ],
    });
    expect(classifyTurnProgress(clueTurn, clueSession)).toMatchObject({
      kind: "actionable-discovery",
      meaningful: true,
    });

    const physicalFactTurn = makeTurn(
      1,
      "Search behind the barrels",
      "Fresh wood shavings and a chalk arrow point toward the slipway.",
      {
        visiblePatch: {
          ...makeTurn(1, "", "").visiblePatch,
          knownFacts: {
            add: [
              {
                id: "kf-phys",
                text: "Found fresh wood shavings and a chalk mark leading to the slipway.",
                source: "provisional",
              },
            ],
            update: [],
            removeIds: [],
          },
        },
      },
    );
    expect(
      classifyTurnProgress(physicalFactTurn, {
        ...baseSession(),
        turns: [physicalFactTurn],
      }),
    ).toMatchObject({ kind: "actionable-discovery", meaningful: true });

    // Negative: witness denial restatement & debt accounting line must NOT score as discovery
    const denialFactTurn = makeTurn(
      2,
      "Ask the clerk who lent the coin",
      "The clerk says he cannot name any creditor from the ledger.",
      {
        visiblePatch: {
          ...makeTurn(2, "", "").visiblePatch,
          knownFacts: {
            add: [
              {
                id: "kf-denial",
                text: "Ledger entry 14: Bram owes 12 silver; the clerk cannot name the creditor.",
                source: "provisional",
              },
            ],
            update: [],
            removeIds: [],
          },
        },
      },
    );
    expect(
      classifyTurnProgress(denialFactTurn, {
        ...baseSession(),
        turns: [denialFactTurn],
      }),
    ).toMatchObject({
      kind: "repeated-non-answer",
      meaningful: false,
      nonAnswer: true,
    });

    // 3. obstacle-advanced-or-resolved
    const rollTurn = makeTurn(
      0,
      "Force the padlocked gate",
      "The iron hasp snaps.",
      {
        resolvedRoll: {
          expression: "1d20",
          outcome: { kind: "numeric", value: 16, label: "Success" },
        },
      },
    );
    expect(
      classifyTurnProgress(rollTurn, { ...baseSession(), turns: [rollTurn] }),
    ).toMatchObject({
      kind: "obstacle-advanced-or-resolved",
      meaningful: true,
    });

    // 4. causal-state-change (distinct situation, relationship disposition, worldTime event)
    const sitTurn = makeTurn(
      0,
      "Watch the gate",
      "Guards arrive to seal the alley.",
      {
        visiblePatch: {
          ...makeTurn(0, "", "").visiblePatch,
          situation: {
            id: "sit-1",
            text: "Harbour guards sealed the cooper's alley.",
            source: "provisional",
          },
        },
      },
    );
    expect(
      classifyTurnProgress(sitTurn, { ...baseSession(), turns: [sitTurn] }),
    ).toMatchObject({ kind: "causal-state-change", meaningful: true });

    // Negative: repeating identical situation text is NOT a distinct causal-state-change
    const repeatSitTurn = makeTurn(
      1,
      "Keep watching",
      "Guards stand by the seal.",
      {
        visiblePatch: {
          ...makeTurn(1, "", "").visiblePatch,
          situation: {
            id: "sit-1",
            text: "Harbour guards sealed the cooper's alley.",
            source: "provisional",
          },
        },
      },
    );
    expect(
      classifyTurnProgress(repeatSitTurn, {
        ...baseSession(),
        turns: [sitTurn, repeatSitTurn],
      }),
    ).toMatchObject({ kind: "ordinary-interaction", meaningful: false });

    // 5. consequential-player-choice (new unvisited location without non-answer)
    const travelTurn = makeTurn(
      0,
      "Walk to the Slipway Boathouse",
      "Tar and wet timber greet you at the boathouse.",
      {
        visiblePatch: {
          ...makeTurn(0, "", "").visiblePatch,
          location: {
            id: "loc-boathouse",
            text: "Slipway Boathouse",
            source: "provisional",
          },
        },
      },
    );
    expect(
      classifyTurnProgress(travelTurn, {
        ...baseSession(),
        turns: [travelTurn],
      }),
    ).toMatchObject({
      kind: "consequential-player-choice",
      meaningful: true,
    });

    // 6. useful-negative-finding (once per distinct target)
    const negTurn1 = makeTurn(
      0,
      "Search the cooper's lockbox for ledgers",
      "You lift the lid; the box holds only dry oak shavings.",
      {
        visiblePatch: {
          ...makeTurn(0, "", "").visiblePatch,
          knownFacts: {
            add: [
              {
                id: "kf-neg-1",
                text: "The cooper's lockbox is empty and contains no ledger.",
                source: "provisional",
              },
            ],
            update: [],
            removeIds: [],
          },
        },
      },
    );
    expect(
      classifyTurnProgress(negTurn1, { ...baseSession(), turns: [negTurn1] }),
    ).toMatchObject({ kind: "useful-negative-finding", meaningful: true });

    const negTurnRepeat = makeTurn(
      1,
      "Inspect the cooper's lockbox again",
      "Nothing inside has changed.",
      {
        visiblePatch: {
          ...makeTurn(1, "", "").visiblePatch,
          knownFacts: {
            add: [
              {
                id: "kf-neg-2",
                text: "The cooper's lockbox remains empty with no ledger.",
                source: "provisional",
              },
            ],
            update: [],
            removeIds: [],
          },
        },
      },
    );
    expect(
      classifyTurnProgress(negTurnRepeat, {
        ...baseSession(),
        turns: [negTurn1, negTurnRepeat],
      }),
    ).toMatchObject({ kind: "ordinary-interaction", meaningful: false });

    // 7. repeated-non-answer
    const nonAnsTurn = makeTurn(
      0,
      "Ask the dockhand who owns the boat?",
      "He shrugs and says he doesn't know who owns it.",
    );
    expect(
      classifyTurnProgress(nonAnsTurn, {
        ...baseSession(),
        turns: [nonAnsTurn],
      }),
    ).toMatchObject({
      kind: "repeated-non-answer",
      meaningful: false,
      nonAnswer: true,
    });

    // 8. ordinary-interaction (NPC intro, long sensory prose, accounting fact, person provisionalFact)
    const ordinaryTurn = makeTurn(
      0,
      "Greet the baker and watch the tide",
      "Salt spray glints on the cobbles as gulls wheel overhead. ".repeat(12),
      {
        provisionalFactIds: ["fact-person"],
        visiblePatch: {
          ...makeTurn(0, "", "").visiblePatch,
          activeCharacters: {
            add: [
              { id: "npc-baker", text: "Baker Olin", source: "provisional" },
            ],
            update: [],
            removeIds: [],
          },
          knownFacts: {
            add: [
              {
                id: "kf-acct",
                text: "Olin's bread tally lists 18 copper paid for rye flour.",
                source: "provisional",
              },
            ],
            update: [],
            removeIds: [],
          },
        },
      },
    );
    expect(
      classifyTurnProgress(ordinaryTurn, {
        ...baseSession(),
        turns: [ordinaryTurn],
        provisionalFacts: [
          {
            id: "fact-person",
            kind: "person",
            name: "Baker Olin",
            summary: "Runs the quay bakery.",
            introducedOnTurnId: ordinaryTurn.id,
            visibility: "player-visible",
          },
        ],
      }),
    ).toMatchObject({ kind: "ordinary-interaction", meaningful: false });

    // 9. no-observable-change (bare timeAdvance wait or empty quiet turn)
    const quietWait = makeTurn(
      0,
      "Wait by the harbour post",
      "An hour passes.",
      {
        timeAdvance: { minutes: 60, cause: "Waiting" },
      },
    );
    expect(
      classifyTurnProgress(quietWait, { ...baseSession(), turns: [quietWait] }),
    ).toMatchObject({ kind: "no-observable-change", meaningful: false });
  });

  it("scores 77-turn ledger/interview churn as non-advancing and resets on physical clue or causal change", () => {
    const scen = makeScenario("scen-cooper", {
      playerVisible: {
        rumour: "Cooper Tams has vanished from his yard.",
        lead: "Cooper's Yard",
        source: "Ferryman",
      },
    });

    const churnTurns = Array.from({ length: 77 }, (_, idx) =>
      makeTurn(
        idx,
        `Ask witness ${idx + 1} about the cooper's yard debt tally?`,
        `Witness ${idx + 1} shakes their head: "I don't know who holds debt #${idx + 1}."`,
        {
          visiblePatch: {
            ...makeTurn(idx, "", "").visiblePatch,
            activeCharacters: {
              add: [
                {
                  id: `npc-${idx}`,
                  text: `Witness ${idx + 1}`,
                  source: "provisional",
                },
              ],
              update: [],
              removeIds: [],
            },
            knownFacts: {
              add: [
                {
                  id: `acct-${idx}`,
                  text: `Ledger tally ${idx + 1}: owes ${idx + 3} silver to an unnamed creditor.`,
                  source: "provisional",
                },
              ],
              update: [],
              removeIds: [],
            },
          },
        },
      ),
    );

    const churnSession = parseAdventureSession({
      ...baseSession(),
      turns: churnTurns,
      scenarioCollection: {
        version: 1,
        focusedScenarioId: "scen-cooper",
        items: [scen],
      },
    });

    const pacing = investigativeProgressPacing(
      churnSession,
      "Ask the next clerk about the cooper's yard debt",
    );
    expect(INVESTIGATIVE_STALL_TURN_LIMIT).toBe(4);
    expect(MAX_PROGRESSION_LOOKBACK_TURNS).toBe(128);
    expect(pacing).toMatchObject({
      active: true,
      turnsWithoutAdvancement: 77,
      repeatedNonAnswerTurns: 77,
      stalled: true,
      recoveryDue: true,
    });

    // Committing a real physical clue resets stall count to 0.
    const clueTurn = makeTurn(
      77,
      "Pry loose the hearthstone in Cooper's Yard",
      "You uncover a stamped wax seal and bloodstained chisel.",
      { provisionalFactIds: ["fact-real-clue"] },
    );
    const recoveredSession = parseAdventureSession({
      ...churnSession,
      turns: [...churnTurns, clueTurn],
      provisionalFacts: [
        {
          id: "fact-real-clue",
          kind: "clue",
          name: "Stamped seal and chisel",
          summary: "Hidden beneath Cooper's hearthstone.",
          introducedOnTurnId: clueTurn.id,
          visibility: "player-visible",
          scenarioId: "scen-cooper",
        },
      ],
    });
    expect(
      classifyTurnProgress(clueTurn, recoveredSession, {
        pursuedScenario: scen,
      }),
    ).toMatchObject({
      kind: "actionable-discovery",
      meaningful: true,
      advancesPursuedThread: true,
    });
    expect(
      investigativeProgressPacing(
        recoveredSession,
        "Examine the stamped seal at Cooper's Yard",
      ),
    ).toMatchObject({
      turnsWithoutAdvancement: 0,
      repeatedNonAnswerTurns: 0,
      stalled: false,
      recoveryDue: false,
    });
  });

  it("detects 3+ multi-witness non-answers across witnesses, locations, phrasings, and low-value details", () => {
    const turns = [
      makeTurn(
        0,
        "Ask the ferryman at the quay who took the cooper's ledger?",
        'The ferryman mutters: "I don\'t know who took it; ask at the weighhouse."',
        {
          visiblePatch: {
            ...makeTurn(0, "", "").visiblePatch,
            location: {
              id: "l1",
              text: "Brackwater Quay",
              source: "provisional",
            },
            activeCharacters: {
              add: [{ id: "a1", text: "Ferryman", source: "provisional" }],
              update: [],
              removeIds: [],
            },
          },
        },
      ),
      makeTurn(
        1,
        "Question the clerk at the weighhouse about the cooper's ledger",
        'The clerk flips a page. "There is no record here, and I cannot name the creditor."',
        {
          visiblePatch: {
            ...makeTurn(1, "", "").visiblePatch,
            location: {
              id: "l2",
              text: "North Weighhouse",
              source: "provisional",
            },
            knownFacts: {
              add: [
                {
                  id: "f1",
                  text: "Weighhouse tally lists 9 bushels unpaid.",
                  source: "provisional",
                },
              ],
              update: [],
              removeIds: [],
            },
          },
        },
      ),
      makeTurn(
        2,
        "Speak with the sexton at the chapel about the cooper's ledger",
        'The sexton shakes his head. "I have never heard of that book and won\'t guess."',
        {
          visiblePatch: {
            ...makeTurn(2, "", "").visiblePatch,
            location: { id: "l3", text: "Chapel Steps", source: "provisional" },
          },
          timeAdvance: { minutes: 25, cause: "Walking to chapel" },
        },
      ),
    ];

    const s = parseAdventureSession({
      ...baseSession(),
      turns,
      scenarioCollection: {
        version: 1,
        focusedScenarioId: "scen-ledger",
        items: [
          makeScenario("scen-ledger", {
            playerVisible: {
              rumour: "The cooper's ledger vanished from the yard.",
              lead: "Cooper's Yard",
              source: "Ferryman",
            },
          }),
        ],
      },
    });

    const pacing = investigativeProgressPacing(
      s,
      "Ask the watchman at the gate about the cooper's ledger",
    );
    expect(MULTI_WITNESS_NON_ANSWER_LIMIT).toBe(3);
    expect(pacing).toMatchObject({
      active: true,
      turnsWithoutAdvancement: 3,
      repeatedNonAnswerTurns: 3,
      stalled: true,
      recoveryDue: true,
    });

    const prompt = buildAdventurePrompt({
      session: s,
      phase: "action",
      playerAction: "Ask the watchman at the gate about the cooper's ledger",
      anchors: [],
      relevant: [],
    });
    expect(prompt.behavior).toContain("INVESTIGATIVE STALL RECOVERY:");
    expect(prompt.behavior).toContain("Preserve witness knowledge limits");
    expect(prompt.behavior).not.toContain("GM-TRUTH-scen-ledger");
  });

  it("ignores unrelated chatter and Scenario B events sharing an actor without resetting Scenario A stall", () => {
    const s = createLivingSettlementWorldEntrySession();
    // Make scen-grain-shortage (Scenario B, shares Harbourmaster Venn) heard too.
    const scenA = s.scenarioCollection!.items.find(
      (i) => i.id === "scen-missing-cooper",
    )!;
    const scenB = s.scenarioCollection!.items.find(
      (i) => i.id === "scen-grain-shortage",
    )!;
    scenB.knowledge = "heard";
    s.scenarioCollection!.focusedScenarioId = scenA.id;

    const turns: CommittedAdventureTurn[] = [
      makeTurn(
        0,
        "Ask about Cooper Tams at Cooper's Yard?",
        "The ferryman says he doesn't know where Tams went.",
      ),
      makeTurn(
        1,
        "Ask about Cooper's Yard workshop?",
        "A dockhand says he cannot say why the yard is shut.",
      ),
      // Unrelated chatter
      makeTurn(
        2,
        "Order roasted turnips and chat with the baker about rain",
        "The baker laughs and serves hot turnips.",
      ),
      // Scenario B discovery involving shared actor Harbourmaster Venn
      makeTurn(
        3,
        "Ask Harbourmaster Venn about the half-weight flour sacks",
        "Venn admits the flour sacks were short-weighted at his weighhouse.",
        { provisionalFactIds: ["fact-grain-clue"] },
      ),
      makeTurn(
        4,
        "Question the sexton about Cooper Tams?",
        "The sexton says he has no idea where Tams went.",
      ),
    ];
    scenB.events.push({
      id: "ev-grain-1",
      kind: "discovery",
      visibility: "player",
      text: "Harbourmaster Venn short-weighted flour sacks.",
      at: now,
      turnId: turns[3]!.id,
    });

    const updated = parseAdventureSession({
      ...s,
      turns,
      provisionalFacts: [
        {
          id: "fact-grain-clue",
          kind: "clue",
          name: "Short-weight flour tally",
          summary: "Harbourmaster Venn weighed the sacks.",
          introducedOnTurnId: turns[3]!.id,
          visibility: "player-visible",
          scenarioId: scenB.id,
        },
      ],
    });

    const pacing = investigativeProgressPacing(
      updated,
      "Inspect the alley behind Cooper's Yard",
      { pursuedScenario: scenA },
    );
    // Turns 0, 1, 4 engaged Scenario A (3 non-answers); turn 2 (chatter) and turn 3 (Scenario B) were skipped!
    expect(pacing).toMatchObject({
      active: true,
      turnsWithoutAdvancement: 3,
      repeatedNonAnswerTurns: 3,
      stalled: true,
      recoveryDue: true,
    });
  });

  it("keeps #5080 waiting-only STALLED SCENE intact, treats worldTime.events as causal-state-change, and distinguishes non-answer travel from new-lead travel", () => {
    const base = createLivingSettlementWorldEntrySession();
    base.scenarioCollection!.focusedScenarioId = "scen-missing-cooper";

    // 4 waiting-only turns keep #5080 STALLED SCENE active instead of firing investigative recovery
    const waitTurns = Array.from({ length: 4 }, (_, idx) =>
      makeTurn(idx, "Wait another day", "The tide rises and falls.", {
        timeAdvance: { minutes: 1440, cause: "Waiting" },
      }),
    );
    const waitingSession = parseAdventureSession({ ...base, turns: waitTurns });
    const waitPrompt = buildAdventurePrompt({
      session: waitingSession,
      phase: "action",
      playerAction: "Wait another day",
      anchors: [],
      relevant: [],
    });
    expect(waitPrompt.behavior).toContain("STALLED SCENE:");
    expect(waitPrompt.behavior).toContain("4d of fictional time");
    expect(waitPrompt.behavior).not.toContain("INVESTIGATIVE STALL RECOVERY:");

    // worldTime.events linked to turn counts as causal-state-change
    const clockTurn = makeTurn(0, "Watch the gate", "A lock clicks at dusk.");
    const clockSession = parseAdventureSession({
      ...base,
      turns: [clockTurn],
      worldTime: {
        version: 1,
        elapsedMinutes: 240,
        events: [
          {
            id: "wt-1",
            turnId: clockTurn.id,
            atMinute: 240,
            threadId: "scen-missing-cooper",
            text: "Venn padlocked Cooper's Yard.",
          },
        ],
      },
    });
    expect(
      classifyTurnProgress(clockTurn, clockSession, {
        pursuedScenario: base.scenarioCollection!.items[0],
      }),
    ).toMatchObject({
      kind: "causal-state-change",
      meaningful: true,
      advancesPursuedThread: true,
    });

    // Travel to a new lead location without non-answer counts cleanly; with non-answer does not
    const goodTravel = makeTurn(
      0,
      "Walk to Cooper's Yard by Brackwater Quay",
      "You arrive at the timber gate of Cooper's Yard.",
      {
        visiblePatch: {
          ...makeTurn(0, "", "").visiblePatch,
          location: {
            id: "l-yard",
            text: "Cooper's Yard",
            source: "provisional",
          },
        },
      },
    );
    expect(
      classifyTurnProgress(
        goodTravel,
        { ...base, turns: [goodTravel] },
        {
          pursuedScenario: base.scenarioCollection!.items[0],
        },
      ),
    ).toMatchObject({
      kind: "consequential-player-choice",
      meaningful: true,
      advancesPursuedThread: true,
    });
  });

  it("ignores claimed package events, counts confirmed package clues, and never matches or leaks gmOnly text", () => {
    const claimedTurn = makeTurn(
      0,
      "Ask Maren about the cellar key",
      "Maren claims the key is in the millhouse.",
    );
    const pkgSession: AdventureSession = {
      ...baseSession(),
      sourcePackage: {
        packageId: "pkg-1",
        version: "1.0.0",
        formatVersion: "1",
        hash: "a".repeat(64),
      },
      packageProgress: {
        version: 1,
        sceneId: "scene-1",
        records: [{ id: "clue-key", kind: "clue", status: "available" }],
        events: [
          {
            id: "ev-claimed",
            turnId: claimedTurn.id,
            recordId: "clue-key",
            kind: "clue",
            from: "unvisited",
            to: "available",
            certainty: "claimed",
            note: "Maren claims the key is in the millhouse.",
          },
        ],
      },
      turns: [claimedTurn],
    };
    expect(classifyTurnProgress(claimedTurn, pkgSession)).toMatchObject({
      kind: "no-observable-change",
      meaningful: false,
    });

    const confirmedSession: AdventureSession = {
      ...pkgSession,
      packageProgress: {
        ...pkgSession.packageProgress!,
        events: [
          {
            ...pkgSession.packageProgress!.events![0]!,
            certainty: "confirmed",
          },
        ],
      },
    };
    expect(classifyTurnProgress(claimedTurn, confirmedSession)).toMatchObject({
      kind: "actionable-discovery",
      meaningful: true,
    });

    // Unrevealed gmOnly canary must never influence thread matching or leak into pacing/prompts
    const secretScen = makeScenario("scen-secret", {
      playerVisible: {
        rumour: "The mill wheel groans at night.",
        lead: "Old Mill",
      },
      gmOnly: {
        truth:
          "CANARY-OBSIDIAN-RELIC: Baron Vaelor hides relics under the weir.",
      },
    });
    const secretTurns = Array.from({ length: 4 }, (_, idx) =>
      makeTurn(
        idx,
        "Ask about Baron Vaelor and the obsidian relic?",
        "Nobody here knows anything about Baron Vaelor.",
      ),
    );
    const secretSession = parseAdventureSession({
      ...baseSession(),
      turns: secretTurns,
      scenarioCollection: {
        version: 1,
        focusedScenarioId: null,
        items: [secretScen],
      },
    });
    // Discovery citing only gmOnly tokens must not match pursuedScenario scope.
    const gmOnlyFactTurn = makeTurn(
      4,
      "Inspect the weir",
      "You spot a mark on the stone.",
      {
        visiblePatch: {
          ...makeTurn(4, "", "").visiblePatch,
          knownFacts: {
            add: [
              {
                id: "f-gm-only-token",
                text: "Baron Vaelor left an obsidian relic mark.",
                source: "provisional",
              },
            ],
            update: [],
            removeIds: [],
          },
        },
      },
    );
    expect(
      classifyTurnProgress(gmOnlyFactTurn, secretSession, {
        pursuedScenario: secretScen,
      }).advancesPursuedThread,
    ).toBe(false);
    // And inquiries citing only gmOnly tokens must not be treated as scoped turns on secretScen.
    expect(
      investigativeProgressPacing(secretSession, undefined, {
        pursuedScenario: secretScen,
      })?.turnsWithoutAdvancement,
    ).toBe(0);
    const prompt = buildAdventurePrompt({
      session: secretSession,
      phase: "action",
      playerAction: "Ask about Baron Vaelor",
      anchors: [],
      relevant: [],
    });
    expect(prompt.behavior).not.toContain("CANARY-OBSIDIAN-RELIC");
  });

  it("suppresses recovery on peaceful roleplay, legitimate silence, disengagement, deliberate repeats, and pending rolls", () => {
    const peacefulTurns = [
      makeTurn(
        0,
        "Order a mug of spiced cider",
        "The innkeeper pours a steaming mug.",
      ),
      makeTurn(
        1,
        "Warm your hands by the hearth",
        "Cedar logs crackle softly.",
      ),
      makeTurn(
        2,
        "Listen to the fiddler play",
        "A gentle reel fills the taproom.",
      ),
      makeTurn(
        3,
        "Chat with the baker about harvest bread",
        "He praises this autumn's wheat.",
        {
          visiblePatch: {
            ...makeTurn(3, "", "").visiblePatch,
            activeCharacters: {
              add: [
                { id: "baker-1", text: "Baker Olin", source: "provisional" },
              ],
              update: [],
              removeIds: [],
            },
          },
        },
      ),
    ];
    const peaceful = parseAdventureSession({
      ...baseSession(),
      turns: peacefulTurns,
    });
    expect(
      investigativeProgressPacing(peaceful, "Order a slice of cheese"),
    ).toBeUndefined();
    const peacefulPrompt = buildAdventurePrompt({
      session: peaceful,
      phase: "action",
      playerAction: "Order a slice of cheese",
      anchors: [],
      relevant: [],
    });
    expect(peacefulPrompt.behavior).not.toContain(
      "INVESTIGATIVE STALL RECOVERY",
    );
    expect(peacefulPrompt.behavior).not.toContain("STALLED SCENE");

    // Stalled scenario session suppresses recovery on silence, disengagement, deliberate repeat, and pendingRoll
    const stalledTurns = Array.from({ length: 4 }, (_, idx) =>
      makeTurn(
        idx,
        `Ask witness ${idx + 1} about Cooper Tams?`,
        `Witness ${idx + 1} says they don't know.`,
      ),
    );
    const stalled = parseAdventureSession({
      ...baseSession(),
      turns: stalledTurns,
      scenarioCollection: {
        version: 1,
        focusedScenarioId: "scen-cooper",
        items: [makeScenario("scen-cooper")],
      },
    });

    expect(
      investigativeProgressPacing(stalled, "Stay quiet and watch the quay"),
    ).toBeUndefined();
    expect(
      investigativeProgressPacing(stalled, "Say nothing and sit quietly"),
    ).toBeUndefined();
    expect(
      investigativeProgressPacing(
        stalled,
        "Never mind, walk away and head home",
      ),
    ).toBeUndefined();
    expect(
      investigativeProgressPacing(stalled, "Repeat the same question again"),
    ).toBeUndefined();
    expect(
      investigativeProgressPacing({
        ...stalled,
        pendingRoll: {
          id: "roll-1",
          inputId: "in-1",
          playerAction: "Climb the wall",
          uncertainty: "Can you scale it?",
          stakes: "You might fall.",
          resolutionStatus: "awaiting-outcome",
          createdAt: now,
        },
      }),
    ).toBeUndefined();
  });

  it("rejects non-denial receipt/manifest/note accounting lines while accepting negated physical evidence and travel", () => {
    for (const accountingText of [
      "Receipt #4: Bram paid 12 silver for salt.",
      "Harbour manifest lists 40 sacks of barley landed.",
      "Ledger note: 8 copper owed to the weighhouse.",
    ]) {
      const acctTurn = makeTurn(
        0,
        "Check the clerk's papers",
        "You scan the routine ledger figures.",
        {
          visiblePatch: {
            ...makeTurn(0, "", "").visiblePatch,
            knownFacts: {
              add: [
                { id: "kf-a", text: accountingText, source: "provisional" },
              ],
              update: [],
              removeIds: [],
            },
          },
        },
      );
      expect(
        classifyTurnProgress(acctTurn, { ...baseSession(), turns: [acctTurn] }),
      ).toMatchObject({ kind: "ordinary-interaction", meaningful: false });
    }

    const negatedSealTurn = makeTurn(
      0,
      "Inspect the hearthstone",
      "The mortar isn't dry; beneath the stone is a wax seal.",
      {
        visiblePatch: {
          ...makeTurn(0, "", "").visiblePatch,
          knownFacts: {
            add: [
              {
                id: "kf-seal",
                text: "A wax seal lies beneath the loose hearthstone.",
                source: "provisional",
              },
            ],
            update: [],
            removeIds: [],
          },
        },
      },
    );
    expect(
      classifyTurnProgress(negatedSealTurn, {
        ...baseSession(),
        turns: [negatedSealTurn],
      }),
    ).toMatchObject({ kind: "actionable-discovery", meaningful: true });

    const negatedTravelTurn = makeTurn(
      1,
      "Walk into the Old Bell Tower",
      "The door is not locked; dust coats the narrow stairs.",
      {
        visiblePatch: {
          ...makeTurn(1, "", "").visiblePatch,
          location: {
            id: "loc-bell",
            text: "Old Bell Tower",
            source: "provisional",
          },
        },
      },
    );
    expect(
      classifyTurnProgress(negatedTravelTurn, {
        ...baseSession(),
        turns: [negatedSealTurn, negatedTravelTurn],
      }),
    ).toMatchObject({ kind: "consequential-player-choice", meaningful: true });
  });

  it("does not fire investigative recovery on friendly Q&A with visibleState.situation set", () => {
    const friendlyTurns = [
      makeTurn(
        0,
        "Ask the baker what bread is fresh?",
        "He smiles and shows you rye loaves.",
        {
          visiblePatch: {
            ...makeTurn(0, "", "").visiblePatch,
            activeCharacters: {
              add: [{ id: "c-1", text: "Baker Olin", source: "provisional" }],
              update: [],
              removeIds: [],
            },
          },
        },
      ),
      makeTurn(
        1,
        "Ask the innkeeper how the stew tastes?",
        "She laughs and ladles out spiced mutton.",
      ),
      makeTurn(
        2,
        "Ask the fiddler what tune he is playing?",
        "He grins and names an old harvest reel.",
      ),
      makeTurn(
        3,
        "Ask the fisher if the tide is calm?",
        "He nods toward the glassy bay.",
      ),
    ];
    const s = parseAdventureSession({
      ...baseSession(),
      visibleState: {
        ...baseSession().visibleState,
        situation: {
          id: "sit-market",
          text: "Morning market along the quay",
          source: "provisional",
        },
      },
      turns: friendlyTurns,
    });
    const pacing = investigativeProgressPacing(
      s,
      "Ask the potter about her glazes?",
    );
    expect(pacing).toMatchObject({
      turnsWithoutAdvancement: 0,
      repeatedNonAnswerTurns: 0,
      stalled: false,
      recoveryDue: false,
    });
    const prompt = buildAdventurePrompt({
      session: s,
      phase: "action",
      playerAction: "Ask the potter about her glazes?",
      anchors: [],
      relevant: [],
    });
    expect(prompt.behavior).not.toContain("INVESTIGATIVE STALL RECOVERY:");
  });

  it("isolates ambient location/pronoun chatter, background worldTime ticks, hidden GM events, initial visibleState baselines, and committed disengagement", () => {
    const living = createLivingSettlementWorldEntrySession();
    const scenA = living.scenarioCollection!.items.find(
      (i) => i.id === "scen-missing-cooper",
    )!;
    const scenB = living.scenarioCollection!.items.find(
      (i) => i.id === "scen-grain-shortage",
    )!;
    scenB.knowledge = "heard";
    living.scenarioCollection!.focusedScenarioId = scenA.id;

    // 1. Ambient location ("Brackwater Quay"), pronouns ("his", "two"), and background worldTime tick must not advance/mask Scenario A.
    const t0 = makeTurn(
      0,
      "Ask the ferryman about Cooper Tams?",
      "I don't know where Tams went.",
    );
    const t1 = makeTurn(
      1,
      "Question the baker at Brackwater Quay about Cooper Tams?",
      "I cannot say where Tams went.",
    );
    const ambientChatter = makeTurn(
      2,
      "Chat with a sailor on Brackwater Quay about his two old boots",
      "He laughs and taps his worn heels on the quay planks.",
    );
    const t3 = makeTurn(
      3,
      "Speak with the dockhand about Cooper Tams?",
      "I have no idea where he went.",
    );
    // Hidden GM event on Scenario B must NOT block an unscoped discovery on Scenario A.
    scenB.events.push({
      id: "ev-b-gm",
      kind: "consequence",
      visibility: "gm",
      text: "GM-only grain event",
      at: now,
      turnId: "turn-4-discovery",
    });
    scenB.secretBindings.eventIds["ev-b-gm"] = "sec-ev-b-gm";
    const t4Discovery = makeTurn(
      4,
      "Search behind Cooper Tams's shed",
      "You spot muddy bootprints leading toward the slipway.",
      {
        id: "turn-4-discovery",
        visiblePatch: {
          ...makeTurn(4, "", "").visiblePatch,
          knownFacts: {
            add: [
              {
                id: "kf-boot",
                text: "Found muddy bootprints behind the shed.",
                source: "provisional",
              },
            ],
            update: [],
            removeIds: [],
          },
        },
      },
    );

    const withClockTick = parseAdventureSession({
      ...living,
      turns: [t0, t1, ambientChatter, t3],
      worldTime: {
        version: 1,
        elapsedMinutes: 30,
        events: [
          {
            id: "wt-bg",
            turnId: t1.id,
            atMinute: 30,
            threadId: "thread-quay-tide",
            text: "The quay tide rises.",
          },
        ],
      },
    });
    expect(
      classifyTurnProgress(t1, withClockTick, { pursuedScenario: scenA }),
    ).toMatchObject({
      kind: "causal-state-change",
      advancesPursuedThread: false,
      nonAnswer: true,
    });
    expect(
      investigativeProgressPacing(
        withClockTick,
        "Ask the watchman about Cooper Tams",
        { pursuedScenario: scenA },
      ),
    ).toMatchObject({
      turnsWithoutAdvancement: 3,
      repeatedNonAnswerTurns: 3,
      stalled: true,
      recoveryDue: true,
    });

    // Unscoped discovery on t4 advances Scenario A despite hidden GM event on Scenario B.
    expect(
      classifyTurnProgress(
        t4Discovery,
        { ...withClockTick, turns: [t0, t1, ambientChatter, t3, t4Discovery] },
        { pursuedScenario: scenA },
      ),
    ).toMatchObject({
      kind: "actionable-discovery",
      advancesPursuedThread: true,
    });

    // Prior turn baseline prevents turn-1 re-emissions of identical location/situation/disposition from scoring as meaningful progress.
    const seedTurn = makeTurn(
      0,
      "Arrive at the square",
      "Morning mist lingers.",
      {
        visiblePatch: {
          ...makeTurn(0, "", "").visiblePatch,
          location: {
            id: "loc-init-0",
            text: "Harbour Square",
            source: "provisional",
          },
          situation: {
            id: "sit-init-0",
            text: "Quiet morning",
            source: "provisional",
          },
          relationships: {
            add: [
              {
                id: "rel-init-0",
                subjectId: "npc-venn",
                text: "Venn",
                disposition: "wary",
                source: "provisional",
              },
            ],
            update: [],
            removeIds: [],
          },
        },
      },
    );
    const reEmitTurn = makeTurn(
      1,
      "Look around",
      "Everything looks unchanged.",
      {
        visiblePatch: {
          ...makeTurn(1, "", "").visiblePatch,
          location: {
            id: "loc-init-1",
            text: "Harbour Square",
            source: "provisional",
          },
          situation: {
            id: "sit-init-1",
            text: "Quiet morning",
            source: "provisional",
          },
          relationships: {
            add: [],
            update: [
              {
                id: "rel-init-0",
                subjectId: "npc-venn",
                text: "Venn",
                disposition: "wary",
                source: "provisional",
              },
            ],
            removeIds: [],
          },
        },
      },
    );
    const initSession = parseAdventureSession({
      ...baseSession(),
      visibleState: {
        location: {
          id: "loc-init-1",
          text: "Harbour Square",
          source: "provisional",
        },
        situation: {
          id: "sit-init-1",
          text: "Quiet morning",
          source: "provisional",
        },
        objectives: [],
        activeCharacters: [],
        knownFacts: [],
        relationships: [
          {
            id: "rel-init-0",
            subjectId: "npc-venn",
            text: "Venn",
            disposition: "wary",
            source: "provisional",
          },
        ],
      },
      turns: [seedTurn, reEmitTurn],
    });
    expect(classifyTurnProgress(reEmitTurn, initSession)).toMatchObject({
      kind: "ordinary-interaction",
      meaningful: false,
    });

    // Committed disengagement turn breaks backward stall scan even without repeating scenario tokens.
    const disengagedTurn = makeTurn(
      4,
      "Never mind, walk away",
      "You leave the quay behind.",
    );
    const postDisengage = parseAdventureSession({
      ...withClockTick,
      turns: [t0, t1, ambientChatter, t3, disengagedTurn],
    });
    expect(investigativeProgressPacing(postDisengage)).toMatchObject({
      turnsWithoutAdvancement: 0,
      repeatedNonAnswerTurns: 0,
      stalled: false,
      recoveryDue: false,
    });
  });

  it("handles peaceful contractions, abandoned scenarios, #5083 topic switches, advancing waits, negative findings, canonical subjects, gm-only events, ping-pong travel, actor events, and recovery angles", () => {
    // 1. Peaceful non-inquiry turns with contractions must not set nonAnswer: true or trigger recovery.
    const negatedPeaceful = [
      makeTurn(
        0,
        "Warm hands by the hearth",
        "The fire isn't hot yet, and the innkeeper doesn't rush.",
      ),
      makeTurn(
        1,
        "Pour two mugs of cider",
        "The cider won't chill quickly, though nobody seems hurried.",
      ),
      makeTurn(
        2,
        "Listen to the rain",
        "The storm didn't rattle the shutters much.",
      ),
    ];
    for (const t of negatedPeaceful) {
      expect(
        classifyTurnProgress(
          t,
          parseAdventureSession({ ...baseSession(), turns: negatedPeaceful }),
        ).nonAnswer,
      ).toBe(false);
    }
    const peacefulBrief = buildGMDirectorBrief({
      session: parseAdventureSession({
        ...baseSession(),
        turns: negatedPeaceful,
      }),
      phase: "action",
      playerAction: "Ask the baker what bread is fresh?",
    });
    expect(peacefulBrief?.scenePosture).toBe("calm-conversation");

    // 2. Switching from a stalled open heard scenario to an unrelated friendly question stays calm.
    const stalledScen = makeScenario("scen-stalled", {
      playerVisible: {
        rumour: "Missing ledger from the harbour customs house.",
        lead: "Customs House",
      },
    });
    const stalledTurns = Array.from({ length: 3 }, (_, idx) =>
      makeTurn(
        idx,
        `Ask witness ${idx} about the missing customs ledger?`,
        "They shrug and say they have no idea about the ledger.",
      ),
    );
    const abandonedSession = parseAdventureSession({
      ...baseSession(),
      turns: stalledTurns,
      scenarioCollection: {
        version: 1,
        focusedScenarioId: "scen-stalled",
        items: [stalledScen],
      },
    });
    const bakerBrief = buildGMDirectorBrief({
      session: abandonedSession,
      phase: "action",
      playerAction: "Ask the baker what bread is fresh?",
    });
    expect(bakerBrief?.scenePosture).toBe("calm-conversation");
    expect(bakerBrief?.suggestedActionKinds).toContain("converse");

    // 3. #5083 dialogue-loop topic switch is not overridden by quiet scene-stall or unscoped investigative recovery.
    const loopTurns = Array.from({ length: 4 }, (_, idx) =>
      makeTurn(
        idx,
        "Ask the gatekeeper who signed the manifest?",
        "I don't know who signed that manifest.",
      ),
    );
    const loopSession = parseAdventureSession({
      ...baseSession(),
      turns: loopTurns,
    });
    const topicSwitchBrief = buildGMDirectorBrief({
      session: loopSession,
      phase: "action",
      playerAction: "Ask the gatekeeper where the nearest inn is?",
    });
    expect(topicSwitchBrief?.scenePosture).not.toBe("stalled-investigation");
    expect(
      buildAdventurePrompt({
        session: loopSession,
        phase: "action",
        playerAction: "Ask the gatekeeper where the nearest inn is?",
        anchors: [],
        relevant: [],
      }).behavior,
    ).not.toContain("INVESTIGATIVE STALL RECOVERY:");

    // 4. Advancing wait turn breaks backward stall scan and resets turnsWithoutAdvancement to 0.
    const advancingWait = makeTurn(
      3,
      "Wait another day",
      "A courier arrives with a new notice.",
      {
        timeAdvance: { minutes: 1440, cause: "wait" },
        visiblePatch: {
          ...makeTurn(3, "", "").visiblePatch,
          situation: {
            id: "sit-courier",
            text: "Customs House posted a fresh ledger notice",
            source: "provisional",
          },
        },
      },
    );
    const afterAdvancingWait = parseAdventureSession({
      ...baseSession(),
      turns: [...stalledTurns, advancingWait],
      scenarioCollection: {
        version: 1,
        focusedScenarioId: "scen-stalled",
        items: [stalledScen],
      },
    });
    expect(
      investigativeProgressPacing(afterAdvancingWait, undefined, {
        pursuedScenario: stalledScen,
      }),
    ).toMatchObject({
      turnsWithoutAdvancement: 0,
      stalled: false,
    });

    // 5. matchUsefulNegativeFinding: positive mention of target does not block first negative finding; witness deflection does.
    const positiveMentionTurn = makeTurn(
      0,
      "Inspect the bench",
      "You spot a heavy chest.",
      {
        visiblePatch: {
          ...makeTurn(0, "", "").visiblePatch,
          knownFacts: {
            add: [
              {
                id: "f-pos",
                text: "The cooper's lockbox sits beneath his bench.",
                source: "provisional",
              },
            ],
            update: [],
            removeIds: [],
          },
        },
      },
    );
    const firstEmptyTurn = makeTurn(
      1,
      "Search the cooper's lockbox",
      "You pry open the lid; the lockbox is empty.",
      {
        visiblePatch: {
          ...makeTurn(1, "", "").visiblePatch,
          knownFacts: {
            add: [
              {
                id: "f-neg",
                text: "The cooper's lockbox is empty.",
                source: "provisional",
              },
            ],
            update: [],
            removeIds: [],
          },
        },
      },
    );
    const negSession = parseAdventureSession({
      ...baseSession(),
      turns: [positiveMentionTurn, firstEmptyTurn],
    });
    expect(
      classifyTurnProgress(firstEmptyTurn, negSession, {
        priorTurns: [positiveMentionTurn],
      }),
    ).toMatchObject({ kind: "useful-negative-finding", meaningful: true });

    const deflectedVerify = makeTurn(
      2,
      "Verify the cooper's lockbox with the clerk",
      "The clerk shakes his head and says he can't say.",
      {
        visiblePatch: {
          ...makeTurn(2, "", "").visiblePatch,
          knownFacts: {
            add: [
              {
                id: "f-deflect",
                text: "Nothing confirms the lockbox.",
                source: "provisional",
              },
            ],
            update: [],
            removeIds: [],
          },
        },
      },
    );
    expect(
      classifyTurnProgress(deflectedVerify, negSession, {
        priorTurns: [positiveMentionTurn],
      }).kind,
    ).not.toBe("useful-negative-finding");
  });

  it("preserves unique canonical subjects, ignores gm-only events, blocks ping-pong travel, and varies recovery angles", () => {
    const stalledScen = makeScenario("scen-stalled", {
      playerVisible: {
        rumour: "Missing ledger from the harbour customs house.",
        lead: "Customs House",
      },
    });
    // 6. Canonical Vault character unique to pursued scenario remains in distinctTokens.
    const cooperScen = makeScenario("scen-cooper", {
      playerVisible: {
        rumour: "Cooper Tams vanished near the sluice gate.",
        lead: "Sluice Gate",
      },
    });
    const cooperTurns = Array.from({ length: 4 }, (_, idx) =>
      makeTurn(
        idx,
        "Ask the ferryman about Cooper Tams?",
        "I haven't seen Cooper Tams.",
      ),
    );
    const cooperSession = parseAdventureSession({
      ...baseSession(),
      sourceRecords: [
        {
          id: "src-tams",
          recordId: "rec-tams",
          recordType: "character",
          displayName: "Cooper Tams",
          snapshotText: "Master cooper",
          role: "anchor",
          availability: "available",
        },
      ],
      turns: cooperTurns,
      scenarioCollection: {
        version: 1,
        focusedScenarioId: "scen-cooper",
        items: [cooperScen],
      },
    });
    expect(
      investigativeProgressPacing(
        cooperSession,
        "Ask the dockhand about Cooper Tams?",
      ),
    ).toMatchObject({
      turnsWithoutAdvancement: 4,
      stalled: true,
      recoveryDue: true,
    });

    // 7. Unrevealed visibility: 'gm' scenario events do not link unrelated chatter to pursued scenario.
    const gmEventChatter = makeTurn(
      0,
      "Order soup at the counter",
      "The broth is warm and salty.",
    );
    const gmEventScen = makeScenario("scen-gm-event", {
      playerVisible: { rumour: "Missing customs seal.", lead: "Customs" },
      secretBindings: {
        truth: "truth-scen-gm-event",
        ifInvestigated: "inv-scen-gm-event",
        eventIds: { "ev-gm-1": "sec-gm-1" },
      },
      events: [
        {
          id: "ev-gm-1",
          turnId: gmEventChatter.id,
          kind: "consequence",
          visibility: "gm",
          text: "Secret courier slipped out.",
          at: now,
        },
      ],
    });
    const gmEventSession = parseAdventureSession({
      ...baseSession(),
      turns: [gmEventChatter],
      scenarioCollection: {
        version: 1,
        focusedScenarioId: "scen-gm-event",
        items: [gmEventScen],
      },
    });
    expect(
      investigativeProgressPacing(gmEventSession, undefined, {
        pursuedScenario: gmEventScen,
      })?.turnsWithoutAdvancement,
    ).toBe(0);

    // 8. Ping-pong location revisits without non-answers do not score consequential-player-choice,
    //    confirmed packageProgress.actorEvents score causal-state-change, and recovery angles vary.
    const locA = makeTurn(0, "Walk to Harbour", "You reach Harbour.", {
      visiblePatch: {
        ...makeTurn(0, "", "").visiblePatch,
        location: { id: "loc-harbour", text: "Harbour", source: "provisional" },
      },
    });
    const locB = makeTurn(1, "Walk to Market", "You reach Market.", {
      visiblePatch: {
        ...makeTurn(1, "", "").visiblePatch,
        location: { id: "loc-market", text: "Market", source: "provisional" },
      },
    });
    const revisitA = makeTurn(2, "Return to Harbour", "Back at Harbour.", {
      visiblePatch: {
        ...makeTurn(2, "", "").visiblePatch,
        location: { id: "loc-harbour", text: "Harbour", source: "provisional" },
      },
    });
    expect(
      classifyTurnProgress(
        revisitA,
        parseAdventureSession({
          ...baseSession(),
          turns: [locA, locB, revisitA],
        }),
        { priorTurns: [locA, locB] },
      ).kind,
    ).toBe("ordinary-interaction");

    const actorEventTurn = makeTurn(
      0,
      "Confront the customs clerk",
      "The clerk recoils and refuses to cooperate.",
    );
    const actorEventSession = parseAdventureSession({
      ...baseSession(),
      turns: [actorEventTurn],
      packageProgress: {
        version: 1,
        sceneId: "scene-1",
        records: [],
        events: [],
        actorEvents: [
          {
            id: "ae-1",
            turnId: actorEventTurn.id,
            actorId: "actor-clerk",
            certainty: "confirmed",
            disposition: "hostile",
            note: "The clerk turns hostile.",
          },
        ],
      },
    });
    expect(
      classifyTurnProgress(actorEventTurn, actorEventSession),
    ).toMatchObject({
      kind: "causal-state-change",
      meaningful: true,
    });

    const quietFour = Array.from({ length: 4 }, (_, idx) =>
      makeTurn(
        idx,
        "Search the customs cellar",
        "Dust motes drift in the dim cellar.",
      ),
    );
    expect(
      investigativeProgressPacing(
        parseAdventureSession({
          ...baseSession(),
          turns: quietFour,
          scenarioCollection: {
            version: 1,
            focusedScenarioId: "scen-stalled",
            items: [stalledScen],
          },
        }),
        "Search the customs cellar again",
      )?.recommendedAngle,
    ).toBe("observable-consequence");

    const reEvalScen = makeScenario("scen-reeval", {
      stage: "actionable-clue",
      playerVisible: { rumour: "Missing customs seal.", lead: "Customs" },
    });
    const ordinaryFour = Array.from({ length: 4 }, (_, idx) =>
      makeTurn(
        idx,
        "Check the customs manifest",
        "The clerk hands over another routine receipt.",
        {
          visiblePatch: {
            ...makeTurn(idx, "", "").visiblePatch,
            knownFacts: {
              add: [
                {
                  id: `f-ord-${idx}`,
                  text: `Receipt ${idx} lists 2 crates of salt.`,
                  source: "provisional",
                },
              ],
              update: [],
              removeIds: [],
            },
          },
        },
      ),
    );
    expect(
      investigativeProgressPacing(
        parseAdventureSession({
          ...baseSession(),
          turns: ordinaryFour,
          scenarioCollection: {
            version: 1,
            focusedScenarioId: "scen-reeval",
            items: [reEvalScen],
          },
        }),
        "Inspect the customs desk",
      )?.recommendedAngle,
    ).toBe("re-evaluate");

    const exhaustedEight = Array.from({ length: 8 }, (_, idx) =>
      makeTurn(
        idx,
        `Ask customs clerk ${idx} about the missing seal?`,
        "I don't know anything about that seal.",
      ),
    );
    expect(
      investigativeProgressPacing(
        parseAdventureSession({
          ...baseSession(),
          turns: exhaustedEight,
          scenarioCollection: {
            version: 1,
            focusedScenarioId: "scen-stalled",
            items: [stalledScen],
          },
        }),
        "Ask another clerk about the missing seal?",
      )?.recommendedAngle,
    ).toBe("trail-exhausted");
  });

  it("keeps unscoped non-answer recovery on the current inquiry topic", () => {
    const unrelatedInquiries = [
      makeTurn(
        0,
        "Ask the ferryman about the missing ledger?",
        "The ferryman says they do not know about the ledger.",
      ),
      makeTurn(
        1,
        "Ask the watch about the bell tower?",
        "The watch has no idea about the bell tower.",
      ),
      makeTurn(
        2,
        "Ask the cook about the burnt stew?",
        "The cook cannot say anything about the stew.",
      ),
    ];
    const session = parseAdventureSession({
      ...baseSession(),
      turns: unrelatedInquiries,
    });

    const pacing = investigativeProgressPacing(
      session,
      "Investigate the lighthouse signal",
    );

    expect(pacing?.repeatedNonAnswerTurns ?? 0).toBeLessThan(
      MULTI_WITNESS_NON_ANSWER_LIMIT,
    );
    expect(pacing?.recoveryDue).not.toBe(true);
  });
});
