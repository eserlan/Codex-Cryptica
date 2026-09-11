import { describe, expect, it } from "vitest";
import {
  buildGuestPresencePayload,
  buildSharedGraphPayload,
  deriveGuestPresenceStatus,
  normalizeGuestName,
  removeGuestFromRoster,
  sanitizeSessionForGuestTransport,
  sanitizeVttMessageForGuestTransport,
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
          lore: "Host-only notes",
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

  describe("GM-only note bodies", () => {
    const note = {
      id: "note-1",
      kind: "note",
      visibleTo: "gm-only",
      noteBody: "2 goblins arguing over a map",
    } as any;
    const getToken = (id: string) => (id === "note-1" ? note : undefined);

    it("strips the body from a hidden note as it is added", () => {
      const sanitized = sanitizeVttMessageForGuestTransport(
        { type: "TOKEN_ADDED", token: note } as any,
        getToken,
      ) as any;

      expect(sanitized.token.noteBody).toBe("");
      expect(note.noteBody).toBe("2 goblins arguing over a map");
    });

    it("keeps the body of a note players can already see", () => {
      const visible = { ...note, visibleTo: "all" };
      const message = { type: "TOKEN_ADDED", token: visible } as any;

      expect(sanitizeVttMessageForGuestTransport(message, getToken)).toBe(
        message,
      );
    });

    it("strips the body from an edit to a hidden note", () => {
      const sanitized = sanitizeVttMessageForGuestTransport(
        {
          type: "TOKEN_STATE_UPDATE",
          tokenId: "note-1",
          delta: { noteBody: "3 goblins now" },
        } as any,
        getToken,
      ) as any;

      expect(sanitized.delta.noteBody).toBe("");
    });

    it("lets the body through on the update that reveals the note", () => {
      const sanitized = sanitizeVttMessageForGuestTransport(
        {
          type: "TOKEN_STATE_UPDATE",
          tokenId: "note-1",
          delta: { visibleTo: "all", noteBody: "2 goblins arguing over a map" },
        } as any,
        getToken,
      ) as any;

      expect(sanitized.delta.noteBody).toBe("2 goblins arguing over a map");
    });

    it("leaves messages that carry no note body untouched", () => {
      const message = {
        type: "TOKEN_STATE_UPDATE",
        tokenId: "note-1",
        delta: { x: 10, y: 20 },
      } as any;

      expect(sanitizeVttMessageForGuestTransport(message, getToken)).toBe(
        message,
      );
    });

    it("strips hidden note bodies out of a whole-session snapshot", () => {
      const session = {
        tokens: {
          "note-1": note,
          "note-2": { ...note, id: "note-2", visibleTo: "all" },
          "token-1": { id: "token-1", kind: "token", visibleTo: "gm-only" },
        },
      } as any;

      const sanitized = sanitizeSessionForGuestTransport(session) as any;

      expect(sanitized.tokens["note-1"].noteBody).toBe("");
      expect(sanitized.tokens["note-2"].noteBody).toBe(
        "2 goblins arguing over a map",
      );
      expect(sanitized.tokens["token-1"]).toBe(session.tokens["token-1"]);
      expect(session.tokens["note-1"].noteBody).toBe(
        "2 goblins arguing over a map",
      );
    });
  });
});
