import { describe, expect, it } from "vitest";
import { seedArtwork } from "@codex/adventure-artwork-engine/seed";
import type {
  AdventureSession,
  CommittedAdventureTurn,
} from "@codex/adventure-engine";
import { computeTurnArtworkReveals } from "./turn-artwork-reveals.js";

function emptyPatch() {
  return {
    objectives: { add: [], update: [], removeIds: [] },
    activeCharacters: { add: [], update: [], removeIds: [] },
    knownFacts: { add: [], update: [], removeIds: [] },
    relationships: { add: [], update: [], removeIds: [] },
  };
}

function makeTurn(
  sequence: number,
  overrides: Partial<CommittedAdventureTurn> = {},
): CommittedAdventureTurn {
  return {
    id: `turn-${sequence}`,
    sequence,
    inputId: `input-${sequence}`,
    playerAction: `Action ${sequence}`,
    narration: `Narration ${sequence}`,
    visiblePatch: emptyPatch(),
    hiddenPatch: {
      secrets: { add: [], update: [], removeIds: [] },
      gmThreads: { add: [], update: [], removeIds: [] },
    },
    revealedSecretIds: [],
    sourceRecordIds: [],
    provisionalFactIds: [],
    committedAt: "2026-11-13T00:00:00.000Z",
    ...overrides,
  };
}

function makeSession(turns: CommittedAdventureTurn[]): AdventureSession {
  return {
    schemaVersion: 3,
    id: "sess-1",
    vaultId: "vault-1",
    title: "Kettleford",
    status: "active",
    revision: 1,
    createdAt: "2026-11-13T00:00:00.000Z",
    updatedAt: "2026-11-13T00:00:00.000Z",
    lastPlayedAt: "2026-11-13T00:00:00.000Z",
    playerCharacter: {
      kind: "provisional",
      name: "Alden",
      description: "Traveller",
    },
    premise: "Explore Kettleford.",
    places: [
      {
        id: "place-1",
        name: "Kettleford",
        cues: ["village", "river"],
      },
      {
        id: "place-2",
        name: "Old Mill",
        cues: ["forest", "river"],
      },
    ],
    currentPlaceId: "place-1",
    visibleState: {
      location: {
        id: "loc-1",
        text: "Kettleford, a busy river village",
        source: "provisional",
      },
      objectives: [],
      activeCharacters: [],
      knownFacts: [],
      relationships: [],
    },
    hiddenState: {
      secrets: [],
      gmThreads: [],
    },
    turns,
    sourceRecords: [],
    provisionalFacts: [],
    storySoFar: {
      text: "",
      throughSequence: -1,
      updatedAt: "2026-11-13T00:00:00.000Z",
    },
    pendingRoll: null,
    dicePresets: [],
    resourceCounters: [],
    worldTime: { version: 1, elapsedMinutes: 0, events: [] },
  };
}

describe("computeTurnArtworkReveals", () => {
  it("returns an empty map when disabled or vaultId mismatches", () => {
    const session = makeSession([makeTurn(0)]);
    expect(
      computeTurnArtworkReveals({
        session,
        activeVaultId: "vault-1",
        entities: {},
        enabled: false,
        theme: "fantasy",
        catalogue: seedArtwork,
      }).size,
    ).toBe(0);

    expect(
      computeTurnArtworkReveals({
        session,
        activeVaultId: "other-vault",
        entities: {},
        enabled: true,
        theme: "fantasy",
        catalogue: seedArtwork,
      }).size,
    ).toBe(0);
  });

  it("reveals location on turn 0 and when location changes, without repeating unchanged turns", () => {
    const turns = [
      makeTurn(0),
      makeTurn(1),
      makeTurn(2, {
        visiblePatch: {
          ...emptyPatch(),
          location: {
            id: "loc-2",
            text: "Old Mill, a stone watermill",
            source: "provisional",
          },
        },
      }),
    ];
    const reveals = computeTurnArtworkReveals({
      session: makeSession(turns),
      activeVaultId: "vault-1",
      entities: {},
      enabled: true,
      theme: "fantasy",
      catalogue: seedArtwork,
    });

    expect(reveals.get(0)?.location?.name).toBe("Kettleford");
    expect(reveals.has(1)).toBe(false);
    expect(reveals.get(2)?.location?.name).toBe("Old Mill");
  });

  it("reveals an NPC on entry, avoids spamming adjacent turns, and reintroduces after long presence", () => {
    const mara = {
      id: "npc-mara",
      text: "Mara Fen, a grey-haired herb-wife",
      source: "provisional" as const,
      cues: ["human", "worker"],
    };
    const turns = [
      makeTurn(0),
      makeTurn(1, {
        visiblePatch: {
          ...emptyPatch(),
          activeCharacters: { add: [mara], update: [], removeIds: [] },
        },
      }),
      makeTurn(2, { narration: "Mara hands you a jar." }),
      makeTurn(9, { narration: "Mara points toward the millstones." }),
    ];

    const reveals = computeTurnArtworkReveals({
      session: makeSession(turns),
      activeVaultId: "vault-1",
      entities: {},
      enabled: true,
      theme: "fantasy",
      catalogue: seedArtwork,
      reintroduceAfterTurns: 8,
    });

    expect(reveals.get(1)?.npcs).toHaveLength(1);
    expect(reveals.get(1)?.npcs[0]?.reason).toBe("entered");
    expect(reveals.has(2)).toBe(false);
    expect(reveals.get(9)?.npcs).toHaveLength(1);
    expect(reveals.get(9)?.npcs[0]?.reason).toBe("reintroduced");
  });

  it("stops reintroducing an NPC once removed from activeCharacters", () => {
    const mara = {
      id: "npc-mara",
      text: "Mara Fen, a grey-haired herb-wife",
      source: "provisional" as const,
      cues: ["human", "worker"],
    };
    const turns = [
      makeTurn(0),
      makeTurn(1, {
        visiblePatch: {
          ...emptyPatch(),
          activeCharacters: { add: [mara], update: [], removeIds: [] },
        },
      }),
      makeTurn(3, {
        visiblePatch: {
          ...emptyPatch(),
          activeCharacters: {
            add: [],
            update: [],
            removeIds: ["npc-mara"],
          },
        },
      }),
      makeTurn(10, { narration: "You recall Mara's warning." }),
    ];

    const reveals = computeTurnArtworkReveals({
      session: makeSession(turns),
      activeVaultId: "vault-1",
      entities: {},
      enabled: true,
      theme: "fantasy",
      catalogue: seedArtwork,
      reintroduceAfterTurns: 8,
    });

    expect(reveals.get(1)?.npcs).toHaveLength(1);
    expect(reveals.has(10)).toBe(false);
  });

  it("assigns distinct portraits to different NPCs with identical cues in the same session", () => {
    const miller = {
      id: "npc-miller",
      text: "The miller of Kettleford Mill",
      source: "provisional" as const,
      cues: ["human", "worker"],
    };
    const apprentice = {
      id: "npc-apprentice",
      text: "The young mill apprentice",
      source: "provisional" as const,
      cues: ["human", "worker"],
    };
    const turns = [
      makeTurn(0),
      makeTurn(1, {
        visiblePatch: {
          ...emptyPatch(),
          activeCharacters: { add: [miller], update: [], removeIds: [] },
        },
      }),
      makeTurn(2, {
        visiblePatch: {
          ...emptyPatch(),
          activeCharacters: { add: [apprentice], update: [], removeIds: [] },
        },
      }),
    ];

    const reveals = computeTurnArtworkReveals({
      session: makeSession(turns),
      activeVaultId: "vault-1",
      entities: {},
      enabled: true,
      theme: "fantasy",
      catalogue: seedArtwork,
    });

    const millerPortrait = reveals.get(1)?.npcs[0]?.selection;
    const apprenticePortrait = reveals.get(2)?.npcs[0]?.selection;
    expect(millerPortrait?.kind).toBe("catalogue");
    expect(apprenticePortrait?.kind).toBe("catalogue");
    if (
      millerPortrait?.kind === "catalogue" &&
      apprenticePortrait?.kind === "catalogue"
    ) {
      expect(millerPortrait.asset.id).not.toBe(apprenticePortrait.asset.id);
    }
  });

  it("does not reveal an NPC before their activeCharacters.add turn even if mentioned earlier", () => {
    const mara = {
      id: "npc-mara",
      text: "Mara Fen, the village herb-wife",
      source: "provisional" as const,
      cues: ["human", "worker"],
    };
    const turns = [
      makeTurn(0, {
        playerAction: "Ask about Mara Fen",
        narration: "Villagers say Mara Fen tends the herb drying shed.",
      }),
      makeTurn(1, {
        visiblePatch: {
          ...emptyPatch(),
          activeCharacters: { add: [mara], update: [], removeIds: [] },
        },
      }),
    ];
    const session = makeSession(turns);
    session.visibleState.activeCharacters = [mara];

    const reveals = computeTurnArtworkReveals({
      session,
      activeVaultId: "vault-1",
      entities: {},
      enabled: true,
      theme: "fantasy",
      catalogue: seedArtwork,
    });

    expect(reveals.get(0)?.npcs ?? []).toHaveLength(0);
    expect(reveals.get(1)?.npcs).toHaveLength(1);
    expect(reveals.get(1)?.npcs[0]?.reason).toBe("entered");
  });
});
