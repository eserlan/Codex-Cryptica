import { describe, expect, it } from "vitest";
import {
  MAX_SERIALIZED_STATE_CHARS,
  migrateAdventureSession,
  parseAdventureSession,
  parseAdventureSessionForRecovery,
} from "../src";

const at = "2026-11-01T10:00:00.000Z";

function legacy(version: 1 | 2, scenarioState?: unknown) {
  return {
    schemaVersion: version,
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
    ...(version === 2 ? { dicePresets: [], resourceCounters: [] } : {}),
    ...(scenarioState ? { scenarioState } : {}),
  };
}

const oldScenario = {
  version: 1,
  id: "rumour-4",
  origin: { kind: "rumour", batchTitle: "Northbrook", index: 4 },
  playerVisible: { rumour: "The miller has vanished.", lead: "Old Mill" },
  gmOnly: { truth: "The miller is hiding grain under the mill." },
  status: "open",
  events: [],
};

describe("scenario v3 migration", () => {
  it("upgrades ordinary v1 and v2 sessions without creating scenarios", () => {
    for (const input of [legacy(1), legacy(2)]) {
      expect(parseAdventureSession(input)).toMatchObject({
        schemaVersion: 3,
      });
    }
  });

  it("migrates the singular scenario as heard and leaves input unchanged", () => {
    const input = legacy(2, oldScenario);
    const before = structuredClone(input);
    expect(parseAdventureSession(input)).toMatchObject({
      scenarioCollection: {
        version: 1,
        focusedScenarioId: "rumour-4",
        items: [{ id: "rumour-4", knowledge: "heard", status: "open" }],
      },
    });
    expect(input).toEqual(before);
  });

  it("preserves registered reveal and legacy world-time thread identities across repeated parses", () => {
    const scenario = {
      ...oldScenario,
      events: [
        {
          id: "gm-1",
          kind: "consequence",
          visibility: "gm",
          text: "The guard changed shifts.",
          at,
        },
      ],
    };
    const input = legacy(2, scenario) as Record<string, any>;
    input.hiddenState = {
      secrets: [
        {
          id: "unrelated-equal-text",
          text: scenario.gmOnly.truth,
          status: "hidden",
        },
        {
          id: "scenario-baseline-truth",
          text: scenario.gmOnly.truth,
          status: "revealed",
          revealedOnTurnId: "turn-1",
        },
        {
          id: "scenario-event-gm-1",
          text: "The guard changed shifts.",
          status: "revealed",
          revealedOnTurnId: "turn-1",
        },
      ],
      gmThreads: [
        { id: "legacy-thread", text: "Old background", status: "hidden" },
      ],
    };
    const emptyPatch = { add: [], update: [], removeIds: [] };
    input.turns = [
      {
        id: "turn-1",
        sequence: 0,
        inputId: "input-1",
        playerAction: "",
        narration: "A change.",
        visiblePatch: {
          objectives: emptyPatch,
          activeCharacters: emptyPatch,
          knownFacts: emptyPatch,
          relationships: emptyPatch,
        },
        hiddenPatch: { secrets: emptyPatch, gmThreads: emptyPatch },
        revealedSecretIds: ["scenario-baseline-truth", "scenario-event-gm-1"],
        sourceRecordIds: [],
        provisionalFactIds: [],
        committedAt: at,
      },
    ];
    input.worldTime = {
      version: 1,
      elapsedMinutes: 10,
      events: [
        {
          id: "time-1",
          turnId: "turn-1",
          atMinute: 10,
          threadId: "legacy-thread",
          text: "A change.",
        },
      ],
    };
    const once = parseAdventureSession(input);
    const twice = parseAdventureSession(once);
    expect(twice.scenarioCollection?.items[0]?.secretBindings).toMatchObject({
      truth: "scenario-baseline-truth",
      eventIds: { "gm-1": "scenario-event-gm-1" },
    });
    expect(twice.scenarioCollection?.items[0]?.revealedSecretIds).toEqual([
      "scenario-baseline-truth",
      "scenario-event-gm-1",
    ]);
    expect(twice.turns[0]?.revealedSecretIds).toEqual([
      "scenario-baseline-truth",
      "scenario-event-gm-1",
    ]);
    expect(twice.worldTime?.events[0]?.threadId).toBe("legacy-thread");
    expect(input.schemaVersion).toBe(2);
  });

  it("rejects mixed representations and unknown future versions", () => {
    expect(() =>
      parseAdventureSession({
        ...legacy(3),
        scenarioState: oldScenario,
        scenarioCollection: { version: 1, items: [], focusedScenarioId: null },
      }),
    ).toThrow();
    expect(() =>
      parseAdventureSession({ ...legacy(3), schemaVersion: 4 }),
    ).toThrow("incompatible-version");
  });

  it("returns validated legacy bytes as read-only recovery when v3 metadata exceeds the old budget", () => {
    const legacyWithEvents = {
      ...oldScenario,
      events: Array.from({ length: 50 }, (_, index) => ({
        id: `event-${index}`,
        kind: "discovery",
        visibility: "gm",
        text: "A brief clue",
        at,
      })),
    };
    const base = legacy(2, legacyWithEvents) as Record<string, any>;
    let recovery: ReturnType<typeof parseAdventureSessionForRecovery> | null =
      null;
    for (let count = 20; count < 55 && !recovery; count += 1) {
      const facts = Array.from({ length: count }, (_, index) => ({
        id: `fact-${index}`,
        text: "x".repeat(580),
        source: "provisional",
      }));
      facts[facts.length - 1]!.text = "x";
      const input = structuredClone(base);
      input.visibleState.knownFacts = facts;
      const legacyState = (document: Record<string, any>) =>
        JSON.stringify({
          visibleState: document.visibleState,
          hiddenState: document.hiddenState,
          provisionalFacts: document.provisionalFacts,
          scenarioState: document.scenarioState,
          worldEntry: document.worldEntry,
          worldTime: document.worldTime,
        }).length;
      const oldBaseLength = legacyState(input);
      const migrated = migrateAdventureSession(input) as Record<string, any>;
      const newBaseLength = JSON.stringify({
        visibleState: migrated.visibleState,
        hiddenState: migrated.hiddenState,
        provisionalFacts: migrated.provisionalFacts,
        scenarioCollection: migrated.scenarioCollection,
        worldEntry: migrated.worldEntry,
        worldTime: migrated.worldTime,
      }).length;
      const migrationGrowth = newBaseLength - oldBaseLength;
      const tailLength = MAX_SERIALIZED_STATE_CHARS - oldBaseLength + 1;
      if (migrationGrowth <= 0 || tailLength < 1 || tailLength > 600) continue;
      input.visibleState.knownFacts.at(-1)!.text = "x".repeat(tailLength);
      const parsed = parseAdventureSessionForRecovery(input);
      if (parsed.mode === "legacy-read-only-recovery") {
        recovery = parsed;
        expect(legacyState(input)).toBe(MAX_SERIALIZED_STATE_CHARS);
        expect(parsed.exportDocument).toEqual(input);
        expect(parsed.session.scenarioCollection?.items).toHaveLength(1);
      }
    }
    expect(recovery?.mode).toBe("legacy-read-only-recovery");
    const oversizedLegacy = structuredClone(
      (recovery as NonNullable<typeof recovery>).exportDocument,
    ) as Record<string, any>;
    oversizedLegacy.visibleState.knownFacts.at(-1)!.text += "x";
    expect(() => parseAdventureSessionForRecovery(oversizedLegacy)).toThrow(
      "state-budget-exceeded",
    );
  });
});
