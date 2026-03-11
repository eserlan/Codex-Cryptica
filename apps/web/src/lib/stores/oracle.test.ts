import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { oracle, OracleStore } from "./oracle.svelte";
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
        clear: vi.fn().mockResolvedValue(undefined),
        put: vi.fn().mockResolvedValue(undefined),
      },
      done: Promise.resolve(),
    }),
  }),
}));

vi.mock("./graph.svelte", () => ({
  graph: {
    requestFit: vi.fn(),
  },
}));

vi.mock("./vault.svelte", () => ({
  vault: {
    entities: {},
    inboundConnections: {},
    isGuest: false,
    createEntity: vi.fn().mockResolvedValue("new-id"),
    updateEntity: vi.fn().mockResolvedValue(undefined),
    addConnection: vi.fn().mockResolvedValue(true),
    removeConnection: vi.fn().mockResolvedValue(true),
    deleteEntity: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../services/ai", () => ({
  aiService: {
    generateResponse: vi
      .fn()
      .mockResolvedValue({ text: () => "mock response" }),
    expandQuery: vi.fn().mockImplementation((_k, q) => Promise.resolve(q)),
    retrieveContext: vi.fn().mockResolvedValue({
      content: "mock context",
      primaryEntityId: "mock-id",
      sourceIds: ["source-1"],
    }),
    generatePlotAnalysis: vi.fn().mockResolvedValue("plot analysis"),
    distillVisualPrompt: vi.fn().mockResolvedValue("visual prompt"),
    generateImage: vi.fn().mockResolvedValue(new Blob()),
  },
  TIER_MODES: {
    lite: "gemini-flash-lite-latest",
    advanced: "gemini-3-flash-preview",
  },
}));

vi.mock("../services/search", () => ({
  searchService: {
    search: vi.fn().mockResolvedValue([{ id: "e1", title: "Entity 1" }]),
  },
}));

describe("OracleStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    oracle.reset();

    if (!global.crypto) {
      Object.defineProperty(global, "crypto", {
        value: {
          randomUUID: () => "mock-uuid-" + Math.random(),
        },
      });
    }
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should initialize with empty state", () => {
    expect(oracle.messages).toHaveLength(0);
    expect(oracle.isEnabled).toBe(!!import.meta.env.VITE_SHARED_GEMINI_KEY);
  });

  it("should load API key from database on init", async () => {
    const mockDB = await idbUtils.getDB();
    vi.mocked(mockDB.get).mockResolvedValue("test-api-key");

    await oracle.init();

    expect(mockDB.get).toHaveBeenCalledWith("settings", "ai_api_key");
    expect(oracle.apiKey).toBe("test-api-key");
  });

  it("should save API key to database", async () => {
    const mockDB = await idbUtils.getDB();
    await oracle.setKey("new-key");
    expect(mockDB.put).toHaveBeenCalledWith(
      "settings",
      "new-key",
      "ai_api_key",
    );
    expect(oracle.apiKey).toBe("new-key");
  });

  it("should load tier from database on init", async () => {
    const mockDB = await idbUtils.getDB();
    vi.mocked(mockDB.get).mockResolvedValueOnce("test-api-key");
    vi.mocked(mockDB.get).mockResolvedValueOnce("advanced");

    await oracle.init();
    expect(oracle.tier).toBe("advanced");
  });

  it("should clear API key and messages", async () => {
    const mockDB = await idbUtils.getDB();
    await oracle.setKey("some-key");
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
    await oracle.setKey("test-key");

    const imageQueries = [
      "/draw a dragon",
      "show me a picture of a castle",
      "generate an image of a wizard",
      "portrait of an elven queen",
      "sketch of a magic sword",
    ];

    for (const q of imageQueries) {
      await oracle.ask(q);
      const lastMsg = oracle.messages[oracle.messages.length - 1];
      expect(lastMsg.type).toBe("image");
    }
  });

  it("should detect expansion intent (isLongResponse) correctly", async () => {
    await oracle.setKey("test-key");
    const { aiService } = await import("../services/ai");
    vi.mocked(aiService.retrieveContext).mockResolvedValue({
      content: "context",
      primaryEntityId: "1",
      sourceIds: [],
    });

    await oracle.ask("Who is Eldrin?");
    let lastMsg = oracle.messages[oracle.messages.length - 1];
    expect(lastMsg.isLongResponse).toBe(false);
    expect(lastMsg.responseLength).toBe("balanced");

    await oracle.ask("Expand on Eldrin");
    lastMsg = oracle.messages[oracle.messages.length - 1];
    expect(lastMsg.isLongResponse).toBe(true);
    expect(lastMsg.responseLength).toBe("detailed");
  });

  describe("Undo Logic", () => {
    it("should push undo actions to the stack", () => {
      const revertFn = vi.fn().mockResolvedValue(undefined);
      oracle.pushUndoAction("Test Action", revertFn, "msg-123");

      expect(oracle.undoStack.length).toBe(1);
      expect(oracle.undoStack[0].description).toBe("Test Action");
    });

    it("should execute undo function on successful undo", async () => {
      const revertFn = vi.fn().mockResolvedValue(undefined);
      oracle.pushUndoAction("Action", revertFn);

      await oracle.undo();

      expect(revertFn).toHaveBeenCalled();
      expect(oracle.undoStack.length).toBe(0);
    });
  });

  describe("Dependency Injection (Constructor)", () => {
    it("should use injected services", async () => {
      const mockSettings = {
        init: vi.fn(),
        apiKey: "injected",
        tier: "lite",
      } as any;
      const testOracle = new OracleStore(undefined, mockSettings);

      await testOracle.init();
      expect(mockSettings.init).toHaveBeenCalled();
      expect(testOracle.apiKey).toBe("injected");
    });
  });
});
