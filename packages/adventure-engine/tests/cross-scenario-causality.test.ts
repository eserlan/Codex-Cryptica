import { describe, expect, it } from "vitest";
import {
  createScenarioState,
  parseAdventureSession,
  playerScenarioCollectionProjection,
  propagateKnownConsequence,
  type AdventureSession,
  type ScenarioItem,
  type ScenarioSeed,
} from "../src";

const at = "2026-11-10T12:00:00.000Z";

function scenario(
  id: string,
  anchorRef: string,
  knowledge: ScenarioItem["knowledge"] = "heard",
): ScenarioItem {
  const seed: ScenarioSeed = {
    id,
    origin: { kind: "manual", manualId: id },
    playerVisible: { rumour: `Rumour ${id}`, lead: `Lead ${id}` },
    gmOnly: { truth: `Hidden truth ${id}` },
  };
  return {
    ...createScenarioState(seed),
    knowledge,
    anchorRefs: [anchorRef],
    revealedSecretIds: [],
    secretBindings: { truth: `secret-${id}`, eventIds: {} },
    events: id === "mill"
      ? [{ id: "shortage", kind: "consequence", visibility: "player", text: "The grain supply stopped", at }]
      : [],
  };
}

function session(): AdventureSession {
  return parseAdventureSession({
    schemaVersion: 3,
    id: "causal-session",
    vaultId: "vault",
    title: "Three stories",
    status: "active",
    createdAt: at,
    updatedAt: at,
    lastPlayedAt: at,
    revision: 2,
    playerCharacter: { kind: "provisional", name: "Mara", description: "Scout" },
    premise: "Explore",
    sourceRecords: [],
    visibleState: { objectives: [], activeCharacters: [], knownFacts: [], relationships: [] },
    hiddenState: { secrets: [], gmThreads: [] },
    provisionalFacts: [],
    turns: [],
    pendingRoll: null,
    dicePresets: [],
    resourceCounters: [],
    scenarioCollection: {
      version: 1,
      focusedScenarioId: "mill",
      items: [
        scenario("mill", "grain"),
        scenario("trader", "grain"),
        scenario("hill-lights", "forest"),
        scenario("secret", "grain", "unheard"),
      ],
    },
  });
}

const consequence = {
  sourceScenarioId: "mill",
  sourceEventId: "shortage",
  targetScenarioId: "trader",
  anchorRef: "grain",
  eventId: "grain-impact-1",
  text: "The trader now lacks grain deliveries",
  at,
};

describe("explicit cross-scenario causality", () => {
  it("commits a traceable effect once between two known linked situations", () => {
    const initial = session();
    const first = propagateKnownConsequence(initial, consequence, 2);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.session.revision).toBe(3);
    expect(initial.scenarioCollection?.items[1]?.events).toEqual([]);
    const trader = first.session.scenarioCollection?.items[1];
    expect(trader?.events).toHaveLength(1);
    expect(trader?.events[0]?.causedBy).toEqual({
      scenarioId: "mill",
      eventId: "shortage",
      anchorRef: "grain",
    });
    expect(propagateKnownConsequence(first.session, consequence, 3)).toMatchObject({
      ok: true,
      changed: false,
    });
    const publicView = playerScenarioCollectionProjection(first.session);
    expect(JSON.stringify(publicView)).toContain("trader now lacks grain");
    expect(JSON.stringify(publicView)).not.toContain("Hidden truth");
    expect(JSON.stringify(publicView)).not.toContain("grain-impact-1:secret");
  });

  it("rejects unrelated, hidden, self-linked and stale cross-scenario effects", () => {
    const initial = session();
    expect(propagateKnownConsequence(initial, { ...consequence, targetScenarioId: "hill-lights" }, 2)).toMatchObject({
      ok: false, reason: "invalid-scenario",
    });
    expect(propagateKnownConsequence(initial, { ...consequence, targetScenarioId: "secret" }, 2)).toMatchObject({
      ok: false, reason: "scenario-not-heard",
    });
    expect(propagateKnownConsequence(initial, { ...consequence, targetScenarioId: "mill" }, 2)).toMatchObject({
      ok: false, reason: "invalid-scenario",
    });
    expect(propagateKnownConsequence(initial, consequence, 1)).toMatchObject({
      ok: false, reason: "stale-revision",
    });
    expect(initial.scenarioCollection?.items[1]?.events).toEqual([]);
  });

  it("cannot propagate an unobserved event or overwrite a settled target", () => {
    const initial = session();
    expect(propagateKnownConsequence(initial, { ...consequence, sourceEventId: "unknown" }, 2)).toMatchObject({
      ok: false, reason: "invalid-scenario",
    });
    const settled = structuredClone(initial);
    settled.scenarioCollection!.items[1]!.status = "resolved";
    expect(propagateKnownConsequence(settled, consequence, 2)).toMatchObject({
      ok: false, reason: "invalid-transition",
    });
  });
});
