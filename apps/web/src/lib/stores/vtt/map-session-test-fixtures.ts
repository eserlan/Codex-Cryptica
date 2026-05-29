import type { EncounterSession } from "../../../types/vtt";

export function createFullEncounterSessionFixture(
  overrides: Partial<EncounterSession> = {},
): EncounterSession {
  return {
    id: "enc-full",
    name: "Full Session",
    mapId: "map-1",
    mode: "combat",
    tokens: {
      "token-1": {
        id: "token-1",
        entityId: "entity-1",
        name: "Scout",
        x: 100,
        y: 150,
        width: 50,
        height: 50,
        rotation: 0,
        zIndex: 0,
        ownerPeerId: "guest-1",
        ownerGuestName: "Ava",
        visibleTo: "all",
        color: "#22c55e",
        imageUrl: "images/scout.webp",
        statusEffects: ["poisoned"],
      },
    },
    initiativeOrder: ["token-1"],
    initiativeValues: { "token-1": 14 },
    round: 3,
    turnIndex: 0,
    selection: "token-1",
    sessionFogMask: "fog-mask",
    lastPing: {
      x: 10,
      y: 20,
      peerId: "guest-1",
      color: "#f00",
      timestamp: 100,
    },
    measurement: {
      active: true,
      start: { x: 0, y: 0 },
      end: { x: 30, y: 40 },
      locked: true,
    },
    createdAt: 1,
    savedAt: 2,
    chatMessages: [
      {
        type: "CHAT_MESSAGE",
        sender: "Ava",
        senderId: "guest-1",
        content: "Ready",
        timestamp: 3,
      },
    ],
    gridSize: 70,
    gridUnit: "m",
    gridDistance: 2,
    ...overrides,
  };
}

export function createLegacyEncounterSessionFixture(): EncounterSession {
  const session = createFullEncounterSessionFixture({
    id: "enc-legacy",
    selection: "legacy-token",
    initiativeOrder: ["legacy-token"],
    initiativeValues: { "legacy-token": 8 },
  });

  session.tokens = {
    "legacy-token": {
      id: "legacy-token",
      entityId: null,
      name: "Legacy Scout",
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      rotation: 0,
      zIndex: 0,
      ownerPeerId: "guest-1",
      ownerGuestName: "Ava",
      visibleTo: "owner-only",
      color: "#fff",
      imageUrl: null,
      statusEffects: [],
    } as any,
  };

  return session;
}

export function createPartialEncounterSessionFixture(): EncounterSession {
  return {
    ...createFullEncounterSessionFixture({
      id: "enc-partial",
      turnIndex: 99,
      selection: "missing-token",
    }),
    gridSize: undefined,
    gridUnit: undefined,
    gridDistance: undefined,
    chatMessages: undefined as any,
    lastPing: undefined as any,
  };
}
