import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OracleStore } from "./oracle.svelte";

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
  contextRetrievalService: {
    getConsolidatedContext: vi.fn().mockReturnValue("mock context"),
    retrieveContext: vi.fn().mockResolvedValue({
      content: "mock context",
      primaryEntityId: "mock-id",
      sourceIds: ["source-1"],
    }),
    clearStyleCache: vi.fn(),
  },
  textGenerationService: {
    generateResponse: vi
      .fn()
      .mockImplementation((_k, _q, _h, _c, _m, onUpdate) => {
        onUpdate("mock response");
        return Promise.resolve();
      }),
    expandQuery: vi.fn().mockImplementation((_k, q) => Promise.resolve(q)),
    generatePlotAnalysis: vi.fn().mockResolvedValue("plot analysis"),
    generateMergeProposal: vi
      .fn()
      .mockResolvedValue({ body: "merge proposal" }),
  },
  imageGenerationService: {
    generateImage: vi.fn().mockResolvedValue(new Blob()),
    distillVisualPrompt: vi.fn().mockResolvedValue("visual prompt"),
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

// Mock URL.createObjectURL
if (typeof window !== "undefined") {
  window.URL.createObjectURL = vi.fn().mockReturnValue("mock-url");
}

describe("OracleStore", () => {
  let oracle: OracleStore;
  let mockChatHistory: any;
  let mockSettings: any;
  let mockUndoRedo: any;
  let mockExecutor: any;

  beforeEach(() => {
    vi.useFakeTimers();

    mockChatHistory = {
      messages: [],
      addMessage: vi.fn().mockImplementation((m) => {
        mockChatHistory.messages.push(m);
        return Promise.resolve();
      }),
      setMessages: vi.fn().mockImplementation((ms) => {
        mockChatHistory.messages = ms;
      }),
      init: vi.fn().mockResolvedValue(undefined),
      clearMessages: vi.fn().mockImplementation(() => {
        mockChatHistory.messages = [];
      }),
      removeMessage: vi.fn(),
      startWizard: vi.fn(),
      updateMessageEntity: vi.fn(),
      addTestImageMessage: vi.fn(),
    };

    mockSettings = {
      init: vi.fn().mockResolvedValue(undefined),
      apiKey: "test-key",
      tier: "advanced",
      isLoading: false,
      activeStyleTitle: null,
      effectiveApiKey: "test-key",
      isEnabled: true,
      modelName: "test-model",
      setLoading: vi.fn(),
      setTier: vi.fn(),
      setKey: vi.fn(),
      clearKey: vi.fn(),
    };

    mockUndoRedo = {
      undoStack: [],
      redoStack: [],
      isUndoing: false,
      undo: vi.fn(),
      redo: vi.fn(),
      pushUndoAction: vi.fn(),
      clear: vi.fn(),
    };

    mockExecutor = {
      execute: vi.fn().mockImplementation(async (intent, context, onUpdate) => {
        if (intent.type === "chat") {
          const isImage =
            intent.query.includes("draw") || intent.query.includes("image");
          const assistantMsg = {
            id: "msg-id",
            role: "assistant",
            content: isImage
              ? `Generated visualization for: "${intent.query}"`
              : "mock response",
            type: isImage ? "image" : "text",
          };
          await mockChatHistory.addMessage({
            role: "user",
            content: intent.query,
          });
          await mockChatHistory.addMessage(assistantMsg);
          if (onUpdate) onUpdate("mock response");
        }
      }),
      drawEntity: vi.fn(),
      drawMessage: vi.fn(),
    };

    const mockDiceHistory = {
      init: vi.fn(),
    };

    oracle = new OracleStore(
      mockChatHistory,
      mockSettings,
      mockUndoRedo,
      mockExecutor,
      undefined,
      undefined,
      undefined,
      mockDiceHistory as any,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should initialize with empty state", () => {
    expect(oracle.messages).toHaveLength(0);
    expect(oracle.isEnabled).toBe(true);
  });

  it("should load API key from database on init", async () => {
    await oracle.init();
    expect(mockSettings.init).toHaveBeenCalled();
  });

  it("should save API key to database", async () => {
    await oracle.setKey("new-key");
    expect(mockSettings.setKey).toHaveBeenCalledWith("new-key");
  });

  it("should toggle open state", () => {
    expect(oracle.isOpen).toBe(false);
    oracle.toggle();
    expect(oracle.isOpen).toBe(true);
  });

  it("should detect image generation intent correctly", async () => {
    const imageQueries = ["/draw a dragon", "generate an image of a wizard"];

    for (const q of imageQueries) {
      await oracle.ask(q);
      const lastMsg = oracle.messages[oracle.messages.length - 1];
      expect(lastMsg.type).toBe("image");
    }
  });

  describe("Undo/Redo Logic", () => {
    it("should push undo actions to the stack", () => {
      oracle.pushUndoAction("Test Action", vi.fn());
      expect(mockUndoRedo.pushUndoAction).toHaveBeenCalled();
    });

    it("should handle undo and add a system message", async () => {
      mockUndoRedo.undoStack = [{ description: "test action" }];
      await oracle.undo();
      expect(mockUndoRedo.undo).toHaveBeenCalled();
      expect(mockChatHistory.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          role: "system",
          content: expect.stringContaining("test action"),
        }),
      );
    });

    it("should handle redo and add a system message", async () => {
      mockUndoRedo.redoStack = [{ description: "test redo" }];
      await oracle.redo();
      expect(mockUndoRedo.redo).toHaveBeenCalled();
      expect(mockChatHistory.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          role: "system",
          content: expect.stringContaining("test redo"),
        }),
      );
    });
  });

  describe("Domain Operations", () => {
    it("should handle drawEntity", async () => {
      await oracle.drawEntity("entity-1");
      expect(mockExecutor.drawEntity).toHaveBeenCalledWith(
        "entity-1",
        expect.any(Object),
      );
      expect(mockSettings.setLoading).toHaveBeenCalledWith(true);
      expect(mockSettings.setLoading).toHaveBeenCalledWith(false);
    });

    it("should handle drawMessage", async () => {
      await oracle.drawMessage("msg-1");
      expect(mockExecutor.drawMessage).toHaveBeenCalledWith(
        "msg-1",
        expect.any(Object),
      );
    });

    it("should clear key and messages", async () => {
      await oracle.clearKey();
      expect(mockSettings.clearKey).toHaveBeenCalled();
      expect(mockChatHistory.clearMessages).toHaveBeenCalled();
    });

    it("should toggle open and modal states", async () => {
      oracle.toggle();
      expect(oracle.isOpen).toBe(true);

      oracle.toggleModal();
      expect(oracle.isModal).toBe(true);
    });

    it("should init on toggle if key is null and opening", async () => {
      vi.spyOn(mockSettings, "apiKey", "get").mockReturnValue(null);
      const initSpy = vi.spyOn(oracle, "init").mockResolvedValue(undefined);

      oracle.toggle();
      expect(oracle.isOpen).toBe(true);
      expect(initSpy).toHaveBeenCalled();
    });

    it("should delegate to chat history for wizard and message management", () => {
      oracle.removeMessage("id");
      expect(mockChatHistory.removeMessage).toHaveBeenCalledWith("id");

      oracle.startWizard("connection");
      expect(mockChatHistory.startWizard).toHaveBeenCalledWith("connection");

      oracle.updateMessageEntity("id", "ent");
      expect(mockChatHistory.updateMessageEntity).toHaveBeenCalledWith(
        "id",
        "ent",
      );

      const blob = new Blob();
      oracle.addTestImageMessage("c", "u", blob, "e");
      expect(mockChatHistory.addTestImageMessage).toHaveBeenCalledWith(
        "c",
        "u",
        blob,
        "e",
      );
    });

    it("should reset the store", () => {
      oracle.reset();
      expect(mockChatHistory.setMessages).toHaveBeenCalledWith([]);
      expect(mockUndoRedo.clear).toHaveBeenCalled();
      expect(mockSettings.clearKey).toHaveBeenCalled();
      expect(oracle.isOpen).toBe(false);
    });
  });
});
