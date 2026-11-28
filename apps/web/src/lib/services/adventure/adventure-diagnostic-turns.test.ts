import { describe, expect, it } from "vitest";
import {
  diagnosticTurns,
  diagnosticTurnSummary,
} from "./adventure-diagnostic-turns";
import { quietSession } from "./test-fixtures/adventure-review";

describe("Adventure diagnostic turns", () => {
  it("preserves signals and metadata when condensing patches", () => {
    const session = quietSession(3);
    const turn = session.turns[0];
    turn.visiblePatch.location = null;
    turn.visiblePatch.knownFacts = {
      add: [{ id: "added", text: "A clue", source: "provisional" }],
      update: [
        {
          id: "updated",
          text: "Updated clue",
          source: "provisional",
        },
      ],
      removeIds: ["removed"],
    };
    turn.dropped = ["unknown patch"];
    turn.generation = { transport: "stateless" };

    const turns = diagnosticTurns(session, 2);

    expect(turns[0]).toMatchObject({
      detail: "condensed",
      timeAdvance: null,
      dropped: ["unknown patch"],
      generation: { transport: "stateless" },
      signals: { locationChanged: true, stateChanges: 3 },
    });
    expect(turns[0]).not.toHaveProperty("visiblePatch");
    expect(turns[1]).not.toHaveProperty("generation");
    expect(turns[1]).not.toHaveProperty("dropped");
    expect(turns[1].signals).toEqual({ quiet: true });
    expect(turns[2]).toMatchObject({
      detail: "full",
      visiblePatch: session.turns[2].visiblePatch,
    });
  });

  it("counts multiple stall thresholds and resets the streak on a location clear", () => {
    const session = quietSession(10);
    session.turns[8].visiblePatch.location = null;
    session.turns[1].dropped = ["unknown patch"];

    expect(
      diagnosticTurnSummary(session, 7, session.turns.at(-1)),
    ).toMatchObject({
      turnsTotal: 10,
      turnsFull: 3,
      turnsCondensed: 7,
      longestQuietRun: 8,
      stalledScenes: 2,
      droppedParts: 1,
      lastPlayerAction: session.turns[9].playerAction,
    });
    expect(diagnosticTurns(session, 0)[8].signals).toEqual({
      locationChanged: true,
    });
  });

  it("returns no signals or pacing history for an empty session", () => {
    const session = quietSession(0);
    expect(diagnosticTurns(session, 0)).toEqual([]);
    expect(diagnosticTurnSummary(session, 0, undefined)).toMatchObject({
      turnsTotal: 0,
      turnsFull: 0,
      turnsCondensed: 0,
      pendingRoll: false,
      quietTurns: 0,
      dialogueLoopTurns: 0,
      investigativeStallTurns: 0,
      longestQuietRun: 0,
      stalledScenes: 0,
      droppedParts: 0,
      lastPlayerAction: null,
    });
  });
});
