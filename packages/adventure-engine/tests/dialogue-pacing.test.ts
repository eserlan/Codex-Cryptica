import { describe, expect, it } from "vitest";
import {
  buildAdventurePrompt,
  dialogueLoopPacing,
  DIALOGUE_LOOP_TURN_LIMIT,
  type AdventureSession,
  type CommittedAdventureTurn,
} from "../src";

const emptyPatch = () => ({ add: [], update: [], removeIds: [] });

function turn(
  sequence: number,
  playerAction: string,
  narration: string,
): CommittedAdventureTurn {
  return {
    id: `turn-${sequence}`,
    inputId: `input-${sequence}`,
    sequence,
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
    committedAt: "2026-11-20T10:00:00.000Z",
  } as CommittedAdventureTurn;
}

const questions = [
  "Who is owning the debt? Why keep a public record?",
  "No, I mean who do they owe money to?",
  "So you know who has a debt but not to whom? That makes no sense.",
  "So people come to you and report debt but not who the money is owed to?",
];

const nonAnswers = [
  "The keeper says: \"This ledger doesn't name the lender, so I can't tell you.\"",
  'A gust rattles the shutter. "I cannot name the creditors from this page."',
  'The ledger is closed. "It doesn\'t say who lent the coin or goods."',
  'A villager crosses the market. "I won\'t guess who is owed; ask the households."',
];

function ledgerTurns(): CommittedAdventureTurn[] {
  return questions.map((action, i) => turn(i, action, nonAnswers[i]!));
}

function session(
  turns: CommittedAdventureTurn[],
  overrides: Partial<AdventureSession> = {},
): AdventureSession {
  return {
    id: "ledger-session",
    title: "Village Investigation",
    premise: "Investigate village debts.",
    playerCharacter: { kind: "provisional", name: "Lira" },
    visibleState: {
      objectives: [],
      activeCharacters: [],
      knownFacts: [],
      relationships: [],
    },
    hiddenState: { secrets: [], gmThreads: [] },
    provisionalFacts: [],
    turns,
    pendingRoll: null,
    ...overrides,
  } as AdventureSession;
}

function behaviorFor(s: AdventureSession, playerAction: string): string {
  return buildAdventurePrompt({
    session: s,
    phase: "action",
    playerAction,
    anchors: [],
    relevant: [],
  }).behavior;
}

describe("circular NPC dialogue pacing (#5083)", () => {
  it("detects rephrased ledger questions despite changed narration", () => {
    const current = session(ledgerTurns());
    expect(DIALOGUE_LOOP_TURN_LIMIT).toBe(3);
    expect(dialogueLoopPacing(current)).toEqual({
      repeatedTurns: 4,
      recoveryDue: true,
    });
    expect(
      behaviorFor(current, "Who holds the creditor records for these debts?"),
    ).toContain("DIALOGUE LOOP RECOVERY:");
    expect(
      behaviorFor(current, "Who holds the creditor records for these debts?"),
    ).toContain("Clarify a mistaken explanation");
  });

  it("nudges before the fourth non-answer is committed", () => {
    const current = session(ledgerTurns().slice(0, 3));
    expect(dialogueLoopPacing(current)?.repeatedTurns).toBe(3);
    expect(behaviorFor(current, questions[3]!)).toContain(
      "DIALOGUE LOOP RECOVERY:",
    );
  });

  it("does not force recovery after a topic switch", () => {
    const current = session(ledgerTurns());
    expect(
      dialogueLoopPacing(current, "Walk to the mill and look at its wheel"),
    ).toEqual({
      repeatedTurns: 4,
      recoveryDue: false,
    });
    expect(
      behaviorFor(current, "Walk to the mill and look at its wheel"),
    ).not.toContain("DIALOGUE LOOP RECOVERY:");
  });

  it("does not mistake different questions to one NPC for a dialogue loop", () => {
    const turns = [
      turn(
        0,
        "Where is the healer?",
        "I don't know where the healer has gone.",
      ),
      turn(1, "Who built the belfry?", "I can't recall its builder."),
      turn(2, "Why is the cart broken?", "I have no idea about the cart."),
      turn(3, "What happened to the bell?", "I can't say what happened."),
    ];
    expect(dialogueLoopPacing(session(turns))).toBeUndefined();
  });

  it("does not force deliberate repetitions", () => {
    const turns = ledgerTurns();
    turns[3] = turn(
      3,
      "Repeat the same question in the same words.",
      nonAnswers[3]!,
    );
    expect(dialogueLoopPacing(session(turns))).toBeUndefined();
  });

  it("unrelated facts cannot mask the loop", () => {
    const turns = ledgerTurns();
    turns[2]!.visiblePatch.knownFacts.add.push({
      id: "market-news",
      text: "The cabbage stall is selling out.",
      source: "provisional",
    });
    expect(dialogueLoopPacing(session(turns))?.recoveryDue).toBe(true);

    turns[2]!.visiblePatch.knownFacts.add.push({
      id: "creditor-information",
      text: "The debt register's creditor names are in the village accounts.",
      source: "provisional",
    });
    expect(dialogueLoopPacing(session(turns))).toBeUndefined();
  });

  it("counts only topic-relevant relationship changes", () => {
    const turns = ledgerTurns();
    turns[2]!.visiblePatch.relationships.add.push({
      subjectId: "miller-family",
      text: "The debt is owed to the Miller family.",
      disposition: "The village records their claim.",
      source: "provisional",
    });
    expect(dialogueLoopPacing(session(turns))).toBeUndefined();

    const dispositionOnly = ledgerTurns();
    dispositionOnly[2]!.visiblePatch.relationships.add.push({
      subjectId: "miller-family",
      text: "Miller family",
      disposition: "The debt is owed to the Miller family.",
      source: "provisional",
    });
    expect(dialogueLoopPacing(session(dispositionOnly))).toBeUndefined();

    const unrelated = ledgerTurns();
    unrelated[2]!.visiblePatch.relationships.add.push({
      subjectId: "baker",
      text: "The baker is a friend of the keeper.",
      disposition: "They exchange gossip each morning.",
      source: "provisional",
    });
    expect(dialogueLoopPacing(session(unrelated))?.recoveryDue).toBe(true);
  });

  it("counts only topic-relevant discoveries", () => {
    const turns = ledgerTurns();
    turns[2]!.provisionalFactIds = ["new-fact"];
    const recorded = session(turns, {
      provisionalFacts: [
        {
          id: "new-fact",
          name: "Village creditor roll",
          kind: "clue",
          summary: "The roll records the debts and lenders.",
          visibility: "player-visible",
          introducedOnTurnId: "turn-2",
        },
      ],
    });
    expect(dialogueLoopPacing(recorded)).toBeUndefined();

    const separate = session(ledgerTurns(), {
      scenarioCollection: {
        version: 1,
        items: [
          {
            events: [
              {
                id: "event-1",
                turnId: "turn-2",
                kind: "discovery",
                visibility: "player",
                text: "The mill is shut until tomorrow.",
                at: "2026-11-20T10:00:00.000Z",
              },
            ],
          },
        ],
      } as AdventureSession["scenarioCollection"],
    });
    expect(dialogueLoopPacing(separate)?.recoveryDue).toBe(true);
    separate.scenarioCollection!.items[0]!.events[0]!.text =
      "The creditor's records are stored at the shrine.";
    expect(dialogueLoopPacing(separate)).toBeUndefined();
  });

  it("respects a scene move and pending rolls", () => {
    const turns = ledgerTurns();
    turns[2]!.visiblePatch.location = {
      id: "loc-2",
      text: "The next village",
      source: "provisional",
    };
    expect(dialogueLoopPacing(session(turns))).toBeUndefined();
    expect(
      dialogueLoopPacing(
        session(ledgerTurns(), { pendingRoll: { id: "roll-1" } as never }),
      ),
    ).toBeUndefined();
  });

  it("does not mistake ordinary chat for a loop", () => {
    const turns = [
      turn(0, "Ask for bread.", "The baker offers you a crusty loaf."),
      turn(1, "Ask for a seat.", "The keeper points out the bench."),
      turn(2, "Ask for a drink.", "The keeper serves warm tea."),
      turn(3, "Ask for news.", "The keeper smiles and tells a cheerful story."),
    ];
    expect(dialogueLoopPacing(session(turns))).toBeUndefined();
  });

  it("protects secrets, canon and player agency", () => {
    const behavior = behaviorFor(session(ledgerTurns()), questions[3]!);
    expect(behavior).toContain("If this NPC genuinely cannot know");
    expect(behavior).toContain("Do not force a quest");
    expect(behavior).toContain("reveal hidden truths without discovery");
    expect(behavior).toContain(
      "Canonical source records outrank provisional session material",
    );
    expect(behavior).toContain(
      "Never choose the player character's voluntary actions",
    );
  });
});
