import { describe, expect, it } from "vitest";
import {
  applyCompletedTurn,
  applyRollRequest,
  buildAdventurePrompt,
  commitScenarioEvent,
  createPlayerTranscript,
  createScenarioState,
  detectHiddenLeakage,
  parseAdventureSession,
  recordPendingRollOutcome,
  resolveRecordedRoll,
  type AdventureSession,
  type AdventureTurnProposal,
} from "../src";

const now = "2026-11-01T12:00:00.000Z";
const truth = "The missing miller is alive and hiding grain beneath the mill.";
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

function baseline(): AdventureSession {
  return parseAdventureSession({
    schemaVersion: 2,
    id: "adventure-1",
    vaultId: "vault-1",
    title: "The Missing Miller",
    status: "active",
    createdAt: now,
    updatedAt: now,
    lastPlayedAt: now,
    revision: 0,
    playerCharacter: {
      kind: "provisional",
      name: "Mara",
      description: "Traveler",
    },
    premise: "The miller has vanished.",
    sourceRecords: [],
    visibleState: {
      objectives: [],
      activeCharacters: [],
      knownFacts: [],
      relationships: [],
    },
    hiddenState: {
      secrets: [{ id: "truth-1", text: truth, status: "hidden" }],
      gmThreads: [],
    },
    provisionalFacts: [],
    turns: [],
    pendingRoll: null,
    dicePresets: [],
    resourceCounters: [],
    scenarioState: createScenarioState({
      id: "rumour-4",
      origin: { kind: "rumour", batchTitle: "Northbrook", index: 4 },
      playerVisible: {
        rumour: "The miller has vanished.",
        lead: "Old Mill",
        source: "Innkeeper",
      },
      gmOnly: {
        truth,
        ifInvestigated: "The ledger is missing three pages.",
      },
    }),
  });
}

function ordinaryTurn(i: number): AdventureTurnProposal {
  return {
    kind: "complete",
    narration:
      i % 5 === 0
        ? "You are free to continue exploring or leave the village."
        : "The locals respond to your questions without assigning a quest.",
    visiblePatch: emptyVisible,
    hiddenPatch: emptyHidden,
    revealSecretIds: [],
    provisionalFacts: [],
    sourceRecordIds: [],
    suggestedActions: [
      "Ask about the market",
      "Explore a nearby lane",
      "Leave the village",
    ],
  };
}

describe("30-turn emergent adventure regression", () => {
  it("plays, rolls, reloads and resolves a rumour without losing original truth", () => {
    let session = baseline();
    for (let i = 0; i < 30; i += 1) {
      const meta = {
        turnId: "turn-" + i,
        inputId: "input-" + i,
        playerAction: "Player action " + i,
        now,
      };
      if (i === 7) {
        const requested = applyRollRequest(
          session,
          {
            kind: "roll-required",
            uncertainty: "Can Mara cross the flooded mill race?",
            stakes: "A minor injury or lost supplies",
            sourceRecordIds: [],
          },
          meta,
        );
        expect(requested.ok).toBe(true);
        if (!requested.ok) throw new Error("roll request failed");
        const recorded = recordPendingRollOutcome(
          requested.value,
          meta.inputId,
          { kind: "numeric", value: 13 },
          meta,
        );
        expect(recorded.ok).toBe(true);
        if (!recorded.ok) throw new Error("roll recording failed");
        const resolved = resolveRecordedRoll(recorded.value, ordinaryTurn(i), meta);
        expect(resolved.ok).toBe(true);
        if (!resolved.ok) throw new Error("roll resolution failed");
        session = resolved.value;
      } else {
        const completed = applyCompletedTurn(session, ordinaryTurn(i), meta);
        expect(completed.ok).toBe(true);
        if (!completed.ok) throw new Error("turn failed");
        session = completed.value;
      }
      if (i === 10) {
        const event = commitScenarioEvent(
          session,
          {
            id: "event-first-clue",
            kind: "discovery",
            visibility: "player",
            text: "The mill is unoccupied at midday.",
            at: now,
            turnId: meta.turnId,
          },
          "open",
          session.revision,
        );
        expect(event.ok).toBe(true);
        if (!event.ok) throw new Error("scenario progression failed");
        session = event.session;
        const beforeReloadRevision = session.revision;
        // Simulate OPFS JSON roundtrip, not a new AI generation.
        session = parseAdventureSession(JSON.parse(JSON.stringify(session)));
        expect(session.revision).toBe(beforeReloadRevision);
      }
    }

    expect(session.turns).toHaveLength(30);
    expect(session.turns[7]?.rollOutcome?.value).toBe(13);
    expect(session.scenarioState?.status).toBe("open");
    expect(session.scenarioState?.events).toHaveLength(1);
    expect(session.scenarioState?.gmOnly.truth).toBe(truth);
    const transcript = JSON.stringify(createPlayerTranscript(session));
    expect(transcript).not.toContain(truth);
    const prompt = buildAdventurePrompt({
      session,
      phase: "action",
      playerAction: "Leave this rumour alone.",
      anchors: [],
      relevant: [],
    });
    expect(
      JSON.stringify(JSON.parse(prompt.state).playerScenario),
    ).not.toContain(truth);
    expect(
      JSON.parse(prompt.state)["GM-ONLY scenario"].baselineTruth.truth,
    ).toBe(truth);
  });

  it("rejects hidden truth, duplicates and stale replay without changing state", () => {
    const session = baseline();
    expect(
      detectHiddenLeakage(session, {
        ...ordinaryTurn(0),
        kind: "complete",
        narration: truth,
      }),
    ).not.toHaveLength(0);
    const first = applyCompletedTurn(session, ordinaryTurn(0), {
      turnId: "turn-0",
      inputId: "input-0",
      now,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(
      applyCompletedTurn(
        first.value,
        ordinaryTurn(0),
        { turnId: "turn-retry", inputId: "input-0", now },
      ),
    ).toEqual(
      expect.objectContaining({
        ok: false,
        errors: [expect.objectContaining({ code: "duplicate-input" })],
      }),
    );
    expect(session.revision).toBe(0);
    expect(session.turns).toHaveLength(0);
  });

  it("supports leaving the scenario unresolved and choosing ordinary activity", () => {
    const session = baseline();
    const next = applyCompletedTurn(
      session,
      {
        ...ordinaryTurn(0),
        narration: "You spend a quiet day tending the horses.",
      },
      { turnId: "horses", inputId: "horses", now },
    );
    expect(next.ok).toBe(true);
    if (!next.ok) return;
    expect(next.value.scenarioState?.status).toBe("open");
    expect(next.value.visibleState.objectives).toEqual([]);
    expect(next.value.turns[0].narration).toContain("quiet day");
  });
});
