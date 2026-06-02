import { vi } from "vitest";

(globalThis as any).mockDbStore = new Map<string, any>();

// Mocks must be declared before any imports
vi.mock("$app/paths", () => ({ base: "" }));
vi.mock("./vault.svelte", () => ({
  vault: {
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
    sendToHost: vi.fn(),
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

describe("GuestChatStore", () => {
  let store: GuestChatStore;

  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).mockDbStore.clear();
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

  it("should append a message when sending and invoke the executor", async () => {
    await store.startChat("char-1", "Blacksmith Joe");
    await store.sendMessage("char-1", "Hello there!");

    expect(store.transcripts["char-1"].messages.length).toBeGreaterThan(0);
    expect(store.transcripts["char-1"].messages[0].content).toBe(
      "Hello there!",
    );
    expect(oracle.executor.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "guest-chat",
        query: "Hello there!",
        entityId: "char-1",
      }),
      expect.any(Object),
    );
    expect(p2pGuestService.sendToHost).toHaveBeenCalled();
  });

  it("should clear transcript successfully", async () => {
    await store.startChat("char-1", "Blacksmith Joe");
    await store.sendMessage("char-1", "Hello there!");
    expect(store.transcripts["char-1"].messages.length).toBe(1);

    await store.clearTranscript("char-1");
    expect(store.transcripts["char-1"].messages.length).toBe(0);
  });
});
