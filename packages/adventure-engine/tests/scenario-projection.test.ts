import { describe, expect, it } from "vitest";
import {
  applyCompletedTurn,
  worldEntryPacing,
  buildAdventurePrompt,
  createScenarioState,
  detectHiddenLeakage,
  parseAdventureSession,
  playerScenarioCollectionProjection,
} from "../src";
import type { AdventureSession, ScenarioItem } from "../src";

const at = "2026-11-02T10:00:00.000Z";
function item(
  id: string,
  knowledge: ScenarioItem["knowledge"],
  truth: string,
): ScenarioItem {
  return {
    ...createScenarioState({
      id,
      origin: {
        kind: "rumour",
        batchTitle: "Town",
        batchId: `batch-${id}`,
        index: 1,
      },
      playerVisible: { rumour: `Rumour ${id}`, lead: `Lead ${id}` },
      gmOnly: { truth },
    }),
    knowledge,
    anchorRefs: [],
    revealedSecretIds: [],
    secretBindings: { truth: `secret-${id}`, eventIds: {} },
  };
}
function session(items: ScenarioItem[]): AdventureSession {
  return parseAdventureSession({
    schemaVersion: 3,
    id: "adventure",
    vaultId: "vault",
    title: "Town",
    status: "active",
    createdAt: at,
    updatedAt: at,
    lastPlayedAt: at,
    revision: 0,
    playerCharacter: { kind: "provisional", name: "A", description: "B" },
    premise: "P",
    sourceRecords: [],
    visibleState: {
      objectives: [],
      activeCharacters: [],
      knownFacts: [],
      relationships: [],
    },
    hiddenState: { secrets: [], gmThreads: [] },
    provisionalFacts: [],
    turns: [],
    pendingRoll: null,
    dicePresets: [],
    resourceCounters: [],
    scenarioCollection: { version: 1, items, focusedScenarioId: null },
  });
}

describe("scenario player projection and disclosure", () => {
  it("omits all unheard identities, content and counts from player output", () => {
    const projected = playerScenarioCollectionProjection(
      session([
        item("heard", "heard", "Known hidden truth"),
        item("unheard-secret-id", "unheard", "Unknown secret truth"),
      ]),
    );
    expect(projected.items).toHaveLength(1);
    expect(JSON.stringify(projected)).toContain("Lead heard");
    expect(JSON.stringify(projected)).not.toContain("unheard-secret-id");
    expect(JSON.stringify(projected)).not.toContain("Unknown secret truth");
  });

  it("blocks equal-text disclosure while an independent scenario remains unrevealed", () => {
    const current = session([
      item("a", "heard", "The same hidden sentence."),
      item("b", "heard", "The same hidden sentence."),
    ]);
    const findings = detectHiddenLeakage(current, {
      kind: "complete",
      narration: "The same hidden sentence.",
      revealSecretIds: ["secret-a"],
      visiblePatch: {
        objectives: { add: [], update: [], removeIds: [] },
        activeCharacters: { add: [], update: [], removeIds: [] },
        knownFacts: { add: [], update: [], removeIds: [] },
        relationships: { add: [], update: [], removeIds: [] },
      },
      hiddenPatch: {
        secrets: { add: [], update: [], removeIds: [] },
        gmThreads: { add: [], update: [], removeIds: [] },
      },
      provisionalFacts: [],
      sourceRecordIds: [],
    });
    expect(findings).toContainEqual({
      field: "root.narration",
      secretId: "secret-b",
    });
    expect(current.scenarioCollection?.items[1]?.revealedSecretIds).toEqual([]);
  });

  it("commits a heard transition in the same turn and rejects an unknown target atomically", () => {
    const current = session([
      item("new-lead", "unheard", "A hidden baseline."),
    ]);
    current.worldEntry = {
      version: 1,
      location: { kind: "provisional", name: "Town" },
      intent: "explore",
    };
    expect(worldEntryPacing(current)).toEqual({
      quietTurns: 0,
      signDue: false,
    });
    expect(
      buildAdventurePrompt({
        session: current,
        phase: "action",
        anchors: [],
        relevant: [],
      }).behavior,
    ).toContain("revealScenarioIds");
    const proposal = {
      kind: "complete" as const,
      narration: "A local points out the old cellar.",
      visiblePatch: {
        objectives: { add: [], update: [], removeIds: [] },
        activeCharacters: { add: [], update: [], removeIds: [] },
        knownFacts: { add: [], update: [], removeIds: [] },
        relationships: { add: [], update: [], removeIds: [] },
      },
      hiddenPatch: {
        secrets: { add: [], update: [], removeIds: [] },
        gmThreads: { add: [], update: [], removeIds: [] },
      },
      revealSecretIds: [],
      revealScenarioIds: ["new-lead"],
      provisionalFacts: [],
      sourceRecordIds: [],
    };
    const committed = applyCompletedTurn(current, proposal, {
      turnId: "turn-1",
      inputId: "input-1",
      now: at,
    });
    expect(committed.ok).toBe(true);
    if (committed.ok) {
      expect(
        committed.value.scenarioCollection?.items[0]?.events[0],
      ).toMatchObject({
        kind: "discovery",
        turnId: "turn-1",
        visibility: "player",
      });
      expect(worldEntryPacing(committed.value)).toBeUndefined();
      const waiting = {
        ...committed.value,
        scenarioCollection: {
          ...committed.value.scenarioCollection!,
          items: [
            ...committed.value.scenarioCollection!.items,
            item("still-hidden", "unheard", "Another truth"),
          ],
        },
        turns: [
          ...committed.value.turns,
          ...Array.from({ length: 3 }, (_, i) => ({
            ...committed.value.turns[0]!,
            id: `quiet-${i}`,
            revealedSecretIds: [],
            hiddenPatch: proposal.hiddenPatch,
          })),
        ],
      };
      expect(worldEntryPacing(waiting)).toEqual({
        quietTurns: 3,
        signDue: true,
      });
      expect(
        buildAdventurePrompt({
          session: waiting,
          phase: "action",
          anchors: [],
          relevant: [],
        }).behavior,
      ).toContain("PACING:");

      expect(committed.value.turns[0]?.id).toBe("turn-1");
      expect(committed.value.scenarioCollection?.items[0]?.knowledge).toBe(
        "heard",
      );
    }
    const invalid = applyCompletedTurn(
      current,
      { ...proposal, revealScenarioIds: ["unknown"] },
      { turnId: "turn-2", inputId: "input-2", now: at },
    );
    expect(invalid).toMatchObject({ ok: false });
    expect(current.scenarioCollection?.items[0]?.knowledge).toBe("unheard");
    expect(current.turns).toEqual([]);
  });
});
