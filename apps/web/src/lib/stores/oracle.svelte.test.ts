import { describe, it, expect, vi, beforeEach } from "vitest";
import { OracleStore } from "./oracle.svelte";
import { vault as mockVault } from "./vault.svelte";
import { uiStore as mockUiStore } from "./ui.svelte";

const { mockAnalyzeEntityById, mockAnalyzeAndApplyEntityById } = vi.hoisted(
  () => ({
    mockAnalyzeEntityById: vi.fn().mockResolvedValue(0),
    mockAnalyzeAndApplyEntityById: vi.fn().mockResolvedValue(0),
  }),
);

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

vi.mock("./ui.svelte", () => ({
  uiStore: {
    confirm: vi.fn().mockResolvedValue(true),
    aiDisabled: false,
    isDemoMode: false,
    entityDiscoveryMode: "suggest",
    connectionDiscoveryMode: "suggest",
    oracleAutomationPolicy: {
      entityDiscovery: "suggest",
      connectionDiscovery: "suggest",
    },
  },
}));

vi.mock("./vault.svelte", () => ({
  vault: {
    activeVaultId: "test-vault",
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

vi.mock("./proposer.svelte", () => ({
  proposerStore: {
    analyzeEntityById: mockAnalyzeEntityById,
    analyzeAndApplyEntityById: mockAnalyzeAndApplyEntityById,
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
  let mockSessionActivity: any;

  beforeEach(() => {
    vi.clearAllMocks();
    (mockUiStore as any).aiDisabled = false;
    (mockUiStore as any).isDemoMode = false;
    (mockUiStore as any).entityDiscoveryMode = "suggest";
    (mockUiStore as any).connectionDiscoveryMode = "suggest";
    (mockUiStore as any).oracleAutomationPolicy = {
      entityDiscovery: "suggest",
      connectionDiscovery: "suggest",
    };

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
      clear: vi.fn().mockImplementation(() => {
        mockChatHistory.messages = [];
      }),
      clearMessages: vi.fn().mockImplementation(() => {
        mockChatHistory.messages = [];
      }),
      removeMessage: vi.fn(),
      startWizard: vi.fn(),
      updateMessage: vi.fn(),
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
      settings: {
        apiKey: "test-key",
        tier: "advanced",
        modelName: "test-model",
        connectionMode: "custom-key",
      },
      setLoading: vi.fn(),
      setTier: vi.fn(),
      setKey: vi.fn(),
      clearKey: vi.fn(),
      updateSettings: vi.fn(),
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
        } else if (intent.type === "plot") {
          await mockChatHistory.addMessage({
            role: "assistant",
            content: "Generated visualization",
            type: "image",
          });
        }
      }),
      drawEntity: vi.fn(),
      drawMessage: vi.fn(),
    };

    const mockDiceHistory = {
      init: vi.fn(),
    };

    mockSessionActivity = {
      addEvent: vi.fn(),
      clear: vi.fn(),
    };

    oracle = new OracleStore({
      vault: mockVault as any,
      uiStore: mockUiStore as any,
      diceHistory: mockDiceHistory as any,
      sessionActivity: mockSessionActivity as any,
    });

    // Inject mocks into private fields to align with internal services refactor
    (oracle as any).chatHistoryService = mockChatHistory;
    (oracle as any).settingsService = mockSettings;
    (oracle as any).undoRedo = mockUndoRedo;
    (oracle as any).executor = mockExecutor;
    (oracle as any).isInitialized = true;
  });

  it("should initialize with empty state", () => {
    expect(oracle.messages).toHaveLength(0);
    expect(oracle.isEnabled).toBe(true);
  });

  it("should load API key from database on init", async () => {
    (oracle as any).isInitialized = false;
    await oracle.init();
    expect(mockSettings.init).toHaveBeenCalled();
  });

  it("should save API key to database", async () => {
    await oracle.setKey("new-key");
    expect(mockSettings.updateSettings).toHaveBeenCalledWith({
      apiKey: "new-key",
    });
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

    it("should handle undo and call undoRedo service", async () => {
      mockUndoRedo.undoStack = [{ description: "test action" }];
      await oracle.undo();
      expect(mockUndoRedo.undo).toHaveBeenCalled();
    });

    it("should handle redo and call undoRedo service", async () => {
      mockUndoRedo.redoStack = [{ description: "test redo" }];
      await oracle.redo();
      expect(mockUndoRedo.redo).toHaveBeenCalled();
    });
  });

  describe("Domain Operations", () => {
    it("should handle drawEntity", async () => {
      mockExecutor.drawEntity = vi.fn().mockResolvedValue(undefined);
      await oracle.drawEntity("entity-1");
      expect(mockExecutor.drawEntity).toHaveBeenCalledWith(
        "entity-1",
        expect.any(Object),
      );
    });

    it("should track visualizing state for an entity draw", async () => {
      let resolveDraw!: () => void;
      mockExecutor.drawEntity = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveDraw = resolve;
          }),
      );

      const drawPromise = oracle.drawEntity("entity-1");

      expect(oracle.visualizingEntityId).toBe("entity-1");
      expect(oracle.isVisualizingEntity("entity-1")).toBe(true);

      resolveDraw();
      await drawPromise;

      expect(oracle.visualizingEntityId).toBe(null);
      expect(oracle.isVisualizingEntity("entity-1")).toBe(false);
    });

    it("should handle drawMessage", async () => {
      mockExecutor.drawMessage = vi.fn().mockResolvedValue(undefined);
      await oracle.drawMessage("msg-1");
      expect(mockExecutor.drawMessage).toHaveBeenCalledWith(
        "msg-1",
        expect.any(Object),
      );
    });

    it("should clear key and messages", async () => {
      await oracle.clearKey();
      expect(mockSettings.updateSettings).toHaveBeenCalledWith({
        apiKey: undefined,
      });

      await oracle.clearMessages();
      expect(mockUiStore.confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Clear History",
          isDangerous: true,
        }),
      );
      expect(mockChatHistory.clear).toHaveBeenCalled();
      expect(mockSessionActivity.clear).toHaveBeenCalled();
    });

    it("should not clear messages when confirmation is cancelled", async () => {
      vi.mocked(mockUiStore.confirm).mockResolvedValue(false);

      await oracle.clearMessages();

      expect(mockUiStore.confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Clear History",
          isDangerous: true,
        }),
      );
      expect(mockChatHistory.clear).not.toHaveBeenCalled();
      expect(mockSessionActivity.clear).not.toHaveBeenCalled();
    });

    it("should pass related entity context into reconciliation updates", async () => {
      (mockVault as any).entities = {
        entity: {
          id: "entity",
          title: "Red Wizards of Thay",
          type: "faction",
          content: "Old chronicle",
          lore: "Old lore",
          connections: [{ target: "ally", type: "rules" }],
        },
        ally: {
          id: "ally",
          title: "Szass Tam",
          type: "npc",
          content: "Lich-regent",
          lore: "Commands the faction",
        },
      };
      (oracle as any).textGeneration.reconcileEntityUpdate = vi
        .fn()
        .mockResolvedValue({
          content: "Updated chronicle",
          lore: "Updated lore",
        });

      await oracle.reconcileDiscoveryProposal({
        entityId: "entity",
        title: "Red Wizards of Thay",
        type: "faction",
        draft: {
          chronicle: "New chronicle",
          lore: "New lore mentioning Szass Tam",
        },
        confidence: 0.9,
      });

      expect(
        (oracle as any).textGeneration.reconcileEntityUpdate,
      ).toHaveBeenCalledWith(
        "test-key",
        "test-model",
        mockVault.entities.entity,
        {
          chronicle: "New chronicle",
          lore: "New lore mentioning Szass Tam",
        },
        [
          expect.objectContaining({
            title: "Szass Tam",
            type: "npc",
          }),
        ],
      );
    });

    it("should fall back to a local append update when AI is disabled", async () => {
      (mockUiStore as any).aiDisabled = true;
      (oracle as any).textGeneration.reconcileEntityUpdate = vi.fn();
      (mockVault as any).entities = {
        entity: {
          id: "entity",
          title: "Valindra Shadowmantle",
          type: "npc",
          content: "Existing chronicle",
          lore: "Existing lore",
          connections: [],
        },
      };

      const result = await oracle.reconcileDiscoveryProposal({
        entityId: "entity",
        title: "Valindra Shadowmantle",
        type: "npc",
        draft: {
          chronicle: "New chronicle",
          lore: "Fresh discovery lore",
        },
        confidence: 0.9,
      });

      expect(result).toEqual({
        content: "Existing chronicle",
        lore: "Existing lore\n\nFresh discovery lore",
      });
      expect(
        (oracle as any).textGeneration.reconcileEntityUpdate,
      ).not.toHaveBeenCalled();

      (mockUiStore as any).aiDisabled = false;
    });

    it("should expose searchService through the oracle execution context", () => {
      const context = oracle.getExecutionContext();

      expect(context.searchService).toBeDefined();
      expect(typeof context.searchService.search).toBe("function");
    });

    it("should expose oracle automation policy through the execution context", () => {
      (mockUiStore as any).oracleAutomationPolicy = {
        entityDiscovery: "auto-create",
        connectionDiscovery: "auto-apply",
      };

      const context = oracle.getExecutionContext();

      expect(context.automationPolicy).toEqual({
        entityDiscovery: "auto-create",
        connectionDiscovery: "auto-apply",
      });
    });

    it("should seed discovery connections when connection discovery is suggest", async () => {
      (mockUiStore as any).connectionDiscoveryMode = "suggest";

      await oracle.handleDiscoveryConnectionsForEntity("entity", "context");

      expect(mockAnalyzeEntityById).toHaveBeenCalledWith(
        "entity",
        false,
        "context",
      );
      expect(mockAnalyzeAndApplyEntityById).not.toHaveBeenCalled();
    });

    it("should apply discovery connections only when connection discovery is auto-apply", async () => {
      (mockUiStore as any).connectionDiscoveryMode = "auto-apply";
      mockAnalyzeAndApplyEntityById.mockResolvedValue(2);

      const count = await oracle.handleDiscoveryConnectionsForEntity("entity");

      expect(count).toBe(2);
      expect(mockAnalyzeAndApplyEntityById).toHaveBeenCalledWith(
        "entity",
        undefined,
      );
      expect(mockAnalyzeEntityById).not.toHaveBeenCalled();
    });

    it("should skip discovery connection analysis when connection discovery is off", async () => {
      (mockUiStore as any).connectionDiscoveryMode = "off";

      const count = await oracle.handleDiscoveryConnectionsForEntity("entity");

      expect(count).toBe(0);
      expect(mockAnalyzeEntityById).not.toHaveBeenCalled();
      expect(mockAnalyzeAndApplyEntityById).not.toHaveBeenCalled();
    });

    it("should toggle open and modal states", async () => {
      oracle.toggle();
      expect(oracle.isOpen).toBe(true);

      oracle.toggleModal();
      expect(oracle.isModal).toBe(true);
    });

    it("should init on toggle if opening", async () => {
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
      expect(mockChatHistory.updateMessage).toHaveBeenCalledWith("id", {
        entityId: "ent",
      });

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
      // Note: reset behavior changed to only clear messages in the new refactor
    });
  });
});
