import { describe, expect, it } from "vitest";
import {
  commitScenarioEvent,
  createScenarioState,
  parseAdventureSession,
  playerScenarioProjection,
} from "../src";
import type { AdventureSession, ScenarioSeed } from "../src";

const at = "2026-11-01T10:00:00.000Z";
const seed: ScenarioSeed = {
  id: "rumour-4",
  origin: {
    kind: "rumour",
    batchTitle: "Northbrook",
    index: 4,
    sourceRecordId: "secret-note",
  },
  playerVisible: {
    rumour: "The miller has vanished.",
    lead: "Old Mill",
    source: "The innkeeper",
  },
  gmOnly: {
    truth: "The miller is hiding grain under the mill.",
    ifInvestigated: "A second set of bootprints",
  },
};

function exampleSession(
  scenarioState = createScenarioState(seed),
): AdventureSession {
  return parseAdventureSession({
    schemaVersion: 2,
    id: "adventure-1",
    vaultId: "vault-1",
    title: "Northbrook",
    status: "active",
    createdAt: at,
    updatedAt: at,
    lastPlayedAt: at,
    revision: 1,
    playerCharacter: {
      kind: "provisional",
      name: "Kael",
      description: "A traveler",
    },
    premise: "Visit Northbrook",
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
    scenarioState,
  });
}

describe("Adventure scenario state", () => {
  it("persists a versioned scenario in the existing Adventure session", () => {
    const restored = parseAdventureSession(
      JSON.parse(JSON.stringify(exampleSession())),
    );
    expect(restored.scenarioCollection?.items[0]?.origin.index).toBe(4);
    expect(restored.scenarioCollection?.items[0]?.gmOnly.truth).toBe(
      seed.gmOnly.truth,
    );
    expect(restored.schemaVersion).toBe(3);
  });

  it("keeps GM truth out of the player projection and observed events", () => {
    const session = exampleSession();
    const projection = playerScenarioProjection(
      session.scenarioCollection!.items[0]!,
    );
    expect(JSON.stringify(projection)).not.toContain("grain under the mill");
    expect(JSON.stringify(projection)).not.toContain("secret-note");
    expect(JSON.stringify(projection)).toContain("The miller has vanished");
  });

  it("commits visible and GM-only events once without mutating the original", () => {
    const original = exampleSession();
    const first = commitScenarioEvent(
      original,
      {
        id: "event-1",
        kind: "discovery",
        visibility: "player",
        text: "There are fresh prints.",
        at,
        turnId: "turn-1",
      },
      "open",
      1,
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(original.scenarioCollection?.items[0]?.events).toEqual([]);
    expect(first.session.revision).toBe(2);
    expect(
      playerScenarioProjection(first.session.scenarioCollection!.items[0]!)
        .events,
    ).toHaveLength(1);
    expect(
      commitScenarioEvent(
        first.session,
        {
          id: "event-1",
          kind: "discovery",
          visibility: "player",
          text: "There are fresh prints.",
          at,
        },
        "open",
        2,
      ),
    ).toEqual({ ok: false, reason: "duplicate-event" });
    expect(
      commitScenarioEvent(
        first.session,
        {
          id: "event-2",
          kind: "consequence",
          visibility: "gm",
          text: "Smugglers will depart at night.",
          at,
        },
        "resolved",
        1,
      ),
    ).toEqual({ ok: false, reason: "stale-revision" });
    const second = commitScenarioEvent(
      first.session,
      {
        id: "event-2",
        kind: "consequence",
        visibility: "gm",
        text: "Smugglers will depart at night.",
        at,
      },
      "resolved",
      2,
      "event-2-secret",
    );
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.session.scenarioCollection?.items[0]?.status).toBe(
        "resolved",
      );
      expect(
        JSON.stringify(
          playerScenarioProjection(
            second.session.scenarioCollection!.items[0]!,
          ),
        ),
      ).not.toContain("Smugglers");
      expect(
        commitScenarioEvent(
          second.session,
          {
            id: "event-3",
            kind: "discovery",
            visibility: "player",
            text: "Another clue",
            at,
          },
          "open",
          3,
        ),
      ).toEqual({ ok: false, reason: "no-scenario" });
    }
  });

  it("loads ordinary Adventure Mode sessions without a scenario", () => {
    const { scenarioCollection: _scenarioCollection, ...legacy } =
      exampleSession();
    const restored = parseAdventureSession(legacy);
    expect(restored.scenarioCollection).toBeUndefined();
    expect(restored.schemaVersion).toBe(3);
  });

  it("rejects malformed hidden state and oversized histories on load", () => {
    const session = exampleSession();
    expect(() =>
      parseAdventureSession({
        ...session,
        scenarioCollection: { ...session.scenarioCollection!, version: 10 },
      }),
    ).toThrow();
    expect(() =>
      parseAdventureSession({
        ...session,
        scenarioCollection: {
          ...session.scenarioCollection!,
          items: [
            {
              ...session.scenarioCollection!.items[0]!,
              events: Array.from({ length: 101 }, (_, i) => ({
                id: "event-" + i,
                kind: "discovery",
                visibility: "player",
                text: "Clue",
                at,
              })),
            },
          ],
        },
      }),
    ).toThrow();
  });

  it("rejects a whitespace variant of a committed event id on replay", () => {
    const first = commitScenarioEvent(
      exampleSession(),
      {
        id: " event-1 ",
        kind: "discovery",
        visibility: "player",
        text: "Fresh prints.",
        at,
      },
      "open",
      1,
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.session.scenarioCollection?.items[0]?.events[0]?.id).toBe(
      "event-1",
    );
    for (const replayId of [" event-1 ", "event-1", "event-1  "]) {
      expect(
        commitScenarioEvent(
          first.session,
          {
            id: replayId,
            kind: "discovery",
            visibility: "player",
            text: "Fresh prints.",
            at,
          },
          "open",
          2,
        ),
      ).toEqual({ ok: false, reason: "duplicate-event" });
    }
  });

  it("reports a field-limit failure as an invalid event, not a full budget", () => {
    expect(
      commitScenarioEvent(
        exampleSession(),
        {
          id: "event-long",
          kind: "discovery",
          visibility: "player",
          text: "x".repeat(601),
          at,
        },
        "open",
        1,
      ),
    ).toEqual({ ok: false, reason: "invalid-event" });
  });

  it("reports a full event history as state-budget-exceeded", () => {
    const full = createScenarioState(seed);
    full.events = Array.from({ length: 100 }, (_, i) => ({
      id: "event-" + i,
      kind: "discovery" as const,
      visibility: "player" as const,
      text: "Clue",
      at,
    }));
    expect(
      commitScenarioEvent(
        exampleSession(full),
        {
          id: "event-100",
          kind: "discovery",
          visibility: "player",
          text: "One more clue",
          at,
        },
        "open",
        1,
      ),
    ).toEqual({ ok: false, reason: "state-budget-exceeded" });
  });
});
