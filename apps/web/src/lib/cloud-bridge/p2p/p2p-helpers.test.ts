import { describe, expect, it } from "vitest";
import {
  buildGuestPresencePayload,
  buildSharedGraphPayload,
  deriveGuestPresenceStatus,
  normalizeGuestName,
  removeGuestFromRoster,
  upsertGuestRoster,
} from "./p2p-helpers";

describe("p2p helpers", () => {
  it("should normalize guest names with fallback and trimming", () => {
    expect(normalizeGuestName("  Ava  ", "fallback")).toBe("Ava");
    expect(normalizeGuestName("", "fallback")).toBe("fallback");
    expect(normalizeGuestName(null, "fallback")).toBe("fallback");
  });

  it("should derive guest presence status from payload and entity", () => {
    expect(deriveGuestPresenceStatus("viewing", null)).toBe("viewing");
    expect(deriveGuestPresenceStatus("connected", "entity-1")).toBe("viewing");
    expect(deriveGuestPresenceStatus(undefined, null)).toBe("connected");
  });

  it("should upsert and remove roster entries", () => {
    const next = upsertGuestRoster(
      {},
      "peer-1",
      {
        displayName: "Ava",
        status: "connected",
        currentEntityId: null,
        currentEntityTitle: null,
      },
      123,
    );

    expect(next["peer-1"]).toMatchObject({
      peerId: "peer-1",
      displayName: "Ava",
      status: "connected",
      joinedAt: 123,
      lastSeenAt: 123,
    });

    const removed = removeGuestFromRoster(next, "peer-1");
    expect(removed["peer-1"]).toBeUndefined();
  });

  it("should build a shared graph payload and strip runtime fields", () => {
    const payload = buildSharedGraphPayload(
      {
        "entity-1": {
          id: "entity-1",
          title: "Entity 1",
          image: "images/a.png",
          _fsHandle: "runtime",
        } as any,
      },
      "hidden",
      "theme-1",
    );

    expect(payload).toEqual({
      version: 1,
      entities: {
        "entity-1": {
          id: "entity-1",
          title: "Entity 1",
          image: "images/a.png",
        },
      },
      assets: {
        "images/a.png": "images/a.png",
      },
      defaultVisibility: "hidden",
      sharedMode: true,
      themeId: "theme-1",
    });
  });

  it("should prefer zen mode presence when selection is cleared", () => {
    expect(
      buildGuestPresencePayload({
        selectedEntityId: null,
        zenModeEntityId: "entity-zen",
        entities: {
          "entity-zen": { title: "Zen Entity" },
        },
      }),
    ).toEqual({
      status: "viewing",
      currentEntityId: "entity-zen",
      currentEntityTitle: "Zen Entity",
    });
  });
});
