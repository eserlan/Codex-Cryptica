import { describe, expect, it } from "vitest";
import {
  candidateScenariosForLocation,
  currentLocationContext,
  matchesScenarioLocation,
  needsContextualRumours,
  pruneUnheardScenariosForNewBatch,
  MAX_SCENARIO_COLLECTION_ITEMS,
} from "../src/contextual-rumours";
import type { AdventureSession, ScenarioItem } from "../src/types";

function mockSession(
  overrides: Partial<AdventureSession> = {},
): AdventureSession {
  return {
    schemaVersion: 3,
    id: "session-1",
    vaultId: "vault-1",
    title: "Test Adventure",
    premise: "Test Premise",
    revision: 1,
    status: "active",
    playerCharacter: {
      kind: "provisional",
      name: "Aria",
      description: "Scout",
    },
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
    createdAt: "2026-11-05T12:00:00Z",
    updatedAt: "2026-11-05T12:00:00Z",
    lastPlayedAt: "2026-11-05T12:00:00Z",
    worldEntry: {
      version: 1,
      location: {
        kind: "canonical",
        recordId: "loc-oakhaven",
        name: "Oakhaven",
      },
      intent: "explore",
    },
    ...overrides,
  };
}

function mockScenario(
  id: string,
  knowledge: "unheard" | "heard",
  locationName: string,
  locationRecordId?: string,
): ScenarioItem {
  return {
    version: 1,
    id,
    origin: {
      kind: "rumour",
      batchTitle: `Rumours in ${locationName}`,
      batchId: `batch-${locationName}`,
      index: 1,
      ...(locationRecordId ? { sourceRecordId: locationRecordId } : {}),
    },
    playerVisible: {
      rumour: `Rumour about ${locationName}`,
      lead: `Lead in ${locationName}`,
      source: `Local talk in ${locationName}`,
    },
    gmOnly: {
      truth: `The truth about ${locationName}`,
    },
    knowledge,
    status: "open",
    events: [],
    anchorRefs: locationRecordId ? [locationRecordId] : [],
    revealedSecretIds: [],
    secretBindings: {
      truth: `secret-truth-${id}`,
      eventIds: {},
    },
  };
}

describe("contextual rumours domain pipeline", () => {
  it("extracts current location context preferring visibleState over worldEntry", () => {
    const session = mockSession({
      visibleState: {
        location: {
          id: "loc-fact-1",
          text: "Blackwood Outpost",
          source: "canonical",
          sourceRecordId: "loc-blackwood",
        },
        objectives: [],
        activeCharacters: [],
        knownFacts: [],
        relationships: [],
      },
    });

    const loc = currentLocationContext(session);
    expect(loc).toEqual({
      name: "Blackwood Outpost",
      recordId: "loc-blackwood",
    });
  });

  it("falls back to worldEntry location when visibleState location is empty", () => {
    const session = mockSession();
    const loc = currentLocationContext(session);
    expect(loc).toEqual({
      name: "Oakhaven",
      recordId: "loc-oakhaven",
    });
  });

  it("matches scenario to location by anchorRefs, sourceRecordId, batchTitle or source", () => {
    const scenario = mockScenario("s1", "unheard", "Oakhaven", "loc-oakhaven");
    expect(
      matchesScenarioLocation(scenario, {
        name: "Oakhaven",
        recordId: "loc-oakhaven",
      }),
    ).toBe(true);
    expect(matchesScenarioLocation(scenario, { name: "oakhaven" })).toBe(true);
    expect(
      matchesScenarioLocation(scenario, {
        name: "Ironport",
        recordId: "loc-ironport",
      }),
    ).toBe(false);
  });

  it("returns candidate scenarios scoped to location while preserving all heard rumours", () => {
    const s1 = mockScenario("s1", "heard", "Oakhaven", "loc-oakhaven");
    const s2 = mockScenario("s2", "unheard", "Oakhaven", "loc-oakhaven");
    const s3 = mockScenario("s3", "unheard", "Ironport", "loc-ironport");

    const session = mockSession({
      scenarioCollection: {
        version: 1,
        items: [s1, s2, s3],
        focusedScenarioId: null,
      },
    });

    // When at Oakhaven: s1 (heard) + s2 (unheard Oakhaven) are candidates; s3 (Ironport) is not
    const oakhavenCandidates = candidateScenariosForLocation(session, {
      name: "Oakhaven",
      recordId: "loc-oakhaven",
    });
    expect(oakhavenCandidates.map((c) => c.id)).toEqual(["s1", "s2"]);

    // When moving to Ironport: s1 (heard Oakhaven) is preserved; s3 (unheard Ironport) is candidate; s2 is excluded
    const ironportCandidates = candidateScenariosForLocation(session, {
      name: "Ironport",
      recordId: "loc-ironport",
    });
    expect(ironportCandidates.map((c) => c.id)).toEqual(["s1", "s3"]);

    // Returning to Oakhaven still preserves s1 as heard, without resetting
    const returnCandidates = candidateScenariosForLocation(session, {
      name: "Oakhaven",
      recordId: "loc-oakhaven",
    });
    expect(returnCandidates.find((c) => c.id === "s1")?.knowledge).toBe(
      "heard",
    );
  });

  it("detects when a location needs fresh candidate rumours", () => {
    const s1 = mockScenario("s1", "unheard", "Oakhaven", "loc-oakhaven");
    const session = mockSession({
      scenarioCollection: {
        version: 1,
        items: [s1],
        focusedScenarioId: null,
      },
    });

    // Oakhaven already has an unheard candidate
    expect(
      needsContextualRumours(session, {
        name: "Oakhaven",
        recordId: "loc-oakhaven",
      }),
    ).toBe(false);

    // Ironport has no candidate rumours
    expect(
      needsContextualRumours(session, {
        name: "Ironport",
        recordId: "loc-ironport",
      }),
    ).toBe(true);

    // If session is read-only or pending roll, it does not need generation
    const pendingSession = mockSession({
      pendingRoll: {
        id: "turn-1",
        inputId: "input-1",
        playerAction: "Look around",
        uncertainty: "high",
        stakes: "none",
        resolutionStatus: "awaiting-outcome",
        createdAt: "2026-11-05T12:00:00Z",
      },
    });
    expect(needsContextualRumours(pendingSession)).toBe(false);
  });

  it("prunes older unheard scenarios from other locations when adding a new batch to respect max 8", () => {
    // 2 heard scenarios (1 from Oakhaven, 1 from Rivermouth)
    const h1 = mockScenario("h1", "heard", "Oakhaven", "loc-oakhaven");
    const h2 = mockScenario("h2", "heard", "Rivermouth", "loc-rivermouth");
    // 4 unheard scenarios from Oakhaven and Rivermouth
    const u1 = mockScenario("u1", "unheard", "Oakhaven", "loc-oakhaven");
    const u2 = mockScenario("u2", "unheard", "Oakhaven", "loc-oakhaven");
    const u3 = mockScenario("u3", "unheard", "Rivermouth", "loc-rivermouth");
    const u4 = mockScenario("u4", "unheard", "Rivermouth", "loc-rivermouth");

    // Total existing = 6 items. Adding 3 new items for Ironport (total would be 9 > 8)
    const existing = [h1, h2, u1, u2, u3, u4];
    const pruned = pruneUnheardScenariosForNewBatch(existing, 3, {
      name: "Ironport",
      recordId: "loc-ironport",
    });

    // Heard scenarios must NEVER be pruned
    expect(pruned.some((i) => i.id === "h1")).toBe(true);
    expect(pruned.some((i) => i.id === "h2")).toBe(true);

    // Pruned length + 3 must be <= MAX_SCENARIO_COLLECTION_ITEMS (8)
    expect(pruned.length + 3).toBeLessThanOrEqual(
      MAX_SCENARIO_COLLECTION_ITEMS,
    );
  });

  it("works across sci-fi and non-fantasy location contexts", () => {
    const s1 = mockScenario("s1", "unheard", "Orbital Station Alpha");
    const session = mockSession({
      worldEntry: {
        version: 1,
        location: { kind: "provisional", name: "Orbital Station Alpha" },
        intent: "explore",
      },
      scenarioCollection: {
        version: 1,
        items: [s1],
        focusedScenarioId: null,
      },
    });

    expect(
      needsContextualRumours(session, { name: "Orbital Station Alpha" }),
    ).toBe(false);
    expect(
      needsContextualRumours(session, { name: "Mining Colony Ceres" }),
    ).toBe(true);
  });
});
