import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Hoist mocks to run before imports
vi.hoisted(() => {
  if (typeof window === "undefined") {
    (global as any).window = {};
  }

  // Mock Svelte 5 Runes
  (global as any).$state = (v: any) => v;
  (global as any).$state.snapshot = (v: any) => v;
  (global as any).$derived = (v: any) => v;
  (global as any).$derived.by = (v: any) => v;
  (global as any).$effect = (v: any) => v;

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

  class MockWorker {
    onmessage: ((event: MessageEvent) => void) | null = null;
    postMessage = vi.fn();
    terminate = vi.fn();
    addEventListener = vi.fn();
    removeEventListener = vi.fn();
  }

  (global as any).BroadcastChannel = MockBroadcastChannel;
  (global as any).Worker = MockWorker;
  return { MockBroadcastChannel, MockWorker };
});

// Mock worker and bridge to prevent alias resolution issues
vi.mock('../cloud-bridge/worker-bridge', () => ({
  workerBridge: {
    reset: vi.fn(),
    send: vi.fn(),
  }
}));

vi.mock('./vault.svelte', () => ({
  vault: {
    createEntity: vi.fn(),
    allEntities: [],
    entities: {},
    inboundConnections: {},
  }
}));

vi.mock('./graph.svelte', () => ({
  graph: {
    requestFit: vi.fn(),
  }
}));

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
    lite: "gemini-flash-lite-latest",
    advanced: "gemini-3-flash-preview",
  },
  aiService: {
    generateResponse: vi.fn(),
    generateImage: vi.fn().mockResolvedValue(new Blob()),
    distillVisualPrompt: vi.fn().mockResolvedValue("distilled"),
    enhancePrompt: vi.fn().mockReturnValue("enhanced"),
    retrieveContext: vi.fn().mockResolvedValue({ content: "context", sourceIds: [] }),
  },
}));

vi.mock("../services/search", () => ({
  searchService: {
    init: vi.fn(),
    search: vi.fn().mockResolvedValue([]),
  },
}));

describe("OracleStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    oracle.messages = [];
    oracle.undoStack = [];
    oracle.apiKey = null;
    oracle.tier = "lite";
    oracle.isOpen = false;
    oracle.isLoading = false;
    oracle.lastUpdated = 0;
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

  describe("Undo Logic", () => {
    it("should push undo actions to the stack with IDs", () => {
      const revertFn = vi.fn().mockResolvedValue(undefined);
      oracle.pushUndoAction("Test Action", revertFn, "msg-123");

      expect(oracle.undoStack.length).toBe(1);
      expect(oracle.undoStack[0].description).toBe("Test Action");
      expect(oracle.undoStack[0].revert).toBe(revertFn);
      expect(oracle.undoStack[0].messageId).toBe("msg-123");
      expect(oracle.undoStack[0].id).toBeDefined();
    });

    it("should prevent concurrent undo operations", async () => {
      let resolveRevert: any;
      const revertFn = vi.fn().mockReturnValue(new Promise((resolve) => {
        resolveRevert = resolve;
      }));
      oracle.pushUndoAction("Concurrent Action", revertFn);

      const undoPromise = oracle.undo();
      expect(oracle.isUndoing).toBe(true);

      // Try to call undo again while it's in progress
      await oracle.undo();
      expect(revertFn).toHaveBeenCalledTimes(1);

      resolveRevert();
      await undoPromise;
      expect(oracle.isUndoing).toBe(false);
    });

    it("should pop and execute revert function on successful undo", async () => {
      const revertFn = vi.fn().mockResolvedValue(undefined);
      oracle.pushUndoAction("Test Action", revertFn);

      await oracle.undo();

      expect(revertFn).toHaveBeenCalled();
      expect(oracle.undoStack.length).toBe(0);
    });

    it("should add a system message on successful undo", async () => {
      const revertFn = vi.fn().mockResolvedValue(undefined);
      oracle.pushUndoAction("Test Action", revertFn);

      await oracle.undo();

      const lastMessage = oracle.messages[oracle.messages.length - 1];
      expect(lastMessage.role).toBe("system");
      expect(lastMessage.content).toContain("Undid action: **Test Action**");
    });

    it("should keep action on stack if revert fails", async () => {
      const errorFn = vi.fn().mockRejectedValue(new Error("Revert failed"));
      oracle.pushUndoAction("Fail Action", errorFn);

      await oracle.undo();

      const lastMessage = oracle.messages[oracle.messages.length - 1];
      expect(lastMessage.role).toBe("system");
      expect(lastMessage.content).toContain("Undo failed: Revert failed");
      
      // Stack should NOT be empty (action remains for retry)
      expect(oracle.undoStack.length).toBe(1);
      expect(oracle.undoStack[0].description).toBe("Fail Action");
    });

    it("should limit stack size to 50", () => {
      for (let i = 0; i < 55; i++) {
        oracle.pushUndoAction(`Action ${i}`, async () => {});
      }

      expect(oracle.undoStack.length).toBe(50);
      expect(oracle.undoStack[0].description).toBe("Action 5"); // First 5 should be shifted out
      expect(oracle.undoStack[49].description).toBe("Action 54");
    });
  });
});

