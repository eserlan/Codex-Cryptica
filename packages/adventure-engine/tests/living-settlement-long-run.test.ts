import { describe, expect, it } from "vitest";
import {
  appendScenarioEvent,
  applyCompletedTurn,
  applyRollRequest,
  applyScenarioTimePressures,
  buildAdventureRecap,
  buildStorySummaryRequest,
  createPlayerTranscript,
  createScenarioState,
  detectHiddenLeakage,
  evaluateAdventureRun,
  parseAdventureSession,
  parseTurnProposal,
  playerScenarioCollectionProjection,
  projectVisibleState,
  propagateKnownConsequence,
  recordPendingRollOutcome,
  setScenarioStatus,
  SUMMARY_TRIGGER_TURNS,
} from "../src";
import {
  completeLivingProposal,
  createLivingSettlementReadyMadeSession,
  createLivingSettlementWorldEntrySession,
  LIVING_SETTLEMENT_CANARIES,
  LIVING_SETTLEMENT_NOW,
  runLivingSettlementLongRun,
} from "./living-settlement-fixture";

describe("Living Settlement 50+ turn multi-scenario suite", () => {
  it("completes 56 turns from a ready-made start with full rubric score 1, rolling summaries, causality, and secrecy", () => {
    const start = createLivingSettlementReadyMadeSession();
    const outcome = runLivingSettlementLongRun(start, 56);

    expect(outcome.session.turns.length).toBe(56);
    expect(outcome.summariesAttached).toBeGreaterThanOrEqual(4);
    expect(outcome.pressureTriggerCount).toBe(0);
    expect(outcome.session.storySoFar?.throughSequence).toBeGreaterThanOrEqual(
      56 - SUMMARY_TRIGGER_TURNS * 2,
    );

    const cooper = outcome.session.scenarioCollection?.items.find(
      (i) => i.id === "scen-missing-cooper",
    );
    const grain = outcome.session.scenarioCollection?.items.find(
      (i) => i.id === "scen-grain-shortage",
    );
    const bell = outcome.session.scenarioCollection?.items.find(
      (i) => i.id === "scen-bell-ghost",
    );

    expect(cooper?.status).toBe("abandoned");
    expect(cooper?.pressure?.triggeredAtMinute).toBeGreaterThanOrEqual(240);
    expect(
      cooper?.events.some(
        (e) =>
          e.causedBy?.scenarioId === "scen-grain-shortage" &&
          e.causedBy.anchorRef === "canon-actor-harbourmaster",
      ),
    ).toBe(true);
    expect(grain?.status).toBe("open");
    expect(bell?.status).toBe("resolved");

    const rubric = evaluateAdventureRun(
      outcome.evaluationTurns,
      LIVING_SETTLEMENT_CANARIES,
    );
    expect(rubric.passed).toBe(true);
    expect(rubric.failures).toEqual([]);
    expect(rubric.scores).toEqual({
      agency: 1,
      secrecy: 1,
      continuity: 1,
      canonSafety: 1,
      consequenceCredibility: 1,
      unnecessaryEscalation: 1,
    });

    // Strict secrecy across all player-facing projections
    const playerView = JSON.stringify({
      scenarios: playerScenarioCollectionProjection(outcome.session),
      visible: projectVisibleState(outcome.session),
      recap: buildAdventureRecap(outcome.session),
      transcript: createPlayerTranscript(outcome.session),
      storySoFar: outcome.session.storySoFar,
    });
    for (const canary of LIVING_SETTLEMENT_CANARIES) {
      expect(playerView).not.toContain(canary);
    }
  });

  it("completes 56 turns from a World Entry (explore) start preserving worldEntry and continuity", () => {
    const start = createLivingSettlementWorldEntrySession();
    expect(start.worldEntry?.intent).toBe("explore");

    const outcome = runLivingSettlementLongRun(start, 56);
    expect(outcome.session.turns.length).toBe(56);
    expect(outcome.session.worldEntry?.intent).toBe("explore");
    expect(outcome.session.places?.length).toBeGreaterThanOrEqual(2);
    expect(outcome.session.people?.some((p) => p.id === "person-venn")).toBe(
      true,
    );
    expect(
      outcome.session.turns.some((t) => t.resolvedRoll?.outcome.value === 9),
    ).toBe(true);

    const rubric = evaluateAdventureRun(
      outcome.evaluationTurns,
      LIVING_SETTLEMENT_CANARIES,
    );
    expect(rubric.passed).toBe(true);
  });

  it("enforces causal fairness, duplicate rejection, worldTime bounds, and stale-revision protection", () => {
    const outcome = runLivingSettlementLongRun(
      createLivingSettlementReadyMadeSession(),
      30,
    );
    const session = outcome.session;

    // 1. Unknown timeAdvance threadId is dropped without advancing clock
    const prevElapsed = session.worldTime?.elapsedMinutes ?? 0;
    const unknownThread = applyCompletedTurn(
      session,
      completeLivingProposal({
        timeAdvance: {
          minutes: 10,
          cause: "Wait",
          developments: [{ threadId: "nonexistent-thread", text: "Ghost" }],
        },
      }),
      {
        turnId: "turn-drop-1",
        inputId: "input-drop-1",
        now: "2026-11-10T15:00:00.000Z",
      },
    );
    expect(unknownThread.ok).toBe(true);
    if (unknownThread.ok) {
      expect(unknownThread.value.worldTime?.elapsedMinutes).toBe(prevElapsed);
      expect(unknownThread.value.turns.at(-1)?.dropped?.length).toBeGreaterThan(
        0,
      );
    }

    // 2. Duplicate inputId rejected
    const duplicateInput = applyCompletedTurn(
      session,
      completeLivingProposal(),
      {
        turnId: "turn-dup",
        inputId: session.turns[0]!.inputId,
        now: "2026-11-10T15:01:00.000Z",
      },
    );
    expect(duplicateInput.ok).toBe(false);
    if (!duplicateInput.ok) {
      expect(duplicateInput.errors[0]?.code).toBe("duplicate-input");
    }

    // 3. 2-hop propagateKnownConsequence chain rejected
    const twoHop = propagateKnownConsequence(
      session,
      {
        sourceScenarioId: "scen-missing-cooper",
        sourceEventId: "evt-cooper-prop",
        targetScenarioId: "scen-grain-shortage",
        anchorRef: "canon-actor-harbourmaster",
        eventId: "evt-two-hop",
        text: "Should be rejected",
        at: "2026-11-10T15:02:00.000Z",
      },
      session.revision,
    );
    expect(twoHop.ok).toBe(false);

    // 4. Unanchored / resolved target rejected
    const unanchored = propagateKnownConsequence(
      session,
      {
        sourceScenarioId: "scen-grain-shortage",
        sourceEventId: "evt-weighhouse-closure",
        targetScenarioId: "scen-bell-ghost",
        anchorRef: "canon-actor-harbourmaster",
        eventId: "evt-unanchored",
        text: "Should be rejected",
        at: "2026-11-10T15:03:00.000Z",
      },
      session.revision,
    );
    expect(unanchored.ok).toBe(false);

    // 5. Stale revision rejected on scenario commands
    const stale = setScenarioStatus(
      session,
      "scen-grain-shortage",
      "resolved",
      session.revision - 1,
      undefined,
      "2026-11-10T15:04:00.000Z",
    );
    expect(stale.ok).toBe(false);
    if (!stale.ok) expect(stale.reason).toBe("stale-revision");

    // 6. Duplicate event.id rejected/replayed without duplicating events
    const dupEvent = appendScenarioEvent(
      session,
      "scen-grain-shortage",
      {
        id: "evt-weighhouse-closure",
        kind: "consequence",
        visibility: "player",
        text: "Different text with same id",
        at: "2026-11-10T15:05:00.000Z",
      },
      session.revision,
    );
    expect(dupEvent.ok).toBe(false);

    // 7. worldTime bounds hold
    expect(session.worldTime?.elapsedMinutes).toBeLessThanOrEqual(52_560_000);
    const pressureAgain = applyScenarioTimePressures(
      session,
      (session.worldTime?.elapsedMinutes ?? 0) + 1000,
      "turn-extra-pressure",
      "2026-11-10T15:06:00.000Z",
    );
    expect(pressureAgain.ok).toBe(true);
    if (pressureAgain.ok) {
      expect(pressureAgain.events).toHaveLength(0);
    }
  });

  it("rejects hidden leakage, malformed proposals, preserves interrupted roll outcomes, and migrates v2 sessions", () => {
    const session = createLivingSettlementReadyMadeSession();

    // 1. detectHiddenLeakage catches unrevealed secrets in narration, patches, or suggestions
    const cooperTruth = session.scenarioCollection!.items[0]!.gmOnly.truth;
    const vaultSecret = session.hiddenState.secrets[0]!.text;
    const leaky = completeLivingProposal({
      narration: `Someone whispers: ${cooperTruth}`,
      suggestedActions: [
        `Ask about ${vaultSecret}`,
        "Check the quay",
        "Return to the inn",
      ],
    });
    expect(detectHiddenLeakage(session, leaky).length).toBeGreaterThan(0);
    const rejected = applyCompletedTurn(session, leaky, {
      turnId: "turn-leak",
      inputId: "input-leak",
      now: LIVING_SETTLEMENT_NOW,
    });
    expect(rejected.ok).toBe(false);

    // 2. Malformed proposal fails parseTurnProposal without mutating session
    const snapshot = JSON.stringify(session);
    expect(() =>
      parseTurnProposal({ kind: "complete", narration: 123 } as any),
    ).toThrow();
    expect(JSON.stringify(session)).toBe(snapshot);

    // 3. Interrupted roll resolution preserves pendingRoll.suppliedOutcome
    const req = applyRollRequest(
      session,
      {
        kind: "roll-required",
        setupNarration: "You reach for the rusted latch.",
        uncertainty: "Does it give way?",
        stakes: "Noise could alert the watch.",
        sourceRecordIds: [],
      },
      {
        turnId: "turn-roll-int",
        inputId: "input-roll-int",
        now: LIVING_SETTLEMENT_NOW,
      },
    );
    expect(req.ok).toBe(true);
    if (req.ok) {
      const rec = recordPendingRollOutcome(
        req.value,
        "input-roll-int",
        { kind: "numeric", value: 14 },
        {
          turnId: "turn-roll-rec",
          inputId: "input-roll-int",
          now: LIVING_SETTLEMENT_NOW,
        },
      );
      expect(rec.ok).toBe(true);
      if (rec.ok) {
        const reloaded = parseAdventureSession(
          JSON.parse(JSON.stringify(rec.value)),
        );
        expect(reloaded.pendingRoll?.suppliedOutcome).toEqual({
          kind: "numeric",
          value: 14,
        });
        expect(reloaded.pendingRoll?.resolutionStatus).toBe("ready-to-resolve");
      }
    }

    // 4. Legacy v2 session migrates cleanly via parseAdventureSession
    const legacyV2 = parseAdventureSession({
      schemaVersion: 2,
      id: "legacy-v2-session",
      vaultId: "vault-1",
      title: "Legacy Settlement",
      status: "active",
      createdAt: LIVING_SETTLEMENT_NOW,
      updatedAt: LIVING_SETTLEMENT_NOW,
      lastPlayedAt: LIVING_SETTLEMENT_NOW,
      revision: 0,
      playerCharacter: {
        kind: "provisional",
        name: "Mara",
        description: "Traveler",
      },
      premise: "Foggy harbour",
      sourceRecords: [],
      visibleState: {
        objectives: [],
        activeCharacters: [],
        knownFacts: [],
        relationships: [],
      },
      hiddenState: {
        secrets: [
          { id: "sec-legacy", text: "Legacy secret", status: "hidden" },
        ],
        gmThreads: [
          { id: "thread-legacy", text: "Harbour watch", status: "hidden" },
        ],
      },
      provisionalFacts: [],
      turns: [],
      pendingRoll: null,
      dicePresets: [],
      resourceCounters: [],
      scenarioState: createScenarioState({
        id: "legacy-scen",
        origin: { kind: "rumour", batchTitle: "Harbour", index: 1 },
        playerVisible: { rumour: "Missing barge", lead: "South Pier" },
        gmOnly: { truth: "Barge was scuttled for insurance." },
      }),
    });

    expect(legacyV2.schemaVersion).toBe(3);
    expect(legacyV2.scenarioCollection?.items).toHaveLength(1);
    expect(legacyV2.scenarioCollection?.items[0]?.gmOnly.truth).toBe(
      "Barge was scuttled for insurance.",
    );
    expect(legacyV2.hiddenState.gmThreads[0]?.id).toBe("thread-legacy");
    expect(buildStorySummaryRequest(legacyV2)).toBeUndefined();
  });
});
