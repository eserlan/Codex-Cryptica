import { describe, expect, it } from "vitest";
import {
  buildAdventurePrompt,
  isQuietTurn,
  sceneStallPacing,
  SCENE_STALL_TURN_LIMIT,
  type AdventureSession,
  type CommittedAdventureTurn,
} from "../src";

const emptyPatch = () => ({ add: [], update: [], removeIds: [] });

type Change =
  "none" | "fact" | "location" | "reveal" | "time" | "provisional" | "thread";

function turn(sequence: number, change: Change = "none") {
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
  if (change === "time") t.timeAdvance = { minutes: 10, cause: "Walking" };
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
      stalled: true,
    });
    expect(behaviorFor(s)).toContain(
      `STALLED SCENE: the last ${SCENE_STALL_TURN_LIMIT} turns`,
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

  it.each([
    "fact",
    "location",
    "reveal",
    "time",
    "provisional",
    "thread",
  ] as const)(
    "a %s change makes a turn not quiet and resets the count",
    (c) => {
      expect(isQuietTurn(turn(1, c))).toBe(false);
      const s = session([...quiet(6), turn(7, c), ...quiet(1, 8)]);
      expect(sceneStallPacing(s)).toEqual({ quietTurns: 1, stalled: false });
      expect(behaviorFor(s)).not.toContain("STALLED SCENE");
    },
  );

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
    expect(sceneStallPacing(s)).toEqual({ quietTurns: 1, stalled: false });
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
