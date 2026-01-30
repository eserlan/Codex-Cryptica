import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Hoist mocks to run before imports
vi.hoisted(() => {
  if (typeof window === "undefined") {
    (global as any).window = {};
  }

  if (typeof navigator === "undefined") {
    (global as any).navigator = { onLine: true };
  } else {
    (global as any).navigator.onLine = true;
  }

  class MockBroadcastChannel {
    name: string;
    onmessage: ((event: MessageEvent) => void) | null = null;
    constructor(name: string) {
      this.name = name;
    }
    postMessage = vi.fn();
    close = vi.fn();
  }

  (global as any).BroadcastChannel = MockBroadcastChannel;
  return { MockBroadcastChannel };
});

import { oracle } from "./oracle.svelte";
import * as idbUtils from "../utils/idb";

// Mock dependencies
vi.mock("../utils/idb", () => ({
  getDB: vi.fn().mockResolvedValue({
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn().mockResolvedValue([]),
    transaction: vi.fn().mockReturnValue({
      store: {
        clear: vi.fn(),
        put: vi.fn(),
      },
      done: Promise.resolve(),
    }),
  }),
}));

vi.mock("../services/ai", () => ({
  TIER_MODES: {
    lite: "gemini-2.5-flash-lite",
    advanced: "gemini-3-flash-preview",
  },
  aiService: {
    generateResponse: vi.fn(),
    generateImage: vi.fn().mockResolvedValue(new Blob()),
    enhancePrompt: vi.fn().mockImplementation((q) => q),
    retrieveContext: vi.fn().mockResolvedValue({ content: "context", primaryEntityId: undefined, sourceIds: [] }),
    expandQuery: vi.fn().mockResolvedValue("expanded query"),
  },
}));

describe("OracleStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    oracle.messages = [];
    oracle.apiKey = null;
    oracle.tier = "lite";
    oracle.isOpen = false;
    oracle.isLoading = false;
    // Mock crypto if needed
    if (!global.crypto) {
      Object.defineProperty(global, 'crypto', {
        value: {
          randomUUID: () => "mock-uuid-" + Math.random()
        }
      });
    }
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should allow writing to messages directly", () => {
    oracle.messages = [{ id: "1", role: "user", content: "direct" }];
    expect(oracle.messages).toHaveLength(1);
    oracle.messages = [];
  });

  it("should initialize with empty state", () => {
    expect(oracle.messages).toHaveLength(0);
    // isEnabled depends on VITE_SHARED_GEMINI_KEY in the test environment
    expect(oracle.isEnabled).toBe(!!import.meta.env.VITE_SHARED_GEMINI_KEY);
  });

  it("should load API key from database on init", async () => {
    const mockDB = await idbUtils.getDB();
    vi.mocked(mockDB.get).mockResolvedValue("test-api-key");

    await oracle.init();

    expect(mockDB.get).toHaveBeenCalledWith("settings", "ai_api_key");
    expect(oracle.apiKey).toBe("test-api-key");
    expect(oracle.isEnabled).toBe(true);
  });

  it("should save API key to database", async () => {
    const mockDB = await idbUtils.getDB();

    await oracle.setKey("new-key");

    expect(mockDB.put).toHaveBeenCalledWith("settings", "new-key", "ai_api_key");
    expect(oracle.apiKey).toBe("new-key");
  });

  it("should load tier from database on init", async () => {
    const mockDB = await idbUtils.getDB();
    vi.mocked(mockDB.get).mockResolvedValueOnce("test-api-key");
    vi.mocked(mockDB.get).mockResolvedValueOnce("advanced");

    await oracle.init();

    expect(mockDB.get).toHaveBeenCalledWith("settings", "ai_api_key");
    expect(mockDB.get).toHaveBeenCalledWith("settings", "ai_tier");
    expect(oracle.tier).toBe("advanced");
  });

  it("should save tier to database", async () => {
    const mockDB = await idbUtils.getDB();

    await oracle.setTier("advanced");

    expect(mockDB.put).toHaveBeenCalledWith("settings", "advanced", "ai_tier");
    expect(oracle.tier).toBe("advanced");
  });

  it("should clear API key and messages", async () => {
    const mockDB = await idbUtils.getDB();
    oracle.apiKey = "some-key";
    oracle.messages = [{ id: "1", role: "user", content: "hello" }];

    await oracle.clearKey();

    expect(mockDB.delete).toHaveBeenCalledWith("settings", "ai_api_key");
    expect(oracle.apiKey).toBe(null);
    expect(oracle.messages).toHaveLength(0);
  });

  it("should toggle open state", () => {
    expect(oracle.isOpen).toBe(false);
    oracle.toggle();
    expect(oracle.isOpen).toBe(true);
    oracle.toggle();
    expect(oracle.isOpen).toBe(false);
  });

  it("should detect image generation intent correctly", async () => {
    const { aiService } = await import("../services/ai");
    vi.mocked(aiService.generateImage).mockResolvedValue(new Blob());
    oracle.apiKey = "test-key";

    // Test various intent keywords
    const intents = [
      "/draw a dragon",
      "generate an image of a tavern",
      "paint a portrait of Eldrin",
      "visualize this scene",
      "show me a picture of the sawmill"
    ];

    for (const query of intents) {
      await oracle.ask(query);
      const assistantMsg = oracle.messages[oracle.messages.length - 1];
      expect(assistantMsg.type).toBe("image");
    }
  });

  it("should update lastUpdated on message changes", async () => {
    const initialTime = oracle.lastUpdated;
    oracle.apiKey = "test-key";
    
    vi.advanceTimersByTime(10);
    // Simulate ask
    await oracle.ask("hello");
    expect(oracle.lastUpdated).toBeGreaterThan(initialTime);
  });

  it("should update lastUpdated when setting tier", async () => {
    const initialTime = oracle.lastUpdated;
    vi.advanceTimersByTime(10);
    await oracle.setTier("advanced");
    expect(oracle.lastUpdated).toBeGreaterThan(initialTime);
  });

  it("should skip sync if lastUpdated matches", () => {
    const channel = (oracle as any).channel as any;
    oracle.messages = [{ id: "1", role: "user", content: "local" }];
    const timestamp = 123456789;
    oracle.lastUpdated = timestamp;

    // Simulate incoming SYNC_STATE message with same timestamp
    const event = {
      data: {
        type: "SYNC_STATE",
        data: {
          messages: [{ id: "2", role: "user", content: "remote" }],
          lastUpdated: timestamp,
          isLoading: false,
          apiKey: null,
          tier: "lite"
        }
      }
    };

    if (channel.onmessage) {
      channel.onmessage(event as MessageEvent);
    }

    // All state should NOT have changed because timestamp matched
    expect(oracle.messages).toHaveLength(1);
    expect(oracle.messages[0].content).toBe("local");
    expect(oracle.apiKey).toBeNull();
    expect(oracle.tier).toBe("lite");
    expect(oracle.isLoading).toBe(false);
  });

  it("should perform sync if lastUpdated differs", () => {
    const channel = (oracle as any).channel as any;
    oracle.messages = [{ id: "1", role: "user", content: "local" }];
    oracle.lastUpdated = 100;

    // Simulate incoming SYNC_STATE message with different timestamp
    const event = {
      data: {
        type: "SYNC_STATE",
        data: {
          messages: [{ id: "2", role: "user", content: "remote" }],
          lastUpdated: 200,
          isLoading: false,
          apiKey: "new-key",
          tier: "lite"
        }
      }
    };

    if (channel.onmessage) {
      channel.onmessage(event as MessageEvent);
    }

    // Messages SHOULD have changed
    expect(oracle.messages[0].content).toBe("remote");
    expect(oracle.apiKey).toBe("new-key");
  });
});
