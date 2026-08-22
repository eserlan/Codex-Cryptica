import { describe, expect, it } from "vitest";
import {
  addDicePreset,
  addResourceCounter,
  adjustResourceCounter,
  applyStateCorrection,
  buildAdventureRecap,
  getRollHistory,
  parseAdventureSession,
  removeDicePreset,
  removeResourceCounter,
  type AdventureSession,
} from "../src";

const now = "2026-08-17T12:00:00.000Z";
const emptyPatch = {
  objectives: { add: [], update: [], removeIds: [] },
  activeCharacters: { add: [], update: [], removeIds: [] },
  knownFacts: { add: [], update: [], removeIds: [] },
  relationships: { add: [], update: [], removeIds: [] },
};

function session(overrides: Record<string, unknown> = {}): AdventureSession {
  return parseAdventureSession({
    schemaVersion: 2,
    id: "session-1",
    vaultId: "vault-1",
    title: "The Lantern Road",
    status: "active",
    createdAt: now,
    updatedAt: now,
    lastPlayedAt: now,
    revision: 0,
    playerCharacter: {
      kind: "provisional",
      name: "Mara",
      description: "A careful guide",
    },
    premise: "A lantern has gone dark at the edge of town.",
    sourceRecords: [],
    visibleState: {
      location: {
        id: "loc-1",
        text: "The lantern road",
        source: "provisional",
      },
      objectives: [],
      activeCharacters: [],
      knownFacts: [],
      relationships: [],
    },
    hiddenState: {
      secrets: [
        {
          id: "secret-1",
          text: "The ferryman serves the moon",
          status: "hidden",
        },
      ],
      gmThreads: [],
    },
    provisionalFacts: [],
    turns: [
      {
        id: "turn-1",
        sequence: 0,
        inputId: "input-1",
        playerAction: "Walk toward the lantern",
        narration: "The road opens ahead.",
        visiblePatch: emptyPatch,
        hiddenPatch: {
          secrets: { add: [], update: [], removeIds: [] },
          gmThreads: { add: [], update: [], removeIds: [] },
        },
        revealedSecretIds: [],
        sourceRecordIds: [],
        provisionalFactIds: [],
        committedAt: now,
      },
    ],
    pendingRoll: null,
    dicePresets: [],
    resourceCounters: [],
    ...overrides,
  });
}

describe("buildAdventureRecap", () => {
  it("reads only visible state and narration, never hidden state", () => {
    const recap = buildAdventureRecap(session());
    expect(recap.location?.text).toBe("The lantern road");
    expect(recap.recentTurnSummaries).toEqual(["The road opens ahead."]);
    expect(recap).not.toHaveProperty("secrets");
    expect(JSON.stringify(recap)).not.toContain("ferryman");
  });

  it("falls back to the pending roll's setup narration when no situation has been committed yet", () => {
    // A roll-required opening never writes a visiblePatch — applyRollRequest
    // only records the pending roll — so visibleState.situation would
    // otherwise stay blank until the roll resolves, even though the setup
    // narration is already shown to the player in the roll prompt.
    const withPendingRoll = session({
      visibleState: {
        objectives: [],
        activeCharacters: [],
        knownFacts: [],
        relationships: [],
      },
      pendingRoll: {
        id: "roll-1",
        inputId: "input-1",
        playerAction: "",
        setupNarration: "Three masked riders crest the dune.",
        uncertainty: "Can Kizzt reach cover before they close in?",
        stakes: "A poor result cornered by the riders.",
        resolutionStatus: "awaiting-outcome",
        createdAt: now,
      },
    });

    const recap = buildAdventureRecap(withPendingRoll);
    expect(recap.situation?.text).toBe("Three masked riders crest the dune.");
  });

  it("prefers a committed situation over the pending roll's setup narration", () => {
    const withBoth = session({
      visibleState: {
        situation: {
          id: "sit-1",
          text: "Committed situation",
          source: "provisional",
        },
        objectives: [],
        activeCharacters: [],
        knownFacts: [],
        relationships: [],
      },
      pendingRoll: {
        id: "roll-1",
        inputId: "input-1",
        playerAction: "",
        setupNarration: "Should not be used.",
        uncertainty: "?",
        stakes: "?",
        resolutionStatus: "awaiting-outcome",
        createdAt: now,
      },
    });

    const recap = buildAdventureRecap(withBoth);
    expect(recap.situation?.text).toBe("Committed situation");
  });
});

describe("getRollHistory", () => {
  it("returns only turns with a resolvedRoll, in commit order", () => {
    const withRoll = session({
      turns: [
        {
          id: "turn-1",
          sequence: 0,
          inputId: "input-1",
          playerAction: "Walk",
          narration: "The road opens.",
          visiblePatch: emptyPatch,
          hiddenPatch: {
            secrets: { add: [], update: [], removeIds: [] },
            gmThreads: { add: [], update: [], removeIds: [] },
          },
          revealedSecretIds: [],
          sourceRecordIds: [],
          provisionalFactIds: [],
          committedAt: now,
        },
        {
          id: "turn-2",
          sequence: 1,
          inputId: "input-2",
          playerAction: "Cross the bridge",
          narration: "The bridge holds.",
          visiblePatch: emptyPatch,
          hiddenPatch: {
            secrets: { add: [], update: [], removeIds: [] },
            gmThreads: { add: [], update: [], removeIds: [] },
          },
          revealedSecretIds: [],
          sourceRecordIds: [],
          provisionalFactIds: [],
          committedAt: now,
          resolvedRoll: {
            expression: "d20",
            outcome: { kind: "numeric", value: 15 },
          },
        },
      ],
    });
    const history = getRollHistory(withRoll);
    expect(history).toHaveLength(1);
    expect(history[0]?.turn.id).toBe("turn-2");
    expect(history[0]?.resolvedRoll.expression).toBe("d20");
  });
});

describe("applyStateCorrection", () => {
  it("applies a visible-state-only patch and bumps revision", () => {
    const result = applyStateCorrection(
      session(),
      {
        ...emptyPatch,
        location: {
          id: "loc-2",
          text: "The east crossing",
          source: "provisional",
        },
      },
      now,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.visibleState.location?.text).toBe("The east crossing");
    expect(result.value.revision).toBe(1);
  });

  it("has no code path capable of touching hidden state", () => {
    const before = session();
    const result = applyStateCorrection(before, emptyPatch, now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.hiddenState).toEqual(before.hiddenState);
  });

  it("propagates a conflicting-patch failure from the underlying reducer", () => {
    const withFact = session({
      visibleState: {
        objectives: [],
        activeCharacters: [],
        knownFacts: [{ id: "fact-1", text: "A clue", source: "provisional" }],
        relationships: [],
      },
    });
    const result = applyStateCorrection(
      withFact,
      {
        ...emptyPatch,
        knownFacts: {
          add: [{ id: "fact-1", text: "duplicate", source: "provisional" }],
          update: [],
          removeIds: [],
        },
      },
      now,
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors[0]?.code).toBe("conflicting-patch");
  });
});

describe("dice presets", () => {
  it("adds and removes a preset", () => {
    const added = addDicePreset(
      session(),
      { id: "preset-1", label: "Advantage", expression: "2d20kh1" },
      now,
    );
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    expect(added.value.dicePresets).toHaveLength(1);
    expect(added.value.revision).toBe(1);

    const withoutPreset = removeDicePreset(added.value, "preset-1", now);
    expect(withoutPreset.dicePresets).toHaveLength(0);
  });

  it("rejects a preset with an empty label or expression", () => {
    const result = addDicePreset(
      session(),
      { id: "preset-1", label: "  ", expression: "2d20kh1" },
      now,
    );
    expect(result.ok).toBe(false);
  });
});

describe("resource counters", () => {
  it("adds, adjusts, and removes a counter", () => {
    const added = addResourceCounter(
      session(),
      { id: "counter-1", label: "Ammo", value: 6 },
      now,
    );
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    expect(added.value.resourceCounters[0]?.value).toBe(6);

    const adjusted = adjustResourceCounter(added.value, "counter-1", -1, now);
    expect(adjusted.ok).toBe(true);
    if (!adjusted.ok) return;
    expect(adjusted.value.resourceCounters[0]?.value).toBe(-1);

    const removed = removeResourceCounter(adjusted.value, "counter-1", now);
    expect(removed.resourceCounters).toHaveLength(0);
  });

  it("rejects a non-finite value", () => {
    const added = addResourceCounter(
      session(),
      { id: "counter-1", label: "Ammo", value: Number.NaN },
      now,
    );
    expect(added.ok).toBe(false);
  });

  it("rejects adjusting an unknown counter", () => {
    const result = adjustResourceCounter(session(), "missing", 3, now);
    expect(result.ok).toBe(false);
  });
});
