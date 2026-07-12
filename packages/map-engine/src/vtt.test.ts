import { describe, expect, it } from "vitest";
import { normalizeEncounterSession, normalizeToken } from "./vtt";

const token = {
  id: "token-1",
  entityId: null,
  name: "Scout",
  x: 10,
  y: 20,
  width: 50,
  height: 50,
  rotation: 0,
  zIndex: 0,
  ownerPeerId: null,
  ownerGuestName: null,
  visibleTo: "all" as const,
  color: "#fff",
  imageUrl: null,
  statusEffects: ["stunned"],
};

describe("VTT domain normalization", () => {
  it("normalizes legacy visibility and nullable ownership", () => {
    const normalized = normalizeToken({
      ...token,
      ownerPeerId: undefined as unknown as null,
      ownerGuestName: undefined as unknown as null,
      visibleTo: "owner-only",
    });

    expect(normalized.visibleTo).toBe("all");
    expect(normalized.ownerPeerId).toBeNull();
    expect(normalized.ownerGuestName).toBeNull();
  });

  it("clones a session and repairs invalid selection and turn state", () => {
    const session = {
      id: "session-1",
      name: "Ambush",
      mapId: "map-1",
      mode: "combat" as const,
      tokens: { "token-1": token },
      initiativeOrder: ["token-1"],
      initiativeValues: { "token-1": 12 },
      round: 1,
      turnIndex: 9,
      selection: "missing-token",
      sessionFogMask: null,
      lastPing: { x: 1, y: 2, peerId: "host", color: "#fff", timestamp: 1 },
      measurement: { active: true, start: { x: 1, y: 2 }, end: { x: 3, y: 4 } },
      createdAt: 1,
      savedAt: null,
      chatMessages: [
        {
          type: "CHAT_MESSAGE" as const,
          sender: "Guide",
          senderId: "host",
          content: "Roll",
          timestamp: 1,
          roll: {
            formula: "1d20",
            total: 17,
            parts: [{ type: "dice" as const, value: 17, rolls: [17] }],
          },
        },
      ],
    };

    const normalized = normalizeEncounterSession(session);

    expect(normalized.selection).toBeNull();
    expect(normalized.turnIndex).toBe(0);
    expect(normalized.tokens["token-1"]).not.toBe(session.tokens["token-1"]);
    expect(normalized.measurement.start).not.toBe(session.measurement.start);
    expect(normalized.chatMessages).not.toBe(session.chatMessages);
    expect(normalized.chatMessages[0].roll?.parts).not.toBe(
      session.chatMessages[0].roll?.parts,
    );
    expect(normalized.chatMessages[0].roll?.parts[0].rolls).not.toBe(
      session.chatMessages[0].roll?.parts[0].rolls,
    );
  });
});
