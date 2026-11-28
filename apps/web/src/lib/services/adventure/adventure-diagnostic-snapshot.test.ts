import { describe, expect, it } from "vitest";
import {
  adventureDiagnosticJson,
  adventureDiagnosticDeltaJson,
} from "./adventure-diagnostic-snapshot";
import { diagnosticState } from "./adventure-diagnostic-state";
import { exampleSession, quietSession } from "./test-fixtures/adventure-review";

describe("Adventure diagnostic snapshots", () => {
  it("keeps the latest twenty turns in full by default", () => {
    const session = quietSession(22);
    const snapshot = JSON.parse(adventureDiagnosticJson(session));

    expect(snapshot.summary).toMatchObject({
      turnsTotal: 22,
      turnsFull: 20,
      turnsCondensed: 2,
    });
    expect(snapshot.turns[1].detail).toBe("condensed");
    expect(snapshot.turns[2].detail).toBe("full");
    expect(snapshot).not.toHaveProperty("lastTurnRejection");
  });

  it.each([-3, 0, 100])(
    "clamps the recent-turn window for %i",
    (recentTurns) => {
      const session = quietSession(2);
      const snapshot = JSON.parse(
        adventureDiagnosticJson(session, { recentTurns }),
      );

      expect(snapshot.summary.turnsFull).toBe(recentTurns > 0 ? 2 : 0);
      expect(snapshot.summary.turnsCondensed).toBe(recentTurns > 0 ? 0 : 2);
    },
  );

  it("retains shared rejection and integrity context in full and delta snapshots", () => {
    const session = exampleSession();
    const baseline = {
      sessionId: session.id,
      revision: session.revision,
      turnCount: session.turns.length,
      state: structuredClone(diagnosticState(session)),
    };
    session.revision += 1;
    session.premise = "The mill opens.";
    const lastTurnRejection = {
      reason: "hidden-leakage",
      revision: session.revision,
      recordedAt: session.updatedAt,
    };

    const full = JSON.parse(
      adventureDiagnosticJson(session, { lastTurnRejection }),
    );
    const delta = JSON.parse(
      adventureDiagnosticDeltaJson(session, baseline, { lastTurnRejection }),
    );

    expect(delta.summary).toEqual(full.summary);
    expect(delta.integrityChecks).toEqual(full.integrityChecks);
    expect(delta.lastTurnRejection).toEqual(full.lastTurnRejection);
    expect(delta.stateChanges).toEqual({ premise: "The mill opens." });
    expect(delta.turns).toEqual([]);
    expect(baseline.state.premise).not.toBe(session.premise);
  });

  it("bounds a direct delta when its baseline has more turns than the session", () => {
    const session = quietSession(1);
    const baseline = {
      sessionId: session.id,
      revision: session.revision,
      turnCount: 3,
      state: diagnosticState(session),
    };

    const delta = JSON.parse(adventureDiagnosticDeltaJson(session, baseline));

    expect(delta.delta).toMatchObject({
      fromTurnCount: 1,
      toTurnCount: 1,
      newTurnsCount: 0,
    });
    expect(delta.turns).toEqual([]);
    expect(delta.stateChanges).toEqual({});
  });
});
