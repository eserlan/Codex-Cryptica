import { vi } from "vitest";

(globalThis as any).mockDbStore = new Map<string, any>();

// Mocks must be declared before any imports
vi.mock("$app/paths", () => ({ base: "" }));
vi.mock("./vault.svelte", () => ({
  vault: {
    isGuest: true,
    entities: {
      "char-1": {
        id: "char-1",
        title: "Blacksmith Joe",
        type: "character",
        guestChatConfig: {
          isEnabled: true,
          contextScope: "public",
        },
      },
      "char-2": {
        id: "char-2",
        title: "Tarin the Ranger",
        type: "character",
      },
    },
  },
}));

vi.mock("$lib/cloud-bridge/p2p/guest-service", () => ({
  p2pGuestService: {
    connected: true,
    peerId: "test-peer-id",
    state: {
      displayName: "Guest User",
    },
    sendToHost: vi.fn().mockReturnValue(true),
  },
}));

vi.mock("./oracle.svelte", () => ({
  oracle: {
    settingsManager: {
      aiDisabled: false,
      effectiveApiKey: "test-key",
      modelName: "gemini-3-flash-preview",
    },
    textGeneration: {},
    executor: {
      execute: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

vi.mock("../utils/idb", () => {
  if (!(globalThis as any).mockDbStore) {
    (globalThis as any).mockDbStore = new Map<string, any>();
  }
  return {
    getDB: vi.fn().mockResolvedValue({
      get: vi
        .fn()
        .mockImplementation(async (table, key) =>
          (globalThis as any).mockDbStore.get(`${table}_${key}`),
        ),
      getAll: vi.fn().mockImplementation(async (table) => {
        const results: any[] = [];
        (globalThis as any).mockDbStore.forEach((value: any, k: string) => {
          if (k.startsWith(`${table}_`)) {
            results.push(value);
          }
        });
        return results;
      }),
      getAllFromIndex: vi
        .fn()
        .mockImplementation(async (table, indexName, indexValue) => {
          const field =
            indexName === "by-speaker" ? "speakerCharacterId" : "characterId";
          const results: any[] = [];
          (globalThis as any).mockDbStore.forEach((value: any, k: string) => {
            if (k.startsWith(`${table}_`) && value[field] === indexValue) {
              results.push(value);
            }
          });
          return results;
        }),
      put: vi.fn().mockImplementation(async (table, val, key) => {
        const storeKey = key ? `${table}_${key}` : `${table}_${val.id}`;
        (globalThis as any).mockDbStore.set(storeKey, val);
        return val.id || key;
      }),
      clear: vi.fn().mockImplementation(async (table) => {
        (globalThis as any).mockDbStore.forEach((_: any, k: string) => {
          if (k.startsWith(`${table}_`)) {
            (globalThis as any).mockDbStore.delete(k);
          }
        });
      }),
    }),
  };
});

import { describe, it, expect, beforeEach } from "vitest";
import { GuestChatStore } from "./guest-chat.svelte";
import { p2pGuestService } from "$lib/cloud-bridge/p2p/guest-service";
import { oracle } from "./oracle.svelte";
import { vault } from "./vault.svelte";

describe("GuestChatStore", () => {
  let store: GuestChatStore;

  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).mockDbStore.clear();
    (vault as { isGuest: boolean }).isGuest = true;
    store = new GuestChatStore();
  });

  it("should initialize with an empty transcripts state or loaded state from IDB", async () => {
    (globalThis as any).mockDbStore.set("guest_chat_transcripts_char-1", {
      id: "t-1",
      guestId: "test-peer-id",
      guestName: "Guest User",
      characterId: "char-1",
      characterTitle: "Blacksmith Joe",
      messages: [],
      lastUpdated: 123456,
    });

    await store.init();
    expect(store.transcripts["char-1"]).toBeDefined();
    expect(store.transcripts["char-1"].guestName).toBe("Guest User");
  });

  it("should start a chat and initialize a transcript if none exists", async () => {
    await store.startChat("char-1", "Blacksmith Joe");
    expect(store.activeCharacterId).toBe("char-1");
    expect(store.transcripts["char-1"]).toBeDefined();
    expect(store.transcripts["char-1"].characterTitle).toBe("Blacksmith Joe");
    // sendToHost is not called for empty transcripts
    expect(p2pGuestService.sendToHost).not.toHaveBeenCalled();
  });

  it("should append a message when sending and route it via P2P host", async () => {
    await store.startChat("char-1", "Blacksmith Joe");
    await store.sendMessage("char-1", "Hello there!");

    expect(store.transcripts["char-1"].messages.length).toBeGreaterThan(0);
    expect(store.transcripts["char-1"].messages[0].content).toBe(
      "Hello there!",
    );
    expect(p2pGuestService.sendToHost).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "GUEST_CHAR_CHAT_REQUEST",
        query: "Hello there!",
        characterId: "char-1",
      }),
    );
    // local executor is not called when routing via P2P host
    expect(oracle.executor.execute).not.toHaveBeenCalled();
  });

  it("should clear transcript successfully", async () => {
    await store.startChat("char-1", "Blacksmith Joe");
    await store.sendMessage("char-1", "Hello there!");
    // user message + assistant placeholder sent via P2P
    expect(store.transcripts["char-1"].messages.length).toBe(2);

    await store.clearTranscript("char-1");
    expect(store.transcripts["char-1"].messages.length).toBe(0);
  });

  it("keeps host conversations local even when a guest connection is active", async () => {
    (vault as { isGuest: boolean }).isGuest = false;

    await store.startChat("char-1", "Blacksmith Joe");
    await store.sendMessage("char-1", "Hello there!");

    expect(p2pGuestService.sendToHost).not.toHaveBeenCalled();
    expect(oracle.executor.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "guest-chat",
        entityId: "char-1",
        query: "Hello there!",
      }),
      expect.anything(),
    );
  });

  it("passes the selected host identity to local character-chat generation", async () => {
    (vault as { isGuest: boolean }).isGuest = false;

    await store.startChat("char-1", "Blacksmith Joe", "char-2");
    await store.sendMessage("char-1", "Hello there!");

    expect(store.transcripts["char-1"].speakerCharacterId).toBe("char-2");
    expect(oracle.executor.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "guest-chat",
        entityId: "char-1",
        data: { guestCharacterId: "char-2" },
      }),
      expect.anything(),
    );
  });

  it("startNewSession creates a fresh record without deleting prior sessions", async () => {
    await store.startChat("char-1", "Blacksmith Joe");
    const firstId = store.transcripts["char-1"].id;

    const second = await store.startNewSession(
      "char-1",
      "Blacksmith Joe",
      "char-2",
    );

    expect(second.id).not.toBe(firstId);
    expect(store.transcripts["char-1"].id).toBe(second.id);
    expect(store.transcripts["char-1"].speakerCharacterId).toBe("char-2");

    const sessions = await store.listSessions("char-1");
    expect(sessions.map((s) => s.id).sort()).toEqual(
      [firstId, second.id].sort(),
    );
  });

  it("listSessions orders sessions by lastUpdated, newest first", async () => {
    (globalThis as any).mockDbStore.set("guest_chat_transcripts_older", {
      id: "older",
      guestId: "guest-local",
      guestName: "Invited Guest",
      characterId: "char-1",
      characterTitle: "Blacksmith Joe",
      messages: [],
      lastUpdated: 100,
    });
    (globalThis as any).mockDbStore.set("guest_chat_transcripts_newer", {
      id: "newer",
      guestId: "guest-local",
      guestName: "Invited Guest",
      characterId: "char-1",
      characterTitle: "Blacksmith Joe",
      messages: [],
      lastUpdated: 200,
    });

    const sessions = await store.listSessions("char-1");
    expect(sessions.map((s) => s.id)).toEqual(["newer", "older"]);
  });

  it("listSessionsAsSpeaker finds sessions where the character was the human's speaker, not the AI voice", async () => {
    (globalThis as any).mockDbStore.set("guest_chat_transcripts_cross", {
      id: "cross",
      guestId: "guest-local",
      guestName: "Invited Guest",
      characterId: "char-1",
      speakerCharacterId: "char-2",
      characterTitle: "Blacksmith Joe",
      messages: [],
      lastUpdated: 100,
    });
    (globalThis as any).mockDbStore.set("guest_chat_transcripts_unrelated", {
      id: "unrelated",
      guestId: "guest-local",
      guestName: "Invited Guest",
      characterId: "char-3",
      characterTitle: "Someone Else",
      messages: [],
      lastUpdated: 50,
    });

    const sessions = await store.listSessionsAsSpeaker("char-2");
    expect(sessions.map((s) => s.id)).toEqual(["cross"]);
  });

  it("resumeSession swaps in the requested transcript and sets it active", async () => {
    await store.startChat("char-1", "Blacksmith Joe");
    const original = await store.startNewSession(
      "char-1",
      "Blacksmith Joe",
      "char-2",
    );
    const other = await store.startNewSession("char-1", "Blacksmith Joe");
    expect(store.transcripts["char-1"].id).toBe(other.id);

    await store.resumeSession("char-1", original.id);

    expect(store.transcripts["char-1"].id).toBe(original.id);
    expect(store.transcripts["char-1"].speakerCharacterId).toBe("char-2");
    expect(store.activeCharacterId).toBe("char-1");
  });

  it("resumeSession ignores a transcript that belongs to a different character", async () => {
    await store.startChat("char-1", "Blacksmith Joe");
    const currentId = store.transcripts["char-1"].id;

    (globalThis as any).mockDbStore.set("guest_chat_transcripts_foreign", {
      id: "foreign",
      guestId: "guest-local",
      guestName: "Invited Guest",
      characterId: "char-2",
      characterTitle: "Tarin the Ranger",
      messages: [],
      lastUpdated: 999,
    });

    await store.resumeSession("char-1", "foreign");

    expect(store.transcripts["char-1"].id).toBe(currentId);
  });
});
