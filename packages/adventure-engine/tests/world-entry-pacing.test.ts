import { describe, expect, it } from "vitest";
import {
  buildAdventurePrompt,
  worldEntryPacing,
  WORLD_ENTRY_QUIET_TURN_LIMIT,
  type AdventureSession,
  type CommittedAdventureTurn,
} from "../src";

const emptyPatch = () => ({ add: [], update: [], removeIds: [] });

function turn(
  sequence: number,
  activity: "none" | "thread-update" | "reveal" = "none",
): CommittedAdventureTurn {
  return {
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
    hiddenPatch: {
      secrets: emptyPatch(),
      gmThreads:
        activity === "thread-update"
          ? {
              add: [],
              update: [
                {
                  id: "thread-1",
                  text: "Seed 1. Stage: signs shown.",
                  status: "hidden",
                },
              ],
              removeIds: [],
            }
          : emptyPatch(),
    },
    revealedSecretIds: activity === "reveal" ? ["secret-1"] : [],
    sourceRecordIds: [],
    provisionalFactIds: [],
    committedAt: "2026-11-03T10:00:00.000Z",
  };
}

function session(
  turns: CommittedAdventureTurn[],
  overrides: Partial<AdventureSession> = {},
): AdventureSession {
  return {
    id: "adventure-1",
    title: "Lira in Northbrook",
    premise: "Explore Northbrook",
    playerCharacter: { kind: "provisional", name: "Lira" },
    worldEntry: {
      version: 1,
      location: { kind: "provisional", name: "Northbrook" },
      intent: "explore",
    },
    visibleState: {
      objectives: [],
      activeCharacters: [],
      knownFacts: [],
      relationships: [],
    },
    hiddenState: {
      secrets: [{ id: "secret-1", text: "Truth", status: "hidden" }],
      gmThreads: [
        {
          id: "thread-1",
          text: "World-entry seed 1. Stage: unnoticed.",
          status: "hidden",
        },
      ],
    },
    provisionalFacts: [],
    turns,
    pendingRoll: null,
    ...overrides,
  } as unknown as AdventureSession;
}

const quietTurns = (count: number, from = 1) =>
  Array.from({ length: count }, (_, i) => turn(from + i));

function promptFor(s: AdventureSession) {
  return buildAdventurePrompt({
    session: s,
    phase: "action",
    playerAction: "Buy bread",
    anchors: [],
    relevant: [],
  });
}

describe("world entry pacing", () => {
  it("asks for one background sign after enough quiet turns", () => {
    const s = session(quietTurns(WORLD_ENTRY_QUIET_TURN_LIMIT));
    expect(worldEntryPacing(s)).toEqual({
      quietTurns: WORLD_ENTRY_QUIET_TURN_LIMIT,
      signDue: true,
    });
    expect(promptFor(s).behavior).toContain(
      `PACING: ${WORLD_ENTRY_QUIET_TURN_LIMIT} turns have passed`,
    );
  });

  it("does not ask for a sign before the world has been still long enough", () => {
    const s = session(quietTurns(WORLD_ENTRY_QUIET_TURN_LIMIT - 1));
    expect(worldEntryPacing(s)?.signDue).toBe(false);
    expect(promptFor(s).behavior).not.toContain("PACING:");
  });

  it("restarts the count after a seed stage update or a reveal", () => {
    for (const activity of ["thread-update", "reveal"] as const) {
      const s = session([
        ...quietTurns(5),
        turn(6, activity),
        ...quietTurns(1, 7),
      ]);
      expect(worldEntryPacing(s)).toEqual({ quietTurns: 1, signDue: false });
    }
  });

  it("stays out of ordinary adventures and sessions without hidden threads", () => {
    const turns = quietTurns(6);
    expect(
      worldEntryPacing(session(turns, { worldEntry: undefined })),
    ).toBeUndefined();
    const revealedOnly = session(turns, {
      hiddenState: {
        secrets: [],
        gmThreads: [{ id: "thread-1", text: "Seed", status: "revealed" }],
      },
    });
    expect(worldEntryPacing(revealedOnly)).toBeUndefined();
    expect(promptFor(revealedOnly).behavior).not.toContain("PACING:");
  });

  it("lets seeds surface through more than conversation without turning them into quests", () => {
    const behavior = promptFor(session([])).behavior;
    expect(behavior).toContain("not only through conversation");
    expect(behavior).toContain("never frame a sign as a quest");
    expect(behavior).toContain("at most one stage per turn");
    expect(behavior).toContain("Never raise a situation's stakes");
    expect(behavior).toContain("one suggestedAction may invite a closer look");
  });
});
