import { describe, expect, it } from "vitest";
import {
  applyCompletedTurn,
  applyRollRequest,
  addScenario,
  setScenarioFocus,
  setScenarioStatus,
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
  type ScenarioItem,
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

function scenarioItem(
  id: string,
  knowledge: ScenarioItem["knowledge"],
): ScenarioItem {
  const state = createScenarioState({
    id,
    origin: {
      kind: "rumour",
      batchTitle: "Northbrook",
      batchId: `batch-${id}`,
      index: 1,
    },
    playerVisible: { rumour: `Rumour ${id}`, lead: `Lead ${id}` },
    gmOnly: { truth: `Independent truth for ${id}` },
  });
  return {
    ...state,
    knowledge,
    anchorRefs: [],
    revealedSecretIds: [],
    secretBindings: { truth: `truth-${id}`, eventIds: {} },
  };
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
    let session = addConcurrentScenarios(baseline());
    for (let turn = 0; turn < 30; turn += 1) session = playTurn(session, turn);

    expect(session.turns).toHaveLength(30);
    expect(session.turns[7]?.rollOutcome?.value).toBe(13);
    expect(session.turns[20]?.playerAction).toBe("Return to the mill");
    expect(session.scenarioCollection?.items[0]?.status).toBe("open");
    expect(session.scenarioCollection?.items[0]?.events).toHaveLength(1);
    expect(session.scenarioCollection?.items[0]?.gmOnly.truth).toBe(truth);
    expect(session.scenarioCollection?.items).toHaveLength(3);
    expect(session.scenarioCollection?.items[1]?.status).toBe("resolved");
    expect(session.scenarioCollection?.items[2]?.knowledge).toBe("unheard");
    expect(
      JSON.stringify(
        session.scenarioCollection?.items
          .filter((item) => item.knowledge === "heard")
          .map((item) => item.id),
      ),
    ).not.toContain("rumour-6");
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
      JSON.stringify(JSON.parse(prompt.state).playerScenarios),
    ).not.toContain(truth);
    expect(
      JSON.parse(prompt.state)["GM-ONLY scenarios"][0].baselineTruth.truth,
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
      applyCompletedTurn(first.value, ordinaryTurn(0), {
        turnId: "turn-retry",
        inputId: "input-0",
        now,
      }),
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
    expect(next.value.scenarioCollection?.items[0]?.status).toBe("open");
    expect(next.value.visibleState.objectives).toEqual([]);
    expect(next.value.turns[0].narration).toContain("quiet day");
  });
});

function addConcurrentScenarios(session: AdventureSession): AdventureSession {
  for (const item of [
    scenarioItem("rumour-5", "heard"),
    scenarioItem("rumour-6", "unheard"),
  ]) {
    const result = addScenario(session, item, session.revision, now);
    if (!result.ok) throw new Error("scenario add failed");
    session = result.session;
  }
  return session;
}

function playTurn(session: AdventureSession, turn: number): AdventureSession {
  const meta = {
    turnId: `turn-${turn}`,
    inputId: `input-${turn}`,
    playerAction: turn >= 15 ? "Return to the mill" : `Player action ${turn}`,
    now,
  };
  const played =
    turn === 7
      ? resolveRollTurn(session, meta)
      : completeTurn(session, turn, meta);
  return applyScenarioMilestones(played, turn, meta.turnId);
}

function completeTurn(
  session: AdventureSession,
  turn: number,
  meta: { turnId: string; inputId: string; playerAction: string; now: string },
): AdventureSession {
  const result = applyCompletedTurn(session, ordinaryTurn(turn), meta);
  if (!result.ok) throw new Error("turn failed");
  return result.value;
}

function resolveRollTurn(
  session: AdventureSession,
  meta: { turnId: string; inputId: string; playerAction: string; now: string },
): AdventureSession {
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
  if (!requested.ok) throw new Error("roll request failed");
  const recorded = recordPendingRollOutcome(
    requested.value,
    meta.inputId,
    { kind: "numeric", value: 13 },
    meta,
  );
  if (!recorded.ok) throw new Error("roll recording failed");
  const reloaded = parseAdventureSession(
    JSON.parse(JSON.stringify(recorded.value)),
  );
  expect(reloaded.pendingRoll?.suppliedOutcome).toEqual({
    kind: "numeric",
    value: 13,
  });
  const resolved = resolveRecordedRoll(reloaded, ordinaryTurn(7), meta);
  if (!resolved.ok) throw new Error("roll resolution failed");
  return resolved.value;
}

function applyScenarioMilestones(
  session: AdventureSession,
  turn: number,
  turnId: string,
): AdventureSession {
  if (turn === 5 || turn === 15) session = focus(session, "rumour-5");
  if (turn === 9 || turn === 18) session = focus(session, "rumour-4");
  if (turn === 10) session = appendFirstClue(session, turnId);
  if (turn === 20) session = resolveRumour(session);
  return session;
}

function focus(
  session: AdventureSession,
  scenarioId: string,
): AdventureSession {
  const result = setScenarioFocus(session, scenarioId, session.revision, now);
  if (!result.ok) throw new Error("focus failed");
  return result.session;
}

function appendFirstClue(
  session: AdventureSession,
  turnId: string,
): AdventureSession {
  const result = commitScenarioEvent(
    session,
    {
      id: "event-first-clue",
      kind: "discovery",
      visibility: "player",
      text: "The mill is unoccupied at midday.",
      at: now,
      turnId,
    },
    "open",
    session.revision,
  );
  if (!result.ok) throw new Error("scenario progression failed");
  const revision = result.session.revision;
  const reloaded = parseAdventureSession(
    JSON.parse(JSON.stringify(result.session)),
  );
  expect(reloaded.revision).toBe(revision);
  return reloaded;
}

function resolveRumour(session: AdventureSession): AdventureSession {
  const result = setScenarioStatus(
    session,
    "rumour-5",
    "resolved",
    session.revision,
    {
      id: "rumour-5-resolved",
      kind: "status-change",
      visibility: "player",
      text: "The player resolved this lead.",
      at: now,
    },
    now,
  );
  if (!result.ok) throw new Error("resolve failed");
  return result.session;
}
