import { describe, expect, it } from "vitest";
import {
  MAX_BEHAVIOR_PROMPT_CHARS,
  applyCompletedTurn,
  buildAdventurePrompt,
  isQuietTurn,
  parseAdventureSession,
  sceneStallPacing,
  SCENE_STALL_TURN_LIMIT,
  type AdventureSession,
  type CommittedAdventureTurn,
} from "../src";
import {
  meta as baseMeta,
  proposal as baseProposal,
  session as validSession,
} from "./reducer-fixtures";

const emptyPatch = () => ({ add: [], update: [], removeIds: [] });

type Change =
  "none" | "fact" | "location" | "reveal" | "time" | "provisional" | "thread";

function turn(sequence: number, change: Change = "none", minutes = 10) {
  const t: CommittedAdventureTurn = {
    id: `turn-${sequence}`,
    sequence,
    inputId: `input-${sequence}`,
    playerAction: "Look around",
    narration: "The market hums.",
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
    committedAt: "2026-11-03T10:00:00.000Z",
  } as unknown as CommittedAdventureTurn;
  if (change === "fact")
    t.visiblePatch.knownFacts = {
      ...emptyPatch(),
      add: [{ id: "f", text: "A fact", source: "provisional" }],
    } as never;
  if (change === "location")
    t.visiblePatch.location = {
      id: "l",
      text: "The lane",
      source: "provisional",
    };
  if (change === "reveal") t.revealedSecretIds = ["secret-1"];
  if (change === "time") t.timeAdvance = { minutes, cause: "Waiting" };
  if (change === "provisional") t.provisionalFactIds = ["p-1"];
  if (change === "thread")
    t.hiddenPatch.gmThreads = {
      ...emptyPatch(),
      removeIds: ["thread-1"],
    } as never;
  return t;
}

const quiet = (count: number, from = 1) =>
  Array.from({ length: count }, (_, i) => turn(from + i));

function session(
  turns: CommittedAdventureTurn[],
  overrides: Partial<AdventureSession> = {},
): AdventureSession {
  return {
    id: "adventure-1",
    title: "Lira in Northbrook",
    premise: "Explore Northbrook",
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
  } as unknown as AdventureSession;
}

const behaviorFor = (s: AdventureSession) =>
  buildAdventurePrompt({
    session: s,
    phase: "action",
    playerAction: "Look around",
    anchors: [],
    relevant: [],
  }).behavior;

describe("scene stall pacing", () => {
  it("flags a stall after the limit of quiet turns and tells the GM to change something", () => {
    const s = session(quiet(SCENE_STALL_TURN_LIMIT));
    expect(sceneStallPacing(s)).toEqual({
      quietTurns: SCENE_STALL_TURN_LIMIT,
      quietElapsedMinutes: 0,
      stalled: true,
    });
    expect(behaviorFor(s)).toContain(
      `STALLED SCENE: the last ${SCENE_STALL_TURN_LIMIT} turns changed nothing in the world`,
    );
  });

  it("does not flag a stall before the limit or with too little history", () => {
    const s = session(quiet(SCENE_STALL_TURN_LIMIT - 1));
    expect(sceneStallPacing(s)).toBeUndefined();
    expect(behaviorFor(s)).not.toContain("STALLED SCENE");
  });

  it("nudges on every limit-th quiet turn, not on every turn in between", () => {
    const stalledAt = (n: number) =>
      sceneStallPacing(session(quiet(n)))?.stalled;
    expect(stalledAt(5)).toBe(false);
    expect(stalledAt(7)).toBe(false);
    expect(stalledAt(8)).toBe(true);
    expect(behaviorFor(session(quiet(5)))).not.toContain("STALLED SCENE");
  });

  it.each(["fact", "location", "reveal", "provisional", "thread"] as const)(
    "a %s change makes a turn not quiet and resets the count",
    (c) => {
      expect(isQuietTurn(turn(1, c))).toBe(false);
      const s = session([...quiet(6), turn(7, c), ...quiet(1, 8)]);
      expect(sceneStallPacing(s)).toEqual({
        quietTurns: 1,
        quietElapsedMinutes: 0,
        stalled: false,
      });
      expect(behaviorFor(s)).not.toContain("STALLED SCENE");
    },
  );

  it("treats consecutive empty timeAdvance waits as quiet, accumulates elapsed minutes, and emits time-aware stall recovery", () => {
    const waitTurn = (seq: number, minutes = 2880) =>
      turn(seq, "time", minutes);
    expect(isQuietTurn(waitTurn(1))).toBe(true);

    const fourWaits = session([
      waitTurn(1, 2880),
      waitTurn(2, 2880),
      waitTurn(3, 2880),
      waitTurn(4, 2880),
    ]);
    expect(sceneStallPacing(fourWaits)).toEqual({
      quietTurns: 4,
      quietElapsedMinutes: 11_520,
      stalled: true,
    });
    const behavior = behaviorFor(fourWaits);
    expect(behavior).toContain(
      "STALLED SCENE: the last 4 turns (8d of fictional time)",
    );
    expect(behavior).toContain("even unthreaded");
    expect(behavior).toContain("force a crisis or artificial deadline");
    expect(behavior).toContain("decide the player's response");

    // World Entry timed-stall prompts must remain under the configured behavior budget without truncation
    const worldEntryStall = behaviorFor(
      session(
        [
          waitTurn(1, 2880),
          waitTurn(2, 2880),
          waitTurn(3, 2880),
          waitTurn(4, 2880),
        ],
        {
          worldEntry: {
            version: 1,
            location: { kind: "provisional", name: "Northbrook" },
            intent: "explore",
          },
        },
      ),
    );
    expect(worldEntryStall.length).toBeLessThan(MAX_BEHAVIOR_PROMPT_CHARS);
    expect(
      worldEntryStall.endsWith("Return only the requested structured schema."),
    ).toBe(true);

    // Mixed quiet turns (timed and untimed) and 8th-turn recurrence
    const eightMixed = session([
      waitTurn(1, 1440),
      turn(2, "none"),
      waitTurn(3, 720),
      turn(4, "none"),
      waitTurn(5, 60),
      turn(6, "none"),
      waitTurn(7, 30),
      turn(8, "none"),
    ]);
    expect(sceneStallPacing(eightMixed)).toEqual({
      quietTurns: 8,
      quietElapsedMinutes: 2250,
      stalled: true,
    });
    expect(behaviorFor(eightMixed)).toContain(
      "STALLED SCENE: the last 8 turns (1d 13h 30m of fictional time)",
    );
  });

  it("allows 1-3 empty timeAdvance waits without triggering stall recovery", () => {
    const shortHistory = session([turn(1, "time", 480), turn(2, "time", 60)]);
    expect(sceneStallPacing(shortHistory)).toBeUndefined();
    expect(behaviorFor(shortHistory)).not.toContain("STALLED SCENE");

    const briefWaitAfterActive = session([
      turn(1, "fact"),
      turn(2, "time", 480),
      turn(3, "time", 120),
      turn(4, "time", 60),
    ]);
    expect(sceneStallPacing(briefWaitAfterActive)).toEqual({
      quietTurns: 3,
      quietElapsedMinutes: 660,
      stalled: false,
    });
    expect(behaviorFor(briefWaitAfterActive)).not.toContain("STALLED SCENE");
  });

  it("treats a timeAdvance turn with an observable state change as non-quiet and resets elapsed quiet minutes", () => {
    const timedVisible = turn(5, "time", 1440);
    timedVisible.visiblePatch.knownFacts = {
      ...emptyPatch(),
      add: [
        {
          id: "f-2",
          text: "The courier arrived with a sealed letter.",
          source: "provisional",
        },
      ],
    } as never;
    expect(isQuietTurn(timedVisible)).toBe(false);

    const timedSituation = turn(5, "time", 60);
    timedSituation.visiblePatch.situation = {
      id: "sit-1",
      text: "The guild clerk opens the outer doors.",
      source: "provisional",
    };
    expect(isQuietTurn(timedSituation)).toBe(false);

    const timedProvisional = turn(5, "time", 60);
    timedProvisional.provisionalFactIds = ["prov-1"];
    expect(isQuietTurn(timedProvisional)).toBe(false);

    const s = session([
      turn(1, "time", 1440),
      turn(2, "time", 1440),
      turn(3, "time", 1440),
      turn(4, "time", 1440),
      timedVisible,
    ]);
    expect(sceneStallPacing(s)).toEqual({
      quietTurns: 0,
      quietElapsedMinutes: 0,
      stalled: false,
    });
  });

  it("includes unthreaded pending-process and player-agency guidance in the base prompt before any stall", () => {
    const behavior = behaviorFor(session([]));
    expect(behavior).toContain(
      "Pending processes without a gmThread or open scenario: keep timeAdvance.developments empty",
    );
    expect(behavior).toContain(
      "deny player choice (accept, reject, abandon, wait)",
    );
  });

  it("commits a grounded unthreaded pending-process outcome after 4 empty waits without drops or leakage and resets stall pacing", () => {
    let current = validSession();
    for (let i = 0; i < 4; i += 1) {
      const waitProposal = baseProposal();
      waitProposal.narration = `Day ${i + 1}: you wait in the tavern.`;
      waitProposal.timeAdvance = {
        minutes: 1440,
        cause: "Waiting for the guild review",
        developments: [],
      };
      const res = applyCompletedTurn(current, waitProposal, {
        ...baseMeta,
        turnId: `wait-turn-${i}`,
        inputId: `wait-input-${i}`,
        playerAction: "Wait another day",
      });
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      current = res.value;
    }

    expect(sceneStallPacing(current)).toEqual({
      quietTurns: 4,
      quietElapsedMinutes: 5760,
      stalled: true,
    });

    const outcomeProposal = baseProposal();
    outcomeProposal.narration =
      "On the fifth morning, the guild clerk posts a stamped notice accepting your petition for review in the south hall.";
    outcomeProposal.timeAdvance = {
      minutes: 1440,
      cause: "Overnight wait until morning notice",
      developments: [],
    };
    outcomeProposal.visiblePatch.knownFacts.add.push({
      text: "The guild clerk posted a stamped acceptance notice for your petition.",
      source: "provisional",
    });
    outcomeProposal.hiddenPatch.gmThreads.add.push({
      text: "Steward Orlov privately flagged the petition for a closed audit.",
      status: "hidden",
    });

    const committed = applyCompletedTurn(current, outcomeProposal, {
      ...baseMeta,
      turnId: "outcome-turn",
      inputId: "outcome-input",
      playerAction: "Check the notice board in the morning",
    });
    expect(committed.ok).toBe(true);
    if (!committed.ok) return;

    const lastTurn = committed.value.turns.at(-1)!;
    expect(lastTurn.dropped).toBeUndefined();
    expect(sceneStallPacing(committed.value)).toEqual({
      quietTurns: 0,
      quietElapsedMinutes: 0,
      stalled: false,
    });
    expect(
      parseAdventureSession(committed.value).visibleState.knownFacts,
    ).toHaveLength(1);
    expect(committed.value.hiddenState.gmThreads).toHaveLength(1);
  });

  it("a resolved roll is not quiet", () => {
    const rolled = turn(1);
    rolled.resolvedRoll = { id: "roll-1" } as never;
    expect(isQuietTurn(rolled)).toBe(false);
  });

  it("a turn that logged a scenario event is not quiet even with empty patches", () => {
    const s = session([...quiet(5), ...quiet(2, 6)], {
      scenarioCollection: {
        version: 1,
        items: [{ events: [{ turnId: "turn-6" }] }],
      } as never,
    });
    expect(sceneStallPacing(s)).toEqual({
      quietTurns: 1,
      quietElapsedMinutes: 0,
      stalled: false,
    });
    expect(isQuietTurn(turn(6), new Set(["turn-6"]))).toBe(false);
    expect(isQuietTurn(turn(6))).toBe(true);
  });

  it("stays silent while a roll is pending", () => {
    const s = session(quiet(SCENE_STALL_TURN_LIMIT), {
      pendingRoll: { id: "roll-1" } as never,
    });
    expect(sceneStallPacing(s)).toBeUndefined();
  });

  it("adds no stall line to a fresh opening", () => {
    expect(behaviorFor(session([]))).not.toContain("STALLED SCENE");
  });
});

describe("messages addressed to the GM", () => {
  it("tells the GM to treat them as corrections to the fiction", () => {
    const behavior = behaviorFor(session(quiet(1)));
    expect(behavior).toContain("Treat it as a correction to the fiction");
    expect(behavior).toContain("apply it to the state patch");
  });
});
